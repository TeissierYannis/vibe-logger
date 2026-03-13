"""ASCII sprite characters for agent visualization in the TUI."""
from __future__ import annotations

from rich.panel import Panel
from rich.text import Text
from rich.columns import Columns
from rich.console import Group


# --- Sprite frames per state (3-5 lines each) ---
# Each state has 2 frames for subtle animation

SPRITES: dict[str, list[str]] = {
    "idle": [
        "  ◉‿◉\n ╱|╲\n / \\",
        "  ◉‿◉\n ╲|╱\n / \\",
    ],
    "reading": [
        "  ◉_◉\n ╱|╲ 📄\n / \\",
        "  ◉.◉\n ╱|╲ 📄\n / \\",
    ],
    "writing": [
        "  ◉◉ \n ╱|╲⌨\n / \\",
        "  ◉◉ \n⌨╲|╱\n / \\",
    ],
    "executing": [
        "  ◉◉ ⚡\n ╱|╲\n / \\",
        " ⚡◉◉\n ╲|╱\n / \\",
    ],
    "searching": [
        "  ◉◉ 🔍\n ╱|╲\n / \\",
        "🔍◉◉\n  ╲|╱\n  / \\",
    ],
    "browsing": [
        "  ◉_◉\n ╱|╲ 🌐\n / \\",
        "  ◉.◉\n ╱|╲ 🌐\n / \\",
    ],
    "spawning": [
        "  ·_·\n  |  \n    ",
        "  ◉_◉\n ╱|╲\n / \\",
    ],
    "despawning": [
        "  ◉_◉\n ╱|╲\n / \\",
        "  ·_·\n  |  \n    ",
    ],
}

COLORS: dict[str, str] = {
    "idle": "dim",
    "reading": "cyan",
    "writing": "green",
    "executing": "yellow",
    "searching": "magenta",
    "browsing": "blue",
    "spawning": "dim",
    "despawning": "dim",
}

STATE_LABELS: dict[str, str] = {
    "idle": "idle",
    "reading": "reading",
    "writing": "writing",
    "executing": "running",
    "searching": "searching",
    "browsing": "browsing",
    "spawning": "spawning...",
    "despawning": "leaving...",
}


class AgentSprite:
    """Tracks a single agent's state and renders its ASCII sprite."""

    def __init__(self, agent_id: str, color_index: int = 0):
        self.agent_id = agent_id
        self.state: str = "spawning"
        self.current_tool: str | None = None
        self.frame: int = 0
        self.color_index = color_index
        self.completed_tools: int = 0

    def update_state(self, tool_name: str | None) -> None:
        if tool_name is None:
            self.state = "idle"
            self.current_tool = None
            return

        self.current_tool = tool_name
        self.completed_tools += 1

        tool_map = {
            "Read": "reading",
            "Glob": "reading",
            "Grep": "searching",
            "Write": "writing",
            "Edit": "writing",
            "NotebookEdit": "writing",
            "Bash": "executing",
            "WebSearch": "browsing",
            "WebFetch": "browsing",
        }
        self.state = tool_map.get(tool_name, "executing")

    def advance_frame(self) -> None:
        self.frame = (self.frame + 1) % 2

    def render(self) -> Panel:
        frames = SPRITES.get(self.state, SPRITES["idle"])
        sprite_text = frames[self.frame % len(frames)]
        color = COLORS.get(self.state, "dim")
        label = STATE_LABELS.get(self.state, self.state)

        # Build label line
        tool_info = f" [{color}]{self.current_tool}[/{color}]" if self.current_tool else ""
        status_line = f"[{color}]{label}[/{color}]{tool_info}"

        content = Text.from_markup(f"[{color}]{sprite_text}[/{color}]\n{status_line}")

        # Short agent ID for title
        short_id = self.agent_id.split("-")[0] if "-" in self.agent_id else self.agent_id[:8]
        title = f"[bold {color}]Agent {short_id}[/bold {color}]"

        return Panel(content, title=title, width=20, height=7, border_style=color)


