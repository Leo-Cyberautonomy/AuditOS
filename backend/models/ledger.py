from pydantic import BaseModel
from typing import Optional, Literal

EnergyCarrier = Literal["strom", "gas", "fernwaerme", "diesel", "heizoel", "other"]

EntryStatus = Literal["confirmed", "anomaly", "estimated", "missing"]


class LedgerEntry(BaseModel):
    id: str
    case_id: str
    month: str
    carrier: EnergyCarrier
    value_kwh: Optional[float] = None
    status: EntryStatus = "confirmed"
    note: Optional[str] = None
    source_doc_id: Optional[str] = None
    confidence: Optional[int] = None
    review_status: Optional[str] = "pending"
    created_at: str
    updated_at: str


class LedgerEntryCreate(BaseModel):
    case_id: str
    month: str
    carrier: EnergyCarrier
    value_kwh: Optional[float] = None
    status: EntryStatus = "confirmed"
    note: Optional[str] = None
    source_doc_id: Optional[str] = None
    confidence: Optional[int] = None


class LedgerEntryUpdate(BaseModel):
    value_kwh: Optional[float] = None
    status: Optional[EntryStatus] = None
    note: Optional[str] = None
    review_status: Optional[str] = None


class LedgerTotals(BaseModel):
    strom_kwh: float = 0
    gas_kwh: float = 0
    fernwaerme_kwh: float = 0
    total_kwh: float = 0
    readiness_score: float = 0
    complete_months: int = 0
    estimated_months: int = 0
    missing_months: int = 0
