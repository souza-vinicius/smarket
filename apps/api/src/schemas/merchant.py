import uuid
from decimal import Decimal
from typing import List, Optional
from datetime import date

from pydantic import BaseModel, Field


class MerchantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    cnpj: str = Field(..., min_length=14, max_length=14)
    category: Optional[str] = Field(None, max_length=50)


class MerchantCreate(MerchantBase):
    address: Optional[dict] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)


class MerchantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    legal_name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=50)
    address: Optional[dict] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    is_favorite: Optional[bool] = None


class MerchantResponse(MerchantBase):
    id: uuid.UUID
    user_id: uuid.UUID
    address: Optional[dict]
    city: Optional[str]
    state: Optional[str]
    is_favorite: bool
    visit_count: int
    total_spent: Decimal
    average_ticket: Decimal
    first_visit: Optional[date]
    last_visit: Optional[date]
    created_at: date
    updated_at: date

    class Config:
        from_attributes = True


class MerchantList(BaseModel):
    id: uuid.UUID
    name: str
    cnpj: str
    category: Optional[str]
    is_favorite: bool
    visit_count: int
    total_spent: Decimal
    last_visit: Optional[date]

    class Config:
        from_attributes = True
