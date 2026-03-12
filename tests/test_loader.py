from __future__ import annotations

import json
from pathlib import Path

from vibe_logger.loader import load_sessions, load_session_messages


def test_load_sessions_basic(sessions_dir: Path):
    sessions = load_sessions(sessions_dir)
    assert len(sessions) == 5
    assert all(s.session_id for s in sessions)


def test_load_sessions_without_messages(sessions_dir: Path):
    sessions = load_sessions(sessions_dir, load_messages=False)
    for s in sessions:
        assert s.messages == []


def test_load_sessions_with_messages(sessions_dir: Path):
    sessions = load_sessions(sessions_dir, load_messages=True)
    for s in sessions:
        assert len(s.messages) == 4
        assert s.messages[0].role == "user"
        assert s.messages[1].role == "assistant"
        assert len(s.messages[1].tool_calls) == 1
        assert s.messages[1].tool_calls[0].name == "write_file"


def test_load_session_messages(session_dir: Path):
    messages = load_session_messages(session_dir)
    assert len(messages) == 4
    assert messages[0].content == "Hello world"
    assert messages[2].role == "tool"
    assert messages[2].name == "write_file"


def test_load_sessions_empty_dir(tmp_path: Path):
    sessions = load_sessions(tmp_path)
    assert sessions == []


def test_load_sessions_nonexistent_dir(tmp_path: Path):
    sessions = load_sessions(tmp_path / "nonexistent")
    assert sessions == []


def test_load_sessions_malformed_meta(tmp_path: Path):
    sdir = tmp_path / "session_bad"
    sdir.mkdir()
    (sdir / "meta.json").write_text("not valid json")
    sessions = load_sessions(tmp_path)
    assert sessions == []


def test_session_properties(sessions_dir: Path):
    sessions = load_sessions(sessions_dir)
    s = sessions[0]
    assert s.duration_seconds > 0
    assert s.cost >= 0
    assert s.total_tokens > 0
    assert s.project_name in ("project-a", "project-b")
    assert s.tools_available == ["write_file", "bash"]
