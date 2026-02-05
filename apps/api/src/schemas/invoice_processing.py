import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ExtractedItem(BaseModel):
    """Item extraído da nota fiscal"""

    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None


class ExtractedInvoiceData(BaseModel):
    """Dados extraídos de uma imagem de nota fiscal"""

    access_key: Optional[str] = None
    number: Optional[str] = None
    series: Optional[str] = None
    issue_date: Optional[datetime] = None
    issuer_name: Optional[str] = None
    issuer_cnpj: Optional[str] = None
    total_value: Optional[Decimal] = None
    items: list[ExtractedItem] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)


class ProcessingResponse(BaseModel):
    """Resposta ao fazer upload de fotos"""

    processing_id: uuid.UUID
    status: str
    message: str
    estimated_seconds: int = 30


class ProcessingStatus(BaseModel):
    """Status do processamento de imagens"""

    processing_id: uuid.UUID
    status: str
    extracted_data: Optional[ExtractedInvoiceData] = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceCorrection(BaseModel):
    """Correções opcionais feitas pelo usuário antes de confirmar"""

    issuer_name: Optional[str] = None
    total_value: Optional[Decimal] = None
    items: Optional[list[ExtractedItem]] = None


class ProcessingConfirmRequest(BaseModel):
    """Request para confirmar dados extraídos"""

    corrections: Optional[InvoiceCorrection] = None
