import uuid
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, and_, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.invoice_item import InvoiceItem
from src.models.invoice import Invoice
from src.models.product import Product
from src.models.category import Category
from src.models.user import User
from src.schemas.invoice_item import (
    InvoiceItemUpdate,
    InvoiceItemResponse,
    InvoiceItemList
)

router = APIRouter()


class BulkCategorizeRequest(BaseModel):
    item_ids: List[uuid.UUID]
    category_id: uuid.UUID


@router.get("/by-invoice/{invoice_id}", response_model=List[InvoiceItemList])
async def list_invoice_items(
    invoice_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all items for a specific invoice."""
    # Verify invoice belongs to user
    invoice_result = await db.execute(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.user_id == current_user.id
            )
        )
    )
    invoice = invoice_result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    query = select(
        InvoiceItem.id,
        InvoiceItem.description,
        InvoiceItem.quantity,
        InvoiceItem.unit_price,
        InvoiceItem.total_price,
        InvoiceItem.category_id,
        InvoiceItem.ai_suggested_category
    ).where(
        InvoiceItem.invoice_id == invoice_id
    ).order_by(InvoiceItem.description).offset(skip).limit(limit)
    
    result = await db.execute(query)
    items = result.all()
    
    return [
        InvoiceItemList(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            category_id=item.category_id,
            ai_suggested_category=item.ai_suggested_category
        )
        for item in items
    ]


@router.get("/{item_id}", response_model=InvoiceItemResponse)
async def get_invoice_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific invoice item by ID."""
    # Join with invoice to verify ownership
    result = await db.execute(
        select(InvoiceItem).join(
            Invoice, InvoiceItem.invoice_id == Invoice.id
        ).where(
            and_(
                InvoiceItem.id == item_id,
                Invoice.user_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found"
        )
    
    return item


@router.put("/{item_id}", response_model=InvoiceItemResponse)
async def update_invoice_item(
    item_id: uuid.UUID,
    item_data: InvoiceItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an invoice item (category, normalization)."""
    # Join with invoice to verify ownership
    result = await db.execute(
        select(InvoiceItem).join(
            Invoice, InvoiceItem.invoice_id == Invoice.id
        ).where(
            and_(
                InvoiceItem.id == item_id,
                Invoice.user_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found"
        )
    
    update_data = item_data.model_dump(exclude_unset=True)
    
    # Validate category_id if provided
    if "category_id" in update_data and update_data["category_id"]:
        cat_result = await db.execute(
            select(Category).where(
                and_(
                    Category.id == update_data["category_id"],
                    Category.user_id == current_user.id
                )
            )
        )
        category = cat_result.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    await db.commit()
    await db.refresh(item)
    
    return item


@router.patch("/{item_id}/category", response_model=InvoiceItemResponse)
async def update_item_category(
    item_id: uuid.UUID,
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update only the category of an invoice item."""
    # Join with invoice to verify ownership
    result = await db.execute(
        select(InvoiceItem).join(
            Invoice, InvoiceItem.invoice_id == Invoice.id
        ).where(
            and_(
                InvoiceItem.id == item_id,
                Invoice.user_id == current_user.id
            )
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found"
        )
    
    # Validate category
    cat_result = await db.execute(
        select(Category).where(
            and_(
                Category.id == category_id,
                Category.user_id == current_user.id
            )
        )
    )
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found"
        )
    
    item.category_id = category_id
    await db.commit()
    await db.refresh(item)
    
    return item


@router.post("/bulk-categorize", response_model=dict)
async def bulk_categorize(
    request: BulkCategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Categorize multiple invoice items at once."""
    # Validate category
    cat_result = await db.execute(
        select(Category).where(
            and_(
                Category.id == request.category_id,
                Category.user_id == current_user.id
            )
        )
    )
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found"
        )
    
    # Update all items that belong to the user's invoices
    stmt = (
        update(InvoiceItem)
        .where(
            and_(
                InvoiceItem.id.in_(request.item_ids),
                InvoiceItem.invoice_id.in_(
                    select(Invoice.id).where(
                        Invoice.user_id == current_user.id
                    )
                )
            )
        )
        .values(category_id=request.category_id)
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "updated_count": result.rowcount,
        "category_id": request.category_id
    }
