import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile information for AI analysis."""
    household_income: Optional[Decimal] = Field(None, ge=0)
    adults_count: Optional[int] = Field(None, ge=0, le=20)
    children_count: Optional[int] = Field(None, ge=0, le=20)


class UserProfileResponse(BaseModel):
    """Schema for user profile response including AI-relevant fields."""
    id: uuid.UUID
    email: EmailStr
    full_name: str
    household_income: Optional[Decimal] = None
    adults_count: Optional[int] = None
    children_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