class AgentSpriteTracker:
    """Tracks multiple agents from live messages, renders sprite panel."""

    AGENT_COLORS = ["cyan", "green", "yellow", "magenta", "blue", "red"]

    def __init__(self):
        self.agents: dict[str, AgentSprite] = {}
        self._agent_stack: list[str] = []  # stack of agent IDs for tool attribution
        self._root_spawned: bool = False
        self._tick: int = 0

    def process_message(self, msg_data: dict) -> None:
        """Process a raw message dict from messages.jsonl."""
        role = msg_data.get("role", "")

        if role == "assistant":
            tool_calls = msg_data.get("tool_calls", [])
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "")
                tc_id = tc.get("id", "")

                if tool_name == "Agent":
                    # Spawn new sub-agent
                    self._spawn_agent(tc_id)
                elif tool_name:
                    # Update current top-of-stack agent
                    self._update_current_agent(tool_name)

            # If assistant message with content but no tool calls -> idle
            if not tool_calls and msg_data.get("content"):
                self._set_current_idle()

        elif role == "tool":
            tool_name = msg_data.get("name", "")
            tc_id = msg_data.get("tool_call_id", "")

            if tool_name == "Agent" and tc_id:
                # Agent completed -> despawn
                self._despawn_agent(tc_id)

    def _ensure_root(self) -> None:
        if not self._root_spawned:
            self._root_spawned = True
            sprite = AgentSprite("root", color_index=0)
            sprite.state = "idle"
            self.agents["root"] = sprite
            self._agent_stack = ["root"]

    def _spawn_agent(self, agent_id: str) -> None:
        self._ensure_root()
        idx = len(self.agents) % len(self.AGENT_COLORS)
        sprite = AgentSprite(agent_id, color_index=idx)
        sprite.state = "spawning"
        self.agents[agent_id] = sprite
        self._agent_stack.append(agent_id)

    def _despawn_agent(self, agent_id: str) -> None:
        if agent_id in self.agents:
            self.agents[agent_id].state = "despawning"
            if agent_id in self._agent_stack:
                self._agent_stack.remove(agent_id)

    def _update_current_agent(self, tool_name: str) -> None:
        self._ensure_root()
        if self._agent_stack:
            agent_id = self._agent_stack[-1]
            if agent_id in self.agents:
                self.agents[agent_id].update_state(tool_name)

    def _set_current_idle(self) -> None:
        if self._agent_stack:
            agent_id = self._agent_stack[-1]
            if agent_id in self.agents:
                self.agents[agent_id].state = "idle"
                self.agents[agent_id].current_tool = None

    def tick(self) -> None:
        """Advance animation frames and clean up despawned agents."""
        self._tick += 1
        to_remove = []
        for aid, sprite in self.agents.items():
            sprite.advance_frame()
            # Remove despawned agents after 2 ticks
            if sprite.state == "despawning" and self._tick % 2 == 0:
                to_remove.append(aid)
        for aid in to_remove:
            del self.agents[aid]

    def render(self) -> Panel:
        """Render all agent sprites as a panel."""
        if not self.agents:
            return Panel(
                Text.from_markup("[dim]No agents active[/dim]"),
                title="[bold]Agents[/bold]",
                border_style="dim",
                height=8,
            )

        # Active agents (not despawning) count
        active = [a for a in self.agents.values() if a.state not in ("despawning", "spawning")]
        total = len(self.agents)
        despawning = sum(1 for a in self.agents.values() if a.state == "despawning")

        sprites = [sprite.render() for sprite in self.agents.values()]

        header = Text.from_markup(
            f"[bold cyan]{total}[/bold cyan] agent{'s' if total != 1 else ''}"
            f" · [green]{len(active)}[/green] active"
            + (f" · [dim]{despawning} leaving[/dim]" if despawning else "")
        )

        return Panel(
            Group(header, Columns(sprites, equal=False, expand=False)),
            title="[bold]Agents[/bold]",
            border_style="cyan",
        )
