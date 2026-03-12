from __future__ import annotations

import click
from rich.console import Console

from .config import get_sessions_dir
from .loader import load_sessions


@click.group(invoke_without_command=True)
@click.option("--path", envvar="VIBE_LOG_PATH", default=None,
              help="Custom session logs directory (default: ~/.vibe/logs/session/)")
@click.pass_context
def cli(ctx: click.Context, path: str | None) -> None:
    """vibe-logger - Stats dashboard & gamification for Mistral Vibe Code."""
    ctx.ensure_object(dict)
    ctx.obj["sessions_dir"] = get_sessions_dir(path)
    if ctx.invoked_subcommand is None:
        ctx.invoke(dashboard)


@cli.command()
@click.pass_context
def dashboard(ctx: click.Context) -> None:
    """Interactive stats dashboard."""
    from .ui.dashboard import Dashboard
    sessions = load_sessions(ctx.obj["sessions_dir"])
    Dashboard(sessions).run()


@cli.command()
@click.pass_context
def sessions(ctx: click.Context) -> None:
    """Browse session logs and conversations."""
    from .ui.viewer import SessionViewer
    sessions_dir = ctx.obj["sessions_dir"]
    all_sessions = load_sessions(sessions_dir)
    SessionViewer(all_sessions, sessions_dir).run()


@cli.command()
@click.pass_context
def stats(ctx: click.Context) -> None:
    """Print summary stats (non-interactive)."""
    from .analytics import aggregate, group_by_project
    from .ui.components import stats_panel, group_table

    console = Console()
    all_sessions = load_sessions(ctx.obj["sessions_dir"])

    if not all_sessions:
        console.print("[bold red]No sessions found.[/bold red]")
        return

    agg = aggregate(all_sessions)
    console.print(stats_panel(agg))
    console.print()

    projects = group_by_project(all_sessions)
    if len(projects) > 1:
        console.print(group_table(projects, group_label="Project"))


@cli.command()
@click.pass_context
def badges(ctx: click.Context) -> None:
    """Show earned badges and player stats."""
    from .analytics import group_by_user
    from .gamification import compute_player_stats, compute_leaderboard, _BADGE_DEFS
    from .ui.components import player_panel, badge_panel, leaderboard_table

    console = Console()
    all_sessions = load_sessions(ctx.obj["sessions_dir"])

    if not all_sessions:
        console.print("[bold red]No sessions found.[/bold red]")
        return

    users = group_by_user(all_sessions)
    all_badge_count = len(_BADGE_DEFS)

    if len(users) == 1:
        username = next(iter(users))
        player = compute_player_stats(username, users[username])
        console.print(player_panel(player, all_badge_count))
        console.print()
        console.print(badge_panel(player.badges, all_badge_count))
    else:
        leaderboard = compute_leaderboard(users)
        console.print(leaderboard_table(leaderboard))
        for player in leaderboard:
            console.print()
            console.print(player_panel(player, all_badge_count))
            console.print(badge_panel(player.badges, all_badge_count))
