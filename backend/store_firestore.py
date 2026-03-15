"""Firestore async CRUD layer for all 9 collections.

Replaces the in-memory dicts in store.py with real Firestore persistence.
Every function returns Pydantic model instances to keep API compatibility.
"""

from __future__ import annotations

from google.cloud.firestore_v1 import ArrayUnion, Increment

from firestore_client import get_db
from models import (
    Case,
    DocumentMeta,
    LedgerEntry,
    ReviewItem,
    AuditEvent,
    Measure,
)
from models.live_session import LiveSession, LiveFinding


# ═══════════════════════════════════════════════════════════════════════════════
# Cases
# ═══════════════════════════════════════════════════════════════════════════════

async def get_case(case_id: str) -> Case | None:
    db = get_db()
    doc = await db.collection("cases").document(case_id).get()
    if not doc.exists:
        return None
    return Case(**doc.to_dict())


async def list_cases(status: str | None = None, search: str | None = None) -> list[Case]:
    db = get_db()
    query = db.collection("cases")
    if status:
        query = query.where("status", "==", status)
    results: list[Case] = []
    async for doc in query.stream():
        case = Case(**doc.to_dict())
        if search:
            term = search.lower()
            if term not in case.company.name.lower() and term not in case.id.lower():
                continue
        results.append(case)
    return results


async def create_case(case: Case) -> Case:
    db = get_db()
    await db.collection("cases").document(case.id).set(case.model_dump())
    return case


async def update_case(case_id: str, updates: dict) -> Case | None:
    db = get_db()
    ref = db.collection("cases").document(case_id)
    doc = await ref.get()
    if not doc.exists:
        return None
    await ref.update(updates)
    updated = await ref.get()
    return Case(**updated.to_dict())


async def delete_case(case_id: str) -> bool:
    db = get_db()
    ref = db.collection("cases").document(case_id)
    doc = await ref.get()
    if not doc.exists:
        return False
    await ref.delete()
    return True


async def case_exists(case_id: str) -> bool:
    db = get_db()
    doc = await db.collection("cases").document(case_id).get()
    return doc.exists


async def count_cases() -> int:
    db = get_db()
    count = 0
    async for _ in db.collection("cases").stream():
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Documents
# ═══════════════════════════════════════════════════════════════════════════════

async def get_document(doc_id: str) -> DocumentMeta | None:
    db = get_db()
    doc = await db.collection("documents").document(doc_id).get()
    if not doc.exists:
        return None
    return DocumentMeta(**doc.to_dict())


async def list_documents(case_id: str, category: str | None = None) -> list[DocumentMeta]:
    db = get_db()
    query = db.collection("documents").where("case_id", "==", case_id)
    if category:
        query = query.where("category", "==", category)
    results: list[DocumentMeta] = []
    async for doc in query.stream():
        results.append(DocumentMeta(**doc.to_dict()))
    return results


async def create_document(doc: DocumentMeta) -> DocumentMeta:
    db = get_db()
    await db.collection("documents").document(doc.id).set(doc.model_dump())
    return doc


