import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, List, Dict

from pydantic import BaseModel, Field, field_validator


class ProductBase(BaseModel):
    code: str
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    total_price: Decimal


class ProductCreate(ProductBase):
    pass


class ProductInInvoice(ProductBase):
    id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    ai_category_suggestion: Optional[str] = None
    category_name: Optional[str] = None
    subcategory: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    access_key: str = Field(..., max_length=44)  # Removed min_length to allow shorter keys
    number: str
    series: str
    issue_date: datetime
    issuer_cnpj: str
    issuer_name: str
    total_value: Decimal
    type: str = Field(..., pattern="^(NFC-e|NF-e)$")
    source: str = Field(..., pattern="^(qrcode|xml|pdf|manual|image|photo)$")


class InvoiceCreate(InvoiceBase):
    raw_data: Optional[Dict[str, Any]] = None
    products: List[ProductCreate]


class InvoiceResponse(InvoiceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    products: List[ProductInInvoice]

    class Config:
        from_attributes = True


class InvoiceList(BaseModel):
    id: uuid.UUID
    access_key: str
    issuer_name: str
    total_value: Decimal
    issue_date: datetime
    product_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceItemUpdate(BaseModel):
    """Item para atualização de nota fiscal"""

    id: Optional[uuid.UUID] = None
    code: Optional[str] = None
    description: str
    quantity: Decimal
    unit: str = "UN"
    unit_price: Decimal
    total_price: Decimal
    category_name: Optional[str] = None
    subcategory: Optional[str] = None


class InvoiceUpdate(BaseModel):
    """Request para atualizar uma nota fiscal existente"""

    number: Optional[str] = None
    series: Optional[str] = None
    issue_date: Optional[datetime] = None
    issuer_name: Optional[str] = None
    issuer_cnpj: Optional[str] = None
    total_value: Optional[Decimal] = None
    access_key: Optional[str] = None
    items: Optional[List[InvoiceItemUpdate]] = None

    @field_validator('issue_date', mode='before')
    @classmethod
    def parse_issue_date(cls, v: Any) -> Optional[datetime]:
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            from dateutil import parser as dateutil_parser
            try:
                # Use .parse() instead of .isoparse() to handle multiple formats:
                # - ISO 8601: "2024-01-15T14:30:22"
                # - Brazilian: "15/01/2024 14:30:22" or "15/01/2024"
                # - US: "01/15/2024 14:30:22"
                dt = dateutil_parser.parse(v, dayfirst=True)
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except (ValueError, AttributeError, TypeError):
                return None
        return None

    @field_validator('number', 'series', 'access_key', mode='before')
    @classmethod
    def coerce_to_string(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)


class QRCodeRequest(BaseModel):
    qrcode_url: str = Field(..., min_length=1)
