import { Link } from 'react-router-dom'
import { ResearchCall } from '../../lib/supabase'

interface ResearchCardProps {
  call: ResearchCall
  momentCount: number
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString()
}

export default function ResearchCard({ call, momentCount }: ResearchCardProps) {
  return (
    <div className="al-card flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-al-text-primary">{call.account_name}</h3>
        <p className="text-sm text-al-text-secondary">{call.contact_name || 'Unknown contact'}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-al-text-secondary">
        <div>
          <p className="text-al-text-muted uppercase">MRR</p>
          <p className="text-sm text-al-text-primary">{formatCurrency(call.mrr)}</p>
        </div>
        <div>
          <p className="text-al-text-muted uppercase">Active Users</p>
          <p className="text-sm text-al-text-primary">{call.active_users ?? '—'}</p>
        </div>
        <div>
          <p className="text-al-text-muted uppercase">Interview</p>
          <p className="text-sm text-al-text-primary">{formatDate(call.interview_date)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {call.theme && <span className="al-badge-blue">{call.theme}</span>}
        {call.uses_sage && <span className="al-badge-green">Sage</span>}
        {call.uses_qb_desktop && <span className="al-badge-green">QB Desktop</span>}
        {call.uses_qb_online && <span className="al-badge-green">QB Online</span>}
        {call.uses_accupay && <span className="al-badge-orange">AccuPay</span>}
        {call.uses_manual && <span className="al-badge-yellow">Manual</span>}
      </div>

      <div className="flex items-center justify-between text-sm text-al-text-secondary">
        <span>{momentCount} moments</span>
        <div className="flex gap-3">
          <Link to={`/research/${call.id}`} className="al-btn-text">
            View Transcript
          </Link>
          {call.recording_link && (
            <a
              href={call.recording_link}
              target="_blank"
              rel="noopener noreferrer"
              className="al-btn-text"
            >
              View Recording
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
