"""Evidence ledger CRUD + filtering + totals."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

import store
from models import LedgerEntry, LedgerEntryCreate, LedgerEntryUpdate, LedgerTotals
from services.audit_log_service import log_event

router = APIRouter()


@router.get("", response_model=list[LedgerEntry])
async def list_ledger(
    case_id: str,
    carrier: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
):
    result = [e for e in store.ledger_entries.values() if e.case_id == case_id]
    if carrier:
        result = [e for e in result if e.carrier == carrier]
    if status:
        result = [e for e in result if e.status == status]
    if month:
        result = [e for e in result if e.month == month]
    if review_status:
        result = [e for e in result if e.review_status == review_status]

    # Sort by month order
    month_order = [
        "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
        "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
    ]

    def sort_key(e: LedgerEntry):
        parts = e.month.split(" ")
        m_idx = month_order.index(parts[0]) if parts[0] in month_order else 99
        carrier_order = {"strom": 0, "gas": 1, "fernwaerme": 2}
        return (m_idx, carrier_order.get(e.carrier, 9))

    return sorted(result, key=sort_key)


@router.post("", response_model=LedgerEntry)
async def create_ledger_entry(case_id: str, data: LedgerEntryCreate):
    if case_id not in store.cases:
        raise HTTPException(404, f"Case {case_id} not found")

    now = store.now_iso()
    entry = LedgerEntry(
        id=f"le-{store.generate_id()}",
        case_id=case_id,
        month=data.month,
        carrier=data.carrier,
        value_kwh=data.value_kwh,
        status=data.status,
        note=data.note,
        source_doc_id=data.source_doc_id,
        confidence=data.confidence,
        review_status="pending",
        created_at=now,
        updated_at=now,
    )
    store.ledger_entries[entry.id] = entry
    log_event(
        "ledger_entry_created",
        case_id=case_id,
        entity_type="ledger_entry",
        entity_id=entry.id,
        detail=f"Eintrag {entry.carrier} {entry.month}: {entry.value_kwh} kWh",
    )
    return entry


@router.get("/summary", response_model=LedgerTotals)
async def ledger_summary(case_id: str):
    entries = [e for e in store.ledger_entries.values() if e.case_id == case_id]

    strom = sum(e.value_kwh or 0 for e in entries if e.carrier == "strom")
    gas = sum(e.value_kwh or 0 for e in entries if e.carrier == "gas")
    fernwaerme = sum(e.value_kwh or 0 for e in entries if e.carrier == "fernwaerme")

    # Count unique months with actual data
    confirmed = sum(1 for e in entries if e.status == "confirmed" and e.carrier == "strom")
    estimated = sum(1 for e in entries if e.status == "estimated" and e.carrier == "strom")
    missing = sum(1 for e in entries if e.status == "missing" and e.carrier == "strom" and e.value_kwh is None)

    total_months = confirmed + estimated + missing
    readiness = round((confirmed + estimated) / max(total_months, 1) * 100) if total_months > 0 else 0

    return LedgerTotals(
        strom_kwh=strom,
        gas_kwh=gas,
        fernwaerme_kwh=fernwaerme,
        total_kwh=strom + gas + fernwaerme,
        readiness_score=readiness,
        complete_months=confirmed,
        estimated_months=estimated,
        missing_months=missing,
    )


@router.get("/{entry_id}", response_model=LedgerEntry)
async def get_ledger_entry(case_id: str, entry_id: str):
    entry = store.ledger_entries.get(entry_id)
    if not entry or entry.case_id != case_id:
        raise HTTPException(404, f"Ledger entry {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=LedgerEntry)
async def update_ledger_entry(case_id: str, entry_id: str, data: LedgerEntryUpdate):
    entry = store.ledger_entries.get(entry_id)
    if not entry or entry.case_id != case_id:
        raise HTTPException(404, f"Ledger entry {entry_id} not found")

    if data.value_kwh is not None:
        entry.value_kwh = data.value_kwh
    if data.status is not None:
        entry.status = data.status
    if data.note is not None:
        entry.note = data.note
    if data.review_status is not None:
        entry.review_status = data.review_status
    entry.updated_at = store.now_iso()

    log_event(
        "ledger_entry_updated",
        case_id=case_id,
        entity_type="ledger_entry",
        entity_id=entry_id,
        detail=f"Eintrag {entry.carrier} {entry.month} aktualisiert",
    )
    return entry


@router.delete("/{entry_id}")
async def delete_ledger_entry(case_id: str, entry_id: str):
    entry = store.ledger_entries.get(entry_id)
    if not entry or entry.case_id != case_id:
        raise HTTPException(404, f"Ledger entry {entry_id} not found")

    del store.ledger_entries[entry_id]
    log_event(
        "ledger_entry_deleted",
        case_id=case_id,
        entity_type="ledger_entry",
        entity_id=entry_id,
        detail=f"Eintrag {entry.carrier} {entry.month} gelöscht",
    )
    return {"ok": True}


@router.post("/bulk", response_model=list[LedgerEntry])
async def bulk_create_ledger(case_id: str, entries: List[LedgerEntryCreate]):
    if case_id not in store.cases:
        raise HTTPException(404, f"Case {case_id} not found")

    created = []
    now = store.now_iso()
    for data in entries:
        entry = LedgerEntry(
            id=f"le-{store.generate_id()}",
            case_id=case_id,
            month=data.month,
            carrier=data.carrier,
            value_kwh=data.value_kwh,
            status=data.status,
            note=data.note,
            source_doc_id=data.source_doc_id,
            confidence=data.confidence,
            review_status="pending",
            created_at=now,
            updated_at=now,
        )
        store.ledger_entries[entry.id] = entry
        created.append(entry)

    log_event(
        "ledger_entry_created",
        case_id=case_id,
        detail=f"{len(created)} Einträge erstellt",
    )
    return created
