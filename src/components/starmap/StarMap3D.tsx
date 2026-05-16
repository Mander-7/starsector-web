import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, OrbitControls, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { StarNode } from '../../types'

interface StarNode3DProps {
  node: StarNode
  isCurrent: boolean
  onClick: () => void
}

function StarNode3D({ node, isCurrent, onClick }: StarNode3DProps) {
  const ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color =
    node.type === 'Star'
      ? '#ffaa22'
      : node.type === 'Station'
        ? '#4488ff'
        : node.type === 'Ruin'
          ? '#6644aa'
          : '#888888'

  const size = node.type === 'Star' ? 0.5 : 0.25

  return (
    <group>
      <mesh
        ref={ref}
        position={node.position}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[hovered ? size * 1.4 : size, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isCurrent ? 0.8 : 0.3}
          flatShading
        />
      </mesh>
      {hovered && (
        <Text
          position={[node.position[0], node.position[1] + 0.6, node.position[2]]}
          fontSize={0.3}
          color="white"
          anchorX="center"
        >
          {node.name}
          {node.hasStation ? ' [停靠]' : ''}
        </Text>
      )}
      {/* Glow ring for current system */}
      {isCurrent && (
        <mesh position={node.position}>
          <ringGeometry args={[size * 1.3, size * 1.6, 32]} />
          <meshBasicMaterial color={`var(--color-accent)`} side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

interface StarEdge3DProps {
  from: [number, number, number]
  to: [number, number, number]
}

function StarEdge3D({ from, to }: StarEdge3DProps) {
  return (
    <Line
      points={[from, to]}
      color="#2e2e5a"
      transparent
      opacity={0.4}
      lineWidth={0.5}
    />
  )
}

interface StarMap3DProps {
  nodes: StarNode[]
  edges: { from: string; to: string }[]
  currentNodeId: string
  onNodeClick: (node: StarNode) => void
}

export function StarMap3D({ nodes, edges, currentNodeId, onNodeClick }: StarMap3DProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  return (
    <Canvas camera={{ position: [0, -10, 10], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 5]} intensity={0.5} />

      <Stars radius={30} depth={100} count={800} factor={4} saturation={0} fade speed={0.1} />

      {edges.map((edge, i) => {
        const a = nodeMap.get(edge.from)
        const b = nodeMap.get(edge.to)
        if (!a || !b) return null
        return <StarEdge3D key={i} from={a.position} to={b.position} />
      })}

      {nodes.map((node) => (
        <StarNode3D
          key={node.id}
          node={node}
          isCurrent={node.id === currentNodeId}
          onClick={() => onNodeClick(node)}
        />
      ))}

      <OrbitControls
        enableDamping
        enableZoom
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.5}
      />
    </Canvas>
  )
}
