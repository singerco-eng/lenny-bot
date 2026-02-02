import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ResearchCall, ResearchMoment, ResearchTag } from '../lib/supabase'
import TagFilter from '../components/research/TagFilter'

interface SearchResult extends ResearchMoment {
  call: ResearchCall
}

interface MomentRow extends ResearchMoment {
  research_calls: ResearchCall
}

const integrationKeys = [
  { key: 'uses_sage', label: 'Sage' },
  { key: 'uses_qb_desktop', label: 'QB Desktop' },
  { key: 'uses_qb_online', label: 'QB Online' },
  { key: 'uses_accupay', label: 'AccuPay' },
  { key: 'uses_manual', label: 'Manual' },
] as const

export default function ResearchSearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [tags, setTags] = useState<ResearchTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [integrationFilter, setIntegrationFilter] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [tagsLoaded, setTagsLoaded] = useState(false)

  // Load tags first
  useEffect(() => {
    async function fetchTags() {
      const { data: tagData } = await supabase.from('research_tags').select('*').order('sort_order')
      setTags(tagData || [])
      setTagsLoaded(true)
    }
    fetchTags()
  }, [])

  const tagsById = useMemo(() => {
    return tags.reduce<Record<string, ResearchTag>>((acc, tag) => {
      acc[tag.id] = tag
      return acc
    }, {})
  }, [tags])

  // Load moments when tags are selected (only fetch moments that have selected tags)
  const loadMoments = async (tagIds: string[]) => {
    if (tagIds.length === 0) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      // First get moment IDs that have the selected tags
      const { data: selectedTagLinks } = await supabase
        .from('research_moment_tags')
        .select('moment_id')
        .in('tag_id', tagIds)

      if (!selectedTagLinks || selectedTagLinks.length === 0) {
        setResults([])
        return
      }

      // Get unique moment IDs
      const momentIds = [...new Set(selectedTagLinks.map((link) => link.moment_id))]

      // Now fetch ALL tags for these moments (so we can show all tags, not just selected)
      const { data: allTagLinks } = await supabase
        .from('research_moment_tags')
        .select('moment_id, tag_id')
        .in('moment_id', momentIds)

      // Build a map of moment_id -> tag_ids (all tags, not just selected)
      const momentTagsMap = (allTagLinks || []).reduce<Record<string, string[]>>((acc, link) => {
        acc[link.moment_id] = acc[link.moment_id] || []
        acc[link.moment_id].push(link.tag_id)
        return acc
      }, {})

      // Fetch the moments with their calls
      const { data: momentData } = await supabase
        .from('research_moments')
        .select(
          'id, call_id, transcript_excerpt, speaker, speaker_company, timestamp_label, context, created_at, research_calls(*)'
        )
        .in('id', momentIds)
        .order('created_at', { ascending: false })

      const moments = (momentData || []) as MomentRow[]

      // Merge with tags
      const merged = moments.map((moment) => ({
        ...moment,
        call: moment.research_calls,
        tags: (momentTagsMap[moment.id] || []).map((tagId) => tagsById[tagId]).filter(Boolean),
      }))

      setResults(merged)
    } finally {
      setLoading(false)
    }
  }

  // Reload moments when selected tags change
  useEffect(() => {
    if (tagsLoaded) {
      loadMoments(selectedTags)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTags, tagsLoaded])

  // Apply integration filter to results
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const matchesIntegration = Object.entries(integrationFilter).every(([key, value]) => {
        if (!value) return true
        return Boolean((result.call as any)?.[key])
      })
      return matchesIntegration
    })
  }, [results, integrationFilter])

  // Get keywords to highlight based on selected tags
  const highlightKeywords = useMemo(() => {
    const keywords: string[] = []
    selectedTags.forEach((tagId) => {
      const tag = tagsById[tagId]
      if (tag) {
        // Add tag name words as keywords
        const words = tag.name.toLowerCase().split(/\s+/)
        keywords.push(...words.filter((w) => w.length > 2))
        // Add slug parts too
        if (tag.slug) {
          keywords.push(...tag.slug.split('-').filter((w) => w.length > 2))
        }
      }
    })
    return [...new Set(keywords)]
  }, [selectedTags, tagsById])

  // Highlight text with keywords
  const highlightText = (text: string) => {
    if (highlightKeywords.length === 0) return text

    // Create regex pattern for all keywords
    const pattern = new RegExp(`\\b(${highlightKeywords.join('|')})`, 'gi')
    const parts = text.split(pattern)

    return parts.map((part, i) => {
      const isHighlight = highlightKeywords.some(
        (kw) => part.toLowerCase() === kw.toLowerCase()
      )
      if (isHighlight) {
        return (
          <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
            {part}
          </mark>
        )
      }
      return part
    })
  }

  return (
    <div className="min-h-screen bg-al-bg">
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Browse by Tag</span>
        </div>
        <Link to="/research" className="text-white/80 hover:text-white text-sm">
          ← Back to Research
        </Link>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-6 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-6">
          <div className="al-card space-y-4">
            <h3 className="text-sm font-semibold text-al-text-primary">Tags</h3>
            <p className="text-xs text-al-text-muted">
              Select one or more tags to find moments
            </p>
            <TagFilter tags={tags} selected={selectedTags} onChange={setSelectedTags} />
          </div>

          <div className="al-card space-y-4">
            <h3 className="text-sm font-semibold text-al-text-primary">Integration filters</h3>
            {integrationKeys.map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-al-text-secondary">
                <input
                  type="checkbox"
                  className="al-checkbox"
                  checked={Boolean(integrationFilter[item.key])}
                  onChange={(event) =>
                    setIntegrationFilter((prev) => ({ ...prev, [item.key]: event.target.checked }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-al-text-primary">Moments</h2>
            <span className="text-sm text-al-text-secondary">{filteredResults.length} moments</span>
          </div>

          {loading ? (
            <div className="al-card text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-al-text-secondary">Loading moments...</p>
            </div>
          ) : selectedTags.length === 0 ? (
            <div className="al-card text-center py-12">
              <p className="text-al-text-secondary mb-2">Select one or more tags to browse moments</p>
              <p className="text-xs text-al-text-muted">Use the tag filters on the left to find relevant interview moments</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="al-card text-sm text-al-text-muted italic text-center py-8">
              No moments found with the selected tags
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result) => {
                const companyName = result.call?.account_name || 'Unknown Company'
                const speakerName = result.speaker || result.call?.contact_name || 'Unknown'

                return (
                  <div key={result.id} className="al-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-al-text-primary">{companyName}</p>
                        <p className="text-xs text-al-text-secondary">
                          <span className="font-medium">{speakerName}</span>
                          {result.timestamp_label && (
                            <span className="text-al-text-muted"> · {result.timestamp_label}</span>
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/research/${result.call_id}?moment=${result.id}`}
                        className="al-btn-text text-xs whitespace-nowrap"
                      >
                        View in transcript
                      </Link>
                    </div>
                    <p className="text-sm text-al-text-primary leading-relaxed">
                      {highlightText(result.transcript_excerpt || '')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(result.tags || []).map((tag) => {
                        const isSelected = selectedTags.includes(tag.id)
                        return (
                          <span
                            key={tag.id}
                            className={
                              isSelected
                                ? 'px-2 py-0.5 rounded-full text-xs font-bold bg-al-orange text-white'
                                : 'al-badge-blue'
                            }
                          >
                            {tag.name}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
