"""Subscription business logic and webhook handling."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.payment import Payment
from src.models.subscription import Subscription, SubscriptionStatus
from src.utils.logger import logger


class SubscriptionService:
    """Business logic for subscription management."""

    @staticmethod
    async def handle_checkout_completed(
        event_data: dict,
        db: AsyncSession,
    ) -> None:
        """Handle checkout.session.completed webhook."""
        session = event_data["object"]
        user_id = session["metadata"].get("user_id")
        stripe_customer_id = session["customer"]
        stripe_subscription_id = session["subscription"]

        if not user_id:
            logger.warning(
                "checkout_completed_missing_user_id", session_id=session["id"]
            )
            return

        user_uuid = uuid.UUID(user_id)

        # Get user's subscription
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_uuid)
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.error("checkout_completed_no_subscription", user_id=user_id)
            return

        # Update subscription with Stripe IDs
        subscription.stripe_customer_id = stripe_customer_id
        subscription.stripe_subscription_id = stripe_subscription_id
        subscription.status = SubscriptionStatus.ACTIVE.value

        await db.commit()
        logger.info(
            "checkout_completed_success",
            user_id=user_id,
            stripe_subscription_id=stripe_subscription_id,
        )

    @staticmethod
    async def handle_invoice_payment_succeeded(
        event_data: dict,
        db: AsyncSession,
    ) -> None:
        """Handle invoice.payment_succeeded webhook."""
        invoice = event_data["object"]
        stripe_subscription_id = invoice.get("subscription")
        stripe_payment_id = invoice["payment_intent"]

        if not stripe_subscription_id:
            return  # Not a subscription invoice

        # Get subscription
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(
                "invoice_succeeded_no_subscription",
                stripe_subscription_id=stripe_subscription_id,
            )
            return

        # Update subscription period
        period_start = datetime.fromtimestamp(
            invoice["period_start"], tz=timezone.utc
        )
        period_end = datetime.fromtimestamp(invoice["period_end"], tz=timezone.utc)

        subscription.current_period_start = period_start
        subscription.current_period_end = period_end
        subscription.status = SubscriptionStatus.ACTIVE.value

        # Check if payment already recorded (idempotency)
        existing_payment = await db.execute(
            select(Payment).where(Payment.provider_payment_id == stripe_payment_id)
        )
        if existing_payment.scalar_one_or_none():
            logger.info("payment_already_recorded", payment_id=stripe_payment_id)
            await db.commit()
            return

        # Record payment
        payment = Payment(
            subscription_id=subscription.id,
            amount=Decimal(invoice["amount_paid"]) / 100,  # Convert cents to currency
            currency=invoice["currency"].upper(),
            status="succeeded",
            provider="stripe",
            provider_payment_id=stripe_payment_id,
            paid_at=datetime.now(timezone.utc),
        )
        db.add(payment)
        await db.commit()

        logger.info(
            "invoice_payment_succeeded",
            subscription_id=str(subscription.id),
            amount=str(payment.amount),
        )

    @staticmethod
    async def handle_invoice_payment_failed(
        event_data: dict,
        db: AsyncSession,
    ) -> None:
        """Handle invoice.payment_failed webhook."""
        invoice = event_data["object"]
        stripe_subscription_id = invoice.get("subscription")
        stripe_payment_id = invoice.get("payment_intent")

        if not stripe_subscription_id:
            return

        # Get subscription
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(
                "invoice_failed_no_subscription",
                stripe_subscription_id=stripe_subscription_id,
            )
            return

        # Update status to past_due (grace period - access maintained)
        subscription.status = SubscriptionStatus.PAST_DUE.value

        # Record failed payment
        if stripe_payment_id:
            # Check idempotency
            existing_payment = await db.execute(
                select(Payment).where(Payment.provider_payment_id == stripe_payment_id)
            )
            if not existing_payment.scalar_one_or_none():
                payment = Payment(
                    subscription_id=subscription.id,
                    amount=Decimal(invoice["amount_due"]) / 100,
                    currency=invoice["currency"].upper(),
                    status="failed",
                    provider="stripe",
                    provider_payment_id=stripe_payment_id,
                )
                db.add(payment)

        await db.commit()
        logger.warning(
            "invoice_payment_failed",
            subscription_id=str(subscription.id),
            stripe_payment_id=stripe_payment_id,
        )

    @staticmethod
    async def handle_subscription_updated(
        event_data: dict,
        db: AsyncSession,
    ) -> None:
        """Handle customer.subscription.updated webhook."""
        stripe_sub = event_data["object"]
        stripe_subscription_id = stripe_sub["id"]

        # Get subscription
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(
                "subscription_updated_no_subscription",
                stripe_subscription_id=stripe_subscription_id,
            )
            return

        # Sync plan and billing cycle from Stripe price metadata
        items = stripe_sub.get("items", {}).get("data", [])
        if items:
            price = items[0].get("price", {})
            price_id = price.get("id")

            # Reverse lookup plan from price_id
            from src.services.stripe_service import PRICE_MAP

            for (plan, cycle), pid in PRICE_MAP.items():
                if pid == price_id:
                    subscription.plan = plan
                    subscription.billing_cycle = cycle
                    break

        # Sync period
        period_start = datetime.fromtimestamp(
            stripe_sub["current_period_start"], tz=timezone.utc
        )
        period_end = datetime.fromtimestamp(
            stripe_sub["current_period_end"], tz=timezone.utc
        )
        subscription.current_period_start = period_start
        subscription.current_period_end = period_end

        # Sync status
        stripe_status = stripe_sub["status"]
        if stripe_status == "active":
            subscription.status = SubscriptionStatus.ACTIVE.value
        elif stripe_status == "past_due":
            subscription.status = SubscriptionStatus.PAST_DUE.value
        elif stripe_status in ["canceled", "unpaid"]:
            subscription.status = SubscriptionStatus.CANCELLED.value

        await db.commit()
        logger.info(
            "subscription_updated",
            subscription_id=str(subscription.id),
            status=subscription.status,
        )

    @staticmethod
    async def handle_subscription_deleted(
        event_data: dict,
        db: AsyncSession,
    ) -> None:
        """Handle customer.subscription.deleted webhook."""
        stripe_sub = event_data["object"]
        stripe_subscription_id = stripe_sub["id"]

        # Get subscription
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(
                "subscription_deleted_no_subscription",
                stripe_subscription_id=stripe_subscription_id,
            )
            return

        subscription.status = SubscriptionStatus.CANCELLED.value
        subscription.cancelled_at = datetime.now(timezone.utc)

        await db.commit()
        logger.info(
            "subscription_deleted", subscription_id=str(subscription.id)
        )
