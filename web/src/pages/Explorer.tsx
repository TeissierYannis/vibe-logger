import { useProjects, useBranches } from '../api/client'
import SessionGraph from '../three/SessionGraph'
import { formatTokens, formatCost } from '../components/SessionTable'
import { motion } from 'framer-motion'

function DataTable({ title, data, nameColor }: { title: string; data: Record<string, any>; nameColor: string }) {
  const entries = Object.entries(data).sort(([, a]: any, [, b]: any) => b.total_cost - a.total_cost)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <span className="text-[11px] text-gray-600">{entries.length}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-gray-600 uppercase tracking-widest">
            <th className="text-left px-5 py-3">Name</th>
            <th className="text-right px-5 py-3">Sessions</th>
            <th className="text-right px-5 py-3">Tokens</th>
            <th className="text-right px-5 py-3">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, d]: [string, any]) => (
            <tr key={name} className="border-t border-white/[0.03] hover:bg-white/[0.03] transition-colors">
              <td className={`px-5 py-3 ${nameColor} font-medium max-w-[200px] truncate`}>{name}</td>
              <td className="px-5 py-3 text-right text-gray-400 font-mono text-xs">{d.total_sessions}</td>
              <td className="px-5 py-3 text-right text-yellow-400/70 font-mono text-xs">{formatTokens(d.total_tokens)}</td>
              <td className="px-5 py-3 text-right text-red-400/70 font-mono text-xs">{formatCost(d.total_cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

export default function Explorer() {
  const projects = useProjects()
  const branches = useBranches()

  const hasData = Object.keys(projects).length > 0 || Object.keys(branches).length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="neon-text">Explorer</span>
        </h1>
        <p className="text-gray-600 text-sm mt-1">Projects and branches network</p>
      </motion.div>

      {/* 3D Graph */}
      {hasData ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-1 overflow-hidden">
            <SessionGraph projects={projects} branches={branches} />
            <p className="text-[10px] text-gray-700 text-center pb-2">
              <span className="text-blue-400">Blue</span> = Projects &middot; <span className="text-purple-400">Purple</span> = Branches &middot; Drag to rotate
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="glass rounded-2xl p-16 text-center text-gray-600">
          <p className="text-3xl mb-3">&#x1F50D;</p>
          <p className="text-sm">No project data yet</p>
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataTable title="Projects" data={projects} nameColor="text-blue-400" />
        <DataTable title="Branches" data={branches} nameColor="text-purple-400" />
      </div>
    </div>
  )
}
