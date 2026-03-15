import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from firestore_client import init_firestore
import store_firestore as fs
from store import _load_seed_file, generate_id, now_iso, SEED_DIR
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
from agents._standards_data import STANDARDS_REFS

from routers import extract, report, compliance, upload, live_audit
from routers import ws as ws_router
from routers import cases as cases_router
from routers import documents as documents_router
from routers import ledger as ledger_router
from routers import reviews as reviews_router
from routers import audit_log_router
from routers import measures as measures_router


SEED_FILES = [
    "case_food_manufacturing.json",
    "case_food_safety.json",
    "case_construction_safety.json",
    "case_fire_safety.json",
    "case_environmental.json",
]


async def _seed_if_empty():
    """Check if Firestore is empty; if so, seed from JSON files and standards data."""
    count = await fs.count_cases()
    if count > 0:
        print(f"[seed] Firestore already has {count} cases — skipping seed.")
        return

    print("[seed] Firestore empty — seeding from JSON files...")
    total_docs = 0
    total_ledger = 0
    total_reviews = 0
    total_measures = 0
    total_events = 0

    for filename in SEED_FILES:
        path = SEED_DIR / filename
        if not path.exists():
            print(f"[seed] WARNING: {filename} not found, skipping.")
            continue

        data = _load_seed_file(filename)
        case_id = data["case_id"]
        ts = data.get("created_at", now_iso())

        company = Company(**data["company"])
        auditor = Auditor(**data["auditor"])

        # Documents
        case_doc_count = 0
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
            await fs.create_document(doc_obj)
            case_doc_count += 1
        total_docs += case_doc_count

        # Ledger entries
        case_ledger_count = 0
        case_ledger_entries = []
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
            await fs.create_ledger_entry(le)
            case_ledger_entries.append(le)
            case_ledger_count += 1
        total_ledger += case_ledger_count

        # Review items
        case_review_count = 0
        case_review_items = []
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
            await fs.create_review_item(ri)
            case_review_items.append(ri)
            case_review_count += 1
        total_reviews += case_review_count

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
            await fs.append_audit_event(ae)
            total_events += 1

        # Measures
        case_measure_count = 0
        case_measures = []
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
            await fs.create_measure(measure)
            case_measures.append(measure)
            case_measure_count += 1
        total_measures += case_measure_count

        # Compute progress
        confirmed = sum(1 for e in case_ledger_entries if e.status == "confirmed")
        estimated = sum(1 for e in case_ledger_entries if e.status == "estimated")
        total_entries = len(case_ledger_entries)
        completeness = ((confirmed + estimated) / max(total_entries, 1)) * 100 if total_entries > 0 else 0

        progress = CaseProgress(
            documents_uploaded=case_doc_count,
            data_completeness_pct=round(completeness, 1),
            measures_identified=case_measure_count,
            review_items_pending=sum(1 for r in case_review_items if r.status == "pending"),
        )

        # Case object
        case = Case(
            id=case_id,
            company=company,
            auditor=auditor,
            status=data.get("status", "intake"),
            domain=data.get("domain", "energy"),
            notes=data.get("notes"),
            created_at=ts,
            updated_at=data.get("updated_at", ts),
            progress=progress,
        )
        await fs.create_case(case)

    # Seed standards
    std_count = await fs.seed_standards(STANDARDS_REFS)
    print(f"[seed] Seeded {std_count} standards to Firestore.")

    print(f"[seed] Done — {len(SEED_FILES)} cases, {total_docs} documents, "
          f"{total_ledger} ledger entries, {total_measures} measures, "
          f"{total_reviews} review items, {total_events} audit events")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_firestore()
    await _seed_if_empty()
    yield


app = FastAPI(title="AuditAI API", version="0.2.0", lifespan=lifespan)

_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url:
    _origins.append(_frontend_url)
    # Also allow without trailing slash and vice versa
    _origins.append(_frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.run\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Existing routers (backward compatible) --
app.include_router(extract.router, prefix="/extract", tags=["extract"])
app.include_router(report.router, prefix="/report", tags=["report"])
app.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
app.include_router(upload.router, prefix="/upload", tags=["upload"])

# -- New routers --
app.include_router(cases_router.router, prefix="/cases", tags=["cases"])
app.include_router(documents_router.router, prefix="/cases/{case_id}/documents", tags=["documents"])
app.include_router(ledger_router.router, prefix="/cases/{case_id}/ledger", tags=["ledger"])
app.include_router(reviews_router.router, prefix="/reviews", tags=["reviews"])
app.include_router(audit_log_router.router, prefix="/audit-log", tags=["audit-log"])
app.include_router(measures_router.router, prefix="/cases/{case_id}/measures", tags=["measures"])
app.include_router(live_audit.router, prefix="/live", tags=["live-audit"])
app.include_router(ws_router.router, prefix="/ws", tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok", "store": "firestore"}
