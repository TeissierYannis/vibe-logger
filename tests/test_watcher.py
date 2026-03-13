from __future__ import annotations

import json
import time
from pathlib import Path

from vibe_logger.watcher import SessionWatcher


def test_watcher_initial_load(sessions_dir: Path):
    watcher = SessionWatcher(sessions_dir)
    assert len(watcher.sessions) == 5


def test_watcher_detects_new_session(sessions_dir: Path, sample_meta: dict):
    watcher = SessionWatcher(sessions_dir)
    assert len(watcher.sessions) == 5

    # Add a new session
    new_dir = sessions_dir / "session_20260320_100000_new"
    new_dir.mkdir()
    meta = dict(sample_meta)
    meta["session_id"] = "new-session"
    meta["start_time"] = "2026-03-20T10:00:00+00:00"
    meta["end_time"] = "2026-03-20T10:05:00+00:00"
    (new_dir / "meta.json").write_text(json.dumps(meta))

    sessions = watcher.refresh()
    assert len(sessions) == 6


def test_watcher_detects_updated_session(sessions_dir: Path):
    watcher = SessionWatcher(sessions_dir)
    first_session = watcher.sessions[0]
    original_cost = first_session.cost

    # Update the meta.json with new stats
    session_dir = sessions_dir / first_session.directory_name
    meta_path = session_dir / "meta.json"
    meta = json.loads(meta_path.read_text())
    meta["stats"]["session_cost"] = 99.99
    # Ensure mtime changes
    time.sleep(0.05)
    meta_path.write_text(json.dumps(meta))

    sessions = watcher.refresh()
    updated = next(s for s in sessions if s.directory_name == first_session.directory_name)
    assert updated.cost == 99.99


def test_watcher_handles_removed_session(sessions_dir: Path):
    watcher = SessionWatcher(sessions_dir)
    assert len(watcher.sessions) == 5

    # Remove a session directory
    import shutil
    first_dir = next(sessions_dir.iterdir())
    shutil.rmtree(first_dir)

    sessions = watcher.refresh()
    assert len(sessions) == 4


def test_watcher_find_active_session(sessions_dir: Path, sample_meta: dict):
    watcher = SessionWatcher(sessions_dir)

    # All sessions have end_time, so no active session
    assert watcher.find_active_session() is None

    # Add an active session (no end_time)
    new_dir = sessions_dir / "session_20260320_120000_active"
    new_dir.mkdir()
    meta = dict(sample_meta)
    meta["session_id"] = "active-session"
    meta["start_time"] = "2026-03-20T12:00:00+00:00"
    meta["end_time"] = None
    (new_dir / "meta.json").write_text(json.dumps(meta))

    watcher.refresh()
    active = watcher.find_active_session()
    assert active is not None
    assert active.session_id == "active-session"


def test_watcher_find_latest_session(sessions_dir: Path):
    watcher = SessionWatcher(sessions_dir)
    latest = watcher.find_latest_session()
    assert latest is not None
    # The latest session should have the most recent start_time
    for s in watcher.sessions:
        assert s.start_time <= latest.start_time


def test_watcher_empty_dir(tmp_path: Path):
    watcher = SessionWatcher(tmp_path)
    assert watcher.sessions == []
    assert watcher.find_active_session() is None
    assert watcher.find_latest_session() is None


def test_watcher_nonexistent_dir(tmp_path: Path):
    watcher = SessionWatcher(tmp_path / "nonexistent")
    assert watcher.sessions == []
