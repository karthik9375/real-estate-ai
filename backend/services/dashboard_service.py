from datetime import date

from models.dashboard import DashboardMetrics, DashboardStats
from models.enums import FollowUpStatus, LeadStatus, Priority
from services.followup_service import list_followups
from services.lead_service import priority_sort_key, to_summary
from storage.memory import store

CLOSED_STATUSES = {LeadStatus.CONVERTED, LeadStatus.LOST}


def get_stats() -> DashboardStats:
    leads = store.list_leads()
    followups = store.list_followups()
    today = date.today()

    pending = [f for f in followups if f.status == FollowUpStatus.PENDING]
    leads_with_pending = {f.lead_id for f in pending}

    def count_priority(p: Priority) -> int:
        return sum(1 for l in leads if l.priority == p)

    # A lead "requires follow-up" if its status says so or it has a pending follow-up (and is not closed)
    requiring_followup = sum(
        1 for l in leads
        if l.status not in CLOSED_STATUSES
        and (l.status == LeadStatus.FOLLOW_UP_REQUIRED or l.id in leads_with_pending)
    )

    scores = [l.score for l in leads if l.score is not None]

    metrics = DashboardMetrics(
        total_leads=len(leads),
        hot_leads=count_priority(Priority.HOT),
        warm_leads=count_priority(Priority.WARM),
        cold_leads=count_priority(Priority.COLD),
        not_analyzed=sum(1 for l in leads if l.priority is None),
        requiring_followup=requiring_followup,
        converted_leads=sum(1 for l in leads if l.status == LeadStatus.CONVERTED),
        overdue_followups=sum(1 for f in pending if f.due_date < today),
        today_followups=sum(1 for f in pending if f.due_date == today),
        average_score=round(sum(scores) / len(scores), 1) if scores else None,
    )

    open_leads = [l for l in leads if l.status not in CLOSED_STATUSES]
    top = sorted((l for l in open_leads if l.analysis), key=priority_sort_key)[:5]
    recent = sorted(leads, key=lambda l: l.created_at, reverse=True)[:5]
    upcoming = [f for f in list_followups() if f.bucket != "completed"][:6]

    return DashboardStats(
        metrics=metrics,
        priority_distribution={
            "Hot": metrics.hot_leads,
            "Warm": metrics.warm_leads,
            "Cold": metrics.cold_leads,
            "Not analyzed": metrics.not_analyzed,
        },
        status_distribution={s.value: sum(1 for l in leads if l.status == s) for s in LeadStatus},
        recent_leads=[to_summary(l) for l in recent],
        top_priority_leads=[to_summary(l) for l in top],
        upcoming_followups=upcoming,
    )
