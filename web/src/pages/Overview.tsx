import { useStats, useSessions } from '../api/client'
import StatsCard from '../components/StatsCard'
import SessionTable from '../components/SessionTable'
import { formatTokens, formatCost, formatDuration } from '../components/SessionTable'
import AmbientParticles from '../three/AmbientParticles'

export default function Overview() {
  const stats = useStats()
  const { data: sessions, loading } = useSessions()

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 animate-pulse text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AmbientParticles />

      <div>
        <h2 className="text-2xl font-bold mb-1">Overview</h2>
        <p className="text-gray-500 text-sm">Your Mistral Vibe coding analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Sessions"
          value={String(stats.total_sessions)}
          icon="🎯"
          color="blue"
        />
        <StatsCard
          label="Total Cost"
          value={formatCost(stats.total_cost)}
          icon="💰"
          color="red"
          subtitle={`avg ${formatCost(stats.avg_cost_per_session)}/session`}
        />
        <StatsCard
          label="Total Tokens"
          value={formatTokens(stats.total_tokens)}
          icon="🔤"
          color="purple"
          subtitle={`${formatTokens(Math.round(stats.avg_tokens_per_session))} avg/session`}
        />
        <StatsCard
          label="Total Duration"
          value={formatDuration(stats.total_duration_seconds)}
          icon="⏱️"
          color="green"
          subtitle={`avg ${formatDuration(stats.avg_duration_per_session)}/session`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          label="Avg Tokens/sec"
          value={stats.avg_tokens_per_second.toFixed(1)}
          icon="⚡"
          color="orange"
        />
        <StatsCard
          label="Tool Calls (OK)"
          value={String(stats.total_tool_calls_succeeded)}
          icon="✅"
          color="green"
        />
        <StatsCard
          label="Total Steps"
          value={String(stats.total_steps)}
          icon="👣"
          color="blue"
        />
      </div>

      <SessionTable sessions={sessions} />
    </div>
  )
}
