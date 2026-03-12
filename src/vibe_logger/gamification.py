from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from .models import Session


@dataclass
class Badge:
    id: str
    name: str
    description: str
    icon: str


@dataclass
class PlayerStats:
    username: str
    productivity_score: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    badges: list[Badge] = field(default_factory=list)
    total_sessions: int = 0
    total_cost: float = 0.0


def _unique_dates(sessions: list[Session]) -> list[date]:
    """Sorted unique session dates."""
    return sorted({s.date for s in sessions})


def _compute_streaks(sessions: list[Session]) -> tuple[int, int]:
    """Returns (current_streak, longest_streak)."""
    dates = _unique_dates(sessions)
    if not dates:
        return 0, 0

    longest = 1
    current = 1
    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1

    # Check if the streak is still active (last date is today or yesterday)
    today = date.today()
    if dates[-1] < today and (today - dates[-1]).days > 1:
        current_streak = 0
    else:
        # Recompute current streak from the end
        current_streak = 1
        for i in range(len(dates) - 1, 0, -1):
            if (dates[i] - dates[i - 1]).days == 1:
                current_streak += 1
            else:
                break

    return current_streak, longest


def _productivity_score(sessions: list[Session]) -> int:
    """Weighted score 0-100: frequency (40%), tool success rate (30%), speed (30%)."""
    if not sessions:
        return 0

    # Frequency: sessions per day over the last 30 days
    dates = _unique_dates(sessions)
    if len(dates) >= 2:
        span = max((dates[-1] - dates[0]).days, 1)
        freq_ratio = min(len(sessions) / span, 5.0) / 5.0  # cap at 5 sessions/day
    else:
        freq_ratio = 0.1

    # Tool success rate
    total_tc = sum(s.tool_calls_succeeded + s.tool_calls_failed + s.tool_calls_rejected for s in sessions)
    total_ok = sum(s.tool_calls_succeeded for s in sessions)
    success_ratio = total_ok / total_tc if total_tc > 0 else 0.5

    # Speed: avg tokens/sec normalized (0-30 range mapped to 0-1)
    tps_vals = [s.tokens_per_second for s in sessions if s.tokens_per_second > 0]
    avg_tps = sum(tps_vals) / len(tps_vals) if tps_vals else 0.0
    speed_ratio = min(avg_tps / 30.0, 1.0)

    score = int(freq_ratio * 40 + success_ratio * 30 + speed_ratio * 30)
    return max(0, min(100, score))


# Badge registry: (id, name, description, icon, predicate)
_BADGE_DEFS: list[tuple[str, str, str, str, object]] = [
    ("first_session", "First Steps", "Complete your first session", "🐣",
     lambda ss: len(ss) >= 1),
    ("sessions_10", "Getting Started", "Complete 10 sessions", "🔟",
     lambda ss: len(ss) >= 10),
    ("sessions_50", "Veteran", "Complete 50 sessions", "⭐",
     lambda ss: len(ss) >= 50),
    ("sessions_100", "Centurion", "Complete 100 sessions", "💯",
     lambda ss: len(ss) >= 100),
    ("big_spender", "Big Spender", "Spend $10+ total", "💸",
     lambda ss: sum(s.cost for s in ss) >= 10),
    ("penny_pincher", "Penny Pincher", "Complete a session under $0.001", "🪙",
     lambda ss: any(0 < s.cost < 0.001 for s in ss)),
    ("tool_master", "Tool Master", "50+ tool calls in a single session", "🛠️",
     lambda ss: any(s.tool_calls_succeeded >= 50 for s in ss)),
    ("perfect_tools", "Perfect Tools", "100% tool success rate over 10+ calls", "✅",
     lambda ss: any(
         s.tool_calls_succeeded >= 10 and s.tool_calls_failed == 0 and s.tool_calls_rejected == 0
         for s in ss)),
    ("speed_demon", "Speed Demon", "20+ tokens/sec in a session", "⚡",
     lambda ss: any(s.tokens_per_second >= 20 for s in ss)),
    ("streak_7", "Week Warrior", "7-day coding streak", "🔥",
     lambda ss: _compute_streaks(ss)[1] >= 7),
    ("streak_30", "Monthly Machine", "30-day coding streak", "🏆",
     lambda ss: _compute_streaks(ss)[1] >= 30),
    ("night_owl", "Night Owl", "Session started between midnight and 5am", "🦉",
     lambda ss: any(s.start_time.hour < 5 for s in ss)),
    ("early_bird", "Early Bird", "Session started before 7am", "🐦",
     lambda ss: any(5 <= s.start_time.hour < 7 for s in ss)),
    ("marathon", "Marathon Runner", "Session longer than 30 minutes", "🏃",
     lambda ss: any(s.duration_seconds > 1800 for s in ss)),
    ("multi_project", "Polyglot", "Work on 3+ different projects", "🌍",
     lambda ss: len({s.project_name for s in ss}) >= 3),
    ("token_whale", "Token Whale", "Use 1M+ tokens total", "🐋",
     lambda ss: sum(s.total_tokens for s in ss) >= 1_000_000),
]


def _evaluate_badges(sessions: list[Session]) -> list[Badge]:
    earned: list[Badge] = []
    for bid, name, desc, icon, predicate in _BADGE_DEFS:
        try:
            if predicate(sessions):
                earned.append(Badge(id=bid, name=name, description=desc, icon=icon))
        except Exception:
            continue
    return earned


def compute_player_stats(username: str, sessions: list[Session]) -> PlayerStats:
    current_streak, longest_streak = _compute_streaks(sessions)
    return PlayerStats(
        username=username,
        productivity_score=_productivity_score(sessions),
        current_streak=current_streak,
        longest_streak=longest_streak,
        badges=_evaluate_badges(sessions),
        total_sessions=len(sessions),
        total_cost=sum(s.cost for s in sessions),
    )


def compute_leaderboard(sessions_by_user: dict[str, list[Session]]) -> list[PlayerStats]:
    players = [compute_player_stats(user, ss) for user, ss in sessions_by_user.items()]
    return sorted(players, key=lambda p: p.productivity_score, reverse=True)
