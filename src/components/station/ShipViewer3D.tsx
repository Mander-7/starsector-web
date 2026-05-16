import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ShipModel } from '../battle/ShipModel'
import type { HullShapeParams } from '../../types'

interface ShipViewer3DProps {
  shape: HullShapeParams
}

export function ShipViewer3D({ shape }: ShipViewer3DProps) {
  return (
    <Canvas camera={{ position: [0, -6, 8], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 10]} intensity={1} />
      <directionalLight position={[-3, -2, 5]} intensity={0.4} />

      <ShipModel shape={shape} scale={1.5} engineGlow />

      <OrbitControls
        enableDamping
        enableZoom
        enablePan={false}
        minDistance={4}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  )
}
