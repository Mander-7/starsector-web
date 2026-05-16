import * as THREE from 'three'
import type { HullTemplate } from '../types'

// ---- seeded PRNG ----

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- control point definition ----

interface PointDef {
  x: [number, number]
  y: [number, number]
}

interface TemplateDef {
  points: (PointDef | null)[] // index 0..8, null = point not used
  wingIndex: number | null
  noseStyle: 'sharp' | 'blunt' | 'forked'
  engineCount: number
  bridgeStyle: 'box' | 'flat' | 'tower' | 'sleek' | 'split' | 'dome' | 'antenna' | 'fin' | 'embedded'
  curveSegments: number[] // indices of control points where outgoing segment uses quadraticCurveTo
}

const TEMPLATES: Record<HullTemplate, TemplateDef> = {
  arrow: {
    points: [
      null,                                    // P0 nose tip (fixed at [1,0])
      { x: [0.70, 0.82], y: [0.18, 0.35] },   // P1 nose shoulder
      { x: [0.32, 0.50], y: [0.55, 0.80] },   // P2 front body
      { x: [0.00, 0.18], y: [0.80, 1.00] },   // P3 mid body (widest)
      { x: [-0.25, -0.10], y: [0.65, 0.85] }, // P4 rear body
      { x: [-0.20, -0.05], y: [0.95, 1.20] }, // P5 wing bulge
      { x: [-0.62, -0.46], y: [0.45, 0.65] }, // P6 engine shoulder
      { x: [-0.90, -0.80], y: [0.10, 0.22] }, // P7 engine tail
      null,                                    // P8 tail tip (fixed at [-1,0])
    ],
    wingIndex: 5,
    noseStyle: 'sharp',
    engineCount: 2,
    bridgeStyle: 'box',
    curveSegments: [1, 4, 5],

  },
  wedge: {
    points: [
      null,
      { x: [0.52, 0.70], y: [0.50, 0.70] },
      { x: [0.22, 0.40], y: [0.75, 0.95] },
      { x: [-0.05, 0.12], y: [0.85, 1.00] },
      { x: [-0.35, -0.20], y: [0.60, 0.80] },
      null,                                    // no wing
      { x: [-0.68, -0.52], y: [0.35, 0.55] },
      { x: [-0.90, -0.80], y: [0.15, 0.28] },
      null,
    ],
    wingIndex: null,
    noseStyle: 'blunt',
    engineCount: 1,
    bridgeStyle: 'flat',
    curveSegments: [1, 4],

  },
  brick: {
    points: [
      null,
      { x: [0.80, 0.92], y: [0.75, 0.95] },
      { x: [0.35, 0.48], y: [0.82, 0.98] },
      { x: [-0.02, 0.10], y: [0.85, 1.00] },
      { x: [-0.35, -0.22], y: [0.80, 0.95] },
      null,
      { x: [-0.70, -0.58], y: [0.50, 0.68] },
      { x: [-0.92, -0.85], y: [0.22, 0.38] },
      null,
    ],
    wingIndex: null,
    noseStyle: 'blunt',
    engineCount: 3,
    bridgeStyle: 'tower',
    curveSegments: [1, 4],
  },
  needle: {
    points: [
      null,
      { x: [0.76, 0.88], y: [0.10, 0.22] },
      { x: [0.38, 0.52], y: [0.25, 0.42] },
      { x: [0.00, 0.15], y: [0.35, 0.52] },
      { x: [-0.25, -0.12], y: [0.28, 0.42] },
      null,
      { x: [-0.60, -0.48], y: [0.18, 0.30] },
      { x: [-0.88, -0.82], y: [0.06, 0.14] },
      null,
    ],
    wingIndex: null,
    noseStyle: 'sharp',
    engineCount: 1,
    bridgeStyle: 'sleek',
    curveSegments: [1, 4],
  },
  crescent: {
    points: [
      null,
      { x: [0.62, 0.78], y: [0.22, 0.40] },
      { x: [0.28, 0.45], y: [0.55, 0.80] },
      { x: [-0.05, 0.12], y: [0.70, 0.95] },
      { x: [-0.20, -0.05], y: [0.60, 0.85] },
      { x: [-0.18, 0.05], y: [1.00, 1.35] }, // prominent wing
      { x: [-0.58, -0.42], y: [0.30, 0.50] },
      { x: [-0.85, -0.75], y: [0.06, 0.16] },
      null,
    ],
    wingIndex: 5,
    noseStyle: 'forked',
    engineCount: 2,
    bridgeStyle: 'split',
    curveSegments: [1, 4, 5],

  },
  hammerhead: {
    points: [
      null,                                    // P0
      { x: [0.72, 0.88], y: [0.85, 1.10] },   // P1 extreme wide nose
      { x: [0.35, 0.55], y: [0.90, 1.20] },   // P2 hammer head
      { x: [0.00, 0.18], y: [0.85, 1.10] },   // P3 wide mid
      { x: [-0.35, -0.18], y: [0.35, 0.55] }, // P4 sharp waist
      null,                                    // no wing
      { x: [-0.70, -0.55], y: [0.18, 0.32] }, // P6 narrow engine
      { x: [-0.90, -0.82], y: [0.10, 0.20] }, // P7
      null,                                    // P8
    ],
    wingIndex: null,
    noseStyle: 'blunt',
    engineCount: 3,
    bridgeStyle: 'flat',
    curveSegments: [1, 4],

  },
  split: {
    points: [
      null,                                    // P0
      { x: [0.68, 0.82], y: [0.15, 0.30] },   // P1 fork prong start
      { x: [0.38, 0.55], y: [0.45, 0.65] },   // P2 body widens
      { x: [0.02, 0.18], y: [0.65, 0.85] },   // P3
      { x: [-0.22, -0.08], y: [0.55, 0.75] }, // P4
      { x: [-0.15, 0.00], y: [0.85, 1.15] },  // P5 wing
      { x: [-0.60, -0.45], y: [0.30, 0.48] }, // P6 engine
      { x: [-0.88, -0.78], y: [0.08, 0.18] }, // P7
      null,                                    // P8
    ],
    wingIndex: 5,
    noseStyle: 'forked',
    engineCount: 2,
    bridgeStyle: 'split',
    curveSegments: [1, 4, 5],

  },
  lance: {
    points: [
      null,                                    // P0
      { x: [0.78, 0.92], y: [0.05, 0.15] },   // P1 needle nose
      { x: [0.42, 0.58], y: [0.08, 0.20] },   // P2 thin body
      { x: [0.05, 0.20], y: [0.12, 0.25] },   // P3 slight bulge
      { x: [-0.18, -0.05], y: [0.10, 0.22] }, // P4 still thin
      null,                                    // no wing
      { x: [-0.55, -0.40], y: [0.45, 0.65] }, // P6 bulb engine!
      { x: [-0.90, -0.82], y: [0.18, 0.32] }, // P7 engine taper
      null,                                    // P8
    ],
    wingIndex: null,
    noseStyle: 'sharp',
    engineCount: 1,
    bridgeStyle: 'sleek',
    curveSegments: [1, 4],

  },
}

