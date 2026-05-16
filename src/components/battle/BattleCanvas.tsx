import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ShipModel } from './ShipModel'
import { ProjectileVFX, ExplosionVFX } from './VFX'
import { ships as shipData } from '../../data/ships'
import type { TickSnapshot } from '../../types'

function BattleCamera({ playerPos }: { playerPos: [number, number] | null }) {
  const smooth = useRef(new THREE.Vector3(0, -10, 14))

  useFrame(({ camera }, delta) => {
    const tx = playerPos ? playerPos[0] : 0
    const ty = playerPos ? playerPos[1] : 0
    const target = new THREE.Vector3(tx, ty - 8, 14)
    smooth.current.lerp(target, Math.min(delta * 6, 1))
    camera.position.copy(smooth.current)
    camera.lookAt(tx, ty, 0)
  })

  return null
}

interface BattleCanvasProps {
  currentTick: TickSnapshot | null
}

export function BattleCanvas({ currentTick }: BattleCanvasProps) {
  const ships = currentTick?.ships ?? []
  const projectiles = currentTick?.projectiles ?? []
  const events = currentTick?.events ?? []
  const tickNum = currentTick?.tick ?? 0

  const playerShip = ships.find((s) => s.isPlayer && s.alive)
  const playerPos: [number, number] | null = playerShip
    ? [playerShip.position[0], playerShip.position[1]]
    : null

  return (
    <Canvas camera={{ position: [0, -10, 14], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 10]} intensity={0.8} />
      <pointLight position={[0, 0, 5]} intensity={0.4} color="#4488ff" />

      <Stars radius={50} depth={50} count={500} factor={4} saturation={0} fade speed={0.2} />

      <BattleCamera playerPos={playerPos} />

      <ProjectileVFX projectiles={projectiles} />
      <ExplosionVFX events={events} tick={tickNum} />

      {ships.map((ship) => {
        const hull = shipData.find((s) => s.id === ship.hullId)
        if (!hull) return null
        return (
          <ShipModel
            key={ship.id}
            shape={hull.hullShape}
            position={[ship.position[0], ship.position[1], 0]}
            rotation={ship.rotation}
            scale={0.9}
            engineGlow={ship.alive}
            isEnemy={!ship.isPlayer}
          />
        )
      })}
    </Canvas>
  )
}
