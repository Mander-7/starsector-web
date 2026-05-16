import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BattleProjectile, BattleEvent } from '../../types'

interface ProjectileVFXProps {
  projectiles: BattleProjectile[]
}

export function ProjectileVFX({ projectiles }: ProjectileVFXProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geo = useMemo(() => new THREE.SphereGeometry(0.15, 6, 6), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffaa22' }), [])

  useFrame(() => {
    if (!meshRef.current) return
    const count = Math.min(projectiles.length, 100)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      dummy.position.set(projectiles[i].position[0], projectiles[i].position[1], 0.1)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.count = count
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, 100]} visible={projectiles.length > 0}>
      <sphereGeometry args={[0.12, 4, 4]} />
      <meshBasicMaterial color="#ffaa22" />
    </instancedMesh>
  )
}

interface ExplosionVFXProps {
  events: BattleEvent[]
  tick: number
}

const colorMap: Record<string, string> = {
  hit: '#ffaa22',
  shieldHit: '#4488ff',
  explosion: '#ff6644',
  kill: '#ff0000',
}

export function ExplosionVFX({ events, tick }: ExplosionVFXProps) {
  const recentEvents = events.filter((e) => Math.abs(e.tick - tick) < 5)
  if (recentEvents.length === 0) return null

  return (
    <>
      {recentEvents.map((e, i) => {
        const size = e.type === 'explosion' || e.type === 'kill' ? 0.8 : 0.3
        const fade = 1 - Math.abs(e.tick - tick) / 5
        return (
          <mesh key={`${e.tick}-${i}`} position={[e.position[0], e.position[1], 0.2]}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial
              color={colorMap[e.type] ?? '#fff'}
              transparent
              opacity={fade * 0.6}
            />
          </mesh>
        )
      })}
    </>
  )
}
