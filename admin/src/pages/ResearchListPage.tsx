import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ResearchCall } from '../lib/supabase'
import ResearchCard from '../components/research/ResearchCard'

interface CallWithCounts extends ResearchCall {
  moment_count: number
}

const integrationKeys = [
  { key: 'uses_sage', label: 'Sage' },
  { key: 'uses_qb_desktop', label: 'QB Desktop' },
  { key: 'uses_qb_online', label: 'QB Online' },
  { key: 'uses_accupay', label: 'AccuPay' },
  { key: 'uses_manual', label: 'Manual' },
] as const

export default function ResearchListPage() {
  const [calls, setCalls] = useState<CallWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [themeFilter, setThemeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [integrationFilter, setIntegrationFilter] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchCalls() {
      try {
        const { data: callsData, error: callsError } = await supabase
          .from('research_calls')
          .select('*')
          .order('interview_date', { ascending: false })

        if (callsError) throw callsError

        const { data: momentsData, error: momentsError } = await supabase
          .from('research_moments')
          .select('call_id')

        if (momentsError) throw momentsError

        const counts: Record<string, number> = {}
        momentsData?.forEach((moment) => {
          counts[moment.call_id] = (counts[moment.call_id] || 0) + 1
        })

        const merged = (callsData || []).map((call) => ({
          ...call,
          moment_count: counts[call.id] || 0,
        }))

        setCalls(merged)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load research calls')
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [])

  const themes = useMemo(() => {
    const unique = new Set<string>()
    calls.forEach((call) => {
      if (call.theme) unique.add(call.theme)
    })
    return Array.from(unique).sort()
  }, [calls])

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const matchesSearch =
        !search ||
        call.account_name.toLowerCase().includes(search.toLowerCase()) ||
        (call.contact_name || '').toLowerCase().includes(search.toLowerCase())
      const matchesTheme = !themeFilter || call.theme === themeFilter

      const callDate = call.interview_date ? new Date(call.interview_date) : null
      const matchesStart = !startDate || (callDate && callDate >= new Date(startDate))
      const matchesEnd = !endDate || (callDate && callDate <= new Date(endDate))

      const matchesIntegration = Object.entries(integrationFilter).every(([key, value]) => {
        if (!value) return true
        return Boolean((call as any)[key])
      })

      return matchesSearch && matchesTheme && matchesStart && matchesEnd && matchesIntegration
    })
  }, [calls, search, themeFilter, startDate, endDate, integrationFilter])

  return (
    <div className="min-h-screen bg-al-bg">
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Research Calls</span>
        </div>
        <Link to="/" className="text-white/80 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-al-text-primary">Research Calls</h1>
            <p className="text-sm text-al-text-secondary">{calls.length} interviews imported</p>
          </div>
          <Link to="/research/search" className="al-btn-secondary">
            Browse by Tag
          </Link>
        </div>

        <div className="al-card grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="al-label">Search</label>
            <input
              className="al-input w-full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by company or contact"
            />
          </div>
          <div>
            <label className="al-label">Theme</label>
            <select
              className="al-select w-full"
              value={themeFilter}
              onChange={(event) => setThemeFilter(event.target.value)}
            >
              <option value="">All themes</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="al-label">Date range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="al-input w-full"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <input
                type="date"
                className="al-input w-full"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-4">
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
        </div>

        {loading ? (
          <div className="al-card text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-al-text-secondary">Loading research calls...</p>
          </div>
        ) : error ? (
          <div className="al-card bg-al-error-bg border-al-error">
            <p className="text-al-error font-medium">Error loading research calls</p>
            <p className="text-al-text-secondary text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredCalls.map((call) => (
              <ResearchCard key={call.id} call={call} momentCount={call.moment_count} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
