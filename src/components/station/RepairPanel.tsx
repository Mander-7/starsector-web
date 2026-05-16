import { usePlayerStore } from '../../store/playerStore'
import { ships } from '../../data/ships'
import { StatBar } from '../ui/StatBar'

export function RepairPanel() {
  const fleet = usePlayerStore((s) => s.fleet)
  const credits = usePlayerStore((s) => s.credits)
  const setCredits = usePlayerStore((s) => s.setCredits)
  const updateShip = usePlayerStore((s) => s.updateShip)

  const repairShip = (index: number) => {
    const ship = fleet[index]
    const hull = ships.find((s) => s.id === ship.hullId)
    if (!hull) return

    const hpMissing = hull.baseStats.hp - ship.currentHp
    const armorMissing = hull.baseStats.armor - ship.currentArmor
    const cost = Math.ceil(hpMissing * 0.5 + armorMissing * 1.5)

    if (cost > credits) return
    if (hpMissing <= 0 && armorMissing <= 0) return

    setCredits(credits - cost)
    updateShip(index, {
      ...ship,
      currentHp: hull.baseStats.hp,
      currentArmor: hull.baseStats.armor,
    })
  }

  const getRepairCost = (index: number) => {
    const ship = fleet[index]
    const hull = ships.find((s) => s.id === ship.hullId)
    if (!hull) return 0
    return Math.ceil(
      (hull.baseStats.hp - ship.currentHp) * 0.5 + (hull.baseStats.armor - ship.currentArmor) * 1.5,
    )
  }

  const fleetHP = fleet.reduce((sum, s) => sum + s.currentHp, 0)
  const fleetMaxHP = fleet.reduce((sum, s) => {
    const h = ships.find((x) => x.id === s.hullId)
    return sum + (h?.baseStats.hp ?? 0)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded p-4">
        <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">舰队状态</h4>
        <StatBar label="总HP" value={fleetHP} max={fleetMaxHP} color="var(--color-success)" />
      </div>

      <div className="space-y-2">
        {fleet.map((ship, i) => {
          const hull = ships.find((s) => s.id === ship.hullId)
          if (!hull) return null
          const cost = getRepairCost(i)
          const needsRepair =
            ship.currentHp < hull.baseStats.hp || ship.currentArmor < hull.baseStats.armor
          return (
            <div
              key={i}
              className="bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded p-3 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="text-sm text-[var(--color-text)]">{ship.name}</div>
                <div className="text-[10px] text-[var(--color-text-dim)]">{hull.name}</div>
                <div className="mt-1 space-y-0.5">
                  <StatBar label="HP" value={ship.currentHp} max={hull.baseStats.hp} color="var(--color-success)" />
                  <StatBar label="装甲" value={ship.currentArmor} max={hull.baseStats.armor} color="var(--color-warning)" />
                </div>
              </div>
              <button
                className={`ml-3 px-4 py-1.5 rounded text-xs font-medium cursor-pointer transition-all ${
                  needsRepair && cost <= credits
                    ? 'bg-[var(--color-accent)] text-white hover:brightness-110'
                    : 'border border-[var(--color-panel-border)] text-[var(--color-text-dim)] cursor-not-allowed'
                }`}
                onClick={() => repairShip(i)}
                disabled={!needsRepair || cost > credits}
              >
                {needsRepair ? `修理 $${cost}` : '完好'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="text-xs text-[var(--color-text-dim)]">
        信用点: <span className="text-[var(--color-warning)]">${credits.toLocaleString()}</span>
      </div>
    </div>
  )
}
