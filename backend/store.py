"""Minimal store helpers — ID generation, timestamps, blob storage, and seed loading.

All persistent data now lives in Firestore (see store_firestore.py).
Only document_blobs remain in-memory (binary file content).
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict


# ── In-memory blob storage (binary file content, not suited for Firestore) ───

document_blobs: Dict[str, bytes] = {}


# ── Helpers ─────────────────────────────────────────────────────────────────

def generate_id() -> str:
    return str(uuid.uuid4())[:8]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── Seed Loader ─────────────────────────────────────────────────────────────

SEED_DIR = Path(__file__).parent / "data" / "seed"


def _load_seed_file(filename: str) -> dict:
    path = SEED_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
