from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

from models.enums import FollowUpStatus
from models.followup import Bucket, FollowUp, FollowUpCreate, FollowUpUpdate, FollowUpView
from storage.memory import new_id, store


def bucket_for(f: FollowUp, today: Optional[date] = None) -> Bucket:
    today = today or date.today()
    if f.status == FollowUpStatus.COMPLETED:
        return "completed"
    if f.due_date < today:
        return "overdue"
    if f.due_date == today:
        return "today"
    return "upcoming"


def to_view(f: FollowUp, today: Optional[date] = None) -> FollowUpView:
    lead = store.get_lead(f.lead_id)
    return FollowUpView(
        **f.model_dump(),
        customer_name=lead.customer_name if lead else "Unknown lead",
        lead_priority=lead.priority if lead else None,
        lead_score=lead.score if lead else None,
        bucket=bucket_for(f, today),
    )


_BUCKET_ORDER = {"overdue": 0, "today": 1, "upcoming": 2, "completed": 3}


def list_followups(lead_id: Optional[str] = None, bucket: Optional[Bucket] = None) -> list[FollowUpView]:
    today = date.today()
    views = [to_view(f, today) for f in store.list_followups() if lead_id is None or f.lead_id == lead_id]
    if bucket:
        views = [v for v in views if v.bucket == bucket]
    # Pending: earliest first. Completed: most recently completed first.
    pending = sorted((v for v in views if v.bucket != "completed"), key=lambda v: (_BUCKET_ORDER[v.bucket], v.due_date))
    done = sorted((v for v in views if v.bucket == "completed"), key=lambda v: v.completed_at or v.created_at, reverse=True)
    return pending + done


def create_followup(payload: FollowUpCreate) -> FollowUpView:
    if not store.get_lead(payload.lead_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    f = FollowUp(
        id=new_id("fu"),
        lead_id=payload.lead_id,
        due_date=payload.due_date,
        note=payload.note,
        created_at=datetime.now(timezone.utc),
    )
    store.save_followup(f)
    return to_view(f)


def update_followup(followup_id: str, payload: FollowUpUpdate) -> FollowUpView:
    f = store.get_followup(followup_id)
    if not f:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Follow-up not found")
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "note" in changes:
        changes["note"] = changes["note"].strip()
    if "status" in changes and changes["status"] != f.status:
        changes["completed_at"] = (
            datetime.now(timezone.utc) if changes["status"] == FollowUpStatus.COMPLETED else None
        )
    updated = f.model_copy(update=changes)
    store.save_followup(updated)
    return to_view(updated)


def delete_followup(followup_id: str) -> None:
    if not store.delete_followup(followup_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Follow-up not found")
