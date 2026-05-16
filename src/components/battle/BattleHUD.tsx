import type { BattleShipSnapshot } from '../../types'

interface BattleHUDProps {
  ships: BattleShipSnapshot[]
  tick: number
  projectileCount: number
  speed: number
  paused: boolean
  onSpeedChange: (s: number) => void
  onPauseToggle: () => void
  onRetreat: () => void
}

function ShipBar({ ship, flip }: { ship: BattleShipSnapshot; flip?: boolean }) {
  const hpPct = Math.round((ship.hp / ship.maxHp) * 100)
  const fluxPct = Math.round((ship.flux / ship.maxFlux) * 100)

  const bars = (
    <div className="flex items-center gap-1">
      {/* HP bar */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-3 bg-[var(--color-panel-border)] rounded-sm overflow-hidden">
          <div
            className="h-full bg-[var(--color-success)] transition-all"
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <div className="flex gap-1 text-[9px]">
          <span className="text-[var(--color-success)]">HP{hpPct}%</span>
        </div>
      </div>
      {/* Flux bar */}
      <div className="flex flex-col items-center">
        <div className="w-12 h-3 bg-[var(--color-panel-border)] rounded-sm overflow-hidden">
          <div
            className="h-full bg-[var(--color-flux)] transition-all"
            style={{ width: `${fluxPct}%` }}
          />
        </div>
        <div className="text-[9px]">
          <span className="text-[var(--color-flux)]">辐能{fluxPct}%</span>
        </div>
      </div>
    </div>
  )

  const label = (
    <span className="text-[11px] text-[var(--color-text)] w-14 truncate font-medium">
      {ship.name}
    </span>
  )

  return (
    <div className="flex items-center gap-2">
      {flip ? bars : null}
      {label}
      {!flip ? bars : null}
    </div>
  )
}

export function BattleHUD({
  ships,
  tick,
  projectileCount,
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
    <div className="flex items-center gap-3 p-2 bg-black/50 border-b border-[var(--color-panel-border)] shrink-0 flex-wrap">
      <button
        className="px-3 py-1 text-xs border border-[var(--color-panel-border)] rounded text-[var(--color-text)] hover:border-[var(--color-danger)] cursor-pointer"
        onClick={onRetreat}
      >
        ← 撤退
      </button>

      <span className="text-[11px] text-[var(--color-text)] font-mono">{timeStr}</span>

      <div className="flex gap-6 flex-1 items-center flex-wrap">
        {playerShips.map((s) => (
          <ShipBar key={s.id} ship={s} />
        ))}
      </div>

      <span className="text-[11px] text-[var(--color-text-dim)] font-bold px-2">VS</span>

      <div className="flex gap-6 items-center flex-wrap">
        {enemyShips.map((s) => (
          <ShipBar key={s.id} ship={s} flip />
        ))}
      </div>

      {/* Debug: projectile count */}
      {projectileCount > 0 && (
        <span className="text-[10px] text-[var(--color-ballistic)] px-1">
          弹幕 {projectileCount}
        </span>
      )}

      <div className="flex gap-1 ml-auto">
        {[0.5, 1, 2].map((s) => (
          <button
            key={s}
            className={`px-2 py-1 text-[10px] rounded cursor-pointer ${
              speed === s
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
            }`}
            onClick={() => onSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
        <button
          className={`px-2 py-1 text-[10px] rounded cursor-pointer font-bold ${
            paused
              ? 'bg-[var(--color-warning)] text-black'
              : 'bg-[var(--color-panel-bg)] text-[var(--color-text-dim)]'
          }`}
          onClick={onPauseToggle}
        >
          {paused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  )
}
