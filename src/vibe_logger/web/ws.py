from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..watcher import SessionWatcher
from .api import _session_to_dict, _message_to_dict

router = APIRouter()

watcher: SessionWatcher | None = None


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
                messages_path = session_dir / "messages.jsonl"
                if not messages_path.exists():
                    continue

                pos = live_positions.get(s.session_id, 0)
                try:
                    with open(messages_path, "r", encoding="utf-8") as f:
                        f.seek(pos)
                        new_lines = f.readlines()
                        live_positions[s.session_id] = f.tell()
                except OSError:
                    continue

                for line in new_lines:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        await ws.send_json({
                            "type": "live_message",
                            "session_id": s.session_id,
                            "message": data,
                        })
                    except (json.JSONDecodeError, Exception):
                        continue

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
