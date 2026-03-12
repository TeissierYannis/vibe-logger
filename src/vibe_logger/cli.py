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
@click.option("--no-watch", is_flag=True, default=False,
              help="Disable auto-refresh (load sessions once)")
@click.pass_context
def dashboard(ctx: click.Context, no_watch: bool) -> None:
    """Interactive stats dashboard (auto-refreshes by default)."""
    from .ui.dashboard import Dashboard

    if no_watch:
        sessions = load_sessions(ctx.obj["sessions_dir"])
        Dashboard(sessions=sessions).run()
    else:
        from .watcher import SessionWatcher
        watcher = SessionWatcher(ctx.obj["sessions_dir"])
        Dashboard(watcher=watcher).run()


@cli.command()
@click.pass_context
def sessions(ctx: click.Context) -> None:
    """Browse session logs and conversations."""
    from .ui.viewer import SessionViewer
    sessions_dir = ctx.obj["sessions_dir"]
    all_sessions = load_sessions(sessions_dir)
    SessionViewer(all_sessions, sessions_dir).run()


@cli.command()
@click.option("--session-id", default=None, help="Session directory name to follow")
@click.pass_context
def live(ctx: click.Context, session_id: str | None) -> None:
    """Follow a session in real-time (tail -f style)."""
    from .watcher import SessionWatcher
    from .ui.live_session import LiveSessionView

    console = Console()
    sessions_dir = ctx.obj["sessions_dir"]
    watcher = SessionWatcher(sessions_dir)

    if session_id:
        session_dir = sessions_dir / session_id
        if not session_dir.exists():
            console.print(f"[bold red]Session directory not found: {session_id}[/bold red]")
            return
    else:
        # Find active session, or most recent
        session = watcher.find_active_session() or watcher.find_latest_session()
        if not session:
            console.print("[bold red]No sessions found.[/bold red]")
            return
        session_dir = watcher.get_session_dir(session)
        is_active = session.end_time is None
        status = "[green]ACTIVE[/green]" if is_active else "[dim]ended[/dim]"
        console.print(f"[dim]Following session: {session.title or session.directory_name} ({status})[/dim]")

    LiveSessionView(session_dir).run()


@cli.command()
@click.option("--port", default=8765, help="Port to serve on")
@click.option("--no-open", is_flag=True, default=False, help="Don't auto-open browser")
@click.option("--dev", is_flag=True, default=False, help="Dev mode (proxy to Vite dev server)")
@click.pass_context
def web(ctx: click.Context, port: int, no_open: bool, dev: bool) -> None:
    """Launch the web dashboard with 3D visualizations."""
    try:
        import uvicorn
    except ImportError:
        click.echo("Web dependencies not installed. Run: pip install vibe-logger[web]", err=True)
        raise SystemExit(1)

    from .web.app import create_app
    app = create_app(ctx.obj["sessions_dir"])

    console = Console()
    console.print(f"[bold green]vibe-logger web dashboard[/bold green] starting on http://localhost:{port}")

    if not no_open:
        import webbrowser
        import threading
        threading.Timer(1.5, lambda: webbrowser.open(f"http://localhost:{port}")).start()

    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")


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
