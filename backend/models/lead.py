from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from models.analysis import LeadAnalysis
from models.enums import AnalysisStatus, BuyingTimeline, LeadStatus, Priority, PropertyRequirement


def _clean(value: str) -> str:
    return " ".join(value.split()) if value else value


class LeadBase(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    location: str = Field(min_length=2, max_length=200)
    property_requirement: PropertyRequirement
    property_requirement_other: Optional[str] = Field(default=None, max_length=200)
    budget: str = Field(min_length=1, max_length=120, description="Free text, e.g. '80 Lakh - 1 Cr'")
    buying_timeline: BuyingTimeline
    customer_message: str = Field(min_length=10, max_length=10000)

    @field_validator("customer_name", "location", "budget", "property_requirement_other")
    @classmethod
    def strip_single_line(cls, v: Optional[str]) -> Optional[str]:
        return _clean(v) if v is not None else v

    @field_validator("customer_message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    """Partial update. Any subset of fields can be supplied."""
    customer_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    location: Optional[str] = Field(default=None, min_length=2, max_length=200)
    property_requirement: Optional[PropertyRequirement] = None
    property_requirement_other: Optional[str] = Field(default=None, max_length=200)
    budget: Optional[str] = Field(default=None, min_length=1, max_length=120)
    buying_timeline: Optional[BuyingTimeline] = None
    customer_message: Optional[str] = Field(default=None, min_length=10, max_length=10000)
    status: Optional[LeadStatus] = None

    @field_validator("customer_name", "location", "budget", "property_requirement_other")
    @classmethod
    def strip_single_line(cls, v: Optional[str]) -> Optional[str]:
        return _clean(v) if v is not None else v

    @field_validator("customer_message")
    @classmethod
    def strip_message(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else v


class Lead(LeadBase):
    id: str
    status: LeadStatus = LeadStatus.NEW
    created_at: datetime
    updated_at: datetime
    analysis_status: AnalysisStatus = AnalysisStatus.NOT_ANALYZED
    analysis: Optional[LeadAnalysis] = None
    analysis_error: Optional[str] = None
    analysis_outdated: bool = Field(default=False, description="Lead details changed after the last analysis")

    @property
    def score(self) -> Optional[int]:
        return self.analysis.score if self.analysis else None

    @property
    def priority(self) -> Optional[Priority]:
        return self.analysis.priority if self.analysis else None


class LeadSummary(BaseModel):
    """Compact representation used in tables and dashboard lists."""
    id: str
    customer_name: str
    location: str
    property_requirement: str
    budget: str
    buying_timeline: BuyingTimeline
    status: LeadStatus
    score: Optional[int]
    priority: Optional[Priority]
    intent: Optional[str]
    next_action: Optional[str]
    analysis_status: AnalysisStatus
    analysis_outdated: bool
    created_at: datetime
    pending_followups: int = 0
    next_followup_date: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class ChatResponse(BaseModel):
    reply: ChatMessage
    history: list[ChatMessage]
