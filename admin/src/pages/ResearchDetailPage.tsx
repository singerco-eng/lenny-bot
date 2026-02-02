import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase, ResearchCall, ResearchMoment, ResearchTag } from '../lib/supabase'
import TranscriptViewer from '../components/research/TranscriptViewer'
import MomentsList from '../components/research/MomentsList'
import MomentForm from '../components/research/MomentForm'

const INTERVIEWERS = ['Laura Armstrong', 'Tricia Stearns', 'Sandy Slatter']

export default function ResearchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const highlightMomentId = searchParams.get('moment')

  const [call, setCall] = useState<ResearchCall | null>(null)
  const [moments, setMoments] = useState<ResearchMoment[]>([])
  const [tags, setTags] = useState<ResearchTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [editingMoment, setEditingMoment] = useState<ResearchMoment | null>(null)
  const [highlightTimestamp, setHighlightTimestamp] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!id) return
      try {
        const { data: callData, error: callError } = await supabase
          .from('research_calls')
          .select('*')
          .eq('id', id)
          .single()

        if (callError) throw callError

        const { data: tagData, error: tagError } = await supabase
          .from('research_tags')
          .select('*')
          .order('sort_order')

        if (tagError) throw tagError

        const { data: momentsData, error: momentsError } = await supabase
          .from('research_moments')
          .select('*')
          .eq('call_id', id)
          .order('excerpt_start_char', { ascending: true, nullsFirst: false })

        if (momentsError) throw momentsError

        const momentIds = (momentsData || []).map((moment) => moment.id)
        let momentTags: Record<string, string[]> = {}
        if (momentIds.length) {
          const { data: tagLinks, error: tagLinksError } = await supabase
            .from('research_moment_tags')
            .select('moment_id, tag_id')
            .in('moment_id', momentIds)

          if (tagLinksError) throw tagLinksError

          momentTags = (tagLinks || []).reduce<Record<string, string[]>>((acc, link) => {
            acc[link.moment_id] = acc[link.moment_id] || []
            acc[link.moment_id].push(link.tag_id)
            return acc
          }, {})
        }

        const tagMap = (tagData || []).reduce<Record<string, ResearchTag>>((acc, tag) => {
          acc[tag.id] = tag
          return acc
        }, {})

        const momentsWithTags = (momentsData || []).map((moment) => ({
          ...moment,
          tags: (momentTags[moment.id] || []).map((tagId) => tagMap[tagId]).filter(Boolean),
        }))

        setCall(callData)
        setTags(tagData || [])
        setMoments(momentsWithTags)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load research call')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const tagsById = useMemo(() => {
    return tags.reduce<Record<string, ResearchTag>>((acc, tag) => {
      acc[tag.id] = tag
      return acc
    }, {})
  }, [tags])

  // Auto-scroll to highlighted moment when page loads
  useEffect(() => {
    if (highlightMomentId && moments.length > 0) {
      const targetMoment = moments.find((m) => m.id === highlightMomentId)
      if (targetMoment?.timestamp_label) {
        // Small delay to let the page render first
        setTimeout(() => {
          setHighlightTimestamp(targetMoment.timestamp_label)
          setTimeout(() => setHighlightTimestamp(null), 100)
        }, 300)
      }
    }
  }, [highlightMomentId, moments])

  const openNewMoment = (text?: string) => {
    setEditingMoment(null)
    setSelectedText(text || '')
    setFormOpen(true)
  }

  const handleSaveMoment = async (payload: {
    transcript_excerpt: string
    speaker?: string
    speaker_company?: string
    timestamp_label?: string
    context?: string
    tagIds: string[]
  }) => {
    if (!call) return

    const transcript = call.transcript || ''
    const matchIndex = transcript.indexOf(payload.transcript_excerpt)
    const excerptStartChar = matchIndex >= 0 ? matchIndex : null
    const excerptEndChar = matchIndex >= 0 ? matchIndex + payload.transcript_excerpt.length : null

    if (editingMoment) {
      await supabase
        .from('research_moments')
        .update({
          transcript_excerpt: payload.transcript_excerpt,
          speaker: payload.speaker,
          speaker_company: payload.speaker_company,
          timestamp_label: payload.timestamp_label,
          context: payload.context,
          excerpt_start_char: excerptStartChar,
          excerpt_end_char: excerptEndChar,
        })
        .eq('id', editingMoment.id)

      await supabase.from('research_moment_tags').delete().eq('moment_id', editingMoment.id)
      if (payload.tagIds.length) {
        await supabase.from('research_moment_tags').insert(
          payload.tagIds.map((tagId) => ({
            moment_id: editingMoment.id,
            tag_id: tagId,
            source: 'user',
          }))
        )
      }
    } else {
      const { data: newMoment } = await supabase
        .from('research_moments')
        .insert({
          call_id: call.id,
          transcript_excerpt: payload.transcript_excerpt,
          speaker: payload.speaker,
          speaker_company: payload.speaker_company,
          timestamp_label: payload.timestamp_label,
          context: payload.context,
          excerpt_start_char: excerptStartChar,
          excerpt_end_char: excerptEndChar,
          created_by: 'admin',
        })
        .select('*')
        .single()

      if (newMoment && payload.tagIds.length) {
        await supabase.from('research_moment_tags').insert(
          payload.tagIds.map((tagId) => ({
            moment_id: newMoment.id,
            tag_id: tagId,
            source: 'user',
          }))
        )
      }
    }

    setFormOpen(false)
    setSelectedText('')
    setEditingMoment(null)

    if (id) {
      const { data: momentsData } = await supabase
        .from('research_moments')
        .select('*')
        .eq('call_id', id)
        .order('excerpt_start_char', { ascending: true, nullsFirst: false })

      const momentIds = (momentsData || []).map((moment) => moment.id)
      const { data: tagLinks } = momentIds.length
        ? await supabase.from('research_moment_tags').select('moment_id, tag_id').in('moment_id', momentIds)
        : { data: [] }

      const momentTags = (tagLinks || []).reduce<Record<string, string[]>>((acc, link) => {
        acc[link.moment_id] = acc[link.moment_id] || []
        acc[link.moment_id].push(link.tag_id)
        return acc
      }, {})

      const momentsWithTags = (momentsData || []).map((moment) => ({
        ...moment,
        tags: (momentTags[moment.id] || []).map((tagId) => tagsById[tagId]).filter(Boolean),
      }))

      setMoments(momentsWithTags)
    }
  }

  const handleDeleteMoment = async (moment: ResearchMoment) => {
    if (!confirm('Delete this moment?')) return
    await supabase.from('research_moments').delete().eq('id', moment.id)
    setMoments((prev) => prev.filter((item) => item.id !== moment.id))
  }

  const handleEditMoment = (moment: ResearchMoment) => {
    setEditingMoment(moment)
    setSelectedText(moment.transcript_excerpt)
    setFormOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-al-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-al-text-secondary">Loading research call...</p>
        </div>
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="min-h-screen bg-al-bg">
        <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6">
          <Link to="/research" className="text-white/80 hover:text-white text-sm">
            ← Back to Research
          </Link>
        </header>
        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="al-card bg-al-error-bg border-al-error">
            <p className="text-al-error font-medium">Error loading research call</p>
            <p className="text-al-text-secondary text-sm mt-1">{error || 'Call not found'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-al-bg">
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy">
        <div className="h-16 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-xl font-semibold tracking-wide">
              ACCU<span className="text-al-orange">LYNX</span>
            </span>
            <span className="text-white/50">|</span>
            <span className="text-white/80 text-sm">Research Call</span>
          </div>
          <Link to="/research" className="text-white/80 hover:text-white text-sm">
            ← Back to Research
          </Link>
        </div>
        <div className="px-6 pb-4">
          <h1 className="text-white text-2xl font-semibold mb-1">{call.account_name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
            <span>{call.contact_name}</span>
            {call.theme && <span className="al-badge-blue">{call.theme}</span>}
            {call.recording_link && (
              <a
                href={call.recording_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white underline"
              >
                View Recording
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Transcript - scrolls with page */}
          <div className="space-y-4">
            <div className="flex items-center justify-between sticky top-0 bg-al-bg py-2 z-10">
              <h2 className="text-lg font-semibold text-al-text-primary">Transcript</h2>
              <button className="al-btn-secondary" onClick={() => openNewMoment()}>
                Add Moment
              </button>
            </div>
            <TranscriptViewer
              transcript={call.transcript}
              moments={moments}
              mutedSpeakers={INTERVIEWERS}
              onSelectText={(text) => openNewMoment(text)}
              highlightTimestamp={highlightTimestamp}
            />
          </div>
          
          {/* Moments panel - sticky sidebar */}
          <div className="lg:relative">
            <div className="lg:sticky lg:top-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-al-text-primary">Tagged Moments</h2>
                <span className="text-xs text-al-text-muted">{moments.length} moments</span>
              </div>
              <MomentsList 
                moments={moments} 
                tagsById={tagsById}
                highlightMomentId={highlightMomentId}
                onEdit={handleEditMoment} 
                onDelete={handleDeleteMoment}
                onScrollTo={(moment) => {
                  if (moment.timestamp_label) {
                    setHighlightTimestamp(moment.timestamp_label)
                    // Reset after animation
                    setTimeout(() => setHighlightTimestamp(null), 100)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <MomentForm
        open={formOpen}
        tags={tags}
        initial={editingMoment}
        selectedText={selectedText}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveMoment}
      />
    </div>
  )
}