async def update_document(doc_id: str, updates: dict) -> DocumentMeta | None:
    db = get_db()
    ref = db.collection("documents").document(doc_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return None
    await ref.update(updates)
    updated = await ref.get()
    return DocumentMeta(**updated.to_dict())


async def delete_document(doc_id: str) -> bool:
    db = get_db()
    ref = db.collection("documents").document(doc_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return False
    await ref.delete()
    return True


async def delete_documents_by_case(case_id: str) -> int:
    db = get_db()
    count = 0
    async for doc in db.collection("documents").where("case_id", "==", case_id).stream():
        await doc.reference.delete()
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Ledger Entries
# ═══════════════════════════════════════════════════════════════════════════════

async def get_ledger_entry(entry_id: str) -> LedgerEntry | None:
    db = get_db()
    doc = await db.collection("ledger_entries").document(entry_id).get()
    if not doc.exists:
        return None
    return LedgerEntry(**doc.to_dict())


async def list_ledger_entries(
    case_id: str,
    carrier: str | None = None,
    status: str | None = None,
    month: str | None = None,
    review_status: str | None = None,
) -> list[LedgerEntry]:
    db = get_db()
    query = db.collection("ledger_entries").where("case_id", "==", case_id)
    if carrier:
        query = query.where("carrier", "==", carrier)
    if status:
        query = query.where("status", "==", status)
    if month:
        query = query.where("month", "==", month)
    if review_status:
        query = query.where("review_status", "==", review_status)
    results: list[LedgerEntry] = []
    async for doc in query.stream():
        results.append(LedgerEntry(**doc.to_dict()))
    return results


async def create_ledger_entry(entry: LedgerEntry) -> LedgerEntry:
    db = get_db()
    await db.collection("ledger_entries").document(entry.id).set(entry.model_dump())
    return entry


async def create_ledger_entries_batch(entries: list[LedgerEntry]) -> list[LedgerEntry]:
    db = get_db()
    batch = db.batch()
    for entry in entries:
        ref = db.collection("ledger_entries").document(entry.id)
        batch.set(ref, entry.model_dump())
    await batch.commit()
    return entries


async def update_ledger_entry(entry_id: str, updates: dict) -> LedgerEntry | None:
    db = get_db()
    ref = db.collection("ledger_entries").document(entry_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return None
    await ref.update(updates)
    updated = await ref.get()
    return LedgerEntry(**updated.to_dict())


async def delete_ledger_entry(entry_id: str) -> bool:
    db = get_db()
    ref = db.collection("ledger_entries").document(entry_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return False
    await ref.delete()
    return True


async def delete_ledger_entries_by_case(case_id: str) -> int:
    db = get_db()
    count = 0
    async for doc in db.collection("ledger_entries").where("case_id", "==", case_id).stream():
        await doc.reference.delete()
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Review Items
# ═══════════════════════════════════════════════════════════════════════════════

async def get_review_item(item_id: str) -> ReviewItem | None:
    db = get_db()
    doc = await db.collection("review_items").document(item_id).get()
    if not doc.exists:
        return None
    return ReviewItem(**doc.to_dict())


async def list_review_items(
    case_id: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    category: str | None = None,
) -> list[ReviewItem]:
    db = get_db()
    query = db.collection("review_items")
    if case_id:
        query = query.where("case_id", "==", case_id)
    if priority:
        query = query.where("priority", "==", priority)
    if status:
        query = query.where("status", "==", status)
    if category:
        query = query.where("category", "==", category)
    results: list[ReviewItem] = []
    async for doc in query.stream():
        results.append(ReviewItem(**doc.to_dict()))
    return results


async def create_review_item(item: ReviewItem) -> ReviewItem:
    db = get_db()
    await db.collection("review_items").document(item.id).set(item.model_dump())
    return item


async def update_review_item(item_id: str, updates: dict) -> ReviewItem | None:
    db = get_db()
    ref = db.collection("review_items").document(item_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return None
    await ref.update(updates)
    updated = await ref.get()
    return ReviewItem(**updated.to_dict())


async def delete_review_items_by_case(case_id: str) -> int:
    db = get_db()
    count = 0
    async for doc in db.collection("review_items").where("case_id", "==", case_id).stream():
        await doc.reference.delete()
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Measures
# ═══════════════════════════════════════════════════════════════════════════════

async def get_measure(measure_id: str) -> Measure | None:
    db = get_db()
    doc = await db.collection("measures").document(measure_id).get()
    if not doc.exists:
        return None
    return Measure(**doc.to_dict())


async def list_measures(case_id: str) -> list[Measure]:
    db = get_db()
    results: list[Measure] = []
    async for doc in db.collection("measures").where("case_id", "==", case_id).stream():
        results.append(Measure(**doc.to_dict()))
    return results


async def create_measure(measure: Measure) -> Measure:
    db = get_db()
    await db.collection("measures").document(measure.id).set(measure.model_dump())
    return measure


async def delete_measures_by_case(case_id: str) -> int:
    db = get_db()
    count = 0
    async for doc in db.collection("measures").where("case_id", "==", case_id).stream():
        await doc.reference.delete()
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Audit Log
# ═══════════════════════════════════════════════════════════════════════════════

async def append_audit_event(event: AuditEvent) -> AuditEvent:
    db = get_db()
    await db.collection("audit_log").document(event.id).set(event.model_dump())
    return event


async def list_audit_events(
    case_id: str | None = None,
    action: str | None = None,
    actor: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[AuditEvent]:
    db = get_db()
    query = db.collection("audit_log").order_by("timestamp", direction="DESCENDING")
    if case_id:
        query = query.where("case_id", "==", case_id)
    if action:
        query = query.where("action", "==", action)
    if actor:
        query = query.where("actor", "==", actor)
    # Firestore doesn't support offset natively; skip manually
    results: list[AuditEvent] = []
    skipped = 0
    async for doc in query.stream():
        if skipped < offset:
            skipped += 1
            continue
        if len(results) >= limit:
            break
        results.append(AuditEvent(**doc.to_dict()))
    return results


async def delete_audit_events_by_case(case_id: str) -> int:
    db = get_db()
    count = 0
    async for doc in db.collection("audit_log").where("case_id", "==", case_id).stream():
        await doc.reference.delete()
        count += 1
    return count


# ═══════════════════════════════════════════════════════════════════════════════
# Live Sessions
# ═══════════════════════════════════════════════════════════════════════════════

async def get_live_session(session_id: str) -> LiveSession | None:
    db = get_db()
    doc = await db.collection("live_sessions").document(session_id).get()
    if not doc.exists:
        return None
    return LiveSession(**doc.to_dict())


async def list_live_sessions(case_id: str) -> list[LiveSession]:
    db = get_db()
    results: list[LiveSession] = []
    async for doc in db.collection("live_sessions").where("case_id", "==", case_id).stream():
        results.append(LiveSession(**doc.to_dict()))
    return results


async def create_live_session(session: LiveSession) -> LiveSession:
    db = get_db()
    await db.collection("live_sessions").document(session.id).set(session.model_dump())
    return session


async def update_live_session(session_id: str, updates: dict) -> LiveSession | None:
    db = get_db()
    ref = db.collection("live_sessions").document(session_id)
    snapshot = await ref.get()
    if not snapshot.exists:
        return None
    await ref.update(updates)
    updated = await ref.get()
    return LiveSession(**updated.to_dict())


async def append_transcript(session_id: str, entry: dict) -> None:
    db = get_db()
    await db.collection("live_sessions").document(session_id).update(
        {"transcript": ArrayUnion([entry])}
    )


async def increment_findings_count(session_id: str) -> None:
    db = get_db()
    await db.collection("live_sessions").document(session_id).update(
        {"findings_count": Increment(1)}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Live Findings
# ═══════════════════════════════════════════════════════════════════════════════

_IMAGE_BASE64_MAX_BYTES = 900_000  # ~900 KB, well under Firestore 1 MB doc limit


async def get_live_finding(finding_id: str) -> LiveFinding | None:
    db = get_db()
    doc = await db.collection("live_findings").document(finding_id).get()
    if not doc.exists:
        return None
    return LiveFinding(**doc.to_dict())


async def list_live_findings(
    session_id: str | None = None,
    case_id: str | None = None,
) -> list[LiveFinding]:
    db = get_db()
    query = db.collection("live_findings")
    if session_id:
        query = query.where("session_id", "==", session_id)
    if case_id:
        query = query.where("case_id", "==", case_id)
    results: list[LiveFinding] = []
    async for doc in query.stream():
        results.append(LiveFinding(**doc.to_dict()))
    return results


async def create_live_finding(finding: LiveFinding) -> LiveFinding:
    db = get_db()
    data = finding.model_dump()
    # Guard against Firestore 1 MB document limit
    if data.get("image_base64") and len(data["image_base64"]) > _IMAGE_BASE64_MAX_BYTES:
        data["image_base64"] = None
    await db.collection("live_findings").document(finding.id).set(data)
    return finding


# ═══════════════════════════════════════════════════════════════════════════════
# Standards
# ═══════════════════════════════════════════════════════════════════════════════

async def get_standard(standard_name: str) -> dict | None:
    db = get_db()
    doc = await db.collection("standards").document(standard_name).get()
    if not doc.exists:
        return None
    return doc.to_dict()


async def list_standards() -> list[dict]:
    db = get_db()
    results: list[dict] = []
    async for doc in db.collection("standards").stream():
        data = doc.to_dict()
        data["_id"] = doc.id
        results.append(data)
    return results


async def seed_standards(standards_data: dict) -> int:
    db = get_db()
    batch = db.batch()
    count = 0
    for name, data in standards_data.items():
        ref = db.collection("standards").document(name)
        batch.set(ref, data)
        count += 1
    await batch.commit()
    return count
