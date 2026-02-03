import { useMemo, useRef, useEffect } from 'react'
import { ResearchMoment } from '../../lib/supabase'

interface TranscriptViewerProps {
  transcript?: string | null
  moments: ResearchMoment[]
  onSelectText?: (text: string) => void
  mutedSpeakers?: string[]
  highlightTimestamp?: string | null
}

interface TranscriptEntry {
  timestamp?: string
  speaker?: string
  speakerCompany?: string
  text: string
  isInterviewer: boolean
}

const parseSpeaker = (value: string) => {
  const match = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!match) return { speaker: value.trim(), company: undefined }
  return { speaker: match[1].trim(), company: match[2].trim() }
}

const parseTranscript = (transcript: string, mutedSpeakers: string[]): TranscriptEntry[] => {
  const lines = transcript.split('\n')
  const entries: TranscriptEntry[] = []
  let current: TranscriptEntry | null = null

  const timestampPattern = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(.+)$/

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const match = line.match(timestampPattern)
    if (match) {
      if (current) {
        current.text = current.text.trim()
        if (current.text) entries.push(current)
      }
      const { speaker, company } = parseSpeaker(match[2])
      current = {
        timestamp: match[1],
        speaker,
        speakerCompany: company,
        text: '',
        isInterviewer: mutedSpeakers.includes(speaker),
      }
    } else if (current) {
      if (line.trim()) {
        current.text += (current.text ? ' ' : '') + line.trim()
      }
    }
  }

  if (current && current.text.trim()) {
    current.text = current.text.trim()
    entries.push(current)
  }

  return entries
}

const highlightExcerpt = (text: string, excerpts: string[]) => {
  for (const excerpt of excerpts) {
    const trimmed = excerpt.trim()
    if (!trimmed || trimmed.length < 8) continue
    const index = text.toLowerCase().indexOf(trimmed.toLowerCase())
    if (index >= 0) {
      const before = text.slice(0, index)
      const match = text.slice(index, index + trimmed.length)
      const after = text.slice(index + trimmed.length)
      return (
        <>
          {before}
          <mark className="bg-al-yellow/30 text-al-text-primary px-1 rounded">{match}</mark>
          {after}
        </>
      )
    }
  }
  return text
}

export default function TranscriptViewer({
  transcript,
  moments,
  onSelectText,
  mutedSpeakers = [],
  highlightTimestamp,
}: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const excerpts = useMemo(() => moments.map((moment) => moment.transcript_excerpt), [moments])

  const entries = useMemo(() => {
    if (!transcript) return []
    return parseTranscript(transcript, mutedSpeakers)
  }, [transcript, mutedSpeakers])

  // Scroll to highlighted timestamp when it changes
  useEffect(() => {
    if (!highlightTimestamp || !containerRef.current) return
    const element = containerRef.current.querySelector(`[data-timestamp="${highlightTimestamp}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add temporary highlight
      element.classList.add('ring-2', 'ring-al-orange', 'ring-offset-2')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-al-orange', 'ring-offset-2')
      }, 2000)
    }
  }, [highlightTimestamp])

  const handleMouseUp = () => {
    if (!onSelectText) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    if (!containerRef.current || !containerRef.current.contains(selection.anchorNode)) return
    const selectedText = selection.toString().trim()
    if (selectedText.length > 10) {
      onSelectText(selectedText)
    }
  }

  if (!transcript) {
    return (
      <div className="al-card text-sm text-al-text-muted italic">
        No transcript available for this call.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="al-card space-y-4 text-sm leading-relaxed"
    >
      {entries.map((entry, index) => (
        <div 
          key={`${entry.timestamp}-${index}`} 
          data-timestamp={entry.timestamp}
          className={`rounded-lg p-2 -m-2 transition-all ${entry.isInterviewer ? 'text-al-text-muted' : ''}`}
        >
          <div className="flex items-center gap-2 text-xs uppercase text-al-text-muted">
            {entry.timestamp && <span className="font-mono">{entry.timestamp}</span>}
            {entry.speaker && (
              <span className={entry.isInterviewer ? 'text-al-text-muted' : 'text-al-text-secondary font-medium'}>
                {entry.speaker}
              </span>
            )}
            {entry.speakerCompany && <span className="text-al-text-muted">({entry.speakerCompany})</span>}
          </div>
          <p className={entry.isInterviewer ? 'italic' : 'text-al-text-primary'}>
            {highlightExcerpt(entry.text, excerpts)}
          </p>
        </div>
      ))}
    </div>
  )
}
