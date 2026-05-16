import type { HullMod } from '../types'

export const hullmods: HullMod[] = [
  {
    id: 'hardened_shields',
    name: '硬化护盾',
    opCost: 5,
    effects: { shieldEfficiency: -0.15 },
    description: '护盾效率提升15%',
    conflictWith: [],
  },
  {
    id: 'flux_distributor',
    name: '辐能分配器',
    opCost: 8,
    effects: { fluxDissipation: 100 },
    description: '辐能耗散+100',
    conflictWith: [],
  },
  {
    id: 'armored_weapon_mounts',
    name: '装甲武器座',
    opCost: 4,
    effects: { armor: 100 },
    description: '装甲+100',
    conflictWith: [],
  },
  {
    id: 'safety_overrides',
    name: '安全超驰',
    opCost: 10,
    effects: { speed: 40, fluxCapacity: -1000 },
    description: '速度+40，但辐能容量-1000',
    conflictWith: [],
  },
  {
    id: 'heavy_armor',
    name: '重型装甲',
    opCost: 0,
    effects: { armor: 300, speed: -15 },
    description: '装甲+300，速度-15',
    conflictWith: ['safety_overrides'],
  },
]
