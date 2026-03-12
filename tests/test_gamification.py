from __future__ import annotations

from vibe_logger.gamification import (
    compute_player_stats, compute_leaderboard, _BADGE_DEFS,
)
from vibe_logger.analytics import group_by_user
from vibe_logger.models import Session


def test_compute_player_stats(sample_sessions: list[Session]):
    alice_sessions = [s for s in sample_sessions if s.username == "alice"]
    player = compute_player_stats("alice", alice_sessions)
    assert player.username == "alice"
    assert 0 <= player.productivity_score <= 100
    assert player.total_sessions == 3
    assert player.total_cost > 0
    # Should have "First Steps" badge at minimum
    badge_ids = [b.id for b in player.badges]
    assert "first_session" in badge_ids


def test_compute_leaderboard(sample_sessions: list[Session]):
    users = group_by_user(sample_sessions)
    leaderboard = compute_leaderboard(users)
    assert len(leaderboard) == 2
    # Sorted by productivity_score desc
    assert leaderboard[0].productivity_score >= leaderboard[1].productivity_score


def test_badges_empty():
    player = compute_player_stats("nobody", [])
    assert player.badges == []
    assert player.productivity_score == 0
    assert player.current_streak == 0


def test_all_badge_defs_have_required_fields():
    for bid, name, desc, icon, predicate in _BADGE_DEFS:
        assert bid
        assert name
        assert desc
        assert icon
        assert callable(predicate)
