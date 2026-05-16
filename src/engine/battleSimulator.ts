import type {
  TickSnapshot,
  BattleShipSnapshot,
  BattleProjectile,
  BattleEvent,
  BattleResult,
  PlayerShip,
  Weapon,
  LootDrop,
  HullTemplate,
  HullShapeParams,
} from '../types'
import { ships } from '../data/ships'
import { weapons as weaponData } from '../data/weapons'
import { lootTables } from '../data/lootTables'
import { dist, angleTo } from '../utils/math'

const MAX_TICKS = 600
const BATTLE_HALF = 10

const ALL_TEMPLATES: HullTemplate[] = ['arrow', 'wedge', 'brick', 'needle', 'crescent', 'hammerhead', 'split', 'lance']
const SHIP_COLORS = ['#ff8844', '#44ddff', '#ff6644', '#44aaff', '#ffaa44', '#6688cc', '#cc6644', '#88aadd']

function randomEnemyShape(): HullShapeParams {
  return {
    template: ALL_TEMPLATES[Math.floor(Math.random() * ALL_TEMPLATES.length)],
    seed: Math.floor(Math.random() * 9999),
    length: 3.5 + Math.random() * 6.5,
    width: 1.2 + Math.random() * 3.2,
    noseWidth: 0,
    engineWidth: 0,
    wings: Math.random() * 0.4,
    color: SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)],
  }
}

function cloneShip(s: BattleShipSnapshot): BattleShipSnapshot {
  return {
    ...s,
    position: [s.position[0], s.position[1]] as [number, number],
    hullShape: s.hullShape ? { ...s.hullShape } : undefined,
    missileAmmo: { ...s.missileAmmo },
  }
}

function cloneProjectile(p: BattleProjectile): BattleProjectile {
  return {
    ...p,
    position: [p.position[0], p.position[1]] as [number, number],
    velocity: [p.velocity[0], p.velocity[1]] as [number, number],
  }
}

const MISSILE_AMMO = { harpoon: 6, sabot: 8, reaper: 2, annihilator: 12 }

