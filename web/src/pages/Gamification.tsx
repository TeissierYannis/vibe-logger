import { useGamification } from '../api/client'
import BadgeCard from '../components/BadgeCard'
import { motion } from 'framer-motion'
import { formatCost } from '../components/SessionTable'
import { Canvas } from '@react-three/fiber'
import ParticleExplosion from '../three/ParticleExplosion'

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
      </div>
    </div>
  )
}

export default function Gamification() {
  const data = useGamification()

  if (!data) return <div className="text-gray-500 animate-pulse">Loading...</div>

  const player = data.players[0]
  const earnedIds = new Set(player?.badges.map(b => b.id) || [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Gamification</h2>
        <p className="text-gray-500 text-sm">Your coding achievements and stats</p>
      </div>

      {/* Player card */}
      {player && (
        <div className="glass rounded-xl p-6 gradient-border">
          <div className="flex items-center gap-8 flex-wrap">
            <ScoreRing score={player.productivity_score} />

            <div className="space-y-3">
              <h3 className="text-xl font-bold neon-text">{player.username}</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Current Streak</span>
                  <p className="font-semibold">{'🔥'.repeat(Math.min(player.current_streak, 7))} {player.current_streak} days</p>
                </div>
                <div>
                  <span className="text-gray-500">Longest Streak</span>
                  <p className="font-semibold">{player.longest_streak} days</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Sessions</span>
                  <p className="font-semibold">{player.total_sessions}</p>
                </div>
                <div>
                  <span className="text-gray-500">Total Spent</span>
                  <p className="font-semibold">{formatCost(player.total_cost)}</p>
                </div>
              </div>
            </div>

            {/* 3D Particle celebration */}
            {player.badges.length > 5 && (
              <div className="w-32 h-32">
                <Canvas>
                  <ParticleExplosion active color="#a855f7" />
                </Canvas>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Badges grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
          Badges ({player?.badges.length || 0}/{data.total_badges})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.all_badges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
          ))}
        </div>
      </div>

      {/* Leaderboard (if multiple players) */}
      {data.players.length > 1 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-300">Leaderboard</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left p-3">Rank</th>
                <th className="text-left p-3">User</th>
                <th className="text-right p-3">Score</th>
                <th className="text-right p-3">Streak</th>
                <th className="text-right p-3">Sessions</th>
                <th className="text-right p-3">Badges</th>
              </tr>
            </thead>
            <tbody>
              {data.players.map((p, i) => {
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <tr key={p.username} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3">{medals[i] || i + 1}</td>
                    <td className="p-3 text-cyan-400 font-semibold">{p.username}</td>
                    <td className="p-3 text-right text-green-400">{p.productivity_score}</td>
                    <td className="p-3 text-right text-orange-400">{p.current_streak}d</td>
                    <td className="p-3 text-right">{p.total_sessions}</td>
                    <td className="p-3 text-right text-purple-400">{p.badges.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
