import { useProjects, useBranches } from '../api/client'
import SessionGraph from '../three/SessionGraph'
import { formatTokens, formatCost } from '../components/SessionTable'

export default function Network() {
  const projects = useProjects()
  const branches = useBranches()

  const hasData = Object.keys(projects).length > 0 || Object.keys(branches).length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Network</h2>
        <p className="text-gray-500 text-sm">3D graph of projects and branches</p>
      </div>

      {hasData ? (
        <>
          <SessionGraph projects={projects} branches={branches} />
          <p className="text-xs text-gray-600 text-center">
            Blue = Projects, Purple = Branches. Drag to rotate, hover for details.
          </p>
        </>
      ) : (
        <div className="glass rounded-xl p-12 text-center text-gray-500">
          No data available
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-300">Projects</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left p-3">Name</th>
                <th className="text-right p-3">Sessions</th>
                <th className="text-right p-3">Tokens</th>
                <th className="text-right p-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(projects)
                .sort(([, a]: any, [, b]: any) => b.total_cost - a.total_cost)
                .map(([name, data]: [string, any]) => (
                  <tr key={name} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-blue-400">{name}</td>
                    <td className="p-3 text-right">{data.total_sessions}</td>
                    <td className="p-3 text-right text-yellow-400">{formatTokens(data.total_tokens)}</td>
                    <td className="p-3 text-right text-red-400">{formatCost(data.total_cost)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Branches table */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-300">Branches</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left p-3">Branch</th>
                <th className="text-right p-3">Sessions</th>
                <th className="text-right p-3">Tokens</th>
                <th className="text-right p-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(branches)
                .sort(([, a]: any, [, b]: any) => b.total_cost - a.total_cost)
                .map(([name, data]: [string, any]) => (
                  <tr key={name} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-purple-400 max-w-[200px] truncate">{name}</td>
                    <td className="p-3 text-right">{data.total_sessions}</td>
                    <td className="p-3 text-right text-yellow-400">{formatTokens(data.total_tokens)}</td>
                    <td className="p-3 text-right text-red-400">{formatCost(data.total_cost)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
