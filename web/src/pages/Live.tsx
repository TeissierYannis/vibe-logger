import { useWebSocket, useSessions } from '../api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'

function MessageBubble({ msg }: { msg: any }) {
  const roleColors: Record<string, { border: string; title: string; bg: string }> = {
    user: { border: 'border-blue-500/30', title: 'text-blue-400', bg: 'bg-blue-500/5' },
    assistant: { border: 'border-green-500/30', title: 'text-green-400', bg: 'bg-green-500/5' },
    tool: { border: 'border-yellow-500/30', title: 'text-yellow-400', bg: 'bg-yellow-500/5' },
  }
  const style = roleColors[msg.role] || roleColors.user
  const content = msg.content || ''

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border p-3 ${style.border} ${style.bg}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold uppercase ${style.title}`}>{msg.role}</span>
        {msg.name && <span className="text-xs text-gray-500">({msg.name})</span>}
      </div>
      {msg.tool_calls?.map((tc: any, i: number) => (
        <div key={i} className="text-xs text-yellow-300 mb-1">
          <span className="font-mono">{tc.name || tc.function?.name}</span>
        </div>
      ))}
      {content && (
        <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
          {content.slice(0, 500)}{content.length > 500 ? '...' : ''}
        </p>
      )}
    </motion.div>
  )
}

export default function Live() {
  const { messages, connected } = useWebSocket()
  const { data: sessions } = useSessions()
  const bottomRef = useRef<HTMLDivElement>(null)

  const liveMessages = messages.filter(m => m.type === 'live_message')
  const latestStats = messages.findLast(m => m.type === 'stats_update')
  const activeSessions = sessions.filter(s => s.is_active)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveMessages.length])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Live</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          connected ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-red-500/20 text-red-400'
        }`}>
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live message feed */}
        <div className="lg:col-span-2 glass rounded-xl flex flex-col" style={{ maxHeight: '70vh' }}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Live Messages</h3>
            <span className="text-xs text-gray-500">{liveMessages.length} messages</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {liveMessages.length === 0 ? (
              <div className="text-center text-gray-600 py-12">
                <p className="text-3xl mb-3">⏳</p>
                <p>Waiting for live messages...</p>
                <p className="text-xs mt-1">Start a Vibe session to see messages appear here</p>
              </div>
            ) : (
              <AnimatePresence>
                {liveMessages.map((m, i) => (
                  <MessageBubble key={i} msg={m.message} />
                ))}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Active sessions */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Active Sessions</h3>
            {activeSessions.length === 0 ? (
              <p className="text-gray-600 text-sm">No active sessions</p>
            ) : (
              <div className="space-y-2">
                {activeSessions.map(s => (
                  <div key={s.session_id} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm font-medium truncate">{s.title || s.directory_name}</p>
                    <p className="text-xs text-gray-500">{s.project_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live stats */}
          {latestStats && (
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Global Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sessions</span>
                  <span>{latestStats.session_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Tokens</span>
                  <span className="text-yellow-400">
                    {latestStats.stats.total_tokens >= 1000
                      ? `${(latestStats.stats.total_tokens / 1000).toFixed(1)}K`
                      : latestStats.stats.total_tokens}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Cost</span>
                  <span className="text-red-400">${latestStats.stats.total_cost.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Connection info */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Connection</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">WebSocket</span>
                <span className={connected ? 'text-green-400' : 'text-red-400'}>
                  {connected ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Messages received</span>
                <span>{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
