"""
Admin endpoints for coupon management.
"""

import uuid
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import timezone

from src.database import get_db

from src.dependencies import get_current_admin, require_permission
from src.models.coupon import Coupon, CouponUsage
from src.models.user import User
from src.schemas.coupon import (
    CouponCreate,
    CouponListItem,
    CouponResponse,
    CouponStatsResponse,
    CouponUpdate,
    CouponUsageResponse,
)
from src.services.admin_service import AdminService
from src.services.coupon_service import CouponService

logger = structlog.get_logger()

coupons_router = APIRouter(prefix="/coupons", tags=["admin-coupons"])


@coupons_router.get(
    "",
    dependencies=[Depends(require_permission("coupon:read"))],
)
async def list_coupons(
    db: AsyncSession = Depends(get_db),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by code or description"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List all coupons with pagination and filters."""
    # Base query with usage count
    usage_count_sq = (
        select(func.count(CouponUsage.id))
        .where(
            CouponUsage.coupon_id == Coupon.id, CouponUsage.is_active == True
        )
        .correlate(Coupon)
        .scalar_subquery()
    )

    query = select(
        Coupon.id,
        Coupon.code,
        Coupon.description,
        Coupon.discount_type,
        Coupon.discount_value,
        Coupon.valid_from,
        Coupon.valid_until,
        Coupon.is_active,
        Coupon.created_at,
        usage_count_sq.label("usage_count"),
    )

    # Apply filters
    if is_active is not None:
        query = query.where(Coupon.is_active == is_active)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            (Coupon.code.ilike(pattern)) | (Coupon.description.ilike(pattern))
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(Coupon.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    coupons = [
        CouponListItem(
            id=row.id,
            code=row.code,
            description=row.description,
            discount_type=row.discount_type,
            discount_value=row.discount_value,
            valid_from=row.valid_from,
            valid_until=row.valid_until,
            is_active=row.is_active,
            usage_count=row.usage_count or 0,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return {
        "coupons": [c.model_dump(mode="json") for c in coupons],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@coupons_router.get(
    "/{coupon_id}",
    dependencies=[Depends(require_permission("coupon:read"))],
)
async def get_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get coupon details with usage count."""
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado.",
        )

    # Get usage count
    usage_count = await db.scalar(
        select(func.count(CouponUsage.id)).where(
            CouponUsage.coupon_id == coupon_id, CouponUsage.is_active == True
        )
    )

    response = CouponResponse.model_validate(coupon)
    response.usage_count = usage_count or 0

    return response.model_dump(mode="json")


@coupons_router.post(
    "",
    dependencies=[Depends(require_permission("coupon:create"))],
    status_code=status.HTTP_201_CREATED,
)
async def create_coupon(
    request: Request,
    data: CouponCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new coupon."""
    # Check if code already exists
    existing = await db.scalar(
        select(func.count(Coupon.id)).where(
            Coupon.code == data.code.upper()
        )
    )

    if existing > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Código de cupom já existe.",
        )

    # Create coupon
    # Ensure datetimes are naive UTC for asyncpg
    valid_from = data.valid_from
    if valid_from and valid_from.tzinfo:
        valid_from = valid_from.astimezone(timezone.utc).replace(tzinfo=None)

    valid_until = data.valid_until
    if valid_until and valid_until.tzinfo:
        valid_until = valid_until.astimezone(timezone.utc).replace(tzinfo=None)

    coupon = Coupon(
        code=data.code.upper(),
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        max_uses=data.max_uses,
        max_uses_per_user=data.max_uses_per_user,
        min_purchase_amount=data.min_purchase_amount,
        first_time_only=data.first_time_only,
        allow_reuse_after_cancel=data.allow_reuse_after_cancel,
        is_stackable=data.is_stackable,
        applicable_plans=data.applicable_plans,
        applicable_cycles=data.applicable_cycles,
        applicable_cycles=data.applicable_cycles,
        valid_from=valid_from,
        valid_until=valid_until,
        is_active=data.is_active,
        created_by=admin.id,
    )

    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)

    # Audit log
    service = AdminService(db, admin, request)
    await service.create_audit_log(
        action="create",
        resource_type="coupon",
        resource_id=coupon.id,
        new_values={"code": coupon.code},
        success=True,
    )

    response = CouponResponse.model_validate(coupon)
    response.usage_count = 0

    return response.model_dump(mode="json")


@coupons_router.put(
    "/{coupon_id}",
    dependencies=[Depends(require_permission("coupon:update"))],
)
async def update_coupon(
    request: Request,
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update coupon details."""
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado.",
        )

    # Store old values for audit
    old_values = {
        "description": coupon.description,
        "is_active": coupon.is_active,
    }

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "valid_until" and value and value.tzinfo:
             value = value.astimezone(timezone.utc).replace(tzinfo=None)
        setattr(coupon, field, value)

    await db.commit()
    await db.refresh(coupon)

    # Audit log
    service = AdminService(db, admin, request)
    await service.create_audit_log(
        action="update",
        resource_type="coupon",
        resource_id=coupon.id,
        old_values=old_values,
        new_values=update_data,
        success=True,
    )

    response = CouponResponse.model_validate(coupon)
    usage_count = await db.scalar(
        select(func.count(CouponUsage.id)).where(
            CouponUsage.coupon_id == coupon_id, CouponUsage.is_active == True
        )
    )
    response.usage_count = usage_count or 0

    return response.model_dump(mode="json")


@coupons_router.delete(
    "/{coupon_id}",
    dependencies=[Depends(require_permission("coupon:delete"))],
)
async def deactivate_coupon(
    request: Request,
    coupon_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a coupon (soft delete)."""
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado.",
        )

    coupon.is_active = False
    await db.commit()

    # Audit log
    service = AdminService(db, admin, request)
    await service.create_audit_log(
        action="delete",
        resource_type="coupon",
        resource_id=coupon.id,
        old_values={"is_active": True},
        new_values={"is_active": False},
        success=True,
    )

    return {"message": "Cupom desativado com sucesso."}


@coupons_router.get(
    "/{coupon_id}/usages",
    dependencies=[Depends(require_permission("coupon:read"))],
)
async def list_coupon_usages(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List usage history for a specific coupon."""
    # Verify coupon exists
    coupon_exists = await db.scalar(
        select(func.count(Coupon.id)).where(Coupon.id == coupon_id)
    )

    if not coupon_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado.",
        )

    # Count total
    total = await db.scalar(
        select(func.count(CouponUsage.id)).where(CouponUsage.coupon_id == coupon_id)
    )

    # Query usages
    query = (
        select(CouponUsage)
        .where(CouponUsage.coupon_id == coupon_id)
        .order_by(CouponUsage.used_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(query)
    usages = result.scalars().all()

    return {
        "usages": [CouponUsageResponse.model_validate(u).model_dump(mode="json") for u in usages],
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "pages": ((total or 0) + per_page - 1) // per_page,
    }


@coupons_router.get(
    "/{coupon_id}/stats",
    dependencies=[Depends(require_permission("coupon:read"))],
)
async def get_coupon_stats(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a coupon."""
    # Verify coupon exists
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cupom não encontrado.",
        )

    # Get stats
    service = CouponService(db)
    stats = await service.get_coupon_stats(coupon_id)

    return CouponStatsResponse(
        coupon_id=coupon_id,
        code=coupon.code,
        total_uses=stats["total_uses"],
        active_uses=stats["active_uses"],
        total_revenue=stats["total_revenue"],
        total_discount=stats["total_discount"],
        unique_users=stats["unique_users"],
        most_recent_use=stats["most_recent_use"],
    ).model_dump(mode="json")
