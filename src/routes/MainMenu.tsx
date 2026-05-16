import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore'
import { listSaves, loadGame, deleteSave } from '../db'
import type { PlayerShip } from '../types'

export function MainMenu() {
  const navigate = useNavigate()
  const { setFleet, setWarehouse, setCredits, setFuel, setStarMapSeed, loadState } = usePlayerStore()

  const [showLoad, setShowLoad] = useState(false)
  const [saves, setSaves] = useState<Awaited<ReturnType<typeof listSaves>>>([])

  const refreshSaves = async () => {
    setSaves(await listSaves())
  }

  useEffect(() => {
    if (showLoad) refreshSaves()
  }, [showLoad])

  const handleNewGame = () => {
    const starterShip: PlayerShip = {
      hullId: 'hammerhead',
      name: '阿尔法号',
      mountedWeapons: { w1: 'heavy_ac', w2: 'assault_gun', w3: 'light_ac', w4: 'light_ac', m1: 'sabot' },
      installedMods: ['hardened_shields'],
      currentHp: 4000,
      currentArmor: 500,
    }
    setFleet([starterShip])
    setWarehouse([
      { id: crypto.randomUUID(), type: 'weapon', itemId: 'light_ac', quantity: 2 },
      { id: crypto.randomUUID(), type: 'weapon', itemId: 'pulse_laser', quantity: 2 },
      { id: crypto.randomUUID(), type: 'hullmod', itemId: 'flux_distributor', quantity: 1 },
    ])
    setCredits(5000)
    setFuel(100)
    setStarMapSeed(Math.floor(Math.random() * 1000000))
    navigate('/starmap')
  }

  const handleContinue = async () => {
    const all = await listSaves()
    if (all.length > 0) {
      const state = await loadGame(all[0].id)
      if (state) {
        loadState(state)
        navigate('/starmap')
        return
      }
    }
    handleNewGame()
  }

  const handleLoad = async (id: string) => {
    const state = await loadGame(id)
    if (state) {
      loadState(state)
      setShowLoad(false)
      navigate('/starmap')
    }
  }

  const handleDelete = async (id: string) => {
    await deleteSave(id)
    refreshSaves()
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-space-bg)]">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[var(--color-accent)] mb-2 tracking-widest">
          STARSECTOR
        </h1>
        <p className="text-[var(--color-text-dim)] mb-12 text-lg">
          远行星号 · Web Edition
        </p>
        <div className="flex flex-col gap-4 items-center">
          <button
            className="w-64 py-3 bg-[var(--color-accent)] text-white rounded text-lg font-semibold hover:brightness-110 transition-all cursor-pointer"
            onClick={handleNewGame}
          >
            新游戏
          </button>
          <button
            className="w-64 py-3 border border-[var(--color-panel-border)] text-[var(--color-text)] rounded text-lg hover:border-[var(--color-accent)] transition-all cursor-pointer"
            onClick={handleContinue}
          >
            继续游戏
          </button>
          <button
            className="w-64 py-3 border border-[var(--color-panel-border)] text-[var(--color-text-dim)] rounded text-lg hover:border-[var(--color-accent)] transition-all cursor-pointer"
            onClick={() => setShowLoad(true)}
          >
            读档
          </button>
        </div>
      </div>

      {/* Load game modal */}
      {showLoad && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowLoad(false)}
        >
          <div
            className="bg-[var(--color-panel-bg)] border border-[var(--color-panel-border)] rounded-lg shadow-2xl w-96 max-h-[70vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-panel-border)]">
              <h3 className="text-sm font-medium text-[var(--color-text)]">读档</h3>
              <button
                className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer"
                onClick={() => setShowLoad(false)}
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-2">
              {saves.length === 0 && (
                <p className="text-sm text-[var(--color-text-dim)] text-center py-4">暂无存档</p>
              )}
              {saves.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 border border-[var(--color-panel-border)] rounded"
                >
                  <div className="text-left">
                    <div className="text-sm text-[var(--color-text)]">{s.name}</div>
                    <div className="text-[10px] text-[var(--color-text-dim)]">
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 text-xs bg-[var(--color-accent)] text-white rounded cursor-pointer"
                      onClick={() => handleLoad(s.id)}
                    >
                      加载
                    </button>
                    <button
                      className="px-3 py-1 text-xs border border-[var(--color-danger)] text-[var(--color-danger)] rounded cursor-pointer"
                      onClick={() => handleDelete(s.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
