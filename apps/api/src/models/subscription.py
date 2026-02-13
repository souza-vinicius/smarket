"""Subscription model for managing user subscriptions."""

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.payment import Payment
    from src.models.user import User


class SubscriptionPlan(str, enum.Enum):
    """Available subscription plans."""

    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"


class BillingCycle(str, enum.Enum):
    """Billing cycle options."""

    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status state machine."""

    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# Plan limits: (invoices/month, analyses/month) | None = unlimited
PLAN_LIMITS: dict[SubscriptionPlan, tuple[int | None, int | None]] = {
    SubscriptionPlan.FREE: (1, 2),
    SubscriptionPlan.BASIC: (5, 5),
    SubscriptionPlan.PREMIUM: (None, None),  # unlimited
}


class Subscription(Base):
    """User subscription record with trial support."""

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )

    # Plan and billing
    plan: Mapped[str] = mapped_column(
        String(20), default=SubscriptionPlan.FREE.value, nullable=False
    )
    billing_cycle: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # None for free/trial
    status: Mapped[str] = mapped_column(
        String(20), default=SubscriptionStatus.TRIAL.value, nullable=False
    )

    # Trial dates
    trial_start: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )
    trial_end: Mapped[datetime] = mapped_column(nullable=False)  # trial_start + 30d

    # Paid subscription dates
    current_period_start: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    current_period_end: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Stripe integration
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, index=True
    )
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True
    )

    # IAP (mobile) - for future Fase 3
    iap_provider: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # "apple" | "google"
    iap_original_transaction_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="subscription")
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="subscription", lazy="noload"
    )

    # Computed properties
    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        now = datetime.utcnow()
        if self.status == SubscriptionStatus.TRIAL.value:
            return now < self.trial_end
        if self.status == SubscriptionStatus.ACTIVE.value:
            return self.current_period_end is None or now < self.current_period_end
        if self.status == SubscriptionStatus.PAST_DUE.value:
            return True  # grace period - access maintained
        return False

    @property
    def plan_enum(self) -> SubscriptionPlan:
        """Get plan as enum."""
        return SubscriptionPlan(self.plan)

    @property
    def invoice_limit(self) -> int | None:
        """Get monthly invoice limit (None = unlimited).

        During trial period, limits are unlimited regardless of plan.
        """
        if self.status == SubscriptionStatus.TRIAL.value:
            return None  # unlimited during trial
        return PLAN_LIMITS[self.plan_enum][0]

    @property
    def analysis_limit(self) -> int | None:
        """Get monthly AI analysis limit (None = unlimited).

        During trial period, limits are unlimited regardless of plan.
        """
        if self.status == SubscriptionStatus.TRIAL.value:
            return None  # unlimited during trial
        return PLAN_LIMITS[self.plan_enum][1]
