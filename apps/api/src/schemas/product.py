import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    typical_unit: Optional[str] = Field(None, max_length=10)
    typical_quantity: Optional[Decimal] = None


class ProductCreate(ProductBase):
    category_id: Optional[uuid.UUID] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    category_id: Optional[uuid.UUID] = None


class ProductResponse(ProductBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    category_id: Optional[uuid.UUID]
    normalized_name: str
    purchase_count: int
    average_price: Decimal
    last_price: Decimal
    min_price: Decimal
    max_price: Decimal
    price_trend: str
    aliases: list
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductList(BaseModel):
    id: uuid.UUID
    name: str
    brand: Optional[str]
    category_id: Optional[uuid.UUID]
    purchase_count: int
    average_price: Decimal
    price_trend: str

    class Config:
        from_attributes = True


class ProductPurchaseResult(BaseModel):
    id: uuid.UUID
    description: str
    normalized_name: Optional[str] = None
    quantity: Decimal
    unit: str
    unit_price: Decimal
    total_price: Decimal
    issue_date: datetime
    issuer_name: str
    merchant_name: Optional[str] = None
    invoice_id: uuid.UUID

    @field_serializer("quantity", "unit_price", "total_price")
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v)

    class Config:
        from_attributes = True
