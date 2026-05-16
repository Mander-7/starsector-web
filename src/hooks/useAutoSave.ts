import { useEffect } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { saveGame } from '../db'

export function useAutoSave(enabled: boolean) {
  const { credits, fleet, warehouse, currentSystemId, currentStationId, fuel, starMapSeed } = usePlayerStore()

  useEffect(() => {
    if (!enabled) return

    const buildState = () => ({
      credits,
      fleet: JSON.parse(JSON.stringify(fleet)),
      warehouse: JSON.parse(JSON.stringify(warehouse)),
      currentSystemId,
      currentStationId,
      fuel,
      starMapSeed,
    })

    // Save immediately on mount so there's always a save to continue
    saveGame('autosave', '自动存档', buildState())

    const timer = setInterval(() => {
      saveGame('autosave', '自动存档', buildState())
    }, 30000)
    return () => clearInterval(timer)
  }, [enabled, credits, fleet, warehouse, currentSystemId, currentStationId, fuel, starMapSeed])
}
