import { useEffect, useRef } from 'react'
import { ResearchMoment, ResearchTag } from '../../lib/supabase'

interface MomentsListProps {
  moments: ResearchMoment[]
  tagsById: Record<string, ResearchTag>
  highlightMomentId?: string | null
  onEdit: (moment: ResearchMoment) => void
  onDelete: (moment: ResearchMoment) => void
  onScrollTo?: (moment: ResearchMoment) => void
}

export default function MomentsList({ moments, tagsById, highlightMomentId, onEdit, onDelete, onScrollTo }: MomentsListProps) {
  const highlightRef = useRef<HTMLDivElement>(null)

  // Scroll to highlighted moment on mount
  useEffect(() => {
    if (highlightMomentId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightMomentId, moments])

  if (!moments.length) {
    return (
      <div className="al-card text-sm text-al-text-muted italic">
        No moments tagged yet. Select text in the transcript to add one.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {moments.map((moment) => {
        const isHighlighted = moment.id === highlightMomentId
        return (
          <div 
            key={moment.id}
            ref={isHighlighted ? highlightRef : undefined}
            className={`al-card space-y-3 cursor-pointer transition-all ${
              isHighlighted 
                ? 'ring-2 ring-al-orange bg-orange-50' 
                : 'hover:ring-2 hover:ring-al-blue/50'
            }`}
            onClick={() => onScrollTo?.(moment)}
          >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-al-text-primary line-clamp-3">{moment.transcript_excerpt}</p>
            <div className="flex gap-2 text-xs flex-shrink-0">
              <button 
                className="al-btn-text" 
                onClick={(e) => { e.stopPropagation(); onEdit(moment); }}
              >
                Edit
              </button>
              <button 
                className="al-btn-text text-al-error" 
                onClick={(e) => { e.stopPropagation(); onDelete(moment); }}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="text-xs text-al-text-secondary flex flex-wrap gap-3">
            {moment.speaker && <span>Speaker: {moment.speaker}</span>}
            {moment.timestamp_label && <span>Time: {moment.timestamp_label}</span>}
          </div>
          {moment.tags && moment.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {moment.tags.map((tag) => (
                <span key={tag.id} className="al-badge-blue">
                  {tagsById[tag.id]?.name || tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}
