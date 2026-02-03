import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  supabase,
  ResearchTag,
  ResearchTagSuggestion,
  ResearchReviewStats,
  ResearchPendingByMoment,
  PendingMomentSuggestion,
} from '../lib/supabase'

type SortOption = 'confidence' | 'date' | 'company'

export default function ResearchReviewPage() {
  const [stats, setStats] = useState<ResearchReviewStats | null>(null)
  const [pendingMoments, setPendingMoments] = useState<ResearchPendingByMoment[]>([])
  const [tags, setTags] = useState<ResearchTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minConfidence, setMinConfidence] = useState(0.0)
  const [sortBy, setSortBy] = useState<SortOption>('confidence')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [expandedMoments, setExpandedMoments] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch review stats
      const { data: statsData } = await supabase
        .from('research_review_stats')
        .select('*')
        .single()
      setStats(statsData)

      // Fetch pending moments with suggestions
      const { data: momentData } = await supabase
        .from('research_pending_by_moment')
        .select('*')
      setPendingMoments(momentData || [])

      // Fetch all tags for filtering
      const { data: tagData } = await supabase
        .from('research_tags')
        .select('*')
        .order('sort_order')
      setTags(tagData || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter and sort moments
  const filteredMoments = useMemo(() => {
    let filtered = pendingMoments.filter((moment) => {
      // Filter by confidence
      if (moment.avg_confidence < minConfidence) return false

      // Filter by selected tags
      if (selectedTags.length > 0) {
        const momentTagIds = moment.suggestions.map((s) => s.tag_id)
        if (!selectedTags.some((tagId) => momentTagIds.includes(tagId))) {
          return false
        }
      }

      return true
    })

    // Sort
    switch (sortBy) {
      case 'confidence':
        filtered.sort((a, b) => b.avg_confidence - a.avg_confidence)
        break
      case 'date':
        // Moments don't have a date, sort by suggestion count as proxy
        filtered.sort((a, b) => b.suggestion_count - a.suggestion_count)
        break
      case 'company':
        filtered.sort((a, b) => a.account_name.localeCompare(b.account_name))
        break
    }

    return filtered
  }, [pendingMoments, minConfidence, selectedTags, sortBy])

  const approveSuggestion = async (suggestionId: string) => {
    setProcessing((prev) => new Set(prev).add(suggestionId))
    try {
      const { error } = await supabase.rpc('approve_tag_suggestion', {
        p_suggestion_id: suggestionId,
        p_reviewer: 'admin',
      })
      if (!error) {
        await fetchData()
      }
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const rejectSuggestion = async (suggestionId: string) => {
    setProcessing((prev) => new Set(prev).add(suggestionId))
    try {
      const { error } = await supabase.rpc('reject_tag_suggestion', {
        p_suggestion_id: suggestionId,
        p_reviewer: 'admin',
      })
      if (!error) {
        await fetchData()
      }
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(suggestionId)
        return next
      })
    }
  }

  const approveAllForMoment = async (suggestions: PendingMomentSuggestion[]) => {
    for (const suggestion of suggestions) {
      await approveSuggestion(suggestion.suggestion_id)
    }
  }

  const rejectAllForMoment = async (suggestions: PendingMomentSuggestion[]) => {
    for (const suggestion of suggestions) {
      await rejectSuggestion(suggestion.suggestion_id)
    }
  }

  const bulkApproveHighConfidence = async () => {
    setProcessing((prev) => new Set(prev).add('bulk'))
    try {
      const { data, error } = await supabase.rpc('bulk_approve_suggestions', {
        p_min_confidence: 0.85,
        p_reviewer: 'admin',
      })
      if (!error) {
        await fetchData()
      }
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete('bulk')
        return next
      })
    }
  }

  const toggleExpanded = (momentId: string) => {
    setExpandedMoments((prev) => {
      const next = new Set(prev)
      if (next.has(momentId)) {
        next.delete(momentId)
      } else {
        next.add(momentId)
      }
      return next
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'bg-green-500'
    if (confidence >= 0.7) return 'bg-yellow-500'
    if (confidence >= 0.5) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) return 'al-badge-green'
    if (confidence >= 0.7) return 'al-badge-yellow'
    if (confidence >= 0.5) return 'al-badge-orange'
    return 'al-badge-red'
  }

  return (
    <div className="min-h-screen bg-al-bg">
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Research Review</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={bulkApproveHighConfidence}
            disabled={processing.has('bulk')}
            className="al-btn-primary text-sm"
          >
            {processing.has('bulk') ? 'Processing...' : 'Bulk Approve High Confidence (>85%)'}
          </button>
          <Link to="/research" className="text-white/80 hover:text-white text-sm">
            ← Back to Research
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="bg-white border-b border-al-border px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-al-text-muted">Pending:</span>
              <span className="font-semibold text-al-orange">{stats.pending_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-al-text-muted">Approved:</span>
              <span className="font-semibold text-green-600">{stats.approved_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-al-text-muted">Rejected:</span>
              <span className="font-semibold text-red-600">{stats.rejected_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-al-text-muted">Moments to review:</span>
              <span className="font-semibold text-al-text-primary">{stats.moments_needing_review}</span>
            </div>
            {stats.avg_pending_confidence && (
              <div className="flex items-center gap-2">
                <span className="text-al-text-muted">Avg confidence:</span>
                <span className="font-semibold text-al-text-primary">
                  {(stats.avg_pending_confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto py-8 px-6 grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filters sidebar */}
        <aside className="space-y-6">
          <div className="al-card space-y-4">
            <h3 className="text-sm font-semibold text-al-text-primary">Confidence Filter</h3>
            <div>
              <label className="al-label">Minimum confidence</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-al-text-muted mt-1">
                <span>0%</span>
                <span className="font-semibold text-al-text-primary">
                  {(minConfidence * 100).toFixed(0)}%
                </span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMinConfidence(0.85)}
                className={`text-xs py-1 px-2 rounded ${
                  minConfidence === 0.85 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                High confidence only (≥85%)
              </button>
              <button
                onClick={() => setMinConfidence(0.7)}
                className={`text-xs py-1 px-2 rounded ${
                  minConfidence === 0.7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Medium+ (≥70%)
              </button>
              <button
                onClick={() => setMinConfidence(0)}
                className={`text-xs py-1 px-2 rounded ${
                  minConfidence === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Show all
              </button>
            </div>
          </div>

          <div className="al-card space-y-4">
            <h3 className="text-sm font-semibold text-al-text-primary">Sort by</h3>
            <div className="flex flex-col gap-2">
              {[
                { value: 'confidence', label: 'Confidence ↓' },
                { value: 'date', label: 'Suggestion count ↓' },
                { value: 'company', label: 'Company name' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-al-text-secondary">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortBy === option.value}
                    onChange={() => setSortBy(option.value as SortOption)}
                    className="al-checkbox"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="al-card space-y-4">
            <h3 className="text-sm font-semibold text-al-text-primary">Filter by tag</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm text-al-text-secondary">
                  <input
                    type="checkbox"
                    className="al-checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag.id])
                      } else {
                        setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                      }
                    }}
                  />
                  <span className="truncate">{tag.name}</span>
                </label>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-al-blue hover:underline"
              >
                Clear tag filters
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-al-text-primary">Pending Suggestions</h2>
            <span className="text-sm text-al-text-secondary">
              {filteredMoments.length} moment{filteredMoments.length !== 1 ? 's' : ''} with{' '}
              {filteredMoments.reduce((acc, m) => acc + m.suggestion_count, 0)} suggestions
            </span>
          </div>

          {loading ? (
            <div className="al-card text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-al-text-secondary">Loading suggestions...</p>
            </div>
          ) : filteredMoments.length === 0 ? (
            <div className="al-card text-center py-12">
              <p className="text-al-text-muted">
                {pendingMoments.length === 0
                  ? 'No pending suggestions. Run the auto-tagging script to generate suggestions.'
                  : 'No suggestions match your filters. Try adjusting the confidence threshold or tag filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMoments.map((moment) => (
                <div key={moment.moment_id} className="al-card space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-al-text-primary">{moment.account_name}</p>
                      <p className="text-xs text-al-text-secondary">
                        {moment.speaker && (
                          <>
                            <span className="font-medium">{moment.speaker}</span>
                            {moment.speaker_company && (
                              <span className="text-al-text-muted"> ({moment.speaker_company})</span>
                            )}
                            {moment.timestamp_label && (
                              <span className="text-al-text-muted"> at {moment.timestamp_label}</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <Link
                      to={`/research/${moment.call_id}?moment=${moment.moment_id}`}
                      className="al-btn-text text-xs"
                    >
                      View in transcript
                    </Link>
                  </div>

                  {/* Excerpt */}
                  <p className="text-sm text-al-text-primary bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                    "{moment.transcript_excerpt}"
                  </p>

                  {/* Suggested tags */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-al-text-muted uppercase tracking-wide">
                        Suggested Tags ({moment.suggestion_count})
                      </p>
                      <button
                        onClick={() => toggleExpanded(moment.moment_id)}
                        className="text-xs text-al-blue hover:underline"
                      >
                        {expandedMoments.has(moment.moment_id) ? 'Hide reasoning' : 'Show reasoning'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {moment.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.suggestion_id}
                          className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
                        >
                          <span className={`${getConfidenceBadge(suggestion.confidence)}`}>
                            {suggestion.tag_name}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getConfidenceColor(suggestion.confidence)}`}
                                style={{ width: `${suggestion.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-al-text-muted w-8">
                              {(suggestion.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <button
                            onClick={() => approveSuggestion(suggestion.suggestion_id)}
                            disabled={processing.has(suggestion.suggestion_id)}
                            className="text-green-600 hover:text-green-700 text-xs font-medium disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => rejectSuggestion(suggestion.suggestion_id)}
                            disabled={processing.has(suggestion.suggestion_id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Reasoning (expanded) */}
                    {expandedMoments.has(moment.moment_id) && (
                      <div className="mt-2 space-y-2">
                        {moment.suggestions.map((suggestion) =>
                          suggestion.reasoning ? (
                            <div
                              key={suggestion.suggestion_id}
                              className="text-xs text-al-text-muted bg-gray-50 p-2 rounded"
                            >
                              <span className="font-medium text-al-text-secondary">
                                {suggestion.tag_name}:
                              </span>{' '}
                              {suggestion.reasoning}
                            </div>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bulk actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-al-border">
                    <button
                      onClick={() => approveAllForMoment(moment.suggestions)}
                      className="al-btn-secondary text-xs"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={() => rejectAllForMoment(moment.suggestions)}
                      className="al-btn-text text-xs text-red-600 hover:text-red-700"
                    >
                      Reject All
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
