"""
Unit tests for CouponService.

Tests all validation edge cases for coupon application.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.subscription import (
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from src.models.coupon import Coupon, CouponType, CouponUsage
from src.schemas.coupon import CouponValidateRequest
from src.services.coupon_service import CouponService


@pytest.fixture
async def coupon_service(db_session: AsyncSession) -> CouponService:
    """Create CouponService instance."""
    return CouponService(db_session)


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    """Create a sample user for testing."""
    user = User(
        id=uuid4(),
        email="coupon_test@example.com",
        full_name="Coupon Test User",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def active_coupon(db_session: AsyncSession) -> Coupon:
    """Create an active coupon for testing."""
    coupon = Coupon(
        id=uuid4(),
        code="TEST10",
        description="10% discount",
        discount_type=CouponType.PERCENTAGE.value,
        discount_value=Decimal("10.00"),
        is_active=True,
        valid_from=datetime.utcnow() - timedelta(days=1),
        valid_until=datetime.utcnow() + timedelta(days=30),
        max_uses=100,
        max_uses_per_user=1,
        first_time_only=False,
        is_stackable=False,
        applicable_plans=[],
        applicable_cycles=[],
        created_by=uuid4(),
    )
    db_session.add(coupon)
    await db_session.commit()
    await db_session.refresh(coupon)
    return coupon


@pytest.fixture
async def fixed_coupon(db_session: AsyncSession) -> Coupon:
    """Create a fixed amount coupon for testing."""
    coupon = Coupon(
        id=uuid4(),
        code="FLAT20",
        description="R$ 20 off",
        discount_type=CouponType.FIXED.value,
        discount_value=Decimal("20.00"),
        is_active=True,
        valid_from=datetime.utcnow() - timedelta(days=1),
        valid_until=datetime.utcnow() + timedelta(days=30),
        max_uses=None,
        max_uses_per_user=3,
        first_time_only=False,
        is_stackable=False,
        applicable_plans=[],
        applicable_cycles=[],
        created_by=uuid4(),
    )
    db_session.add(coupon)
    await db_session.commit()
    await db_session.refresh(coupon)
    return coupon


class TestCouponValidation:
    """Tests for coupon validation logic."""

    @pytest.mark.asyncio
    async def test_valid_coupon_returns_success(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
    ):
        """Test that a valid coupon passes validation."""
        request = CouponValidateRequest(
            code="TEST10",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True
        assert response.coupon_id == active_coupon.id
        assert response.discount_type == CouponType.PERCENTAGE.value
        assert response.discount_amount == Decimal("10.00")  # 10% of 100
        assert response.final_amount == Decimal("90.00")

    @pytest.mark.asyncio
    async def test_invalid_code_returns_error(
        self, coupon_service: CouponService, sample_user: User
    ):
        """Test that invalid coupon code returns error."""
        request = CouponValidateRequest(
            code="INVALID",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "inválido" in response.message.lower()

    @pytest.mark.asyncio
    async def test_inactive_coupon_returns_error(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test that inactive coupon is rejected."""
        coupon = Coupon(
            id=uuid4(),
            code="INACTIVE",
            description="Inactive coupon",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=False,  # Inactive
            valid_from=datetime.utcnow() - timedelta(days=1),
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="INACTIVE",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "inválido" in response.message.lower()


class TestCouponValidityPeriod:
    """Tests for coupon validity period checks."""

    @pytest.mark.asyncio
    async def test_coupon_not_yet_valid(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon that hasn't started yet."""
        coupon = Coupon(
            id=uuid4(),
            code="FUTURE",
            description="Future coupon",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=True,
            valid_from=datetime.utcnow() + timedelta(days=7),  # Future
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="FUTURE",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "a partir de" in response.message.lower()

    @pytest.mark.asyncio
    async def test_expired_coupon(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test expired coupon is rejected."""
        coupon = Coupon(
            id=uuid4(),
            code="EXPIRED",
            description="Expired coupon",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=30),
            valid_until=datetime.utcnow() - timedelta(days=1),  # Expired
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="EXPIRED",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "expirado" in response.message.lower()


class TestCouponUsageLimits:
    """Tests for coupon usage limit checks."""

    @pytest.mark.asyncio
    async def test_global_usage_limit_exceeded(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon that reached global usage limit."""
        coupon = Coupon(
            id=uuid4(),
            code="LIMITED",
            description="Limited uses",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            max_uses=2,  # Only 2 uses allowed
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        # Create 2 usages
        other_user = User(
            id=uuid4(),
            email="other@example.com",
            full_name="Other User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()

        for _ in range(2):
            usage = CouponUsage(
                id=uuid4(),
                coupon_id=coupon.id,
                user_id=other_user.id,
                subscription_id=uuid4(),
                original_amount=Decimal("100.00"),
                discount_amount=Decimal("10.00"),
                final_amount=Decimal("90.00"),
                is_active=True,
            )
            db_session.add(usage)
        await db_session.commit()

        request = CouponValidateRequest(
            code="LIMITED",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "limite" in response.message.lower()

    @pytest.mark.asyncio
    async def test_user_usage_limit_exceeded(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
        db_session: AsyncSession,
    ):
        """Test user has already used coupon max times."""
        # Create a usage for this user
        usage = CouponUsage(
            id=uuid4(),
            coupon_id=active_coupon.id,
            user_id=sample_user.id,
            subscription_id=uuid4(),
            original_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
            final_amount=Decimal("90.00"),
            is_active=True,
        )
        db_session.add(usage)
        await db_session.commit()

        request = CouponValidateRequest(
            code="TEST10",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "limite" in response.message.lower()


class TestFirstTimeOnly:
    """Tests for first-time only coupon restriction."""

    @pytest.mark.asyncio
    async def test_first_time_only_with_previous_subs(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test first-time only coupon rejected for existing subscriber."""
        coupon = Coupon(
            id=uuid4(),
            code="FIRSTONLY",
            description="First time only",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("50.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            first_time_only=True,
            max_uses_per_user=1,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        # Create previous subscription for user
        sub = Subscription(
            id=uuid4(),
            user_id=sample_user.id,
            plan=SubscriptionPlan.BASIC.value,
            status=SubscriptionStatus.ACTIVE.value,
        )
        db_session.add(sub)
        await db_session.commit()

        request = CouponValidateRequest(
            code="FIRSTONLY",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "primeira compra" in response.message.lower()

    @pytest.mark.asyncio
    async def test_first_time_only_new_user(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test first-time only coupon accepted for new user."""
        coupon = Coupon(
            id=uuid4(),
            code="NEWUSER",
            description="New user discount",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("50.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            first_time_only=True,
            max_uses_per_user=1,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        # User has no previous subscriptions
        request = CouponValidateRequest(
            code="NEWUSER",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True
        assert response.discount_amount == Decimal("50.00")


class TestMinimumPurchase:
    """Tests for minimum purchase amount check."""

    @pytest.mark.asyncio
    async def test_below_minimum_amount(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon rejected when below minimum purchase."""
        coupon = Coupon(
            id=uuid4(),
            code="MIN50",
            description="Min R$ 50 purchase",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            min_purchase_amount=Decimal("50.00"),
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="MIN50",
            amount=Decimal("30.00"),  # Below minimum
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "mínimo" in response.message.lower()

    @pytest.mark.asyncio
    async def test_at_minimum_amount(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon accepted at exact minimum purchase."""
        coupon = Coupon(
            id=uuid4(),
            code="MIN50",
            description="Min R$ 50 purchase",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("10.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            min_purchase_amount=Decimal("50.00"),
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="MIN50",
            amount=Decimal("50.00"),  # Exactly at minimum
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True


class TestApplicablePlans:
    """Tests for plan-specific coupon restrictions."""

    @pytest.mark.asyncio
    async def test_wrong_plan_rejected(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon rejected for non-applicable plan."""
        coupon = Coupon(
            id=uuid4(),
            code="PREMIUMONLY",
            description="Premium only",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("20.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            applicable_plans=["premium"],  # Only premium
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="PREMIUMONLY",
            amount=Decimal("100.00"),
            plan="basic",  # Not premium
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "plano" in response.message.lower()

    @pytest.mark.asyncio
    async def test_correct_plan_accepted(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon accepted for applicable plan."""
        coupon = Coupon(
            id=uuid4(),
            code="PREMIUMONLY",
            description="Premium only",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("20.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            applicable_plans=["premium"],
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="PREMIUMONLY",
            amount=Decimal("100.00"),
            plan="premium",  # Correct plan
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True


class TestApplicableCycles:
    """Tests for billing cycle restrictions."""

    @pytest.mark.asyncio
    async def test_wrong_cycle_rejected(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test coupon rejected for non-applicable billing cycle."""
        coupon = Coupon(
            id=uuid4(),
            code="YEARLYONLY",
            description="Yearly only",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("20.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            applicable_cycles=["yearly"],  # Only yearly
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="YEARLYONLY",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",  # Not yearly
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "ciclo" in response.message.lower()


class TestStackability:
    """Tests for coupon stacking rules."""

    @pytest.mark.asyncio
    async def test_non_stackable_with_active_coupon(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
        db_session: AsyncSession,
    ):
        """Test non-stackable coupon rejected when user has active coupon."""
        # Create another coupon
        other_coupon = Coupon(
            id=uuid4(),
            code="OTHER20",
            description="Other discount",
            discount_type=CouponType.PERCENTAGE.value,
            discount_value=Decimal("20.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(other_coupon)
        await db_session.commit()

        # User has active usage of other coupon
        usage = CouponUsage(
            id=uuid4(),
            coupon_id=other_coupon.id,
            user_id=sample_user.id,
            subscription_id=uuid4(),
            original_amount=Decimal("100.00"),
            discount_amount=Decimal("20.00"),
            final_amount=Decimal("80.00"),
            is_active=True,
        )
        db_session.add(usage)
        await db_session.commit()

        request = CouponValidateRequest(
            code="TEST10",  # active_coupon which is not stackable
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is False
        assert "acumulável" in response.message.lower()


class TestDiscountCalculation:
    """Tests for discount calculation logic."""

    @pytest.mark.asyncio
    async def test_percentage_discount(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
    ):
        """Test percentage discount calculation."""
        request = CouponValidateRequest(
            code="TEST10",
            amount=Decimal("200.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True
        assert response.discount_amount == Decimal("20.00")  # 10% of 200
        assert response.final_amount == Decimal("180.00")

    @pytest.mark.asyncio
    async def test_fixed_discount(
        self,
        coupon_service: CouponService,
        sample_user: User,
        fixed_coupon: Coupon,
    ):
        """Test fixed amount discount calculation."""
        request = CouponValidateRequest(
            code="FLAT20",
            amount=Decimal("100.00"),
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True
        assert response.discount_amount == Decimal("20.00")
        assert response.final_amount == Decimal("80.00")

    @pytest.mark.asyncio
    async def test_discount_exceeds_amount(
        self,
        coupon_service: CouponService,
        sample_user: User,
        db_session: AsyncSession,
    ):
        """Test that discount cannot exceed original amount."""
        coupon = Coupon(
            id=uuid4(),
            code="HUGE100",
            description="R$ 100 off",
            discount_type=CouponType.FIXED.value,
            discount_value=Decimal("100.00"),
            is_active=True,
            valid_from=datetime.utcnow() - timedelta(days=1),
            max_uses_per_user=10,
            created_by=uuid4(),
        )
        db_session.add(coupon)
        await db_session.commit()

        request = CouponValidateRequest(
            code="HUGE100",
            amount=Decimal("50.00"),  # Less than discount
            plan="basic",
            billing_cycle="monthly",
        )

        response = await coupon_service.validate_coupon(sample_user, request)

        assert response.valid is True
        # Discount should be capped at amount
        assert response.discount_amount == Decimal("50.00")
        assert response.final_amount == Decimal("0.00")


class TestCouponApplication:
    """Tests for applying coupons."""

    @pytest.mark.asyncio
    async def test_apply_coupon_creates_usage(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
        db_session: AsyncSession,
    ):
        """Test that applying coupon creates usage record."""
        subscription_id = uuid4()

        usage = await coupon_service.apply_coupon(
            user=sample_user,
            coupon_id=active_coupon.id,
            subscription_id=subscription_id,
            original_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
        )

        assert usage.id is not None
        assert usage.coupon_id == active_coupon.id
        assert usage.user_id == sample_user.id
        assert usage.subscription_id == subscription_id
        assert usage.original_amount == Decimal("100.00")
        assert usage.discount_amount == Decimal("10.00")
        assert usage.final_amount == Decimal("90.00")
        assert usage.is_active is True

    @pytest.mark.asyncio
    async def test_cancel_coupon_usage(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
        db_session: AsyncSession,
    ):
        """Test canceling a coupon usage."""
        # Create usage
        usage = await coupon_service.apply_coupon(
            user=sample_user,
            coupon_id=active_coupon.id,
            subscription_id=uuid4(),
            original_amount=Decimal("100.00"),
            discount_amount=Decimal("10.00"),
        )

        # Cancel it
        await coupon_service.cancel_coupon_usage(usage.id)

        # Verify it's canceled
        from sqlalchemy import select

        result = await db_session.execute(
            select(CouponUsage).where(CouponUsage.id == usage.id)
        )
        canceled = result.scalar_one()

        assert canceled.is_active is False
        assert canceled.canceled_at is not None


class TestCouponStats:
    """Tests for coupon statistics."""

    @pytest.mark.asyncio
    async def test_get_coupon_stats_empty(
        self,
        coupon_service: CouponService,
        active_coupon: Coupon,
    ):
        """Test stats for coupon with no usages."""
        stats = await coupon_service.get_coupon_stats(active_coupon.id)

        assert stats["total_uses"] == 0
        assert stats["active_uses"] == 0
        assert stats["total_revenue"] == Decimal("0.00")
        assert stats["total_discount"] == Decimal("0.00")
        assert stats["unique_users"] == 0

    @pytest.mark.asyncio
    async def test_get_coupon_stats_with_usages(
        self,
        coupon_service: CouponService,
        sample_user: User,
        active_coupon: Coupon,
        db_session: AsyncSession,
    ):
        """Test stats for coupon with usages."""
        # Create usages
        for i in range(3):
            usage = CouponUsage(
                id=uuid4(),
                coupon_id=active_coupon.id,
                user_id=sample_user.id,
                subscription_id=uuid4(),
                original_amount=Decimal("100.00"),
                discount_amount=Decimal("10.00"),
                final_amount=Decimal("90.00"),
                is_active=True,
            )
            db_session.add(usage)
        await db_session.commit()

        stats = await coupon_service.get_coupon_stats(active_coupon.id)

        assert stats["total_uses"] == 3
        assert stats["active_uses"] == 3
        assert stats["total_revenue"] == Decimal("270.00")  # 3 * 90
        assert stats["total_discount"] == Decimal("30.00")  # 3 * 10
        assert stats["unique_users"] == 1
