import { useLiveContext } from '../hooks/useLiveContext'
import { useSessions } from '../api/client'
import CharacterArena from '../three/CharacterArena'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

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
      initial={{ opacity: 0, x: 20 }}
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

export default function Arena() {
  const { agents, messages, connected, removeAgent } = useLiveContext()
  const { data: sessions } = useSessions()
  const [panelOpen, setPanelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeSessions = sessions.filter(s => s.is_active)
  const activeSessionName = activeSessions[0]?.title || activeSessions[0]?.project_name || 'No active session'
  const liveMessages = messages.filter(m => m.type === 'live_message')
  const latestStats = messages.findLast(m => m.type === 'stats_update')

  // Last 5 tool calls for the ticker
  const recentTools = messages
    .filter(m => m.type === 'live_message' && m.message?.tool_calls?.length > 0)
    .slice(-5)
    .flatMap(m =>
      (m.message.tool_calls || []).map((tc: any) => ({
        name: tc.name || tc.function?.name || 'unknown',
        id: tc.id || Math.random().toString(36),
      }))
    )
    .slice(-5)

  useEffect(() => {
    if (panelOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [liveMessages.length, panelOpen])

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Fullscreen Arena */}
      <CharacterArena
        agents={agents}
        height="100%"
        onRemoveAgent={removeAgent}
      />

      {/* HUD - Top Left: Agent Count */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          key={agents.length}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <span className="text-sm font-bold text-cyan-400">{agents.length}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Agent{agents.length !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-gray-400">
              {agents.filter(a => a.state !== 'idle' && a.state !== 'spawning' && a.state !== 'despawning').length} active
            </p>
          </div>
        </motion.div>
      </div>

      {/* HUD - Top Right: Session + Connection */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-300 truncate max-w-[200px]">{activeSessionName}</span>
          </div>
          {latestStats && (
            <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
              <span>{latestStats.session_count} sessions</span>
              <span className="text-red-400">${latestStats.stats?.total_cost?.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>

      {/* HUD - Bottom Center: Tool Calls Ticker */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex gap-2">
          <AnimatePresence mode="popLayout">
            {recentTools.map((tool) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10"
              >
                <span className="text-[11px] font-mono text-cyan-300">{tool.name}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle Panel Button - Bottom Right */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="absolute bottom-4 right-4 z-20 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 hover:border-cyan-500/40 transition-colors flex items-center gap-2"
      >
        <span className="text-[11px] text-gray-300">{panelOpen ? 'Hide' : 'Messages'}</span>
        <span className="text-xs text-cyan-400">{liveMessages.length}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Slide-out Message Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 right-0 h-full w-96 z-10 bg-black/80 backdrop-blur-xl border-l border-white/10 flex flex-col"
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-300">Live Feed</h3>
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Active Sessions</p>
                <div className="space-y-1.5">
                  {activeSessions.map(s => (
                    <div key={s.session_id} className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium truncate text-gray-200">{s.title || s.directory_name}</p>
                      <p className="text-[10px] text-gray-500">{s.project_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {liveMessages.length === 0 ? (
                <div className="text-center text-gray-600 py-12">
                  <p className="text-2xl mb-2">&#x23F3;</p>
                  <p className="text-sm">Waiting for messages...</p>
                  <p className="text-[10px] mt-1 text-gray-700">Start a Vibe session to see activity</p>
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

            {/* Panel Footer - Stats */}
            <div className="p-3 border-t border-white/5 shrink-0 flex items-center justify-between text-[10px] text-gray-500">
              <span>{messages.length} total messages</span>
              <span>{connected ? 'WebSocket active' : 'Disconnected'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {agents.length === 0 && !panelOpen && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-4xl mb-3">&#x1F3AE;</p>
            <p className="text-gray-400 text-sm">Waiting for agents...</p>
            <p className="text-gray-600 text-xs mt-1">Start a Vibe session to see characters appear</p>
          </motion.div>
        </div>
      )}
    </div>
  )
}
