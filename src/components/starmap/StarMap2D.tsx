import { useState, useRef, useCallback } from 'react'
import type { StarNode } from '../../types'

const PADDING = 60
const NODE_RADIUS = 16
const SCALE = 40 // world units → pixels

interface StarMap2DProps {
  nodes: StarNode[]
  edges: { from: string; to: string }[]
  currentNodeId: string
  onNodeClick: (node: StarNode) => void
}

export function StarMap2D({ nodes, edges, currentNodeId, onNodeClick }: StarMap2DProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ userSelect: 'none' }}
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
              zIndex: isCurrent ? 10 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation()
              onNodeClick(node)
            }}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Glow ring for current */}
            {isCurrent && (
              <div
                className="absolute rounded-full animate-pulse"
                style={{
                  width: size * 2.4,
                  height: size * 2.4,
                  left: -size * 0.2,
                  top: -size * 0.2,
                  border: '2px solid var(--color-accent, #4488ff)',
                  opacity: 0.6,
                }}
              />
            )}
            {/* Node circle */}
            <div
              className="rounded-full transition-all duration-150"
              style={{
                width: size * 2,
                height: size * 2,
                backgroundColor: nodeColor(node),
                boxShadow: isCurrent
                  ? `0 0 ${size}px ${nodeColor(node)}`
                  : `0 0 ${size * 0.3}px ${nodeColor(node)}`,
                opacity: isHovered ? 1 : 0.85,
              }}
            />
            {/* Label */}
            <span
              className="text-[10px] whitespace-nowrap mt-1 transition-opacity"
              style={{
                color: isCurrent ? '#fff' : '#888',
                opacity: isHovered || isCurrent ? 1 : 0.5,
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

      {/* Legend */}
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
