import { useState, useEffect } from 'react'
import ParticleExplosion from '../ParticleExplosion'

interface Props {
  color: string
}

export default function SpawnEffect({ color }: Props) {
  const [active, setActive] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setActive(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!active) return null

  return <ParticleExplosion active={true} color={color} />
}
