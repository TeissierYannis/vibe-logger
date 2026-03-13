import { Html } from '@react-three/drei'
import type { AgentState } from '../../stores/agentStore'

const STATE_LABELS: Record<AgentState, string> = {
  spawning: 'Spawning...',
  idle: 'Idle',
  reading: 'Reading',
  writing: 'Writing',
  executing: 'Executing',
  searching: 'Searching',
  browsing: 'Browsing',
  despawning: 'Leaving...',
}

const STATE_DOTS: Record<AgentState, string> = {
  spawning: 'bg-yellow-400',
  idle: 'bg-gray-400',
  reading: 'bg-cyan-400',
  writing: 'bg-green-400',
  executing: 'bg-orange-400',
  searching: 'bg-emerald-400',
  browsing: 'bg-blue-400',
  despawning: 'bg-red-400',
}

interface Props {
  tool: string | null
  state: AgentState
  color: string
}

export default function CharacterLabel({ tool, state }: Props) {
  return (
    <Html position={[0, 1.3, 0]} center distanceFactor={8}>
      <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 whitespace-nowrap pointer-events-none select-none">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOTS[state]}`} />
          <span className="text-[10px] font-medium text-gray-200">
            {tool || STATE_LABELS[state]}
          </span>
        </div>
      </div>
    </Html>
  )
}
