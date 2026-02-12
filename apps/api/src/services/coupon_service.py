"""
Coupon service with validation rules.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.coupon import Coupon, CouponType, CouponUsage
from src.models.subscription import BillingCycle, Subscription, SubscriptionPlan
from src.models.user import User
from src.schemas.coupon import CouponValidateRequest, CouponValidateResponse

logger = structlog.get_logger()


class CouponValidationError(Exception):
    """Raised when a coupon fails validation."""

    pass


class CouponService:
    """Service for coupon validation and application."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def validate_coupon(
        self, user: User, request: CouponValidateRequest
    ) -> CouponValidateResponse:
        """
        Validate a coupon for a user and plan.

        Validation checks (in order):
        1. Coupon exists and is active
        2. Coupon is within validity period
        3. Global usage limit not exceeded
        4. User usage limit not exceeded
        5. First-time only check
        6. Minimum purchase amount
        7. Applicable plans/cycles
        8. Stackability (if already using another coupon)

        Returns:
            CouponValidateResponse with validation result and discount details.
        """
        try:
            # 1. Find coupon by code
            result = await self.db.execute(
                select(Coupon).where(
                    Coupon.code == request.code.upper(), Coupon.is_active == True
                )
            )
            coupon = result.scalar_one_or_none()

            if not coupon:
                return CouponValidateResponse(
                    valid=False, message="Cupom inválido ou inativo."
                )

            # 2. Check validity period
            now = datetime.utcnow()
            if coupon.valid_from > now:
                return CouponValidateResponse(
                    valid=False,
                    message=f"Cupom válido apenas a partir de {coupon.valid_from.strftime('%d/%m/%Y')}.",
                )

            if coupon.valid_until and coupon.valid_until < now:
                return CouponValidateResponse(
                    valid=False, message="Cupom expirado."
                )

            # 3. Check global usage limit
            if coupon.max_uses is not None:
                usage_count = await self.db.scalar(
                    select(func.count(CouponUsage.id)).where(
                        CouponUsage.coupon_id == coupon.id,
                        CouponUsage.is_active == True,
                    )
                )
                if usage_count >= coupon.max_uses:
                    return CouponValidateResponse(
                        valid=False, message="Cupom atingiu o limite de usos."
                    )

            # 4. Check per-user usage limit
            user_usage_count = await self.db.scalar(
                select(func.count(CouponUsage.id)).where(
                    CouponUsage.coupon_id == coupon.id,
                    CouponUsage.user_id == user.id,
                    CouponUsage.is_active == True,
                )
            )
            if user_usage_count >= coupon.max_uses_per_user:
                return CouponValidateResponse(
                    valid=False,
                    message="Você já atingiu o limite de usos para este cupom.",
                )

            # 5. Check first-time only restriction
            if coupon.first_time_only:
                has_previous_subs = await self.db.scalar(
                    select(func.count(Subscription.id)).where(
                        Subscription.user_id == user.id,
                        Subscription.status != "trial",  # Exclude trial-only users
                    )
                )
                if has_previous_subs > 0:
                    return CouponValidateResponse(
                        valid=False,
                        message="Este cupom é válido apenas para primeira compra.",
                    )

            # 6. Check minimum purchase amount
            if coupon.min_purchase_amount and request.amount < coupon.min_purchase_amount:
                return CouponValidateResponse(
                    valid=False,
                    message=f"Valor mínimo para este cupom: R$ {coupon.min_purchase_amount:.2f}",
                )

            # 7. Check applicable plans
            if coupon.applicable_plans and request.plan not in coupon.applicable_plans:
                return CouponValidateResponse(
                    valid=False, message="Cupom não aplicável a este plano."
                )

            # 8. Check applicable billing cycles
            if (
                coupon.applicable_cycles
                and request.billing_cycle not in coupon.applicable_cycles
            ):
                return CouponValidateResponse(
                    valid=False, message="Cupom não aplicável a este ciclo de cobrança."
                )

            # 9. Check stackability (if user already using another active coupon)
            if not coupon.is_stackable:
                has_active_coupon = await self.db.scalar(
                    select(func.count(CouponUsage.id)).where(
                        CouponUsage.user_id == user.id,
                        CouponUsage.is_active == True,
                        CouponUsage.coupon_id != coupon.id,
                    )
                )
                if has_active_coupon > 0:
                    return CouponValidateResponse(
                        valid=False,
                        message="Você já possui um cupom ativo. Este cupom não é acumulável.",
                    )

            # Calculate discount
            discount_amount = self._calculate_discount(
                coupon, request.amount
            )
            final_amount = max(Decimal("0.00"), request.amount - discount_amount)

            return CouponValidateResponse(
                valid=True,
                coupon_id=coupon.id,
                discount_type=coupon.discount_type,
                discount_value=coupon.discount_value,
                discount_amount=discount_amount,
                final_amount=final_amount,
                message="Cupom válido!",
            )

        except Exception as e:
            logger.error("coupon_validation_error", error=str(e), user_id=str(user.id))
            return CouponValidateResponse(
                valid=False, message="Erro ao validar cupom. Tente novamente."
            )

    async def apply_coupon(
        self,
        user: User,
        coupon_id: UUID,
        subscription_id: UUID,
        original_amount: Decimal,
        discount_amount: Decimal,
    ) -> CouponUsage:
        """
        Apply a coupon to a subscription and create usage record.

        Args:
            user: User applying the coupon
            coupon_id: Coupon ID
            subscription_id: Subscription ID
            original_amount: Original subscription amount
            discount_amount: Calculated discount amount

        Returns:
            CouponUsage record
        """
        final_amount = max(Decimal("0.00"), original_amount - discount_amount)

        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user.id,
            subscription_id=subscription_id,
            original_amount=original_amount,
            discount_amount=discount_amount,
            final_amount=final_amount,
            is_active=True,
            used_at=datetime.utcnow(),
        )

        self.db.add(usage)
        await self.db.commit()
        await self.db.refresh(usage)

        logger.info(
            "coupon_applied",
            user_id=str(user.id),
            coupon_id=str(coupon_id),
            discount=float(discount_amount),
        )

        return usage

    async def cancel_coupon_usage(self, usage_id: UUID) -> None:
        """
        Cancel a coupon usage (e.g., when subscription is canceled).

        Args:
            usage_id: CouponUsage ID to cancel
        """
        result = await self.db.execute(
            select(CouponUsage).where(CouponUsage.id == usage_id)
        )
        usage = result.scalar_one_or_none()

        if usage:
            usage.is_active = False
            usage.canceled_at = datetime.utcnow()
            await self.db.commit()

            logger.info("coupon_usage_canceled", usage_id=str(usage_id))

    def _calculate_discount(self, coupon: Coupon, amount: Decimal) -> Decimal:
        """
        Calculate discount amount based on coupon type.

        Args:
            coupon: Coupon to apply
            amount: Original amount

        Returns:
            Discount amount (never exceeds original amount)
        """
        if coupon.discount_type == CouponType.PERCENTAGE:
            discount = amount * (coupon.discount_value / Decimal("100"))
        else:  # FIXED
            discount = coupon.discount_value

        # Ensure discount doesn't exceed amount
        return min(discount, amount)

    async def get_coupon_stats(self, coupon_id: UUID) -> dict:
        """
        Get statistics for a coupon.

        Args:
            coupon_id: Coupon ID

        Returns:
            Dictionary with statistics
        """
        # Total uses
        total_uses = await self.db.scalar(
            select(func.count(CouponUsage.id)).where(
                CouponUsage.coupon_id == coupon_id
            )
        )

        # Active uses
        active_uses = await self.db.scalar(
            select(func.count(CouponUsage.id)).where(
                CouponUsage.coupon_id == coupon_id, CouponUsage.is_active == True
            )
        )

        # Total revenue and discount
        result = await self.db.execute(
            select(
                func.sum(CouponUsage.final_amount).label("total_revenue"),
                func.sum(CouponUsage.discount_amount).label("total_discount"),
            ).where(CouponUsage.coupon_id == coupon_id, CouponUsage.is_active == True)
        )
        row = result.first()

        # Unique users
        unique_users = await self.db.scalar(
            select(func.count(func.distinct(CouponUsage.user_id))).where(
                CouponUsage.coupon_id == coupon_id
            )
        )

        # Most recent use
        most_recent = await self.db.scalar(
            select(func.max(CouponUsage.used_at)).where(
                CouponUsage.coupon_id == coupon_id
            )
        )

        return {
            "total_uses": total_uses or 0,
            "active_uses": active_uses or 0,
            "total_revenue": row.total_revenue or Decimal("0.00"),
            "total_discount": row.total_discount or Decimal("0.00"),
            "unique_users": unique_users or 0,
            "most_recent_use": most_recent,
        }
