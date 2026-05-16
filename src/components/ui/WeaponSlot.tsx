import type { WeaponSlot as WeaponSlotType, Weapon } from '../../types'

const typeColors: Record<string, string> = {
  Ballistic: 'var(--color-ballistic)',
  Energy: 'var(--color-energy)',
  Missile: '#44ff44',
  Universal: 'var(--color-accent)',
  Composite: '#ffaa22',
}

interface WeaponSlotProps {
  slot: WeaponSlotType
  weapon: Weapon | null
  onClick: () => void
}

export function WeaponSlot({ slot, weapon, onClick }: WeaponSlotProps) {
  return (
    <button
      className="w-14 h-14 border-2 rounded flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:brightness-125"
      style={{ borderColor: typeColors[slot.type] }}
      onClick={onClick}
      title={`${slot.type} ${slot.size} (arc ${slot.arc}°)`}
    >
      {weapon ? (
        <>
          <span className="text-[10px] leading-tight" style={{ color: typeColors[weapon.type] }}>
            {weapon.name}
          </span>
          <span className="text-[9px] text-[var(--color-text-dim)]">OP:{weapon.opCost}</span>
        </>
      ) : (
        <>
          <span className="text-[9px]" style={{ color: typeColors[slot.type] }}>
            {slot.type}
          </span>
          <span className="text-[8px] text-[var(--color-text-dim)]">
            {slot.size === 'Small' ? 'S' : slot.size === 'Medium' ? 'M' : 'L'}
          </span>
        </>
      )}
    </button>
  )
}
