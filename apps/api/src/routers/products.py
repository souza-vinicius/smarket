import uuid
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.invoice_item import InvoiceItem
from src.models.product import Product
from src.models.user import User
from src.schemas.product import (
    ProductCreate,
    ProductList,
    ProductPurchaseResult,
    ProductResponse,
    ProductUpdate,
)


router = APIRouter()


@router.get("/", response_model=list[ProductList])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all products for current user."""
    query = select(
        Product.id,
        Product.name,
        Product.brand,
        Product.category_id,
        Product.purchase_count,
        Product.average_price,
        Product.price_trend,
    ).where(
        or_(
            Product.user_id == current_user.id,
            Product.user_id.is_(None),  # Include global products
        )
    )

    if category_id:
        query = query.where(Product.category_id == category_id)

    if search:
        search_filter = or_(
            Product.name.ilike(f"%{search}%"),
            Product.normalized_name.ilike(f"%{search}%"),
            Product.brand.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    query = query.order_by(Product.purchase_count.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    products = result.all()

    return [
        ProductList(
            id=p.id,
            name=p.name,
            brand=p.brand,
            category_id=p.category_id,
            purchase_count=p.purchase_count,
            average_price=p.average_price,
            price_trend=p.price_trend,
        )
        for p in products
    ]


@router.get("/search-purchases", response_model=list[ProductPurchaseResult])
async def search_purchases(
    q: str = Query(..., min_length=2, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search purchase history by product description."""
    from src.models.invoice import Invoice
    from src.models.merchant import Merchant

    query = (
        select(
            InvoiceItem.id,
            InvoiceItem.description,
            InvoiceItem.quantity,
            InvoiceItem.unit,
            InvoiceItem.unit_price,
            InvoiceItem.total_price,
            Invoice.issue_date,
            Invoice.issuer_name,
            Invoice.id.label("invoice_id"),
            Merchant.name.label("merchant_name"),
        )
        .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
        .outerjoin(Merchant, Invoice.merchant_id == Merchant.id)
        .where(
            and_(
                Invoice.user_id == current_user.id,
                InvoiceItem.description.ilike(f"%{q}%"),
            )
        )
        .order_by(Invoice.issue_date.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        ProductPurchaseResult(
            id=r.id,
            description=r.description,
            quantity=r.quantity,
            unit=r.unit,
            unit_price=r.unit_price,
            total_price=r.total_price,
            issue_date=r.issue_date,
            issuer_name=r.issuer_name,
            merchant_name=r.merchant_name,
            invoice_id=r.invoice_id,
        )
        for r in rows
    ]


@router.get("/search", response_model=list[ProductList])
async def search_products(
    q: str = Query(..., min_length=1, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search products by name or brand."""
    search_filter = or_(
        Product.name.ilike(f"%{q}%"),
        Product.normalized_name.ilike(f"%{q}%"),
        Product.brand.ilike(f"%{q}%"),
    )

    query = (
        select(
            Product.id,
            Product.name,
            Product.brand,
            Product.category_id,
            Product.purchase_count,
            Product.average_price,
            Product.price_trend,
        )
        .where(
            and_(
                or_(Product.user_id == current_user.id, Product.user_id.is_(None)),
                search_filter,
            )
        )
        .order_by(Product.purchase_count.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    products = result.all()

    return [
        ProductList(
            id=p.id,
            name=p.name,
            brand=p.brand,
            category_id=p.category_id,
            purchase_count=p.purchase_count,
            average_price=p.average_price,
            price_trend=p.price_trend,
        )
        for p in products
    ]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific product by ID."""
    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                or_(Product.user_id == current_user.id, Product.user_id.is_(None)),
            )
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product."""
    # Generate normalized name
    normalized_name = product_data.name.upper().replace(" ", "_")

    product = Product(
        user_id=current_user.id,
        name=product_data.name,
        normalized_name=normalized_name,
        brand=product_data.brand,
        typical_unit=product_data.typical_unit,
        typical_quantity=product_data.typical_quantity,
        category_id=product_data.category_id,
        purchase_count=0,
        average_price=Decimal("0.00"),
        last_price=Decimal("0.00"),
        min_price=Decimal("0.00"),
        max_price=Decimal("0.00"),
        price_trend="stable",
        aliases=[],
    )

    db.add(product)
    await db.commit()
    await db.refresh(product)

    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a product."""
    result = await db.execute(
        select(Product).where(
            and_(Product.id == product_id, Product.user_id == current_user.id)
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or is a global product",
        )

    update_data = product_data.model_dump(exclude_unset=True)

    # Update normalized name if name changed
    if "name" in update_data:
        update_data["normalized_name"] = update_data["name"].upper().replace(" ", "_")

    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a product."""
    result = await db.execute(
        select(Product).where(
            and_(Product.id == product_id, Product.user_id == current_user.id)
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or is a global product",
        )

    await db.delete(product)
    await db.commit()


@router.get("/{product_id}/history", response_model=list[dict])
async def get_product_price_history(
    product_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a product."""
    # Verify product exists
    prod_result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                or_(Product.user_id == current_user.id, Product.user_id.is_(None)),
            )
        )
    )
    product = prod_result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    # Get invoice items for this product with invoice details
    from src.models.invoice import Invoice
    from src.models.merchant import Merchant

    query = (
        select(
            InvoiceItem.id,
            InvoiceItem.unit_price,
            InvoiceItem.total_price,
            InvoiceItem.quantity,
            InvoiceItem.invoice_id,
            Invoice.access_key,
            Invoice.issue_date,
            Invoice.issuer_name,
            Merchant.name.label("merchant_name"),
        )
        .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
        .outerjoin(Merchant, Invoice.merchant_id == Merchant.id)
        .where(
            and_(
                InvoiceItem.product_id == product_id, Invoice.user_id == current_user.id
            )
        )
        .order_by(Invoice.issue_date.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    history = result.all()

    return [
        {
            "id": h.id,
            "unit_price": h.unit_price,
            "total_price": h.total_price,
            "quantity": h.quantity,
            "invoice_id": h.invoice_id,
            "access_key": h.access_key,
            "issue_date": h.issue_date,
            "issuer_name": h.issuer_name,
            "merchant_name": h.merchant_name,
        }
        for h in history
    ]
