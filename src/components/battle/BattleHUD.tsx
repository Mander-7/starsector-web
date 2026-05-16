import type { BattleShipSnapshot } from '../../types'

interface BattleHUDProps {
  ships: BattleShipSnapshot[]
  tick: number
  speed: number
  paused: boolean
  onSpeedChange: (s: number) => void
  onPauseToggle: () => void
  onRetreat: () => void
}

export function BattleHUD({
  ships,
  tick,
  speed,
  paused,
  onSpeedChange,
  onPauseToggle,
  onRetreat,
}: BattleHUDProps) {
  const playerShips = ships.filter((s) => s.isPlayer && s.alive)
  const enemyShips = ships.filter((s) => !s.isPlayer && s.alive)

  const timeStr = `${Math.floor(tick / 10)}.${tick % 10}s`

  return (
    <div className="flex items-center gap-3 p-2 bg-black/40 border-b border-[var(--color-panel-border)] shrink-0">
      <button
        className="px-3 py-1 text-xs border border-[var(--color-panel-border)] rounded text-[var(--color-text)] hover:border-[var(--color-danger)] cursor-pointer"
        onClick={onRetreat}
      >
        ← 撤退
      </button>

      <span className="text-[10px] text-[var(--color-text-dim)]">{timeStr}</span>

      <div className="flex gap-4 flex-1">
        {playerShips.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--color-text)] w-12 truncate">{s.name}</span>
            <div className="w-16 h-2 bg-[var(--color-panel-border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-success)] transition-all"
                style={{ width: `${(s.hp / s.maxHp) * 100}%` }}
              />
            </div>
            <div className="w-12 h-2 bg-[var(--color-panel-border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-flux)] transition-all"
                style={{ width: `${(s.flux / s.maxFlux) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <span className="text-[10px] text-[var(--color-text-dim)]">VS</span>

      <div className="flex gap-4">
        {enemyShips.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className="w-12 h-2 bg-[var(--color-panel-border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-flux)] transition-all"
                style={{ width: `${(s.flux / s.maxFlux) * 100}%` }}
              />
            </div>
            <div className="w-16 h-2 bg-[var(--color-panel-border)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-danger)] transition-all"
                style={{ width: `${(s.hp / s.maxHp) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text)] w-12 truncate">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1 ml-auto">
        <button
          className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
            speed === 0.5 ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
          }`}
          onClick={() => onSpeedChange(0.5)}
        >
          0.5x
        </button>
        <button
          className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
            speed === 1 ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
          }`}
          onClick={() => onSpeedChange(1)}
        >
          1x
        </button>
        <button
          className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
            speed === 2 ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
          }`}
          onClick={() => onSpeedChange(2)}
        >
          2x
        </button>
        <button
          className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
            paused ? 'bg-[var(--color-warning)] text-black font-bold' : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
          }`}
          onClick={onPauseToggle}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  )
}
