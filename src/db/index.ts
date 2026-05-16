import Dexie, { type Table } from 'dexie'
import type { PlayerState } from '../types'

interface SaveRecord {
  id: string
  name: string
  timestamp: number
  state: PlayerState
}

interface LoadoutRecord {
  id: string
  name: string
  hullId: string
  mountedWeapons: Record<string, string | null>
  installedMods: string[]
  timestamp: number
}

interface SettingsRecord {
  key: string
  value: unknown
}

class GameDB extends Dexie {
  saves!: Table<SaveRecord, string>
  loadouts!: Table<LoadoutRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('StarsectorWebDB')
    this.version(1).stores({
      saves: 'id, timestamp',
      loadouts: 'id, hullId, timestamp',
      settings: 'key',
    })
  }
}

export const db = new GameDB()

// Save helpers
export async function saveGame(id: string, name: string, state: PlayerState) {
  await db.saves.put({ id, name, timestamp: Date.now(), state })
}

export async function loadGame(id: string): Promise<PlayerState | null> {
  const record = await db.saves.get(id)
  return record?.state ?? null
}

export async function listSaves() {
  return db.saves.orderBy('timestamp').reverse().toArray()
}

export async function deleteSave(id: string) {
  await db.saves.delete(id)
}

// Loadout helpers
export async function saveLoadout(
  id: string,
  name: string,
  hullId: string,
  mountedWeapons: Record<string, string | null>,
  installedMods: string[],
) {
  await db.loadouts.put({ id, name, hullId, mountedWeapons, installedMods, timestamp: Date.now() })
}

export async function listLoadouts(hullId?: string) {
  if (hullId) return db.loadouts.where('hullId').equals(hullId).toArray()
  return db.loadouts.orderBy('timestamp').reverse().toArray()
}

export async function deleteLoadout(id: string) {
  await db.loadouts.delete(id)
}
