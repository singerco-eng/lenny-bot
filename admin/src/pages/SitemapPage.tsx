import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { supabase } from '../lib/supabase'

// Types for our sitemap data
interface SitemapPage {
  id: string
  url_pattern: string
  title: string | null
  product_area_id: string | null
  product_area?: { id: string; name: string } | null
}

interface NavigationEdge {
  source_page_id: string
  target_page_id: string
  action_count: number
  actions: string[]
}

// Edge data type
interface EdgeData {
  actions: string[]
  action_count: number
  showLabel?: boolean // Only show ×N label when filtering
}

// Product area colors - using AccuLynx palette
const PRODUCT_AREA_COLORS: Record<string, string> = {
  'Job Management': '#f97316', // al-orange
  'Dashboard': '#3b82f6', // al-blue  
  'Settings': '#6b7280', // gray
  'Reports': '#10b981', // green
  'Communications': '#8b5cf6', // purple
  'default': '#1e3a5f', // al-navy
}

// Custom node component for pages
interface PageNodeData {
  title: string
  url_pattern: string
  product_area: string | null
  action_count: number
  component_count: number
}

function PageNode({ data }: { data: PageNodeData }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const nodeRef = useRef<HTMLDivElement>(null)
  const color = PRODUCT_AREA_COLORS[data.product_area || ''] || PRODUCT_AREA_COLORS.default
  
  const handleMouseEnter = () => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      setTooltipPos({ x: rect.right + 8, y: rect.top })
    }
    setShowTooltip(true)
  }
  
  return (
    <div 
      ref={nodeRef}
      className="bg-white rounded-lg shadow-md border-2 px-4 py-3 min-w-[200px] max-w-[280px] cursor-pointer hover:shadow-lg transition-shadow relative"
      style={{ borderColor: color }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!bg-al-navy !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-al-navy !w-3 !h-3" />
      
      {/* Title */}
      <h3 className="font-semibold text-al-text-primary text-sm leading-tight mb-1 truncate">
        {data.title || 'Untitled Page'}
      </h3>
      
      {/* URL pattern */}
      <code className="text-[10px] text-al-text-muted block truncate mb-2">
        {data.url_pattern}
      </code>
      
      {/* Product area & stats */}
      <div className="flex items-center justify-between text-[10px]">
        {data.product_area && (
          <span 
            className="px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: color }}
          >
            {data.product_area}
          </span>
        )}
        <span className="text-al-text-muted ml-auto">
          {data.action_count} actions
        </span>
      </div>

      {/* Hover tooltip - rendered via portal to appear above everything */}
      {showTooltip && createPortal(
        <div 
          className="fixed bg-al-navy text-white text-xs rounded-lg p-3 shadow-2xl min-w-[180px] pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999 }}
        >
          <div className="font-semibold mb-2">{data.title}</div>
          <div className="space-y-1 text-white/80">
            <div className="flex justify-between">
              <span>Actions:</span>
              <span className="font-medium text-white">{data.action_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Components:</span>
              <span className="font-medium text-white">{data.component_count}</span>
            </div>
            {data.product_area && (
              <div className="flex justify-between">
                <span>Area:</span>
                <span className="font-medium text-white">{data.product_area}</span>
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-white/20 text-white/60 text-center">
            Click to filter connections
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Custom edge with hover tooltip
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const edgeData = data as any as EdgeData | undefined
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const actionCount = edgeData?.action_count || 1
  const actions = edgeData?.actions || []
  const showLabel = edgeData?.showLabel ?? false

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX + 15, y: e.clientY + 15 })
  }

  return (
    <g>
      {/* Visible edge path */}
      <path
        id={id}
        style={{
          ...style,
          strokeWidth: 1.5, // Uniform width for all edges
          stroke: '#1e3a5f',
          pointerEvents: 'none', // Let the invisible path handle events
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Invisible wider path for easier hover - handles all mouse events */}
      <path
        d={edgePath}
        style={{ strokeWidth: 20, stroke: 'transparent', fill: 'none', cursor: 'pointer' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseMove={handleMouseMove}
      />
      {/* Label - only show when filtering and action count > 1 */}
      {showLabel && actionCount > 1 && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x="-12"
            y="-10"
            width="24"
            height="20"
            rx="4"
            fill="white"
            stroke="#e5e7eb"
          />
          <text
            className="text-[10px] font-semibold"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#1e3a5f"
          >
            ×{actionCount}
          </text>
        </g>
      )}
      {/* Tooltip - rendered via portal to appear above everything */}
      {showTooltip && actions.length > 0 && createPortal(
        <div 
          className="fixed bg-white rounded-lg shadow-2xl border border-al-border p-3 text-xs pointer-events-none"
          style={{ left: mousePos.x, top: mousePos.y, zIndex: 9999, maxWidth: 240 }}
        >
          <p className="font-semibold text-al-text-primary mb-2">
            {actionCount} action{actionCount > 1 ? 's' : ''}:
          </p>
          <ul className="space-y-1 max-h-[150px] overflow-y-auto">
            {actions.slice(0, 10).map((action, i) => (
              <li key={i} className="text-al-text-secondary truncate">
                • {action}
              </li>
            ))}
            {actions.length > 10 && (
              <li className="text-al-text-muted italic">
                +{actions.length - 10} more...
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </g>
  )
}

// Node types registry
const nodeTypes = {
  pageNode: PageNode,
}

// Edge types registry
const edgeTypes = {
  custom: CustomEdge,
}

export default function SitemapPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [pageStats, setPageStats] = useState<Record<string, { actions: number; components: number }>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEdge, setSelectedEdge] = useState<{ actions: string[], source: string, target: string } | null>(null)
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [allEdges, setAllEdges] = useState<Edge[]>([])
  const [filteredNodeId, setFilteredNodeId] = useState<string | null>(null) // For filtering by node connections

  // Fetch sitemap data
  useEffect(() => {
    async function fetchSitemapData() {
      try {
        // Fetch all pages
        const { data: pages, error: pagesError } = await supabase
          .from('app_pages')
          .select(`
            id,
            url_pattern,
            title,
            product_area_id,
            product_area:product_areas(id, name)
          `)
          .order('title')

        if (pagesError) throw pagesError

        // Fetch navigation actions (edges between pages)
        const { data: actions, error: actionsError } = await supabase
          .from('page_actions')
          .select('page_id, navigates_to_page_id, element_text')
          .not('navigates_to_page_id', 'is', null)

        if (actionsError) throw actionsError

        // Fetch action counts per page
        const { data: actionCounts, error: actionCountsError } = await supabase
          .from('page_actions')
          .select('page_id')

        if (actionCountsError) throw actionCountsError

        // Fetch component counts per page
        const { data: componentCounts, error: componentCountsError } = await supabase
          .from('page_components')
          .select('page_id')

        if (componentCountsError) throw componentCountsError

        // Calculate stats per page
        const stats: Record<string, { actions: number; components: number }> = {}
        actionCounts?.forEach(a => {
          if (!stats[a.page_id]) stats[a.page_id] = { actions: 0, components: 0 }
          stats[a.page_id].actions++
        })
        componentCounts?.forEach(c => {
          if (!stats[c.page_id]) stats[c.page_id] = { actions: 0, components: 0 }
          stats[c.page_id].components++
        })
        setPageStats(stats)

        // Build navigation edges with bundling
        const edgeMap = new Map<string, NavigationEdge>()
        actions?.forEach(action => {
          const key = `${action.page_id}->${action.navigates_to_page_id}`
          if (!edgeMap.has(key)) {
            edgeMap.set(key, {
              source_page_id: action.page_id,
              target_page_id: action.navigates_to_page_id,
              action_count: 0,
              actions: [],
            })
          }
          const edge = edgeMap.get(key)!
          edge.action_count++
          edge.actions.push(action.element_text)
        })

        // ===== HIERARCHICAL LAYOUT ALGORITHM =====
        
        // Build adjacency lists for graph traversal
        const outgoingEdges = new Map<string, string[]>() // source -> [targets]
        const incomingEdges = new Map<string, string[]>() // target -> [sources]
        
        Array.from(edgeMap.values()).forEach(edge => {
          // Skip self-referential edges for layout
          if (edge.source_page_id === edge.target_page_id) return
          
          if (!outgoingEdges.has(edge.source_page_id)) {
            outgoingEdges.set(edge.source_page_id, [])
          }
          outgoingEdges.get(edge.source_page_id)!.push(edge.target_page_id)
          
          if (!incomingEdges.has(edge.target_page_id)) {
            incomingEdges.set(edge.target_page_id, [])
          }
          incomingEdges.get(edge.target_page_id)!.push(edge.source_page_id)
        })

        // Find hub nodes (nodes with most outgoing edges, or most total actions)
        // These will be at the top of the hierarchy
        const pageIds = (pages || []).map(p => p.id)
        const hubScores = pageIds.map(id => ({
          id,
          score: (outgoingEdges.get(id)?.length || 0) * 10 + (stats[id]?.actions || 0),
          outgoing: outgoingEdges.get(id)?.length || 0,
          incoming: incomingEdges.get(id)?.length || 0,
        }))
        hubScores.sort((a, b) => b.score - a.score)
        
        // Calculate depth using BFS from hub nodes
        const depths = new Map<string, number>()
        const visited = new Set<string>()
        const queue: { id: string; depth: number }[] = []
        
        // Start with hub nodes at depth 0
        const hubNodes = hubScores.filter(h => h.outgoing > 0).slice(0, 3).map(h => h.id)
        if (hubNodes.length === 0 && pageIds.length > 0) {
          hubNodes.push(pageIds[0]) // Fallback to first page
        }
        
        hubNodes.forEach(hubId => {
          if (!visited.has(hubId)) {
            queue.push({ id: hubId, depth: 0 })
            visited.add(hubId)
            depths.set(hubId, 0)
          }
        })
        
        // BFS to assign depths
        while (queue.length > 0) {
          const { id, depth } = queue.shift()!
          const targets = outgoingEdges.get(id) || []
          
          targets.forEach(targetId => {
            if (!visited.has(targetId)) {
              visited.add(targetId)
              depths.set(targetId, depth + 1)
              queue.push({ id: targetId, depth: depth + 1 })
            }
          })
        }
        
        // Assign remaining unvisited nodes to the bottom
        const maxDepth = Math.max(...Array.from(depths.values()), 0)
        pageIds.forEach(id => {
          if (!depths.has(id)) {
            depths.set(id, maxDepth + 1)
          }
        })
        
        // Group nodes by depth level
        const levelGroups = new Map<number, typeof pages>()
        ;(pages || []).forEach(page => {
          const depth = depths.get(page.id) || 0
          if (!levelGroups.has(depth)) {
            levelGroups.set(depth, [])
          }
          levelGroups.get(depth)!.push(page)
        })
        
        // Layout constants
        const NODE_WIDTH = 280
        const NODE_HEIGHT = 100
        const HORIZONTAL_GAP = 60
        const VERTICAL_GAP = 150
        const CANVAS_PADDING = 50
        
        // Calculate positions for each node
        const positions = new Map<string, { x: number; y: number }>()
        const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)
        
        // Find max width needed (for centering)
        let maxLevelWidth = 0
        sortedLevels.forEach(level => {
          const nodesInLevel = levelGroups.get(level)!.length
          const levelWidth = nodesInLevel * NODE_WIDTH + (nodesInLevel - 1) * HORIZONTAL_GAP
          maxLevelWidth = Math.max(maxLevelWidth, levelWidth)
        })
        
        // Position nodes level by level
        sortedLevels.forEach(level => {
          const nodesInLevel = levelGroups.get(level)!
          const levelWidth = nodesInLevel.length * NODE_WIDTH + (nodesInLevel.length - 1) * HORIZONTAL_GAP
          const startX = CANVAS_PADDING + (maxLevelWidth - levelWidth) / 2
          const y = CANVAS_PADDING + level * (NODE_HEIGHT + VERTICAL_GAP)
          
          // Sort nodes within level by connection count for better visual flow
          nodesInLevel.sort((a, b) => {
            const aConnections = (outgoingEdges.get(a.id)?.length || 0) + (incomingEdges.get(a.id)?.length || 0)
            const bConnections = (outgoingEdges.get(b.id)?.length || 0) + (incomingEdges.get(b.id)?.length || 0)
            return bConnections - aConnections
          })
          
          nodesInLevel.forEach((page, index) => {
            const x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP)
            positions.set(page.id, { x, y })
          })
        })

        // Create nodes with calculated positions
        const pageNodes: Node[] = (pages || []).map((page) => {
          const productAreaName = Array.isArray(page.product_area) 
            ? page.product_area[0]?.name 
            : page.product_area?.name
          
          const pos = positions.get(page.id) || { x: 0, y: 0 }
          
          return {
            id: page.id,
            type: 'pageNode',
            position: pos,
            data: {
              title: page.title || page.url_pattern,
              url_pattern: page.url_pattern,
              product_area: productAreaName || null,
              action_count: stats[page.id]?.actions || 0,
              component_count: stats[page.id]?.components || 0,
            },
          }
        })

        // Create edges with custom type - all solid lines
        const navEdges: Edge[] = Array.from(edgeMap.values()).map((edge, index) => ({
          id: `edge-${index}`,
          source: edge.source_page_id,
          target: edge.target_page_id,
          type: 'custom',
          animated: false,
          data: {
            actions: edge.actions,
            action_count: edge.action_count,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#1e3a5f',
          },
        }))

        setAllNodes(pageNodes)
        setAllEdges(navEdges)
        setNodes(pageNodes)
        setEdges(navEdges)
      } catch (err: any) {
        console.error('Error fetching sitemap data:', err)
        setError(err.message || 'Failed to load sitemap')
      } finally {
        setLoading(false)
      }
    }

    fetchSitemapData()
  }, [])

  // Filter nodes based on search OR selected node
  useEffect(() => {
    // If filtering by a specific node
    if (filteredNodeId) {
      // Find all edges connected to this node
      const connectedNodeIds = new Set<string>([filteredNodeId])
      const connectedEdgeIds = new Set<string>()
      
      allEdges.forEach(edge => {
        if (edge.source === filteredNodeId || edge.target === filteredNodeId) {
          connectedNodeIds.add(edge.source)
          connectedNodeIds.add(edge.target)
          connectedEdgeIds.add(edge.id)
        }
      })
      
      // Style nodes - highlight connected, fade others
      const filteredNodes = allNodes.map(node => ({
        ...node,
        style: connectedNodeIds.has(node.id) ? {} : { opacity: 0.15 },
      }))
      
      // Style edges - highlight connected (with labels), fade others
      const filteredEdges = allEdges.map(edge => {
        const isConnected = connectedEdgeIds.has(edge.id)
        const edgeData = edge.data as any as EdgeData
        return {
          ...edge,
          style: isConnected ? {} : { opacity: 0.1 },
          data: {
            ...edgeData,
            showLabel: isConnected, // Show ×N label only for connected edges
          },
        }
      })
      
      setNodes(filteredNodes)
      setEdges(filteredEdges)
      return
    }
    
    // If searching by text
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchingNodeIds = new Set<string>()
      
      // Find matching nodes
      const filteredNodes = allNodes.map(node => {
        const data = node.data as any as PageNodeData
        const matches = 
          data.title.toLowerCase().includes(query) ||
          data.url_pattern.toLowerCase().includes(query) ||
          (data.product_area?.toLowerCase().includes(query))
        
        if (matches) {
          matchingNodeIds.add(node.id)
        }
        
        return {
          ...node,
          style: matches ? {} : { opacity: 0.2 },
        }
      })

      // Filter edges to only show those connected to matching nodes
      const filteredEdges = allEdges.map(edge => ({
        ...edge,
        style: matchingNodeIds.has(edge.source) || matchingNodeIds.has(edge.target)
          ? {}
          : { opacity: 0.1 },
      }))

      setNodes(filteredNodes)
      setEdges(filteredEdges)
      return
    }
    
    // No filter - show all (without labels)
    setNodes(allNodes)
    // Ensure showLabel is false when no filter
    const edgesWithoutLabels = allEdges.map(edge => ({
      ...edge,
      data: {
        ...(edge.data as any as EdgeData),
        showLabel: false,
      },
    }))
    setEdges(edgesWithoutLabels)
  }, [searchQuery, filteredNodeId, allNodes, allEdges])

  // Handle node click - filter to show only connections to this node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Toggle filter - if clicking the same node, clear the filter
    if (filteredNodeId === node.id) {
      setFilteredNodeId(null)
    } else {
      setFilteredNodeId(node.id)
      setSearchQuery('') // Clear search when filtering by node
    }
  }, [filteredNodeId])
  
  // Get the filtered node's title for the chip
  const filteredNodeTitle = useMemo(() => {
    if (!filteredNodeId) return null
    const node = allNodes.find(n => n.id === filteredNodeId)
    return node ? (node.data as any as PageNodeData).title : null
  }, [filteredNodeId, allNodes])
  
  // Get the filtered node's URL pattern for the "View Details" link
  const filteredNodeUrl = useMemo(() => {
    if (!filteredNodeId) return null
    const node = allNodes.find(n => n.id === filteredNodeId)
    return node ? (node.data as any as PageNodeData).url_pattern : null
  }, [filteredNodeId, allNodes])

  // Handle edge click - show actions modal
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const edgeData = edge.data as any as EdgeData | undefined
    if (edgeData) {
      // Find source and target node titles
      const sourceNode = allNodes.find(n => n.id === edge.source)
      const targetNode = allNodes.find(n => n.id === edge.target)
      setSelectedEdge({
        actions: edgeData.actions,
        source: (sourceNode?.data as any as PageNodeData)?.title || 'Unknown',
        target: (targetNode?.data as any as PageNodeData)?.title || 'Unknown',
      })
    }
  }, [allNodes])

  // MiniMap node color
  const nodeColor = useCallback((node: Node) => {
    const productArea = (node.data as any as PageNodeData).product_area
    return PRODUCT_AREA_COLORS[productArea || ''] || PRODUCT_AREA_COLORS.default
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-al-bg flex items-center justify-center">
        <div className="text-al-text-secondary">Loading sitemap...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-al-bg flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-al-bg flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-al-navy-dark to-al-navy h-16 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-semibold tracking-wide">
            ACCU<span className="text-al-orange">LYNX</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/80 text-sm">Navigation Sitemap</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-white/80 text-sm">
            {nodes.length} pages · {edges.length} connections
          </div>
          <Link to="/" className="text-al-blue-light hover:text-white flex items-center gap-2">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Legend + Search + Active Filter */}
      <div className="bg-al-surface border-b border-al-border px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-xs font-semibold text-al-text-secondary uppercase">Product Areas:</span>
          {Object.entries(PRODUCT_AREA_COLORS).filter(([k]) => k !== 'default').map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-al-text-primary">{name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* Active filter chip */}
          {filteredNodeTitle && (
            <div className="flex items-center gap-2 bg-al-blue/10 border border-al-blue/30 rounded-full px-3 py-1.5">
              <span className="text-xs font-medium text-al-blue">
                Showing: {filteredNodeTitle}
              </span>
              <Link 
                to={`/pages/${encodeURIComponent(filteredNodeUrl || '')}`}
                className="text-xs text-al-blue hover:underline"
              >
                View Details
              </Link>
              <button
                onClick={() => setFilteredNodeId(null)}
                className="text-al-blue hover:text-al-blue-dark ml-1"
                title="Clear filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Search input - hidden when filter is active */}
          {!filteredNodeId && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 pr-8 text-sm border border-al-border rounded-lg focus:outline-none focus:border-al-blue focus:ring-1 focus:ring-al-blue bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-al-text-muted hover:text-al-text-primary"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          
          <span className="text-xs text-al-text-muted">
            {filteredNodeId 
              ? 'Click page again or ✕ to clear filter' 
              : 'Click a page to filter its connections'}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ width: '100%', height: 'calc(100vh - 112px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          style={{ background: '#f5f6f8' }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls 
            className="!bg-white !shadow-md !border !border-al-border !rounded-lg"
            position="bottom-left"
          />
          <MiniMap 
            nodeColor={nodeColor}
            className="!bg-white !shadow-md !border !border-al-border !rounded-lg"
            maskColor="rgba(0,0,0,0.1)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>

      {/* Edge Detail Modal */}
      {selectedEdge && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEdge(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-al-border flex justify-between items-start bg-al-bg">
              <div>
                <h2 className="text-lg font-semibold text-al-text-primary">
                  Navigation Actions
                </h2>
                <p className="text-sm text-al-text-secondary mt-1">
                  {selectedEdge.source} → {selectedEdge.target}
                </p>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-al-text-muted hover:text-al-text-primary p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm text-al-text-secondary mb-4">
                {selectedEdge.actions.length} action{selectedEdge.actions.length > 1 ? 's' : ''} navigate from this page:
              </p>
              <ul className="space-y-2">
                {selectedEdge.actions.map((action, i) => (
                  <li key={i} className="flex items-center gap-3 p-3 bg-al-bg rounded-lg">
                    <span className="w-6 h-6 bg-al-navy text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="text-sm text-al-text-primary">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-al-border bg-al-bg">
              <button
                onClick={() => setSelectedEdge(null)}
                className="w-full bg-al-navy text-white py-2 px-4 rounded-lg hover:bg-al-navy-dark transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

