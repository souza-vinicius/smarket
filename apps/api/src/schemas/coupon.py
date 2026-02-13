"""
Pydantic schemas for coupon management.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.models.coupon import CouponType
from src.models.subscription import BillingCycle, SubscriptionPlan


# ============================================================================
# Coupon Schemas
# ============================================================================


class CouponBase(BaseModel):
    """Base coupon fields."""

    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    discount_type: CouponType
    discount_value: Decimal = Field(..., gt=0)
    max_uses: Optional[int] = Field(None, gt=0)
    max_uses_per_user: int = Field(default=1, gt=0)
    min_purchase_amount: Optional[Decimal] = Field(None, gt=0)
    first_time_only: bool = False
    allow_reuse_after_cancel: bool = False
    is_stackable: bool = False
    applicable_plans: list[SubscriptionPlan] = Field(default_factory=list)
    applicable_cycles: list[BillingCycle] = Field(default_factory=list)
    valid_from: datetime
    valid_until: Optional[datetime] = None
    is_active: bool = True

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, v: Decimal, info) -> Decimal:
        """Validate discount value based on type."""
        discount_type = info.data.get("discount_type")
        if discount_type == CouponType.PERCENTAGE and v > 100:
            raise ValueError("Percentage discount cannot exceed 100%")
        return v

    @field_validator("valid_until")
    @classmethod
    def validate_validity_period(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Ensure valid_until is after valid_from."""
        if v is not None:
            valid_from = info.data.get("valid_from")
            if valid_from and v <= valid_from:
                raise ValueError("valid_until must be after valid_from")
        return v


class CouponCreate(CouponBase):
    """Schema for creating a coupon."""

    pass


class CouponUpdate(BaseModel):
    """Schema for updating a coupon."""

    description: Optional[str] = Field(None, max_length=255)
    max_uses: Optional[int] = Field(None, gt=0)
    max_uses_per_user: Optional[int] = Field(None, gt=0)
    min_purchase_amount: Optional[Decimal] = Field(None, gt=0)
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class CouponResponse(CouponBase):
    """Schema for coupon responses."""

    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0  # Computed field

    model_config = {"from_attributes": True}


class CouponListItem(BaseModel):
    """Schema for coupon list items."""

    id: UUID
    code: str
    description: Optional[str]
    discount_type: CouponType
    discount_value: Decimal
    valid_from: datetime
    valid_until: Optional[datetime]
    is_active: bool
    usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Coupon Validation (Public)
# ============================================================================


class CouponValidateRequest(BaseModel):
    """Request to validate a coupon."""

    code: str
    plan: SubscriptionPlan
    billing_cycle: BillingCycle
    amount: Decimal = Field(..., gt=0)


class CouponValidateResponse(BaseModel):
    """Response from coupon validation."""

    valid: bool
    coupon_id: Optional[UUID] = None
    discount_type: Optional[CouponType] = None
    discount_value: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    final_amount: Optional[Decimal] = None
    message: Optional[str] = None


# ============================================================================
# Coupon Usage Schemas
# ============================================================================


class CouponUsageResponse(BaseModel):
    """Schema for coupon usage responses."""

    id: UUID
    user_id: UUID
    subscription_id: UUID
    original_amount: Decimal
    discount_amount: Decimal
    final_amount: Decimal
    is_active: bool
    canceled_at: Optional[datetime]
    used_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Coupon Statistics
# ============================================================================


class CouponStatsResponse(BaseModel):
    """Statistics for a specific coupon."""

    coupon_id: UUID
    code: str
    total_uses: int
    active_uses: int
    total_revenue: Decimal
    total_discount: Decimal
    unique_users: int
    most_recent_use: Optional[datetime]
