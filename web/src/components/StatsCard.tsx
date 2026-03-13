import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface StatsCardProps {
  label: string
  value: string
  icon: string
  color?: string
  subtitle?: string
  delay?: number
}

function useCountUp(target: string, duration = 1200) {
  const [display, setDisplay] = useState('0')
  const ref = useRef<number>(0)

  useEffect(() => {
    const num = parseFloat(target.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) {
      setDisplay(target)
      return
    }

    const prefix = target.match(/^[^0-9]*/)?.[0] || ''
    const suffix = target.match(/[^0-9.]*$/)?.[0] || ''
    const hasDecimal = target.includes('.')
    const decimals = hasDecimal ? (target.split('.')[1]?.replace(/[^0-9]/g, '').length || 0) : 0

    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = num * eased
      setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`)
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])

  return display
}

const colorMap: Record<string, { gradient: string; glow: string; iconBg: string }> = {
  blue: {
    gradient: 'from-blue-500/10 to-cyan-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    iconBg: 'bg-blue-500/15 text-blue-400',
  },
  green: {
    gradient: 'from-green-500/10 to-emerald-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    iconBg: 'bg-green-500/15 text-green-400',
  },
  purple: {
    gradient: 'from-purple-500/10 to-pink-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    iconBg: 'bg-purple-500/15 text-purple-400',
  },
  orange: {
    gradient: 'from-orange-500/10 to-yellow-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    iconBg: 'bg-orange-500/15 text-orange-400',
  },
  red: {
    gradient: 'from-red-500/10 to-pink-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    iconBg: 'bg-red-500/15 text-red-400',
  },
  cyan: {
    gradient: 'from-cyan-500/10 to-blue-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    iconBg: 'bg-cyan-500/15 text-cyan-400',
  },
}

export default function StatsCard({ label, value, icon, color = 'cyan', subtitle, delay = 0 }: StatsCardProps) {
  const style = colorMap[color] || colorMap.cyan
  const animatedValue = useCountUp(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`glass rounded-2xl p-5 bg-gradient-to-br ${style.gradient} border border-white/5 ${style.glow} transition-shadow duration-300 cursor-default`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{animatedValue}</p>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center text-lg`}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
