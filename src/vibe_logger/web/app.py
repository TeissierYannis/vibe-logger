from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

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

    # Serve built frontend with SPA fallback
    static_dir = Path(__file__).parent.parent.parent.parent / "web" / "dist"

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str) -> Response:
        if not static_dir.exists():
            return Response(content="Frontend not built", status_code=404)
        # Try to serve the exact file first
        file_path = static_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        # SPA fallback: serve index.html for all non-file routes
        index = static_dir / "index.html"
        if index.is_file():
            return FileResponse(str(index))
        return Response(content="Frontend not built", status_code=404)

    return app
