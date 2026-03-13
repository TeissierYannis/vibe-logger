import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import AgentCharacterComponent from './characters/AgentCharacter'
import type { AgentCharacter } from '../stores/agentStore'

// --- Arena Floor ---
function ArenaFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#0a0a1a" transparent opacity={0.6} />
      </mesh>
      <gridHelper args={[12, 12, '#1e293b', '#1e293b']} position={[0, -0.34, 0]} />
    </group>
  )
}

// --- Arena Particles ---
function ArenaParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 200

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + Math.random() * 4
      arr[i * 3] = Math.cos(angle) * radius
      arr[i * 3 + 1] = Math.random() * 5
      arr[i * 3 + 2] = Math.sin(angle) * radius
    }
    return arr
  }, [])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.03} color="#6366f1" transparent opacity={0.25} sizeAttenuation />
    </points>
  )
}

// --- Main Arena ---
interface Props {
  agents: AgentCharacter[]
  height?: string
  onRemoveAgent?: (id: string) => void
}

export default function CharacterArena({ agents, height = '400px', onRemoveAgent }: Props) {
  const handleDespawnComplete = (id: string) => {
    onRemoveAgent?.(id)
  }

  return (
    <div className="w-full rounded-xl overflow-hidden glass" style={{ height }}>
      <Canvas camera={{ position: [0, 4, 8], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 10, 5]} intensity={1} color="#00d4ff" />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#a855f7" />

        <ArenaFloor />
        <ArenaParticles />

        {agents.map((agent) => (
          <AgentCharacterComponent
            key={agent.id}
            agent={agent}
            onDespawnComplete={handleDespawnComplete}
          />
        ))}

        <OrbitControls
          autoRotate
          autoRotateSpeed={0.2}
          enablePan={false}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={15}
        />
      </Canvas>
    </div>
  )
}
