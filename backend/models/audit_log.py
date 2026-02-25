from pydantic import BaseModel
from typing import Optional, Literal

AuditAction = Literal[
    "case_created",
    "case_updated",
    "case_status_changed",
    "document_uploaded",
    "document_classified",
    "document_deleted",
    "extraction_started",
    "extraction_completed",
    "ledger_entry_created",
    "ledger_entry_updated",
    "ledger_entry_deleted",
    "review_item_created",
    "review_approved",
    "review_rejected",
    "review_deferred",
    "measure_created",
    "measure_updated",
    "report_generated",
    "report_section_edited",
    "export_generated",
    "compliance_prefill_generated",
]


class AuditEvent(BaseModel):
    id: str
    case_id: Optional[str] = None
    action: AuditAction
    actor: str = "auditor"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    detail: Optional[str] = None
    timestamp: str
