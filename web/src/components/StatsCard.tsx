import { motion } from 'framer-motion'

interface StatsCardProps {
  label: string
  value: string
  icon: string
  color?: string
  subtitle?: string
}

export default function StatsCard({ label, value, icon, color = 'blue', subtitle }: StatsCardProps) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/20',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/20',
    orange: 'from-orange-500/20 to-yellow-500/20 border-orange-500/20',
    red: 'from-red-500/20 to-pink-500/20 border-red-500/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-5 bg-gradient-to-br ${colors[color] || colors.blue} border`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </motion.div>
  )
}
