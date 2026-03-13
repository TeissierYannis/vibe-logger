import { motion } from 'framer-motion'
import type { Session } from '../api/types'

export function formatDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

export function formatTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

export function formatCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(3)}`
  return `$${n.toFixed(4)}`
}

export default function SessionTable({ sessions, limit = 15 }: { sessions: Session[]; limit?: number }) {
  const sorted = [...sessions].sort((a, b) =>
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Recent Sessions</h3>
        <span className="text-[11px] text-gray-600">{sessions.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-gray-600 uppercase tracking-widest">
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Title</th>
              <th className="text-right px-5 py-3">Duration</th>
              <th className="text-right px-5 py-3">Tokens</th>
              <th className="text-right px-5 py-3">Cost</th>
              <th className="text-right px-5 py-3">Agents</th>
              <th className="text-left px-5 py-3">Branch</th>
              <th className="text-center px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((s, i) => (
              <motion.tr
                key={s.session_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * i }}
                className="border-t border-white/[0.03] hover:bg-white/[0.03] transition-colors duration-200 group"
              >
                <td className="px-5 py-3 text-cyan-400/80 whitespace-nowrap text-xs font-mono">
                  {new Date(s.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-5 py-3 max-w-[200px] truncate text-gray-300 group-hover:text-white transition-colors">
                  {s.title || s.directory_name}
                </td>
                <td className="px-5 py-3 text-right text-green-400/70 font-mono text-xs">{formatDuration(s.duration_seconds)}</td>
                <td className="px-5 py-3 text-right text-yellow-400/70 font-mono text-xs">{formatTokens(s.total_tokens)}</td>
                <td className="px-5 py-3 text-right text-red-400/70 font-mono text-xs">{formatCost(s.total_cost_with_agents ?? s.cost)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">
                  {(s.agent_count ?? 0) > 0 ? (
                    <span className="text-cyan-400">{s.agent_count}</span>
                  ) : (
                    <span className="text-gray-700">-</span>
                  )}
                </td>
                <td className="px-5 py-3 text-purple-400/70 max-w-[100px] truncate text-xs">{s.git_branch || '-'}</td>
                <td className="px-5 py-3 text-center">
                  {s.is_active ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/10 text-gray-600">done</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
