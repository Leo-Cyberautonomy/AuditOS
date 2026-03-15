"""Firestore client singleton and sync->async bridge for ADK tool functions."""

import asyncio
import threading
from google.cloud.firestore_v1.async_client import AsyncClient

_db: AsyncClient | None = None
_bg_loop: asyncio.AbstractEventLoop | None = None
_bg_thread: threading.Thread | None = None


async def init_firestore(project_id: str | None = None) -> AsyncClient:
    """Initialize Firestore AsyncClient. Call once in FastAPI lifespan."""
    global _db, _bg_loop, _bg_thread
    _db = AsyncClient(project=project_id)

    # Start a dedicated background event loop for sync->async bridge
    _bg_loop = asyncio.new_event_loop()
    _bg_thread = threading.Thread(target=_bg_loop.run_forever, daemon=True, name="firestore-bg")
    _bg_thread.start()

    return _db


def get_db() -> AsyncClient:
    """Get the Firestore AsyncClient. Raises if not initialized."""
    if _db is None:
        raise RuntimeError("Firestore not initialized. Call init_firestore() in lifespan.")
    return _db


def run_async(coro):
    """Execute an async coroutine from a synchronous context (ADK tool functions).

    Uses a dedicated background thread's event loop to avoid deadlocking
    the main FastAPI event loop.
    """
    if _bg_loop is None:
        raise RuntimeError("Background loop not started. Call init_firestore() first.")
    future = asyncio.run_coroutine_threadsafe(coro, _bg_loop)
    return future.result(timeout=15)
