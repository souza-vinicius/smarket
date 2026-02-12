"""
Admin payment management endpoints.

Provides CRUD operations for payments with Stripe refund integration.
"""

import uuid
from decimal import Decimal
from typing import Optional

import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_admin, require_permission
from src.models.payment import Payment
from src.models.subscription import Subscription
from src.models.user import User
from src.schemas.admin import RefundRequest, RefundResponse
from src.services.admin_service import AdminService

logger = structlog.get_logger()

# Create router
payments_router = APIRouter(prefix="/payments", tags=["admin-payments"])


@payments_router.get(
    "/",
    dependencies=[Depends(require_permission("payment:read"))],
)
async def list_payments(
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by user email"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List all payments with filters and pagination."""
    query = (
        select(
            Payment,
            User.email.label("user_email"),
        )
        .join(Subscription, Payment.subscription_id == Subscription.id)
        .join(User, Subscription.user_id == User.id)
    )

    # Apply filters
    if status:
        query = query.where(Payment.status == status)
    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Order and paginate
    query = query.order_by(Payment.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    payments = []
    for payment, user_email in rows:
        payments.append({
            "id": str(payment.id),
            "subscription_id": str(payment.subscription_id),
            "user_email": user_email,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status,
            "provider": payment.provider,
            "provider_payment_id": payment.provider_payment_id,
            "created_at": payment.created_at.isoformat(),
        })

    return {
        "payments": payments,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@payments_router.get(
    "/{payment_id}",
    dependencies=[Depends(require_permission("payment:read"))],
)
async def get_payment_detail(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed payment information."""
    result = await db.execute(
        select(Payment, Subscription, User)
        .join(Subscription, Payment.subscription_id == Subscription.id)
        .join(User, Subscription.user_id == User.id)
        .where(Payment.id == payment_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado.",
        )

    payment, subscription, user = row

    return {
        "id": str(payment.id),
        "subscription": {
            "id": str(subscription.id),
            "plan": subscription.plan,
            "status": subscription.status,
        },
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
        },
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "provider": payment.provider,
        "provider_payment_id": payment.provider_payment_id,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "refunded_at": payment.refunded_at.isoformat() if payment.refunded_at else None,
        "created_at": payment.created_at.isoformat(),
    }


@payments_router.post(
    "/{payment_id}/refund",
    dependencies=[Depends(require_permission("payment:refund"))],
    response_model=RefundResponse,
)
async def refund_payment(
    request: Request,
    payment_id: uuid.UUID,
    data: RefundRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Process a refund for a payment.
    
    If the payment was made through Stripe, the refund will be processed via Stripe API.
    Supports both full and partial refunds.
    """
    result = await db.execute(
        select(Payment)
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pagamento não encontrado.",
        )

    if payment.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível reembolsar pagamento com status '{payment.status}'.",
        )

    # Determine refund amount
    refund_amount = data.amount if data.amount else payment.amount

    if refund_amount > payment.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valor de reembolso maior que o valor do pagamento.",
        )

    # Process refund in Stripe if applicable
    stripe_refund_id = None
    if payment.provider == "stripe" and payment.provider_payment_id:
        try:
            refund_params = {
                "payment_intent": payment.provider_payment_id,
            }
            if data.amount:
                # Partial refund - amount in cents
                refund_params["amount"] = int(data.amount * 100)

            stripe_refund = stripe.Refund.create(**refund_params)
            stripe_refund_id = stripe_refund.id

            logger.info(
                "Refund processed in Stripe",
                payment_id=str(payment_id),
                stripe_refund_id=stripe_refund_id,
                amount=float(refund_amount),
            )
        except stripe.error.StripeError as e:
            logger.error(
                "Failed to process refund in Stripe",
                error=str(e),
                payment_id=str(payment_id),
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao processar reembolso no Stripe: {e.user_message or str(e)}",
            )
    else:
        logger.warning(
            "Refund processed manually (non-Stripe payment)",
            payment_id=str(payment_id),
            provider=payment.provider,
        )

    # Update payment status
    from datetime import datetime
    payment.status = "refunded" if refund_amount >= payment.amount else "partially_refunded"
    payment.refunded_at = datetime.utcnow()
    await db.commit()

    # Create audit log
    service = AdminService(db, admin, request)
    await service._create_audit_log(
        action="refund",
        resource_type="payment",
        resource_id=payment_id,
        old_values={
            "status": "succeeded",
            "refunded_at": None,
        },
        new_values={
            "status": payment.status,
            "refunded_at": payment.refunded_at.isoformat(),
            "refund_amount": float(refund_amount),
            "reason": data.reason,
        },
    )

    logger.info(
        "Payment refunded by admin",
        admin_id=str(admin.id),
        admin_email=admin.email,
        payment_id=str(payment_id),
        amount=float(refund_amount),
    )

    return RefundResponse(
        success=True,
        refund_id=stripe_refund_id or "manual",
        amount_refunded=refund_amount,
        message=f"Reembolso de {refund_amount} {payment.currency} processado com sucesso.",
    )
