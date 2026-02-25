"""Audit log query endpoint."""

from fastapi import APIRouter, Query
from typing import Optional

import store
from models import AuditEvent

router = APIRouter()


@router.get("", response_model=list[AuditEvent])
async def list_audit_events(
    case_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    actor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    result = list(store.audit_log)

    if case_id:
        result = [e for e in result if e.case_id == case_id]
    if action:
        result = [e for e in result if e.action == action]
    if actor:
        q = actor.lower()
        result = [e for e in result if q in e.actor.lower()]

    # Sort by timestamp descending (newest first)
    result.sort(key=lambda e: e.timestamp, reverse=True)

    return result[offset : offset + limit]
