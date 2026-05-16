import { create } from 'zustand'

type GamePhase = 'menu' | 'starmap' | 'station' | 'battle'

interface UIStore {
  gamePhase: GamePhase
  setGamePhase: (phase: GamePhase) => void
  battleSpeed: number
  setBattleSpeed: (n: number) => void
  battlePaused: boolean
  setBattlePaused: (paused: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  gamePhase: 'menu',
  setGamePhase: (phase) => set({ gamePhase: phase }),
  battleSpeed: 1,
  setBattleSpeed: (n) => set({ battleSpeed: n }),
  battlePaused: false,
  setBattlePaused: (paused) => set({ battlePaused: paused }),
}))
