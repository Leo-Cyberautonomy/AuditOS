"""Measure models for AuditOS."""

from typing import Optional, Literal
from pydantic import BaseModel

MeasurePriority = Literal["sehr hoch", "hoch", "mittel", "niedrig"]

class MeasureEvidence(BaseModel):
    measurement: str
    nameplate: Optional[str] = None
    method: str
    price_basis: str
    confidence: int  # 0-100
    confidence_note: Optional[str] = None

class Measure(BaseModel):
    id: str
    case_id: str
    measure_id: str  # M1, M2, etc.
    title: str
    description: str
    annual_saving_kwh: int
    annual_saving_eur: int
    investment_eur: int
    payback_years: float
    priority: MeasurePriority
    evidence: MeasureEvidence
    created_at: str
    updated_at: str
