# vibe-logger

CLI stats dashboard & gamification for [Mistral Vibe Code](https://docs.mistral.ai/capabilities/vibe/) sessions.

Analyze your coding sessions with interactive TUI dashboards, a 3D web dashboard, gamification badges, and real-time live monitoring with animated agent characters.

## Features

- **TUI Dashboard** -- Interactive terminal dashboard with 5 views (Overview, Projects, Branches, Timeline, Gamification), auto-refresh, and keyboard navigation
- **Web Dashboard** -- 3D web interface with 6 pages: Overview, Activity terrain, Network graph, Gamification, Live monitoring, and Arena
- **Analytics** -- Aggregate stats, per-project/branch/user/date groupings, 30-day timeline, cost tracking
- **Gamification** -- 16 unlockable badges, productivity score (0-100), coding streaks, multi-player leaderboard
- **Live Monitoring** -- Real-time session tracking via WebSocket with animated 3D agent characters
- **Arena** -- Fullscreen 3D scene where each spawned agent becomes a low-poly character performing visual actions (reading, writing, executing, searching)

## Installation

```bash
pip install vibe-logger
```

For the web dashboard:

```bash
pip install vibe-logger[web]
```

Development install:

```bash
git clone https://github.com/TeissierYannis/vibe-logger.git
cd vibe-logger
pip install -e ".[dev,web]"
```

## Usage

### CLI Commands

```bash
# Interactive TUI dashboard (default)
vibe-logger

# Browse session logs and conversations
vibe-logger sessions

# Real-time monitoring of active sessions
vibe-logger live
vibe-logger live --session-id SESSION_ID

# Launch the 3D web dashboard
vibe-logger web
vibe-logger web --port 8765 --no-open

# Print summary statistics
vibe-logger stats

# Show badges and leaderboard
vibe-logger badges
```

### Global Options

```bash
# Custom session logs directory
vibe-logger --path /path/to/sessions

# Or via environment variable
export VIBE_LOG_PATH=/path/to/sessions
```

### TUI Dashboard Controls

| Key | Action |
|-----|--------|
| `Tab` / `l` | Next view |
| `h` | Previous view |
| `1`-`5` | Jump to view |
| `r` | Manual refresh |
| `q` | Quit |

## Web Dashboard

The web dashboard features 6 pages with 3D visualizations:

| Page | Description |
|------|-------------|
| **Overview** | Stats cards (sessions, cost, tokens, duration, speed) |
| **Activity** | 3D terrain visualization + daily activity charts |
| **Network** | 3D force-directed graph of projects and branches |
| **Gamification** | Productivity score ring, badge grid, leaderboard |
| **Live** | Real-time message feed with animated agent characters |
| **Arena** | Fullscreen 3D arena with agent characters and HUD overlay |

### Development

```bash
# Terminal 1: Start the API server
vibe-logger web --no-open --dev

# Terminal 2: Start Vite dev server with HMR
cd web
npm install
npm run dev
```

### Production Build

```bash
cd web && npm run build
vibe-logger web  # Serves the built frontend
```

## Badges

Earn badges based on your coding activity:

| Badge | Name | Requirement |
|-------|------|-------------|
| :hatching_chick: | First Steps | Complete your first session |
| :keycap_ten: | Getting Started | Complete 10 sessions |
| :star: | Veteran | Complete 50 sessions |
| :100: | Centurion | Complete 100 sessions |
| :money_with_wings: | Big Spender | Spend $10+ total |
| :coin: | Penny Pincher | Session under $0.001 |
| :hammer_and_wrench: | Tool Master | 50+ tool calls in one session |
| :white_check_mark: | Perfect Tools | 100% tool success rate (10+ calls) |
| :zap: | Speed Demon | 20+ tokens/sec |
| :fire: | Week Warrior | 7-day coding streak |
| :trophy: | Monthly Machine | 30-day coding streak |
| :owl: | Night Owl | Session between 12am-5am |
| :hatched_chick: | Early Bird | Session before 7am |
| :person_running: | Marathon Runner | Session longer than 30 minutes |
| :globe_showing_americas: | Polyglot | Work on 3+ projects |
| :whale: | Token Whale | 1M+ tokens total |

## Configuration

vibe-logger reads session logs from Mistral Vibe Code's log directory:

- Default: `~/.vibe/logs/session/`
- Custom: Set `VIBE_LOG_PATH` environment variable or use `--path` flag
- Vibe home: Set `VIBE_HOME` to override `~/.vibe/`

## Tech Stack

**Backend:**
- Python 3.11+
- Click (CLI framework)
- Rich (Terminal UI)
- FastAPI + Uvicorn (Web server)

**Frontend:**
- React 19 + TypeScript
- Three.js + React Three Fiber (3D visualizations)
- TailwindCSS 4 (styling with glassmorphism)
- Recharts (2D charts)
- Framer Motion (animations)
- Vite 8 (build tool)

## API

The web dashboard exposes a REST API:

```
GET  /api/sessions              # List all sessions
GET  /api/sessions/:id          # Session detail with messages
GET  /api/stats                 # Aggregate statistics
GET  /api/stats/timeline?days=N # Per-day stats
GET  /api/stats/projects        # Stats grouped by project
GET  /api/stats/branches        # Stats grouped by branch
GET  /api/stats/users           # Stats grouped by user
GET  /api/gamification          # Player stats, badges, leaderboard
WS   /api/ws/live               # Real-time session updates
```

## License

MIT
