import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AgentCharacter as AgentData, AgentState } from '../../stores/agentStore'
import CharacterLabel from './CharacterLabel'
import SpawnEffect from './SpawnEffect'

interface Props {
  agent: AgentData
  onSpawnComplete: (id: string) => void
  onDespawnComplete: (id: string) => void
}

export default function AgentCharacter({ agent, onSpawnComplete, onDespawnComplete }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const bodyRef = useRef<THREE.Mesh>(null)

  // Animation state refs
  const spawnProgress = useRef(0)
  const spawnCompleted = useRef(false)
  const despawnProgress = useRef(0)
  const prevState = useRef<AgentState>(agent.state)
  const transitionRef = useRef(1)
  const timeRef = useRef(0)
  const showSpawnEffect = useRef(agent.state === 'spawning')

  // Prop geometry refs
  const propRef = useRef<THREE.Mesh>(null)
  const gearRef = useRef<THREE.Mesh>(null)

  const color = useMemo(() => new THREE.Color(agent.color), [agent.color])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    timeRef.current += delta
    const t = timeRef.current

    // State transition tracking
    if (agent.state !== prevState.current) {
      prevState.current = agent.state
      transitionRef.current = 0
    }
    transitionRef.current = Math.min(1, transitionRef.current + delta / 0.3)

    // --- Spawning ---
    if (agent.state === 'spawning') {
      spawnProgress.current = Math.min(1, spawnProgress.current + delta * 2)
      const p = spawnProgress.current
      // Overshoot curve: goes to 1.1 at 80%, settles to 1.0
      const scale = p < 0.8
        ? p / 0.8 * 1.1
        : 1.1 - (p - 0.8) / 0.2 * 0.1
      groupRef.current.scale.setScalar(scale)
      if (p >= 1 && !spawnCompleted.current) {
        spawnCompleted.current = true
        onSpawnComplete(agent.id)
      }
      return
    }

    // --- Despawning ---
    if (agent.state === 'despawning') {
      despawnProgress.current = Math.min(1, despawnProgress.current + delta * 1.25)
      const scale = 1 - despawnProgress.current
      groupRef.current.scale.setScalar(Math.max(0, scale))
      // Fade materials
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = Math.max(0, scale)
        }
      })
      if (despawnProgress.current >= 1) {
        onDespawnComplete(agent.id)
      }
      return
    }

    // Ensure full scale after spawn
    groupRef.current.scale.setScalar(1)

    // --- Idle base animation (always running) ---
    const bobY = Math.sin(t * Math.PI) * 0.1
    groupRef.current.position.y = bobY

    // --- State-specific animations ---
    switch (agent.state) {
      case 'idle': {
        groupRef.current.rotation.y = t * 0.3
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 1.5) * 0.1
        if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.1
        if (headRef.current) headRef.current.rotation.x = 0
        if (propRef.current) propRef.current.visible = false
        if (gearRef.current) gearRef.current.visible = false
        break
      }

      case 'reading': {
        groupRef.current.rotation.y = 0
        // Head tilts down
        if (headRef.current) headRef.current.rotation.x = 0.25
        // Arms forward
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8
        // Show document prop
        if (propRef.current) {
          propRef.current.visible = true
          propRef.current.position.set(0, 0.3, -0.7)
          propRef.current.rotation.set(0.3, 0, 0)
          const mat = propRef.current.material as THREE.MeshStandardMaterial
          mat.color.set('#00d4ff')
          mat.emissive.set('#00d4ff')
          mat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.1
        }
        if (gearRef.current) gearRef.current.visible = false
        break
      }

      case 'writing': {
        groupRef.current.rotation.y = 0
        if (headRef.current) headRef.current.rotation.x = 0.15
        // Rapid arm typing oscillation
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.6 + Math.sin(t * 15) * 0.15
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6 + Math.sin(t * 15 + 2) * 0.15
        // Body leans forward
        if (bodyRef.current) bodyRef.current.rotation.x = -0.08
        if (propRef.current) propRef.current.visible = false
        if (gearRef.current) gearRef.current.visible = false
        break
      }

      case 'executing': {
        // Jitter
        groupRef.current.position.x = (Math.random() - 0.5) * 0.04
        groupRef.current.position.z = (Math.random() - 0.5) * 0.04
        // Arms raised
        if (leftArmRef.current) leftArmRef.current.rotation.x = -1.2
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.2
        if (headRef.current) headRef.current.rotation.x = 0
        // Show gear orbiting
        if (gearRef.current) {
          gearRef.current.visible = true
          gearRef.current.position.set(Math.cos(t * 3) * 0.8, 0.5, Math.sin(t * 3) * 0.8)
          gearRef.current.rotation.set(t * 2, t * 3, 0)
        }
        if (propRef.current) propRef.current.visible = false
        break
      }

      case 'searching': {
        // Scan left-right
        groupRef.current.rotation.y = Math.sin(t * 1.5) * 0.8
        if (headRef.current) headRef.current.rotation.x = 0
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.4
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.4
        // Show magnifying glass (torus)
        if (propRef.current) {
          propRef.current.visible = true
          propRef.current.position.set(0.5, 0.5, -0.4)
          propRef.current.rotation.set(0, 0, 0.3)
          const mat = propRef.current.material as THREE.MeshStandardMaterial
          mat.color.set('#22c55e')
          mat.emissive.set('#22c55e')
          mat.emissiveIntensity = 0.4
        }
        if (gearRef.current) gearRef.current.visible = false
        break
      }

      case 'browsing': {
        groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.3
        if (headRef.current) headRef.current.rotation.x = 0.1
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.5
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.5
        // Show screen prop
        if (propRef.current) {
          propRef.current.visible = true
          propRef.current.position.set(0, 0.4, -0.6)
          propRef.current.rotation.set(0, 0, 0)
          const mat = propRef.current.material as THREE.MeshStandardMaterial
          mat.color.set('#3b82f6')
          mat.emissive.set('#3b82f6')
          mat.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.15
        }
        if (gearRef.current) gearRef.current.visible = false
        break
      }
    }
  })

  return (
    <group position={agent.position}>
      <group ref={groupRef}>
        {/* Head */}
        <mesh ref={headRef} position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.15}
            transparent
            opacity={1}
          />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.08, 0.78, -0.22]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.08, 0.78, -0.22]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.8} />
        </mesh>

        {/* Body */}
        <mesh ref={bodyRef} position={[0, 0.25, 0]}>
          <boxGeometry args={[0.4, 0.5, 0.3]} />
          <meshStandardMaterial
            color={new THREE.Color(agent.color).multiplyScalar(0.7)}
            emissive={color}
            emissiveIntensity={0.05}
            transparent
            opacity={1}
          />
        </mesh>

        {/* Left Arm */}
        <mesh ref={leftArmRef} position={[-0.3, 0.35, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial
            color={new THREE.Color(agent.color).multiplyScalar(0.8)}
            transparent
            opacity={1}
          />
        </mesh>

        {/* Right Arm */}
        <mesh ref={rightArmRef} position={[0.3, 0.35, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshStandardMaterial
            color={new THREE.Color(agent.color).multiplyScalar(0.8)}
            transparent
            opacity={1}
          />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.1, -0.15, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={1} />
        </mesh>
        <mesh position={[0.1, -0.15, 0]}>
          <boxGeometry args={[0.12, 0.3, 0.12]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={1} />
        </mesh>

        {/* Action Props */}
        {/* Document/Screen prop (plane) */}
        <mesh ref={propRef} visible={false}>
          <planeGeometry args={[0.4, 0.3]} />
          <meshStandardMaterial
            color="#00d4ff"
            emissive="#00d4ff"
            emissiveIntensity={0.3}
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Gear prop (torus) */}
        <mesh ref={gearRef} visible={false}>
          <torusGeometry args={[0.15, 0.04, 8, 6]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.5}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Label */}
        <CharacterLabel tool={agent.currentTool} state={agent.state} color={agent.color} />
      </group>

      {/* Spawn particle effect */}
      {showSpawnEffect.current && (
        <SpawnEffect color={agent.color} />
      )}
    </group>
  )
}
