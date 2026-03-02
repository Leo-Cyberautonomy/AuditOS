"""Cases CRUD + status workflow transitions."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import store
from models import Case, CaseCreate, CaseUpdate, CaseProgress
from models.case import VALID_TRANSITIONS
from services.audit_log_service import log_event

router = APIRouter()


def _compute_progress(case_id: str) -> CaseProgress:
    docs = [d for d in store.documents.values() if d.case_id == case_id]
    ledger = [e for e in store.ledger_entries.values() if e.case_id == case_id]
    reviews = [r for r in store.review_items.values() if r.case_id == case_id]

    confirmed = sum(1 for e in ledger if e.status == "confirmed")
    estimated = sum(1 for e in ledger if e.status == "estimated")
    total_entries = len(ledger)
    completeness = ((confirmed + estimated) / max(total_entries, 1)) * 100 if total_entries > 0 else 0

    return CaseProgress(
        documents_uploaded=len(docs),
        data_completeness_pct=round(completeness, 1),
        measures_identified=0,
        review_items_pending=sum(1 for r in reviews if r.status == "pending"),
    )


@router.get("", response_model=list[Case])
async def list_cases(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    result = list(store.cases.values())
    if status:
        result = [c for c in result if c.status == status]
    if search:
        q = search.lower()
        result = [c for c in result if q in c.company.name.lower() or q in c.id.lower()]
    # Update progress for each case
    for c in result:
        c.progress = _compute_progress(c.id)
    return sorted(result, key=lambda c: c.updated_at, reverse=True)


@router.post("", response_model=Case)
async def create_case(data: CaseCreate):
    case_id = f"case-{store.generate_id()}"
    now = store.now_iso()
    case = Case(
        id=case_id,
        company=data.company,
        auditor=data.auditor,
        status="intake",
        notes=data.notes,
        created_at=now,
        updated_at=now,
        progress=CaseProgress(),
    )
    store.cases[case_id] = case
    log_event("case_created", case_id=case_id, detail=f"Fall {case_id} angelegt", actor=data.auditor.name)
    return case


@router.get("/{case_id}", response_model=Case)
async def get_case(case_id: str):
    case = store.cases.get(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    case.progress = _compute_progress(case_id)
    return case


@router.patch("/{case_id}", response_model=Case)
async def update_case(case_id: str, data: CaseUpdate):
    case = store.cases.get(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    if data.notes is not None:
        case.notes = data.notes
    if data.company is not None:
        case.company = data.company
    case.updated_at = store.now_iso()
    case.progress = _compute_progress(case_id)

    log_event("case_updated", case_id=case_id, detail="Fall aktualisiert")
    return case


@router.delete("/{case_id}")
async def delete_case(case_id: str):
    case = store.cases.pop(case_id, None)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    # Clean up related data
    store.documents = {k: v for k, v in store.documents.items() if v.case_id != case_id}
    store.document_blobs = {k: v for k, v in store.document_blobs.items() if k in store.documents}
    store.ledger_entries = {k: v for k, v in store.ledger_entries.items() if v.case_id != case_id}
    store.review_items = {k: v for k, v in store.review_items.items() if v.case_id != case_id}
    store.measures = {k: v for k, v in store.measures.items() if v.case_id != case_id}
    log_event("case_deleted", case_id=case_id, detail=f"Fall {case_id} gelöscht")
    return {"ok": True}


@router.post("/{case_id}/transition", response_model=Case)
async def transition_case(case_id: str, body: dict):
    case = store.cases.get(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    target = body.get("to")
    if not target:
        raise HTTPException(422, "Missing 'to' field")

    valid = VALID_TRANSITIONS.get(case.status, [])
    if target not in valid:
        raise HTTPException(
            422,
            f"Cannot transition from '{case.status}' to '{target}'. "
            f"Valid transitions: {valid}",
        )

    old_status = case.status
    case.status = target
    case.updated_at = store.now_iso()
    case.progress = _compute_progress(case_id)

    log_event(
        "case_status_changed",
        case_id=case_id,
        detail=f"Status {old_status} → {target}",
    )
    return case
