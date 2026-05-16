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
  bridgeStyle: 'box' | 'flat' | 'tower' | 'sleek' | 'split'
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

  // Generate top-half control points in world coordinates
  const pts: [number, number][] = []
  pts.push([hl, 0]) // P0: nose tip

  for (let i = 1; i <= 7; i++) {
    const pd = def.points[i]
    if (!pd) continue
    const x = hl * randRange(rng, pd.x[0], pd.x[1])
    const y = hw * randRange(rng, pd.y[0], pd.y[1])
    pts.push([x, y])
  }

  pts.push([-hl, 0]) // P8: tail tip

  // Build top-half Shape path
  const shape = new THREE.Shape()
  shape.moveTo(hl, 0)

  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    shape.lineTo(px, py)
  }

  shape.lineTo(-hl, 0) // tail tip

  // Mirror for bottom half (reverse order, negate y)
  for (let i = pts.length - 2; i >= 0; i--) {
    const [px, py] = pts[i]
    shape.lineTo(px, -py)
  }

  // Generate bridge geometry
  const bridgeGeo = makeBridge(def.bridgeStyle, length, width)

  // Generate engine geometries
  const engineCount = def.engineCount
  const ew = (def.points[6] ? (def.points[6].y[0] + def.points[6].y[1]) / 2 : 0.4) * width
  const engineGeos = makeEngines(engineCount, ew)

  return { outline: shape, bridgeGeo, engineGeos, noseStyle: def.noseStyle }
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
    case 'split': {
      // Two small boxes side by side
      const g = new THREE.BoxGeometry(length * 0.08, width * 0.08, 0.14)
      return g // we'll place two instances in ShipModel
    }
  }
}

// ---- engine geometries ----

function makeEngines(count: number, engineWidth: number): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = []
  const cylRadius = engineWidth * 0.12
  const cylHeight = 0.15

  for (let i = 0; i < count; i++) {
    geos.push(new THREE.CylinderGeometry(cylRadius, cylRadius * 0.7, cylHeight, 6))
  }
  return geos
}
