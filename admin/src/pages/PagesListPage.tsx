import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, AppPage } from '../lib/supabase'

interface PageWithCounts extends AppPage {
  action_count: number
  component_count: number
  explored_action_count: number
}

export default function PagesListPage() {
  const [pages, setPages] = useState<PageWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPages() {
      try {
        // Fetch pages with product areas
        const { data: pagesData, error: pagesError } = await supabase
          .from('app_pages')
          .select(`
            *,
            product_area:product_areas(id, name)
          `)
          .order('url_pattern')

        if (pagesError) throw pagesError

        // Fetch action counts for each page
        const { data: actionsData, error: actionsError } = await supabase
          .from('page_actions')
          .select('page_id, explored')

        if (actionsError) throw actionsError

        // Fetch component counts for each page
        const { data: componentsData, error: componentsError } = await supabase
          .from('page_components')
          .select('page_id')

        if (componentsError) throw componentsError

        // Aggregate counts by page_id
        const actionCounts: Record<string, { total: number; explored: number }> = {}
        const componentCounts: Record<string, number> = {}

        actionsData?.forEach((action) => {
          if (!actionCounts[action.page_id]) {
            actionCounts[action.page_id] = { total: 0, explored: 0 }
          }
          actionCounts[action.page_id].total++
          if (action.explored) {
            actionCounts[action.page_id].explored++
          }
        })

        componentsData?.forEach((component) => {
          componentCounts[component.page_id] = (componentCounts[component.page_id] || 0) + 1
        })

        // Combine pages with counts
        const pagesWithCounts: PageWithCounts[] = (pagesData || []).map((page) => ({
          ...page,
          action_count: actionCounts[page.id]?.total || 0,
          component_count: componentCounts[page.id] || 0,
          explored_action_count: actionCounts[page.id]?.explored || 0,
        }))

        setPages(pagesWithCounts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pages')
      } finally {
        setLoading(false)
      }
    }

    fetchPages()
  }, [])

  const getStatusBadge = (page: PageWithCounts) => {
    const hasActions = page.action_count > 0
    const hasComponents = page.component_count > 0
    const allActionsExplored = page.action_count > 0 && page.explored_action_count === page.action_count
    const hasExploration = hasActions || hasComponents

    // Status logic:
    // - "Explored" (green): Has actions/components AND all actions are explored
    // - "In Progress" (blue): Has some actions/components but not all explored
    // - "Discovered" (orange): Page saved but no actions/components yet
    if (hasExploration && allActionsExplored) {
      return <span className="al-badge-green">Explored</span>
    } else if (hasExploration) {
      return <span className="al-badge-blue">In Progress</span>
    }
    return <span className="al-badge-orange">Discovered</span>
  }

  return (
    <div className="min-h-screen bg-al-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Crawled Pages</span>
        </div>
        <Link to="/" className="text-white/80 hover:text-white text-sm">
          ← Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-al-text-primary">
              Crawled Pages
            </h1>
            <p className="text-al-text-secondary text-sm mt-1">
              {pages.length} pages documented
            </p>
          </div>
        </div>

        {loading ? (
          <div className="al-card text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-al-text-secondary">Loading pages...</p>
          </div>
        ) : error ? (
          <div className="al-card bg-al-error-bg border-al-error">
            <p className="text-al-error font-medium">Error loading pages</p>
            <p className="text-al-text-secondary text-sm mt-1">{error}</p>
            <p className="text-al-text-muted text-xs mt-4">
              Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in admin/.env
            </p>
          </div>
        ) : (
          <div className="al-card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-al-bg">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    Page
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    Product Area
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    Actions
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    Components
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-al-bg transition-colors">
                    <td className="px-4 py-3 border-b border-al-border-light">
                      <div>
                        <p className="text-sm font-medium text-al-text-primary">
                          {page.title || page.url_pattern}
                        </p>
                        <p className="text-xs text-al-text-muted font-mono">
                          {page.url_pattern}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-al-border-light">
                      <span className="text-sm text-al-text-secondary">
                        {page.product_area?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-al-border-light">
                      <span className="text-sm text-al-text-secondary">
                        {page.action_count > 0 ? (
                          <span className={page.explored_action_count === page.action_count ? 'text-al-success' : ''}>
                            {page.explored_action_count}/{page.action_count}
                          </span>
                        ) : (
                          <span className="text-al-text-muted">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-al-border-light">
                      <span className="text-sm text-al-text-secondary">
                        {page.component_count > 0 ? page.component_count : <span className="text-al-text-muted">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-al-border-light">
                      {getStatusBadge(page)}
                    </td>
                    <td className="px-4 py-3 border-b border-al-border-light">
                      <Link
                        to={`/pages/${encodeURIComponent(page.url_pattern)}`}
                        className="al-btn-text text-sm"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}



