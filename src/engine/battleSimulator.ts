import type {
  TickSnapshot,
  BattleShipSnapshot,
  BattleProjectile,
  BattleEvent,
  BattleResult,
  PlayerShip,
  Weapon,
  LootDrop,
} from '../types'
import { ships } from '../data/ships'
import { weapons as weaponData } from '../data/weapons'
import { lootTables } from '../data/lootTables'
import { runShipAI } from './shipAI'
import { dist, angleTo } from '../utils/math'

const MAX_TICKS = 600 // 60 seconds max
const BATTLE_SIZE = 20

function createSnapshot(
  playerShips: BattleShipSnapshot[],
  enemyShips: BattleShipSnapshot[],
  projectiles: BattleProjectile[],
  events: BattleEvent[],
  tick: number,
): TickSnapshot {
  return {
    tick,
    ships: [
      ...playerShips.map((s) => ({ ...s })),
      ...enemyShips.map((s) => ({ ...s })),
    ],
    projectiles: [...projectiles.map((p) => ({ ...p, velocity: [p.velocity[0], p.velocity[1]] as [number, number] }))],
    events: [...events],
  }
}

function getWeaponRange(weapon: Weapon): number {
  // Scale: game range units to battle coordinates
  return (weapon.range / 100) * 1.5
}

