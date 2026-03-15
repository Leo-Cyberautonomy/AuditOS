"""Review queue with priority buckets and batch actions."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

import store_firestore as fs
from store import now_iso
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
    result = await fs.list_review_items(
        case_id=case_id, priority=priority, status=status, category=category
    )

    # Sort by priority order
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return sorted(result, key=lambda r: (priority_order.get(r.priority, 9), r.created_at))


@router.get("/stats")
async def review_stats(case_id: Optional[str] = Query(None)):
    items = await fs.list_review_items(case_id=case_id)

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
    item = await fs.get_review_item(item_id)
    if not item:
        raise HTTPException(404, f"Review item {item_id} not found")
    return item


@router.patch("/{item_id}", response_model=ReviewItem)
async def update_review(item_id: str, data: ReviewItemUpdate):
    item = await fs.get_review_item(item_id)
    if not item:
        raise HTTPException(404, f"Review item {item_id} not found")

    updates: dict = {}
    if data.status is not None:
        old_status = item.status
        updates["status"] = data.status
        if data.status in ("approved", "rejected", "deferred"):
            updates["resolved_at"] = now_iso()

        action_map = {
            "approved": "review_approved",
            "rejected": "review_rejected",
            "deferred": "review_deferred",
        }
        if data.status in action_map:
            await log_event(
                action_map[data.status],
                case_id=item.case_id,
                entity_type="review_item",
                entity_id=item_id,
                detail=f"Prüfpunkt '{item.title}' — {old_status} → {data.status}",
            )

    if data.reviewer_note is not None:
        updates["reviewer_note"] = data.reviewer_note

    if updates:
        item = await fs.update_review_item(item_id, updates)

    return item


@router.post("/batch", response_model=list[ReviewItem])
async def batch_review(data: BatchReviewAction):
    updated = []
    status_map = {"approve": "approved", "reject": "rejected", "defer": "deferred"}
    new_status = status_map.get(data.action)
    if not new_status:
        raise HTTPException(422, f"Invalid action: {data.action}")

    for item_id in data.item_ids:
        item = await fs.get_review_item(item_id)
        if not item:
            continue

        updates = {"status": new_status, "resolved_at": now_iso()}
        if data.note:
            updates["reviewer_note"] = data.note

        item = await fs.update_review_item(item_id, updates)
        updated.append(item)

        action_map = {
            "approved": "review_approved",
            "rejected": "review_rejected",
            "deferred": "review_deferred",
        }
        await log_event(
            action_map[new_status],
            case_id=item.case_id,
            entity_type="review_item",
            entity_id=item_id,
            detail=f"Batch: '{item.title}' → {new_status}",
        )

    return updated
