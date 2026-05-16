import type { InventoryItem } from '../../types'
import { weapons } from '../../data/weapons'
import { hullmods } from '../../data/hullmods'

interface InventoryGridProps {
  items: InventoryItem[]
  filter?: 'weapon' | 'hullmod' | 'all'
  onItemClick?: (item: InventoryItem) => void
  selectedItemId?: string | null
}

const typeIcons: Record<string, string> = {
  Ballistic: '实',
  Energy: '能',
  Missile: '导',
}

export function InventoryGrid({ items, filter = 'all', onItemClick, selectedItemId }: InventoryGridProps) {
  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter)

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {filtered.map((item) => {
        let name = item.itemId
        let color = '#888'
        let extra = ''

        if (item.type === 'weapon') {
          const w = weapons.find((x) => x.id === item.itemId)
          if (w) {
            name = w.name
            color =
              w.type === 'Ballistic'
                ? 'var(--color-ballistic)'
                : w.type === 'Energy'
                  ? 'var(--color-energy)'
                  : '#44ff44'
            extra = `${typeIcons[w.type]} ${w.size === 'Small' ? 'S' : w.size === 'Medium' ? 'M' : 'L'}`
          }
        } else {
          const m = hullmods.find((x) => x.id === item.itemId)
          if (m) {
            name = m.name
            color = 'var(--color-accent)'
            extra = `OP:${m.opCost}`
          }
        }

        return (
          <button
            key={`${item.type}-${item.itemId}`}
            className={`p-2 rounded border text-center cursor-pointer transition-all text-[11px] ${
              selectedItemId === item.itemId
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-glow)]'
                : 'border-[var(--color-panel-border)] hover:border-[var(--color-accent)]'
            }`}
            onClick={() => onItemClick?.(item)}
          >
            <div className="text-xs" style={{ color }}>
              {name}
            </div>
            <div className="text-[9px] text-[var(--color-text-dim)]">{extra}</div>
            {item.quantity > 1 && (
              <div className="text-[9px] text-[var(--color-text)]">x{item.quantity}</div>
            )}
          </button>
        )
      })}
      {filtered.length === 0 && (
        <div className="col-span-full text-center text-[var(--color-text-dim)] py-8">空</div>
      )}
    </div>
  )
}
