import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BattleCanvas } from '../components/battle/BattleCanvas'
import { BattleHUD } from '../components/battle/BattleHUD'
import { useBattleSim } from '../hooks/useBattleSim'
import { usePlayerStore } from '../store/playerStore'
import type { TickSnapshot, BattleShipSnapshot, BattleProjectile } from '../types'

function getEnemiesForDanger(danger: number): string[] {
  if (danger <= 2) return ['wolf']
  if (danger <= 4) return ['tempest']
  if (danger <= 6) return ['hammerhead']
  if (danger <= 7) return ['medusa']
  if (danger <= 9) return ['eagle']
  return ['hammerhead', 'wolf']
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

function interpolateShip(a: BattleShipSnapshot, b: BattleShipSnapshot | undefined, t: number): BattleShipSnapshot {
  if (!b || t <= 0) return a
  return {
    ...a,
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
    ] as [number, number],
    rotation: lerpAngle(a.rotation, b.rotation, t),
  }
}

const SNAPSHOT_INTERVAL = 5

function lerpProj(a: BattleProjectile, b: BattleProjectile | undefined, t: number): BattleProjectile {
  if (b) {
    // Exists in both snapshots → linear interpolate
    return {
      ...a,
      position: [
        a.position[0] + (b.position[0] - a.position[0]) * t,
        a.position[1] + (b.position[1] - a.position[1]) * t,
      ] as [number, number],
    }
  }
  // Only in current snapshot (destroyed before next) → extrapolate forward
  return {
    ...a,
    position: [
      a.position[0] + a.velocity[0] * t * SNAPSHOT_INTERVAL,
      a.position[1] + a.velocity[1] * t * SNAPSHOT_INTERVAL,
    ] as [number, number],
  }
}

function lerpSnapshots(current: TickSnapshot, next: TickSnapshot | null, t: number): TickSnapshot {
  if (!next || t <= 0.001) return current

  // Interpolate projectiles from current → next
  const projMap = new Map(current.projectiles.map((p) => [p.id, p]))
  const nextMap = new Map(next.projectiles.map((p) => [p.id, p]))

  const interpolated: BattleProjectile[] = []

  // Projectiles in current snapshot
  for (const p of current.projectiles) {
    interpolated.push(lerpProj(p, nextMap.get(p.id), t))
  }

  // Projectiles only in next snapshot (created between snapshots)
  for (const np of next.projectiles) {
    if (!projMap.has(np.id)) {
      // Extrapolate backward: where was it when it spawned?
      interpolated.push({
        ...np,
        position: [
          np.position[0] - np.velocity[0] * (1 - t) * SNAPSHOT_INTERVAL,
          np.position[1] - np.velocity[1] * (1 - t) * SNAPSHOT_INTERVAL,
        ] as [number, number],
      })
    }
  }

  return {
    tick: current.tick,
    ships: current.ships.map((s) => interpolateShip(s, next.ships.find((ns) => ns.id === s.id), t)),
    projectiles: interpolated,
    events: current.events,
  }
}

export function BattleScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fleet = usePlayerStore((s) => s.fleet)
  const addCredits = usePlayerStore((s) => s.addCredits)
  const addFuel = usePlayerStore((s) => s.addFuel)
  const addToWarehouse = usePlayerStore((s) => s.addToWarehouse)

  const danger = Number(searchParams.get('danger') ?? 1)
  const enemyHulls = useMemo(() => getEnemiesForDanger(danger), [danger])

  const result = useBattleSim(fleet, enemyHulls)

  const [tickIndex, setTickIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [lootCollected, setLootCollected] = useState(false)
  const [lerp, setLerp] = useState(0)
  const timerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTickTime = useRef<number>(Date.now())

  const ticks = result.replay.ticks
  const currentTick: TickSnapshot | null = ticks[tickIndex] ?? null
  const nextTick: TickSnapshot | null = ticks[tickIndex + 1] ?? null
  const displayTick = lerpSnapshots(currentTick, nextTick, lerp)

  // Smooth interpolation loop (runs at display refresh rate)
  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - lastTickTime.current
      const interval = 100 / speed
      setLerp(Math.min(elapsed / interval, 0.99))
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [speed])

  // Reset lerp when tick changes
  useEffect(() => {
    lastTickTime.current = Date.now()
    setLerp(0)
  }, [tickIndex])

  // Playback loop
  useEffect(() => {
    if (paused || ended) return
    const interval = 100 / speed
    timerRef.current = window.setInterval(() => {
      setTickIndex((prev) => {
        if (prev >= ticks.length - 1) {
          setEnded(true)
          return prev
        }
        return prev + 1
      })
    }, interval)
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [paused, speed, ended, ticks.length])

  // Collect loot when battle ends
  useEffect(() => {
    if (ended && !lootCollected && result.winner === 'player') {
      setLootCollected(true)
      for (const drop of result.loot) {
        if (drop.type === 'credits') {
          addCredits(drop.amount)
        } else if (drop.type === 'fuel') {
          addFuel(drop.amount)
        } else {
          addToWarehouse({
            id: crypto.randomUUID(),
            type: drop.type as 'weapon' | 'hullmod',
            itemId: drop.itemId!,
            quantity: drop.amount,
          })
        }
      }
    }
  }, [ended, lootCollected, result, addCredits, addFuel, addToWarehouse])

  const handleRetreat = () => {
    navigate('/starmap')
  }

  const handleSpeedChange = (s: number) => {
    setSpeed(s)
    lastTickTime.current = Date.now()
  }

  const handlePauseToggle = () => {
    if (paused) {
      lastTickTime.current = Date.now()
      setLerp(0)
    }
    setPaused((p) => !p)
  }

  const allShips = displayTick?.ships ?? []

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-space-bg)]">
      <BattleHUD
        ships={allShips}
        tick={displayTick?.tick ?? 0}
        projectileCount={displayTick?.projectiles.length ?? 0}
        speed={speed}
        paused={paused}
        onSpeedChange={handleSpeedChange}
        onPauseToggle={handlePauseToggle}
        onRetreat={handleRetreat}
      />

      <div className="flex-1 relative">
        <BattleCanvas currentTick={displayTick} />

        {ended && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center p-8 bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded-lg">
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: result.winner === 'player' ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {result.winner === 'player' ? '胜利!' : '失败'}
              </h2>
              {result.winner === 'player' && (
                <div className="text-sm text-[var(--color-text)] mb-4">
                  <p>战利品:</p>
                  {result.loot.map((d, i) => (
                    <p key={i} className="text-[var(--color-warning)]">
                      {d.type === 'credits'
                        ? `$ ${d.amount.toLocaleString()}`
                        : d.type === 'fuel'
                          ? `Fuel +${d.amount}`
                          : `${d.type} x${d.amount}`}
                    </p>
                  ))}
                </div>
              )}
              <button
                className="px-6 py-2 bg-[var(--color-accent)] text-white rounded cursor-pointer hover:brightness-110"
                onClick={() => navigate('/starmap')}
              >
                返回星图
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
