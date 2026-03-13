import { createContext, useContext, useEffect, useRef, useReducer, useCallback, useState, type ReactNode } from 'react'
import { agentReducer, type AgentCharacter } from '../stores/agentStore'

interface LiveContextValue {
  agents: AgentCharacter[]
  messages: any[]
  connected: boolean
  removeAgent: (id: string) => void
}

const LiveContext = createContext<LiveContextValue>({
  agents: [],
  messages: [],
  connected: false,
  removeAgent: () => {},
})

export function LiveProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const [agents, dispatch] = useReducer(agentReducer, [])
  const processedCount = useRef(0)
  const agentStack = useRef<Map<string, string[]>>(new Map())
  const despawnTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  // Single persistent WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/live`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current === ws) {
          const ws2 = new WebSocket(`${protocol}//${window.location.host}/api/ws/live`)
          wsRef.current = ws2
          ws2.onopen = () => setConnected(true)
          ws2.onclose = () => setConnected(false)
          ws2.onmessage = ws.onmessage
        }
      }, 3000)
    }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages(prev => [...prev.slice(-200), msg])
      } catch {}
    }

    return () => {
      wsRef.current = null
      ws.close()
    }
  }, [])

  // Process messages for agent tracking
  useEffect(() => {
    const newMessages = messages.slice(processedCount.current)
    processedCount.current = messages.length

    for (const wsMsg of newMessages) {
      if (wsMsg.type === 'new_session') {
        const sessionId = wsMsg.session?.session_id || wsMsg.session?.directory_name || 'unknown'
        dispatch({ type: 'SPAWN_ROOT', sessionId })
        agentStack.current.set(sessionId, [`root-${sessionId}`])
      }

      if (wsMsg.type === 'live_message' && wsMsg.message) {
        const msg = wsMsg.message
        const sessionId = wsMsg.session_id || 'unknown'
        const agentName = wsMsg.agent_name

        // Ensure root exists for this session
        if (!agentStack.current.has(sessionId)) {
          dispatch({ type: 'SPAWN_ROOT', sessionId })
          agentStack.current.set(sessionId, [`root-${sessionId}`])
        }

        // If this message is from a sub-agent, spawn it if not already known
        if (agentName) {
          const agentId = `agent-${agentName}`
          const stack = agentStack.current.get(sessionId) || []
          if (!stack.includes(agentId)) {
            dispatch({ type: 'SPAWN_AGENT', id: agentId, sessionId })
            stack.push(agentId)
            agentStack.current.set(sessionId, stack)
          }

          // Update this specific agent's tool state
          if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
              const toolName = tc.name || tc.function?.name
              if (toolName) {
                // Directly update this agent by temporarily making it top of stack
                dispatch({ type: 'UPDATE_TOOL', sessionId, toolName })
              }
            }
          }
          continue
        }

        // Parent session messages
        if (msg.role === 'assistant' && msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            const toolName = tc.name || tc.function?.name
            if (!toolName) continue

            if (toolName === 'Agent') {
              dispatch({ type: 'SPAWN_AGENT', id: tc.id, sessionId })
              const stack = agentStack.current.get(sessionId) || []
              stack.push(tc.id)
              agentStack.current.set(sessionId, stack)
            } else {
              dispatch({ type: 'UPDATE_TOOL', sessionId, toolName })
            }
          }
        }

        if (msg.role === 'tool' && msg.name === 'Agent' && msg.tool_call_id) {
          dispatch({ type: 'COMPLETE_AGENT', id: msg.tool_call_id })
          const stack = agentStack.current.get(sessionId) || []
          const idx = stack.indexOf(msg.tool_call_id)
          if (idx !== -1) stack.splice(idx, 1)
          agentStack.current.set(sessionId, stack)
          const timer = setTimeout(() => {
            dispatch({ type: 'REMOVE_AGENT', id: msg.tool_call_id! })
            despawnTimers.current.delete(msg.tool_call_id!)
          }, 2000)
          despawnTimers.current.set(msg.tool_call_id, timer)
        }
      }
    }
  }, [messages])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      despawnTimers.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const removeAgent = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_AGENT', id })
  }, [])

  return (
    <LiveContext.Provider value={{ agents, messages, connected, removeAgent }}>
      {children}
    </LiveContext.Provider>
  )
}

export function useLiveContext() {
  return useContext(LiveContext)
}
