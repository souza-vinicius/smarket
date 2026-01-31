import uuid
from datetime import date, datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


class AnalysisBase(BaseModel):
    type: str = Field(..., max_length=30)
    title: str = Field(..., min_length=1, max_length=255)
    description: str
    priority: str = Field(default="medium", max_length=10)


class AnalysisCreate(AnalysisBase):
    details: Dict[str, Any] = {}
    reference_period_start: Optional[date] = None
    reference_period_end: Optional[date] = None
    related_categories: list = []
    related_merchants: list = []


class AnalysisUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_acted_upon: Optional[bool] = None
    dismissed_at: Optional[datetime] = None


class AnalysisResponse(AnalysisBase):
    id: uuid.UUID
    user_id: uuid.UUID
    invoice_id: Optional[uuid.UUID]
    details: Dict[str, Any]
    reference_period_start: Optional[date]
    reference_period_end: Optional[date]
    related_categories: list
    related_merchants: list
    is_read: bool
    is_acted_upon: bool
    dismissed_at: Optional[datetime]
    ai_model: Optional[str]
    confidence_score: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnalysisList(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    priority: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_spent_month: float
    total_spent_last_month: float
    percentage_change: float
    transaction_count: int
    top_merchants: list
    top_categories: list
    unread_analyses: int
    recent_analyses: list


# Alias for backward compatibility
DashboardData = DashboardSummary
