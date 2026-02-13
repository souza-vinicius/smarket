import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Boolean, Index, Integer, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


if TYPE_CHECKING:
    from src.models.analysis import Analysis
    from src.models.category import Category
    from src.models.invoice import Invoice
    from src.models.invoice_processing import InvoiceProcessing
    from src.models.merchant import Merchant
    from src.models.product import Product
    from src.models.purchase_pattern import PurchasePattern
    from src.models.subscription import Subscription


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Admin fields
    admin_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Preferências do usuário
    preferences: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )  # {currency, language, notifications_enabled, etc.}

    # Informações do perfil para IA
    household_income: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True, default=None
    )
    adults_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=1
    )
    children_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    categories: Mapped[list["Category"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    merchants: Mapped[list["Merchant"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    purchase_patterns: Mapped[list["PurchasePattern"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    products: Mapped[list["Product"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    invoice_processing: Mapped[list["InvoiceProcessing"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(
        back_populates="user", lazy="selectin", uselist=False
    )

    # Properties
    @property
    def is_admin(self) -> bool:
        """Check if user has any admin role."""
        return self.admin_role is not None

    # Table constraints and indexes
    __table_args__ = (
        Index(
            "idx_users_admin_role",
            "admin_role",
            postgresql_where=text("admin_role IS NOT NULL"),
        ),
    )
