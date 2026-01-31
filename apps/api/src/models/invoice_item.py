import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Numeric, ForeignKey, JSON, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.product import Product
    from src.models.category import Category


class InvoiceItem(Base):
    """Item específico de uma nota fiscal (instância de compra)"""
    
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("invoices.id"),
        nullable=False
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("products.id"),
        nullable=True
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"),
        nullable=True
    )

    # Dados do item na nota (como veio na nota fiscal)
    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3),
        nullable=False
    )
    unit: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        nullable=False
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        nullable=False
    )
    discount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )

    # Normalização (extraído da descrição)
    normalized_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )  # Nome limpo: "ARROZ" ao invés de "ARROZ TIPO 1 5KG"
    brand: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )  # Marca extraída
    quantity_normalized: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 3),
        nullable=True
    )  # Quantidade em unidade base

    # Categorização por IA
    ai_suggested_category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    ai_confidence: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )  # 0-1, confiança da sugestão

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship(
        back_populates="items"
    )
    product: Mapped[Optional["Product"]] = relationship(
        back_populates="invoice_items"
    )
    category: Mapped[Optional["Category"]] = relationship(
        back_populates="invoice_items"
    )
