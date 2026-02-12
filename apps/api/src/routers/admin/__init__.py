"""
Admin area router with RBAC middleware.

All admin routes require authentication and admin privileges.
Native platform (iOS/Android) access is blocked for security.
"""

import uuid
from datetime import datetime
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
from src.services.admin_service import AdminService
from src.services.metrics_service import MetricsService

# Import sub-routers
from src.routers.admin.subscriptions import subscriptions_router
from src.routers.admin.payments import payments_router

logger = structlog.get_logger()

# Base admin router
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],  # All routes require admin
)


from src.routers.admin.common import validate_platform

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
# Dashboard Endpoints
# ============================================================================


@admin_router.get(
    "/dashboard/stats",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard KPIs (MRR, users, churn, etc.)."""
    metrics = MetricsService(db)
    return await metrics.get_dashboard_stats()


@admin_router.get(
    "/dashboard/revenue",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_revenue_chart(
    months: int = Query(12, ge=3, le=24, description="Number of months"),
    db: AsyncSession = Depends(get_db),
):
    """Get revenue chart data (MRR over time)."""
    metrics = MetricsService(db)
    return await metrics.get_revenue_chart_data(months)


@admin_router.get(
    "/dashboard/growth",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_growth_chart(
    months: int = Query(12, ge=3, le=24, description="Number of months"),
    db: AsyncSession = Depends(get_db),
):
    """Get user growth chart data."""
    metrics = MetricsService(db)
    return await metrics.get_growth_chart_data(months)


@admin_router.get(
    "/dashboard/operations",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_operational_metrics(
    db: AsyncSession = Depends(get_db),
):
    """Get operational metrics (OCR, processing, etc.)."""
    metrics = MetricsService(db)
    return await metrics.get_operational_metrics()


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
    include_deleted: bool = Query(False, description="Include soft-deleted users"),
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

    # By default, exclude soft-deleted users unless explicitly requested
    if not include_deleted:
        query = query.where(User.deleted_at.is_(None))

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
    request: Request,
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user fields (admin only)."""
    service = AdminService(db, admin, request)
    return await service.update_user(user_id, data)


@admin_router.delete(
    "/users/{user_id}",
    dependencies=[Depends(require_permission("user:delete"))],
)
async def delete_user(
    request: Request,
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a user (set deleted_at and is_active=False)."""
    service = AdminService(db, admin, request)
    return await service.soft_delete_user(user_id)


@admin_router.post(
    "/users/{user_id}/restore",
    dependencies=[Depends(require_permission("user:update"))],
)
async def restore_user(
    request: Request,
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Restore a soft-deleted user."""
    service = AdminService(db, admin, request)
    return await service.restore_user(user_id)


@admin_router.post(
    "/users/{user_id}/impersonate",
    dependencies=[Depends(require_permission("user:impersonate"))],
)
async def impersonate_user(
    request: Request,
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate impersonation token for a user.

    Returns a short-lived JWT that allows the admin to act as the target user.
    The token includes an 'impersonated_by' claim for audit purposes.
    """
    service = AdminService(db, admin, request)
    return await service.impersonate_user(user_id)


@admin_router.get(
    "/users/{user_id}/activity",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_user_activity(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get audit log activity for a specific user."""
    service = AdminService(db, admin)
    return await service.get_user_activity(user_id, page, per_page)


# ============================================================================
# Audit Log Endpoints
# ============================================================================


@admin_router.get(
    "/audit-logs",
    dependencies=[Depends(require_permission("audit:read"))],
)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    action: Optional[str] = Query(None, description="Filter by action"),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs with optional filters."""
    metrics = MetricsService(db)
    return await metrics.get_audit_logs(page, per_page, resource_type, action)


# ============================================================================
# System Health Endpoint
# ============================================================================


@admin_router.get(
    "/system/health",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
):
    """Check health of all dependent services (DB, Redis, Stripe, LLM providers)."""
    import time

    import httpx
    from src.config import settings

    results = {}

    # 1. Database
    try:
        start = time.monotonic()
        await db.execute(select(func.now()))
        latency = round((time.monotonic() - start) * 1000, 1)
        results["database"] = {"status": "healthy", "latency_ms": latency}
    except Exception as e:
        results["database"] = {"status": "unhealthy", "error": str(e)}

    # 2. Redis
    try:
        import redis.asyncio as aioredis

        start = time.monotonic()
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=3)
        await r.ping()
        latency = round((time.monotonic() - start) * 1000, 1)
        info = await r.info("memory")
        used_memory_mb = round(info.get("used_memory", 0) / (1024 * 1024), 1)
        await r.aclose()
        results["redis"] = {
            "status": "healthy",
            "latency_ms": latency,
            "used_memory_mb": used_memory_mb,
        }
    except Exception as e:
        results["redis"] = {"status": "unhealthy", "error": str(e)}

    # 3. Stripe
    if settings.STRIPE_SECRET_KEY:
        try:
            import stripe

            start = time.monotonic()
            stripe.api_key = settings.STRIPE_SECRET_KEY
            await stripe.Balance.retrieve_async()
            latency = round((time.monotonic() - start) * 1000, 1)
            results["stripe"] = {"status": "healthy", "latency_ms": latency}
        except Exception as e:
            results["stripe"] = {"status": "unhealthy", "error": str(e)}
    else:
        results["stripe"] = {"status": "not_configured"}

    # 4. LLM Providers
    async def check_url(name: str, url: str, api_key: str):
        if not api_key:
            return name, {"status": "not_configured"}
        try:
            start = time.monotonic()
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    url, headers={"Authorization": f"Bearer {api_key}"}
                )
                latency = round((time.monotonic() - start) * 1000, 1)
                if resp.status_code < 500:
                    return name, {"status": "healthy", "latency_ms": latency}
                return name, {
                    "status": "degraded",
                    "latency_ms": latency,
                    "http_status": resp.status_code,
                }
        except Exception as e:
            return name, {"status": "unhealthy", "error": str(e)}

    import asyncio

    llm_checks = await asyncio.gather(
        check_url(
            "openrouter",
            "https://openrouter.ai/api/v1/models",
            settings.OPENROUTER_API_KEY,
        ),
        check_url(
            "openai",
            "https://api.openai.com/v1/models",
            settings.OPENAI_API_KEY,
        ),
        check_url(
            "anthropic",
            "https://api.anthropic.com/v1/messages",
            settings.ANTHROPIC_API_KEY,
        ),
    )

    for name, result in llm_checks:
        results[name] = result

    if settings.GEMINI_API_KEY:
        results["gemini"] = {"status": "configured"}
    else:
        results["gemini"] = {"status": "not_configured"}

    # Overall status
    statuses = [s["status"] for s in results.values()]
    if all(s in ("healthy", "configured", "not_configured") for s in statuses):
        overall = "healthy"
    elif any(s == "unhealthy" for s in statuses):
        overall = "unhealthy"
    else:
        overall = "degraded"

    return {
        "status": overall,
        "services": results,
        "checked_at": datetime.utcnow().isoformat(),
    }


# ============================================================================
# Include Sub-routers
# ============================================================================

admin_router.include_router(subscriptions_router)
admin_router.include_router(payments_router)
