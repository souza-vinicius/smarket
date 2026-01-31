import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    ForeignKey, Integer, Float, DateTime,
    Enum as SQLEnum, Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User


class PatternType(str, enum.Enum):
    """Tipos de padrões de compra"""
    # Compra o mesmo produto periodicamente
    RECURRING_PRODUCT = "recurring_product"
    # Visita o mesmo estabelecimento
    RECURRING_MERCHANT = "recurring_merchant"
    # Compra em dia específico
    DAY_OF_WEEK = "day_of_week"
    # Compra em horário específico
    TIME_OF_DAY = "time_of_day"
    # Padrão sazonal
    SEASONAL = "seasonal"


class TargetType(str, enum.Enum):
    """Tipos de alvo do padrão"""
    PRODUCT = "product"
    MERCHANT = "merchant"
    CATEGORY = "category"


class Frequency(str, enum.Enum):
    """Frequência do padrão"""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class PurchasePattern(Base):
    """Padrões de compra detectados para geração de insights"""
    
    __tablename__ = "purchase_patterns"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    # Tipo de padrão
    pattern_type: Mapped[PatternType] = mapped_column(
        SQLEnum(PatternType),
        nullable=False
    )

    # Alvo do padrão
    target_type: Mapped[TargetType] = mapped_column(
        SQLEnum(TargetType),
        nullable=False
    )
    target_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False
    )  # ID do produto, merchant ou categoria

    # Frequência
    frequency: Mapped[Optional[Frequency]] = mapped_column(
        SQLEnum(Frequency),
        nullable=True
    )
    # Média de dias entre compras
    average_interval_days: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )

    # Ocorrências
    last_occurrence: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    # Quando a IA prevê a próxima compra
    next_predicted: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    occurrence_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # Qualidade do padrão (0-1, quão regular é)
    consistency_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )

    # Alerta
    alert_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    # Alertar se passar X dias
    alert_threshold_days: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
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
    user: Mapped["User"] = relationship(
        back_populates="purchase_patterns"
    )
