"""
Admin area Pydantic schemas.

Request/response models for admin endpoints.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.core.roles import AdminRole


# ============================================================================
# User Management Schemas
# ============================================================================


class AdminUserListItem(BaseModel):
    """User item in admin list view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    admin_role: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime

    # Computed fields
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    invoices_count: int = 0


class AdminUserDetail(BaseModel):
    """Detailed user view for admin."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    admin_role: Optional[str] = None
    deleted_at: Optional[datetime] = None

    # Profile fields
    preferences: dict
    household_income: Optional[Decimal] = None
    adults_count: Optional[int] = None
    children_count: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    # Relationships (computed)
    subscription: Optional[dict] = None
    usage_record: Optional[dict] = None
    invoices_count: int = 0
    total_spent: Decimal = Decimal("0.00")


class AdminUserUpdate(BaseModel):
    """Update user fields (admin only)."""

    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    admin_role: Optional[AdminRole] = None
    household_income: Optional[Decimal] = None
    adults_count: Optional[int] = Field(None, ge=0, le=20)
    children_count: Optional[int] = Field(None, ge=0, le=20)


class ImpersonateRequest(BaseModel):
    """Request to impersonate a user."""

    target_user_id: uuid.UUID


class ImpersonateResponse(BaseModel):
    """Response with impersonation token."""

    access_token: str
    token_type: str = "bearer"
    user: AdminUserDetail


# ============================================================================
# Dashboard & Metrics Schemas
# ============================================================================


class DashboardStats(BaseModel):
    """High-level KPIs for admin dashboard."""

    total_users: int
    active_users: int
    paying_users: int
    trial_users: int

    mrr: Decimal  # Monthly Recurring Revenue
    arr: Decimal  # Annual Recurring Revenue
    arpu: Decimal  # Average Revenue Per User

    churn_rate: float  # Percentage
    trial_conversion_rate: float  # Percentage

    total_invoices: int
    invoices_this_month: int


class RevenueDataPoint(BaseModel):
    """Single data point for revenue chart."""

    month: str  # YYYY-MM format
    mrr: Decimal
    new_mrr: Decimal
    expansion_mrr: Decimal
    contraction_mrr: Decimal
    churn_mrr: Decimal


class GrowthDataPoint(BaseModel):
    """Single data point for growth chart."""

    month: str  # YYYY-MM format
    new_users: int
    churned_users: int
    net_growth: int
    total_users: int


class OperationalMetrics(BaseModel):
    """Operational metrics for OCR/invoice processing."""

    invoices_today: int
    invoices_this_week: int
    invoices_this_month: int

    ocr_success_rate: float  # Percentage
    avg_processing_time: float  # Seconds

    # Provider breakdown
    openrouter_usage: int
    gemini_usage: int
    openai_usage: int
    anthropic_usage: int

    avg_tokens_per_invoice: int
    estimated_monthly_cost: Decimal


# ============================================================================
# Audit Log Schemas
# ============================================================================


class AuditLogItem(BaseModel):
    """Audit log entry."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    admin_user_id: uuid.UUID
    admin_email: str  # Computed from relationship

    action: str
    resource_type: str
    resource_id: Optional[uuid.UUID] = None

    old_values: Optional[dict] = None
    new_values: Optional[dict] = None

    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None

    success: bool
    error_message: Optional[str] = None

    created_at: datetime


# ============================================================================
# Subscription Management Schemas (Admin)
# ============================================================================


class AdminSubscriptionListItem(BaseModel):
    """Subscription item in admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str  # Computed

    plan: str
    billing_cycle: str
    status: str

    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None

    stripe_subscription_id: Optional[str] = None
    created_at: datetime


class ExtendTrialRequest(BaseModel):
    """Request to extend trial period."""

    days: int = Field(..., ge=1, le=365, description="Days to extend trial")


# ============================================================================
# Payment Management Schemas (Admin)
# ============================================================================


class AdminPaymentListItem(BaseModel):
    """Payment item in admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID
    user_email: str  # Computed

    amount: Decimal
    currency: str
    status: str

    provider: str
    provider_payment_id: Optional[str] = None

    created_at: datetime


class RefundRequest(BaseModel):
    """Request to refund a payment."""

    amount: Optional[Decimal] = Field(
        None, description="Partial refund amount. Omit for full refund."
    )
    reason: Optional[str] = Field(None, max_length=500)


class RefundResponse(BaseModel):
    """Response after refund processing."""

    success: bool
    refund_id: str
    amount_refunded: Decimal
    message: str
