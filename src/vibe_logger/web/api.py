from __future__ import annotations

from dataclasses import asdict
from datetime import date

from fastapi import APIRouter, HTTPException

from ..analytics import aggregate, group_by_project, group_by_branch, group_by_user, timeline
from ..gamification import compute_player_stats, compute_leaderboard, _BADGE_DEFS
from ..loader import load_session_messages
from ..watcher import SessionWatcher

router = APIRouter(prefix="/api")

# Injected by app.py at startup
watcher: SessionWatcher | None = None


def _session_to_dict(s) -> dict:
    return {
        "session_id": s.session_id,
        "directory_name": s.directory_name,
        "start_time": s.start_time.isoformat(),
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "title": s.title,
        "username": s.username,
        "working_directory": s.working_directory,
        "project_name": s.project_name,
        "git_branch": s.git_branch,
        "git_commit": s.git_commit,
        "stats": s.stats,
        "duration_seconds": s.duration_seconds,
        "cost": s.cost,
        "total_tokens": s.total_tokens,
        "tools_available": s.tools_available,
        "is_active": s.end_time is None,
    }


def _message_to_dict(m) -> dict:
    d = {
        "role": m.role,
        "content": m.content,
        "message_id": m.message_id,
        "name": m.name,
        "tool_call_id": m.tool_call_id,
    }
    if m.tool_calls:
        d["tool_calls"] = [{"id": tc.id, "name": tc.name, "arguments": tc.arguments} for tc in m.tool_calls]
    return d


def _agg_to_dict(agg) -> dict:
    return asdict(agg)


@router.get("/sessions")
def get_sessions():
    assert watcher is not None
    watcher.refresh()
    return [_session_to_dict(s) for s in watcher.sessions]


@router.get("/sessions/{directory_name}")
def get_session(directory_name: str):
    assert watcher is not None
    watcher.refresh()
    session = next((s for s in watcher.sessions if s.directory_name == directory_name), None)
    if not session:
        raise HTTPException(404, "Session not found")

    session_dir = watcher.get_session_dir(session)
    messages = load_session_messages(session_dir)
    result = _session_to_dict(session)
    result["messages"] = [_message_to_dict(m) for m in messages]
    return result


@router.get("/stats")
def get_stats():
    assert watcher is not None
    watcher.refresh()
    return _agg_to_dict(aggregate(watcher.sessions))


@router.get("/stats/timeline")
def get_timeline(days: int = 30):
    assert watcher is not None
    watcher.refresh()
    data = timeline(watcher.sessions, days=days)
    return [{"date": str(d), **_agg_to_dict(agg)} for d, agg in data]


@router.get("/stats/projects")
def get_projects():
    assert watcher is not None
    watcher.refresh()
    groups = group_by_project(watcher.sessions)
    return {name: {"sessions": len(ss), **_agg_to_dict(aggregate(ss))} for name, ss in groups.items()}


@router.get("/stats/branches")
def get_branches():
    assert watcher is not None
    watcher.refresh()
    groups = group_by_branch(watcher.sessions)
    return {name: {"sessions": len(ss), **_agg_to_dict(aggregate(ss))} for name, ss in groups.items()}


@router.get("/gamification")
def get_gamification():
    assert watcher is not None
    watcher.refresh()
    users = group_by_user(watcher.sessions)
    leaderboard = compute_leaderboard(users)

    return {
        "total_badges": len(_BADGE_DEFS),
        "all_badges": [{"id": b[0], "name": b[1], "description": b[2], "icon": b[3]} for b in _BADGE_DEFS],
        "players": [
            {
                "username": p.username,
                "productivity_score": p.productivity_score,
                "current_streak": p.current_streak,
                "longest_streak": p.longest_streak,
                "total_sessions": p.total_sessions,
                "total_cost": p.total_cost,
                "badges": [{"id": b.id, "name": b.name, "description": b.description, "icon": b.icon} for b in p.badges],
            }
            for p in leaderboard
        ],
    }
