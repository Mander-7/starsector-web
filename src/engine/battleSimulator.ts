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
import { dist, angleTo } from '../utils/math'

const MAX_TICKS = 600
const BATTLE_HALF = 10

function cloneShip(s: BattleShipSnapshot): BattleShipSnapshot {
  return {
    ...s,
    position: [s.position[0], s.position[1]] as [number, number],
  }
}

function cloneProjectile(p: BattleProjectile): BattleProjectile {
  return {
    ...p,
    position: [p.position[0], p.position[1]] as [number, number],
    velocity: [p.velocity[0], p.velocity[1]] as [number, number],
  }
}

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
      ...playerShips.map(cloneShip),
      ...enemyShips.map(cloneShip),
    ],
    projectiles: projectiles.map(cloneProjectile),
    events: events.map((e) => ({ ...e, position: [e.position[0], e.position[1]] as [number, number] })),
  }
}

export function simulateBattle(
  playerFleet: PlayerShip[],
  enemyHullIds: string[],
): BattleResult {
  // Player ships at bottom center, facing up
  const playerShips: BattleShipSnapshot[] = playerFleet.map((ps, i) => {
    const hull = ships.find((s) => s.id === ps.hullId)!
    const spreadX = (i - (playerFleet.length - 1) / 2) * 3
    return {
      id: `p_${i}`,
      name: ps.name,
      hullId: ps.hullId,
      isPlayer: true,
      position: [spreadX, -4],
      rotation: Math.PI / 2,
      hp: ps.currentHp,
      maxHp: hull.baseStats.hp,
      armor: ps.currentArmor,
      maxArmor: hull.baseStats.armor,
      flux: 0,
      maxFlux: hull.baseStats.fluxCapacity,
      shieldActive: true,
      shieldFacing: Math.PI / 2,
      alive: true,
    }
  })

  // Enemy ships at top center, facing down
  const enemyShips: BattleShipSnapshot[] = enemyHullIds.map((hid, i) => {
    const hull = ships.find((s) => s.id === hid)!
    const spreadX = (i - (enemyHullIds.length - 1) / 2) * 3
    return {
      id: `e_${i}`,
      name: hull.name,
      hullId: hid,
      isPlayer: false,
      position: [spreadX, 4],
      rotation: -Math.PI / 2,
      hp: hull.baseStats.hp,
      maxHp: hull.baseStats.hp,
      armor: hull.baseStats.armor,
      maxArmor: hull.baseStats.armor,
      flux: 0,
      maxFlux: hull.baseStats.fluxCapacity,
      shieldActive: true,
      shieldFacing: -Math.PI / 2,
      alive: true,
    }
  })

  const projectiles: BattleProjectile[] = []
  const replay: TickSnapshot[] = []
  let pid = 0

  // Build weapon maps
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

  // Cooldown timers
  const playerCooldowns: Map<string, number>[] = playerFleet.map(() => new Map())
  const enemyCooldowns: Map<string, number>[] = enemyHullIds.map(() => new Map())

  replay.push(createSnapshot(playerShips, enemyShips, [], [], 0))

  for (let tick = 1; tick <= MAX_TICKS; tick++) {
    const events: BattleEvent[] = []

    // === Player ships: static, face enemy, manage shields, fire ===
    for (let i = 0; i < playerShips.length; i++) {
      const self = playerShips[i]
      if (!self.alive) continue

      const hull = ships.find((s) => s.id === self.hullId)!
      const wList = playerWeaponMaps[i].get(self.hullId) ?? []

      // Pick closest alive enemy
      const aliveEnemies = enemyShips.filter((s) => s.alive)
      let target: BattleShipSnapshot | null = null
      let closestDist = Infinity
      for (const e of aliveEnemies) {
        const d = dist([self.position[0], self.position[1]], [e.position[0], e.position[1]])
        if (d < closestDist) { closestDist = d; target = e }
      }

      // Flux management
      const fluxOverloaded = self.flux > self.maxFlux * 0.8
      self.flux = Math.max(0, self.flux - hull.baseStats.fluxDissipation * 0.1)
      self.shieldActive = !fluxOverloaded

      // Fire weapons (no range check — ships are fixed, always in range)
      if (!fluxOverloaded && target) {
        for (const w of wList) {
          const cd = playerCooldowns[i].get(w.id) ?? 0
          if (cd > 0) {
            playerCooldowns[i].set(w.id, cd - 1)
            continue
          }
          // Target random position on enemy ship body (±1 unit around its center)
          const tx = target.position[0] + (Math.random() - 0.5) * 2.5
          const ty = target.position[1] + (Math.random() - 0.5) * 2.5
          const baseAngle = angleTo([self.position[0], self.position[1]], [tx, ty])
          const spread = (1 - w.accuracy) * 0.3
          const a = baseAngle + (Math.random() - 0.5) * spread
          const speed = 8 / 20
          projectiles.push({
            id: `proj_${pid++}`,
            type: w.type,
            position: [self.position[0] + Math.cos(a) * 1.2, self.position[1] + Math.sin(a) * 1.2],
            velocity: [Math.cos(a) * speed, Math.sin(a) * speed],
            damage: w.damage,
            damageType: w.damageType,
            sourceShipId: self.id,
          })
          self.flux += w.fluxPerShot
          playerCooldowns[i].set(w.id, Math.round(600 / w.fireRate))
        }
      }
    }

    // === Enemy ships: static, face enemy, manage shields, fire ===
    for (let i = 0; i < enemyShips.length; i++) {
      const self = enemyShips[i]
      if (!self.alive) continue

      const hull = ships.find((s) => s.id === self.hullId)!
      const wList = enemyWeaponMaps[i].get(self.hullId) ?? []

      const alivePlayers = playerShips.filter((s) => s.alive)
      let target: BattleShipSnapshot | null = null
      let closestDist = Infinity
      for (const p of alivePlayers) {
        const d = dist([self.position[0], self.position[1]], [p.position[0], p.position[1]])
        if (d < closestDist) { closestDist = d; target = p }
      }

      const fluxOverloaded = self.flux > self.maxFlux * 0.8
      self.flux = Math.max(0, self.flux - hull.baseStats.fluxDissipation * 0.1)
      self.shieldActive = !fluxOverloaded

      if (!fluxOverloaded && target) {
        for (const w of wList) {
          const cd = enemyCooldowns[i].get(w.id) ?? 0
          if (cd > 0) {
            enemyCooldowns[i].set(w.id, cd - 1)
            continue
          }
          const tx = target.position[0] + (Math.random() - 0.5) * 2.5
          const ty = target.position[1] + (Math.random() - 0.5) * 2.5
          const baseAngle = angleTo([self.position[0], self.position[1]], [tx, ty])
          const spread = (1 - w.accuracy) * 0.3
          const a = baseAngle + (Math.random() - 0.5) * spread
          const speed = 8 / 20
          projectiles.push({
            id: `proj_${pid++}`,
            type: w.type,
            position: [self.position[0] + Math.cos(a) * 1.2, self.position[1] + Math.sin(a) * 1.2],
            velocity: [Math.cos(a) * speed, Math.sin(a) * speed],
            damage: w.damage,
            damageType: w.damageType,
            sourceShipId: self.id,
          })
          self.flux += w.fluxPerShot
          enemyCooldowns[i].set(w.id, Math.round(600 / w.fireRate))
        }
      }
    }

    // === Move projectiles & check hits ===
    const aliveProjectiles: BattleProjectile[] = []
    for (const proj of projectiles) {
      proj.position[0] += proj.velocity[0]
      proj.position[1] += proj.velocity[1]

      if (Math.abs(proj.position[0]) > BATTLE_HALF || Math.abs(proj.position[1]) > BATTLE_HALF) {
        continue
      }

      let hit = false
      const allShips = [...playerShips, ...enemyShips]
      for (const ship of allShips) {
        if (!ship.alive) continue
        if (ship.id === proj.sourceShipId) continue
        const d = dist(
          [proj.position[0], proj.position[1]],
          [ship.position[0], ship.position[1]],
        )
        if (d < 1.5) {
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

          if (ship.hp <= 0) {
            ship.hp = 0
            ship.alive = false
            events.push({ tick, type: 'explosion', position: [...ship.position] as [number, number], shipId: ship.id })
            events.push({ tick, type: 'kill', position: [...ship.position] as [number, number], shipId: ship.id })
          }

          hit = true
          break
        }
      }

      if (!hit) {
        aliveProjectiles.push(proj)
      }
    }
    projectiles.length = 0
    projectiles.push(...aliveProjectiles)

    // Check win/loss
    const playerAlive = playerShips.some((s) => s.alive)
    const enemyAlive = enemyShips.some((s) => s.alive)
    if (!playerAlive || !enemyAlive) {
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
      break
    }

    if (tick % 5 === 0) {
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
    }
    if (events.length > 0 && tick % 5 !== 0) {
      replay.push(createSnapshot(playerShips, enemyShips, projectiles, events, tick))
    }
  }

  const playerAlive = playerShips.some((s) => s.alive)
  const enemyAlive = enemyShips.some((s) => s.alive)
  let winner: 'player' | 'enemy'
  if (playerAlive && !enemyAlive) winner = 'player'
  else if (!playerAlive && enemyAlive) winner = 'enemy'
  else winner = 'player'

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
      loot.push({ type: 'credits', amount: 500 + Math.floor(Math.random() * 1500) })
    }
  }

  return {
    winner,
    replay: { ticks: replay, duration: replay[replay.length - 1]?.tick ?? 0, winner },
    loot,
  }
}
