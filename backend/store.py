"""In-memory data store for AuditOS. Seeded from JSON files on startup."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from models import (
    Case,
    Company,
    Auditor,
    CaseProgress,
    DocumentMeta,
    LedgerEntry,
    ReviewItem,
    AuditEvent,
    Measure,
    MeasureEvidence,
)
from models.live_session import LiveSession, LiveFinding

# ── Storage dicts keyed by ID ──────────────────────────────────────────────

cases: Dict[str, Case] = {}
documents: Dict[str, DocumentMeta] = {}
document_blobs: Dict[str, bytes] = {}  # raw file content keyed by doc ID
ledger_entries: Dict[str, LedgerEntry] = {}
review_items: Dict[str, ReviewItem] = {}
measures: Dict[str, Measure] = {}
audit_log: List[AuditEvent] = []
live_sessions: Dict[str, LiveSession] = {}
live_findings: Dict[str, LiveFinding] = {}


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


def _seed_case(data: dict) -> None:
    """Load a single case from seed JSON into the store."""
    case_id = data["case_id"]
    ts = data.get("created_at", now_iso())

    # Company & Auditor
    company = Company(**data["company"])
    auditor = Auditor(**data["auditor"])

    # Documents
    for doc in data.get("documents", []):
        doc_obj = DocumentMeta(
            id=doc["id"],
            case_id=case_id,
            filename=doc["filename"],
            file_size=doc.get("file_size", 0),
            mime_type=doc.get("mime_type", "application/octet-stream"),
            category=doc.get("category"),
            category_confidence=doc.get("category_confidence"),
            status=doc.get("status", "extracted"),
            extracted_fields_count=doc.get("extracted_fields_count", 0),
            uploaded_at=doc.get("uploaded_at", ts),
        )
        documents[doc_obj.id] = doc_obj

    # Ledger entries
    for entry in data.get("ledger_entries", []):
        le = LedgerEntry(
            id=entry["id"],
            case_id=case_id,
            month=entry["month"],
            carrier=entry["carrier"],
            value_kwh=entry.get("value_kwh"),
            status=entry.get("status", "confirmed"),
            note=entry.get("note"),
            source_doc_id=entry.get("source_doc_id"),
            confidence=entry.get("confidence"),
            review_status=entry.get("review_status", "pending"),
            created_at=entry.get("created_at", ts),
            updated_at=entry.get("updated_at", ts),
        )
        ledger_entries[le.id] = le

    # Review items
    for item in data.get("review_items", []):
        ri = ReviewItem(
            id=item["id"],
            case_id=case_id,
            category=item["category"],
            priority=item["priority"],
            title=item["title"],
            description=item.get("description"),
            status=item.get("status", "pending"),
            related_entity_id=item.get("related_entity_id"),
            related_entity_type=item.get("related_entity_type"),
            reviewer_note=item.get("reviewer_note"),
            created_at=item.get("created_at", ts),
            resolved_at=item.get("resolved_at"),
        )
        review_items[ri.id] = ri

    # Audit log entries
    for evt in data.get("audit_log", []):
        ae = AuditEvent(
            id=evt["id"],
            case_id=case_id,
            action=evt["action"],
            actor=evt.get("actor", "system"),
            entity_type=evt.get("entity_type"),
            entity_id=evt.get("entity_id"),
            detail=evt.get("detail"),
            timestamp=evt.get("timestamp", ts),
        )
        audit_log.append(ae)

    # Measures
    for m in data.get("measures", []):
        measure = Measure(
            id=m["id"],
            case_id=case_id,
            measure_id=m["measure_id"],
            title=m["title"],
            description=m.get("description", ""),
            annual_saving_kwh=m["annual_saving_kwh"],
            annual_saving_eur=m["annual_saving_eur"],
            investment_eur=m["investment_eur"],
            payback_years=m["payback_years"],
            priority=m["priority"],
            evidence=MeasureEvidence(**m["evidence"]),
            created_at=m.get("created_at", ts),
            updated_at=m.get("updated_at", ts),
        )
        measures[measure.id] = measure

    # Compute progress
    case_docs = [d for d in documents.values() if d.case_id == case_id]
    case_ledger = [e for e in ledger_entries.values() if e.case_id == case_id]
    case_reviews = [r for r in review_items.values() if r.case_id == case_id]
    case_measures = [m for m in measures.values() if m.case_id == case_id]

    confirmed = sum(1 for e in case_ledger if e.status == "confirmed")
    estimated = sum(1 for e in case_ledger if e.status == "estimated")
    total_entries = len(case_ledger)
    completeness = ((confirmed + estimated) / max(total_entries, 1)) * 100 if total_entries > 0 else 0

    progress = CaseProgress(
        documents_uploaded=len(case_docs),
        data_completeness_pct=round(completeness, 1),
        measures_identified=len(case_measures),
        review_items_pending=sum(1 for r in case_reviews if r.status == "pending"),
    )

    # Case object
    case = Case(
        id=case_id,
        company=company,
        auditor=auditor,
        status=data.get("status", "intake"),
        notes=data.get("notes"),
        created_at=ts,
        updated_at=data.get("updated_at", ts),
        progress=progress,
    )
    cases[case_id] = case


def init() -> None:
    """Load all seed data into the in-memory store."""
    cases.clear()
    documents.clear()
    document_blobs.clear()
    ledger_entries.clear()
    review_items.clear()
    measures.clear()
    audit_log.clear()
    live_sessions.clear()
    live_findings.clear()

    seed_files = [
        "case_food_manufacturing.json",
        "case_metal_works.json",
        "case_logistics.json",
    ]

    for filename in seed_files:
        path = SEED_DIR / filename
        if path.exists():
            data = _load_seed_file(filename)
            _seed_case(data)

    print(f"[store] Seeded {len(cases)} cases, {len(documents)} documents, "
          f"{len(ledger_entries)} ledger entries, {len(measures)} measures, "
          f"{len(review_items)} review items, {len(audit_log)} audit events")
