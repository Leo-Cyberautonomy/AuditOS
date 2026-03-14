from pydantic import BaseModel
from typing import Optional, Literal

CaseStatus = Literal[
    "intake",
    "data_preparation",
    "analysis",
    "report_draft",
    "review",
    "approved",
    "submitted",
    "archived",
]

VALID_TRANSITIONS: dict[str, list[str]] = {
    "intake": ["data_preparation"],
    "data_preparation": ["analysis"],
    "analysis": ["report_draft"],
    "report_draft": ["review"],
    "review": ["approved", "report_draft"],
    "approved": ["submitted"],
    "submitted": ["archived"],
    "archived": [],
}


class Company(BaseModel):
    name: str
    address: str
    nace_code: str
    industry: str
    employees: int
    building_area_m2: float
    annual_turnover_eur: Optional[float] = None
    audit_year: int


class Auditor(BaseModel):
    name: str
    e_control_id: str
    company: str


class CaseCreate(BaseModel):
    company: Company
    auditor: Auditor
    domain: str = "energy"
    notes: Optional[str] = None


class CaseUpdate(BaseModel):
    status: Optional[CaseStatus] = None
    notes: Optional[str] = None
    company: Optional[Company] = None


class CaseProgress(BaseModel):
    documents_uploaded: int = 0
    data_completeness_pct: float = 0.0
    measures_identified: int = 0
    review_items_pending: int = 0
    compliance_fields_confirmed: int = 0
    compliance_fields_total: int = 0


class Case(BaseModel):
    id: str
    company: Company
    auditor: Auditor
    status: CaseStatus = "intake"
    domain: str = "energy"
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    progress: CaseProgress = CaseProgress()
