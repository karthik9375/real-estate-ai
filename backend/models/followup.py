from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from models.enums import FollowUpStatus, Priority

Bucket = Literal["overdue", "today", "upcoming", "completed"]


class FollowUpCreate(BaseModel):
    lead_id: str = Field(min_length=1)
    due_date: date
    note: str = Field(min_length=2, max_length=500)

    @field_validator("note")
    @classmethod
    def strip_note(cls, v: str) -> str:
        return v.strip()


class FollowUpUpdate(BaseModel):
    due_date: Optional[date] = None
    note: Optional[str] = Field(default=None, min_length=2, max_length=500)
    status: Optional[FollowUpStatus] = None


class FollowUp(BaseModel):
    id: str
    lead_id: str
    due_date: date
    note: str
    status: FollowUpStatus = FollowUpStatus.PENDING
    created_at: datetime
    completed_at: Optional[datetime] = None


class FollowUpView(FollowUp):
    """Follow-up enriched with lead context and its time bucket."""
    customer_name: str
    lead_priority: Optional[Priority]
    lead_score: Optional[int]
    bucket: Bucket
