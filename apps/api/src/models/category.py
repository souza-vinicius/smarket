import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.product import Product
    from src.models.invoice_item import InvoiceItem


class Category(Base):
    """Categorias de produtos (hierárquicas)"""
    
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )  # Null = categoria padrão do sistema
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id"),
        nullable=True
    )  # Para subcategorias

    # Dados básicos
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    color: Mapped[str] = mapped_column(
        String(7),
        default="#3B82F6",
        nullable=False
    )  # Hex color para gráficos
    icon: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )  # Nome do ícone

    # Hierarquia
    level: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )  # 0 = raiz, 1 = subcategoria

    # Estatísticas
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(15, 2),
        default=Decimal("0"),
        nullable=False
    )
    transaction_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

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
        back_populates="categories"
    )
    parent: Mapped[Optional["Category"]] = relationship(
        remote_side="Category.id",
        back_populates="children"
    )
    children: Mapped[List["Category"]] = relationship(
        back_populates="parent",
        lazy="selectin"
    )
    products: Mapped[List["Product"]] = relationship(
        back_populates="category",
        lazy="selectin"
    )
    invoice_items: Mapped[List["InvoiceItem"]] = relationship(
        back_populates="category",
        lazy="selectin"
    )