// ---- main generator ----

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

export interface GeneratorOutput {
  outline: THREE.Shape
  bridgeGeo: THREE.BufferGeometry
  engineGeos: THREE.BufferGeometry[]
  noseStyle: 'sharp' | 'blunt' | 'forked'
  depthCurve: number[] // Z-depth multipliers [nose..mid..engine]
  maxDepthPos: number  // x-position (in world coords) of max depth
  maxDepthVal: number  // max depth multiplier value
}

export function generateShipShape(
  template: HullTemplate,
  seed: number,
  length: number,
  width: number,
): GeneratorOutput {
  const rng = mulberry32(seed || Math.floor(Math.random() * 2147483647))
  const def = TEMPLATES[template]
  const hw = width / 2 // half-width
  const hl = length / 2 // half-length

  // Generate top-half control points with original indices
  const pts: { x: number; y: number; idx: number }[] = []
  pts.push({ x: hl, y: 0, idx: 0 }) // P0: nose tip

  for (let i = 1; i <= 7; i++) {
    const pd = def.points[i]
    if (!pd) continue
    const x = hl * randRange(rng, pd.x[0], pd.x[1])
    const y = hw * randRange(rng, pd.y[0], pd.y[1])
    pts.push({ x, y, idx: i })
  }

  pts.push({ x: -hl, y: 0, idx: 8 }) // P8: tail tip

  // Build bottom half as exact mirror of top half
  const bottomPts: { x: number; y: number; idx: number }[] = []
  for (let i = pts.length - 2; i >= 0; i--) {
    bottomPts.push({ x: pts[i].x, y: -pts[i].y, idx: pts[i].idx })
  }

  // Full outline: top half → bottom half (guarantees perfect symmetry)
  const allPts = [...pts, ...bottomPts]

  const shape = new THREE.Shape()
  shape.moveTo(allPts[0].x, allPts[0].y)

  function shouldCurve(fromIdx: number, toIdx: number): boolean {
    // Curve the segment if either endpoint index is in curveSegments
    return def.curveSegments.includes(fromIdx) || def.curveSegments.includes(toIdx)
  }

  for (let i = 1; i < allPts.length; i++) {
    const prev = allPts[i - 1]
    const cur = allPts[i]
    if (shouldCurve(prev.idx, cur.idx)) {
      const cpx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.15
      const cpy = (prev.y + cur.y) / 2 + (prev.x - cur.x) * 0.15
      shape.quadraticCurveTo(cpx, cpy, cur.x, cur.y)
    } else {
      shape.lineTo(cur.x, cur.y)
    }
  }

  // Generate bridge geometry
  const bridgeGeo = makeBridge(def.bridgeStyle, length, width)

  // Generate engine geometries
  const engineCount = def.engineCount
  const ew = (def.points[6] ? (def.points[6].y[0] + def.points[6].y[1]) / 2 : 0.4) * width
  const engineStyle = getEngineStyle(template)
  const engineGeos = makeEngines(engineCount, engineStyle, ew)

  // Compute depth curve from template characteristics
  const isSlim = template === 'needle' || template === 'lance'
  const isHeavy = template === 'brick' || template === 'hammerhead'
  const depthCurve: number[] = [
    isSlim ? 0.3 : isHeavy ? 0.7 : 0.5,     // nose
    isSlim ? 0.5 : isHeavy ? 1.4 : 1.2,     // mid body
    isSlim ? 0.4 : isHeavy ? 1.0 : 0.7,     // engine
  ]
  // Compute max depth position and value for armor plate placement
  const midIdx = Math.floor(pts.length / 2)
  const maxDepthPos = pts[midIdx]?.x ?? hl * 0.2
  const maxDepthVal = depthCurve[1]

  return { outline: shape, bridgeGeo, engineGeos, noseStyle: def.noseStyle, depthCurve, maxDepthPos, maxDepthVal }
}

