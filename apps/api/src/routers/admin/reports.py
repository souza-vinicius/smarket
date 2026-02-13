"""
Admin reports router.

Provides endpoints for churn analysis, conversion funnel, and CSV export.
"""

import csv
import io
from datetime import datetime, timedelta
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_admin, require_permission
from src.models.payment import Payment
from src.models.subscription import Subscription
from src.models.user import User
from src.services.metrics_service import MetricsService

logger = structlog.get_logger()

reports_router = APIRouter(
    prefix="/reports",
    tags=["admin-reports"],
)


@reports_router.get(
    "/churn",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_churn_report(
    months: int = Query(
        12, ge=3, le=24, description="Number of months to analyze"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed churn analysis.

    Returns:
        - Timeline of cancellations by month
        - Churn rate by plan
        - Cumulative churn statistics
    """
    metrics = MetricsService(db)
    return await metrics.get_churn_report(months)


@reports_router.get(
    "/conversion",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_conversion_report(
    months: int = Query(
        12, ge=3, le=24, description="Number of months to analyze"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Get conversion funnel analysis.

    Returns:
        - Trial to paid conversion rate
        - Plan upgrade/downgrade flows
        - Conversion by plan type
    """
    metrics = MetricsService(db)
    return await metrics.get_conversion_report(months)


@reports_router.get(
    "/mrr",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_mrr_report(
    months: int = Query(
        12, ge=3, le=24, description="Number of months to analyze"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed MRR breakdown.

    Returns:
        - New MRR (new subscriptions)
        - Expansion MRR (upgrades)
        - Contraction MRR (downgrades)
        - Churn MRR (cancellations)
        - Net MRR movement
    """
    metrics = MetricsService(db)
    return await metrics.get_mrr_report(months)


@reports_router.get(
    "/export/users",
    dependencies=[Depends(require_permission("user:read"))],
)
async def export_users_csv(
    request: Request,
    include_deleted: bool = Query(
        False, description="Include soft-deleted users"
    ),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Export users to CSV file.

    Returns a streaming CSV response with user data.
    """
    logger.info(
        "export_users_csv",
        admin_id=str(admin.id),
        include_deleted=include_deleted,
    )

    # Build query
    query = select(User)

    if not include_deleted:
        query = query.where(User.deleted_at.is_(None))

    query = query.order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "id",
        "email",
        "full_name",
        "is_active",
        "admin_role",
        "household_income",
        "adults_count",
        "children_count",
        "created_at",
        "deleted_at",
    ])

    # Data rows
    for user in users:
        writer.writerow([
            str(user.id),
            user.email,
            user.full_name or "",
            user.is_active,
            user.admin_role or "",
            float(user.household_income) if user.household_income else "",
            user.adults_count or "",
            user.children_count or "",
            user.created_at.isoformat() if user.created_at else "",
            user.deleted_at.isoformat() if user.deleted_at else "",
        ])

    # Reset buffer position
    output.seek(0)

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"users_export_{timestamp}.csv"

    # Log audit
    from src.services.admin_service import AdminService
    admin_service = AdminService(db, admin, request)
    await admin_service.log_action(
        action="export",
        resource_type="users",
        resource_id=None,
        new_values={
            "format": "csv",
            "count": len(users),
            "include_deleted": include_deleted,
        },
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@reports_router.get(
    "/export/subscriptions",
    dependencies=[Depends(require_permission("subscription:read"))],
)
async def export_subscriptions_csv(
    request: Request,
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status"
    ),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Export subscriptions to CSV file.

    Returns a streaming CSV response with subscription data.
    """
    logger.info(
        "export_subscriptions_csv",
        admin_id=str(admin.id),
        status=status_filter,
    )

    # Build query with user join
    query = (
        select(
            Subscription,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
        )
        .join(User, Subscription.user_id == User.id)
    )

    if status_filter:
        query = query.where(Subscription.status == status_filter)

    query = query.order_by(Subscription.created_at.desc())

    result = await db.execute(query)
    rows = result.all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "id",
        "user_id",
        "user_email",
        "user_name",
        "plan",
        "status",
        "billing_cycle",
        "stripe_subscription_id",
        "trial_start",
        "trial_end",
        "current_period_start",
        "current_period_end",
        "cancelled_at",
        "created_at",
    ])

    # Data rows
    for row in rows:
        sub = row[0]
        writer.writerow([
            str(sub.id),
            str(sub.user_id),
            row.user_email,
            row.user_name or "",
            sub.plan,
            sub.status,
            sub.billing_cycle or "",
            sub.stripe_subscription_id or "",
            sub.trial_start.isoformat() if sub.trial_start else "",
            sub.trial_end.isoformat() if sub.trial_end else "",
            (
                sub.current_period_start.isoformat()
                if sub.current_period_start else ""
            ),
            (
                sub.current_period_end.isoformat()
                if sub.current_period_end else ""
            ),
            sub.cancelled_at.isoformat() if sub.cancelled_at else "",
            sub.created_at.isoformat() if sub.created_at else "",
        ])

    # Reset buffer position
    output.seek(0)

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"subscriptions_export_{timestamp}.csv"

    # Log audit
    from src.services.admin_service import AdminService
    admin_service = AdminService(db, admin, request)
    await admin_service.log_action(
        action="export",
        resource_type="subscriptions",
        resource_id=None,
        new_values={
            "format": "csv",
            "count": len(rows),
            "status_filter": status_filter,
        },
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@reports_router.get(
    "/export/payments",
    dependencies=[Depends(require_permission("payment:read"))],
)
async def export_payments_csv(
    request: Request,
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status"
    ),
    months: int = Query(
        12, ge=1, le=36, description="Number of months to include"
    ),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Export payments to CSV file.

    Returns a streaming CSV response with payment data.
    """
    logger.info(
        "export_payments_csv",
        admin_id=str(admin.id),
        status=status_filter,
        months=months,
    )

    # Build query with joins
    since = datetime.utcnow() - timedelta(days=months * 30)
    query = (
        select(
            Payment,
            User.email.label("user_email"),
            User.full_name.label("user_name"),
            Subscription.plan.label("subscription_plan"),
        )
        .join(Subscription, Payment.subscription_id == Subscription.id)
        .join(User, Subscription.user_id == User.id)
        .where(Payment.created_at >= since)
    )

    if status_filter:
        query = query.where(Payment.status == status_filter)

    query = query.order_by(Payment.created_at.desc())

    result = await db.execute(query)
    rows = result.all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "id",
        "user_id",
        "user_email",
        "user_name",
        "subscription_id",
        "subscription_plan",
        "amount",
        "currency",
        "status",
        "provider",
        "provider_payment_id",
        "description",
        "created_at",
    ])

    # Data rows
    for row in rows:
        payment = row[0]
        writer.writerow([
            str(payment.id),
            str(payment.subscription.user_id) if payment.subscription else "",
            row.user_email,
            row.user_name or "",
            str(payment.subscription_id),
            row.subscription_plan,
            float(payment.amount) if payment.amount else "",
            payment.currency or "BRL",
            payment.status,
            payment.provider or "stripe",
            payment.provider_payment_id or "",
            payment.description or "",
            payment.created_at.isoformat() if payment.created_at else "",
        ])

    # Reset buffer position
    output.seek(0)

    # Generate filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"payments_export_{timestamp}.csv"

    # Log audit
    from src.services.admin_service import AdminService
    admin_service = AdminService(db, admin, request)
    await admin_service.log_action(
        action="export",
        resource_type="payments",
        resource_id=None,
        new_values={
            "format": "csv",
            "count": len(rows),
            "status_filter": status_filter,
            "months": months,
        },
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
