import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Types
interface SitemapPage {
  id: string
  url_pattern: string
  title: string | null
  product_area_id: string | null
  product_area?: { id: string; name: string } | null
}

interface PageComponent {
  id: string
  component_name: string
  component_type: string
  page_id: string
  capabilities: string[] | null
  ai_description: string | null
}

interface PageAction {
  id: string
  element_text: string
  display_label: string | null
  action_classification: string | null
  page_id: string
  navigates_to_page_id: string | null
  opens_component_id: string | null
  parent_component_id: string | null
}

interface NavigationTarget {
  page_id: string
  page_title: string
  url_pattern: string
  action_labels: string[]
}

// Product area colors
const PRODUCT_AREA_COLORS: Record<string, string> = {
  'Job Management': '#f97316',
  'Communications': '#8b5cf6',
  'Documents': '#3b82f6',
  'Estimates': '#10b981',
  'Labor': '#ef4444',
  'Orders': '#06b6d4',
  'Payments': '#eab308',
  'Contacts': '#ec4899',
  'default': '#1e3a5f',
}

// Component type colors
const COMPONENT_TYPE_COLORS: Record<string, string> = {
  'modal': '#8b5cf6',
  'drawer': '#06b6d4',
  'dropdown': '#f59e0b',
  'tab': '#10b981',
  'default': '#6b7280',
}

// Component type icons
const COMPONENT_TYPE_ICONS: Record<string, string> = {
  'modal': '◻',
  'drawer': '▤',
  'dropdown': '▾',
  'tab': '⊟',
  'default': '○',
}

