import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'

// --- Types ---

export type AgentState = 'spawning' | 'idle' | 'reading' | 'writing' | 'executing' | 'searching' | 'browsing' | 'despawning'

export interface AgentCharacter {
  id: string
  sessionId: string
  spawnTime: number
  state: AgentState
  currentTool: string | null
  position: [number, number, number]
  color: string
  completedTools: number
}

// --- Constants ---

const AGENT_COLORS = ['#00d4ff', '#a855f7', '#22c55e', '#ec4899', '#3b82f6', '#6366f1']

const TOOL_STATE_MAP: Record<string, AgentState> = {
  Read: 'reading',
  Glob: 'reading',
  Grep: 'reading',
  Write: 'writing',
  Edit: 'writing',
  NotebookEdit: 'writing',
  Bash: 'executing',
  WebSearch: 'browsing',
  WebFetch: 'browsing',
}

// --- Actions ---

type AgentAction =
  | { type: 'SPAWN_ROOT'; sessionId: string }
  | { type: 'SPAWN_AGENT'; id: string; sessionId: string }
  | { type: 'SET_IDLE'; id: string }
  | { type: 'UPDATE_TOOL'; sessionId: string; toolName: string }
  | { type: 'COMPLETE_AGENT'; id: string }
  | { type: 'REMOVE_AGENT'; id: string }
  | { type: 'REMOVE_SESSION'; sessionId: string }

// --- Helpers ---

function computePosition(index: number, total: number): [number, number, number] {
  if (index === 0) return [0, 0, 1] // root agent slightly forward
  const angle = ((index - 1) / Math.max(total - 1, 1)) * Math.PI - Math.PI / 2
  return [Math.cos(angle) * 3, 0, Math.sin(angle) * 3]
}

function recomputePositions(agents: AgentCharacter[]): AgentCharacter[] {
  return agents.map((a, i) => ({
    ...a,
    position: computePosition(i, agents.length),
  }))
}

// --- Reducer ---

export function agentReducer(state: AgentCharacter[], action: AgentAction): AgentCharacter[] {
  switch (action.type) {
    case 'SPAWN_ROOT': {
      const rootId = `root-${action.sessionId}`
      if (state.find(a => a.id === rootId)) return state
      const next = [
        ...state,
        {
          id: rootId,
          sessionId: action.sessionId,
          spawnTime: Date.now(),
          state: 'spawning' as AgentState,
          currentTool: null,
          position: [0, 0, 1] as [number, number, number],
          color: AGENT_COLORS[0],
          completedTools: 0,
        },
      ]
      return recomputePositions(next)
    }

    case 'SPAWN_AGENT': {
      if (state.find(a => a.id === action.id)) return state
      const sessionAgents = state.filter(a => a.sessionId === action.sessionId)
      const colorIndex = (sessionAgents.length) % AGENT_COLORS.length
      const next = [
        ...state,
        {
          id: action.id,
          sessionId: action.sessionId,
          spawnTime: Date.now(),
          state: 'spawning' as AgentState,
          currentTool: null,
          position: [0, 0, 0] as [number, number, number],
          color: AGENT_COLORS[colorIndex],
          completedTools: 0,
        },
      ]
      return recomputePositions(next)
    }

    case 'SET_IDLE': {
      return state.map(a =>
        a.id === action.id && a.state === 'spawning'
          ? { ...a, state: 'idle' as AgentState }
          : a
      )
    }

    case 'UPDATE_TOOL': {
      const sessionAgents = state.filter(a => a.sessionId === action.sessionId && a.state !== 'despawning')
      const target = sessionAgents[sessionAgents.length - 1]
      if (!target) return state
      const newState = TOOL_STATE_MAP[action.toolName] || 'idle'
      return state.map(a =>
        a.id === target.id
          ? { ...a, state: newState, currentTool: action.toolName, completedTools: a.completedTools + 1 }
          : a
      )
    }

    case 'COMPLETE_AGENT': {
      return state.map(a =>
        a.id === action.id ? { ...a, state: 'despawning' as AgentState } : a
      )
    }

    case 'REMOVE_AGENT': {
      const next = state.filter(a => a.id !== action.id)
      return recomputePositions(next)
    }

    case 'REMOVE_SESSION': {
      const next = state.filter(a => a.sessionId !== action.sessionId)
      return recomputePositions(next)
    }

    default:
      return state
  }
}

// --- Context ---

interface AgentContextValue {
  agents: AgentCharacter[]
  dispatch: Dispatch<AgentAction>
}

const AgentContext = createContext<AgentContextValue>({ agents: [], dispatch: () => {} })

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, dispatch] = useReducer(agentReducer, [])
  return (
    <AgentContext.Provider value={{ agents, dispatch }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgentStore() {
  return useContext(AgentContext)
}
