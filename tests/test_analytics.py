from __future__ import annotations

from vibe_logger.analytics import (
    aggregate, group_by_project, group_by_branch, group_by_user,
    group_by_date, timeline,
)
from vibe_logger.models import Session


def test_aggregate(sample_sessions: list[Session]):
    agg = aggregate(sample_sessions)
    assert agg.total_sessions == 5
    assert agg.total_cost > 0
    assert agg.total_tokens > 0
    assert agg.avg_cost_per_session > 0
    assert agg.total_tool_calls_succeeded > 0


def test_aggregate_empty():
    agg = aggregate([])
    assert agg.total_sessions == 0
    assert agg.total_cost == 0.0


def test_group_by_project(sample_sessions: list[Session]):
    groups = group_by_project(sample_sessions)
    assert "project-a" in groups
    assert "project-b" in groups
    assert len(groups["project-a"]) + len(groups["project-b"]) == 5


def test_group_by_branch(sample_sessions: list[Session]):
    groups = group_by_branch(sample_sessions)
    assert "main" in groups
    assert "feature/x" in groups


def test_group_by_user(sample_sessions: list[Session]):
    groups = group_by_user(sample_sessions)
    assert "alice" in groups
    assert "bob" in groups
    assert len(groups["alice"]) == 3
    assert len(groups["bob"]) == 2


def test_group_by_date(sample_sessions: list[Session]):
    groups = group_by_date(sample_sessions)
    assert len(groups) == 5  # 5 different days


def test_timeline(sample_sessions: list[Session]):
    data = timeline(sample_sessions, days=10)
    assert len(data) == 10
    # Each entry is (date, AggregateStats)
    dates = [d for d, _ in data]
    assert dates == sorted(dates)
    # At least some days should have sessions
    active_days = sum(1 for _, agg in data if agg.total_sessions > 0)
    assert active_days == 5
