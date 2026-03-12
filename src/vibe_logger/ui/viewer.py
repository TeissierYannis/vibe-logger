from __future__ import annotations

import sys
import select
from pathlib import Path
from typing import Callable

from rich.console import Console, Group
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.text import Text
from rich.table import Table

from ..models import Session, Message
from ..loader import load_session_messages
from .components import cost_format, token_format, duration_format


class SessionViewer:
    def __init__(self, sessions: list[Session], sessions_dir: Path):
        self.sessions = sorted(sessions, key=lambda s: s.start_time, reverse=True)
        self.sessions_dir = sessions_dir
        self.console = Console()
        self.selected = 0
        self.viewing_session: Session | None = None
        self.scroll_offset = 0

    def run(self) -> None:
        if not self.sessions:
            self.console.print("[bold red]No sessions found.[/bold red]")
            return

        try:
            _enable_raw_mode()
            with Live(self._render(), console=self.console, refresh_per_second=2, screen=True) as live:
                while True:
                    if _key_available():
                        key = sys.stdin.read(1)
                        if key == "q" or key == "\x03":
                            if self.viewing_session:
                                self.viewing_session = None
                                self.scroll_offset = 0
                            else:
                                break
                        elif key == "\x1b":  # Escape sequence
                            # Read the rest of escape sequence
                            if _key_available():
                                seq = sys.stdin.read(1)
                                if seq == "[":
                                    arrow = sys.stdin.read(1)
                                    if arrow == "A":  # Up
                                        self._move(-1)
                                    elif arrow == "B":  # Down
                                        self._move(1)
                            else:
                                # Plain escape = back
                                if self.viewing_session:
                                    self.viewing_session = None
                                    self.scroll_offset = 0
                        elif key in ("j", "J"):
                            self._move(1)
                        elif key in ("k", "K"):
                            self._move(-1)
                        elif key == "\r" or key == "\n":
                            if not self.viewing_session:
                                self._open_session()
                        live.update(self._render())
        except (KeyboardInterrupt, EOFError):
            pass
        finally:
            _restore_terminal()

    def _move(self, delta: int) -> None:
        if self.viewing_session:
            self.scroll_offset = max(0, self.scroll_offset + delta * 3)
        else:
            self.selected = max(0, min(len(self.sessions) - 1, self.selected + delta))

    def _open_session(self) -> None:
        session = self.sessions[self.selected]
        if not session.messages:
            session_dir = self.sessions_dir / session.directory_name
            session.messages = load_session_messages(session_dir)
        self.viewing_session = session
        self.scroll_offset = 0

    def _render(self) -> Layout:
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=1),
        )

        if self.viewing_session:
            layout["header"].update(Panel(
                f"[bold]{self.viewing_session.title or 'Session'}[/bold] "
                f"[dim]({self.viewing_session.start_time.strftime('%Y-%m-%d %H:%M')})[/dim]",
                style="bold",
            ))
            layout["body"].update(self._render_conversation())
            layout["footer"].update(Text(" j/k: scroll | q/Esc: back to list", style="dim"))
        else:
            layout["header"].update(Panel("[bold]Session Browser[/bold]", style="bold"))
            layout["body"].update(self._render_session_list())
            layout["footer"].update(Text(" j/k/↑/↓: navigate | Enter: open | q: quit", style="dim"))

        return layout

    def _render_session_list(self) -> Table:
        table = Table(border_style="dim", expand=True)
        table.add_column("", width=3)
        table.add_column("Date", style="cyan", width=16)
        table.add_column("Title", style="white")
        table.add_column("Duration", style="green", justify="right", width=8)
        table.add_column("Tokens", style="yellow", justify="right", width=8)
        table.add_column("Cost", style="red", justify="right", width=9)
        table.add_column("Project", style="magenta", width=15, overflow="ellipsis")

        visible_start = max(0, self.selected - 15)
        visible_end = min(len(self.sessions), visible_start + 30)

        for i in range(visible_start, visible_end):
            s = self.sessions[i]
            marker = "►" if i == self.selected else " "
            style = "bold" if i == self.selected else ""
            table.add_row(
                marker,
                s.start_time.strftime("%Y-%m-%d %H:%M"),
                s.title or "(no title)",
                duration_format(s.duration_seconds),
                token_format(s.total_tokens),
                cost_format(s.cost),
                s.project_name,
                style=style,
            )

        return table

    def _render_conversation(self) -> Group:
        session = self.viewing_session
        if not session or not session.messages:
            return Group(Panel("[dim]No messages in this session[/dim]"))

        panels = []
        for msg in session.messages:
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
                    title=f"[bold dim]Tool Result: {msg.name or ''}[/bold dim]",
                    border_style="dim",
                    expand=True,
                ))

        # Apply scroll offset
        visible = panels[self.scroll_offset:self.scroll_offset + 20]
        if not visible:
            visible = panels[-20:]

        return Group(*visible)


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
        return bool(select.select([sys.stdin], [], [], 0.1)[0])
    except (ValueError, OSError):
        return False