export function simulateBattle(
  playerFleet: PlayerShip[],
  enemyHullIds: string[],
): BattleResult {
  // Initialize snapshots
  const playerShips: BattleShipSnapshot[] = playerFleet.map((ps, i) => {
    const hull = ships.find((s) => s.id === ps.hullId)!
    return {
      id: `p_${i}`,
      name: ps.name,
      hullId: ps.hullId,
      isPlayer: true,
      position: [-4 + i * 2, 0],
      rotation: 0,
      hp: ps.currentHp,
      maxHp: hull.baseStats.hp,
      armor: ps.currentArmor,
      maxArmor: hull.baseStats.armor,
      flux: 0,
      maxFlux: hull.baseStats.fluxCapacity,
      shieldActive: true,
      shieldFacing: 0,
      alive: true,
    }
  })

  const enemyShips: BattleShipSnapshot[] = enemyHullIds.map((hid, i) => {
    const hull = ships.find((s) => s.id === hid)!
    return {
      id: `e_${i}`,
      name: hull.name,
      hullId: hid,
      isPlayer: false,
      position: [4 - i * 2, 0],
      rotation: Math.PI,
      hp: hull.baseStats.hp,
      maxHp: hull.baseStats.hp,
      armor: hull.baseStats.armor,
      maxArmor: hull.baseStats.armor,
      flux: 0,
      maxFlux: hull.baseStats.fluxCapacity,
      shieldActive: true,
      shieldFacing: Math.PI,
      alive: true,
    }
  })

  const projectiles: BattleProjectile[] = []
  const replay: TickSnapshot[] = []
  let pid = 0

  // Build weapon maps for each ship
  const playerWeaponMaps: Map<string, Weapon[]>[] = playerFleet.map((ps) => {
    const wList: Weapon[] = []
    for (const weaponId of Object.values(ps.mountedWeapons)) {
      if (weaponId) {
        const w = weaponData.find((x) => x.id === weaponId)
        if (w) wList.push(w)
      }
    }
    const map = new Map<string, Weapon[]>()
    map.set(ps.hullId, wList)
    return map
  })

  const enemyWeaponMaps: Map<string, Weapon[]>[] = enemyHullIds.map((hid) => {
    // Give enemy a generic loadout
    const hull = ships.find((s) => s.id === hid)!
    const wList: Weapon[] = []
    for (const slot of hull.weaponSlots) {
      const compatible = weaponData.find(
        (w) => w.size === slot.size && (slot.type === 'Universal' || w.type === slot.type),
      )
      if (compatible) wList.push(compatible)
    }
    const map = new Map<string, Weapon[]>()
    map.set(hid, wList)
    return map
  })

  // Cooldown timers (tick count)
  const playerCooldowns: Map<string, number>[] = playerFleet.map(() => new Map())
  const enemyCooldowns: Map<string, number>[] = enemyHullIds.map(() => new Map())

  // Initial snapshot
  replay.push(createSnapshot(playerShips, enemyShips, [], [], 0))

  // Simulation loop
  for (let tick = 1; tick <= MAX_TICKS; tick++) {
    const events: BattleEvent[] = []

    // === Phase 1: AI decisions ===
    const allShips = [...playerShips, ...enemyShips]

    for (let i = 0; i < playerShips.length; i++) {
      const self = playerShips[i]
      if (!self.alive) continue

      const hull = ships.find((s) => s.id === self.hullId)!
      const wList = playerWeaponMaps[i].get(self.hullId) ?? []
      const weaponRanges = new Map(wList.map((w) => [w.id, getWeaponRange(w)]))

      const output = runShipAI({
        self,
        enemies: enemyShips.filter((s) => s.alive),
        allies: playerShips.filter((s) => s.alive && s.id !== self.id),
        weapons: wList,
        weaponRanges,
      })

      // Move ship
      self.position[0] += (output.targetX - self.position[0]) * 0.1 * hull.baseStats.speed / 100
      self.position[1] += (output.targetY - self.position[1]) * 0.1 * hull.baseStats.speed / 100
      self.rotation = angleTo(
        [self.position[0], self.position[1]],
        [output.targetX, output.targetY],
      )
      self.shieldActive = output.wantShield

      // Vent flux
      self.flux = Math.max(0, self.flux - hull.baseStats.fluxDissipation * 0.1)

      // Fire weapons
      if (output.wantFire && output.targetEnemyId) {
        const target = enemyShips.find((s) => s.id === output.targetEnemyId)
        if (target) {
          for (const w of wList) {
            const cd = playerCooldowns[i].get(w.id) ?? 0
            if (cd > 0) {
              playerCooldowns[i].set(w.id, cd - 1)
              continue
            }
            // Shoot
            const range = getWeaponRange(w)
            const d = dist(
              [self.position[0], self.position[1]],
              [target.position[0], target.position[1]],
            )
            if (d <= range && Math.random() < w.accuracy) {
              const a = angleTo(
                [self.position[0], self.position[1]],
                [target.position[0], target.position[1]],
              )
              const speed = range / 20 // projectile speed
              projectiles.push({
                id: `proj_${pid++}`,
                type: w.type,
                position: [self.position[0], self.position[1]],
                velocity: [Math.cos(a) * speed, Math.sin(a) * speed],
                damage: w.damage,
                damageType: w.damageType,
              })
              self.flux += w.fluxPerShot
              playerCooldowns[i].set(w.id, Math.round(600 / w.fireRate / 0.1))
            }
          }
        }
      }
    }

    // Enemy AI (simplified)
    for (let i = 0; i < enemyShips.length; i++) {
      const self = enemyShips[i]
      if (!self.alive) continue

      const hull = ships.find((s) => s.id === self.hullId)!
      const wList = enemyWeaponMaps[i].get(self.hullId) ?? []
      const weaponRanges = new Map(wList.map((w) => [w.id, getWeaponRange(w)]))

      const output = runShipAI({
        self,
        enemies: playerShips.filter((s) => s.alive),
        allies: enemyShips.filter((s) => s.alive && s.id !== self.id),
        weapons: wList,
        weaponRanges,
      })

      self.position[0] += (output.targetX - self.position[0]) * 0.1 * hull.baseStats.speed / 100
      self.position[1] += (output.targetY - self.position[1]) * 0.1 * hull.baseStats.speed / 100
      self.rotation = angleTo(
        [self.position[0], self.position[1]],
        [output.targetX, output.targetY],
      )
      self.shieldActive = output.wantShield
      self.flux = Math.max(0, self.flux - hull.baseStats.fluxDissipation * 0.1)

      if (output.wantFire && output.targetEnemyId) {
        const target = playerShips.find((s) => s.id === output.targetEnemyId)
        if (target) {
          for (const w of wList) {
            const cd = enemyCooldowns[i].get(w.id) ?? 0
            if (cd > 0) {
              enemyCooldowns[i].set(w.id, cd - 1)
              continue
            }
            const range = getWeaponRange(w)
            const d = dist(
              [self.position[0], self.position[1]],
              [target.position[0], target.position[1]],
            )
            if (d <= range && Math.random() < w.accuracy) {
              const a = angleTo(
                [self.position[0], self.position[1]],
                [target.position[0], target.position[1]],
              )
              const speed = range / 20
              projectiles.push({
                id: `proj_${pid++}`,
                type: w.type,
                position: [self.position[0], self.position[1]],
                velocity: [Math.cos(a) * speed, Math.sin(a) * speed],
                damage: w.damage,
                damageType: w.damageType,
              })
              self.flux += w.fluxPerShot
              enemyCooldowns[i].set(w.id, Math.round(600 / w.fireRate / 0.1))
            }
          }
        }
      }
    }

    // === Phase 2: Move projectiles & check hits ===
    const aliveProjectiles: BattleProjectile[] = []
    for (const proj of projectiles) {
      proj.position[0] += proj.velocity[0]
      proj.position[1] += proj.velocity[1]

      // Check bounds
      if (Math.abs(proj.position[0]) > BATTLE_SIZE || Math.abs(proj.position[1]) > BATTLE_SIZE) {
        continue
      }

      // Check hit on all alive ships
      let hit = false
      for (const ship of allShips) {
        if (!ship.alive) continue
        const d = dist(
          [proj.position[0], proj.position[1]],
          [ship.position[0], ship.position[1]],
        )
        // Simple hit radius
        if (d < 1.5) {
          // Check shield
          const shipHull = ships.find((s) => s.id === ship.hullId)
          const shieldEff = shipHull?.baseStats.shieldEfficiency ?? 0.8
          const shieldArc = shipHull?.baseStats.shieldArc ?? 150
          const a = angleTo(
            [ship.position[0], ship.position[1]],
            [proj.position[0], proj.position[1]],
          )
          let diff = a - ship.shieldFacing
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2

          const hitsShield =
            ship.shieldActive && Math.abs(diff) < (shieldArc / 360) * Math.PI

          let actualDamage: number
          if (hitsShield) {
            // Shield damage type multiplier
            const shieldMult = proj.damageType === 'Kinetic' ? 2 :
              proj.damageType === 'HighExplosive' ? 0.5 :
              proj.damageType === 'Fragmentation' ? 0.25 : 1
            ship.flux += proj.damage * shieldMult * shieldEff
            actualDamage = 0
            events.push({ tick, type: 'shieldHit', position: [...proj.position] as [number, number], shipId: ship.id })
          } else {
            const armorMult = proj.damageType === 'HighExplosive' ? 2 :
              proj.damageType === 'Kinetic' ? 0.5 :
              proj.damageType === 'Fragmentation' ? 0.25 : 1
            if (ship.armor > 0) {
              const armorReduction = ship.armor / (ship.armor + proj.damage)
              actualDamage = proj.damage * armorMult * (1 - armorReduction)
              ship.armor -= proj.damage * armorMult * 0.15
              if (ship.armor < 0) ship.armor = 0
            } else {
              actualDamage = proj.damage * armorMult
            }
            ship.hp -= actualDamage
            events.push({ tick, type: 'hit', position: [...proj.position] as [number, number], shipId: ship.id, damage: Math.round(actualDamage) })
          }

          // Check for kill
          if (ship.hp <= 0) {
            ship.hp = 0
            ship.alive = false
            events.push({ tick, type: 'explosion', position: [...ship.position] as [number, number], shipId: ship.id })
            events.push({ tick, type: 'kill', position: [...ship.position] as [number, number], shipId: ship.id })
          }

          hit = true
          break // projectile consumed
        }
      }

      if (!hit) {
        aliveProjectiles.push(proj)
      }
    }
    projectiles.length = 0
    projectiles.push(...aliveProjectiles)

    // === Phase 3: Check win/loss ===
    const playerAlive = playerShips.some((s) => s.alive)
    const enemyAlive = enemyShips.some((s) => s.alive)
    if (!playerAlive || !enemyAlive) {
      // Final snapshot
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
      break
    }

    // Save snapshot every 5 ticks
    if (tick % 5 === 0) {
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
    }

    // Also save on events
    if (events.length > 0 && tick % 5 !== 0) {
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
    }
  }

  // Determine winner
  const playerAlive = playerShips.some((s) => s.alive)
  const enemyAlive = enemyShips.some((s) => s.alive)
  let winner: 'player' | 'enemy'
  if (playerAlive && !enemyAlive) winner = 'player'
  else if (!playerAlive && enemyAlive) winner = 'enemy'
  else winner = 'player' // draw → player wins

  // Generate loot if player wins
  let loot: LootDrop[] = []
  if (winner === 'player') {
    const table = lootTables[Math.floor(Math.random() * lootTables.length)]
    if (table) {
      const totalWeight = table.drops.reduce((sum, d) => sum + d.weight, 0)
      const roll = Math.random() * totalWeight
      let cumulative = 0
      for (const d of table.drops) {
        cumulative += d.weight
        if (roll <= cumulative) {
          loot.push({ ...d.drop, amount: d.drop.amount + Math.floor(Math.random() * d.drop.amount) })
          break
        }
      }
      // Always give some credits
      loot.push({ type: 'credits', amount: 500 + Math.floor(Math.random() * 1500) })
    }
  }

  return {
    winner,
    replay: { ticks: replay, duration: replay[replay.length - 1]?.tick ?? 0, winner },
    loot,
  }
}
