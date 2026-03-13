import { useAgentTracker } from '../hooks/useAgentTracker'
import { useSessions } from '../api/client'
import CharacterArena from '../three/CharacterArena'
import { motion, AnimatePresence } from 'framer-motion'

export default function Arena() {
  const { agents, messages, connected, removeAgent } = useAgentTracker()
  const { data: sessions } = useSessions()

  const activeSessions = sessions.filter(s => s.is_active)
  const activeSessionName = activeSessions[0]?.title || activeSessions[0]?.project_name || 'No active session'

  // Last 5 tool calls from live messages
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

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Fullscreen Arena */}
      <CharacterArena
        agents={agents}
        height="100%"
        onRemoveAgent={removeAgent}
      />

      {/* HUD Overlay - Top Left: Agent Count */}
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

      {/* HUD Overlay - Top Right: Session + Connection */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-300 truncate max-w-[200px]">{activeSessionName}</span>
          </div>
        </div>
      </div>

      {/* HUD Overlay - Bottom Center: Recent Tool Calls Ticker */}
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

      {/* Empty state */}
      {agents.length === 0 && (
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
