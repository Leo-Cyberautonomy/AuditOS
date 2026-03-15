"""Firestore client singleton and sync->async bridge for ADK tool functions.

Two AsyncClient instances:
- _db: used by FastAPI async routes (runs on main event loop)
- _bg_db: used by ADK sync tool functions via run_async() (runs on background thread loop)

This separation is necessary because gRPC channels in AsyncClient are bound
to the event loop they were created on.
"""

import asyncio
import os
import threading
from google.cloud.firestore_v1.async_client import AsyncClient

_db: AsyncClient | None = None
_bg_db: AsyncClient | None = None
_bg_loop: asyncio.AbstractEventLoop | None = None
_bg_thread: threading.Thread | None = None
_project_id: str | None = None


async def init_firestore(project_id: str | None = None) -> AsyncClient:
    """Initialize Firestore AsyncClient. Call once in FastAPI lifespan."""
    global _db, _bg_loop, _bg_thread, _bg_db, _project_id
    _project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT")
    _db = AsyncClient(project=_project_id)

    # Start a dedicated background event loop for sync->async bridge
    _bg_loop = asyncio.new_event_loop()
    _bg_thread = threading.Thread(target=_bg_loop.run_forever, daemon=True, name="firestore-bg")
    _bg_thread.start()

    # Create a separate AsyncClient on the background loop
    future = asyncio.run_coroutine_threadsafe(_create_bg_client(), _bg_loop)
    future.result(timeout=30)

    return _db


async def _create_bg_client():
    """Create the background AsyncClient on the background event loop."""
    global _bg_db
    _bg_db = AsyncClient(project=_project_id)


def get_db() -> AsyncClient:
    """Get the correct Firestore AsyncClient based on current thread.

    - Main thread / FastAPI async routes → _db (created on main loop)
    - Background 'firestore-bg' thread → _bg_db (created on bg loop)
    """
    if _db is None:
        raise RuntimeError("Firestore not initialized. Call init_firestore() in lifespan.")
    # If we're on the background thread, use the bg client
    current = threading.current_thread()
    if current.name == "firestore-bg" and _bg_db is not None:
        return _bg_db
    return _db


def run_async(coro):
    """Execute an async coroutine from a synchronous context (ADK tool functions).

    Uses a dedicated background thread's event loop with its own AsyncClient
    to avoid deadlocking and gRPC channel conflicts.
    """
    if _bg_loop is None:
        raise RuntimeError("Background loop not started. Call init_firestore() first.")
    try:
        future = asyncio.run_coroutine_threadsafe(coro, _bg_loop)
        return future.result(timeout=30)
    except TimeoutError:
        raise RuntimeError("Firestore operation timed out (30s)")
    except Exception as e:
        raise RuntimeError(f"Firestore operation failed: {e}")
