import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


if TYPE_CHECKING:
    from src.models.invoice import Invoice
    from src.models.user import User


class Merchant(Base):
    """Estabelecimento comercial (loja, supermercado, etc.)"""

    __tablename__ = "merchants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Dados do estabelecimento
    cnpj: Mapped[str] = mapped_column(String(14), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # Nome fantasia
    legal_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Razão social

    # Endereço
    address: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # {street, number, neighborhood, city, state, zip}
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)  # UF

    # Categoria do estabelecimento
    category: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # supermercado, farmacia, restaurante, etc.

    # Preferências do usuário
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Estatísticas
    visit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )
    average_ticket: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0"), nullable=False
    )

    # Timestamps
    first_visit: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    last_visit: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="merchants")
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="merchant", lazy="selectin"
    )
