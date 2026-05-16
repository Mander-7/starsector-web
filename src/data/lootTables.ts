import type { LootDrop } from '../types'

export interface LootTable {
  id: string
  name: string
  difficulty: number
  drops: { drop: LootDrop; weight: number }[]
}

export const lootTables: LootTable[] = [
  {
    id: 'easy_pirate',
    name: '海盗巡逻队',
    difficulty: 1,
    drops: [
      { drop: { type: 'credits', amount: 500 }, weight: 100 },
      { drop: { type: 'credits', amount: 1000 }, weight: 50 },
      { drop: { type: 'weapon', itemId: 'light_ac', amount: 1 }, weight: 30 },
      { drop: { type: 'weapon', itemId: 'pulse_laser', amount: 1 }, weight: 20 },
      { drop: { type: 'hullmod', itemId: 'hardened_shields', amount: 1 }, weight: 10 },
      { drop: { type: 'fuel', amount: 20 }, weight: 60 },
      { drop: { type: 'fuel', amount: 40 }, weight: 30 },
    ],
  },
  {
    id: 'medium_bounty',
    name: '赏金舰队',
    difficulty: 3,
    drops: [
      { drop: { type: 'credits', amount: 2000 }, weight: 100 },
      { drop: { type: 'credits', amount: 4000 }, weight: 40 },
      { drop: { type: 'weapon', itemId: 'heavy_ac', amount: 1 }, weight: 35 },
      { drop: { type: 'weapon', itemId: 'phase_lance', amount: 1 }, weight: 25 },
      { drop: { type: 'weapon', itemId: 'harpoon', amount: 2 }, weight: 20 },
      { drop: { type: 'hullmod', itemId: 'flux_distributor', amount: 1 }, weight: 15 },
      { drop: { type: 'hullmod', itemId: 'safety_overrides', amount: 1 }, weight: 10 },
      { drop: { type: 'fuel', amount: 30 }, weight: 50 },
      { drop: { type: 'fuel', amount: 60 }, weight: 25 },
    ],
  },
]
