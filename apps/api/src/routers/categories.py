import uuid
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.category import Category
from src.models.invoice_item import InvoiceItem
from src.models.user import User
from src.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryList,
    CategoryTree
)

router = APIRouter()


def build_category_tree(categories: List[Category]) -> List[CategoryTree]:
    """Build a tree structure from flat category list."""
    category_map = {cat.id: cat for cat in categories}
    tree = []
    
    for cat in categories:
        if cat.parent_id is None:
            tree.append(cat)
    
    def add_children(parent: Category, all_cats: dict):
        children = [c for c in all_cats.values() if c.parent_id == parent.id]
        parent.children = children
        for child in children:
            add_children(child, all_cats)
    
    for root in tree:
        add_children(root, category_map)
    
    return tree


@router.get("/", response_model=List[CategoryTree])
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    flat: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all categories for current user (tree or flat)."""
    # Get system categories (user_id is None) + user's own categories
    query = select(Category).where(
        and_(
            Category.user_id == current_user.id,
            Category.parent_id.is_(None)
        )
    ).order_by(Category.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    if flat:
        return list(categories)
    
    # For tree view, we need all categories including children
    all_query = select(Category).where(
        Category.user_id == current_user.id
    ).order_by(Category.level, Category.name)
    
    all_result = await db.execute(all_query)
    all_categories = all_result.scalars().all()
    
    return build_category_tree(list(all_categories))


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific category by ID."""
    result = await db.execute(
        select(Category).where(
            and_(
                Category.id == category_id,
                Category.user_id == current_user.id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    return category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new category."""
    # Calculate level based on parent
    level = 0
    if category_data.parent_id:
        parent_result = await db.execute(
            select(Category).where(
                and_(
                    Category.id == category_data.parent_id,
                    Category.user_id == current_user.id
                )
            )
        )
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent category not found"
            )
        level = parent.level + 1
    
    category = Category(
        user_id=current_user.id,
        name=category_data.name,
        description=category_data.description,
        color=category_data.color,
        icon=category_data.icon,
        parent_id=category_data.parent_id,
        level=level,
        total_spent=Decimal("0.00"),
        transaction_count=0
    )
    
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a category."""
    result = await db.execute(
        select(Category).where(
            and_(
                Category.id == category_id,
                Category.user_id == current_user.id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    update_data = category_data.model_dump(exclude_unset=True)
    
    # Handle parent_id change - update level
    if "parent_id" in update_data and update_data["parent_id"] != category.parent_id:
        if update_data["parent_id"]:
            parent_result = await db.execute(
                select(Category).where(
                    and_(
                        Category.id == update_data["parent_id"],
                        Category.user_id == current_user.id
                    )
                )
            )
            parent = parent_result.scalar_one_or_none()
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent category not found"
                )
            category.level = parent.level + 1
        else:
            category.level = 0
    
    for field, value in update_data.items():
        if field != "parent_id":
            setattr(category, field, value)
    
    if "parent_id" in update_data:
        category.parent_id = update_data["parent_id"]
    
    await db.commit()
    await db.refresh(category)
    
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a category."""
    result = await db.execute(
        select(Category).where(
            and_(
                Category.id == category_id,
                Category.user_id == current_user.id
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if category has children
    children_result = await db.execute(
        select(Category).where(Category.parent_id == category_id)
    )
    children = children_result.scalars().all()
    
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with subcategories"
        )
    
    await db.delete(category)
    await db.commit()
    
    return None


@router.get("/{category_id}/items", response_model=List[dict])
async def get_category_items(
    category_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all invoice items in a category."""
    # Verify category exists and belongs to user
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Get items in this category
    from src.models.invoice import Invoice
    
    query = select(
        InvoiceItem.id,
        InvoiceItem.description,
        InvoiceItem.quantity,
        InvoiceItem.unit_price,
        InvoiceItem.total_price,
        InvoiceItem.invoice_id,
        Invoice.issuer_name.label("merchant_name"),
        Invoice.issue_date
    ).join(
        Invoice, InvoiceItem.invoice_id == Invoice.id
    ).where(
        and_(
            InvoiceItem.category_id == category_id,
            Invoice.user_id == current_user.id
        )
    ).order_by(Invoice.issue_date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    items = result.all()
    
    return [
        {
            "id": item.id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
            "invoice_id": item.invoice_id,
            "merchant_name": item.merchant_name,
            "issue_date": item.issue_date
        }
        for item in items
    ]
