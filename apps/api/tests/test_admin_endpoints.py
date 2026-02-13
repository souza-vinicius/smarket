"""
Integration tests for Admin endpoints.

Tests RBAC, soft delete, impersonation, and security features.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.models.audit_log import AuditLog
from src.utils.security import create_access_token


@pytest.fixture
async def super_admin(db_session: AsyncSession) -> User:
    """Create a super admin user."""
    user = User(
        id=uuid4(),
        email="superadmin@example.com",
        full_name="Super Admin",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="super_admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user."""
    user = User(
        id=uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def support_user(db_session: AsyncSession) -> User:
    """Create a support user."""
    user = User(
        id=uuid4(),
        email="support@example.com",
        full_name="Support User",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="support",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def finance_user(db_session: AsyncSession) -> User:
    """Create a finance user."""
    user = User(
        id=uuid4(),
        email="finance@example.com",
        full_name="Finance User",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="finance",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def read_only_user(db_session: AsyncSession) -> User:
    """Create a read-only admin user."""
    user = User(
        id=uuid4(),
        email="readonly@example.com",
        full_name="Read Only User",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="read_only",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def regular_user(db_session: AsyncSession) -> User:
    """Create a regular (non-admin) user."""
    user = User(
        id=uuid4(),
        email="regular@example.com",
        full_name="Regular User",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(super_admin: User) -> dict:
    """Create authorization headers for super admin."""
    token = create_access_token(data={"sub": str(super_admin.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user: User) -> dict:
    """Create authorization headers for admin."""
    token = create_access_token(data={"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def support_headers(support_user: User) -> dict:
    """Create authorization headers for support."""
    token = create_access_token(data={"sub": str(support_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def finance_headers(finance_user: User) -> dict:
    """Create authorization headers for finance."""
    token = create_access_token(data={"sub": str(finance_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def readonly_headers(read_only_user: User) -> dict:
    """Create authorization headers for read-only."""
    token = create_access_token(data={"sub": str(read_only_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def regular_headers(regular_user: User) -> dict:
    """Create authorization headers for regular user."""
    token = create_access_token(data={"sub": str(regular_user.id)})
    return {"Authorization": f"Bearer {token}"}


class TestAdminAuthentication:
    """Tests for admin authentication and authorization."""

    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_admin(
        self, client: AsyncClient, regular_headers: dict
    ):
        """Test that non-admin users cannot access admin endpoints."""
        response = await client.get(
            "/api/v1/admin/",
            headers=regular_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_access_admin(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that admin users can access admin endpoints."""
        response = await client.get(
            "/api/v1/admin/",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_access_admin(
        self, client: AsyncClient
    ):
        """Test that unauthenticated requests are rejected."""
        response = await client.get("/api/v1/admin/")
        assert response.status_code == 401


class TestNativePlatformBlocking:
    """Tests for native platform blocking on admin endpoints."""

    @pytest.mark.asyncio
    async def test_ios_platform_blocked(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that iOS platform is blocked from admin."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**auth_headers, "X-Platform": "ios"},
        )
        assert response.status_code == 403
        data = response.json()
        assert "navegador" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_android_platform_blocked(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that Android platform is blocked from admin."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**auth_headers, "X-Platform": "android"},
        )
        assert response.status_code == 403
        data = response.json()
        assert "navegador" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_web_platform_allowed(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that web platform is allowed."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**auth_headers, "X-Platform": "web"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_no_platform_header_allowed(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that requests without platform header are allowed."""
        response = await client.get(
            "/api/v1/admin/",
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestRBACPermissions:
    """Tests for Role-Based Access Control."""

    @pytest.mark.asyncio
    async def test_super_admin_has_full_access(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test that super admin can access all endpoints."""
        endpoints = [
            "/api/v1/admin/",
            "/api/v1/admin/users",
            "/api/v1/admin/subscriptions",
            "/api/v1/admin/payments",
            "/api/v1/admin/coupons",
            "/api/v1/admin/settings",
            "/api/v1/admin/audit-logs",
        ]

        for endpoint in endpoints:
            response = await client.get(endpoint, headers=auth_headers)
            assert response.status_code in [200, 404], f"Failed for {endpoint}"

    @pytest.mark.asyncio
    async def test_support_can_read_users(
        self, client: AsyncClient, support_headers: dict
    ):
        """Test that support role can read users."""
        response = await client.get(
            "/api/v1/admin/users",
            headers=support_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_support_cannot_delete_users(
        self,
        client: AsyncClient,
        support_headers: dict,
        regular_user: User,
    ):
        """Test that support role cannot delete users."""
        response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=support_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_support_can_impersonate(
        self,
        client: AsyncClient,
        support_headers: dict,
        regular_user: User,
    ):
        """Test that support role can impersonate users."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=support_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_finance_can_read_payments(
        self, client: AsyncClient, finance_headers: dict
    ):
        """Test that finance role can read payments."""
        response = await client.get(
            "/api/v1/admin/payments",
            headers=finance_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_finance_can_access_audit_logs(
        self, client: AsyncClient, finance_headers: dict
    ):
        """Test that finance role can access audit logs."""
        response = await client.get(
            "/api/v1/admin/audit-logs",
            headers=finance_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_read_only_can_read(
        self, client: AsyncClient, readonly_headers: dict
    ):
        """Test that read-only role can read."""
        response = await client.get(
            "/api/v1/admin/users",
            headers=readonly_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_read_only_cannot_write(
        self,
        client: AsyncClient,
        readonly_headers: dict,
        regular_user: User,
    ):
        """Test that read-only role cannot write."""
        response = await client.put(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=readonly_headers,
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 403


class TestSoftDelete:
    """Tests for soft delete functionality."""

    @pytest.mark.asyncio
    async def test_soft_delete_user(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test that deleting a user sets deleted_at instead of removing."""
        response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Verify user still exists in database
        from sqlalchemy import select

        result = await db_session.execute(
            select(User).where(User.id == regular_user.id)
        )
        user = result.scalar_one_or_none()

        assert user is not None
        assert user.deleted_at is not None
        assert user.is_active is False

    @pytest.mark.asyncio
    async def test_soft_deleted_user_excluded_from_lists(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test that soft-deleted users are excluded from normal lists."""
        # Soft delete the user
        regular_user.deleted_at = datetime.utcnow()
        regular_user.is_active = False
        await db_session.commit()

        response = await client.get(
            "/api/v1/admin/users",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()

        # User should not appear in default list
        user_ids = [u["id"] for u in data.get("items", [])]
        assert str(regular_user.id) not in user_ids

    @pytest.mark.asyncio
    async def test_restore_soft_deleted_user(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test restoring a soft-deleted user."""
        # First soft delete
        regular_user.deleted_at = datetime.utcnow()
        regular_user.is_active = False
        await db_session.commit()

        # Then restore
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/restore",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify user is restored
        await db_session.refresh(regular_user)
        assert regular_user.deleted_at is None
        assert regular_user.is_active is True


class TestImpersonation:
    """Tests for user impersonation functionality."""

    @pytest.mark.asyncio
    async def test_impersonate_creates_token(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
    ):
        """Test that impersonation creates a valid token."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_impersonate_creates_audit_log(
        self,
        client: AsyncClient,
        auth_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test that impersonation creates an audit log entry."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "impersonate")
            .where(AuditLog.admin_user_id == super_admin.id)
            .where(AuditLog.resource_id == regular_user.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.resource_type == "user"

    @pytest.mark.asyncio
    async def test_impersonate_includes_claim(
        self,
        client: AsyncClient,
        auth_headers: dict,
        super_admin: User,
        regular_user: User,
    ):
        """Test that impersonation token includes impersonated_by claim."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()

        # Decode token to verify claim
        import jwt
        from src.config import settings

        payload = jwt.decode(
            data["access_token"],
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        assert "impersonated_by" in payload
        assert payload["impersonated_by"] == str(super_admin.id)


class TestAuditLogging:
    """Tests for audit logging functionality."""

    @pytest.mark.asyncio
    async def test_update_creates_audit_log(
        self,
        client: AsyncClient,
        auth_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test that updating a user creates an audit log."""
        response = await client.put(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=auth_headers,
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 200

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "update")
            .where(AuditLog.admin_user_id == super_admin.id)
            .where(AuditLog.resource_id == regular_user.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.resource_type == "user"
        assert audit_log.old_values is not None
        assert audit_log.new_values is not None

    @pytest.mark.asyncio
    async def test_delete_creates_audit_log(
        self,
        client: AsyncClient,
        auth_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Test that deleting a user creates an audit log."""
        response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "delete")
            .where(AuditLog.admin_user_id == super_admin.id)
            .where(AuditLog.resource_id == regular_user.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.resource_type == "user"


class TestDashboardEndpoints:
    """Tests for dashboard endpoints."""

    @pytest.mark.asyncio
    async def test_dashboard_stats(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test dashboard stats endpoint."""
        response = await client.get(
            "/api/v1/admin/dashboard/stats",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()

        # Check required fields
        assert "total_users" in data
        assert "active_users" in data
        assert "mrr" in data
        assert "churn_rate" in data

    @pytest.mark.asyncio
    async def test_revenue_chart(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test revenue chart endpoint."""
        response = await client.get(
            "/api/v1/admin/dashboard/revenue",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_growth_chart(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test growth chart endpoint."""
        response = await client.get(
            "/api/v1/admin/dashboard/growth",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestUserEndpoints:
    """Tests for user management endpoints."""

    @pytest.mark.asyncio
    async def test_list_users(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing users."""
        response = await client.get(
            "/api/v1/admin/users",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)

    @pytest.mark.asyncio
    async def test_list_users_with_filters(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing users with filters."""
        response = await client.get(
            "/api/v1/admin/users?is_active=true&search=test",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_user_detail(
        self,
        client: AsyncClient,
        auth_headers: dict,
        regular_user: User,
    ):
        """Test getting user details."""
        response = await client.get(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(regular_user.id)
        assert data["email"] == regular_user.email


class TestSubscriptionEndpoints:
    """Tests for subscription management endpoints."""

    @pytest.mark.asyncio
    async def test_list_subscriptions(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing subscriptions."""
        response = await client.get(
            "/api/v1/admin/subscriptions",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_subscriptions_with_filters(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing subscriptions with filters."""
        response = await client.get(
            "/api/v1/admin/subscriptions?status=active&plan=basic",
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestPaymentEndpoints:
    """Tests for payment management endpoints."""

    @pytest.mark.asyncio
    async def test_list_payments(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing payments."""
        response = await client.get(
            "/api/v1/admin/payments",
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestCouponEndpoints:
    """Tests for coupon management endpoints."""

    @pytest.mark.asyncio
    async def test_list_coupons(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing coupons."""
        response = await client.get(
            "/api/v1/admin/coupons",
            headers=auth_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_create_coupon(
        self, client: AsyncClient, auth_headers: dict, super_admin: User
    ):
        """Test creating a coupon."""
        response = await client.post(
            "/api/v1/admin/coupons",
            headers=auth_headers,
            json={
                "code": "TESTCOUPON",
                "description": "Test coupon",
                "discount_type": "percentage",
                "discount_value": 10.0,
                "valid_from": datetime.utcnow().isoformat(),
                "valid_until": (
                    datetime.utcnow() + timedelta(days=30)
                ).isoformat(),
            },
        )
        assert response.status_code in [200, 201]


class TestReportEndpoints:
    """Tests for report endpoints."""

    @pytest.mark.asyncio
    async def test_churn_report(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test churn report endpoint."""
        response = await client.get(
            "/api/v1/admin/reports/churn",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "timeline" in data

    @pytest.mark.asyncio
    async def test_conversion_report(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test conversion report endpoint."""
        response = await client.get(
            "/api/v1/admin/reports/conversion",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "funnel" in data

    @pytest.mark.asyncio
    async def test_mrr_report(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test MRR report endpoint."""
        response = await client.get(
            "/api/v1/admin/reports/mrr",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "breakdown" in data

    @pytest.mark.asyncio
    async def test_export_users_csv(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test users CSV export."""
        response = await client.get(
            "/api/v1/admin/reports/export/users",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_export_creates_audit_log(
        self,
        client: AsyncClient,
        auth_headers: dict,
        super_admin: User,
        db_session: AsyncSession,
    ):
        """Test that CSV export creates audit log."""
        await client.get(
            "/api/v1/admin/reports/export/users",
            headers=auth_headers,
        )

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "export")
            .where(AuditLog.admin_user_id == super_admin.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
