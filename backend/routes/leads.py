from typing import Literal, Optional

from fastapi import APIRouter, Query, Response, status

from models.enums import LeadStatus
from models.followup import FollowUpView
from models.lead import ChatMessage, ChatRequest, ChatResponse, Lead, LeadCreate, LeadSummary, LeadUpdate
from services import followup_service, lead_service
from services.lead_service import SortOption
from storage.memory import store

router = APIRouter(prefix="/api/leads", tags=["Leads"])


@router.post("", response_model=Lead, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate):
    """Save a new lead (without analysis). Call /analyze afterwards to run the AI."""
    return lead_service.create_lead(payload)


@router.get("", response_model=list[LeadSummary])
def list_leads(
    search: Optional[str] = Query(default=None, max_length=100, description="Matches customer name or location"),
    priority: Optional[Literal["Hot", "Warm", "Cold", "unanalyzed"]] = None,
    status_filter: Optional[LeadStatus] = Query(default=None, alias="status"),
    sort: SortOption = "newest",
):
    return lead_service.list_leads(search, priority, status_filter, sort)


@router.get("/{lead_id}", response_model=Lead)
def get_lead(lead_id: str):
    return lead_service.get_lead_or_404(lead_id)


@router.put("/{lead_id}", response_model=Lead)
def update_lead(lead_id: str, payload: LeadUpdate):
    return lead_service.update_lead(lead_id, payload)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: str):
    lead_service.delete_lead(lead_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{lead_id}/analyze", response_model=Lead)
async def analyze_lead(lead_id: str):
    """Run (or re-run) Gemini analysis for the lead."""
    return await lead_service.analyze(lead_id)


@router.get("/{lead_id}/chat", response_model=list[ChatMessage])
def get_chat_history(lead_id: str):
    lead_service.get_lead_or_404(lead_id)
    return store.get_chat(lead_id)


@router.post("/{lead_id}/chat", response_model=ChatResponse)
async def chat_with_lead(lead_id: str, payload: ChatRequest):
    reply, history = await lead_service.chat(lead_id, payload.message)
    return ChatResponse(reply=reply, history=history)


@router.delete("/{lead_id}/chat", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat(lead_id: str):
    lead_service.get_lead_or_404(lead_id)
    store.clear_chat(lead_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{lead_id}/followups", response_model=list[FollowUpView])
def lead_followups(lead_id: str):
    lead_service.get_lead_or_404(lead_id)
    return followup_service.list_followups(lead_id=lead_id)
