"""REST endpoints for live audit session data management.
The actual Gemini Live API connection is handled by the frontend JS SDK.
These endpoints store findings and session data from the live audit."""

from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import store_firestore as fs
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
        case = await fs.get_case(req.case_id)
        if not case:
            raise HTTPException(404, f"Case {req.case_id} not found")

    session = LiveSession(
        id=str(uuid4()),
        case_id=req.case_id,
        started_at=datetime.now(timezone.utc).isoformat(),
    )
    await fs.create_live_session(session)
    await log_event("live_session_started", case_id=req.case_id, detail="Live audit session started")
    return session


@router.post("/sessions/{session_id}/findings")
async def record_finding(session_id: str, req: RecordFindingRequest):
    session = await fs.get_live_session(session_id)
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
    await fs.create_live_finding(finding)
    await fs.increment_findings_count(session_id)

    await log_event(
        f"live_finding_{req.type.value}",
        case_id=session.case_id,
        detail=f"Live audit finding: {req.data.get('title', req.data.get('name', req.type.value))}"
    )
    return finding


@router.get("/sessions/{session_id}/findings")
async def get_findings(session_id: str):
    session = await fs.get_live_session(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")
    return await fs.list_live_findings(session_id=session_id)


@router.post("/sessions/{session_id}/transcript")
async def add_transcript(session_id: str, req: AddTranscriptRequest):
    session = await fs.get_live_session(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    entry = {
        "role": req.role,
        "text": req.text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await fs.append_transcript(session_id, entry)
    return entry


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str):
    session = await fs.get_live_session(session_id)
    if not session:
        raise HTTPException(404, f"Session {session_id} not found")

    ended_at = datetime.now(timezone.utc).isoformat()
    session = await fs.update_live_session(session_id, {"ended_at": ended_at})
    await log_event("live_session_ended", case_id=session.case_id,
              detail=f"Live audit session ended. {session.findings_count} findings recorded.")
    return session


@router.get("/cases/{case_id}/sessions")
async def get_case_sessions(case_id: str):
    return await fs.list_live_sessions(case_id)
