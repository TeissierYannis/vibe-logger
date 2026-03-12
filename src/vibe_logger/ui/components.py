from __future__ import annotations

from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.columns import Columns

from ..analytics import AggregateStats
from ..gamification import Badge, PlayerStats
from ..models import Session


def cost_format(cost: float) -> str:
    if cost >= 1.0:
        return f"${cost:.2f}"
    if cost >= 0.01:
        return f"${cost:.3f}"
    return f"${cost:.4f}"


def token_format(tokens: int) -> str:
    if tokens >= 1_000_000:
        return f"{tokens / 1_000_000:.1f}M"
    if tokens >= 1_000:
        return f"{tokens / 1_000:.1f}K"
    return str(tokens)


def duration_format(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.0f}s"
    if seconds < 3600:
        m, s = divmod(int(seconds), 60)
        return f"{m}m {s}s"
    h, remainder = divmod(int(seconds), 3600)
    m = remainder // 60
    return f"{h}h {m}m"


def activity_sparkline(daily_counts: list[int], width: int = 30) -> str:
    """Unicode block characters for a mini bar chart."""
    blocks = " ▁▂▃▄▅▆▇█"
    if not daily_counts:
        return ""
    max_val = max(daily_counts)
    if max_val == 0:
        return "▁" * len(daily_counts[-width:])
    result = []
    for count in daily_counts[-width:]:
        idx = int(count / max_val * (len(blocks) - 1))
        result.append(blocks[idx])
    return "".join(result)


def stats_panel(stats: AggregateStats, title: str = "Overview") -> Panel:
    """Key/value panel of aggregate stats."""
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Key", style="bold cyan", min_width=22)
    table.add_column("Value", style="white")

    table.add_row("Sessions", str(stats.total_sessions))
    table.add_row("Total Cost", cost_format(stats.total_cost))
    table.add_row("Avg Cost/Session", cost_format(stats.avg_cost_per_session))
    table.add_row("Total Tokens", token_format(stats.total_tokens))
    table.add_row("  Prompt Tokens", token_format(stats.total_prompt_tokens))
    table.add_row("  Completion Tokens", token_format(stats.total_completion_tokens))
    table.add_row("Avg Tokens/Session", token_format(int(stats.avg_tokens_per_session)))
    table.add_row("Avg Tokens/sec", f"{stats.avg_tokens_per_second:.1f}")
    table.add_row("Total Duration", duration_format(stats.total_duration_seconds))
    table.add_row("Avg Duration/Session", duration_format(stats.avg_duration_per_session))
    table.add_row("Total Steps", str(stats.total_steps))
    table.add_row("Tool Calls (OK)", str(stats.total_tool_calls_succeeded))
    table.add_row("Tool Calls (Failed)", str(stats.total_tool_calls_failed))
    table.add_row("Tool Calls (Rejected)", str(stats.total_tool_calls_rejected))

    return Panel(table, title=f"[bold]{title}[/bold]", border_style="blue")


def session_table(sessions: list[Session], max_rows: int = 20) -> Table:
    """Table of sessions sorted by date descending."""
    table = Table(title="Sessions", border_style="dim")
    table.add_column("#", style="dim", width=4)
    table.add_column("Date", style="cyan", width=16)
    table.add_column("Title", style="white", max_width=40, overflow="ellipsis")
    table.add_column("Duration", style="green", justify="right", width=8)
    table.add_column("Tokens", style="yellow", justify="right", width=8)
    table.add_column("Cost", style="red", justify="right", width=9)
    table.add_column("Branch", style="magenta", max_width=20, overflow="ellipsis")

    sorted_sessions = sorted(sessions, key=lambda s: s.start_time, reverse=True)
    for i, s in enumerate(sorted_sessions[:max_rows], 1):
        table.add_row(
            str(i),
            s.start_time.strftime("%Y-%m-%d %H:%M"),
            s.title or "(no title)",
            duration_format(s.duration_seconds),
            token_format(s.total_tokens),
            cost_format(s.cost),
            s.git_branch or "-",
        )

    if len(sessions) > max_rows:
        table.add_row("", "", f"... and {len(sessions) - max_rows} more", "", "", "", "")

    return table


