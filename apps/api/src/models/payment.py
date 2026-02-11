"""Payment model for tracking subscription payments."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.subscription import Subscription


class Payment(Base):
    """Payment record for subscription transactions."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("subscriptions.id"), nullable=False, index=True
    )

    # Amount
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="BRL", nullable=False)

    # Status: pending, succeeded, failed, refunded
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    # Provider info
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "stripe" | "apple" | "google"
    provider_payment_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    # Dates
    paid_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    refunded_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    subscription: Mapped["Subscription"] = relationship(back_populates="payments")
