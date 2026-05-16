import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { ShipModel } from './ShipModel'
import { ProjectileVFX, ExplosionVFX } from './VFX'
import { ships as shipData } from '../../data/ships'
import type { TickSnapshot } from '../../types'

interface BattleCanvasProps {
  currentTick: TickSnapshot | null
}

export function BattleCanvas({ currentTick }: BattleCanvasProps) {
  const ships = currentTick?.ships ?? []
  const projectiles = currentTick?.projectiles ?? []
  const events = currentTick?.events ?? []
  const tickNum = currentTick?.tick ?? 0

  return (
    <Canvas camera={{ position: [0, -8, 12], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 10]} intensity={0.8} />
      <pointLight position={[0, 0, 5]} intensity={0.4} color="#4488ff" />

      <Stars radius={50} depth={50} count={500} factor={4} saturation={0} fade speed={0.2} />

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
            scale={1.2}
            engineGlow={ship.alive}
            isEnemy={!ship.isPlayer}
          />
        )
      })}

      <OrbitControls enableDamping makeDefault />
    </Canvas>
  )
}
