from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

from .models import Session


@dataclass
class AggregateStats:
    total_sessions: int = 0
    total_cost: float = 0.0
    total_tokens: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_duration_seconds: float = 0.0
    total_steps: int = 0
    total_tool_calls_succeeded: int = 0
    total_tool_calls_failed: int = 0
    total_tool_calls_rejected: int = 0
    avg_tokens_per_second: float = 0.0
    avg_cost_per_session: float = 0.0
    avg_duration_per_session: float = 0.0
    avg_tokens_per_session: float = 0.0


def aggregate(sessions: list[Session]) -> AggregateStats:
    if not sessions:
        return AggregateStats()

    total_cost = sum(s.cost for s in sessions)
    total_tokens = sum(s.total_tokens for s in sessions)
    total_prompt = sum(s.prompt_tokens for s in sessions)
    total_completion = sum(s.completion_tokens for s in sessions)
    total_duration = sum(s.duration_seconds for s in sessions)
    total_steps = sum(s.steps for s in sessions)
    total_tc_ok = sum(s.tool_calls_succeeded for s in sessions)
    total_tc_fail = sum(s.tool_calls_failed for s in sessions)
    total_tc_rej = sum(s.tool_calls_rejected for s in sessions)

    tps_values = [s.tokens_per_second for s in sessions if s.tokens_per_second > 0]
    avg_tps = sum(tps_values) / len(tps_values) if tps_values else 0.0

    n = len(sessions)
    return AggregateStats(
        total_sessions=n,
        total_cost=total_cost,
        total_tokens=total_tokens,
        total_prompt_tokens=total_prompt,
        total_completion_tokens=total_completion,
        total_duration_seconds=total_duration,
        total_steps=total_steps,
        total_tool_calls_succeeded=total_tc_ok,
        total_tool_calls_failed=total_tc_fail,
        total_tool_calls_rejected=total_tc_rej,
        avg_tokens_per_second=avg_tps,
        avg_cost_per_session=total_cost / n,
        avg_duration_per_session=total_duration / n,
        avg_tokens_per_session=total_tokens / n,
    )


def group_by_project(sessions: list[Session]) -> dict[str, list[Session]]:
    groups: dict[str, list[Session]] = defaultdict(list)
    for s in sessions:
        groups[s.project_name].append(s)
    return dict(groups)


def group_by_branch(sessions: list[Session]) -> dict[str, list[Session]]:
    groups: dict[str, list[Session]] = defaultdict(list)
    for s in sessions:
        branch = s.git_branch or "(no branch)"
        groups[branch].append(s)
    return dict(groups)


def group_by_user(sessions: list[Session]) -> dict[str, list[Session]]:
    groups: dict[str, list[Session]] = defaultdict(list)
    for s in sessions:
        groups[s.username].append(s)
    return dict(groups)


def group_by_date(sessions: list[Session]) -> dict[date, list[Session]]:
    groups: dict[date, list[Session]] = defaultdict(list)
    for s in sessions:
        groups[s.date].append(s)
    return dict(groups)


def timeline(sessions: list[Session], days: int = 30) -> list[tuple[date, AggregateStats]]:
    """Per-day stats for the last N days."""
    if not sessions:
        return []
    today = max(s.date for s in sessions)
    start = today - timedelta(days=days - 1)
    by_date = group_by_date(sessions)
    result = []
    for i in range(days):
        d = start + timedelta(days=i)
        day_sessions = by_date.get(d, [])
        result.append((d, aggregate(day_sessions)))
    return result
