# vibe-logger Web Dashboard

3D web dashboard for vibe-logger, built with React + Three.js.

## Setup

```bash
npm install
```

## Development

Start the Vite dev server with HMR (proxies API calls to the backend):

```bash
npm run dev
```

In a separate terminal, start the FastAPI backend:

```bash
vibe-logger web --no-open --dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:8765`.

## Build

```bash
npm run build
```

Output goes to `dist/`. The FastAPI server serves these files in production mode.

## Architecture

```
src/
├── pages/              # Dashboard pages
│   ├── Overview.tsx    # Stats cards grid
│   ├── Activity.tsx    # 3D terrain + timeline charts
│   ├── Network.tsx     # 3D project/branch graph
│   ├── Gamification.tsx # Badges, scores, leaderboard
│   ├── Live.tsx        # Real-time message feed + agent arena
│   └── Arena.tsx       # Fullscreen 3D agent arena with HUD
├── three/              # Three.js 3D components
│   ├── ActivityTerrain.tsx    # 3D bar terrain by date
│   ├── SessionGraph.tsx       # Force-directed network graph
│   ├── AmbientParticles.tsx   # Background particle cloud
│   ├── ParticleExplosion.tsx  # Burst particle effect
│   ├── CharacterArena.tsx     # Arena scene with floor + lighting
│   └── characters/            # Agent character system
│       ├── AgentCharacter.tsx # Low-poly 3D character with animations
│       ├── CharacterLabel.tsx # Floating HTML label (drei)
│       └── SpawnEffect.tsx    # Particle burst on spawn/despawn
├── components/         # Shared UI components
│   ├── Layout.tsx      # Sidebar navigation + page shell
│   ├── StatsCard.tsx   # Stat display card
│   ├── SessionTable.tsx # Session list table
│   └── BadgeCard.tsx   # Badge display card
├── api/
│   ├── client.ts       # Fetch wrappers + useWebSocket hook
│   └── types.ts        # TypeScript interfaces
├── hooks/
│   └── useAgentTracker.ts # WebSocket -> agent state bridge
├── stores/
│   └── agentStore.tsx  # Agent character state management
├── App.tsx             # Router
├── main.tsx            # Entry point
└── index.css           # Tailwind + glassmorphism styles
```

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Three.js + @react-three/fiber + @react-three/drei
- TailwindCSS 4
- Recharts
- Framer Motion
- React Router 7
