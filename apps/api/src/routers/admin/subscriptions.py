"""
Admin subscription management endpoints.

Provides CRUD operations for subscriptions with Stripe integration.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_admin, require_permission
from src.routers.admin.common import validate_platform
from src.models.payment import Payment
from src.models.subscription import Subscription, SubscriptionStatus
from src.models.user import User
from src.schemas.admin import AdminSubscriptionListItem, ExtendTrialRequest
from src.services.admin_service import AdminService
from src.services.stripe_service import StripeService

logger = structlog.get_logger()

# Create router with auth dependencies
subscriptions_router = APIRouter(
    prefix="/subscriptions",
    tags=["admin-subscriptions"],
    dependencies=[Depends(get_current_admin), Depends(validate_platform)],
)


@subscriptions_router.get(
    "/",
    dependencies=[Depends(require_permission("subscription:read"))],
)
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by status"),
    plan: Optional[str] = Query(None, description="Filter by plan"),
    search: Optional[str] = Query(None, description="Search by user email"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List all subscriptions with filters and pagination."""
    query = (
        select(
            Subscription,
            User.email.label("user_email"),
        )
        .join(User, Subscription.user_id == User.id)
    )

    # Apply filters
    if status:
        query = query.where(Subscription.status == status)
    if plan:
        query = query.where(Subscription.plan == plan)
    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(Subscription.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    subscriptions = []
    for sub, user_email in rows:
        subscriptions.append({
            "id": str(sub.id),
            "user_id": str(sub.user_id),
            "user_email": user_email,
            "plan": sub.plan,
            "billing_cycle": sub.billing_cycle,
            "status": sub.status,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
            "stripe_subscription_id": sub.stripe_subscription_id,
            "created_at": sub.created_at.isoformat(),
        })

    return {
        "subscriptions": subscriptions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@subscriptions_router.get(
    "/{subscription_id}",
    dependencies=[Depends(require_permission("subscription:read"))],
)
async def get_subscription_detail(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed subscription information with payment history."""
    # Get subscription with user info
    result = await db.execute(
        select(Subscription, User)
        .join(User, Subscription.user_id == User.id)
        .where(Subscription.id == subscription_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assinatura não encontrada.",
        )

    sub, user = row

    # Get payment history
    payments_result = await db.execute(
        select(Payment)
        .where(Payment.subscription_id == subscription_id)
        .order_by(Payment.created_at.desc())
    )
    payments = payments_result.scalars().all()

    return {
        "id": str(sub.id),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
        },
        "plan": sub.plan,
        "billing_cycle": sub.billing_cycle,
        "status": sub.status,
        "trial_start": sub.trial_start.isoformat() if sub.trial_start else None,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
        "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        "stripe_subscription_id": sub.stripe_subscription_id,
        "stripe_customer_id": sub.stripe_customer_id,
        "payments": [
            {
                "id": str(p.id),
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status,
                "provider": p.provider,
                "created_at": p.created_at.isoformat(),
            }
            for p in payments
        ],
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
    }


@subscriptions_router.post(
    "/{subscription_id}/cancel",
    dependencies=[Depends(require_permission("subscription:delete"))],
)
async def cancel_subscription(
    request: Request,
    subscription_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel a subscription.
    
    If the subscription has a Stripe ID, it will be cancelled in Stripe.
    The subscription status will be updated to 'cancelled'.
    """
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assinatura não encontrada.",
        )

    # Cancel in Stripe if applicable
    if sub.stripe_subscription_id:
        try:
            await StripeService.cancel_subscription(sub.stripe_subscription_id)
            logger.info(
                "Subscription cancelled in Stripe",
                subscription_id=str(subscription_id),
                stripe_subscription_id=sub.stripe_subscription_id,
            )
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to cancel subscription in Stripe",
                error=str(e),
                subscription_id=str(subscription_id),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao cancelar no Stripe: {e.user_message or str(e)}",
            )

    # Update subscription status
    sub.status = SubscriptionStatus.CANCELLED.value
    sub.cancelled_at = datetime.utcnow()
    await db.commit()

    # Create audit log
    service = AdminService(db, admin, request)
    await service._create_audit_log(
        action="cancel",
        resource_type="subscription",
        resource_id=subscription_id,
        old_values={"status": sub.status},
        new_values={"status": SubscriptionStatus.CANCELLED.value},
    )

    logger.info(
        "Subscription cancelled by admin",
        admin_id=str(admin.id),
        admin_email=admin.email,
        subscription_id=str(subscription_id),
    )

    return {"message": "Assinatura cancelada com sucesso."}


@subscriptions_router.post(
    "/{subscription_id}/extend-trial",
    dependencies=[Depends(require_permission("subscription:update"))],
)
async def extend_trial(
    request: Request,
    subscription_id: uuid.UUID,
    data: ExtendTrialRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Extend the trial period of a subscription.
    
    Updates both the local database and Stripe if applicable.
    """
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assinatura não encontrada.",
        )

    if sub.status != SubscriptionStatus.TRIAL.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas assinaturas em trial podem ser estendidas.",
        )

    # Capture old trial end
    old_trial_end = sub.trial_end

    # Extend trial
    new_trial_end = sub.trial_end + timedelta(days=data.days)
    sub.trial_end = new_trial_end

    # Update in Stripe if applicable
    if sub.stripe_subscription_id:
        try:
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                trial_end=int(new_trial_end.timestamp()),
            )
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to extend trial in Stripe",
                error=str(e),
                subscription_id=str(subscription_id),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao estender trial no Stripe: {e.user_message or str(e)}",
            )

    await db.commit()

    # Create audit log
    service = AdminService(db, admin, request)
    await service._create_audit_log(
        action="extend_trial",
        resource_type="subscription",
        resource_id=subscription_id,
        old_values={"trial_end": old_trial_end.isoformat() if old_trial_end else None},
        new_values={"trial_end": new_trial_end.isoformat()},
    )

    logger.info(
        "Trial extended by admin",
        admin_id=str(admin.id),
        admin_email=admin.email,
        subscription_id=str(subscription_id),
        days=data.days,
    )

    return {
        "message": f"Trial estendido em {data.days} dias.",
        "new_trial_end": new_trial_end.isoformat(),
    }


@subscriptions_router.put(
    "/{subscription_id}",
    dependencies=[Depends(require_permission("subscription:update"))],
)
async def modify_subscription(
    request: Request,
    subscription_id: uuid.UUID,
    plan: Optional[str] = Query(None, description="New plan"),
    billing_cycle: Optional[str] = Query(None, description="New billing cycle"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Modify a subscription plan or billing cycle.
    
    This will update the subscription in Stripe if it has a Stripe ID.
    """
    if not plan and not billing_cycle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe pelo menos um campo para atualizar (plan ou billing_cycle).",
        )

    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assinatura não encontrada.",
        )

    # Capture old values
    old_values = {
        "plan": sub.plan,
        "billing_cycle": sub.billing_cycle,
    }

    # Update local subscription
    if plan:
        sub.plan = plan
    if billing_cycle:
        sub.billing_cycle = billing_cycle

    # Update in Stripe if applicable
    if sub.stripe_subscription_id:
        try:
            # Get new price ID
            from src.services.stripe_service import PRICE_MAP
            new_plan = plan or sub.plan
            new_cycle = billing_cycle or sub.billing_cycle
            new_price_id = PRICE_MAP.get((new_plan, new_cycle))

            if new_price_id:
                stripe.Subscription.modify(
                    sub.stripe_subscription_id,
                    items=[{"id": sub.stripe_subscription_id, "price": new_price_id}],
                    proration_behavior="create_prorations",
                )
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to modify subscription in Stripe",
                error=str(e),
                subscription_id=str(subscription_id),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao modificar no Stripe: {e.user_message or str(e)}",
            )

    await db.commit()

    # Create audit log
    service = AdminService(db, admin, request)
    await service._create_audit_log(
        action="modify",
        resource_type="subscription",
        resource_id=subscription_id,
        old_values=old_values,
        new_values={
            "plan": sub.plan,
            "billing_cycle": sub.billing_cycle,
        },
    )

    logger.info(
        "Subscription modified by admin",
        admin_id=str(admin.id),
        admin_email=admin.email,
        subscription_id=str(subscription_id),
    )

    return {
        "message": "Assinatura modificada com sucesso.",
        "plan": sub.plan,
        "billing_cycle": sub.billing_cycle,
    }
