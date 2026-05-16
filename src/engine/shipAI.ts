import type { BattleShipSnapshot, Weapon } from '../types'
import { dist, angleTo, clamp } from '../utils/math'

export interface AIInput {
  self: BattleShipSnapshot
  enemies: BattleShipSnapshot[]
  allies: BattleShipSnapshot[]
  weapons: Weapon[] // currently mounted
  weaponRanges: Map<string, number>
}

export interface AIOutput {
  targetX: number
  targetY: number
  wantShield: boolean
  wantFire: boolean
  targetEnemyId: string | null
}

const BATTLE_SIZE = 20 // [-10, 10] on each axis

export function runShipAI(input: AIInput): AIOutput {
  const { self, enemies, weaponRanges } = input

  if (!self.alive || enemies.length === 0) {
    return { targetX: 0, targetY: 0, wantShield: false, wantFire: false, targetEnemyId: null }
  }

  // Pick closest enemy as target
  let closestEnemy = enemies[0]
  let closestDist = Infinity
  for (const e of enemies) {
    if (!e.alive) continue
    const d = dist([self.position[0], self.position[1]], [e.position[0], e.position[1]])
    if (d < closestDist) {
      closestDist = d
      closestEnemy = e
    }
  }

  // Use average weapon range for positioning (not max, to keep short-range weapons useful)
  let avgRange = 5
  let count = 0
  for (const [, range] of weaponRanges) {
    avgRange += range
    count++
  }
  if (count > 0) avgRange /= count

  const angleToTarget = angleTo(
    [self.position[0], self.position[1]],
    [closestEnemy.position[0], closestEnemy.position[1]],
  )

  let targetX = self.position[0]
  let targetY = self.position[1]
  let wantShield = true
  let wantFire = false

  // High flux → retreat and vent
  if (self.flux > self.maxFlux * 0.8) {
    wantShield = false
    // Move away from enemy
    targetX = self.position[0] - Math.cos(angleToTarget) * 0.5
    targetY = self.position[1] - Math.sin(angleToTarget) * 0.5
  }
  // Enemy in range → fire and manage distance
  else if (closestDist < avgRange * 1.1) {
    wantFire = true
    // Optimal distance: 70% of average range
    const optimalDist = avgRange * 0.7
    if (closestDist > optimalDist) {
      // Close in
      targetX = self.position[0] + Math.cos(angleToTarget) * 0.3
      targetY = self.position[1] + Math.sin(angleToTarget) * 0.3
    } else if (closestDist < optimalDist * 0.6) {
      // Too close, back off
      targetX = self.position[0] - Math.cos(angleToTarget) * 0.3
      targetY = self.position[1] - Math.sin(angleToTarget) * 0.3
    }
    // Face target
    self.rotation = angleToTarget
  }
  // Enemy out of range → approach
  else {
    targetX = self.position[0] + Math.cos(angleToTarget) * 0.4
    targetY = self.position[1] + Math.sin(angleToTarget) * 0.4
  }

  // Face shield toward closest enemy
  self.shieldFacing = angleToTarget

  // Clamp to battlefield
  targetX = clamp(targetX, -BATTLE_SIZE, BATTLE_SIZE)
  targetY = clamp(targetY, -BATTLE_SIZE, BATTLE_SIZE)

  return {
    targetX,
    targetY,
    wantShield,
    wantFire,
    targetEnemyId: closestEnemy.id,
  }
}
