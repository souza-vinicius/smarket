"""
Coupon and CouponUsage models for discount management.
"""

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class CouponType(str, enum.Enum):
    """Type of discount offered by a coupon."""

    PERCENTAGE = "percentage"  # Desconto percentual (ex: 20%)
    FIXED = "fixed"  # Desconto em valor fixo (ex: R$ 10)


class Coupon(Base):
    """
    Cupom de desconto para assinaturas.

    Regras de validação:
    - Validade por período (valid_from, valid_until)
    - Limite de uso global (max_uses)
    - Limite de uso por usuário (max_uses_per_user)
    - Compra mínima (min_purchase_amount)
    - Primeira compra apenas (first_time_only)
    - Reuso após cancelamento (allow_reuse_after_cancel)
    - Acumulação (is_stackable)
    - Aplicabilidade por plano/ciclo (applicable_plans, applicable_cycles)
    """

    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Tipo e valor do desconto
    discount_type: Mapped[str] = mapped_column(String(20))
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Restrições de uso
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1)
    min_purchase_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    # Controle avançado
    first_time_only: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_reuse_after_cancel: Mapped[bool] = mapped_column(Boolean, default=False)
    is_stackable: Mapped[bool] = mapped_column(Boolean, default=False)

    # Aplicabilidade (JSON - validação na camada de aplicação via Pydantic)
    # Valores válidos: ["free", "basic", "premium"] (SubscriptionPlan enum)
    applicable_plans: Mapped[list] = mapped_column(JSON, default=list)
    # Valores válidos: ["monthly", "yearly"] (BillingCycle enum)
    applicable_cycles: Mapped[list] = mapped_column(JSON, default=list)

    # Validade
    valid_from: Mapped[datetime] = mapped_column(nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Metadados
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relacionamentos
    usages: Mapped[list["CouponUsage"]] = relationship(back_populates="coupon")

    # Índices
    __table_args__ = (
        Index("idx_coupons_active_code", "is_active", "code"),
        Index("idx_coupons_validity", "valid_from", "valid_until"),
    )


class CouponUsage(Base):
    """
    Registro de uso de um cupom por um usuário em uma assinatura.
    """

    __tablename__ = "coupon_usages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    coupon_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("coupons.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    subscription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscriptions.id"))

    # Detalhes do uso
    original_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    final_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    used_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relacionamentos
    coupon: Mapped["Coupon"] = relationship(back_populates="usages")

    # Índices
    __table_args__ = (
        Index("idx_coupon_usages_user", "user_id", "coupon_id"),
        Index("idx_coupon_usages_subscription", "subscription_id"),
    )
