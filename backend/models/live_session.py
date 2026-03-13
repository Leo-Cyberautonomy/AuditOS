"""Models for live audit sessions."""
from enum import Enum
from pydantic import BaseModel


class FindingType(str, Enum):
    equipment = "equipment"
    meter_reading = "meter_reading"
    issue = "issue"
    evidence = "evidence"


class LiveFinding(BaseModel):
    id: str
    case_id: str
    session_id: str
    type: FindingType
    timestamp: str
    data: dict
    image_base64: str | None = None


class LiveSession(BaseModel):
    id: str
    case_id: str
    started_at: str
    ended_at: str | None = None
    findings_count: int = 0
    transcript: list[dict] = []
