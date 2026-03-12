from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .loader import _parse_session
from .models import Session


class SessionWatcher:
    """Watches a sessions directory for new/updated sessions."""

    def __init__(self, sessions_dir: Path):
        self.sessions_dir = sessions_dir
        self._sessions: dict[str, Session] = {}  # directory_name -> Session
        self._mtimes: dict[str, float] = {}  # directory_name -> meta.json mtime
        self._do_refresh()

    @property
    def sessions(self) -> list[Session]:
        return sorted(self._sessions.values(), key=lambda s: s.start_time)

    def refresh(self) -> list[Session]:
        """Rescan directory, load new sessions, reload changed ones. Returns updated list."""
        self._do_refresh()
        return self.sessions

    def _do_refresh(self) -> None:
        if not self.sessions_dir.exists():
            return

        current_dirs: set[str] = set()

        for entry in self.sessions_dir.iterdir():
            if not entry.is_dir():
                continue
            meta_path = entry / "meta.json"
            if not meta_path.exists():
                continue

            dir_name = entry.name
            current_dirs.add(dir_name)

            try:
                mtime = meta_path.stat().st_mtime
            except OSError:
                continue

            # Skip if already loaded and not modified
            if dir_name in self._mtimes and self._mtimes[dir_name] == mtime:
                continue

            # New or modified session
            session = _parse_session(entry, load_messages=False)
            if session:
                self._sessions[dir_name] = session
                self._mtimes[dir_name] = mtime

        # Remove sessions whose directories no longer exist
        removed = set(self._sessions.keys()) - current_dirs
        for name in removed:
            del self._sessions[name]
            self._mtimes.pop(name, None)

    def find_active_session(self) -> Session | None:
        """Find the most recent session that has no end_time (still running)."""
        active = [s for s in self._sessions.values() if s.end_time is None]
        if not active:
            return None
        return max(active, key=lambda s: s.start_time)

    def find_latest_session(self) -> Session | None:
        """Find the most recent session."""
        if not self._sessions:
            return None
        return max(self._sessions.values(), key=lambda s: s.start_time)

    def get_session_dir(self, session: Session) -> Path:
        return self.sessions_dir / session.directory_name
