import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.category import Category
    from src.models.analysis import Analysis
    from src.models.merchant import Merchant
    from src.models.purchase_pattern import PurchasePattern
    from src.models.product import Product
    from src.models.invoice_processing import InvoiceProcessing


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Preferências do usuário
    preferences: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False
    )  # {currency, language, notifications_enabled, etc.}

    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    invoices: Mapped[List["Invoice"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    categories: Mapped[List["Category"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    analyses: Mapped[List["Analysis"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    merchants: Mapped[List["Merchant"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    purchase_patterns: Mapped[List["PurchasePattern"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    products: Mapped[List["Product"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
    invoice_processing: Mapped[List["InvoiceProcessing"]] = relationship(
        back_populates="user",
        lazy="selectin"
    )
