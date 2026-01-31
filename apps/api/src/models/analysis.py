import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, ForeignKey, JSON, Boolean, Date, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.invoice import Invoice


class Analysis(Base):
    """Insights e análises geradas pela IA"""
    
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("invoices.id"),
        nullable=True
    )  # Se for análise específica de uma nota

    # Classificação
    type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )  # spending_pattern, price_alert, category_insight, merchant_pattern, recommendation, summary
    priority: Mapped[str] = mapped_column(
        String(10),
        default="medium",
        nullable=False
    )  # low, medium, high, critical

    # Conteúdo
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    details: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False
    )  # Dados estruturados da análise

    # Contexto
    reference_period_start: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )
    reference_period_end: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )
    related_categories: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )  # Array de category_ids
    related_merchants: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )  # Array de merchant_ids

    # Status
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    is_acted_upon: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )  # Usuário tomou alguma ação
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True
    )  # Se o usuário descartou

    # Métricas da IA
    ai_model: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )  # Qual modelo gerou: gpt-4o-mini
    confidence_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )  # 0-1

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
        back_populates="analyses"
    )
