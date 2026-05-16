import type { HullMod } from '../../types'

interface HullModListProps {
  availableMods: HullMod[]
  installedMods: string[]
  onInstall: (modId: string) => void
  onRemove: (modId: string) => void
}

export function HullModList({ availableMods, installedMods, onInstall, onRemove }: HullModListProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-[var(--color-text-dim)] mb-2">船体插件</h4>
      <div className="flex flex-wrap gap-2">
        {availableMods.map((mod) => {
          const installed = installedMods.includes(mod.id)
          return (
            <button
              key={mod.id}
              className={`px-3 py-1.5 rounded text-xs cursor-pointer transition-all border ${
                installed
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-glow)] text-[var(--color-accent)]'
                  : 'border-[var(--color-panel-border)] text-[var(--color-text-dim)] hover:border-[var(--color-accent)]'
              }`}
              onClick={() => (installed ? onRemove(mod.id) : onInstall(mod.id))}
              title={mod.description}
            >
              {mod.name} (OP:{mod.opCost})
            </button>
          )
        })}
      </div>
    </div>
  )
}
