// ============== Ship & Equipment ==============

export type ShipSize = 'Frigate' | 'Destroyer' | 'Cruiser' | 'Capital'
export type WeaponType = 'Ballistic' | 'Energy' | 'Missile'
export type WeaponSize = 'Small' | 'Medium' | 'Large'
export type DamageType = 'Kinetic' | 'HighExplosive' | 'Energy' | 'Fragmentation'
export type SlotType = WeaponType | 'Universal' | 'Composite'

export interface WeaponSlot {
  id: string
  type: SlotType
  size: WeaponSize
  arc: number // firing arc in degrees
}

export interface ShipHull {
  id: string
  name: string
  faction: string
  size: ShipSize
  baseStats: ShipStats
  weaponSlots: WeaponSlot[]
  builtinMods: string[]
  opLimit: number
  // For procedural 3D generation
  hullShape: HullShapeParams
}

export interface ShipStats {
  hp: number
  armor: number
  speed: number
  fluxCapacity: number
  fluxDissipation: number
  shieldEfficiency: number // lower is better, 1.0 = 100% damage -> flux
  shieldType: 'Front' | 'Omni'
  shieldArc: number // degrees
  cargoCapacity: number
  fuelCapacity: number
  crewCapacity: number
}

export interface HullShapeParams {
  length: number
  width: number
  noseWidth: number
  engineWidth: number
  wings: number // 0-1 wing size
  color: string
}

export interface Weapon {
  id: string
  name: string
  type: WeaponType
  size: WeaponSize
  opCost: number
  damage: number
  range: number
  fireRate: number // shots per minute
  damageType: DamageType
  fluxPerShot: number
  accuracy: number // 0-1
}

export interface HullMod {
  id: string
  name: string
  opCost: number
  effects: Partial<ShipStats> // stat modifiers
  description: string
  conflictWith: string[] // incompatible mod IDs
}

// ============== Player State ==============

export interface PlayerShip {
  hullId: string
  name: string
  mountedWeapons: Record<string, string | null> // slotId -> weaponId
  installedMods: string[] // hullmod ids
  currentHp: number
  currentArmor: number
}

export interface InventoryItem {
  id: string
  type: 'weapon' | 'hullmod'
  itemId: string // references Weapon.id or HullMod.id
  quantity: number
}

export interface PlayerState {
  credits: number
  fleet: PlayerShip[]
  warehouse: InventoryItem[]
  currentSystemId: string
  currentStationId: string | null
  fuel: number
}

// ============== Star Map ==============

export type StarNodeType = 'Star' | 'Station' | 'Ruin' | 'AsteroidField'

export interface StarNode {
  id: string
  name: string
  type: StarNodeType
  position: [number, number, number]
  hasStation: boolean
  dangerLevel: number // 1-10
}

export interface StarEdge {
  from: string
  to: string
  distance: number
}

export interface StarSystem {
  nodes: StarNode[]
  edges: StarEdge[]
  seed: number
}

// ============== Battle ==============

export interface BattleShipSnapshot {
  id: string
  name: string
  hullId: string
  isPlayer: boolean
  position: [number, number]
  rotation: number
  hp: number
  maxHp: number
  armor: number
  maxArmor: number
  flux: number
  maxFlux: number
  shieldActive: boolean
  shieldFacing: number
  alive: boolean
}

export interface BattleProjectile {
  id: string
  type: WeaponType
  position: [number, number]
  velocity: [number, number]
  damage: number
  damageType: DamageType
  sourceShipId: string
}

export interface BattleEvent {
  tick: number
  type: 'hit' | 'explosion' | 'kill' | 'shieldHit'
  position: [number, number]
  shipId?: string
  damage?: number
}

export interface TickSnapshot {
  tick: number
  ships: BattleShipSnapshot[]
  projectiles: BattleProjectile[]
  events: BattleEvent[]
}

export interface BattleReplay {
  ticks: TickSnapshot[]
  duration: number
  winner: 'player' | 'enemy'
}

export interface LootDrop {
  type: 'credits' | 'weapon' | 'hullmod'
  itemId?: string
  amount: number
}

export interface BattleResult {
  winner: 'player' | 'enemy'
  replay: BattleReplay
  loot: LootDrop[]
}
