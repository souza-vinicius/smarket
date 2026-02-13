"""Subscription management endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.payment import Payment
from src.models.subscription import Subscription
from src.models.usage_record import UsageRecord
from src.models.user import User
from src.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PaymentResponse,
    SubscriptionResponse,
    UsageResponse,
)
from src.services.stripe_service import StripeService
from src.services.subscription_service import SubscriptionService
from src.utils.logger import logger

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/", response_model=dict)
async def get_subscription_and_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's subscription and current month usage."""
    # Get subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma assinatura encontrada.",
        )

    # Get current month usage
    now = datetime.utcnow()
    usage_result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == current_user.id,
            UsageRecord.year == now.year,
            UsageRecord.month == now.month,
        )
    )
    usage_record = usage_result.scalar_one_or_none()

    usage = UsageResponse(
        invoices_used=usage_record.invoices_count if usage_record else 0,
        invoices_limit=subscription.invoice_limit,
        ai_analyses_used=usage_record.ai_analyses_count if usage_record else 0,
        ai_analyses_limit=subscription.analysis_limit,
        month=now.month,
        year=now.year,
    )

    return {
        "subscription": SubscriptionResponse.model_validate(subscription),
        "usage": usage,
    }


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe Checkout session for subscription upgrade."""
    # Get user's subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma assinatura encontrada.",
        )

    # Create Stripe Checkout session
    session = await StripeService.create_checkout_session(
        user_email=current_user.email,
        user_id=str(current_user.id),
        plan=request.plan,
        billing_cycle=request.billing_cycle,
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        stripe_customer_id=subscription.stripe_customer_id,
    )

    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.id,
    )


@router.post("/portal")
async def create_portal_session(
    return_url: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe Customer Portal session."""
    # Get user's subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum cliente Stripe vinculado.",
        )

    session = await StripeService.create_portal_session(
        stripe_customer_id=subscription.stripe_customer_id,
        return_url=return_url,
    )

    return {"url": session.url}


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription at period end."""
    # Get user's subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma assinatura ativa encontrada.",
        )

    await StripeService.cancel_subscription(subscription.stripe_subscription_id)

    subscription.cancelled_at = datetime.utcnow()
    await db.commit()

    return {"message": "Assinatura cancelada. Acesso mantido até o fim do período."}


@router.get("/payments", response_model=list[PaymentResponse])
async def list_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List payment history."""
    # Get user's subscription
    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        return []

    # Get payments
    payments_result = await db.execute(
        select(Payment)
        .where(Payment.subscription_id == subscription.id)
        .order_by(Payment.created_at.desc())
    )
    payments = payments_result.scalars().all()

    return [PaymentResponse.model_validate(p) for p in payments]


@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events (no JWT auth - verified via signature)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )

    try:
        event = StripeService.verify_webhook_signature(payload, sig_header)
    except ValueError as e:
        logger.error("stripe_webhook_invalid_signature", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    event_type = event["type"]
    event_data = event["data"]

    # Route to appropriate handler
    handlers = {
        "checkout.session.completed": SubscriptionService.handle_checkout_completed,
        "invoice.payment_succeeded": SubscriptionService.handle_invoice_payment_succeeded,
        "invoice.payment_failed": SubscriptionService.handle_invoice_payment_failed,
        "customer.subscription.updated": SubscriptionService.handle_subscription_updated,
        "customer.subscription.deleted": SubscriptionService.handle_subscription_deleted,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            await handler(event_data, db)
        except Exception as e:
            logger.error(
                "stripe_webhook_handler_error",
                event_type=event_type,
                error=str(e),
                exc_info=True,
            )
            # Return 200 to Stripe to avoid retries for non-retryable errors
            return {"status": "error", "message": str(e)}
    else:
        logger.info("stripe_webhook_unhandled_event", event_type=event_type)

    return {"status": "success"}
