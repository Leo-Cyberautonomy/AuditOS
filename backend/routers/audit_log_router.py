"""Audit log query endpoint."""

from fastapi import APIRouter, Query
from typing import Optional

import store_firestore as fs
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
    return await fs.list_audit_events(
        case_id=case_id, action=action, actor=actor, limit=limit, offset=offset
    )
