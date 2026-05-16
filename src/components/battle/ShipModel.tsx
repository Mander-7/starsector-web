import { useMemo, useRef } from 'react'
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
  const meshRef = useRef<THREE.Group>(null)

  const color = isEnemy ? '#ff4444' : shape.color

  const hullGeometry = useMemo(() => {
    const { length, width, engineWidth } = shape
    const hw = width / 2
    const hl = length / 2
    const ew = engineWidth / 2

    // 2D outline → extrude for 3D
    const outline = new THREE.Shape()
    outline.moveTo(hl, 0)           // nose
    outline.lineTo(hl * 0.4, hw)   // widest point → nose
    outline.lineTo(-hl * 0.6, ew)   // engine
    outline.lineTo(-hl * 0.8, hw * 0.3) // engine tip top
    outline.lineTo(-hl, hw * 0.4)  // engine exhaust top
    outline.lineTo(-hl, -hw * 0.4) // engine exhaust bottom
    outline.lineTo(-hl * 0.8, -hw * 0.3) // engine tip bottom
    outline.lineTo(-hl * 0.6, -ew)
    outline.lineTo(hl * 0.4, -hw)
    outline.closePath()

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 0.3 * scale,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 1,
    }
    return new THREE.ExtrudeGeometry(outline, extrudeSettings)
  }, [shape, scale])

  // Engine glow material
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#44ddff', transparent: true, opacity: 0.4 }),
    [],
  )

  const engineGeo = useMemo(() => new THREE.BoxGeometry(0.3, (shape.width / 2) * 0.5, 0.2), [shape])

  if (meshRef.current) {
    meshRef.current.rotation.z = rotation
  }

  return (
    <group ref={meshRef} position={position} scale={scale} rotation={[0, 0, rotation]}>
      {/* Hull */}
      <mesh geometry={hullGeometry}>
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* Engine glow */}
      {engineGlow && (
        <mesh geometry={engineGeo} position={[-shape.length / 2 + 0.2, 0, 0.15]} material={glowMat} />
      )}
    </group>
  )
}
