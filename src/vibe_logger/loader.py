from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .models import Message, Session, ToolCall


def load_sessions(sessions_dir: Path, load_messages: bool = False) -> list[Session]:
    """Scan session directories, parse meta.json, optionally parse messages.jsonl."""
    sessions: list[Session] = []
    if not sessions_dir.exists():
        return sessions
    for entry in sorted(sessions_dir.iterdir()):
        if not entry.is_dir():
            continue
        meta_path = entry / "meta.json"
        if not meta_path.exists():
            continue
        session = _parse_session(entry, load_messages)
        if session:
            sessions.append(session)
    return sessions


def load_session_messages(session_dir: Path) -> list[Message]:
    """Load messages for a single session directory."""
    messages_path = session_dir / "messages.jsonl"
    if not messages_path.exists():
        return []
    return _parse_messages(messages_path)


def _parse_session(session_dir: Path, load_messages: bool) -> Session | None:
    """Parse one session directory. Returns None on malformed data."""
    try:
        meta = json.loads((session_dir / "meta.json").read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    try:
        start_time = datetime.fromisoformat(meta["start_time"])
    except (KeyError, ValueError):
        return None

    end_time = None
    if meta.get("end_time"):
        try:
            end_time = datetime.fromisoformat(meta["end_time"])
        except ValueError:
            pass

    env = meta.get("environment", {})
    tools = [t["function"]["name"] for t in meta.get("tools_available", [])
             if "function" in t and "name" in t["function"]]

    messages: list[Message] = []
    if load_messages:
        messages_path = session_dir / "messages.jsonl"
        if messages_path.exists():
            messages = _parse_messages(messages_path)

    return Session(
        session_id=meta.get("session_id", session_dir.name),
        directory_name=session_dir.name,
        start_time=start_time,
        end_time=end_time,
        title=meta.get("title", ""),
        username=meta.get("username", "unknown"),
        working_directory=env.get("working_directory", ""),
        git_branch=meta.get("git_branch"),
        git_commit=meta.get("git_commit"),
        stats=meta.get("stats", {}),
        messages=messages,
        tools_available=tools,
    )


def _parse_messages(messages_path: Path) -> list[Message]:
    """Parse messages.jsonl line by line, skip malformed lines."""
    messages: list[Message] = []
    try:
        text = messages_path.read_text(encoding="utf-8")
    except OSError:
        return messages

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        tool_calls: list[ToolCall] = []
        for tc in data.get("tool_calls", []):
            fn = tc.get("function", {})
            tool_calls.append(ToolCall(
                id=tc.get("id", ""),
                name=fn.get("name", ""),
                arguments=fn.get("arguments", ""),
            ))

        messages.append(Message(
            role=data.get("role", "unknown"),
            content=data.get("content"),
            message_id=data.get("message_id"),
            tool_calls=tool_calls,
            name=data.get("name"),
            tool_call_id=data.get("tool_call_id"),
        ))

    return messages
