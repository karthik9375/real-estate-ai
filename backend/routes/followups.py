from typing import Optional

from fastapi import APIRouter, Response, status

from models.followup import Bucket, FollowUpCreate, FollowUpUpdate, FollowUpView
from services import followup_service

router = APIRouter(prefix="/api/followups", tags=["Follow-ups"])


@router.post("", response_model=FollowUpView, status_code=status.HTTP_201_CREATED)
def create_followup(payload: FollowUpCreate):
    return followup_service.create_followup(payload)


@router.get("", response_model=list[FollowUpView])
def list_followups(lead_id: Optional[str] = None, bucket: Optional[Bucket] = None):
    """bucket: overdue | today | upcoming | completed"""
    return followup_service.list_followups(lead_id=lead_id, bucket=bucket)


@router.put("/{followup_id}", response_model=FollowUpView)
def update_followup(followup_id: str, payload: FollowUpUpdate):
    return followup_service.update_followup(followup_id, payload)


@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(followup_id: str):
    followup_service.delete_followup(followup_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
