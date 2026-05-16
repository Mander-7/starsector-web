import { useMemo } from 'react'
import * as THREE from 'three'
import { generateShipShape } from '../../engine/shipShapeGenerator'
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
  const hullColor = isEnemy ? '#ff4444' : shape.color

  const { outline, bridgeGeo, engineGeos, noseStyle } = useMemo(() => {
    return generateShipShape(shape.template, shape.seed, shape.length, shape.width)
  }, [shape.template, shape.seed, shape.length, shape.width])

  const hullGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(outline, {
      steps: 1,
      depth: 0.35 * scale,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.06,
      bevelSegments: 2,
    })
  }, [outline, scale])

  const engineGlowColor = isEnemy ? '#ff4422' : shape.color
  const bridgeColor = isEnemy ? '#cc2222' : '#334466'

  // Engine positions based on count
  const enginePositions = useMemo(() => {
    const hl = shape.length / 2
    const count = engineGeos.length
    const spacing = shape.width * 0.12
    const positions: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      const x = -hl + 0.25
      const y = (i - (count - 1) / 2) * spacing * 2
      positions.push([x, y, 0.15])
    }
    return positions
  }, [engineGeos.length, shape.length, shape.width])

  return (
    <group position={position} scale={scale} rotation={[0, 0, rotation]}>
      {/* Hull */}
      <mesh geometry={hullGeometry}>
        <meshStandardMaterial color={hullColor} flatShading metalness={0.15} roughness={0.65} />
      </mesh>

      {/* Bridge / cockpit */}
      <mesh position={[shape.length * 0.2, 0, 0.3]} geometry={bridgeGeo}>
        <meshStandardMaterial color={bridgeColor} flatShading />
      </mesh>

      {/* Split bridge: second instance for crescent */}
      {shape.template === 'crescent' && (
        <mesh position={[shape.length * 0.22, shape.width * 0.12, 0.22]}>
          <boxGeometry args={[shape.length * 0.06, shape.width * 0.06, 0.1]} />
          <meshStandardMaterial color={bridgeColor} flatShading />
        </mesh>
      )}

      {/* Panel lines: thin strips on hull surface */}
      <mesh position={[shape.length * 0.1, 0, 0.22]} rotation={[0, 0, 0]}>
        <boxGeometry args={[shape.length * 0.5, 0.04, 0.02]} />
        <meshStandardMaterial color="#000000" flatShading opacity={0.25} transparent />
      </mesh>
      <mesh position={[shape.length * -0.15, shape.width * 0.25, 0.2]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[shape.length * 0.3, 0.03, 0.02]} />
        <meshStandardMaterial color="#000000" flatShading opacity={0.2} transparent />
      </mesh>
      <mesh position={[shape.length * -0.15, -shape.width * 0.25, 0.2]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[shape.length * 0.3, 0.03, 0.02]} />
        <meshStandardMaterial color="#000000" flatShading opacity={0.2} transparent />
      </mesh>

      {/* Engine glows */}
      {engineGlow && enginePositions.map((ep, i) => (
        <mesh key={i} position={ep} geometry={engineGeos[i]}>
          <meshBasicMaterial color={engineGlowColor} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Nose detail for forked nose */}
      {noseStyle === 'forked' && (
        <group>
          <mesh position={[shape.length / 2 - 0.3, shape.width * 0.06, 0.12]}>
            <boxGeometry args={[0.35, 0.04, 0.03]} />
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
          <mesh position={[shape.length / 2 - 0.3, -shape.width * 0.06, 0.12]}>
            <boxGeometry args={[0.35, 0.04, 0.03]} />
            <meshStandardMaterial color={hullColor} flatShading />
          </mesh>
        </group>
      )}
    </group>
  )
}
