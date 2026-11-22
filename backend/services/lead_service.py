from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import HTTPException, status

from models.enums import AnalysisStatus, FollowUpStatus, LeadStatus, Priority
from models.lead import ChatMessage, Lead, LeadCreate, LeadSummary, LeadUpdate
from services import ai_service
from storage.memory import new_id, store

SortOption = Literal["newest", "oldest", "score_desc", "score_asc", "priority"]

# Fields whose change makes the existing AI analysis outdated
ANALYSIS_FIELDS = {
    "customer_name", "location", "property_requirement", "property_requirement_other",
    "budget", "buying_timeline", "customer_message",
}

PRIORITY_RANK = {Priority.HOT: 0, Priority.WARM: 1, Priority.COLD: 2, None: 3}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_lead_or_404(lead_id: str) -> Lead:
    lead = store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return lead


def to_summary(lead: Lead) -> LeadSummary:
    pending = sorted(
        (f for f in store.list_followups() if f.lead_id == lead.id and f.status == FollowUpStatus.PENDING),
        key=lambda f: f.due_date,
    )
    requirement = lead.property_requirement.value
    if lead.property_requirement_other:
        requirement = f"{requirement} - {lead.property_requirement_other}"
    return LeadSummary(
        id=lead.id,
        customer_name=lead.customer_name,
        location=lead.location,
        property_requirement=requirement,
        budget=lead.budget,
        buying_timeline=lead.buying_timeline,
        status=lead.status,
        score=lead.score,
        priority=lead.priority,
        intent=lead.analysis.intent.value if lead.analysis else None,
        next_action=lead.analysis.next_action.action if lead.analysis else None,
        analysis_status=lead.analysis_status,
        analysis_outdated=lead.analysis_outdated,
        created_at=lead.created_at,
        pending_followups=len(pending),
        next_followup_date=pending[0].due_date.isoformat() if pending else None,
    )


def priority_sort_key(lead: Lead):
    return (PRIORITY_RANK[lead.priority], -(lead.score if lead.score is not None else -1), -lead.created_at.timestamp())


def list_leads(
    search: Optional[str] = None,
    priority: Optional[str] = None,
    lead_status: Optional[LeadStatus] = None,
    sort: SortOption = "newest",
) -> list[LeadSummary]:
    leads = store.list_leads()

    if search:
        term = search.strip().lower()
        leads = [l for l in leads if term in l.customer_name.lower() or term in l.location.lower()]
    if priority:
        if priority == "unanalyzed":
            leads = [l for l in leads if l.priority is None]
        else:
            leads = [l for l in leads if l.priority and l.priority.value == priority]
    if lead_status:
        leads = [l for l in leads if l.status == lead_status]

    if sort == "newest":
        leads.sort(key=lambda l: l.created_at, reverse=True)
    elif sort == "oldest":
        leads.sort(key=lambda l: l.created_at)
    elif sort == "score_desc":
        leads.sort(key=lambda l: (l.score is None, -(l.score or 0), -l.created_at.timestamp()))
    elif sort == "score_asc":
        leads.sort(key=lambda l: (l.score is None, l.score or 0, -l.created_at.timestamp()))
    elif sort == "priority":
        leads.sort(key=priority_sort_key)

    return [to_summary(l) for l in leads]


def create_lead(payload: LeadCreate) -> Lead:
    now = _now()
    lead = Lead(id=new_id("lead"), created_at=now, updated_at=now, **payload.model_dump())
    return store.save_lead(lead)


def update_lead(lead_id: str, payload: LeadUpdate) -> Lead:
    lead = get_lead_or_404(lead_id)
    changes = payload.model_dump(exclude_unset=True)
    # Required fields cannot be cleared; only the optional "other" detail can be null.
    changes = {k: v for k, v in changes.items() if v is not None or k == "property_requirement_other"}
    if not changes:
        return lead

    content_changed = any(k in ANALYSIS_FIELDS and getattr(lead, k) != v for k, v in changes.items())
    update = {**changes, "updated_at": _now()}
    if content_changed and lead.analysis is not None:
        update["analysis_outdated"] = True

    updated = lead.model_copy(update=update)
    # Re-validate the merged model so invalid combinations are rejected
    updated = Lead.model_validate(updated.model_dump())
    return store.save_lead(updated)


def delete_lead(lead_id: str) -> None:
    if not store.delete_lead(lead_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")


async def analyze(lead_id: str) -> Lead:
    lead = get_lead_or_404(lead_id)
    try:
        analysis = await ai_service.analyze_lead(lead)
    except ai_service.AIServiceError as exc:
        # Keep any previous analysis, but record the failure so the UI can offer a retry
        current = store.get_lead(lead_id)
        if current:
            store.save_lead(current.model_copy(update={
                "analysis_error": exc.message,
                "analysis_status": AnalysisStatus.FAILED if current.analysis is None else current.analysis_status,
            }))
        raise HTTPException(exc.status_code, exc.message) from exc

    current = get_lead_or_404(lead_id)  # lead may have been edited while the AI was running
    updated = current.model_copy(update={
        "analysis": analysis,
        "analysis_status": AnalysisStatus.COMPLETED,
        "analysis_error": None,
        "analysis_outdated": False,
        "updated_at": _now(),
    })
    return store.save_lead(updated)


async def chat(lead_id: str, message: str) -> tuple[ChatMessage, list[ChatMessage]]:
    lead = get_lead_or_404(lead_id)
    history = store.get_chat(lead_id)
    followups = [f for f in store.list_followups() if f.lead_id == lead_id]
    try:
        reply_text = await ai_service.chat_about_lead(lead, followups, history, message)
    except ai_service.AIServiceError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc

    user_msg = ChatMessage(role="user", content=message, created_at=_now())
    reply = ChatMessage(role="assistant", content=reply_text, created_at=_now())
    # Only persist the exchange once the AI succeeded, so a failed message can be retried cleanly
    new_history = store.append_chat(lead_id, user_msg, reply)
    return reply, new_history
