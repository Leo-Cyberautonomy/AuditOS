"""Cases CRUD + status workflow transitions."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import store_firestore as fs
from store import generate_id, now_iso, document_blobs
from models import Case, CaseCreate, CaseUpdate, CaseProgress
from models.case import VALID_TRANSITIONS
from services.audit_log_service import log_event
from agents.domains import get_all_domain_names

router = APIRouter()


@router.get("/domains")
async def list_domains():
    """Return available audit domains."""
    return get_all_domain_names()


async def _compute_progress(case_id: str) -> CaseProgress:
    docs = await fs.list_documents(case_id)
    ledger = await fs.list_ledger_entries(case_id)
    reviews = await fs.list_review_items(case_id=case_id)
    measures = await fs.list_measures(case_id)

    confirmed = sum(1 for e in ledger if e.status == "confirmed")
    estimated = sum(1 for e in ledger if e.status == "estimated")
    total_entries = len(ledger)
    completeness = ((confirmed + estimated) / max(total_entries, 1)) * 100 if total_entries > 0 else 0

    return CaseProgress(
        documents_uploaded=len(docs),
        data_completeness_pct=round(completeness, 1),
        measures_identified=len(measures),
        review_items_pending=sum(1 for r in reviews if r.status == "pending"),
    )


@router.get("", response_model=list[Case])
async def list_cases(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    result = await fs.list_cases(status=status, search=search)
    # Update progress for each case
    for c in result:
        c.progress = await _compute_progress(c.id)
    return sorted(result, key=lambda c: c.updated_at, reverse=True)


@router.post("", response_model=Case)
async def create_case(data: CaseCreate):
    case_id = f"case-{generate_id()}"
    now = now_iso()
    case = Case(
        id=case_id,
        company=data.company,
        auditor=data.auditor,
        status="intake",
        domain=data.domain,
        notes=data.notes,
        created_at=now,
        updated_at=now,
        progress=CaseProgress(),
    )
    await fs.create_case(case)
    await log_event("case_created", case_id=case_id, detail=f"Fall {case_id} angelegt", actor=data.auditor.name)
    return case


@router.get("/{case_id}", response_model=Case)
async def get_case(case_id: str):
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    case.progress = await _compute_progress(case_id)
    return case


@router.patch("/{case_id}", response_model=Case)
async def update_case(case_id: str, data: CaseUpdate):
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    updates: dict = {"updated_at": now_iso()}
    if data.notes is not None:
        updates["notes"] = data.notes
    if data.company is not None:
        updates["company"] = data.company.model_dump()

    case = await fs.update_case(case_id, updates)
    case.progress = await _compute_progress(case_id)

    await log_event("case_updated", case_id=case_id, detail="Fall aktualisiert")
    return case


@router.delete("/{case_id}")
async def delete_case(case_id: str):
    case = await fs.get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")

    # Clean up related data — list docs first for blob cleanup, then delete
    docs = await fs.list_documents(case_id)
    for d in docs:
        document_blobs.pop(d.id, None)
    await fs.delete_documents_by_case(case_id)
    await fs.delete_ledger_entries_by_case(case_id)
    await fs.delete_review_items_by_case(case_id)
    await fs.delete_measures_by_case(case_id)
    await fs.delete_audit_events_by_case(case_id)
    await fs.delete_case(case_id)

    await log_event("case_deleted", case_id=case_id, detail=f"Fall {case_id} gelöscht")
    return {"ok": True}


@router.post("/{case_id}/transition", response_model=Case)
async def transition_case(case_id: str, body: dict):
    case = await fs.get_case(case_id)
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
    now = now_iso()
    case = await fs.update_case(case_id, {"status": target, "updated_at": now})
    case.progress = await _compute_progress(case_id)

    await log_event(
        "case_status_changed",
        case_id=case_id,
        detail=f"Status {old_status} → {target}",
    )
    return case
