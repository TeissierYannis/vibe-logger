import { createContext, useContext, useEffect, useRef, useReducer, useCallback, useState, type ReactNode } from 'react'
import { agentReducer, type AgentCharacter } from '../stores/agentStore'

interface LiveContextValue {
  agents: AgentCharacter[]
  messages: any[]
  connected: boolean
  spawnComplete: (id: string) => void
  removeAgent: (id: string) => void
}

const LiveContext = createContext<LiveContextValue>({
  agents: [],
  messages: [],
  connected: false,
  spawnComplete: () => {},
  removeAgent: () => {},
})

const AGENT_TOOL_NAMES = new Set(['Agent', 'task'])

export function LiveProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const [agents, dispatch] = useReducer(agentReducer, [])
  const processedCount = useRef(0)
  const agentStack = useRef<Map<string, string[]>>(new Map())
  const despawnTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)
  // Queue of pending Agent tool call IDs per session (parent called Agent but agent_name not yet seen)
  const pendingAgentCalls = useRef<Map<string, string[]>>(new Map())
  // Mapping from "sessionId:agentName" -> spawn ID used in reducer
  const agentNameToId = useRef<Map<string, string>>(new Map())

  // Single persistent WebSocket connection with robust reconnection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/ws/live`
    let closed = false

    function connect() {
      if (closed) return
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        if (!closed) {
          setTimeout(connect, 3000)
        }
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          setMessages(prev => [...prev.slice(-200), msg])
        } catch {}
      }
    }

    connect()

    return () => {
      closed = true
      wsRef.current?.close()
      wsRef.current = null
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

      if (wsMsg.type === 'agent_spawned') {
        const sessionId = wsMsg.session_id || 'unknown'
        const agentDirName = wsMsg.agent_id

        // Ensure root exists
        if (!agentStack.current.has(sessionId)) {
          dispatch({ type: 'SPAWN_ROOT', sessionId })
          agentStack.current.set(sessionId, [`root-${sessionId}`])
        }

        const nameKey = `${sessionId}:${agentDirName}`
        const stack = agentStack.current.get(sessionId) || []

        // Only spawn if not already tracked
        if (!agentNameToId.current.has(nameKey)) {
          // Associate with pending tool call ID if available
          const pending = pendingAgentCalls.current.get(sessionId) || []
          let id = agentDirName
          if (pending.length > 0) {
            id = pending.shift()!
            pendingAgentCalls.current.set(sessionId, pending)
          }
          agentNameToId.current.set(nameKey, id)

          if (!stack.includes(id)) {
            dispatch({ type: 'SPAWN_AGENT', id, sessionId })
            stack.push(id)
            agentStack.current.set(sessionId, stack)
          }
        }
      }

      if (wsMsg.type === 'agent_completed') {
        const sessionId = wsMsg.session_id || 'unknown'
        const agentDirName = wsMsg.agent_id
        const nameKey = `${sessionId}:${agentDirName}`
        const agentId = agentNameToId.current.get(nameKey) || agentDirName

        dispatch({ type: 'COMPLETE_AGENT', id: agentId })
        const stack = agentStack.current.get(sessionId) || []
        const idx = stack.indexOf(agentId)
        if (idx !== -1) stack.splice(idx, 1)
        agentStack.current.set(sessionId, stack)

        if (!despawnTimers.current.has(agentId)) {
          const timer = setTimeout(() => {
            dispatch({ type: 'REMOVE_AGENT', id: agentId })
            despawnTimers.current.delete(agentId)
          }, 2000)
          despawnTimers.current.set(agentId, timer)
        }
        agentNameToId.current.delete(nameKey)
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
          const nameKey = `${sessionId}:${agentName}`
          let agentId = agentNameToId.current.get(nameKey)

          if (!agentId) {
            // Check if there's a pending Agent tool call ID to associate
            const pending = pendingAgentCalls.current.get(sessionId) || []
            if (pending.length > 0) {
              agentId = pending.shift()!
              pendingAgentCalls.current.set(sessionId, pending)
            } else {
              agentId = `agent-${agentName}`
            }
            agentNameToId.current.set(nameKey, agentId)

            const stack = agentStack.current.get(sessionId) || []
            if (!stack.includes(agentId)) {
              dispatch({ type: 'SPAWN_AGENT', id: agentId, sessionId })
              stack.push(agentId)
              agentStack.current.set(sessionId, stack)
            }
          }

          // Update this specific agent's tool state
          if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
              const toolName = tc.name || tc.function?.name
              if (toolName) {
                dispatch({ type: 'UPDATE_TOOL', sessionId, toolName, agentId })
              }
            }
          }
          continue
        }

        // Parent session messages
        const rootId = `root-${sessionId}`

        if (msg.role === 'assistant' && msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            const toolName = tc.name || tc.function?.name
            if (!toolName) continue

            if (AGENT_TOOL_NAMES.has(toolName)) {
              // Spawn the subagent immediately for visual feedback
              dispatch({ type: 'SPAWN_AGENT', id: tc.id, sessionId })
              const stack = agentStack.current.get(sessionId) || []
              stack.push(tc.id)
              agentStack.current.set(sessionId, stack)
              // Queue for matching with agent_name when agent messages arrive
              const pending = pendingAgentCalls.current.get(sessionId) || []
              pending.push(tc.id)
              pendingAgentCalls.current.set(sessionId, pending)
              // Update root to show it's spawning an agent
              dispatch({ type: 'UPDATE_TOOL', sessionId, toolName, agentId: rootId })
            } else {
              dispatch({ type: 'UPDATE_TOOL', sessionId, toolName, agentId: rootId })
            }
          }
        }

        if (msg.role === 'tool' && AGENT_TOOL_NAMES.has(msg.name) && msg.tool_call_id) {
          // Try to find the agent by tool_call_id directly
          const agentId = msg.tool_call_id
          dispatch({ type: 'COMPLETE_AGENT', id: agentId })
          const stack = agentStack.current.get(sessionId) || []
          const idx = stack.indexOf(agentId)
          if (idx !== -1) stack.splice(idx, 1)
          agentStack.current.set(sessionId, stack)
          const timer = setTimeout(() => {
            dispatch({ type: 'REMOVE_AGENT', id: agentId })
            despawnTimers.current.delete(agentId)
          }, 2000)
          despawnTimers.current.set(agentId, timer)
          // Clean up agentNameToId mapping
          for (const [key, id] of agentNameToId.current.entries()) {
            if (id === agentId) {
              agentNameToId.current.delete(key)
              break
            }
          }
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

  const spawnComplete = useCallback((id: string) => {
    dispatch({ type: 'SET_IDLE', id })
  }, [])

  const removeAgent = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_AGENT', id })
  }, [])

  return (
    <LiveContext.Provider value={{ agents, messages, connected, spawnComplete, removeAgent }}>
      {children}
    </LiveContext.Provider>
  )
}

export function useLiveContext() {
  return useContext(LiveContext)
}
