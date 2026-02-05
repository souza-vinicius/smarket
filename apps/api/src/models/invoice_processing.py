import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.models.user import User


class InvoiceProcessing(Base):
    """Registro de processamento de imagens de notas fiscais via LLM"""

    __tablename__ = "invoice_processing"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Status do processamento
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True
    )  # pending, processing, extracted, validating, completed, error

    # Dados das imagens
    image_ids: Mapped[list] = mapped_column(
        JSON,
        nullable=False
    )  # Lista de IDs/paths das imagens salvas
    image_count: Mapped[int] = mapped_column(
        default=0,
        nullable=False
    )

    # Dados extraídos pela IA
    extracted_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )  # Dados estruturados extraídos do Gemini

    # Validação com Sefaz
    sefaz_validated: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )
    sefaz_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True
    )  # Dados retornados pela Sefaz

    # Confiança da extração
    confidence_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )  # 0.0 a 1.0

    # Erros e avisos
    errors: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )  # Lista de mensagens de erro
    warnings: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False
    )  # Lista de avisos

    # Invoice criada (se confirmada)
    invoice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("invoices.id"),
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship(
        back_populates="invoice_processing"
    )
