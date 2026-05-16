import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ShipModel } from '../battle/ShipModel'
import type { HullShapeParams, PlayerShip } from '../../types'

interface StarterOption {
  ship: PlayerShip
  label: string
  description: string
  shape: HullShapeParams
}

const STARTERS: StarterOption[] = [
  {
    ship: {
      hullId: 'hammerhead',
      name: '阿尔法号',
      mountedWeapons: { w1: 'heavy_ac', w2: 'assault_gun', w3: 'light_ac', w4: 'light_ac', m1: 'sabot' },
      installedMods: ['hardened_shields'],
      currentHp: 4000,
      currentArmor: 500,
    },
    label: '锤头级',
    description: '均衡型驱逐舰 · 实弹武器 · 前盾',
    shape: { template: 'arrow', seed: 10, length: 7, width: 3, noseWidth: 1.8, engineWidth: 2.2, wings: 0.2, color: '#ff8844' },
  },
  {
    ship: {
      hullId: 'wolf',
      name: '贝塔号',
      mountedWeapons: { w1: 'pulse_laser', w2: 'pulse_laser', w3: 'pulse_laser', m1: 'harpoon' },
      installedMods: ['flux_distributor'],
      currentHp: 1500,
      currentArmor: 200,
    },
    label: '狼级',
    description: '高速护卫舰 · 能量武器 · 前盾',
    shape: { template: 'needle', seed: 20, length: 5, width: 1.8, noseWidth: 0.6, engineWidth: 1.4, wings: 0.3, color: '#ff8844' },
  },
  {
    ship: {
      hullId: 'tempest',
      name: '伽马号',
      mountedWeapons: { w1: 'phase_lance', w2: 'ion_cannon', w3: 'pulse_laser' },
      installedMods: [],
      currentHp: 1250,
      currentArmor: 150,
    },
    label: '暴风级',
    description: '极速护卫舰 · 能量武器 · 全向盾',
    shape: { template: 'crescent', seed: 30, length: 4.5, width: 1.5, noseWidth: 0.4, engineWidth: 1.2, wings: 0.5, color: '#44ddff' },
  },
  {
    ship: {
      hullId: 'medusa',
      name: '德尔塔号',
      mountedWeapons: { w1: 'ion_cannon', w2: 'ion_cannon', w3: 'phase_lance', w4: 'pulse_laser' },
      installedMods: ['flux_distributor'],
      currentHp: 3500,
      currentArmor: 350,
    },
    label: '美杜莎级',
    description: '电子战驱逐舰 · 能量武器 · 全向盾',
    shape: { template: 'split', seed: 42, length: 6.5, width: 2.8, noseWidth: 0.6, engineWidth: 1.8, wings: 0.5, color: '#6688cc' },
  },
  {
    ship: {
      hullId: 'wolf',
      name: '伊普西龙号',
      mountedWeapons: { w1: 'pulse_laser', w2: 'pulse_laser', w3: 'pulse_laser', m1: 'harpoon' },
      installedMods: ['hardened_shields'],
      currentHp: 1500,
      currentArmor: 200,
    },
    label: '狼级·改',
    description: '突击护卫舰 · 能量+导弹 · 前盾',
    shape: { template: 'lance', seed: 77, length: 5.5, width: 1.4, noseWidth: 0.3, engineWidth: 1.6, wings: 0.2, color: '#44aaff' },
  },
  {
    ship: {
      hullId: 'hammerhead',
      name: '泽塔号',
      mountedWeapons: { w1: 'assault_gun', w2: 'assault_gun', w3: 'light_ac', w4: 'light_ac', m1: 'sabot' },
      installedMods: [],
      currentHp: 4000,
      currentArmor: 500,
    },
    label: '锤头级·改',
    description: '突击驱逐舰 · 高爆实弹 · 前盾',
    shape: { template: 'hammerhead', seed: 99, length: 7, width: 3.5, noseWidth: 2.5, engineWidth: 1.8, wings: 0.1, color: '#ff6644' },
  },
]

interface ShipSelectProps {
  onSelect: (ship: PlayerShip) => void
  onBack: () => void
}

export function ShipSelect({ onSelect, onBack }: ShipSelectProps) {
  const [selected, setSelected] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a1a]">
      <h2 className="text-2xl font-bold text-[var(--color-accent)] mb-2 tracking-wider">
        选择初始舰船
      </h2>
      <p className="text-sm text-[var(--color-text-dim)] mb-8">
        选择一艘舰船开始你的旅程
      </p>

      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-3xl">
        {STARTERS.map((opt, i) => (
          <div
            key={i}
            className={[
              'w-56 cursor-pointer rounded-lg border-2 transition-all p-3',
              selected === i
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                : 'border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] hover:border-[var(--color-text-dim)]',
            ].join(' ')}
            onClick={() => setSelected(i)}
          >
            {/* 3D Preview */}
            <div className="w-full h-36 mb-3 rounded overflow-hidden bg-[#0a0a1a]">
              <Canvas camera={{ position: [0, -5, 6], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 10, 8]} intensity={0.8} />
                <ShipModel shape={opt.shape} scale={1.2} engineGlow rotation={Math.PI / 2} />
              </Canvas>
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {opt.label}
              </div>
              <div className="text-xs text-[var(--color-text-dim)] mt-1">
                {opt.description}
              </div>
              <div className="flex justify-center gap-3 mt-2 text-[10px] text-[var(--color-text-dim)]">
                <span>HP {opt.ship.currentHp}</span>
                <span>甲 {opt.ship.currentArmor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          className="px-6 py-2 border border-[var(--color-panel-border)] text-[var(--color-text-dim)] rounded cursor-pointer hover:border-[var(--color-text)]"
          onClick={onBack}
        >
          返回
        </button>
        <button
          className="px-8 py-2 bg-[var(--color-accent)] text-white rounded font-semibold cursor-pointer hover:brightness-110"
          onClick={() => onSelect(STARTERS[selected].ship)}
        >
          出发
        </button>
      </div>
    </div>
  )
}
