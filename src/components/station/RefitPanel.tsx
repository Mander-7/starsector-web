import { useState, useMemo } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { ships } from '../../data/ships'
import { weapons } from '../../data/weapons'
import { hullmods } from '../../data/hullmods'
import { ShipCard } from '../ui/ShipCard'
import { Modal } from '../ui/Modal'
import { InventoryGrid } from '../ui/InventoryGrid'
import { MountGrid } from './MountGrid'
import { HullModList } from './HullModList'
import { StatsPanel } from './StatsPanel'
import { ShipViewer3D } from './ShipViewer3D'
import type { ShipStats } from '../../types'

export function RefitPanel() {
  const fleet = usePlayerStore((s) => s.fleet)
  const warehouse = usePlayerStore((s) => s.warehouse)
  const updateShip = usePlayerStore((s) => s.updateShip)
  const removeFromWarehouse = usePlayerStore((s) => s.removeFromWarehouse)
  const addToWarehouse = usePlayerStore((s) => s.addToWarehouse)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [slotPicker, setSlotPicker] = useState<string | null>(null)

  const ship = fleet[selectedIdx]
  const hull = ship ? ships.find((s) => s.id === ship.hullId) : null

  const weaponMap = useMemo(() => new Map(weapons.map((w) => [w.id, w])), [])

  const compatibleWeapons = useMemo(() => {
    if (!slotPicker || !hull) return []
    const slot = hull.weaponSlots.find((s) => s.id === slotPicker)
    if (!slot) return []
    return warehouse.filter((item) => {
      if (item.type !== 'weapon') return false
      const w = weaponMap.get(item.itemId)
      if (!w) return false
      if (w.size !== slot.size) return false
      if (slot.type === 'Universal' || slot.type === 'Composite') return true
      return w.type === slot.type
    })
  }, [slotPicker, hull, warehouse, weaponMap])

  const computedStats = useMemo((): ShipStats | null => {
    if (!hull) return null
    const stats = { ...hull.baseStats }
    for (const modId of ship.installedMods) {
      const mod = hullmods.find((m) => m.id === modId)
      if (mod) {
        for (const [key, val] of Object.entries(mod.effects)) {
          if (typeof val === 'number') {
            (stats as unknown as Record<string, number>)[key] = (stats[key as keyof ShipStats] as number) + val
          }
        }
      }
    }
    return stats
  }, [hull, ship?.installedMods])

  const opUsed = useMemo(() => {
    if (!ship) return 0
    let op = 0
    for (const weaponId of Object.values(ship.mountedWeapons)) {
      if (weaponId) {
        const w = weaponMap.get(weaponId)
        if (w) op += w.opCost
      }
    }
    for (const modId of ship.installedMods) {
      const m = hullmods.find((x) => x.id === modId)
      if (m) op += m.opCost
    }
    return op
  }, [ship, weaponMap])

  if (!ship || !hull || !computedStats) {
    return <div className="text-[var(--color-text-dim)]">舰队为空</div>
  }

  const handleSlotSelect = (weaponId: string) => {
    if (!slotPicker) return
    const oldWeaponId = ship.mountedWeapons[slotPicker]
    // Return old weapon to warehouse
    if (oldWeaponId) {
      addToWarehouse({ id: crypto.randomUUID(), type: 'weapon', itemId: oldWeaponId, quantity: 1 })
    }
    // Remove new weapon from warehouse
    removeFromWarehouse(weaponId, 'weapon', 1)
    // Mount new weapon
    const newMounted = { ...ship.mountedWeapons, [slotPicker]: weaponId }
    updateShip(selectedIdx, { ...ship, mountedWeapons: newMounted })
    setSlotPicker(null)
  }

  const handleSlotUnequip = () => {
    if (!slotPicker) return
    const oldWeaponId = ship.mountedWeapons[slotPicker]
    if (oldWeaponId) {
      addToWarehouse({ id: crypto.randomUUID(), type: 'weapon', itemId: oldWeaponId, quantity: 1 })
    }
    const newMounted = { ...ship.mountedWeapons, [slotPicker]: null }
    updateShip(selectedIdx, { ...ship, mountedWeapons: newMounted })
    setSlotPicker(null)
  }

  const handleModToggle = (modId: string) => {
    const installed = ship.installedMods.includes(modId)
    const newMods = installed
      ? ship.installedMods.filter((id) => id !== modId)
      : [...ship.installedMods, modId]
    updateShip(selectedIdx, { ...ship, installedMods: newMods })
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: Ship selection */}
      <div className="w-full lg:w-48 shrink-0 space-y-2 overflow-auto">
        {fleet.map((s, i) => (
          <ShipCard key={i} ship={s} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
        ))}
      </div>

      {/* Center: 3D preview + mount grid */}
      <div className="flex-1 space-y-4">
        <div className="bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded h-64">
          <ShipViewer3D shape={hull.hullShape} />
        </div>
        <MountGrid
          slots={hull.weaponSlots}
          mountedWeapons={ship.mountedWeapons}
          weaponMap={weaponMap}
          onSlotClick={(id) => setSlotPicker(id)}
        />
        <HullModList
          availableMods={hullmods}
          installedMods={ship.installedMods}
          onInstall={handleModToggle}
          onRemove={handleModToggle}
        />
      </div>

      {/* Right: Stats panel */}
      <div className="w-full lg:w-56 shrink-0 bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded p-4">
        <h4 className="text-xs font-medium text-[var(--color-text-dim)] mb-3">
          {hull.name} [{hull.size}]
        </h4>
        <StatsPanel base={hull.baseStats} modified={computedStats} opUsed={opUsed} opLimit={hull.opLimit} />
      </div>

      {/* Weapon picker modal */}
      <Modal
        open={slotPicker !== null}
        title={`选择武器 — ${hull.weaponSlots.find((s) => s.id === slotPicker)?.type ?? ''} ${hull.weaponSlots.find((s) => s.id === slotPicker)?.size ?? ''}`}
        onClose={() => setSlotPicker(null)}
      >
        <InventoryGrid
          items={compatibleWeapons}
          filter="weapon"
          onItemClick={(item) => handleSlotSelect(item.itemId)}
        />
        {ship.mountedWeapons[slotPicker!] && (
          <button
            className="mt-3 w-full py-1.5 border border-[var(--color-danger)] rounded text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 cursor-pointer"
            onClick={handleSlotUnequip}
          >
            卸下武器
          </button>
        )}
      </Modal>
    </div>
  )
}
