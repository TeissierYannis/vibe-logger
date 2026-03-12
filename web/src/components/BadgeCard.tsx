import { motion } from 'framer-motion'
import type { Badge } from '../api/types'

export default function BadgeCard({ badge, earned = true }: { badge: Badge; earned?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`rounded-xl p-4 text-center transition-all duration-300 ${
        earned
          ? 'glass badge-glow border border-purple-500/30'
          : 'bg-gray-900/50 border border-white/5 opacity-40'
      }`}
    >
      <div className="text-3xl mb-2">{badge.icon}</div>
      <p className={`text-sm font-semibold ${earned ? 'text-white' : 'text-gray-600'}`}>{badge.name}</p>
      <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
    </motion.div>
  )
}
