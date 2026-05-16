import { useState } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { InventoryGrid } from '../ui/InventoryGrid'

export function WarehousePanel() {
  const warehouse = usePlayerStore((s) => s.warehouse)
  const [filter, setFilter] = useState<'all' | 'weapon' | 'hullmod'>('all')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--color-text)]">
          仓库 ({warehouse.length} 种物品)
        </h4>
        <div className="flex gap-1">
          {(['all', 'weapon', 'hullmod'] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-1 rounded text-xs cursor-pointer transition-all ${
                filter === f
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'weapon' ? '武器' : '插件'}
            </button>
          ))}
        </div>
      </div>
      <InventoryGrid items={warehouse} filter={filter} />
    </div>
  )
}
