"""Usage tracking model for monthly consumption limits."""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class UsageRecord(Base):
    """Monthly usage counter per user."""

    __tablename__ = "usage_records"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_usage_user_year_month"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12

    invoices_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ai_analyses_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
    )
