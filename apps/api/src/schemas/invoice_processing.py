import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Any

from dateutil import parser as dateutil_parser
from pydantic import BaseModel, Field, field_validator, model_validator


class ExtractedItem(BaseModel):
    """Item extraído da nota fiscal"""

    code: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    category_name: Optional[str] = None
    subcategory: Optional[str] = None


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

    @field_validator('number', 'series', 'access_key', mode='before')
    @classmethod
    def coerce_to_string(cls, v: Any) -> Optional[str]:
        """Converte valores numéricos para string"""
        if v is None:
            return None
        return str(v)

    @model_validator(mode='before')
    @classmethod
    def extract_issuer_fields(cls, data: Any) -> Any:
        """Extrai issuer_name e issuer_cnpj do objeto issuer se presente"""
        if isinstance(data, dict):
            issuer = data.pop('issuer', None)
            if issuer and isinstance(issuer, dict):
                if 'name' in issuer and not data.get('issuer_name'):
                    data['issuer_name'] = issuer['name']
                if 'cnpj' in issuer and not data.get('issuer_cnpj'):
                    data['issuer_cnpj'] = issuer['cnpj']
        return data


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


class InvoiceProcessingList(BaseModel):
    """Item na lista de processamentos aguardando revisão"""

    processing_id: uuid.UUID
    status: str
    image_count: int
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    extracted_issuer_name: Optional[str] = None
    extracted_total_value: Optional[float] = None
    extracted_issue_date: Optional[datetime] = None
    errors: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProcessingConfirmRequest(BaseModel):
    """Request para confirmar dados extraídos (dados completos editados)"""

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
    image_count: Optional[int] = None

    @field_validator('issue_date', mode='before')
    @classmethod
    def parse_issue_date(cls, v: Any) -> Optional[datetime]:
        """Parse date in multiple formats (ISO 8601, Brazilian DD/MM/YYYY, US MM/DD/YYYY)"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            try:
                # Use .parse() with dayfirst=True to handle:
                # - Brazilian format: "15/01/2024 14:30:22" or "15/01/2024"
                # - ISO 8601: "2024-01-15T14:30:22"
                # - US format: "01/15/2024" (handles with dayfirst preference)
                dt = dateutil_parser.parse(v, dayfirst=True)
                # Make timezone-naive for PostgreSQL compatibility
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except (ValueError, AttributeError, TypeError) as e:
                # Log the error but don't fail
                import logging
                logging.warning(f"Failed to parse date '{v}': {e}")
                return None
        return None

    @field_validator('number', 'series', 'access_key', mode='before')
    @classmethod
    def coerce_to_string(cls, v: Any) -> Optional[str]:
        """Converte valores numéricos para string"""
        if v is None:
            return None
        return str(v)
