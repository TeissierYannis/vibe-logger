import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ParticleExplosion({ active = false, color = '#a855f7' }: { active?: boolean; color?: string }) {
  const ref = useRef<THREE.Points>(null)
  const count = 100
  const velocities = useRef<Float32Array>(new Float32Array(count * 3))
  const startTime = useRef(Date.now())

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const vel = velocities.current
    for (let i = 0; i < count; i++) {
      arr[i * 3] = 0
      arr[i * 3 + 1] = 0
      arr[i * 3 + 2] = 0
      // Random velocity
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = 0.5 + Math.random() * 2
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      vel[i * 3 + 1] = Math.cos(phi) * speed
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!ref.current || !active) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    const vel = velocities.current
    const elapsed = (Date.now() - startTime.current) / 1000

    for (let i = 0; i < count; i++) {
      pos[i * 3] += vel[i * 3] * delta
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta - delta * 0.5 // gravity
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta
    }
    ref.current.geometry.attributes.position.needsUpdate = true

    // Fade out
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = Math.max(0, 1 - elapsed * 0.5)
  })

  if (!active) return null

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.08} color={color} transparent opacity={1} sizeAttenuation />
    </points>
  )
}
