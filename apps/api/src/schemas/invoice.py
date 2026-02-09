import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional, List, Dict

from pydantic import BaseModel, Field, field_validator


class ProductBase(BaseModel):
    code: str
    description: str
    normalized_name: Optional[str] = None
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
    normalized_name: Optional[str] = None
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
            dt = v
        elif isinstance(v, str):
            from dateutil import parser as dateutil_parser
            try:
                # Detect format: if contains 'T' or '-', it's likely ISO format
                # Use .parse() with appropriate dayfirst setting:
                # - ISO 8601: "2024-01-15T14:30:22" → dayfirst=False
                # - Brazilian format: "15/01/2024 14:30:22" → dayfirst=True
                use_dayfirst = '/' in v  # Brazilian format uses slashes
                dt = dateutil_parser.parse(v, dayfirst=use_dayfirst)
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
            except (ValueError, AttributeError, TypeError):
                return None
        else:
            return None

        # Validate that date is not in the future (allow up to 1 hour tolerance for timezone differences)
        now = datetime.utcnow()
        tolerance = timedelta(hours=1)

        if dt > (now + tolerance):
            raise ValueError('A data da nota fiscal não pode ser futura')

        return dt

    @field_validator('number', 'series', 'access_key', mode='before')
    @classmethod
    def coerce_to_string(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)


class QRCodeRequest(BaseModel):
    qrcode_url: str = Field(..., min_length=1)
