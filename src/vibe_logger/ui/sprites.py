"""ASCII sprite characters for agent visualization in the TUI."""
from __future__ import annotations

import json
from pathlib import Path

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

TOOL_STATE_MAP: dict[str, str] = {
    "Read": "reading",
    "read_file": "reading",
    "Glob": "reading",
    "Grep": "searching",
    "grep": "searching",
    "Write": "writing",
    "write_file": "writing",
    "Edit": "writing",
    "NotebookEdit": "writing",
    "Bash": "executing",
    "bash": "executing",
    "Agent": "executing",
    "WebSearch": "browsing",
    "WebFetch": "browsing",
    "web_search": "browsing",
    "web_fetch": "browsing",
}


class AgentSprite:
    """Tracks a single agent's state and renders its ASCII sprite."""

    def __init__(self, agent_id: str, label: str = "", color_index: int = 0):
        self.agent_id = agent_id
        self.label = label  # human-readable name from meta.json or directory
        self.state: str = "spawning"
        self.current_tool: str | None = None
        self.frame: int = 0
        self.color_index = color_index
        self.completed_tools: int = 0
        self._despawn_ticks: int = 0

    def update_state(self, tool_name: str | None) -> None:
        if tool_name is None:
            self.state = "idle"
            self.current_tool = None
            return

        self.current_tool = tool_name
        self.completed_tools += 1
        self.state = TOOL_STATE_MAP.get(tool_name, "executing")

    def advance_frame(self) -> None:
        self.frame = (self.frame + 1) % 2

    def render(self) -> Panel:
        frames = SPRITES.get(self.state, SPRITES["idle"])
        sprite_text = frames[self.frame % len(frames)]
        color = COLORS.get(self.state, "dim")
        state_label = STATE_LABELS.get(self.state, self.state)

        # Build label line
        tool_info = f" [{color}]{self.current_tool}[/{color}]" if self.current_tool else ""
        status_line = f"[{color}]{state_label}[/{color}]{tool_info}"

        content = Text.from_markup(f"[{color}]{sprite_text}[/{color}]\n{status_line}")

        # Use label or short agent ID for title
        display_name = self.label or self.agent_id[:12]
        title = f"[bold {color}]{display_name}[/bold {color}]"

        return Panel(content, title=title, width=20, height=7, border_style=color)


class AgentSpriteTracker:
    """Tracks agents from session directory structure and live messages."""

    AGENT_COLORS = ["cyan", "green", "yellow", "magenta", "blue", "red"]

    def __init__(self, session_dir: Path | None = None):
        self.session_dir = session_dir
        self.agents: dict[str, AgentSprite] = {}
        self._root_spawned: bool = False
        self._tick: int = 0
        # File positions for tailing each agent's messages.jsonl
        self._file_positions: dict[str, int] = {}
        # Known agent directories (to detect new ones)
        self._known_agent_dirs: set[str] = set()

    def scan_agents(self) -> None:
        """Scan the agents/ subfolder for sub-agent directories.

        Each sub-agent folder gets its own sprite. This is the primary
        way agents are discovered (not from tool_calls in parent messages).
        """
        if not self.session_dir:
            return
        agents_dir = self.session_dir / "agents"
        if not agents_dir.is_dir():
            return

        for agent_entry in sorted(agents_dir.iterdir()):
            if not agent_entry.is_dir():
                continue
            dir_name = agent_entry.name
            if dir_name in self._known_agent_dirs:
                continue

            # New agent discovered
            self._known_agent_dirs.add(dir_name)
            self._ensure_root()

            # Read agent meta.json for label
            label = dir_name.split("_")[0]  # e.g. "explore" from "explore_20260313_..."
            already_ended = False
            meta_path = agent_entry / "meta.json"
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                    label = meta.get("title", label)
                    already_ended = bool(meta.get("end_time"))
                except (json.JSONDecodeError, OSError):
                    pass

            idx = len(self.agents) % len(self.AGENT_COLORS)
            sprite = AgentSprite(dir_name, label=label, color_index=idx)
            # Show completed agents briefly in idle before despawning
            sprite.state = "idle" if already_ended else "spawning"
            self.agents[dir_name] = sprite

    def read_agent_messages(self) -> None:
        """Read new messages from each agent's messages.jsonl and update sprites."""
        if not self.session_dir:
            return
        agents_dir = self.session_dir / "agents"
        if not agents_dir.is_dir():
            return

        for agent_entry in agents_dir.iterdir():
            if not agent_entry.is_dir():
                continue
            dir_name = agent_entry.name
            msg_path = agent_entry / "messages.jsonl"
            if not msg_path.exists():
                continue

            pos = self._file_positions.get(dir_name, 0)
            try:
                with open(msg_path, "r", encoding="utf-8") as f:
                    f.seek(pos)
                    new_lines = f.readlines()
                    self._file_positions[dir_name] = f.tell()
            except OSError:
                continue

            for line in new_lines:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                self._process_agent_message(dir_name, data)

        # Check meta.json for completed agents
        for dir_name in list(self._known_agent_dirs):
            if dir_name not in self.agents:
                continue
            meta_path = agents_dir / dir_name / "meta.json"
            if not meta_path.exists():
                continue
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                if meta.get("end_time") and self.agents[dir_name].state not in ("despawning",):
                    self.agents[dir_name].state = "despawning"
            except (json.JSONDecodeError, OSError):
                pass

    def process_message(self, msg_data: dict) -> None:
        """Process a raw message from the parent session's messages.jsonl.

        Updates the root agent's state based on tool calls.
        """
        role = msg_data.get("role", "")

        if role == "assistant":
            tool_calls = msg_data.get("tool_calls", [])
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "") or tc.get("name", "")
                if tool_name and tool_name != "Agent":
                    self._ensure_root()
                    self.agents["root"].update_state(tool_name)

            if not tool_calls and msg_data.get("content"):
                if self._root_spawned and "root" in self.agents:
                    self.agents["root"].state = "idle"
                    self.agents["root"].current_tool = None

    def _process_agent_message(self, agent_dir_name: str, msg_data: dict) -> None:
        """Process a message from a specific agent's messages.jsonl."""
        if agent_dir_name not in self.agents:
            return

        role = msg_data.get("role", "")
        if role == "assistant":
            tool_calls = msg_data.get("tool_calls", [])
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "") or tc.get("name", "")
                if tool_name:
                    self.agents[agent_dir_name].update_state(tool_name)
            if not tool_calls and msg_data.get("content"):
                self.agents[agent_dir_name].state = "idle"
                self.agents[agent_dir_name].current_tool = None

    def _ensure_root(self) -> None:
        if not self._root_spawned:
            self._root_spawned = True
            sprite = AgentSprite("root", label="Root", color_index=0)
            sprite.state = "idle"
            self.agents["root"] = sprite

    def tick(self) -> None:
        """Advance animation frames and clean up despawned agents."""
        self._tick += 1
        to_remove = []
        for aid, sprite in self.agents.items():
            sprite.advance_frame()
            if sprite.state == "despawning":
                sprite._despawn_ticks += 1
                # Remove despawned agents after 8 ticks (~2 seconds)
                if sprite._despawn_ticks >= 8:
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
