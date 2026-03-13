import { motion } from 'framer-motion'
import type { Badge } from '../api/types'

export default function BadgeCard({ badge, earned = true, delay = 0 }: { badge: Badge; earned?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: delay * 0.05, type: 'spring', stiffness: 200 }}
      whileHover={earned ? { scale: 1.08, y: -4 } : {}}
      className={`relative rounded-2xl p-4 text-center transition-all duration-300 overflow-hidden ${
        earned
          ? 'glass border border-purple-500/20 cursor-default'
          : 'bg-white/[0.02] border border-white/[0.04] opacity-35 cursor-default'
      }`}
      style={earned ? {
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.1), inset 0 0 20px rgba(168, 85, 247, 0.03)',
      } : undefined}
    >
      {/* Glow pulse for earned badges */}
      {earned && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 animate-pulse-glow" />
      )}

      {/* Lock overlay for unearned */}
      {!earned && (
        <div className="absolute top-2 right-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}

      <div className="relative z-10">
        <div className={`text-3xl mb-2 ${earned ? 'animate-float' : ''}`} style={{ animationDelay: `${delay * 0.2}s` }}>
          {badge.icon}
        </div>
        <p className={`text-xs font-semibold ${earned ? 'text-white' : 'text-gray-600'}`}>{badge.name}</p>
        <p className="text-[10px] text-gray-500 mt-1 leading-tight">{badge.description}</p>
      </div>
    </motion.div>
  )
}