// ---- bridge geometries ----

function makeBridge(style: TemplateDef['bridgeStyle'], length: number, width: number): THREE.BufferGeometry {
  switch (style) {
    case 'box':
      return new THREE.BoxGeometry(length * 0.12, width * 0.18, 0.12)
    case 'flat':
      return new THREE.BoxGeometry(length * 0.18, width * 0.12, 0.08)
    case 'tower':
      return new THREE.BoxGeometry(length * 0.08, width * 0.14, 0.22)
    case 'sleek':
      return new THREE.BoxGeometry(length * 0.15, width * 0.10, 0.06)
    case 'split':
      return new THREE.BoxGeometry(length * 0.08, width * 0.08, 0.14)
    case 'dome':
      return new THREE.SphereGeometry(width * 0.09, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)
    case 'antenna':
      return new THREE.CylinderGeometry(width * 0.015, width * 0.02, 0.2, 5)
    case 'fin':
      return new THREE.BoxGeometry(length * 0.03, width * 0.06, 0.2)
    case 'embedded':
      return new THREE.BoxGeometry(length * 0.14, width * 0.14, 0.04)
  }
}

// ---- engine selection ----

type EngineStyle = 'cylinder' | 'vectored' | 'ion' | 'triple' | 'ring'

function getEngineStyle(template: HullTemplate): EngineStyle {
  switch (template) {
    case 'hammerhead': return 'triple'
    case 'split': return 'ion'
    case 'lance': return 'ring'
    case 'brick': return 'triple'
    case 'needle': return 'ring'
    case 'crescent': return 'ion'
    default: return 'cylinder'
  }
}

// ---- engine geometries ----

function makeEngines(count: number, style: EngineStyle, engineWidth: number): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = []
  const r = engineWidth * 0.12

  for (let i = 0; i < count; i++) {
    switch (style) {
      case 'cylinder':
        geos.push(new THREE.CylinderGeometry(r, r * 0.7, 0.15, 6))
        break
      case 'vectored': {
        const g = new THREE.CylinderGeometry(r, r * 0.5, 0.12, 5)
        geos.push(g)
        break
      }
      case 'ion':
        geos.push(new THREE.BoxGeometry(r * 1.8, r * 0.3, 0.08))
        break
      case 'triple':
        geos.push(new THREE.CylinderGeometry(r * 0.5, r * 0.35, 0.2, 5))
        break
      case 'ring':
        geos.push(new THREE.TorusGeometry(r * 0.9, r * 0.3, 5, 6))
        break
    }
  }
  return geos
}
