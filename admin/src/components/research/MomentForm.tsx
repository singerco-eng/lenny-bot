import { useEffect, useState } from 'react'
import { ResearchMoment, ResearchTag } from '../../lib/supabase'
import TagFilter from './TagFilter'

interface MomentFormProps {
  open: boolean
  tags: ResearchTag[]
  initial?: ResearchMoment | null
  selectedText?: string
  onClose: () => void
  onSave: (payload: {
    transcript_excerpt: string
    speaker?: string
    speaker_company?: string
    timestamp_label?: string
    context?: string
    tagIds: string[]
  }) => void
}

export default function MomentForm({
  open,
  tags,
  initial,
  selectedText,
  onClose,
  onSave,
}: MomentFormProps) {
  const [excerpt, setExcerpt] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [speakerCompany, setSpeakerCompany] = useState('')
  const [timestampLabel, setTimestampLabel] = useState('')
  const [context, setContext] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setExcerpt(initial?.transcript_excerpt || selectedText || '')
    setSpeaker(initial?.speaker || '')
    setSpeakerCompany(initial?.speaker_company || '')
    setTimestampLabel(initial?.timestamp_label || '')
    setContext(initial?.context || '')
    setSelectedTags(initial?.tags?.map((tag) => tag.id) || [])
  }, [open, initial, selectedText])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!excerpt.trim()) return
    onSave({
      transcript_excerpt: excerpt.trim(),
      speaker: speaker.trim() || undefined,
      speaker_company: speakerCompany.trim() || undefined,
      timestamp_label: timestampLabel.trim() || undefined,
      context: context.trim() || undefined,
      tagIds: selectedTags,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-al-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-al-text-primary">
            {initial ? 'Edit Moment' : 'Add Moment'}
          </h2>
          <button className="text-al-text-muted hover:text-al-text-primary" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="al-label">Selected text</label>
            <textarea
              className="al-input w-full h-24"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              readOnly={Boolean(selectedText) && !initial}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="al-label">Speaker</label>
              <input
                className="al-input w-full"
                value={speaker}
                onChange={(event) => setSpeaker(event.target.value)}
              />
            </div>
            <div>
              <label className="al-label">Speaker Company</label>
              <input
                className="al-input w-full"
                value={speakerCompany}
                onChange={(event) => setSpeakerCompany(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="al-label">Timestamp</label>
            <input
              className="al-input w-full"
              value={timestampLabel}
              onChange={(event) => setTimestampLabel(event.target.value)}
            />
          </div>
          <div>
            <label className="al-label">Tags</label>
            <TagFilter tags={tags} selected={selectedTags} onChange={setSelectedTags} />
          </div>
          <div>
            <label className="al-label">Notes</label>
            <textarea
              className="al-input w-full h-24"
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-al-border pt-4">
            <button type="button" className="al-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="al-btn-primary">
              Save Moment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
