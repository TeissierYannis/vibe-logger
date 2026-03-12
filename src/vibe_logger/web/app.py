from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ..watcher import SessionWatcher
from . import api, ws


def create_app(sessions_dir: Path) -> FastAPI:
    app = FastAPI(title="vibe-logger", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Initialize shared watcher
    watcher = SessionWatcher(Path(sessions_dir))
    api.watcher = watcher
    ws.watcher = watcher

    app.include_router(api.router)
    app.include_router(ws.router)

    # Serve built frontend
    static_dir = Path(__file__).parent.parent.parent.parent / "web" / "dist"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")

    return app
