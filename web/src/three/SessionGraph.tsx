import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'

interface GraphNode {
  id: string
  label: string
  type: 'project' | 'branch' | 'session'
  size: number
  color: string
  position: [number, number, number]
}

interface GraphEdge {
  from: string
  to: string
}

interface Props {
  projects: Record<string, any>
  branches: Record<string, any>
}

function Node({ node, onHover }: { node: GraphNode; onHover: (n: GraphNode | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onPointerEnter={() => { setHovered(true); onHover(node) }}
        onPointerLeave={() => { setHovered(false); onHover(null) }}
      >
        <sphereGeometry args={[node.size, 16, 16]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="glass rounded-lg px-3 py-2 text-xs whitespace-nowrap pointer-events-none">
            <p className="font-bold text-white">{node.label}</p>
            <p className="text-gray-400">{node.type}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

function Edge({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  return (
    <Line
      points={[from, to]}
      color="#ffffff"
      opacity={0.08}
      transparent
      lineWidth={1}
    />
  )
}

function buildGraph(projects: Record<string, any>, branches: Record<string, any>): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  const projectNames = Object.keys(projects)
  const branchNames = Object.keys(branches)

  // Place projects in a ring
  projectNames.forEach((name, i) => {
    const angle = (i / Math.max(projectNames.length, 1)) * Math.PI * 2
    const radius = 4
    const sessions = projects[name]?.total_sessions || 1
    nodes.push({
      id: `p-${name}`,
      label: name,
      type: 'project',
      size: Math.min(0.3 + sessions * 0.05, 1.2),
      color: '#3b82f6',
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
    })
  })

  // Place branches in a second ring
  branchNames.forEach((name, i) => {
    const angle = (i / Math.max(branchNames.length, 1)) * Math.PI * 2 + 0.3
    const radius = 2
    const sessions = branches[name]?.total_sessions || 1
    nodes.push({
      id: `b-${name}`,
      label: name,
      type: 'branch',
      size: Math.min(0.2 + sessions * 0.03, 0.8),
      color: '#a855f7',
      position: [Math.cos(angle) * radius, (Math.random() - 0.5) * 2, Math.sin(angle) * radius],
    })

    // Connect branches to nearest project
    if (projectNames.length > 0) {
      edges.push({ from: `b-${name}`, to: `p-${projectNames[i % projectNames.length]}` })
    }
  })

  return { nodes, edges }
}

export default function SessionGraph({ projects, branches }: Props) {
  const [, setHovered] = useState<GraphNode | null>(null)
  const { nodes, edges } = useMemo(() => buildGraph(projects, branches), [projects, branches])

  const nodeMap = useMemo(() => {
    const m: Record<string, GraphNode> = {}
    nodes.forEach(n => { m[n.id] = n })
    return m
  }, [nodes])

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden glass">
      <Canvas
        camera={{ position: [0, 5, 8], fov: 50 }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault() }, false)
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 10, 5]} intensity={1} color="#00d4ff" />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ec4899" />

        {edges.map((e, i) => {
          const fromNode = nodeMap[e.from]
          const toNode = nodeMap[e.to]
          if (!fromNode || !toNode) return null
          return <Edge key={i} from={fromNode.position} to={toNode.position} />
        })}

        {nodes.map(node => (
          <Node key={node.id} node={node} onHover={setHovered} />
        ))}

        <OrbitControls autoRotate autoRotateSpeed={0.3} enablePan={false} />
      </Canvas>
    </div>
  )
}
