import type { ShipStats } from '../../types'
import { StatBar } from '../ui/StatBar'

interface StatsPanelProps {
  base: ShipStats
  modified: ShipStats
  opUsed: number
  opLimit: number
}

const HINT: Record<string, string> = {
  hp: '船体结构值，归零即被击毁',
  armor: '装甲值，减少受到的船体伤害',
  speed: '最大航速，影响战场机动性',
  fluxCapacity: '辐能容量上限，超载后无法开火和维持护盾',
  fluxDissipation: '辐能耗散速率，决定散热快慢',
  shieldEfficiency: '护盾效率，越低越好（1.0=全额伤害，0.6=仅60%伤害转为辐能）',
  cargoCapacity: '货舱容量，决定可携带物资',
}

function StatRow({
  label,
  hint,
  value,
  diff,
  color,
}: {
  label: string
  hint?: string
  value: string | number
  diff: React.ReactNode
  color: string
}) {
  return (
    <div className="flex justify-between text-xs group relative" title={hint}>
      <span className="text-[var(--color-text-dim)] cursor-help border-b border-dotted border-[var(--color-text-dim)]/30">
        {label}
      </span>
      <span style={{ color }}>
        {value} {diff}
      </span>
    </div>
  )
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
      <div className="flex justify-between text-xs mb-2 border-b border-[var(--color-panel-border)] pb-2">
        <span className="text-[var(--color-text-dim)] cursor-help" title="用于安装武器和船插的点数上限">装配点 OP</span>
        <span className={opUsed > opLimit ? 'text-[var(--color-danger)] font-bold' : 'text-[var(--color-text)]'}>
          {opUsed}/{opLimit}
          {opUsed > opLimit && <span className="ml-1 text-[10px]">超限!</span>}
        </span>
      </div>

      <StatBar label="结构" value={modified.hp} max={base.hp} color="var(--color-success)" />
      <StatBar label="装甲" value={modified.armor} max={base.armor} color="var(--color-warning)" />
      <StatBar label="速度" value={modified.speed} max={200} color="var(--color-accent)" />

      <div className="pt-1 border-t border-[var(--color-panel-border)]" />

      <StatRow label="辐能容量" hint={HINT.fluxCapacity} value={Math.round(modified.fluxCapacity)} diff={diff('fluxCapacity')} color="var(--color-flux)" />
      <StatRow label="辐能耗散" hint={HINT.fluxDissipation} value={Math.round(modified.fluxDissipation)} diff={diff('fluxDissipation')} color="var(--color-accent)" />
      <StatRow label="护盾效率" hint={HINT.shieldEfficiency} value={`${(modified.shieldEfficiency * 100).toFixed(0)}%`} diff={diff('shieldEfficiency')} color="var(--color-shield)" />

      <div className="flex justify-between text-xs pt-1 border-t border-[var(--color-panel-border)]">
        <span className="text-[var(--color-text-dim)] cursor-help" title={HINT.cargoCapacity}>货舱</span>
        <span className="text-[var(--color-text)]">{modified.cargoCapacity}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-dim)] cursor-help" title="燃料容量，决定星图航行距离">燃料舱</span>
        <span className="text-[var(--color-text)]">{modified.fuelCapacity}</span>
      </div>
    </div>
  )
}
