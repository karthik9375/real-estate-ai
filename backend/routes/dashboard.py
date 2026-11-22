from fastapi import APIRouter

from models.dashboard import DashboardStats
from services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats():
    return dashboard_service.get_stats()
