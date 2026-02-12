"""
Audit log model for tracking administrative actions.

Records all admin operations for compliance and security auditing.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


if TYPE_CHECKING:
    from src.models.user import User


class AuditLog(Base):
    """Record of administrative actions for audit trail."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))

    # Action details
    action: Mapped[str] = mapped_column(
        String(50)
    )  # create, update, delete, impersonate, etc.
    resource_type: Mapped[str] = mapped_column(
        String(50)
    )  # user, subscription, payment, etc.
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)

    # Data snapshots (for rollback/investigation)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Request metadata
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Result tracking
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relationships
    admin_user: Mapped["User"] = relationship(foreign_keys=[admin_user_id])

    # Indexes for common queries
    __table_args__ = (
        Index("idx_audit_logs_created_at", "created_at"),
        Index("idx_audit_logs_resource", "resource_type", "resource_id"),
        Index("idx_audit_logs_admin_user", "admin_user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action}, resource={self.resource_type})>"
