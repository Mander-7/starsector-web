import type { StarNode } from '../types'

interface Edge {
  from: string
  to: string
}

interface GeneratedMap {
  nodes: StarNode[]
  edges: Edge[]
  seed: number
}

export function generateStarMap(seed: number = 42): GeneratedMap {
  // Simple LCG for deterministic random
  const rand = ((s: number) => {
    let state = s
    return () => {
      state = (state * 1664525 + 1013904223) & 0xffffffff
      return (state >>> 0) / 0xffffffff
    }
  })(seed)

  const nodeCount = 6 + Math.floor(rand() * 4) // 6-9 nodes

  const nodeNames = [
    '织女星系', '天狼星系', '参宿星系', '毕宿星系',
    '角宿星系', '北斗星系', '紫微星系', '南斗星系', '银河核心',
  ]

  const types: StarNode['type'][] = ['Star', 'Star', 'Star', 'Station', 'Ruin', 'AsteroidField']

  // Generate nodes with minimum distance constraint, scattered across a 2D area
  const nodes: StarNode[] = []
  const spread = 12 // map half-width
  const minDist = 3.5

  for (let i = 0; i < nodeCount; i++) {
    let x: number, y: number
    let attempts = 0
    do {
      x = (rand() - 0.5) * spread * 2
      y = (rand() - 0.5) * spread * 2
      attempts++
    } while (
      attempts < 50 &&
      nodes.some((n) => {
        const dx = n.position[0] - x
        const dy = n.position[1] - y
        return Math.sqrt(dx * dx + dy * dy) < minDist
      })
    )

    const type = types[Math.floor(rand() * types.length)]

    nodes.push({
      id: `node_${i}`,
      name: nodeNames[i] ?? `星系 ${i + 1}`,
      type,
      position: [x, y, 0],
      hasStation: type === 'Station' || rand() > 0.5,
      dangerLevel: 1 + Math.floor(rand() * 5),
    })
  }

  // Connect nodes to form a connected graph (minimum spanning tree + extras)
  const edges: Edge[] = []
  const connected = new Set<string>()

  // Start from first node
  connected.add(nodes[0].id)

  // Prim's algorithm for MST
  while (connected.size < nodes.length) {
    let bestDist = Infinity
    let bestEdge: Edge | null = null

    for (const n of nodes) {
      if (!connected.has(n.id)) continue
      for (const m of nodes) {
        if (connected.has(m.id)) continue
        const dx = n.position[0] - m.position[0]
        const dy = n.position[1] - m.position[1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < bestDist) {
          bestDist = dist
          bestEdge = { from: n.id, to: m.id }
        }
      }
    }

    if (bestEdge) {
      edges.push(bestEdge)
      connected.add(bestEdge.to)
    }
  }

  // Add a few extra edges for alternate paths
  const extraEdges = Math.floor(nodeCount * 0.3)
  for (let i = 0; i < extraEdges; i++) {
    const a = nodes[Math.floor(rand() * nodes.length)]
    const b = nodes[Math.floor(rand() * nodes.length)]
    if (a.id !== b.id && !edges.some((e) =>
      (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id)
    )) {
      edges.push({ from: a.id, to: b.id })
    }
  }

  return { nodes, edges, seed }
}