def group_table(groups: dict[str, list[Session]], group_label: str = "Group") -> Table:
    """Table summarizing groups of sessions."""
    from ..analytics import aggregate

    table = Table(title=f"By {group_label}", border_style="dim")
    table.add_column(group_label, style="cyan", max_width=30, overflow="ellipsis")
    table.add_column("Sessions", style="white", justify="right", width=8)
    table.add_column("Tokens", style="yellow", justify="right", width=10)
    table.add_column("Cost", style="red", justify="right", width=9)
    table.add_column("Duration", style="green", justify="right", width=10)

    sorted_groups = sorted(groups.items(), key=lambda kv: sum(s.cost for s in kv[1]), reverse=True)
    for name, sess in sorted_groups:
        agg = aggregate(sess)
        table.add_row(
            name,
            str(agg.total_sessions),
            token_format(agg.total_tokens),
            cost_format(agg.total_cost),
            duration_format(agg.total_duration_seconds),
        )

    return table


def badge_panel(badges: list[Badge], all_count: int | None = None) -> Panel:
    """Grid of earned badges with icons."""
    if not badges:
        content = Text("No badges earned yet. Keep coding!", style="dim")
    else:
        items = []
        for b in badges:
            items.append(
                Panel(
                    f"{b.icon}\n[bold]{b.name}[/bold]\n[dim]{b.description}[/dim]",
                    width=28,
                    border_style="yellow",
                )
            )
        content = Columns(items, equal=True, expand=False)

    title = "Badges"
    if all_count is not None:
        title += f" ({len(badges)}/{all_count})"

    return Panel(content, title=f"[bold]{title}[/bold]", border_style="yellow")


def player_panel(player: PlayerStats, all_badge_count: int) -> Panel:
    """Player stats summary panel."""
    lines = [
        f"[bold cyan]{player.username}[/bold cyan]",
        "",
        f"[bold]Productivity Score:[/bold] {_score_bar(player.productivity_score)} {player.productivity_score}/100",
        f"[bold]Current Streak:[/bold]     {'🔥 ' * min(player.current_streak, 7)}{player.current_streak} days",
        f"[bold]Longest Streak:[/bold]     {player.longest_streak} days",
        f"[bold]Total Sessions:[/bold]     {player.total_sessions}",
        f"[bold]Total Spent:[/bold]        {cost_format(player.total_cost)}",
        f"[bold]Badges:[/bold]             {len(player.badges)}/{all_badge_count}",
    ]
    return Panel("\n".join(lines), title="[bold]Player Stats[/bold]", border_style="green")


def _score_bar(score: int, width: int = 20) -> str:
    filled = int(score / 100 * width)
    if score >= 70:
        color = "green"
    elif score >= 40:
        color = "yellow"
    else:
        color = "red"
    return f"[{color}]{'█' * filled}{'░' * (width - filled)}[/{color}]"


def timeline_panel(daily_data: list[tuple], days: int = 30) -> Panel:
    """Timeline view with sparkline and daily breakdown."""
    from ..analytics import AggregateStats

    if not daily_data:
        return Panel("No data available", title="Timeline", border_style="blue")

    counts = [d[1].total_sessions for d in daily_data]
    spark = activity_sparkline(counts, width=days)

    table = Table(show_header=True, box=None, padding=(0, 1))
    table.add_column("Date", style="cyan", width=12)
    table.add_column("Sessions", justify="right", width=8)
    table.add_column("Tokens", justify="right", width=10)
    table.add_column("Cost", justify="right", width=9)

    # Show only days with activity
    for dt, agg in daily_data:
        if agg.total_sessions > 0:
            table.add_row(
                str(dt),
                str(agg.total_sessions),
                token_format(agg.total_tokens),
                cost_format(agg.total_cost),
            )

    content = f"[bold]Activity (last {days} days):[/bold]\n{spark}\n\n"
    return Panel(content + "\n", title="[bold]Timeline[/bold]", border_style="blue")


def leaderboard_table(players: list[PlayerStats]) -> Table:
    """Leaderboard ranked by productivity score."""
    table = Table(title="Leaderboard", border_style="yellow")
    table.add_column("Rank", style="bold", width=5)
    table.add_column("User", style="cyan", width=15)
    table.add_column("Score", style="green", justify="right", width=6)
    table.add_column("Streak", style="red", justify="right", width=7)
    table.add_column("Sessions", style="white", justify="right", width=8)
    table.add_column("Badges", style="yellow", justify="right", width=7)

    medals = ["🥇", "🥈", "🥉"]
    for i, p in enumerate(players):
        rank = medals[i] if i < 3 else str(i + 1)
        table.add_row(
            rank,
            p.username,
            str(p.productivity_score),
            f"{p.current_streak}d",
            str(p.total_sessions),
            str(len(p.badges)),
        )

    return table