function getMissileAmmo(weaponId: string): number {
  return MISSILE_AMMO[weaponId as keyof typeof MISSILE_AMMO] ?? 5
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
    const missileAmmo: Record<string, number> = {}
    for (const weaponId of Object.values(ps.mountedWeapons)) {
      if (weaponId) {
        const w = weaponData.find((x) => x.id === weaponId)
        if (w && w.type === 'Missile') missileAmmo[weaponId] = getMissileAmmo(weaponId)
      }
    }
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
      hullShape: hull.hullShape,
      missileAmmo,
    }
  })

  // Enemy ships at top center, facing down
  const enemyShips: BattleShipSnapshot[] = enemyHullIds.map((hid, i) => {
    const hull = ships.find((s) => s.id === hid)!
    const spreadX = (i - (enemyHullIds.length - 1) / 2) * 3
    const missileAmmo: Record<string, number> = {}
    for (const slot of hull.weaponSlots) {
      const compatible = weaponData.find(
        (w) => w.size === slot.size && (slot.type === 'Universal' || w.type === slot.type),
      )
      if (compatible && compatible.type === 'Missile') {
        missileAmmo[compatible.id] = getMissileAmmo(compatible.id)
      }
    }
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
      hullShape: randomEnemyShape(),
      missileAmmo,
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
          // Check missile ammo
          if (w.type === 'Missile') {
            const ammo = self.missileAmmo[w.id] ?? 0
            if (ammo <= 0) continue
            self.missileAmmo[w.id] = ammo - 1
          }
          const isMissile = w.type === 'Missile'
          // Target random position on enemy ship body (±1 unit around its center)
          const tx = target.position[0] + (Math.random() - 0.5) * 2.5
          const ty = target.position[1] + (Math.random() - 0.5) * 2.5
          const baseAngle = angleTo([self.position[0], self.position[1]], [tx, ty])
          const spread = (1 - w.accuracy) * 0.3
          const a = baseAngle + (Math.random() - 0.5) * spread
          const missileSpeed = isMissile ? 0.35 : 8 / 20
          // Missiles fire from side of ship, perpendicular to facing
          const facingDir = self.rotation
          const sideOffset = isMissile ? (Math.random() > 0.5 ? 1 : -1) * (1.0 + Math.random() * 0.8) : 0
          const spawnX = self.position[0] + Math.cos(facingDir) * 0.6 + Math.cos(facingDir + Math.PI / 2) * sideOffset
          const spawnY = self.position[1] + Math.sin(facingDir) * 0.6 + Math.sin(facingDir + Math.PI / 2) * sideOffset
          // Missile initial velocity: upward arc then toward target
          const velAngle = isMissile ? facingDir + (Math.random() - 0.5) * 0.6 : a
          projectiles.push({
            id: `proj_${pid++}`,
            type: w.type,
            position: [spawnX, spawnY],
            velocity: [Math.cos(velAngle) * missileSpeed, Math.sin(velAngle) * missileSpeed],
            damage: w.damage,
            damageType: w.damageType,
            sourceShipId: self.id,
            targetShipId: isMissile ? target.id : undefined,
          })
          self.flux += w.fluxPerShot
          playerCooldowns[i].set(w.id, w.type === 'Missile' ? Math.round(200 / w.fireRate) : Math.round(600 / w.fireRate))
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
          if (w.type === 'Missile') {
            const ammo = self.missileAmmo[w.id] ?? 0
            if (ammo <= 0) continue
            self.missileAmmo[w.id] = ammo - 1
          }
          const isMissile = w.type === 'Missile'
          const tx = target.position[0] + (Math.random() - 0.5) * 2.5
          const ty = target.position[1] + (Math.random() - 0.5) * 2.5
          const baseAngle = angleTo([self.position[0], self.position[1]], [tx, ty])
          const spread = (1 - w.accuracy) * 0.3
          const a = baseAngle + (Math.random() - 0.5) * spread
          const missileSpeed = isMissile ? 0.35 : 8 / 20
          const facingDir = self.rotation
          const sideOffset = isMissile ? (Math.random() > 0.5 ? 1 : -1) * (1.0 + Math.random() * 0.8) : 0
          const spawnX = self.position[0] + Math.cos(facingDir) * 0.6 + Math.cos(facingDir + Math.PI / 2) * sideOffset
          const spawnY = self.position[1] + Math.sin(facingDir) * 0.6 + Math.sin(facingDir + Math.PI / 2) * sideOffset
          const velAngle = isMissile ? facingDir + (Math.random() - 0.5) * 0.6 : a
          projectiles.push({
            id: `proj_${pid++}`,
            type: w.type,
            position: [spawnX, spawnY],
            velocity: [Math.cos(velAngle) * missileSpeed, Math.sin(velAngle) * missileSpeed],
            damage: w.damage,
            damageType: w.damageType,
            sourceShipId: self.id,
            targetShipId: isMissile ? target.id : undefined,
          })
          self.flux += w.fluxPerShot
          enemyCooldowns[i].set(w.id, w.type === 'Missile' ? Math.round(200 / w.fireRate) : Math.round(600 / w.fireRate))
        }
      }
    }

    // === Move projectiles & check hits ===
    const aliveProjectiles: BattleProjectile[] = []
    for (const proj of projectiles) {
      // Missile homing: steer toward target with increasing speed
      if (proj.type === 'Missile' && proj.targetShipId) {
        const allShips = [...playerShips, ...enemyShips]
        const target = allShips.find((s) => s.id === proj.targetShipId && s.alive)
        if (target) {
          const ta = angleTo(
            [proj.position[0], proj.position[1]],
            [target.position[0], target.position[1]],
          )
          const curSpeed = Math.sqrt(proj.velocity[0] ** 2 + proj.velocity[1] ** 2) || 0.35
          // Accelerate gradually up to max speed
          const maxSpeed = 0.55
          const newSpeed = Math.min(curSpeed + 0.003, maxSpeed)
          // Steer toward target
          const steerStrength = 0.07
          proj.velocity[0] += Math.cos(ta) * steerStrength
          proj.velocity[1] += Math.sin(ta) * steerStrength
          // Re-normalize
          const currentMag = Math.sqrt(proj.velocity[0] ** 2 + proj.velocity[1] ** 2)
          proj.velocity[0] = (proj.velocity[0] / currentMag) * newSpeed
          proj.velocity[1] = (proj.velocity[1] / currentMag) * newSpeed
        }
      }

      proj.position[0] += proj.velocity[0]
      proj.position[1] += proj.velocity[1]

      if (Math.abs(proj.position[0]) > BATTLE_HALF || Math.abs(proj.position[1]) > BATTLE_HALF) {
        continue
      }

      let hit = false
      const allShips = [...playerShips, ...enemyShips]

      // Phase 1: check shield hits (larger bubble radius)
      for (const ship of allShips) {
        if (!ship.alive) continue
        if (ship.id === proj.sourceShipId) continue
        if (!ship.shieldActive) continue

        const shipHull = ships.find((s) => s.id === ship.hullId)
        const shieldArc = shipHull?.baseStats.shieldArc ?? 150
        const shieldRadius = 2.2 // shield bubble extends well beyond hull

        const d = dist(
          [proj.position[0], proj.position[1]],
          [ship.position[0], ship.position[1]],
        )
        if (d >= shieldRadius) continue

        const a = angleTo(
          [ship.position[0], ship.position[1]],
          [proj.position[0], proj.position[1]],
        )
        let diff = a - ship.shieldFacing
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2

        if (Math.abs(diff) >= (shieldArc / 360) * Math.PI) continue

        // Projectile hit the shield!
        const shieldEff = shipHull?.baseStats.shieldEfficiency ?? 0.8
        const shieldMult = proj.damageType === 'Kinetic' ? 2 :
          proj.damageType === 'HighExplosive' ? 0.5 :
          proj.damageType === 'Fragmentation' ? 0.25 : 1
        ship.flux += proj.damage * shieldMult * shieldEff

        // VFX at the shield boundary
        const vfxX = ship.position[0] + Math.cos(a) * shieldRadius
        const vfxY = ship.position[1] + Math.sin(a) * shieldRadius
        events.push({ tick, type: 'shieldHit', position: [vfxX, vfxY] as [number, number], shipId: ship.id })

        hit = true
        break
      }

      if (hit) continue

      // Phase 2: check hull hits (tighter radius, no shield or wrong angle)
      for (const ship of allShips) {
        if (!ship.alive) continue
        if (ship.id === proj.sourceShipId) continue

        const d = dist(
          [proj.position[0], proj.position[1]],
          [ship.position[0], ship.position[1]],
        )
        if (d >= 1.2) continue

        const armorMult = proj.damageType === 'HighExplosive' ? 2 :
          proj.damageType === 'Kinetic' ? 0.5 :
          proj.damageType === 'Fragmentation' ? 0.25 : 1
        let actualDamage: number
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

        if (ship.hp <= 0) {
          ship.hp = 0
          ship.alive = false
          events.push({ tick, type: 'explosion', position: [...ship.position] as [number, number], shipId: ship.id })
          events.push({ tick, type: 'kill', position: [...ship.position] as [number, number], shipId: ship.id })
        }

        hit = true
        break
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
