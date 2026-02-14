"""Stripe integration service for subscription payments."""

import stripe

from src.config import settings

# Initialize Stripe with API key
stripe.api_key = settings.STRIPE_SECRET_KEY

# Price ID mapping (plan, billing_cycle) -> stripe_price_id
PRICE_MAP = {
    ("basic", "monthly"): settings.STRIPE_BASIC_MONTHLY_PRICE_ID,
    ("basic", "yearly"): settings.STRIPE_BASIC_YEARLY_PRICE_ID,
    ("premium", "monthly"): settings.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    ("premium", "yearly"): settings.STRIPE_PREMIUM_YEARLY_PRICE_ID,
}


class StripeService:
    """Stripe payment operations."""

    @staticmethod
    async def create_checkout_session(
        user_email: str,
        user_id: str,
        plan: str,
        billing_cycle: str,
        success_url: str,
        cancel_url: str,
        stripe_customer_id: str | None = None,
        discounts: list[dict] | None = None,
    ) -> stripe.checkout.Session:
        """Create Stripe Checkout session for subscription."""
        price_id = PRICE_MAP.get((plan, billing_cycle))
        if not price_id:
            raise ValueError(f"Preço não configurado para {plan}/{billing_cycle}")

        params = {
            "mode": "subscription",
            "payment_method_types": ["card"],  # Card only for recurring payments
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {"user_id": user_id, "plan": plan},
            "allow_promotion_codes": True if not discounts else False, # Cannot use both allow_promotion_codes and discounts
            "billing_address_collection": "required",
        }

        if discounts:
            params["discounts"] = discounts

        if stripe_customer_id:
            params["customer"] = stripe_customer_id
        else:
            params["customer_email"] = user_email

        return stripe.checkout.Session.create(**params)

    @staticmethod
    async def create_portal_session(
        stripe_customer_id: str, return_url: str
    ) -> stripe.billing_portal.Session:
        """Create Stripe Customer Portal session."""
        return stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=return_url,
        )

    @staticmethod
    async def cancel_subscription(stripe_subscription_id: str) -> None:
        """Cancel subscription at period end (not immediate)."""
        stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=True,
        )

    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
        """Verify Stripe webhook signature. Raises ValueError if invalid."""
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )

    @staticmethod
    async def create_coupon(
        duration: str,
        duration_in_months: int | None = None,
        percent_off: float | None = None,
        amount_off: int | None = None,
        currency: str = "brl",
        name: str | None = None,
    ) -> stripe.Coupon:
        """Create a Stripe coupon."""
        params = {
            "duration": duration,
            "name": name,
        }
        if duration == "repeating" and duration_in_months:
            params["duration_in_months"] = duration_in_months

        if percent_off:
            params["percent_off"] = percent_off
        elif amount_off:
            params["amount_off"] = amount_off
            params["currency"] = currency

        return stripe.Coupon.create(**params)

    @staticmethod
    async def create_promotion_code(
        coupon_id: str,
        code: str,
    ) -> stripe.PromotionCode:
        """Create a Stripe promotion code (customer-facing code)."""
        return stripe.PromotionCode.create(
            coupon=coupon_id,
            code=code,
        )
