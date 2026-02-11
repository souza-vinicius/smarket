"""Subscription-related Pydantic schemas."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class SubscriptionResponse(BaseModel):
    """Subscription response schema."""

    id: uuid.UUID
    plan: str
    billing_cycle: Optional[str] = None
    status: str
    trial_start: datetime
    trial_end: datetime
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    is_active: bool
    invoice_limit: Optional[int] = None
    analysis_limit: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UsageResponse(BaseModel):
    """Current month usage response."""

    invoices_used: int
    invoices_limit: Optional[int]  # None = unlimited
    ai_analyses_used: int
    ai_analyses_limit: Optional[int]  # None = unlimited
    month: int
    year: int


class CheckoutRequest(BaseModel):
    """Stripe Checkout session request."""

    plan: str = Field(..., pattern="^(basic|premium)$")
    billing_cycle: str = Field(..., pattern="^(monthly|yearly)$")
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    """Stripe Checkout session response."""

    checkout_url: str
    session_id: str


class PaymentResponse(BaseModel):
    """Payment history item."""

    id: uuid.UUID
    amount: Decimal
    currency: str
    status: str
    provider: str
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
