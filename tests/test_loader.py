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


def test_load_sessions_with_agents(tmp_path: Path):
    """Sessions with agents/ subfolder should parse agent sub-sessions."""
    root = tmp_path / "sessions"
    root.mkdir()

    # Create parent session
    sdir = root / "session_20260312_160419_21791ae1"
    sdir.mkdir()
    (sdir / "meta.json").write_text(json.dumps({
        "session_id": "parent-session",
        "start_time": "2026-03-12T16:04:19+00:00",
        "end_time": "2026-03-12T17:00:00+00:00",
        "title": "Parent session",
        "username": "alice",
        "environment": {"working_directory": "/home/user/project"},
        "stats": {"session_cost": 0.05, "session_total_llm_tokens": 50000},
    }))
    (sdir / "messages.jsonl").write_text('{"role": "user", "content": "hello"}\n')

    # Create agents subfolder with 2 agent sub-sessions
    agents_dir = sdir / "agents"
    agents_dir.mkdir()

    for i, name in enumerate(["explore_20260313_080355_92463e31", "explore_20260313_080414_8d1ded73"]):
        agent_dir = agents_dir / name
        agent_dir.mkdir()
        (agent_dir / "meta.json").write_text(json.dumps({
            "session_id": f"agent-{i}",
            "start_time": f"2026-03-13T08:0{i}:00+00:00",
            "end_time": f"2026-03-13T08:0{i + 1}:00+00:00",
            "title": f"Explore agent {i}",
            "username": "alice",
            "environment": {"working_directory": "/home/user/project"},
            "stats": {"session_cost": 0.01, "session_total_llm_tokens": 5000},
        }))
        (agent_dir / "messages.jsonl").write_text('{"role": "user", "content": "search"}\n')

    sessions = load_sessions(root)
    assert len(sessions) == 1

    parent = sessions[0]
    assert parent.session_id == "parent-session"
    assert parent.agent_count == 2
    assert len(parent.agents) == 2
    assert parent.agents[0].title == "Explore agent 0"
    assert parent.agents[1].title == "Explore agent 1"

    # Check aggregated costs/tokens
    assert parent.cost == 0.05
    assert parent.total_cost_with_agents == 0.05 + 0.01 + 0.01
    assert parent.total_tokens_with_agents == 50000 + 5000 + 5000


def test_load_sessions_with_agents_messages(tmp_path: Path):
    """Agent messages should be loaded when load_messages=True."""
    root = tmp_path / "sessions"
    root.mkdir()

    sdir = root / "session_20260312_000000_test"
    sdir.mkdir()
    (sdir / "meta.json").write_text(json.dumps({
        "session_id": "parent",
        "start_time": "2026-03-12T00:00:00+00:00",
        "stats": {},
    }))
    (sdir / "messages.jsonl").write_text('{"role": "user", "content": "hello"}\n')

    agent_dir = sdir / "agents" / "explore_20260312_000100_abc"
    agent_dir.mkdir(parents=True)
    (agent_dir / "meta.json").write_text(json.dumps({
        "session_id": "agent-0",
        "start_time": "2026-03-12T00:01:00+00:00",
        "stats": {},
    }))
    (agent_dir / "messages.jsonl").write_text('{"role": "user", "content": "search code"}\n{"role": "assistant", "content": "found it"}\n')

    sessions = load_sessions(root, load_messages=True)
    parent = sessions[0]
    assert len(parent.messages) == 1
    assert len(parent.agents) == 1
    assert len(parent.agents[0].messages) == 2
