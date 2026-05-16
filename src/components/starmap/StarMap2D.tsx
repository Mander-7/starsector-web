import { useState, useRef, useCallback, useEffect } from 'react'
import type { StarNode } from '../../types'

const PADDING = 60
const NODE_RADIUS = 16
const SCALE = 40 // world units → pixels

interface StarMap2DProps {
  nodes: StarNode[]
  edges: { from: string; to: string }[]
  currentNodeId: string
  selectedNodeId: string | null
  onNodeClick: (node: StarNode) => void
}

export function StarMap2D({ nodes, edges, currentNodeId, selectedNodeId, onNodeClick }: StarMap2DProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [prevNodeId, setPrevNodeId] = useState(currentNodeId)
  const [travelAnim, setTravelAnim] = useState(false)

  // Trigger travel animation when node changes
  useEffect(() => {
    if (currentNodeId !== prevNodeId) {
      setTravelAnim(true)
      setPrevNodeId(currentNodeId)
      const t = setTimeout(() => setTravelAnim(false), 700)
      return () => clearTimeout(t)
    }
  }, [currentNodeId, prevNodeId])
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    if (n.position[0] < minX) minX = n.position[0]
    if (n.position[1] < minY) minY = n.position[1]
    if (n.position[0] > maxX) maxX = n.position[0]
    if (n.position[1] > maxY) maxY = n.position[1]
  }

  const toScreen = (x: number, y: number): [number, number] => [
    (x - minX + PADDING / SCALE) * SCALE * zoom + pan.x,
    (y - minY + PADDING / SCALE) * SCALE * zoom + pan.y,
  ]

  // Auto-zoom to fit all nodes on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el || nodes.length === 0) return
    const rect = el.getBoundingClientRect()
    const worldW = maxX - minX + (PADDING * 2) / SCALE
    const worldH = maxY - minY + (PADDING * 2) / SCALE
    const fitZoom = Math.min(rect.width / (worldW * SCALE), rect.height / (worldH * SCALE), 2)
    setZoom(Math.max(0.3, fitZoom))
    // Center the map
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const newSX = (cx - minX + PADDING / SCALE) * SCALE * fitZoom
    const newSY = (cy - minY + PADDING / SCALE) * SCALE * fitZoom
    setPan({ x: rect.width / 2 - newSX, y: rect.height / 2 - newSY })
  }, [nodes.length])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragging.current = true
    dragStart.current = { x: clientX, y: clientY }
    panStart.current = { ...pan }
  }, [pan])

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return
    setPan({
      x: panStart.current.x + (clientX - dragStart.current.x),
      y: panStart.current.y + (clientY - dragStart.current.y),
    })
  }, [])

  const endDrag = useCallback(() => {
    dragging.current = false
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    moveDrag(e.clientX, e.clientY)
  }, [moveDrag])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [startDrag])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [moveDrag])

  const handleTouchEnd = useCallback(() => {
    endDrag()
  }, [endDrag])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)))
  }, [])

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const nodeColor = (node: StarNode) => {
    switch (node.type) {
      case 'Star': return '#ffaa22'
      case 'Station': return '#4488ff'
      case 'Ruin': return '#6644aa'
      default: return '#888888'
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[#0a0a1a] cursor-grab active:cursor-grabbing select-none relative"
      style={{ userSelect: 'none', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {edges.map((edge, i) => {
          const a = nodeMap.get(edge.from)
          const b = nodeMap.get(edge.to)
          if (!a || !b) return null
          const [x1, y1] = toScreen(a.position[0], a.position[1])
          const [x2, y2] = toScreen(b.position[0], b.position[1])
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#2e2e5a"
              strokeWidth={1}
              opacity={0.5}
            />
          )
        })}
      </svg>

      {nodes.map((node) => {
        const [sx, sy] = toScreen(node.position[0], node.position[1])
        const isCurrent = node.id === currentNodeId
        const isSelected = node.id === selectedNodeId && !isCurrent
        const isHovered = hoveredNode === node.id
        const size = isHovered ? NODE_RADIUS * 1.3 : NODE_RADIUS

        return (
          <div
            key={node.id}
            className="absolute flex flex-col items-center cursor-pointer"
            style={{
              left: sx - size,
              top: sy - size,
              width: size * 2,
              height: size * 2,
              zIndex: isSelected ? 5 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onNodeClick(node)
            }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {isSelected && (
              <div
                className="absolute rounded-full"
                style={{
                  width: size * 2.4,
                  height: size * 2.4,
                  left: -size * 0.2,
                  top: -size * 0.2,
                  border: '2px dashed rgba(255,255,255,0.5)',
                }}
              />
            )}
            <div
              className="rounded-full transition-all duration-150"
              style={{
                width: size * 2,
                height: size * 2,
                backgroundColor: nodeColor(node),
                boxShadow: isCurrent
                  ? `0 0 ${size}px ${nodeColor(node)}`
                  : isSelected
                    ? `0 0 ${size * 0.6}px ${nodeColor(node)}`
                    : `0 0 ${size * 0.3}px ${nodeColor(node)}`,
                opacity: isHovered ? 1 : 0.85,
              }}
            />
            <span
              className="text-[10px] whitespace-nowrap mt-1 transition-opacity"
              style={{
                color: isCurrent ? '#fff' : isSelected ? '#ccc' : '#888',
                opacity: isHovered || isCurrent || isSelected ? 1 : 0.5,
                fontWeight: isCurrent ? 600 : 400,
                textShadow: isCurrent ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
              }}
            >
              {node.name}
              {node.hasStation ? ' ⚓' : ''}
            </span>
          </div>
        )
      })}

      {/* Fleet marker — separate animated overlay above all nodes */}
      {(() => {
        const cn = nodes.find((n) => n.id === currentNodeId)
        if (!cn) return null
        const [fx, fy] = toScreen(cn.position[0], cn.position[1])
        const markerSize = 28
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: fx - markerSize,
              top: fy - markerSize - 14,
              width: markerSize * 2,
              height: markerSize * 2,
              zIndex: 20,
              transition: travelAnim
                ? 'left 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'none',
            }}
          >
            <svg width={markerSize * 2} height={markerSize * 2} viewBox="-16 -16 32 32" style={{ overflow: 'visible' }}>
              {/* Pulsing ring */}
              <circle cx="0" cy="-2" r="14" fill="none" stroke="#4488ff" strokeWidth="2" opacity="0.3">
                <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Ship triangle */}
              <polygon
                points="0,-12 -8,6 0,2 8,6"
                fill="#3377dd"
                stroke="#88ccff"
                strokeWidth="1.5"
                opacity={0.95}
              />
              {/* Center highlight */}
              <circle cx="0" cy="-3" r="3" fill="#88ccff" opacity={0.6} />
              {/* Engine pulses */}
              <circle cx="0" cy="5" r="2.5" fill="#88ccff" opacity={0.7}>
                <animate attributeName="r" values="2;4;2" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.1;0.7" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        )
      })()}

      <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-[var(--color-text-dim)] bg-black/40 px-2 py-1 rounded">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ffaa22] inline-block" /> 恒星
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#4488ff] inline-block" /> 空间站
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#6644aa] inline-block" /> 废墟
        </span>
        <span className="flex items-center gap-1">
          滚轮缩放 · 拖拽平移
        </span>
      </div>
    </div>
  )
}
