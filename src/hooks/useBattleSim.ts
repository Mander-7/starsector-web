import { useMemo } from 'react'
import type { BattleResult, PlayerShip } from '../types'
import { simulateBattle } from '../engine/battleSimulator'

export function useBattleSim(
  playerFleet: PlayerShip[],
  enemyHullIds: string[],
): BattleResult {
  return useMemo(() => {
    if (playerFleet.length === 0) {
      return {
        winner: 'enemy',
        replay: { ticks: [], duration: 0, winner: 'enemy' },
        loot: [],
      }
    }
    return simulateBattle(playerFleet, enemyHullIds)
  }, [playerFleet, enemyHullIds])
}
