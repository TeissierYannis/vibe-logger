from __future__ import annotations

import sys
import select
import os
from typing import Callable

from rich.console import Console, Group
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.text import Text

from ..models import Session
from ..analytics import aggregate, group_by_project, group_by_branch, timeline, group_by_user
from ..gamification import compute_player_stats, compute_leaderboard, _BADGE_DEFS
from .components import (
    stats_panel, session_table, group_table, badge_panel,
    player_panel, timeline_panel, leaderboard_table,
)


VIEWS = ["Overview", "Projects", "Branches", "Timeline", "Gamification"]


class Dashboard:
    def __init__(self, sessions: list[Session]):
        self.sessions = sorted(sessions, key=lambda s: s.start_time)
        self.current_view = 0
        self.console = Console()

    def run(self) -> None:
        if not self.sessions:
            self.console.print(Panel(
                "[bold red]No sessions found.[/bold red]\n\n"
                "Make sure your Vibe logs are in ~/.vibe/logs/session/\n"
                "or specify a custom path with --path",
                title="vibe-logger",
                border_style="red",
            ))
            return

        self.console.print(f"[dim]Loaded {len(self.sessions)} sessions. Press 1-5 to switch views, q to quit.[/dim]\n")

        try:
            _enable_raw_mode()
            with Live(self._render(), console=self.console, refresh_per_second=2, screen=True) as live:
                while True:
                    if _key_available():
                        key = sys.stdin.read(1)
                        if key == "q" or key == "\x03":  # q or Ctrl+C
                            break
                        elif key == "\t" or key == "l":  # Tab or l = next
                            self.current_view = (self.current_view + 1) % len(VIEWS)
                        elif key == "h":  # h = previous
                            self.current_view = (self.current_view - 1) % len(VIEWS)
                        elif key in "12345":
                            self.current_view = int(key) - 1
                        live.update(self._render())
        except (KeyboardInterrupt, EOFError):
            pass
        finally:
            _restore_terminal()

    def _render(self) -> Layout:
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=1),
        )

        # Header: tab bar
        tabs = []
        for i, name in enumerate(VIEWS):
            if i == self.current_view:
                tabs.append(f"[bold white on blue] {i+1}:{name} [/bold white on blue]")
            else:
                tabs.append(f"[dim] {i+1}:{name} [/dim]")
        layout["header"].update(Panel(" ".join(tabs), style="bold"))

        # Body: current view
        renderers = [
            self._render_overview,
            self._render_projects,
            self._render_branches,
            self._render_timeline,
            self._render_gamification,
        ]
        layout["body"].update(renderers[self.current_view]())

        # Footer
        layout["footer"].update(
            Text(" 1-5: switch view | Tab/l: next | h: prev | q: quit", style="dim")
        )

        return layout

    def _render_overview(self) -> Group:
        agg = aggregate(self.sessions)
        return Group(
            stats_panel(agg),
            session_table(self.sessions, max_rows=15),
        )

    def _render_projects(self) -> Group:
        groups = group_by_project(self.sessions)
        return Group(group_table(groups, group_label="Project"))

    def _render_branches(self) -> Group:
        groups = group_by_branch(self.sessions)
        return Group(group_table(groups, group_label="Branch"))

    def _render_timeline(self) -> Group:
        data = timeline(self.sessions, days=30)
        return Group(timeline_panel(data))

    def _render_gamification(self) -> Group:
        users = group_by_user(self.sessions)
        all_badge_count = len(_BADGE_DEFS)

        items = []
        if len(users) == 1:
            username = next(iter(users))
            player = compute_player_stats(username, users[username])
            items.append(player_panel(player, all_badge_count))
            items.append(badge_panel(player.badges, all_badge_count))
        else:
            leaderboard = compute_leaderboard(users)
            items.append(leaderboard_table(leaderboard))
            # Show top player's badges
            if leaderboard:
                items.append(badge_panel(leaderboard[0].badges, all_badge_count))

        return Group(*items)


# --- Raw terminal input helpers (no curses dependency) ---

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
