"""Audit log event helper. Called by all mutation endpoints."""

import store_firestore as fs
from store import generate_id, now_iso
from models.audit_log import AuditEvent


async def log_event(
    action: str,
    case_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: str | None = None,
    actor: str = "auditor",
) -> AuditEvent:
    event = AuditEvent(
        id=generate_id(),
        case_id=case_id,
        action=action,
        actor=actor,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        timestamp=now_iso(),
    )
    await fs.append_audit_event(event)
    return event
