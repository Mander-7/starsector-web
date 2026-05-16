import type { ShipStats } from '../../types'
import { StatBar } from '../ui/StatBar'

interface StatsPanelProps {
  base: ShipStats
  modified: ShipStats
  opUsed: number
  opLimit: number
}

export function StatsPanel({ base, modified, opUsed, opLimit }: StatsPanelProps) {
  const diff = (key: keyof ShipStats) => {
    if (typeof base[key] !== 'number') return null
    const delta = (modified[key] as number) - (base[key] as number)
    if (delta === 0) return null
    const sign = delta > 0 ? '+' : ''
    const color = delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'
    return <span style={{ color, fontSize: '10px' }}>{sign}{Math.round(delta)}</span>
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-[var(--color-text-dim)]">装配点</span>
        <span className={opUsed > opLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}>
          {opUsed}/{opLimit}
        </span>
      </div>

      <StatBar label="结构" value={modified.hp} max={base.hp} color="var(--color-success)" />
      <StatBar label="装甲" value={modified.armor} max={base.armor} color="var(--color-warning)" />
      <StatBar label="速度" value={modified.speed} max={200} color="var(--color-accent)" />

      <div className="flex justify-between text-xs py-1 border-t border-[var(--color-panel-border)]">
        <span className="text-[var(--color-text-dim)]">辐能容量</span>
        <span className="text-[var(--color-flux)]">
          {Math.round(modified.fluxCapacity)} {diff('fluxCapacity')}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-dim)]">辐能耗散</span>
        <span className="text-[var(--color-accent)]">
          {Math.round(modified.fluxDissipation)} {diff('fluxDissipation')}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-dim)]">护盾效率</span>
        <span className="text-[var(--color-shield)]">
          {(modified.shieldEfficiency * 100).toFixed(0)}% {diff('shieldEfficiency')}
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-dim)]">货舱</span>
        <span className="text-[var(--color-text)]">{modified.cargoCapacity}</span>
      </div>
    </div>
  )
}
