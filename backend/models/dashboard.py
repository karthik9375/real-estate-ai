from pydantic import BaseModel

from models.followup import FollowUpView
from models.lead import LeadSummary


class DashboardMetrics(BaseModel):
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    not_analyzed: int
    requiring_followup: int
    converted_leads: int
    overdue_followups: int
    today_followups: int
    average_score: float | None


class DashboardStats(BaseModel):
    metrics: DashboardMetrics
    priority_distribution: dict[str, int]
    status_distribution: dict[str, int]
    recent_leads: list[LeadSummary]
    top_priority_leads: list[LeadSummary]
    upcoming_followups: list[FollowUpView]