export default function SitemapPage() {
  const navigate = useNavigate()
  
  // Tree state
  const [pages, setPages] = useState<SitemapPage[]>([])
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // Selected page state
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedPage, setSelectedPage] = useState<SitemapPage | null>(null)
  const [pageComponents, setPageComponents] = useState<PageComponent[]>([])
  const [pageActions, setPageActions] = useState<PageAction[]>([])
  const [navigationTargets, setNavigationTargets] = useState<NavigationTarget[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Fetch all pages for tree
  useEffect(() => {
    async function fetchPages() {
      setLoading(true)
      const { data, error } = await supabase
        .from('app_pages')
        .select('id, url_pattern, title, product_area_id, product_area:product_areas(id, name)')
        .order('title')

      if (error) {
        console.error('Error fetching pages:', error)
      } else {
        setPages(data || [])
        // Expand all areas by default
        const areas = new Set((data || []).map(p => {
          const area = Array.isArray(p.product_area) ? p.product_area[0] : p.product_area
          return area?.name || 'Uncategorized'
        }))
        setExpandedAreas(areas)
      }
      setLoading(false)
    }
    fetchPages()
  }, [])

  // Fetch page details when selected
  useEffect(() => {
    if (!selectedPageId) {
      setSelectedPage(null)
      setPageComponents([])
      setPageActions([])
      setNavigationTargets([])
      return
    }

    async function fetchPageDetails() {
      setDetailLoading(true)
      
      // Fetch page info
      const { data: pageData } = await supabase
        .from('app_pages')
        .select('id, url_pattern, title, product_area_id, product_area:product_areas(id, name)')
        .eq('id', selectedPageId)
        .single()
      
      if (pageData) {
        setSelectedPage(pageData)
      }

      // Fetch components on this page
      const { data: components } = await supabase
        .from('page_components')
        .select('id, component_name, component_type, page_id, capabilities, description')
        .eq('page_id', selectedPageId)
        .order('component_name')

      setPageComponents(components || [])

      // Fetch all actions on this page
      const { data: actions } = await supabase
        .from('page_actions')
        .select('id, element_text, display_label, action_classification, page_id, navigates_to_page_id, opens_component_id, parent_component_id')
        .eq('page_id', selectedPageId)

      setPageActions(actions || [])

      // Build navigation targets
      const navActions = (actions || []).filter(a => a.navigates_to_page_id && a.navigates_to_page_id !== selectedPageId)
      const targetPageIds = [...new Set(navActions.map(a => a.navigates_to_page_id!))]
      
      if (targetPageIds.length > 0) {
        const { data: targetPages } = await supabase
          .from('app_pages')
          .select('id, url_pattern, title')
          .in('id', targetPageIds)

        const targets: NavigationTarget[] = (targetPages || []).map(tp => ({
          page_id: tp.id,
          page_title: tp.title || tp.url_pattern,
          url_pattern: tp.url_pattern,
          action_labels: navActions
            .filter(a => a.navigates_to_page_id === tp.id)
            .map(a => a.display_label || a.element_text)
        }))
        setNavigationTargets(targets)
      } else {
        setNavigationTargets([])
      }

      setDetailLoading(false)
    }

    fetchPageDetails()
  }, [selectedPageId])

  // Group pages by product area for tree
  const pagesByArea = useMemo(() => {
    const groups = new Map<string, SitemapPage[]>()
    pages.forEach(page => {
      const area = Array.isArray(page.product_area) 
        ? page.product_area[0]?.name 
        : page.product_area?.name
      const areaName = area || 'Uncategorized'
      if (!groups.has(areaName)) {
        groups.set(areaName, [])
      }
      groups.get(areaName)!.push(page)
    })
    // Sort areas alphabetically, but put Uncategorized last
    return new Map([...groups.entries()].sort((a, b) => {
      if (a[0] === 'Uncategorized') return 1
      if (b[0] === 'Uncategorized') return -1
      return a[0].localeCompare(b[0])
    }))
  }, [pages])

  // Get actions for a specific component
  const getComponentActions = useCallback((componentId: string) => {
    return pageActions.filter(a => a.parent_component_id === componentId)
  }, [pageActions])

  // Get page-level actions (not inside any component)
  const getPageLevelActions = useMemo(() => {
    return pageActions.filter(a => !a.parent_component_id && !a.navigates_to_page_id)
  }, [pageActions])

  // Toggle area expansion
  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(area)) {
      newExpanded.delete(area)
    } else {
      newExpanded.add(area)
    }
    setExpandedAreas(newExpanded)
  }

  // Handle page selection from tree
  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId === selectedPageId ? null : pageId)
  }

  // Navigate to page details
  const goToPageDetails = (urlPattern: string) => {
    navigate(`/pages/${encodeURIComponent(urlPattern)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-700 h-14 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white text-lg font-semibold">
            ACCU<span className="text-orange-400">LYNX</span>
          </span>
          <span className="text-white/40">|</span>
          <span className="text-white/80 text-sm">Component Explorer</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-white/70 text-sm">
            {pages.length} pages · {pageComponents.length} components
          </div>
          <Link to="/" className="text-blue-300 hover:text-white text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tree Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <span>🌳</span> Pages
            </h3>
            <p className="text-xs text-slate-500 mt-1">Click to explore components</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {Array.from(pagesByArea.entries()).map(([areaName, areaPages]) => (
              <div key={areaName} className="border-b border-slate-100 last:border-0">
                {/* Area header */}
                <button
                  onClick={() => toggleArea(areaName)}
                  className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PRODUCT_AREA_COLORS[areaName] || PRODUCT_AREA_COLORS.default }}
                    />
                    <span className="font-medium text-slate-700 text-sm">{areaName}</span>
                    <span className="text-xs text-slate-400">{areaPages.length}</span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform ${expandedAreas.has(areaName) ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Pages in area */}
                {expandedAreas.has(areaName) && (
                  <div className="pb-1">
                    {areaPages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => handlePageSelect(page.id)}
                        className={`w-full px-4 py-1.5 pl-8 text-left text-sm transition-colors ${
                          selectedPageId === page.id
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate block">{page.title || page.url_pattern}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Canvas */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedPageId ? (
            // Empty state - nothing shown
            <div />
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400">Loading...</div>
            </div>
          ) : selectedPage ? (
            <div className="max-w-5xl mx-auto">
              {/* Page Header Card */}
              <div 
                className="bg-white rounded-xl shadow-sm border-2 p-6 mb-8"
                style={{ borderColor: PRODUCT_AREA_COLORS[
                  (Array.isArray(selectedPage.product_area) 
                    ? selectedPage.product_area[0]?.name 
                    : selectedPage.product_area?.name) || ''
                ] || PRODUCT_AREA_COLORS.default }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      {selectedPage.title || 'Untitled Page'}
                    </h1>
                    <code className="text-sm text-slate-500 mt-1 block">
                      {selectedPage.url_pattern}
                    </code>
                  </div>
                  <button
                    onClick={() => goToPageDetails(selectedPage.url_pattern)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    View Details →
                  </button>
                </div>
                <div className="flex gap-4 mt-4 text-sm">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                    {pageActions.length} actions
                  </span>
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-600">
                    {pageComponents.length} components
                  </span>
                  {(Array.isArray(selectedPage.product_area) 
                    ? selectedPage.product_area[0]?.name 
                    : selectedPage.product_area?.name) && (
                    <span 
                      className="px-3 py-1 rounded-full text-white"
                      style={{ backgroundColor: PRODUCT_AREA_COLORS[
                        (Array.isArray(selectedPage.product_area) 
                          ? selectedPage.product_area[0]?.name 
                          : selectedPage.product_area?.name) || ''
                      ] || PRODUCT_AREA_COLORS.default }}
                    >
                      {Array.isArray(selectedPage.product_area) 
                        ? selectedPage.product_area[0]?.name 
                        : selectedPage.product_area?.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Components Grid */}
              {pageComponents.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <span>📦</span> Components
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageComponents.map(component => {
                      const componentActions = getComponentActions(component.id)
                      const color = COMPONENT_TYPE_COLORS[component.component_type] || COMPONENT_TYPE_COLORS.default
                      const icon = COMPONENT_TYPE_ICONS[component.component_type] || COMPONENT_TYPE_ICONS.default
                      
                      return (
                        <div 
                          key={component.id}
                          className="bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-shadow"
                          style={{ borderColor: color }}
                        >
                          {/* Component Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span style={{ color }} className="text-lg">{icon}</span>
                                <h3 className="font-semibold text-slate-800">
                                  {component.component_name}
                                </h3>
                              </div>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {component.component_type}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {componentActions.length} actions
                            </span>
                          </div>

                          {/* Component Description */}
                          {component.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                              {component.description}
                            </p>
                          )}

                          {/* Actions List */}
                          {componentActions.length > 0 && (
                            <div className="space-y-1">
                              {componentActions.slice(0, 6).map(action => (
                                <div 
                                  key={action.id}
                                  className="text-sm text-slate-600 flex items-center gap-2 py-1 px-2 bg-slate-50 rounded"
                                >
                                  <span className="text-slate-400">•</span>
                                  <span className="truncate">
                                    {action.display_label || action.element_text}
                                  </span>
                                  {action.navigates_to_page_id && (
                                    <span className="text-blue-400 text-xs ml-auto">→</span>
                                  )}
                                </div>
                              ))}
                              {componentActions.length > 6 && (
                                <div className="text-xs text-slate-400 px-2">
                                  +{componentActions.length - 6} more
                                </div>
                              )}
                            </div>
                          )}

                          {/* Capabilities */}
                          {component.capabilities && component.capabilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
                              {component.capabilities.map((cap, i) => (
                                <span 
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Page-Level Actions (not in any component) */}
              {getPageLevelActions.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <span>⚡</span> Page Actions
                  </h2>
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex flex-wrap gap-2">
                      {getPageLevelActions.map(action => (
                        <span 
                          key={action.id}
                          className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg"
                        >
                          {action.display_label || action.element_text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              {navigationTargets.length > 0 && (
                <div className="bg-slate-100 rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Navigates To
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {navigationTargets.map(target => (
                      <button
                        key={target.page_id}
                        onClick={() => handlePageSelect(target.page_id)}
                        className="group bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg px-4 py-3 text-left transition-all hover:shadow-sm"
                      >
                        <div className="font-medium text-slate-700 group-hover:text-blue-700">
                          {target.page_title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {target.action_labels.length} action{target.action_labels.length !== 1 ? 's' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-4">
                    Click to explore that page's components
                  </p>
                </div>
              )}

              {/* Empty components state */}
              {pageComponents.length === 0 && getPageLevelActions.length === 0 && navigationTargets.length === 0 && (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No Components Yet</h3>
                  <p className="text-slate-500 text-sm">
                    This page hasn't been fully explored yet.
                  </p>
                  <button
                    onClick={() => goToPageDetails(selectedPage.url_pattern)}
                    className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    View Page Details
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
