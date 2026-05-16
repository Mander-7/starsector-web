import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BattleProjectile, BattleEvent, WeaponType } from '../../types'

const projColors: Record<WeaponType, string> = {
  Ballistic: '#ff8844',
  Energy: '#44ddff',
  Missile: '#44ff44',
}

interface ProjectileVFXProps {
  projectiles: BattleProjectile[]
}

export function ProjectileVFX({ projectiles }: ProjectileVFXProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geo = useMemo(() => new THREE.SphereGeometry(0.25, 6, 6), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])

  // Track colors per instance
  const colorObj = useMemo(() => new THREE.Color(), [])
  const colors = useMemo(() => {
    const arr = new Float32Array(100 * 3)
    return new THREE.InstancedBufferAttribute(arr, 3)
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    const count = Math.min(projectiles.length, 100)
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const p = projectiles[i]
      dummy.position.set(p.position[0], p.position[1], 0.2)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      const c = projColors[p.type] ?? '#ffffff'
      colorObj.set(c)
      colorObj.toArray(colors.array, i * 3)
    }
    meshRef.current.count = count
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.geometry.setAttribute('instanceColor', colors)
    ;(meshRef.current.instanceColor as THREE.InstancedBufferAttribute | null)?.needsUpdate && true
  })

  if (projectiles.length === 0) return null

  return <instancedMesh ref={meshRef} args={[geo, mat, 100]} />
}

interface ExplosionVFXProps {
  events: BattleEvent[]
  tick: number
}

const colorMap: Record<string, string> = {
  hit: '#ffaa22',
  shieldHit: '#4488ff',
  explosion: '#ff6644',
  kill: '#ff4400',
}

export function ExplosionVFX({ events, tick }: ExplosionVFXProps) {
  const recentEvents = events.filter((e) => Math.abs(e.tick - tick) < 10)
  if (recentEvents.length === 0) return null

  return (
    <>
      {recentEvents.map((e, i) => {
        const size = e.type === 'explosion' || e.type === 'kill' ? 1.2 : 0.5
        const age = Math.abs(e.tick - tick)
        const fade = 1 - age / 10
        return (
          <mesh key={`${e.tick}-${i}`} position={[e.position[0], e.position[1], 0.3]}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial
              color={colorMap[e.type] ?? '#fff'}
              transparent
              opacity={Math.max(0, fade * 0.8)}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </>
  )
}
