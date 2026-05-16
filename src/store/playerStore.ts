import { create } from 'zustand'
import type { PlayerState, PlayerShip, InventoryItem } from '../types'

interface PlayerStore extends PlayerState {
  setCredits: (n: number) => void
  addCredits: (n: number) => void
  setFleet: (fleet: PlayerShip[]) => void
  updateShip: (index: number, ship: PlayerShip) => void
  addToWarehouse: (item: InventoryItem) => void
  removeFromWarehouse: (itemId: string, type: 'weapon' | 'hullmod', qty?: number) => void
  setWarehouse: (items: InventoryItem[]) => void
  setCurrentSystem: (id: string) => void
  setCurrentStation: (id: string | null) => void
  setFuel: (n: number) => void
  addFuel: (n: number) => void
  setStarMapSeed: (n: number) => void
  loadState: (state: PlayerState) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  credits: 5000,
  fleet: [],
  warehouse: [],
  currentSystemId: '',
  currentStationId: null,
  fuel: 100,
  starMapSeed: 0,

  setCredits: (n) => set({ credits: n }),
  addCredits: (n) => set((s) => ({ credits: s.credits + n })),

  setFleet: (fleet) => set({ fleet }),
  updateShip: (index, ship) =>
    set((s) => {
      const fleet = [...s.fleet]
      fleet[index] = ship
      return { fleet }
    }),

  addToWarehouse: (item) =>
    set((s) => {
      const existing = s.warehouse.find(
        (i) => i.itemId === item.itemId && i.type === item.type,
      )
      if (existing) {
        return {
          warehouse: s.warehouse.map((i) =>
            i.itemId === item.itemId && i.type === item.type
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        }
      }
      return { warehouse: [...s.warehouse, item] }
    }),

  removeFromWarehouse: (itemId, type, qty = 1) =>
    set((s) => ({
      warehouse: s.warehouse
        .map((i) => {
          if (i.itemId === itemId && i.type === type) {
            const newQty = i.quantity - qty
            return newQty <= 0 ? null : { ...i, quantity: newQty }
          }
          return i
        })
        .filter(Boolean) as InventoryItem[],
    })),

  setWarehouse: (items) => set({ warehouse: items }),
  setCurrentSystem: (id) => set({ currentSystemId: id }),
  setCurrentStation: (id) => set({ currentStationId: id }),
  setFuel: (n) => set({ fuel: n }),
  addFuel: (n) => set((s) => ({ fuel: s.fuel + n })),
  setStarMapSeed: (n) => set({ starMapSeed: n }),

  loadState: (state) =>
    set({
      credits: state.credits,
      fleet: state.fleet,
      warehouse: state.warehouse,
      currentSystemId: state.currentSystemId,
      currentStationId: state.currentStationId,
      fuel: state.fuel,
      starMapSeed: state.starMapSeed,
    }),
}))
