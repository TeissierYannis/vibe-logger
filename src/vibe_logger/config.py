import os
from pathlib import Path


def get_vibe_home() -> Path:
    """VIBE_HOME env var > ~/.vibe/"""
    return Path(os.environ.get("VIBE_HOME", Path.home() / ".vibe"))


def get_sessions_dir(custom_path: str | None = None) -> Path:
    """CLI --path arg > VIBE_HOME/logs/session/"""
    if custom_path:
        return Path(custom_path)
    return get_vibe_home() / "logs" / "session"
