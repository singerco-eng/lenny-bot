import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, AppPage, PageComponent, PageAction } from '../lib/supabase'

interface PageData {
  page: AppPage | null
  components: PageComponent[]
  actions: PageAction[]
}

export default function PageDetailPage() {
  const { pattern } = useParams<{ pattern: string }>()
  const decodedPattern = decodeURIComponent(pattern || '')
  
  const [data, setData] = useState<PageData>({ page: null, components: [], actions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'actions'>('overview')
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<PageComponent | null>(null)
  const [selectedAction, setSelectedAction] = useState<PageAction | null>(null)

  useEffect(() => {
    async function fetchPageData() {
      try {
        // Fetch page
        const { data: pageData, error: pageError } = await supabase
          .from('app_pages')
          .select(`
            *,
            product_area:product_areas(id, name)
          `)
          .eq('url_pattern', decodedPattern)
          .single()

        if (pageError) throw pageError

        // Fetch components
        const { data: componentsData, error: componentsError } = await supabase
          .from('page_components')
          .select('*')
          .eq('page_id', pageData.id)
          .order('component_type')

        if (componentsError) throw componentsError

        // Fetch actions with navigation info
        const { data: actionsData, error: actionsError } = await supabase
          .from('page_actions')
          .select(`
            *,
            navigates_to_page:app_pages!page_actions_navigates_to_page_id_fkey(id, url_pattern, title, screenshot_path),
            opens_component:page_components!page_actions_opens_component_id_fkey(id, component_name, component_type, screenshot_path)
          `)
          .eq('page_id', pageData.id)
          .order('priority', { ascending: false })

        if (actionsError) throw actionsError

        setData({
          page: pageData,
          components: componentsData || [],
          actions: actionsData || []
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page data')
      } finally {
        setLoading(false)
      }
    }

    if (decodedPattern) {
      fetchPageData()
    }
  }, [decodedPattern])

  const { page, components, actions } = data

  // Group components by type
  const componentsByType = components.reduce((acc, comp) => {
    const type = comp.component_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(comp)
    return acc
  }, {} as Record<string, PageComponent[]>)

  // Group actions by element type
  const actionsByType = actions.reduce((acc, action) => {
    const type = action.element_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(action)
    return acc
  }, {} as Record<string, PageAction[]>)

  // Sort action types for consistent display
  const sortedActionTypes = Object.keys(actionsByType).sort((a, b) => {
    // Put 'other' at the end
    if (a === 'other') return 1
    if (b === 'other') return -1
    return a.localeCompare(b)
  })

  // Parse description to highlight form fields with inline code styling
  const highlightFormFields = (description: string): React.ReactNode => {
    if (!description) return description
    
    // Create a combined pattern for all matches
    const allMatches: Array<{index: number, length: number, text: string}> = []
    let match
    
    // Find field matches - look for capitalized words before field type indicators
    // Pattern: Word(s) followed by field/textbox/textarea/dropdown/checkbox/radio/picker/selector/combobox
    const fieldRegex = /\b([A-Z][a-zA-Z\/&']*(?:\s+[A-Z][a-zA-Z\/&']*)*)\s+(field|textbox|textarea|dropdown|checkbox|radio|picker|selector|combobox)\b/g
    while ((match = fieldRegex.exec(description)) !== null) {
      const fieldName = match[1].trim()
      // Skip short words and common non-field words
      if (fieldName.length >= 2 && !fieldName.match(/^(The|This|That|Each|Some|Any|All)$/i)) {
        allMatches.push({
          index: match.index,
          length: fieldName.length,
          text: fieldName
        })
      }
    }
    
    // Find button matches - but only specific named buttons, not generic action words
    const buttonRegex = /\b([A-Z][a-zA-Z\/&']*(?:\s+[A-Z][a-zA-Z\/&']*)*)\s+(button)\b/g
    while ((match = buttonRegex.exec(description)) !== null) {
      const btnName = match[1].trim()
      // Only include actual field-like button names, not action descriptions
      if (btnName.length >= 3 && 
          !btnName.match(/^(Cancel|Save|Close|Submit|Create|Edit|Delete|Remove|View|Open|The|A|An|With|And|Or|Has|Includes|Contains)$/i)) {
        allMatches.push({
          index: match.index,
          length: btnName.length,
          text: btnName
        })
      }
    }
    
    // Sort by index and remove overlaps
    allMatches.sort((a, b) => a.index - b.index)
    const filteredMatches = allMatches.filter((m, i) => {
      if (i === 0) return true
      const prev = allMatches[i - 1]
      return m.index >= prev.index + prev.length
    })
    
    if (filteredMatches.length === 0) return description
    
    // Build parts array
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    for (const m of filteredMatches) {
      if (m.index > currentIndex) {
        parts.push(description.slice(currentIndex, m.index))
      }
      parts.push(
        <code key={m.index} className="bg-al-bg px-1.5 py-0.5 rounded text-sm font-mono text-al-blue">
          {m.text}
        </code>
      )
      currentIndex = m.index + m.length
    }
    
    if (currentIndex < description.length) {
      parts.push(description.slice(currentIndex))
    }
    
    return parts
  }

  // Get display text for an action - prefers display_label if set
  const getActionDisplayText = (action: PageAction): string => {
    // If we have a display_label, use it directly
    if (action.display_label) {
      return action.display_label
    }
    // Otherwise fall back to cleaning element_text
    return cleanElementText(action.element_text)
  }

  // Clean element_text for display - remove counts and generalize job-specific data
  // Used as fallback when display_label is not set
  const cleanElementText = (text: string): string => {
    let cleaned = text
    
    // Remove trailing counts like "Photos 0", "Estimates 1", "Communications 6"
    // But only if there's text before it
    cleaned = cleaned.replace(/^(.+?)\s+\d+$/, '$1')
    
    // Remove counts in parentheses like "(0)", "(+2)", "(1)"  
    // But only if there's text before it (don't remove if entire text is just "(+2)")
    cleaned = cleaned.replace(/^(.+?)\s*\([+]?\d+\)$/, '$1')
    
    // Generalize phone numbers - various formats
    if (/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(cleaned)) {
      return '[Phone Number]'
    }
    
    // Generalize emails
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return '[Email Address]'
    }
    
    // Generalize monetary amounts with "Starting at" prefix
    if (/^Starting at \$/.test(cleaned)) {
      return '[Financing Amount]'
    }
    
    return cleaned
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-al-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-al-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-al-text-secondary">Loading page data...</p>
        </div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-al-bg">
        <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6">
          <Link to="/pages" className="text-white/80 hover:text-white text-sm">
            ← Back to Pages
          </Link>
        </header>
        <main className="max-w-4xl mx-auto py-12 px-6">
          <div className="al-card bg-al-error-bg border-al-error">
            <p className="text-al-error font-medium">Error loading page</p>
            <p className="text-al-text-secondary text-sm mt-1">{error || 'Page not found'}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-al-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy">
        <div className="h-16 flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-xl font-semibold tracking-wide">
              ACCU<span className="text-al-orange">LYNX</span>
            </span>
            <span className="text-white/50">|</span>
            <span className="text-white/80 text-sm">Page Detail</span>
          </div>
          <Link to="/pages" className="text-white/80 hover:text-white text-sm">
            ← Back to Pages
          </Link>
        </div>
        
        {/* Page Title Bar */}
        <div className="px-6 pb-4">
          <h1 className="text-white text-2xl font-semibold mb-1">
            {page.title || page.url_pattern}
          </h1>
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <code className="bg-white/10 px-2 py-1 rounded">{page.url_pattern}</code>
            {page.product_area && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {page.product_area.name}
              </span>
            )}
            <span className="al-badge-green">Complete</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-al-surface border-b border-al-border">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex gap-6">
            {(['overview', 'components', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-al-orange text-al-orange'
                    : 'border-transparent text-al-text-secondary hover:text-al-text-primary'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'components' && `Components (${components.length})`}
                {tab === 'actions' && `Actions (${actions.length})`}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-6">
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Screenshot */}
            <div className="lg:col-span-1">
              <div className="al-card">
                <h3 className="al-label mb-3">Screenshot</h3>
                {page.screenshot_path ? (
                  <a href={page.screenshot_path} target="_blank" rel="noopener noreferrer">
                    <img
                      src={page.screenshot_path}
                      alt={page.title || 'Page screenshot'}
                      className="w-full rounded border border-al-border hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <div className="w-full h-48 bg-al-bg rounded border border-al-border flex items-center justify-center">
                    <span className="text-al-text-muted text-sm">No screenshot</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description & Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="al-card">
                <h3 className="al-label mb-3">Description</h3>
                {page.ai_description ? (
                  <>
                    <p className="text-al-text-primary leading-relaxed whitespace-pre-wrap">
                      {descriptionExpanded || page.ai_description.length <= 300
                        ? page.ai_description
                        : page.ai_description.slice(0, 300) + '...'}
                    </p>
                    {page.ai_description.length > 300 && (
                      <button
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="mt-2 text-sm text-al-blue hover:underline focus:outline-none"
                      >
                        {descriptionExpanded ? 'Show less' : 'View all'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-al-text-muted italic">No description available</p>
                )}
              </div>

              {/* KB Context */}
              {page.kb_context_used && page.kb_context_used.length > 0 && (
                <div className="al-card">
                  <h3 className="al-label mb-3">KB Context</h3>
                  <div className="flex flex-wrap gap-2">
                    {page.kb_context_used.map((kb, i) => (
                      <span key={i} className="al-badge-blue">{kb}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="al-card text-center">
                  <p className="text-3xl font-semibold text-al-blue">{components.length}</p>
                  <p className="text-xs text-al-text-secondary uppercase mt-1">Components</p>
                </div>
                <div className="al-card text-center">
                  <p className="text-3xl font-semibold text-al-orange">{actions.length}</p>
                  <p className="text-xs text-al-text-secondary uppercase mt-1">Actions</p>
                </div>
                <div className="al-card text-center">
                  <p className="text-3xl font-semibold text-al-success">
                    {actions.filter(a => a.navigates_to_page_id || a.opens_component_id).length}
                  </p>
                  <p className="text-xs text-al-text-secondary uppercase mt-1">Nav Links</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-6">
            {Object.entries(componentsByType).map(([type, comps]) => (
              <div key={type}>
                <h3 className="text-lg font-semibold text-al-text-primary mb-4 capitalize">
                  {type}s ({comps.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="al-card cursor-pointer hover:shadow-lg hover:border-al-blue transition-all"
                      onClick={() => setSelectedComponent(comp)}
                    >
                      {comp.screenshot_path && (
                        <img
                          src={comp.screenshot_path}
                          alt={comp.component_name}
                          className="w-full h-32 object-cover object-top rounded mb-3 border border-al-border"
                        />
                      )}
                      <h4 className="font-medium text-al-text-primary mb-1">
                        {comp.component_name}
                      </h4>
                      <p className="text-xs text-al-text-muted mb-2 uppercase">
                        {comp.component_type}
                      </p>
                      <p className="text-sm text-al-text-secondary line-clamp-3">
                        {comp.ai_description || 'No description'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Component Detail Modal */}
        {selectedComponent && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedComponent(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-al-border flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-al-text-primary">
                    {selectedComponent.component_name}
                  </h2>
                  <p className="text-sm text-al-text-muted uppercase mt-1">
                    {selectedComponent.component_type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="text-al-text-muted hover:text-al-text-primary p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Screenshot */}
                {selectedComponent.screenshot_path && (
                  <div>
                    <h3 className="al-label mb-3">Screenshot</h3>
                    <a
                      href={selectedComponent.screenshot_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={selectedComponent.screenshot_path}
                        alt={selectedComponent.component_name}
                        className="w-full max-h-80 object-contain rounded border border-al-border bg-al-bg hover:opacity-90 transition-opacity"
                      />
                    </a>
                    <p className="text-xs text-al-text-muted mt-2">Click image to view full size</p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="al-label mb-3">Description</h3>
                  <p className="text-al-text-primary leading-relaxed">
                    {selectedComponent.ai_description 
                      ? highlightFormFields(selectedComponent.ai_description)
                      : <span className="text-al-text-muted italic">No description available</span>
                    }
                  </p>
                </div>

                {/* KB Context */}
                {selectedComponent.kb_context_used && (
                  <div>
                    <h3 className="al-label mb-3">KB Context</h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        let kbItems: any = selectedComponent.kb_context_used
                        // Parse if it's a JSON string
                        if (typeof kbItems === 'string') {
                          try {
                            kbItems = JSON.parse(kbItems)
                          } catch {
                            kbItems = [kbItems]
                          }
                        }
                        if (!Array.isArray(kbItems)) kbItems = [kbItems]
                        return kbItems.map((kb: string, i: number) => (
                          <span key={i} className="al-badge-blue">{kb}</span>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-al-border bg-al-bg">
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="al-btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-6">
            {sortedActionTypes.map((type) => (
              <div key={type}>
                <h3 className="text-lg font-semibold text-al-text-primary mb-4 capitalize">
                  {type.replace(/_/g, ' ')} ({actionsByType[type].length})
                </h3>
                <div className="al-card p-0 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-al-bg">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                          Action
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-al-text-secondary border-b border-al-border">
                          Navigation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionsByType[type].map((action) => (
                        <tr 
                          key={action.id} 
                          className="hover:bg-al-bg transition-colors cursor-pointer"
                          onClick={() => setSelectedAction(action)}
                        >
                          <td className="px-4 py-3 border-b border-al-border-light">
                            <div>
                              <p className="text-sm font-medium text-al-text-primary">
                                {getActionDisplayText(action)}
                              </p>
                              {action.description && (
                                <p className="text-xs text-al-text-muted line-clamp-2 mt-1">
                                  {action.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-al-border-light">
                            {action.navigates_to_page && (
                              <Link
                                to={`/pages/${encodeURIComponent(action.navigates_to_page.url_pattern)}`}
                                className="text-sm text-al-blue hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                {action.navigates_to_page.title || action.navigates_to_page.url_pattern}
                              </Link>
                            )}
                            {action.opens_component && (
                              <span className="text-sm text-al-orange flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                {action.opens_component.component_name}
                              </span>
                            )}
                            {!action.navigates_to_page && !action.opens_component && (
                              <span className="text-sm text-al-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Detail Modal */}
        {selectedAction && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAction(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-al-border flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-al-text-primary">
                    {getActionDisplayText(selectedAction)}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded bg-al-bg text-al-text-secondary uppercase">
                      {selectedAction.element_type || 'unknown'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-al-text-muted hover:text-al-text-primary p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Description */}
                {selectedAction.description && (
                  <div>
                    <h3 className="al-label mb-3">Description</h3>
                    <p className="text-al-text-primary leading-relaxed">
                      {highlightFormFields(selectedAction.description)}
                    </p>
                  </div>
                )}

                {/* Destination Screenshot */}
                {(selectedAction.navigates_to_page?.screenshot_path || selectedAction.opens_component?.screenshot_path) && (
                  <div>
                    <h3 className="al-label mb-3">
                      {selectedAction.navigates_to_page ? 'Destination Page' : 'Opens Component'}
                    </h3>
                    <a
                      href={selectedAction.navigates_to_page?.screenshot_path || selectedAction.opens_component?.screenshot_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-al-border hover:border-al-blue transition-colors"
                    >
                      <img
                        src={selectedAction.navigates_to_page?.screenshot_path || selectedAction.opens_component?.screenshot_path}
                        alt={selectedAction.navigates_to_page?.title || selectedAction.opens_component?.component_name || 'Destination'}
                        className="w-full max-h-64 object-cover object-top"
                      />
                    </a>
                    <p className="text-xs text-al-text-muted text-center mt-2">Click to view full size</p>
                  </div>
                )}

                {/* Navigation */}
                {(selectedAction.navigates_to_page || selectedAction.opens_component) && (
                  <div>
                    <h3 className="al-label mb-3">Navigation</h3>
                    {selectedAction.navigates_to_page && (
                      <Link
                        to={`/pages/${encodeURIComponent(selectedAction.navigates_to_page.url_pattern)}`}
                        className="flex items-center gap-3 p-3 bg-al-bg rounded-lg hover:bg-al-border-light transition-colors"
                        onClick={() => setSelectedAction(null)}
                      >
                        <svg className="w-5 h-5 text-al-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-al-text-primary">
                            {selectedAction.navigates_to_page.title || 'Page'}
                          </p>
                          <p className="text-xs text-al-text-muted">
                            {selectedAction.navigates_to_page.url_pattern}
                          </p>
                        </div>
                      </Link>
                    )}
                    {selectedAction.opens_component && (
                      <div className="flex items-center gap-3 p-3 bg-al-bg rounded-lg">
                        <svg className="w-5 h-5 text-al-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-al-text-primary">
                            {selectedAction.opens_component.component_name}
                          </p>
                          <p className="text-xs text-al-text-muted capitalize">
                            {selectedAction.opens_component.component_type}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* KB Context */}
                {selectedAction.kb_context_used && (
                  <div>
                    <h3 className="al-label mb-3">KB Context</h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        let kbItems: any = selectedAction.kb_context_used
                        if (typeof kbItems === 'string') {
                          try {
                            kbItems = JSON.parse(kbItems)
                          } catch {
                            kbItems = [kbItems]
                          }
                        }
                        if (!Array.isArray(kbItems)) kbItems = [kbItems]
                        return kbItems.map((kb: string, i: number) => (
                          <span key={i} className="al-badge-blue">{kb}</span>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Raw Element Text */}
                <div>
                  <h3 className="al-label mb-3">Original Element Text</h3>
                  <code className="block bg-al-bg px-3 py-2 rounded text-sm font-mono text-al-text-secondary">
                    {selectedAction.element_text}
                  </code>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-al-border bg-al-bg">
                <button
                  onClick={() => setSelectedAction(null)}
                  className="al-btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

