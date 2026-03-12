from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

from vibe_logger.models import Session, Message, ToolCall


@pytest.fixture
def sample_meta() -> dict:
    return {
        "session_id": "abc123-def456",
        "start_time": "2026-03-10T10:00:00+00:00",
        "end_time": "2026-03-10T10:05:30+00:00",
        "git_commit": "deadbeef",
        "git_branch": "main",
        "environment": {"working_directory": "/home/user/my-project"},
        "username": "testuser",
        "stats": {
            "steps": 5,
            "session_prompt_tokens": 10000,
            "session_completion_tokens": 500,
            "tool_calls_agreed": 3,
            "tool_calls_rejected": 0,
            "tool_calls_failed": 1,
            "tool_calls_succeeded": 3,
            "context_tokens": 5000,
            "tokens_per_second": 15.5,
            "input_price_per_million": 0.4,
            "output_price_per_million": 2.0,
            "session_total_llm_tokens": 10500,
            "session_cost": 0.005,
        },
        "title": "Test session title",
        "total_messages": 4,
        "tools_available": [
            {"type": "function", "function": {"name": "write_file", "description": "Write a file"}},
            {"type": "function", "function": {"name": "bash", "description": "Run bash"}},
        ],
    }


@pytest.fixture
def sample_messages_jsonl() -> str:
    lines = [
        json.dumps({"role": "user", "content": "Hello world", "message_id": "msg-1"}),
        json.dumps({
            "role": "assistant",
            "tool_calls": [{"id": "tc-1", "index": 0, "function": {"name": "write_file", "arguments": '{"path": "test.txt"}'}}],
            "message_id": "msg-2",
        }),
        json.dumps({"role": "tool", "content": "File written", "name": "write_file", "tool_call_id": "tc-1"}),
        json.dumps({"role": "assistant", "content": "Done!", "message_id": "msg-3"}),
    ]
    return "\n".join(lines) + "\n"


@pytest.fixture
def session_dir(tmp_path: Path, sample_meta: dict, sample_messages_jsonl: str) -> Path:
    """Create a complete session directory."""
    sdir = tmp_path / "session_20260310_100000_abc123"
    sdir.mkdir()
    (sdir / "meta.json").write_text(json.dumps(sample_meta))
    (sdir / "messages.jsonl").write_text(sample_messages_jsonl)
    return sdir


@pytest.fixture
def sessions_dir(tmp_path: Path, sample_meta: dict, sample_messages_jsonl: str) -> Path:
    """Create a sessions dir with multiple sessions."""
    root = tmp_path / "sessions"
    root.mkdir()

    for i in range(5):
        meta = dict(sample_meta)
        meta["session_id"] = f"session-{i}"
        day = 10 + i
        meta["start_time"] = f"2026-03-{day:02d}T10:00:00+00:00"
        meta["end_time"] = f"2026-03-{day:02d}T10:05:30+00:00"
        meta["stats"] = dict(sample_meta["stats"])
        meta["stats"]["session_cost"] = 0.005 * (i + 1)
        meta["stats"]["session_total_llm_tokens"] = 10000 * (i + 1)
        meta["username"] = "alice" if i < 3 else "bob"

        if i % 2 == 0:
            meta["environment"] = {"working_directory": "/home/user/project-a"}
            meta["git_branch"] = "main"
        else:
            meta["environment"] = {"working_directory": "/home/user/project-b"}
            meta["git_branch"] = "feature/x"

        sdir = root / f"session_202603{day:02d}_100000_{i:08d}"
        sdir.mkdir()
        (sdir / "meta.json").write_text(json.dumps(meta))
        (sdir / "messages.jsonl").write_text(sample_messages_jsonl)

    return root


@pytest.fixture
def sample_sessions(sessions_dir: Path) -> list[Session]:
    from vibe_logger.loader import load_sessions
    return load_sessions(sessions_dir)
