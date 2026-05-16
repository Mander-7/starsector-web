import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefitPanel } from '../components/station/RefitPanel'
import { RepairPanel } from '../components/station/RepairPanel'
import { WarehousePanel } from '../components/station/WarehousePanel'

type StationTab = 'refit' | 'repair' | 'warehouse'

const tabs: { id: StationTab; label: string }[] = [
  { id: 'refit', label: '装配 Refit' },
  { id: 'repair', label: '修理 Repair' },
  { id: 'warehouse', label: '仓库 Warehouse' },
]

export function StationScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<StationTab>('refit')

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-space-bg)]">
      {/* Tab Bar */}
      <div className="flex border-b border-[var(--color-panel-border)] shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`px-6 py-3 text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="px-6 py-3 text-sm text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
          onClick={() => navigate('/starmap')}
        >
          离开空间站
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'refit' && <RefitPanel />}
        {tab === 'repair' && <RepairPanel />}
        {tab === 'warehouse' && <WarehousePanel />}
      </div>
    </div>
  )
}
