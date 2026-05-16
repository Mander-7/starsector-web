import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StarMap2D } from '../components/starmap/StarMap2D'
import { generateStarMap } from '../engine/starMapGen'
import { usePlayerStore } from '../store/playerStore'
import { saveGame, listSaves } from '../db'
import { useAutoSave } from '../hooks/useAutoSave'
import { playClickSound } from '../utils/audio'
import type { StarNode } from '../types'

export function StarMapScreen() {
  const navigate = useNavigate()
  const currentSystemId = usePlayerStore((s) => s.currentSystemId)
  const setCurrentStation = usePlayerStore((s) => s.setCurrentStation)
  const setCurrentSystem = usePlayerStore((s) => s.setCurrentSystem)
  const fuel = usePlayerStore((s) => s.fuel)
  const setFuel = usePlayerStore((s) => s.setFuel)
  const credits = usePlayerStore((s) => s.credits)
  const fleet = usePlayerStore((s) => s.fleet)
  const warehouse = usePlayerStore((s) => s.warehouse)
  const starMapSeed = usePlayerStore((s) => s.starMapSeed)

  // Auto-save
  useAutoSave(true)

  const starMap = useMemo(() => generateStarMap(starMapSeed || 42), [starMapSeed])
  const [selectedNode, setSelectedNode] = useState<StarNode | null>(
    starMap.nodes.find((n) => n.id === currentSystemId) ?? null,
  )

  // Auto-select first node if current system doesn't match any node (e.g. new game)
  useEffect(() => {
    if (!currentSystemId || !starMap.nodes.find((n) => n.id === currentSystemId)) {
      const firstNode = starMap.nodes[0]
      if (firstNode) {
        setCurrentSystem(firstNode.id)
        setSelectedNode(firstNode)
      }
    }
  }, [currentSystemId, starMap.nodes, setCurrentSystem])
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  const currentNode = starMap.nodes.find((n) => n.id === currentSystemId)

  const handleNodeClick = (node: StarNode) => {
    setSelectedNode(node)
    setCurrentSystem(node.id)
    if (currentNode && currentNode.id !== node.id) {
      const dx = currentNode.position[0] - node.position[0]
      const dy = currentNode.position[1] - node.position[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      setFuel(Math.max(0, fuel - Math.round(dist * 5)))
    }
    playClickSound()
  }

  const handleDock = () => {
    if (selectedNode?.hasStation) {
      setCurrentStation(selectedNode.id)
      navigate('/station')
    }
  }

  const handleBattle = () => {
    playClickSound()
    navigate('/battle')
  }

  const handleSave = async () => {
    const allSaves = await listSaves()
    const saveId = `save_${Date.now()}`
    const saveName = `存档 ${allSaves.length + 1} - ${currentNode?.name ?? '未知'}`
    await saveGame(saveId, saveName, {
      credits, fleet, warehouse,
      currentSystemId, currentStationId: null, fuel,
    })
    setShowSaveConfirm(true)
    setTimeout(() => setShowSaveConfirm(false), 2000)
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-space-bg)]">
      {/* Top bar */}
      <div className="flex items-center gap-2 sm:gap-4 p-2 bg-black/40 border-b border-[var(--color-panel-border)] shrink-0 z-10">
        <button
          className="px-2 sm:px-3 py-1 text-xs border border-[var(--color-panel-border)] rounded text-[var(--color-text-dim)] hover:border-[var(--color-accent)] cursor-pointer"
          onClick={() => navigate('/')}
        >
          菜单
        </button>
        <span className="text-[10px] sm:text-xs text-[var(--color-text-dim)] truncate max-w-20 sm:max-w-none">
          {currentNode?.name ?? '未知'}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--color-warning)] whitespace-nowrap">
          ⛽ {fuel}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--color-accent)] whitespace-nowrap">
          💰 ${credits.toLocaleString()}
        </span>
        <div className="flex-1" />
        <button
          className="px-2 sm:px-3 py-1 text-xs border border-[var(--color-panel-border)] rounded text-[var(--color-text-dim)] hover:border-[var(--color-accent)] cursor-pointer"
          onClick={handleSave}
        >
          存档
        </button>
        <button
          className="px-2 sm:px-3 py-1 text-xs bg-[var(--color-danger)] text-white rounded cursor-pointer hover:brightness-110"
          onClick={handleBattle}
        >
          战斗
        </button>
      </div>

      {/* 2D Star Map */}
      <div className="flex-1">
        <StarMap2D
          nodes={starMap.nodes}
          edges={starMap.edges}
          currentNodeId={currentSystemId}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Save confirmation toast */}
      {showSaveConfirm && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-[var(--color-success)] text-white rounded text-sm z-20 animate-pulse">
          已保存
        </div>
      )}

      {/* Bottom info panel */}
      {selectedNode && (
        <div className="flex items-center gap-3 p-2 sm:p-3 bg-black/60 border-t border-[var(--color-panel-border)] shrink-0">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-[var(--color-text)] truncate">{selectedNode.name}</div>
            <div className="text-[9px] sm:text-[10px] text-[var(--color-text-dim)] truncate">
              {selectedNode.type} · 危险 {selectedNode.dangerLevel}
            </div>
          </div>
          <div className="flex-1" />
          {selectedNode.hasStation && (
            <button
              className="px-3 sm:px-4 py-1.5 bg-[var(--color-accent)] text-white rounded text-xs sm:text-sm font-medium cursor-pointer hover:brightness-110 whitespace-nowrap"
              onClick={handleDock}
            >
              停靠
            </button>
          )}
        </div>
      )}
    </div>
  )
}
