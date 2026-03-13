import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { TimelineEntry } from '../api/types'

function Bar({ position, height, color }: { position: [number, number, number]; height: number; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <mesh ref={meshRef} position={[position[0], height / 2, position[2]]}>
      <boxGeometry args={[0.7, height, 0.7]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

function TerrainGrid({ data }: { data: TimelineEntry[] }) {
  const bars = useMemo(() => {
    if (!data.length) return []
    const maxSessions = Math.max(...data.map(d => d.total_sessions), 1)

    return data.map((entry, i) => {
      const height = (entry.total_sessions / maxSessions) * 5 + 0.1
      const ratio = entry.total_sessions / maxSessions
      const color = ratio > 0.7 ? '#22c55e' : ratio > 0.3 ? '#3b82f6' : ratio > 0 ? '#6366f1' : '#1e1b4b'

      // Arrange in a grid: 7 columns (days of week) x N rows
      const col = i % 7
      const row = Math.floor(i / 7)

      return {
        key: entry.date,
        position: [col * 1.1 - 3.3, 0, row * 1.1 - 2] as [number, number, number],
        height,
        color,
      }
    })
  }, [data])

  return (
    <group>
      {bars.map(bar => (
        <Bar key={bar.key} position={bar.position} height={bar.height} color={bar.color} />
      ))}
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#0a0a1a" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 200

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = Math.random() * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02
    }
  })

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.03} color="#6366f1" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

export default function ActivityTerrain({ data }: { data: TimelineEntry[] }) {
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden glass">
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault() }, false)
        }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#a855f7" />
        <TerrainGrid data={data} />
        <FloatingParticles />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}
