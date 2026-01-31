import uuid
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.merchant import Merchant
from src.models.user import User
from src.schemas.merchant import MerchantCreate, MerchantUpdate, MerchantResponse, MerchantList

router = APIRouter()


@router.get("/", response_model=List[MerchantList])
async def list_merchants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    is_favorite: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all merchants for current user."""
    query = select(
        Merchant.id,
        Merchant.name,
        Merchant.cnpj,
        Merchant.category,
        Merchant.is_favorite,
        Merchant.visit_count,
        Merchant.total_spent,
        Merchant.last_visit
    ).where(Merchant.user_id == current_user.id)
    
    if search:
        search_filter = or_(
            Merchant.name.ilike(f"%{search}%"),
            Merchant.cnpj.ilike(f"%{search}%"),
            Merchant.category.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    if is_favorite is not None:
        query = query.where(Merchant.is_favorite == is_favorite)
    
    query = query.order_by(Merchant.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    merchants = result.all()
    
    return [
        MerchantList(
            id=m.id,
            name=m.name,
            cnpj=m.cnpj,
            category=m.category,
            is_favorite=m.is_favorite,
            visit_count=m.visit_count,
            total_spent=m.total_spent,
            last_visit=m.last_visit
        )
        for m in merchants
    ]


@router.get("/favorites", response_model=List[MerchantList])
async def list_favorite_merchants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List favorite merchants for current user."""
    query = select(
        Merchant.id,
        Merchant.name,
        Merchant.cnpj,
        Merchant.category,
        Merchant.is_favorite,
        Merchant.visit_count,
        Merchant.total_spent,
        Merchant.last_visit
    ).where(
        and_(
            Merchant.user_id == current_user.id,
            Merchant.is_favorite == True
        )
    ).order_by(Merchant.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    merchants = result.all()
    
    return [
        MerchantList(
            id=m.id,
            name=m.name,
            cnpj=m.cnpj,
            category=m.category,
            is_favorite=m.is_favorite,
            visit_count=m.visit_count,
            total_spent=m.total_spent,
            last_visit=m.last_visit
        )
        for m in merchants
    ]


@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific merchant by ID."""
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.user_id == current_user.id
            )
        )
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found"
        )
    
    return merchant


@router.post("/", response_model=MerchantResponse, status_code=status.HTTP_201_CREATED)
async def create_merchant(
    merchant_data: MerchantCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new merchant."""
    # Check if merchant with same CNPJ already exists for this user
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.user_id == current_user.id,
                Merchant.cnpj == merchant_data.cnpj
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Merchant with this CNPJ already exists"
        )
    
    merchant = Merchant(
        user_id=current_user.id,
        name=merchant_data.name,
        legal_name=merchant_data.legal_name,
        cnpj=merchant_data.cnpj,
        category=merchant_data.category,
        address=merchant_data.address,
        city=merchant_data.city,
        state=merchant_data.state,
        visit_count=0,
        total_spent=Decimal("0.00"),
        average_ticket=Decimal("0.00")
    )
    
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)
    
    return merchant


@router.put("/{merchant_id}", response_model=MerchantResponse)
async def update_merchant(
    merchant_id: uuid.UUID,
    merchant_data: MerchantUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a merchant."""
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.user_id == current_user.id
            )
        )
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found"
        )
    
    update_data = merchant_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(merchant, field, value)
    
    await db.commit()
    await db.refresh(merchant)
    
    return merchant


@router.delete("/{merchant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merchant(
    merchant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a merchant."""
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.user_id == current_user.id
            )
        )
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found"
        )
    
    await db.delete(merchant)
    await db.commit()
    
    return None


@router.patch("/{merchant_id}/favorite", response_model=MerchantResponse)
async def toggle_favorite(
    merchant_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle favorite status for a merchant."""
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.user_id == current_user.id
            )
        )
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found"
        )
    
    merchant.is_favorite = not merchant.is_favorite
    await db.commit()
    await db.refresh(merchant)
    
    return merchant
