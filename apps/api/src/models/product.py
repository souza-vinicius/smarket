import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Numeric, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.category import Category
    from src.models.invoice_item import InvoiceItem


class Product(Base):
    """Produto genérico catalogado para análise"""
    
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )  # Null = produto global do sistema
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"),
        nullable=True
    )

    # Identificação
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    normalized_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )  # Nome para matching: "ARROZ_TIPO_1"

    # Características
    typical_unit: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True
    )  # Unidade mais comum
    typical_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 3),
        nullable=True
    )  # Quantidade típica
    brand: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )  # Marca, se identificável

    # Estatísticas do usuário
    purchase_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )  # Quantas vezes comprou
    average_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )  # Preço médio pago
    last_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )  # Último preço pago
    min_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )
    max_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )
    price_trend: Mapped[str] = mapped_column(
        String(20),
        default="stable",
        nullable=False
    )  # increasing, decreasing, stable

    # Matching
    aliases: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )  # Variações de nome: ["ARROZ 5KG", "ARROZ TIPO 1"]

    # Timestamps
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
    user: Mapped[Optional["User"]] = relationship(
        back_populates="products"
    )
    category: Mapped[Optional["Category"]] = relationship(
        back_populates="products"
    )
    invoice_items: Mapped[List["InvoiceItem"]] = relationship(
        back_populates="product",
        lazy="selectin"
    )
