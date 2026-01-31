import uuid
from decimal import Decimal
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, Field


class InvoiceItemBase(BaseModel):
    code: str
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    total_price: Decimal


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    normalized_name: Optional[str] = Field(None, max_length=255)
    brand: Optional[str] = Field(None, max_length=100)


class InvoiceItemResponse(InvoiceItemBase):
    id: uuid.UUID
    invoice_id: uuid.UUID
    product_id: Optional[uuid.UUID]
    category_id: Optional[uuid.UUID]
    discount: Decimal
    normalized_name: Optional[str]
    brand: Optional[str]
    quantity_normalized: Optional[Decimal]
    ai_suggested_category: Optional[str]
    ai_confidence: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceItemList(BaseModel):
    id: uuid.UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    category_id: Optional[uuid.UUID]
    ai_suggested_category: Optional[str]

    class Config:
        from_attributes = True
