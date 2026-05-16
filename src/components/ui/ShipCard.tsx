import type { PlayerShip } from '../../types'
import { ships } from '../../data/ships'

interface ShipCardProps {
  ship: PlayerShip
  selected?: boolean
  onClick: () => void
}

export function ShipCard({ ship, selected, onClick }: ShipCardProps) {
  const hull = ships.find((s) => s.id === ship.hullId)
  if (!hull) return null

  const hpPct = Math.round((ship.currentHp / hull.baseStats.hp) * 100)
  const armorPct = Math.round((ship.currentArmor / hull.baseStats.armor) * 100)

  const factionColors: Record<string, string> = {
    hegemony: '#ff8844',
    tritachyon: '#44ddff',
    pirates: '#ff4444',
    independent: '#44cc66',
  }

  return (
    <button
      className={`w-full p-3 rounded border text-left cursor-pointer transition-all ${
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-glow)]'
          : 'border-[var(--color-panel-border)] hover:border-[var(--color-accent)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-[var(--color-text)]">{ship.name}</span>
          <span
            className="ml-2 text-[11px]"
            style={{ color: factionColors[hull.faction] ?? '#888' }}
          >
            {hull.name}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-text-dim)]">{hull.size}</span>
      </div>
      <div className="flex gap-3 mt-2">
        <span className="text-[10px] text-[var(--color-success)]">HP {hpPct}%</span>
        <span className="text-[10px] text-[var(--color-warning)]">装甲 {armorPct}%</span>
        <span className="text-[10px] text-[var(--color-text-dim)]">
          OP {Object.values(ship.mountedWeapons).filter(Boolean).length}/{hull.opLimit}
        </span>
      </div>
    </button>
  )
}
