import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


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

    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    access_key: str = Field(..., min_length=44, max_length=44)
    number: str
    series: str
    issue_date: datetime
    issuer_cnpj: str
    issuer_name: str
    total_value: Decimal
    type: str = Field(..., pattern="^(NFC-e|NF-e)$")
    source: str = Field(..., pattern="^(qrcode|xml|pdf|manual)$")


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


class QRCodeRequest(BaseModel):
    qrcode_url: str = Field(..., min_length=1)
