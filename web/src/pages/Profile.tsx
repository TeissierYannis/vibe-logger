import { useGamification } from '../api/client'
import BadgeCard from '../components/BadgeCard'
import { formatCost } from '../components/SessionTable'
import { motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import ParticleExplosion from '../three/ParticleExplosion'

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-widest">Score</span>
      </div>
    </div>
  )
}

function StatItem({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  )
}

export default function Profile() {
  const data = useGamification()

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 animate-pulse text-sm">Loading profile...</div>
      </div>
    )
  }

  const player = data.players[0]
  const earnedIds = new Set(player?.badges.map(b => b.id) || [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="neon-text">Profile</span>
        </h1>
        <p className="text-gray-600 text-sm mt-1">Achievements and stats</p>
      </motion.div>

      {/* Player Card */}
      {player && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 neon-glow"
        >
          <div className="flex items-center gap-8 flex-wrap">
            <ScoreRing score={player.productivity_score} />

            <div className="flex-1 min-w-[200px]">
              <h2 className="text-xl font-bold neon-text mb-4">{player.username}</h2>
              <div className="flex gap-6 flex-wrap">
                <StatItem
                  label="Streak"
                  value={`${player.current_streak}d`}
                  color="text-orange-400"
                />
                <StatItem
                  label="Best Streak"
                  value={`${player.longest_streak}d`}
                  color="text-yellow-400"
                />
                <StatItem
                  label="Sessions"
                  value={String(player.total_sessions)}
                  color="text-cyan-400"
                />
                <StatItem
                  label="Spent"
                  value={formatCost(player.total_cost)}
                  color="text-red-400"
                />
                <StatItem
                  label="Badges"
                  value={`${player.badges.length}/${data.total_badges}`}
                  color="text-purple-400"
                />
              </div>
            </div>

            {/* Particle celebration */}
            {player.badges.length > 5 && (
              <div className="w-28 h-28 shrink-0">
                <Canvas>
                  <ParticleExplosion active color="#a855f7" />
                </Canvas>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Badges Grid */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">
            Badges
          </h3>
          <span className="text-[11px] text-gray-600">
            {player?.badges.length || 0} / {data.total_badges} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {data.all_badges.map((badge, i) => (
            <BadgeCard key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} delay={i} />
          ))}
        </div>
      </motion.div>

      {/* Leaderboard */}
      {data.players.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-300">Leaderboard</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-gray-600 uppercase tracking-widest">
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-5 py-3">User</th>
                <th className="text-right px-5 py-3">Score</th>
                <th className="text-right px-5 py-3">Streak</th>
                <th className="text-right px-5 py-3">Sessions</th>
                <th className="text-right px-5 py-3">Badges</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p, i) => {
                const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']
                return (
                  <tr key={p.username} className="border-t border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 text-lg">{medals[i] || `#${i + 1}`}</td>
                    <td className="px-5 py-3 text-cyan-400 font-semibold">{p.username}</td>
                    <td className="px-5 py-3 text-right text-green-400 font-mono">{p.productivity_score}</td>
                    <td className="px-5 py-3 text-right text-orange-400 font-mono">{p.current_streak}d</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400">{p.total_sessions}</td>
                    <td className="px-5 py-3 text-right text-purple-400 font-mono">{p.badges.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}
