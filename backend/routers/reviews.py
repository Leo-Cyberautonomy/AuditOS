"""Review queue with priority buckets and batch actions."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import store
from models import ReviewItem, ReviewItemUpdate, BatchReviewAction
from services.audit_log_service import log_event

router = APIRouter()


@router.get("", response_model=list[ReviewItem])
async def list_reviews(
    case_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
):
    result = list(store.review_items.values())
    if case_id:
        result = [r for r in result if r.case_id == case_id]
    if priority:
        result = [r for r in result if r.priority == priority]
    if status:
        result = [r for r in result if r.status == status]
    if category:
        result = [r for r in result if r.category == category]

    # Sort by priority order
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return sorted(result, key=lambda r: (priority_order.get(r.priority, 9), r.created_at))


@router.get("/stats")
async def review_stats(case_id: Optional[str] = Query(None)):
    items = list(store.review_items.values())
    if case_id:
        items = [r for r in items if r.case_id == case_id]

    total = len(items)
    pending = sum(1 for r in items if r.status == "pending")
    by_priority = {}
    for p in ["critical", "high", "medium", "low"]:
        by_priority[p] = sum(1 for r in items if r.priority == p and r.status == "pending")

    by_category = {}
    for c in ["anomaly", "missing_data", "estimation", "measure", "compliance_field"]:
        by_category[c] = sum(1 for r in items if r.category == c and r.status == "pending")

    return {
        "total": total,
        "pending": pending,
        "approved": sum(1 for r in items if r.status == "approved"),
        "rejected": sum(1 for r in items if r.status == "rejected"),
        "deferred": sum(1 for r in items if r.status == "deferred"),
        "by_priority": by_priority,
        "by_category": by_category,
    }


@router.get("/{item_id}", response_model=ReviewItem)
async def get_review(item_id: str):
    item = store.review_items.get(item_id)
    if not item:
        raise HTTPException(404, f"Review item {item_id} not found")
    return item


@router.patch("/{item_id}", response_model=ReviewItem)
async def update_review(item_id: str, data: ReviewItemUpdate):
    item = store.review_items.get(item_id)
    if not item:
        raise HTTPException(404, f"Review item {item_id} not found")

    if data.status is not None:
        old_status = item.status
        item.status = data.status
        if data.status in ("approved", "rejected", "deferred"):
            item.resolved_at = store.now_iso()

        action_map = {
            "approved": "review_approved",
            "rejected": "review_rejected",
            "deferred": "review_deferred",
        }
        if data.status in action_map:
            log_event(
                action_map[data.status],
                case_id=item.case_id,
                entity_type="review_item",
                entity_id=item_id,
                detail=f"Prüfpunkt '{item.title}' — {old_status} → {data.status}",
            )

    if data.reviewer_note is not None:
        item.reviewer_note = data.reviewer_note

    return item


@router.post("/batch", response_model=list[ReviewItem])
async def batch_review(data: BatchReviewAction):
    updated = []
    status_map = {"approve": "approved", "reject": "rejected", "defer": "deferred"}
    new_status = status_map.get(data.action)
    if not new_status:
        raise HTTPException(422, f"Invalid action: {data.action}")

    for item_id in data.item_ids:
        item = store.review_items.get(item_id)
        if not item:
            continue
        item.status = new_status
        item.resolved_at = store.now_iso()
        if data.note:
            item.reviewer_note = data.note
        updated.append(item)

        action_map = {
            "approved": "review_approved",
            "rejected": "review_rejected",
            "deferred": "review_deferred",
        }
        log_event(
            action_map[new_status],
            case_id=item.case_id,
            entity_type="review_item",
            entity_id=item_id,
            detail=f"Batch: '{item.title}' → {new_status}",
        )

    return updated
