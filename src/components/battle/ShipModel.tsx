import { useMemo } from 'react'
import * as THREE from 'three'
import type { HullShapeParams } from '../../types'

interface ShipModelProps {
  shape: HullShapeParams
  position?: [number, number, number]
  rotation?: number
  scale?: number
  engineGlow?: boolean
  isEnemy?: boolean
}

export function ShipModel({
  shape,
  position = [0, 0, 0],
  rotation = 0,
  scale = 1,
  engineGlow = true,
  isEnemy = false,
}: ShipModelProps) {
  const color = isEnemy ? '#ff4444' : shape.color

  const hullGeometry = useMemo(() => {
    const { length, width, noseWidth, engineWidth, wings } = shape
    const hl = length / 2
    const hw = width / 2
    const nw = (noseWidth / 2) || hw * 0.3
    const ew = (engineWidth / 2) || hw * 0.7

    const outline = new THREE.Shape()
    // Nose
    outline.moveTo(hl, 0)
    // Nose → widest shoulder (noseWidth controls shoulder taper)
    outline.lineTo(hl * 0.7, nw)
    outline.lineTo(hl * 0.3, hw)
    // Mid section
    outline.lineTo(-hl * 0.1, hw)
    // Wing (if any)
    if (wings > 0) {
      outline.lineTo(-hl * 0.05, hw * (1 + wings * 0.3))
      outline.lineTo(-hl * 0.35, hw * (1 + wings * 0.25))
    }
    // Engine housing
    outline.lineTo(-hl * 0.4, ew)
    outline.lineTo(-hl * 0.75, ew)
    // Engine exhaust
    outline.lineTo(-hl * 0.9, ew * 0.6)
    outline.lineTo(-hl, ew * 0.3)
    // Bottom half (symmetric)
    outline.lineTo(-hl, -ew * 0.3)
    outline.lineTo(-hl * 0.9, -ew * 0.6)
    outline.lineTo(-hl * 0.75, -ew)
    outline.lineTo(-hl * 0.4, -ew)
    if (wings > 0) {
      outline.lineTo(-hl * 0.35, -hw * (1 + wings * 0.25))
      outline.lineTo(-hl * 0.05, -hw * (1 + wings * 0.3))
    }
    outline.lineTo(-hl * 0.1, -hw)
    outline.lineTo(hl * 0.3, -hw)
    outline.lineTo(hl * 0.7, -hw * 0.4)
    outline.closePath()

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 0.35 * scale,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.06,
      bevelSegments: 2,
    }
    return new THREE.ExtrudeGeometry(outline, extrudeSettings)
  }, [shape, scale])

  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#44ddff', transparent: true, opacity: 0.5 }),
    [],
  )

  const engineWidth2 = ((shape.engineWidth || shape.width * 0.7) / 2)

  return (
    <group position={position} scale={scale} rotation={[0, 0, rotation]}>
      {/* Hull */}
      <mesh geometry={hullGeometry}>
        <meshStandardMaterial color={color} flatShading metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Cockpit / bridge bump */}
      <mesh position={[shape.length * 0.25, 0, 0.3]}>
        <boxGeometry args={[shape.length * 0.12, shape.width * 0.2, 0.12]} />
        <meshStandardMaterial color={isEnemy ? '#cc2222' : '#334466'} flatShading />
      </mesh>

      {/* Engine glow */}
      {engineGlow && (
        <mesh position={[-shape.length / 2 + 0.15, 0, 0.15]} material={glowMat}>
          <boxGeometry args={[0.25, engineWidth2 * 0.4, 0.18]} />
        </mesh>
      )}
    </group>
  )
}
