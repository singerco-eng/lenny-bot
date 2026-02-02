import { useMemo } from 'react'
import { ResearchTag } from '../../lib/supabase'

interface TagFilterProps {
  tags: ResearchTag[]
  selected: string[]
  onChange: (next: string[]) => void
  valueKey?: 'id' | 'slug'
  showQuestions?: boolean
  compact?: boolean
}

export default function TagFilter({
  tags,
  selected,
  onChange,
  valueKey = 'id',
  showQuestions = false,
  compact = false,
}: TagFilterProps) {
  const toggleTag = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  // Group tags by source
  const { providedTags, systemTags } = useMemo(() => {
    const provided = tags.filter(t => t.source === 'provided' || !t.source)
    const system = tags.filter(t => t.source === 'system')
    return { providedTags: provided, systemTags: system }
  }, [tags])

  const renderTag = (tag: ResearchTag) => {
    const value = valueKey === 'slug' ? tag.slug : tag.id
    const isSelected = selected.includes(value)
    
    if (compact) {
      return (
        <button
          key={value}
          type="button"
          onClick={() => toggleTag(value)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            isSelected 
              ? 'bg-al-blue text-white' 
              : 'bg-al-bg text-al-text-secondary hover:bg-al-border'
          }`}
        >
          {tag.name}
        </button>
      )
    }

    return (
      <label key={value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-al-bg rounded px-1 py-0.5">
        <input
          type="checkbox"
          className="al-checkbox"
          checked={isSelected}
          onChange={() => toggleTag(value)}
        />
        <span className={isSelected ? 'text-al-text-primary font-medium' : 'text-al-text-secondary'}>
          {tag.name}
        </span>
      </label>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {providedTags.length > 0 && (
          <div>
            <p className="text-xs text-al-text-muted mb-2 font-medium">Terminology Tags</p>
            <div className="flex flex-wrap gap-1">
              {providedTags.map(renderTag)}
            </div>
          </div>
        )}
        {systemTags.length > 0 && (
          <div>
            <p className="text-xs text-al-text-muted mb-2 font-medium">Discovered Themes</p>
            <div className="flex flex-wrap gap-1">
              {systemTags.map(renderTag)}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {providedTags.length > 0 && (
        <div>
          <p className="text-xs text-al-text-muted mb-2 font-semibold uppercase tracking-wide">Terminology Tags</p>
          <div className="space-y-1">
            {providedTags.map(renderTag)}
          </div>
        </div>
      )}
      {systemTags.length > 0 && (
        <div className="border-t border-al-border pt-3 mt-3">
          <p className="text-xs text-al-text-muted mb-2 font-semibold uppercase tracking-wide">Discovered Themes</p>
          <div className="space-y-1">
            {systemTags.map(renderTag)}
          </div>
        </div>
      )}
    </div>
  )
}
