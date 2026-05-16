import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BattleCanvas } from '../components/battle/BattleCanvas'
import { BattleHUD } from '../components/battle/BattleHUD'
import { useBattleSim } from '../hooks/useBattleSim'
import { usePlayerStore } from '../store/playerStore'
import type { TickSnapshot } from '../types'

export function BattleScreen() {
  const navigate = useNavigate()
  const fleet = usePlayerStore((s) => s.fleet)
  const addCredits = usePlayerStore((s) => s.addCredits)
  const addToWarehouse = usePlayerStore((s) => s.addToWarehouse)

  // Enemy — stable reference to avoid re-simulating every render
  const enemyHulls = useMemo(() => ['hammerhead'], [])

  // Simulate battle (pure logic, memoized)
  const result = useBattleSim(fleet, enemyHulls)

  // Playback state
  const [tickIndex, setTickIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [lootCollected, setLootCollected] = useState(false)
  const timerRef = useRef<number | null>(null)

  const currentTick: TickSnapshot | null = result.replay.ticks[tickIndex] ?? null

  // Playback loop
  useEffect(() => {
    if (paused || ended) return
    const interval = 100 / speed
    timerRef.current = window.setInterval(() => {
      setTickIndex((prev) => {
        if (prev >= result.replay.ticks.length - 1) {
          setEnded(true)
          return prev
        }
        return prev + 1
      })
    }, interval)
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [paused, speed, ended, result.replay.ticks.length])

  // Collect loot when battle ends
  useEffect(() => {
    if (ended && !lootCollected && result.winner === 'player') {
      setLootCollected(true)
      for (const drop of result.loot) {
        if (drop.type === 'credits') {
          addCredits(drop.amount)
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
  }, [ended, lootCollected, result, addCredits, addToWarehouse])

  const handleRetreat = () => {
    navigate('/starmap')
  }

  const handleSpeedChange = (s: number) => {
    setSpeed(s)
  }

  const handlePauseToggle = () => {
    setPaused((p) => !p)
  }

  const allShips = currentTick?.ships ?? []

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-space-bg)]">
      <BattleHUD
        ships={allShips}
        tick={currentTick?.tick ?? 0}
        speed={speed}
        paused={paused}
        onSpeedChange={handleSpeedChange}
        onPauseToggle={handlePauseToggle}
        onRetreat={handleRetreat}
      />

      {/* 3D Battlefield */}
      <div className="flex-1 relative">
        <BattleCanvas currentTick={currentTick} />

        {/* Result overlay */}
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
                        ? `$${d.amount.toLocaleString()}`
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
