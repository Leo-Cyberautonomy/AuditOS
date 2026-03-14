import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import store
from routers import extract, report, compliance, upload, live_audit
from routers import ws as ws_router
from routers import cases as cases_router
from routers import documents as documents_router
from routers import ledger as ledger_router
from routers import reviews as reviews_router
from routers import audit_log_router
from routers import measures as measures_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.init()
    yield


app = FastAPI(title="AuditAI API", version="0.2.0", lifespan=lifespan)

_origins = ["http://localhost:3000"]
_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url:
    _origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing routers (backward compatible) ──────────────────────────────────
app.include_router(extract.router, prefix="/extract", tags=["extract"])
app.include_router(report.router, prefix="/report", tags=["report"])
app.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
app.include_router(upload.router, prefix="/upload", tags=["upload"])

# ── New routers ─────────────────────────────────────────────────────────────
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
    return {"status": "ok", "cases": len(store.cases)}
