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
  if (projectiles.length === 0) return null

  return (
    <>
      {projectiles.map((p) => {
        const color = projColors[p.type] ?? '#ffffff'
        // Compute tail: from current position backward along velocity
        const speed = Math.sqrt(p.velocity[0] ** 2 + p.velocity[1] ** 2) || 1
        const normX = p.velocity[0] / speed
        const normY = p.velocity[1] / speed
        const tailLength = p.type === 'Energy' ? 1.5 : 0.6

        return (
          <group key={p.id}>
            {/* Projectile core glow */}
            <mesh position={[p.position[0], p.position[1], 0.5]}>
              <sphereGeometry args={[p.type === 'Missile' ? 0.35 : 0.22, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Outer glow */}
            <mesh position={[p.position[0], p.position[1], 0.45]}>
              <sphereGeometry args={[p.type === 'Missile' ? 0.55 : 0.35, 6, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
            </mesh>
            {/* Trail line at projectile midpoint, aligned with velocity */}
            <mesh
              position={[p.position[0] - normX * tailLength / 2, p.position[1] - normY * tailLength / 2, 0.4]}
              rotation={[0, 0, Math.atan2(p.velocity[1], p.velocity[0])]}
            >
              <planeGeometry args={[tailLength, p.type === 'Energy' ? 0.08 : 0.04]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={p.type === 'Energy' ? 0.7 : 0.35}
                depthWrite={false}
                side={2}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

// ---- Battle ready line when weapons are about to fire ----
interface ReadyGlowProps {
  position: [number, number]
  color: string
  active: boolean
}

export function ReadyGlow({ position, color, active }: ReadyGlowProps) {
  if (!active) return null
  return (
    <mesh position={[position[0], position[1], 0.2]}>
      <ringGeometry args={[0.6, 0.8, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  )
}

// ---- Explosion / hit effects ----
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
  const recent = events.filter((e) => Math.abs(e.tick - tick) < 12)
  if (recent.length === 0) return null

  return (
    <>
      {recent.map((e, i) => {
        const age = Math.abs(e.tick - tick)
        const fade = Math.max(0, 1 - age / 12)
        const baseSize = e.type === 'explosion' || e.type === 'kill' ? 1.2 : 0.5
        const size = baseSize * (1 + age * 0.3) // expand over time

        return (
          <group key={`${e.tick}-${i}`}>
            {/* Flash sphere */}
            <mesh position={[e.position[0], e.position[1], 0.6]}>
              <sphereGeometry args={[size, 8, 8]} />
              <meshBasicMaterial
                color={colorMap[e.type] ?? '#fff'}
                transparent
                opacity={fade * 0.7}
                depthWrite={false}
              />
            </mesh>
            {/* Ring blast wave */}
            <mesh position={[e.position[0], e.position[1], 0.5]}>
              <ringGeometry args={[size * 0.8, size * 1.3, 16]} />
              <meshBasicMaterial
                color={colorMap[e.type] ?? '#fff'}
                transparent
                opacity={fade * 0.4}
                depthWrite={false}
                side={2}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
