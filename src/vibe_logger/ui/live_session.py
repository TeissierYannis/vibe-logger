from __future__ import annotations

import json
import sys
import select
from datetime import datetime
from pathlib import Path

from rich.console import Console, Group
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from ..models import Message, ToolCall
from .components import cost_format, token_format, duration_format
from .sprites import AgentSpriteTracker


class LiveSessionView:
    """Tail-f style live view of an active Vibe session."""

    def __init__(self, session_dir: Path):
        self.session_dir = session_dir
        self.messages_path = session_dir / "messages.jsonl"
        self.meta_path = session_dir / "meta.json"
        self.console = Console()
        self.messages: list[Message] = []
        self.meta: dict = {}
        self._file_pos: int = 0
        self._agent_file_positions: dict[str, int] = {}  # agent_dir -> file pos
        self.follow_mode: bool = True
        self.scroll_offset: int = 0
        self._tick_count: int = 0
        self._is_active: bool = True
        self.sprite_tracker = AgentSpriteTracker()
        self._raw_messages: list[dict] = []  # raw dicts for sprite tracking

    def run(self) -> None:
        self._load_meta()
        self._read_new_messages()

        title = self.meta.get("title", self.session_dir.name)
        if not self.messages and not self.meta:
            self.console.print("[bold red]No session data found.[/bold red]")
            return

        try:
            _enable_raw_mode()
            with Live(self._render(), console=self.console, refresh_per_second=4, screen=True) as live:
                while True:
                    if _key_available():
                        key = sys.stdin.read(1)
                        if key == "q" or key == "\x03":
                            break
                        elif key == "f":
                            self.follow_mode = not self.follow_mode
                        elif key in ("j", "J"):
                            self.follow_mode = False
                            self.scroll_offset = min(
                                self.scroll_offset + 3,
                                max(0, len(self.messages) - 5)
                            )
                        elif key in ("k", "K"):
                            self.follow_mode = False
                            self.scroll_offset = max(0, self.scroll_offset - 3)

                    # Auto-refresh every ~1 second (4 ticks at 0.25s)
                    self._tick_count += 1
                    if self._tick_count >= 4:
                        self._tick_count = 0
                        self._read_new_messages()
                        self._load_meta()

                    live.update(self._render())
        except (KeyboardInterrupt, EOFError):
            pass
        finally:
            _restore_terminal()

    def _load_meta(self) -> None:
        try:
            self.meta = json.loads(self.meta_path.read_text(encoding="utf-8"))
            self._is_active = self.meta.get("end_time") is None
        except (json.JSONDecodeError, OSError):
            pass

    def _read_new_messages(self) -> None:
        """Read new lines from messages.jsonl (tail-f style)."""
        if not self.messages_path.exists():
            return

        try:
            with open(self.messages_path, "r", encoding="utf-8") as f:
                f.seek(self._file_pos)
                new_lines = f.readlines()
                self._file_pos = f.tell()
        except OSError:
            return

        had_new = False
        for line in new_lines:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

            tool_calls: list[ToolCall] = []
            for tc in data.get("tool_calls", []):
                fn = tc.get("function", {})
                tool_calls.append(ToolCall(
                    id=tc.get("id", ""),
                    name=fn.get("name", ""),
                    arguments=fn.get("arguments", ""),
                ))

            self.messages.append(Message(
                role=data.get("role", "unknown"),
                content=data.get("content"),
                message_id=data.get("message_id"),
                tool_calls=tool_calls,
                name=data.get("name"),
                tool_call_id=data.get("tool_call_id"),
            ))
            # Feed raw message to sprite tracker
            self.sprite_tracker.process_message(data)
            had_new = True

        # Also read agent sub-session messages
        agents_dir = self.session_dir / "agents"
        if agents_dir.is_dir():
            for agent_entry in agents_dir.iterdir():
                if not agent_entry.is_dir():
                    continue
                agent_msg_path = agent_entry / "messages.jsonl"
                if not agent_msg_path.exists():
                    continue
                agent_key = str(agent_entry)
                pos = self._agent_file_positions.get(agent_key, 0)
                try:
                    with open(agent_msg_path, "r", encoding="utf-8") as f:
                        f.seek(pos)
                        agent_lines = f.readlines()
                        self._agent_file_positions[agent_key] = f.tell()
                except OSError:
                    continue
                for aline in agent_lines:
                    aline = aline.strip()
                    if not aline:
                        continue
                    try:
                        adata = json.loads(aline)
                    except json.JSONDecodeError:
                        continue
                    self.sprite_tracker.process_message(adata)

        if had_new and self.follow_mode:
            self.scroll_offset = max(0, len(self.messages) - 10)

    def _render(self) -> Layout:
        # Tick sprite animations
        self.sprite_tracker.tick()

        layout = Layout()

        has_agents = len(self.sprite_tracker.agents) > 0
        parts = [Layout(name="header", size=3)]
        if has_agents:
            parts.append(Layout(name="agents", size=10))
        parts.append(Layout(name="body"))
        parts.append(Layout(name="footer", size=1))
        layout.split_column(*parts)

        # Header with live indicator
        title = self.meta.get("title", self.session_dir.name)
        live_indicator = "[bold red blink] LIVE [/bold red blink]" if self._is_active else "[dim] ENDED [/dim]"
        follow_indicator = " [green]FOLLOW[/green]" if self.follow_mode else ""
        agent_count = len(self.sprite_tracker.agents)
        agent_indicator = f" [cyan]({agent_count} agent{'s' if agent_count != 1 else ''})[/cyan]" if agent_count else ""
        layout["header"].update(Panel(
            f"{live_indicator} [bold]{title}[/bold]{follow_indicator}{agent_indicator}",
            style="bold",
        ))

        # Agent sprites panel (if any agents present)
        if has_agents:
            layout["agents"].update(self.sprite_tracker.render())

        # Body: messages + stats sidebar
        body = Layout()
        body.split_row(
            Layout(name="messages", ratio=3),
            Layout(name="stats", size=30),
        )
        body["messages"].update(self._render_messages())
        body["stats"].update(self._render_stats())
        layout["body"].update(body)

        # Footer
        layout["footer"].update(
            Text(f" f: follow {'ON' if self.follow_mode else 'OFF'} | j/k: scroll | q: quit | Messages: {len(self.messages)}", style="dim")
        )

        return layout

    def _render_messages(self) -> Group:
        if not self.messages:
            return Group(Panel("[dim]Waiting for messages...[/dim]", border_style="dim"))

        panels = []
        for msg in self.messages:
            if msg.role == "user":
                content = msg.content or ""
                panels.append(Panel(
                    content[:500] + ("..." if len(content) > 500 else ""),
                    title="[bold blue]User[/bold blue]",
                    border_style="blue",
                    expand=True,
                ))
            elif msg.role == "assistant":
                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        args_preview = tc.arguments[:200] + ("..." if len(tc.arguments) > 200 else "")
                        panels.append(Panel(
                            f"[bold]{tc.name}[/bold]\n[dim]{args_preview}[/dim]",
                            title="[bold yellow]Tool Call[/bold yellow]",
                            border_style="yellow",
                            expand=True,
                        ))
                if msg.content:
                    panels.append(Panel(
                        msg.content[:500] + ("..." if len(msg.content) > 500 else ""),
                        title="[bold green]Assistant[/bold green]",
                        border_style="green",
                        expand=True,
                    ))
            elif msg.role == "tool":
                content = msg.content or ""
                panels.append(Panel(
                    f"[dim]{content[:300]}{'...' if len(content) > 300 else ''}[/dim]",
                    title=f"[bold dim]Tool: {msg.name or ''}[/bold dim]",
                    border_style="dim",
                    expand=True,
                ))

        # Apply scroll
        visible = panels[self.scroll_offset:self.scroll_offset + 15]
        if not visible and panels:
            visible = panels[-15:]

        return Group(*visible)

    def _render_stats(self) -> Panel:
        stats = self.meta.get("stats", {})

        table = Table(show_header=False, box=None, padding=(0, 1))
        table.add_column("Key", style="bold cyan", min_width=14)
        table.add_column("Value", style="white")

        table.add_row("Steps", str(stats.get("steps", 0)))
        table.add_row("Prompt Tok", token_format(stats.get("session_prompt_tokens", 0)))
        table.add_row("Compl Tok", token_format(stats.get("session_completion_tokens", 0)))
        table.add_row("Total Tok", token_format(stats.get("session_total_llm_tokens", 0)))
        table.add_row("Cost", cost_format(stats.get("session_cost", 0.0)))
        table.add_row("Tok/sec", f"{stats.get('tokens_per_second', 0.0):.1f}")
        table.add_row("Tool OK", str(stats.get("tool_calls_succeeded", 0)))
        table.add_row("Tool Fail", str(stats.get("tool_calls_failed", 0)))
        table.add_row("Tool Reject", str(stats.get("tool_calls_rejected", 0)))

        branch = self.meta.get("git_branch", "-")
        table.add_row("", "")
        table.add_row("Branch", str(branch))
        table.add_row("User", self.meta.get("username", "-"))

        now = datetime.now().strftime("%H:%M:%S")
        table.add_row("", "")
        table.add_row("Refreshed", now)

        return Panel(table, title="[bold]Stats[/bold]", border_style="green")


# --- Raw terminal input helpers ---

_old_settings = None


def _enable_raw_mode() -> None:
    global _old_settings
    try:
        import tty
        import termios
        fd = sys.stdin.fileno()
        _old_settings = termios.tcgetattr(fd)
        tty.setcbreak(fd)
    except (ImportError, termios.error, ValueError):
        pass


def _restore_terminal() -> None:
    global _old_settings
    if _old_settings is not None:
        try:
            import termios
            termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, _old_settings)
        except (ImportError, termios.error, ValueError):
            pass
        _old_settings = None


def _key_available() -> bool:
    try:
        return bool(select.select([sys.stdin], [], [], 0.25)[0])
    except (ValueError, OSError):
        return False
