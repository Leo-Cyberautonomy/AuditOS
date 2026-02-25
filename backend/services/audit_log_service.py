"""Audit log event helper. Called by all mutation endpoints."""

import store
from models.audit_log import AuditEvent


def log_event(
    action: str,
    case_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: str | None = None,
    actor: str = "auditor",
) -> AuditEvent:
    event = AuditEvent(
        id=store.generate_id(),
        case_id=case_id,
        action=action,
        actor=actor,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        timestamp=store.now_iso(),
    )
    store.audit_log.append(event)
    return event
