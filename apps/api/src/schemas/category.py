import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class CategoryCreate(CategoryBase):
    parent_id: Optional[uuid.UUID] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    parent_id: Optional[uuid.UUID] = None


class CategoryResponse(CategoryBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    parent_id: Optional[uuid.UUID]
    level: int
    total_spent: Decimal
    transaction_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CategoryList(BaseModel):
    id: uuid.UUID
    name: str
    color: str
    icon: Optional[str]
    level: int
    total_spent: Decimal
    transaction_count: int

    class Config:
        from_attributes = True


class CategoryTree(CategoryResponse):
    children: list["CategoryTree"] = []

    class Config:
        from_attributes = True
