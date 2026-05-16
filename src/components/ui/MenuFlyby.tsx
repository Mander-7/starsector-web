import { useRef, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ShipModel } from '../battle/ShipModel'
import type { HullTemplate, HullShapeParams } from '../../types'

const TEMPLATES: HullTemplate[] = ['arrow', 'wedge', 'brick', 'needle', 'crescent', 'hammerhead', 'split', 'lance']
const COLORS = ['#ff8844', '#44ddff', '#ff6644', '#44aaff', '#ffaa44', '#6688cc']
const FLY_SPEED = 1.2

interface FlyShip {
  id: number
  shape: HullShapeParams
  startX: number
  y: number
  rotation: number
  scale: number
  speed: number
  spawnTime: number
}

let nextId = 0

function spawnShip(): FlyShip {
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  const isLeft = Math.random() > 0.5
  const length = 3 + Math.random() * 5
  const width = 1 + Math.random() * 3
  return {
    id: nextId++,
    shape: {
      template,
      seed: Math.floor(Math.random() * 9999),
      length,
      width,
      noseWidth: width * (0.2 + Math.random() * 0.6),
      engineWidth: width * (0.3 + Math.random() * 0.5),
      wings: Math.random() * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
    startX: isLeft ? -14 : 14,
    y: (Math.random() - 0.5) * 7,
    rotation: isLeft ? 0 : Math.PI,
    scale: 0.4 + Math.random() * 0.5,
    speed: (isLeft ? 1 : -1) * (FLY_SPEED + Math.random() * 0.8),
    spawnTime: Date.now(),
  }
}

function FlybyShips() {
  const [ships, setShips] = useState<FlyShip[]>(() => [spawnShip(), spawnShip()])
  const lastSpawnRef = useRef(Date.now())
  const groupRef = useRef<THREE.Group>(null)

  const spawnNow = useCallback(() => {
    setShips((prev) => {
      if (prev.length >= 6) return prev
      return [...prev, spawnShip()]
    })
  }, [])

  useFrame(() => {
    const now = Date.now()

    // Spawn new ship every 2-3.5 seconds, max 6 active
    if (now - lastSpawnRef.current > 2000 + Math.random() * 1500) {
      lastSpawnRef.current = now
      spawnNow()
    }

    // Update positions and prune off-screen ships
    const toRemove: number[] = []
    for (const s of ships) {
      const elapsed = (now - s.spawnTime) / 1000
      const x = s.startX + s.speed * elapsed
      if (elapsed > 20 || Math.abs(x) > 16) {
        toRemove.push(s.id)
        continue
      }
      if (groupRef.current) {
        const child = groupRef.current.children.find((c) => c.userData.id === s.id)
        if (child) {
          child.position.set(x, s.y, 0)
        }
      }
    }
    if (toRemove.length > 0) {
      setShips((prev) => prev.filter((s) => !toRemove.includes(s.id)))
    }
  })

  return (
    <group ref={groupRef}>
      {ships.map((s) => (
        <group key={s.id} userData={{ id: s.id }} position={[s.startX, s.y, 0]} rotation={[0, 0, s.rotation]}>
          <ShipModel shape={s.shape} scale={s.scale} engineGlow={false} />
        </group>
      ))}
    </group>
  )
}

export function MenuFlyby() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 10], fov: 55 }}>
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 5, 8]} intensity={0.5} />
        <Stars radius={50} depth={50} count={400} factor={4} saturation={0} fade speed={0.1} />
        <FlybyShips />
      </Canvas>
    </div>
  )
}
