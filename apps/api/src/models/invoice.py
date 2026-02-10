import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


if TYPE_CHECKING:
    from src.models.invoice_item import InvoiceItem
    from src.models.invoice_processing import InvoiceProcessing
    from src.models.merchant import Merchant
    from src.models.user import User


class Invoice(Base):
    """Nota Fiscal completa"""

    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint(
            "access_key", "user_id", name="uq_invoices_access_key_user_id"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    merchant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("merchants.id"), nullable=True
    )

    # Dados da nota fiscal
    access_key: Mapped[str] = mapped_column(
        String(44), index=True, nullable=False
    )  # Chave de acesso (44 caracteres) — unique per user via __table_args__
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    series: Mapped[str] = mapped_column(String(10), nullable=False)
    issue_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), nullable=False
    )

    # Dados do emissor
    issuer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer_cnpj: Mapped[str] = mapped_column(String(14), nullable=False)

    # Tipo e formato
    invoice_type: Mapped[str] = mapped_column(String(10), nullable=False)  # NFC-e, NF-e
    source: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # qrcode, xml, pdf, manual

    # Valores
    total_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    tax_value: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default="processed", nullable=False
    )  # processed, processing, error

    # Metadados
    item_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    category_distribution: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # {category_id: percentage}

    # XML completo (JSON)
    raw_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="invoices")
    merchant: Mapped[Optional["Merchant"]] = relationship(back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice", lazy="selectin", cascade="all, delete-orphan"
    )
    processing_records: Mapped[list["InvoiceProcessing"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )

    # Properties for schema compatibility
    @property
    def type(self) -> str:
        """Alias for invoice_type to match schema"""
        return self.invoice_type

    @property
    def products(self) -> list["InvoiceItem"]:
        """Alias for items to match schema"""
        return self.items
