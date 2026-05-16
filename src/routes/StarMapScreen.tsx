import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StarMap2D } from '../components/starmap/StarMap2D'
import { generateStarMap } from '../engine/starMapGen'
import { usePlayerStore } from '../store/playerStore'
import { saveGame, listSaves } from '../db'
import { useAutoSave } from '../hooks/useAutoSave'
import { playClickSound } from '../utils/audio'
import type { StarNode } from '../types'

function calcDist(a: StarNode, b: StarNode): number {
  const dx = a.position[0] - b.position[0]
  const dy = a.position[1] - b.position[1]
  return Math.sqrt(dx * dx + dy * dy)
}

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

  useAutoSave(true)

  const starMap = useMemo(() => generateStarMap(starMapSeed || 42), [starMapSeed])
  const [selectedNode, setSelectedNode] = useState<StarNode | null>(
    starMap.nodes.find((n) => n.id === currentSystemId) ?? null,
  )
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

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

  const currentNode = starMap.nodes.find((n) => n.id === currentSystemId)

  // Distance and fuel cost from current to selected
  const distToSelected = (currentNode && selectedNode && currentNode.id !== selectedNode.id)
    ? calcDist(currentNode, selectedNode)
    : 0
  const fuelCost = Math.round(distToSelected * 5)
  const canTravel = fuelCost > 0 && fuel >= fuelCost
  const isStranded = fuel <= 0

  // Click a node → select it only, don't move
  const handleNodeClick = (node: StarNode) => {
    setSelectedNode(node)
    playClickSound()
  }

  // Travel to selected node
  const handleTravel = () => {
    if (!selectedNode || !currentNode || selectedNode.id === currentNode.id) return
    if (!canTravel) return
    setCurrentSystem(selectedNode.id)
    setFuel(fuel - fuelCost)
    playClickSound()
  }

  const handleDock = () => {
    if (currentNode?.hasStation) {
      setCurrentStation(currentNode.id)
      navigate('/station')
    }
  }

  const handleBattle = () => {
    const danger = currentNode?.dangerLevel ?? 1
    playClickSound()
    navigate(`/battle?danger=${danger}`)
  }

  const handleSave = async () => {
    const allSaves = await listSaves()
    const saveId = `save_${Date.now()}`
    const saveName = `存档 ${allSaves.length + 1} - ${currentNode?.name ?? '未知'}`
    await saveGame(saveId, saveName, {
      credits, fleet, warehouse,
      currentSystemId, currentStationId: null, fuel, starMapSeed,
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
          📍 {currentNode?.name ?? '未知'}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--color-warning)] whitespace-nowrap" title="消耗于星系间航行">
          燃料 {fuel}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--color-accent)] whitespace-nowrap">
          信用点 ${credits.toLocaleString()}
        </span>
        {isStranded && (
          <span className="text-[10px] sm:text-xs text-[var(--color-danger)] animate-pulse">燃料耗尽!</span>
        )}
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
          selectedNodeId={selectedNode?.id ?? null}
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
            <div className="text-xs sm:text-sm text-[var(--color-text)] truncate">
              {selectedNode.name}
              {selectedNode.id === currentSystemId && (
                <span className="text-[10px] text-[var(--color-accent)] ml-2">当前位置</span>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-[var(--color-text-dim)] truncate">
              {selectedNode.type} · 危险 {selectedNode.dangerLevel}
              {selectedNode.id !== currentSystemId && (
                <span> · 距离 {distToSelected.toFixed(1)} · 消耗 <span className={canTravel ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'}>{fuelCost} 燃料</span></span>
              )}
            </div>
          </div>
          <div className="flex-1" />

          {/* Travel button (for different node) */}
          {selectedNode.id !== currentSystemId && (
            <button
              className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer ${
                canTravel
                  ? 'bg-[var(--color-accent)] text-white hover:brightness-110'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              onClick={handleTravel}
              disabled={!canTravel}
              title={fuel < fuelCost ? `需要 ${fuelCost} 燃料，当前仅有 ${fuel}` : ''}
            >
              {fuel < fuelCost ? `燃料不足 (需${fuelCost})` : '前往'}
            </button>
          )}

          {/* Dock button (for current node with station) */}
          {selectedNode.id === currentSystemId && selectedNode.hasStation && (
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
