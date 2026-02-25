from pydantic import BaseModel
from typing import Optional, Literal, List

ReviewPriority = Literal["critical", "high", "medium", "low"]

ReviewStatus = Literal["pending", "approved", "rejected", "deferred"]

ReviewCategory = Literal[
    "anomaly",
    "missing_data",
    "estimation",
    "measure",
    "compliance_field",
]


class ReviewItem(BaseModel):
    id: str
    case_id: str
    category: ReviewCategory
    priority: ReviewPriority
    title: str
    description: Optional[str] = None
    status: ReviewStatus = "pending"
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None
    reviewer_note: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None


class ReviewItemCreate(BaseModel):
    case_id: str
    category: ReviewCategory
    priority: ReviewPriority = "medium"
    title: str
    description: Optional[str] = None
    related_entity_id: Optional[str] = None
    related_entity_type: Optional[str] = None


class ReviewItemUpdate(BaseModel):
    status: Optional[ReviewStatus] = None
    reviewer_note: Optional[str] = None


class BatchReviewAction(BaseModel):
    item_ids: List[str]
    action: Literal["approve", "reject", "defer"]
    note: Optional[str] = None
