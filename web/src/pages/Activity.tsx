import { useTimeline } from '../api/client'
import ActivityTerrain from '../three/ActivityTerrain'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function Activity() {
  const timeline = useTimeline(30)

  const chartData = timeline.map(entry => ({
    date: entry.date.slice(5), // MM-DD
    sessions: entry.total_sessions,
    tokens: Math.round(entry.total_tokens / 1000),
    cost: Number(entry.total_cost.toFixed(4)),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Activity</h2>
        <p className="text-gray-500 text-sm">3D visualization of your coding activity</p>
      </div>

      {/* 3D Terrain */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">3D Activity Terrain</h3>
        <ActivityTerrain data={timeline} />
        <p className="text-xs text-gray-600 mt-2 text-center">Drag to rotate, scroll to zoom</p>
      </div>

      {/* 2D Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Sessions per Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
              <YAxis stroke="#4b5563" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Tokens (K) per Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
              <YAxis stroke="#4b5563" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="tokens" stroke="#a855f7" fill="url(#tokenGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Cost per Day ($)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#4b5563" fontSize={10} />
              <YAxis stroke="#4b5563" fontSize={10} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="url(#costGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
