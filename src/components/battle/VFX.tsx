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
        const isMissile = p.type === 'Missile'
        const isEnergy = p.type === 'Energy'
        const tailLength = isEnergy ? 1.5 : isMissile ? 1.2 : 0.6

        return (
          <group key={p.id}>
            {/* Projectile core glow */}
            <mesh position={[p.position[0], p.position[1], 0.5]}>
              <sphereGeometry args={[isMissile ? 0.4 : 0.22, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Outer glow — larger for missiles */}
            <mesh position={[p.position[0], p.position[1], 0.45]}>
              <sphereGeometry args={[isMissile ? 0.65 : 0.35, 6, 6]} />
              <meshBasicMaterial color={color} transparent opacity={isMissile ? 0.4 : 0.3} depthWrite={false} />
            </mesh>
            {/* Trail line at projectile midpoint, aligned with velocity */}
            <mesh
              position={[p.position[0] - normX * tailLength / 2, p.position[1] - normY * tailLength / 2, 0.4]}
              rotation={[0, 0, Math.atan2(p.velocity[1], p.velocity[0])]}
            >
              <planeGeometry args={[tailLength, isMissile ? 0.06 : isEnergy ? 0.08 : 0.04]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isMissile ? 0.55 : isEnergy ? 0.7 : 0.35}
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
        const isShield = e.type === 'shieldHit'
        const baseSize = e.type === 'explosion' || e.type === 'kill' ? 1.2 : isShield ? 0.9 : 0.5
        const size = baseSize * (1 + age * 0.3) // expand over time

        return (
          <group key={`${e.tick}-${i}`}>
            {/* Flash sphere */}
            <mesh position={[e.position[0], e.position[1], 0.6]}>
              <sphereGeometry args={[size, 8, 8]} />
              <meshBasicMaterial
                color={colorMap[e.type] ?? '#fff'}
                transparent
                opacity={fade * (isShield ? 0.9 : 0.7)}
                depthWrite={false}
              />
            </mesh>
            {/* Ring blast wave — larger for shield */}
            <mesh position={[e.position[0], e.position[1], 0.5]}>
              <ringGeometry args={[size * (isShield ? 0.6 : 0.8), size * (isShield ? 1.5 : 1.3), 16]} />
              <meshBasicMaterial
                color={colorMap[e.type] ?? '#fff'}
                transparent
                opacity={fade * (isShield ? 0.6 : 0.4)}
                depthWrite={false}
                side={2}
              />
            </mesh>
            {/* Shield hit gets extra ring burst */}
            {isShield && (
              <mesh position={[e.position[0], e.position[1], 0.55]}>
                <ringGeometry args={[size * 0.3, size * 1.8, 24]} />
                <meshBasicMaterial
                  color="#88ccff"
                  transparent
                  opacity={fade * 0.35}
                  depthWrite={false}
                  side={2}
                />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}
