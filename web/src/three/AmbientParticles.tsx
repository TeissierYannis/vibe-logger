import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles() {
  const ref = useRef<THREE.Points>(null)
  const elapsed = useRef(0)
  const count = 500

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      elapsed.current += delta
      ref.current.rotation.y = elapsed.current * 0.01
      ref.current.rotation.x = Math.sin(elapsed.current * 0.005) * 0.1
    }
  })

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.04} color="#6366f1" transparent opacity={0.4} sizeAttenuation />
    </points>
  )
}

export default function AmbientParticles() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ powerPreference: 'low-power', antialias: false, alpha: true }}
        frameloop="always"
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault() }, false)
        }}
      >
        <Particles />
      </Canvas>
    </div>
  )
}
