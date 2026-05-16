import { useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { saveGame } from '../db'

export function useAutoSave(enabled: boolean) {
  const { credits, fleet, warehouse, currentSystemId, currentStationId, fuel } = usePlayerStore()

  useEffect(() => {
    if (!enabled) return
    const state = {
      credits,
      fleet: JSON.parse(JSON.stringify(fleet)),
      warehouse: JSON.parse(JSON.stringify(warehouse)),
      currentSystemId,
      currentStationId,
      fuel,
    }
    const timer = setInterval(() => {
      saveGame('autosave', '自动存档', state)
    }, 30000) // auto-save every 30s
    return () => clearInterval(timer)
  }, [enabled, credits, fleet, warehouse, currentSystemId, currentStationId, fuel])
}
