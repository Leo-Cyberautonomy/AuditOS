"""REST endpoints for live audit session data management.
The actual Gemini Live API connection is handled by the frontend JS SDK.
These endpoints store findings and session data from the live audit."""

from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import store as store_module
from models.live_session import LiveFinding, LiveSession, FindingType
from services.audit_log_service import log_event

router = APIRouter()


class CreateSessionRequest(BaseModel):
    case_id: str


class RecordFindingRequest(BaseModel):
    session_id: str
    type: FindingType
    data: dict
    image_base64: str | None = None


class AddTranscriptRequest(BaseModel):
    role: str  # "user" or "assistant"
    text: str


@router.post("/sessions")
async def create_session(req: CreateSessionRequest):
    # Allow "global" case_id for companion sessions (not tied to a specific case)
    if req.case_id != "global":
        case = store_module.cases.get(req.case_id)
        if not case:
            raise HTTPException(404, f"Case {req.case_id} not found")

    session = LiveSession(
        id=str(uuid4()),
        case_id=req.case_id,
        started_at=datetime.now(timezone.utc).isoformat(),
    )
    store_module.live_sessions[session.id] = session
    log_event("live_session_started", case_id=req.case_id, detail="Live audit session started")
    return session


@router.post("/sessions/{session_id}/findings")
async def record_finding(session_id: str, req: RecordFindingRequest):
    session = store_module.live_sessions.get(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    finding = LiveFinding(
        id=str(uuid4()),
        case_id=session.case_id,
        session_id=session_id,
        type=req.type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        data=req.data,
        image_base64=req.image_base64,
    )
    store_module.live_findings[finding.id] = finding
    session.findings_count += 1

    log_event(
        f"live_finding_{req.type.value}",
        case_id=session.case_id,
        detail=f"Live audit finding: {req.data.get('title', req.data.get('name', req.type.value))}"
    )
    return finding


@router.get("/sessions/{session_id}/findings")
async def get_findings(session_id: str):
    session = store_module.live_sessions.get(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")
    return [f for f in store_module.live_findings.values() if f.session_id == session_id]


@router.post("/sessions/{session_id}/transcript")
async def add_transcript(session_id: str, req: AddTranscriptRequest):
    session = store_module.live_sessions.get(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    entry = {
        "role": req.role,
        "text": req.text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    session.transcript.append(entry)
    return entry


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    session = store_module.live_sessions.get(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    session.ended_at = datetime.now(timezone.utc).isoformat()
    log_event("live_session_ended", case_id=session.case_id,
              detail=f"Live audit session ended. {session.findings_count} findings recorded.")
    return session


@router.get("/cases/{case_id}/sessions")
async def get_case_sessions(case_id: str):
    return [s for s in store_module.live_sessions.values() if s.case_id == case_id]
