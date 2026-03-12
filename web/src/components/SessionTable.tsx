import type { Session } from '../api/types'

function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

function formatTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function formatCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

export default function SessionTable({ sessions }: { sessions: Session[] }) {
  const sorted = [...sessions].sort((a, b) =>
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-gray-300">Recent Sessions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Title</th>
              <th className="text-right p-3">Duration</th>
              <th className="text-right p-3">Tokens</th>
              <th className="text-right p-3">Cost</th>
              <th className="text-left p-3">Branch</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 20).map((s) => (
              <tr key={s.session_id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="p-3 text-cyan-400 whitespace-nowrap">
                  {new Date(s.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3 max-w-xs truncate">{s.title || '(no title)'}</td>
                <td className="p-3 text-right text-green-400">{formatDuration(s.duration_seconds)}</td>
                <td className="p-3 text-right text-yellow-400">{formatTokens(s.total_tokens)}</td>
                <td className="p-3 text-right text-red-400">{formatCost(s.cost)}</td>
                <td className="p-3 text-purple-400 max-w-[120px] truncate">{s.git_branch || '-'}</td>
                <td className="p-3">
                  {s.is_active ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 animate-pulse">LIVE</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-500">done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { formatDuration, formatTokens, formatCost }
