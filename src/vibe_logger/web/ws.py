from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..watcher import SessionWatcher
from .api import _session_to_dict, _message_to_dict

router = APIRouter()

watcher: SessionWatcher | None = None


async def _stream_messages(
    ws: WebSocket,
    messages_path: Path,
    session_id: str,
    live_positions: dict[str, int],
    key: str | None = None,
    agent_name: str | None = None,
) -> None:
    """Stream new lines from a messages.jsonl file."""
    if not messages_path.exists():
        return
    pos_key = key or session_id
    pos = live_positions.get(pos_key, 0)
    try:
        with open(messages_path, "r", encoding="utf-8") as f:
            f.seek(pos)
            new_lines = f.readlines()
            live_positions[pos_key] = f.tell()
    except OSError:
        return
    for line in new_lines:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            msg: dict = {
                "type": "live_message",
                "session_id": session_id,
                "message": data,
            }
            if agent_name:
                msg["agent_name"] = agent_name
            await ws.send_json(msg)
        except (json.JSONDecodeError, Exception):
            continue


@router.websocket("/api/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    assert watcher is not None

    prev_count = len(watcher.sessions)
    prev_session_ids = {s.session_id for s in watcher.sessions}

    # Track live session message positions
    live_positions: dict[str, int] = {}

    try:
        while True:
            watcher.refresh()
            current_sessions = watcher.sessions
            current_ids = {s.session_id for s in current_sessions}

            # Notify about new sessions
            new_ids = current_ids - prev_session_ids
            for s in current_sessions:
                if s.session_id in new_ids:
                    await ws.send_json({
                        "type": "new_session",
                        "session": _session_to_dict(s),
                    })

            # Check for active sessions and stream new messages
            for s in current_sessions:
                if s.end_time is not None:
                    continue
                session_dir = watcher.get_session_dir(s)

                # Stream main session messages
                await _stream_messages(ws, session_dir / "messages.jsonl", s.session_id, live_positions)

                # Stream agent sub-session messages
                agents_dir = session_dir / "agents"
                if agents_dir.is_dir():
                    for agent_entry in sorted(agents_dir.iterdir()):
                        if agent_entry.is_dir():
                            agent_msg_path = agent_entry / "messages.jsonl"
                            agent_key = f"{s.session_id}:{agent_entry.name}"
                            await _stream_messages(ws, agent_msg_path, s.session_id, live_positions, key=agent_key, agent_name=agent_entry.name)

            # Send updated stats
            from ..analytics import aggregate
            from dataclasses import asdict
            agg = aggregate(current_sessions)
            await ws.send_json({
                "type": "stats_update",
                "stats": asdict(agg),
                "session_count": len(current_sessions),
            })

            prev_session_ids = current_ids
            prev_count = len(current_sessions)

            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
