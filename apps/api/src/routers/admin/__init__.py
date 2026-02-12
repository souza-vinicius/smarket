"""
Admin area router with RBAC middleware.

All admin routes require authentication and admin privileges.
Native platform (iOS/Android) access is blocked for security.
"""

import uuid
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_admin, require_permission
from src.models.invoice import Invoice
from src.models.subscription import Subscription
from src.models.user import User
from src.schemas.admin import AdminUserDetail, AdminUserListItem, AdminUserUpdate

logger = structlog.get_logger()

# Base admin router
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],  # All routes require admin
)


async def validate_platform(request: Request):
    """
    Middleware to block native platform access to admin area.

    Admin area is web-only. Reject requests from iOS/Android apps.
    """
    platform = request.headers.get("x-platform", "web").lower()

    if platform in ("ios", "android"):
        logger.warning(
            "Admin access attempt from native platform blocked",
            platform=platform,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Área administrativa disponível apenas via navegador web.",
            headers={"X-Admin-Error": "native_platform_blocked"},
        )


# Apply platform validation to all admin routes
admin_router.dependencies.append(Depends(validate_platform))


@admin_router.get("/")
async def admin_root(admin: User = Depends(get_current_admin)):
    """Admin area root - basic info."""
    return {
        "message": "Admin area",
        "admin": {
            "id": str(admin.id),
            "email": admin.email,
            "role": admin.admin_role,
        },
    }


# ============================================================================
# User Management Endpoints
# ============================================================================


@admin_router.get(
    "/users",
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_users(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    admin_only: Optional[bool] = Query(None, description="Show only admin users"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """List all users with pagination and optional filters."""
    # Base query: count invoices per user via subquery
    invoice_count_sq = (
        select(func.count(Invoice.id))
        .where(Invoice.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )

    query = select(
        User.id,
        User.email,
        User.full_name,
        User.is_active,
        User.admin_role,
        User.deleted_at,
        User.created_at,
        invoice_count_sq.label("invoices_count"),
    )

    # Apply filters
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    if admin_only:
        query = query.where(User.admin_role.isnot(None))

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    users = [
        AdminUserListItem(
            id=row.id,
            email=row.email,
            full_name=row.full_name,
            is_active=row.is_active,
            admin_role=row.admin_role,
            deleted_at=row.deleted_at,
            created_at=row.created_at,
            invoices_count=row.invoices_count or 0,
        )
        for row in rows
    ]

    return {
        "users": [u.model_dump(mode="json") for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@admin_router.get(
    "/users/{user_id}",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_user_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed user information."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    # Get invoice count and total spent
    stats_result = await db.execute(
        select(
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.total_value), 0).label("total_spent"),
        ).where(Invoice.user_id == user_id)
    )
    stats = stats_result.first()

    # Get subscription info
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = sub_result.scalar_one_or_none()
    sub_dict = None
    if sub:
        sub_dict = {
            "plan": sub.plan,
            "status": sub.status,
            "billing_cycle": sub.billing_cycle,
            "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
            "current_period_end": (
                sub.current_period_end.isoformat()
                if sub.current_period_end
                else None
            ),
        }

    return AdminUserDetail(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        admin_role=user.admin_role,
        deleted_at=user.deleted_at,
        preferences=user.preferences or {},
        household_income=user.household_income,
        adults_count=user.adults_count,
        children_count=user.children_count,
        created_at=user.created_at,
        updated_at=user.updated_at,
        subscription=sub_dict,
        invoices_count=stats.count if stats else 0,
        total_spent=stats.total_spent if stats else 0,
    ).model_dump(mode="json")


@admin_router.patch(
    "/users/{user_id}",
    dependencies=[Depends(require_permission("user:update"))],
)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user fields (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    # Prevent modifying own admin_role
    if data.admin_role is not None and user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode alterar sua própria função administrativa.",
        )

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum campo para atualizar.",
        )

    # Convert enum to string value for admin_role
    if "admin_role" in update_data and update_data["admin_role"] is not None:
        update_data["admin_role"] = update_data["admin_role"].value

    await db.execute(
        update(User).where(User.id == user_id).values(**update_data)
    )
    await db.commit()

    logger.info(
        "Admin updated user",
        admin_email=admin.email,
        target_user_id=str(user_id),
        fields=list(update_data.keys()),
    )

    return {"message": "Usuário atualizado com sucesso."}
