import type { WeaponSlot, Weapon } from '../../types'
import { WeaponSlot as WeaponSlotUI } from '../ui/WeaponSlot'

interface MountGridProps {
  slots: WeaponSlot[]
  mountedWeapons: Record<string, string | null>
  weaponMap: Map<string, Weapon>
  onSlotClick: (slotId: string) => void
}

export function MountGrid({ slots, mountedWeapons, weaponMap, onSlotClick }: MountGridProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-[var(--color-text-dim)] mb-2">武器槽位</h4>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const weaponId = mountedWeapons[slot.id]
          const weapon = weaponId ? weaponMap.get(weaponId) ?? null : null
          return (
            <WeaponSlotUI
              key={slot.id}
              slot={slot}
              weapon={weapon}
              onClick={() => onSlotClick(slot.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
