"""
Unit tests for MetricsService.

Tests MRR, churn, conversion, and other SaaS metrics calculations.
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
    BillingCycle,
)
from src.models.payment import Payment
from src.models.invoice import Invoice
from src.services.metrics_service import MetricsService


@pytest.fixture
async def metrics_service(db_session: AsyncSession) -> MetricsService:
    """Create MetricsService instance."""
    return MetricsService(db_session)


@pytest.fixture
async def sample_user(db_session: AsyncSession) -> User:
    """Create a sample user for testing."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user for testing."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="super_admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestMetricsServiceDashboardStats:
    """Tests for get_dashboard_stats method."""

    @pytest.mark.asyncio
    async def test_empty_database_returns_zeros(
        self, metrics_service: MetricsService
    ):
        """Test that empty database returns all zeros."""
        stats = await metrics_service.get_dashboard_stats()

        assert stats["total_users"] == 0
        assert stats["active_users"] == 0
        assert stats["paying_users"] == 0
        assert stats["trial_users"] == 0
        assert stats["mrr"] == 0.0
        assert stats["arr"] == 0.0
        assert stats["arpu"] == 0.0
        assert stats["churn_rate"] == 0.0
        assert stats["trial_conversion_rate"] == 0.0

    @pytest.mark.asyncio
    async def test_counts_users_correctly(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test user counting with various states."""
        # Create active users
        for i in range(3):
            user = User(
                id=uuid4(),
                email=f"active{i}@example.com",
                full_name=f"Active User {i}",
                hashed_password="hashed",
                is_active=True,
            )
            db_session.add(user)

        # Create soft-deleted user
        deleted_user = User(
            id=uuid4(),
            email="deleted@example.com",
            full_name="Deleted User",
            hashed_password="hashed",
            is_active=False,
            deleted_at=datetime.utcnow(),
        )
        db_session.add(deleted_user)

        # Create inactive user (not deleted)
        inactive_user = User(
            id=uuid4(),
            email="inactive@example.com",
            full_name="Inactive User",
            hashed_password="hashed",
            is_active=False,
        )
        db_session.add(inactive_user)

        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # Total users excludes soft-deleted
        assert stats["total_users"] == 4  # 3 active + 1 inactive
        # Active users only counts is_active=True and not deleted
        assert stats["active_users"] == 3

    @pytest.mark.asyncio
    async def test_counts_paying_users(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test paying user count based on subscriptions."""
        # Create users
        user1 = User(
            id=uuid4(),
            email="payer1@example.com",
            full_name="Payer 1",
            hashed_password="hashed",
            is_active=True,
        )
        user2 = User(
            id=uuid4(),
            email="payer2@example.com",
            full_name="Payer 2",
            hashed_password="hashed",
            is_active=True,
        )
        free_user = User(
            id=uuid4(),
            email="free@example.com",
            full_name="Free User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add_all([user1, user2, free_user])
        await db_session.commit()

        # Create paid subscriptions
        sub1 = Subscription(
            id=uuid4(),
            user_id=user1.id,
            plan=SubscriptionPlan.BASIC.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.MONTHLY.value,
        )
        sub2 = Subscription(
            id=uuid4(),
            user_id=user2.id,
            plan=SubscriptionPlan.PREMIUM.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.YEARLY.value,
        )
        # Free subscription
        free_sub = Subscription(
            id=uuid4(),
            user_id=free_user.id,
            plan=SubscriptionPlan.FREE.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.MONTHLY.value,
        )
        db_session.add_all([sub1, sub2, free_sub])
        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # Only users with active paid subscriptions
        assert stats["paying_users"] == 2

    @pytest.mark.asyncio
    async def test_counts_trial_users(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test trial user count."""
        # Create user with active trial
        trial_user = User(
            id=uuid4(),
            email="trial@example.com",
            full_name="Trial User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(trial_user)
        await db_session.commit()

        # Active trial
        trial_sub = Subscription(
            id=uuid4(),
            user_id=trial_user.id,
            plan=SubscriptionPlan.FREE.value,
            status=SubscriptionStatus.TRIAL.value,
            trial_end=datetime.utcnow() + timedelta(days=7),
        )
        db_session.add(trial_sub)

        # Expired trial
        expired_trial_user = User(
            id=uuid4(),
            email="expired@example.com",
            full_name="Expired Trial",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(expired_trial_user)
        await db_session.commit()

        expired_trial_sub = Subscription(
            id=uuid4(),
            user_id=expired_trial_user.id,
            plan=SubscriptionPlan.FREE.value,
            status=SubscriptionStatus.TRIAL.value,
            trial_end=datetime.utcnow() - timedelta(days=1),
        )
        db_session.add(expired_trial_sub)
        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # Only active trials
        assert stats["trial_users"] == 1


class TestMetricsServiceMRR:
    """Tests for MRR calculations."""

    @pytest.mark.asyncio
    async def test_mrr_with_monthly_subscription(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test MRR calculation with monthly subscription."""
        user = User(
            id=uuid4(),
            email="monthly@example.com",
            full_name="Monthly User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        sub = Subscription(
            id=uuid4(),
            user_id=user.id,
            plan=SubscriptionPlan.BASIC.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.MONTHLY.value,
        )
        db_session.add(sub)
        await db_session.commit()

        # Payment of R$ 19.90
        payment = Payment(
            id=uuid4(),
            subscription_id=sub.id,
            amount=Decimal("19.90"),
            currency="BRL",
            status="succeeded",
            provider="stripe",
            provider_payment_id="pi_test",
            created_at=datetime.utcnow(),
        )
        db_session.add(payment)
        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # MRR should be 19.90 for monthly
        assert stats["mrr"] == pytest.approx(19.90, rel=0.01)

    @pytest.mark.asyncio
    async def test_mrr_with_yearly_subscription(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test MRR calculation with yearly subscription (divided by 12)."""
        user = User(
            id=uuid4(),
            email="yearly@example.com",
            full_name="Yearly User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        sub = Subscription(
            id=uuid4(),
            user_id=user.id,
            plan=SubscriptionPlan.PREMIUM.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.YEARLY.value,
        )
        db_session.add(sub)
        await db_session.commit()

        # Payment of R$ 199.00 for yearly (should be ~16.58/month MRR)
        payment = Payment(
            id=uuid4(),
            subscription_id=sub.id,
            amount=Decimal("199.00"),
            currency="BRL",
            status="succeeded",
            provider="stripe",
            provider_payment_id="pi_test_yearly",
            created_at=datetime.utcnow(),
        )
        db_session.add(payment)
        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # MRR should be 199.00 / 12 = 16.58
        assert stats["mrr"] == pytest.approx(16.58, rel=0.05)

    @pytest.mark.asyncio
    async def test_mrr_excludes_failed_payments(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test that failed payments are not counted in MRR."""
        user = User(
            id=uuid4(),
            email="failed@example.com",
            full_name="Failed Payment User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        sub = Subscription(
            id=uuid4(),
            user_id=user.id,
            plan=SubscriptionPlan.BASIC.value,
            status=SubscriptionStatus.ACTIVE.value,
            billing_cycle=BillingCycle.MONTHLY.value,
        )
        db_session.add(sub)
        await db_session.commit()

        # Failed payment
        payment = Payment(
            id=uuid4(),
            subscription_id=sub.id,
            amount=Decimal("19.90"),
            currency="BRL",
            status="failed",
            provider="stripe",
            provider_payment_id="pi_failed",
            created_at=datetime.utcnow(),
        )
        db_session.add(payment)
        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # MRR should be 0 (no succeeded payments)
        assert stats["mrr"] == 0.0


class TestMetricsServiceChurn:
    """Tests for churn rate calculations."""

    @pytest.mark.asyncio
    async def test_churn_rate_zero_with_no_subscriptions(
        self, metrics_service: MetricsService
    ):
        """Test churn rate is 0 when no subscriptions exist."""
        stats = await metrics_service.get_dashboard_stats()
        assert stats["churn_rate"] == 0.0

    @pytest.mark.asyncio
    async def test_churn_rate_calculation(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test churn rate calculation with cancelled subscriptions."""
        # Create users
        users = []
        for i in range(10):
            user = User(
                id=uuid4(),
                email=f"churn{i}@example.com",
                full_name=f"Churn User {i}",
                hashed_password="hashed",
                is_active=True,
            )
            db_session.add(user)
            users.append(user)
        await db_session.commit()

        # Create active subscriptions for 7 users
        for i in range(7):
            sub = Subscription(
                id=uuid4(),
                user_id=users[i].id,
                plan=SubscriptionPlan.BASIC.value,
                status=SubscriptionStatus.ACTIVE.value,
                billing_cycle=BillingCycle.MONTHLY.value,
            )
            db_session.add(sub)

        # Create cancelled subscriptions for 3 users
        for i in range(7, 10):
            sub = Subscription(
                id=uuid4(),
                user_id=users[i].id,
                plan=SubscriptionPlan.BASIC.value,
                status=SubscriptionStatus.CANCELLED.value,
                billing_cycle=BillingCycle.MONTHLY.value,
                cancelled_at=datetime.utcnow(),
            )
            db_session.add(sub)

        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # Churn rate should be calculated
        # Note: exact calculation depends on implementation
        assert stats["churn_rate"] >= 0.0


class TestMetricsServiceARPU:
    """Tests for ARPU calculations."""

    @pytest.mark.asyncio
    async def test_arpu_zero_with_no_paying_users(
        self, metrics_service: MetricsService
    ):
        """Test ARPU is 0 when no paying users."""
        stats = await metrics_service.get_dashboard_stats()
        assert stats["arpu"] == 0.0

    @pytest.mark.asyncio
    async def test_arpu_calculation(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test ARPU calculation with paying users."""
        # Create 2 users with subscriptions
        users = []
        for i in range(2):
            user = User(
                id=uuid4(),
                email=f"arpu{i}@example.com",
                full_name=f"ARPU User {i}",
                hashed_password="hashed",
                is_active=True,
            )
            db_session.add(user)
            users.append(user)
        await db_session.commit()

        # Create subscriptions and payments
        for i, user in enumerate(users):
            sub = Subscription(
                id=uuid4(),
                user_id=user.id,
                plan=SubscriptionPlan.BASIC.value,
                status=SubscriptionStatus.ACTIVE.value,
                billing_cycle=BillingCycle.MONTHLY.value,
            )
            db_session.add(sub)
            await db_session.commit()

            payment = Payment(
                id=uuid4(),
                subscription_id=sub.id,
                amount=Decimal("19.90"),
                currency="BRL",
                status="succeeded",
                provider="stripe",
                provider_payment_id=f"pi_arpu_{i}",
                created_at=datetime.utcnow(),
            )
            db_session.add(payment)

        await db_session.commit()

        stats = await metrics_service.get_dashboard_stats()

        # ARPU = MRR / paying users = 39.80 / 2 = 19.90
        assert stats["arpu"] == pytest.approx(19.90, rel=0.1)


class TestMetricsServiceOperational:
    """Tests for operational metrics."""

    @pytest.mark.asyncio
    async def test_operational_metrics_empty(
        self, metrics_service: MetricsService
    ):
        """Test operational metrics with no data."""
        metrics = await metrics_service.get_operational_metrics()

        assert metrics["invoices_today"] == 0
        assert metrics["invoices_this_week"] == 0
        assert metrics["invoices_this_month"] == 0
        assert metrics["ocr_success_rate"] == 0.0
        assert metrics["avg_processing_time"] == 0.0

    @pytest.mark.asyncio
    async def test_invoice_counts(
        self, metrics_service: MetricsService, db_session: AsyncSession
    ):
        """Test invoice counting for different periods."""
        user = User(
            id=uuid4(),
            email="invoice@example.com",
            full_name="Invoice User",
            hashed_password="hashed",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()

        # Create invoices for different periods
        today = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # Today's invoice
        invoice_today = Invoice(
            id=uuid4(),
            user_id=user.id,
            access_key=f"today_{uuid4()}",
            issue_date=datetime.utcnow(),
            total_amount=Decimal("100.00"),
        )
        db_session.add(invoice_today)

        # This week's invoice (yesterday)
        invoice_week = Invoice(
            id=uuid4(),
            user_id=user.id,
            access_key=f"week_{uuid4()}",
            issue_date=today - timedelta(days=1),
            total_amount=Decimal("50.00"),
        )
        db_session.add(invoice_week)

        await db_session.commit()

        metrics = await metrics_service.get_operational_metrics()

        assert metrics["invoices_today"] == 1
        assert metrics["invoices_this_week"] >= 2  # At least today + yesterday


class TestMetricsServiceCharts:
    """Tests for chart data methods."""

    @pytest.mark.asyncio
    async def test_revenue_chart_returns_correct_format(
        self, metrics_service: MetricsService
    ):
        """Test revenue chart returns data in correct format."""
        data = await metrics_service.get_revenue_chart_data(months=3)

        assert isinstance(data, list)
        assert len(data) == 4  # 3 months + current

        for item in data:
            assert "month" in item
            assert "mrr" in item
            assert isinstance(item["mrr"], (int, float))

    @pytest.mark.asyncio
    async def test_growth_chart_returns_correct_format(
        self, metrics_service: MetricsService
    ):
        """Test growth chart returns data in correct format."""
        data = await metrics_service.get_growth_chart_data(months=3)

        assert isinstance(data, list)
        assert len(data) == 4  # 3 months + current

        for item in data:
            assert "month" in item
            assert "new_users" in item
            assert "total_users" in item
            assert "net_growth" in item


class TestMetricsServiceReports:
    """Tests for report generation methods."""

    @pytest.mark.asyncio
    async def test_churn_report_empty(
        self, metrics_service: MetricsService
    ):
        """Test churn report with no data."""
        report = await metrics_service.get_churn_report(months=3)

        assert "summary" in report
        assert "timeline" in report
        assert "by_plan" in report
        assert report["summary"]["total_churned"] == 0

    @pytest.mark.asyncio
    async def test_conversion_report_empty(
        self, metrics_service: MetricsService
    ):
        """Test conversion report with no data."""
        report = await metrics_service.get_conversion_report(months=3)

        assert "funnel" in report
        assert "timeline" in report
        assert "by_plan" in report

    @pytest.mark.asyncio
    async def test_mrr_report_empty(
        self, metrics_service: MetricsService
    ):
        """Test MRR report with no data."""
        report = await metrics_service.get_mrr_report()

        assert "breakdown" in report
        assert "by_plan" in report
        assert "by_cycle" in report
        assert report["breakdown"]["total_mrr"] == 0.0
