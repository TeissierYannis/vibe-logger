import { useEffect, useRef, useReducer, useCallback } from 'react'
import { useWebSocket } from '../api/client'
import { agentReducer } from '../stores/agentStore'

export function useAgentTracker() {
  const { messages, connected } = useWebSocket()
  const [agents, dispatch] = useReducer(agentReducer, [])
  const processedCount = useRef(0)
  const agentStack = useRef<Map<string, string[]>>(new Map()) // sessionId -> stack of agent IDs
  const despawnTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    // Process only new messages
    const newMessages = messages.slice(processedCount.current)
    processedCount.current = messages.length

    for (const wsMsg of newMessages) {
      if (wsMsg.type === 'new_session') {
        const sessionId = wsMsg.session?.session_id || wsMsg.session?.directory_name || 'unknown'
        dispatch({ type: 'SPAWN_ROOT', sessionId })
        // Auto-transition root from spawning to idle after 0.5s
        setTimeout(() => {
          // The root agent should auto-transition via the animation, but we set idle state
          // This is handled in the component via useFrame
        }, 600)
        // Initialize agent stack
        agentStack.current.set(sessionId, [`root-${sessionId}`])
      }

      if (wsMsg.type === 'live_message' && wsMsg.message) {
        const msg = wsMsg.message
        const sessionId = wsMsg.session_id || 'unknown'

        // Ensure root exists for this session
        if (!agentStack.current.has(sessionId)) {
          dispatch({ type: 'SPAWN_ROOT', sessionId })
          agentStack.current.set(sessionId, [`root-${sessionId}`])
        }

        if (msg.role === 'assistant' && msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            const toolName = tc.name || tc.function?.name
            if (!toolName) continue

            if (toolName === 'Agent') {
              // Spawn a new sub-agent character
              dispatch({ type: 'SPAWN_AGENT', id: tc.id, sessionId })
              const stack = agentStack.current.get(sessionId) || []
              stack.push(tc.id)
              agentStack.current.set(sessionId, stack)
            } else {
              // Update the current top-of-stack agent with tool activity
              dispatch({ type: 'UPDATE_TOOL', sessionId, toolName })
            }
          }
        }

        if (msg.role === 'tool' && msg.name === 'Agent' && msg.tool_call_id) {
          // Agent tool call completed - find and despawn the matching agent
          dispatch({ type: 'COMPLETE_AGENT', id: msg.tool_call_id })
          // Remove from stack
          const stack = agentStack.current.get(sessionId) || []
          const idx = stack.indexOf(msg.tool_call_id)
          if (idx !== -1) stack.splice(idx, 1)
          agentStack.current.set(sessionId, stack)
          // Schedule removal after despawn animation
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

  return { agents, messages, connected, removeAgent }
}
