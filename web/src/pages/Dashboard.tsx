import { useStats, useSessions, useTimeline } from '../api/client'
import StatsCard from '../components/StatsCard'
import SessionTable, { formatTokens, formatCost, formatDuration } from '../components/SessionTable'
import ActivityTerrain from '../three/ActivityTerrain'
import AmbientParticles from '../three/AmbientParticles'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const tooltipStyle = {
  contentStyle: { background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, backdropFilter: 'blur(12px)' },
  labelStyle: { color: '#9ca3af' },
}

export default function Dashboard() {
  const stats = useStats()
  const { data: sessions, loading } = useSessions()
  const timeline = useTimeline(30)

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 animate-pulse text-sm">Loading dashboard...</div>
      </div>
    )
  }

  const chartData = timeline.map(entry => ({
    date: entry.date.slice(5),
    sessions: entry.total_sessions,
    tokens: Math.round(entry.total_tokens / 1000),
    cost: Number(entry.total_cost.toFixed(4)),
  }))

  return (
    <div className="space-y-6">
      <AmbientParticles />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="neon-text">Dashboard</span>
        </h1>
        <p className="text-gray-600 text-sm mt-1">Your Mistral Vibe coding analytics</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label="Sessions" value={String(stats.total_sessions)} icon="&#x1F3AF;" color="cyan" delay={0} />
        <StatsCard label="Total Cost" value={formatCost(stats.total_cost)} icon="&#x1F4B0;" color="red" delay={1} subtitle={`avg ${formatCost(stats.avg_cost_per_session)}/session`} />
        <StatsCard label="Tokens" value={formatTokens(stats.total_tokens)} icon="&#x26A1;" color="purple" delay={2} subtitle={`${formatTokens(Math.round(stats.avg_tokens_per_session))} avg`} />
        <StatsCard label="Duration" value={formatDuration(stats.total_duration_seconds)} icon="&#x23F1;&#xFE0F;" color="green" delay={3} subtitle={`avg ${formatDuration(stats.avg_duration_per_session)}`} />
      </div>

      {/* 3D Terrain + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* 3D Terrain */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="xl:col-span-3"
        >
          <div className="glass rounded-2xl p-1 overflow-hidden">
            <div className="px-4 pt-3 pb-1">
              <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-medium">Activity Terrain</h3>
            </div>
            <ActivityTerrain data={timeline} />
            <p className="text-[10px] text-gray-700 text-center pb-2">Drag to rotate &middot; Scroll to zoom</p>
          </div>
        </motion.div>

        {/* Mini Charts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 space-y-4"
        >
          {/* Sessions chart */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mb-3">Sessions / Day</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" stroke="#374151" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#374151" fontSize={9} tickLine={false} axisLine={false} width={20} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="sessions" fill="#06b6d4" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens chart */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mb-3">Tokens (K) / Day</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#374151" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#374151" fontSize={9} tickLine={false} axisLine={false} width={20} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="tokens" stroke="#a855f7" fill="url(#tokenGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Sessions */}
      <SessionTable sessions={sessions} limit={10} />
    </div>
  )
}
