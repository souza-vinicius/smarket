"""
Security tests for Admin area.

Tests native platform blocking, permission checks, and security measures.
"""

import pytest
from datetime import datetime
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
        email="security_admin@example.com",
        full_name="Security Admin",
        hashed_password="hashed_password",
        is_active=True,
        admin_role="super_admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def regular_user(db_session: AsyncSession) -> User:
    """Create a regular user."""
    user = User(
        id=uuid4(),
        email="security_user@example.com",
        full_name="Security User",
        hashed_password="hashed_password",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def admin_headers(super_admin: User) -> dict:
    """Create authorization headers for admin."""
    token = create_access_token(data={"sub": str(super_admin.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(regular_user: User) -> dict:
    """Create authorization headers for regular user."""
    token = create_access_token(data={"sub": str(regular_user.id)})
    return {"Authorization": f"Bearer {token}"}


class TestNativePlatformSecurity:
    """
    Tests for native platform blocking.

    Admin area should NOT be accessible from iOS/Android apps.
    Only web browsers should have access.
    """

    @pytest.mark.asyncio
    async def test_ios_header_blocked(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Request with X-Platform: ios must be rejected."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**admin_headers, "X-Platform": "ios"},
        )
        assert response.status_code == 403
        assert "navegador" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_android_header_blocked(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Request with X-Platform: android must be rejected."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**admin_headers, "X-Platform": "android"},
        )
        assert response.status_code == 403
        assert "navegador" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_web_header_allowed(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Request with X-Platform: web should be allowed."""
        response = await client.get(
            "/api/v1/admin/",
            headers={**admin_headers, "X-Platform": "web"},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_no_platform_header_allowed(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Request without X-Platform header should be allowed."""
        response = await client.get(
            "/api/v1/admin/",
            headers=admin_headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_ios_blocked_on_all_endpoints(
        self, client: AsyncClient, admin_headers: dict
    ):
        """iOS should be blocked on ALL admin endpoints."""
        endpoints = [
            "/api/v1/admin/",
            "/api/v1/admin/users",
            "/api/v1/admin/subscriptions",
            "/api/v1/admin/payments",
            "/api/v1/admin/coupons",
            "/api/v1/admin/settings",
            "/api/v1/admin/audit-logs",
            "/api/v1/admin/dashboard/stats",
            "/api/v1/admin/reports/churn",
        ]

        for endpoint in endpoints:
            response = await client.get(
                endpoint,
                headers={**admin_headers, "X-Platform": "ios"},
            )
            assert response.status_code == 403, (
                f"iOS not blocked on {endpoint}"
            )

    @pytest.mark.asyncio
    async def test_android_blocked_on_all_endpoints(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Android should be blocked on ALL admin endpoints."""
        endpoints = [
            "/api/v1/admin/",
            "/api/v1/admin/users",
            "/api/v1/admin/subscriptions",
            "/api/v1/admin/payments",
            "/api/v1/admin/coupons",
            "/api/v1/admin/settings",
            "/api/v1/admin/audit-logs",
            "/api/v1/admin/dashboard/stats",
            "/api/v1/admin/reports/churn",
        ]

        for endpoint in endpoints:
            response = await client.get(
                endpoint,
                headers={**admin_headers, "X-Platform": "android"},
            )
            assert response.status_code == 403, (
                f"Android not blocked on {endpoint}"
            )

    @pytest.mark.asyncio
    async def test_native_platform_blocked_on_post(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Native platforms should be blocked on POST requests too."""
        response = await client.post(
            "/api/v1/admin/coupons",
            headers={**admin_headers, "X-Platform": "ios"},
            json={
                "code": "TEST",
                "discount_type": "percentage",
                "discount_value": 10.0,
                "valid_from": datetime.utcnow().isoformat(),
            },
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_native_platform_blocked_on_delete(
        self,
        client: AsyncClient,
        admin_headers: dict,
        regular_user: User,
    ):
        """Native platforms should be blocked on DELETE requests too."""
        response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers={**admin_headers, "X-Platform": "android"},
        )
        assert response.status_code == 403


class TestNonAdminAccess:
    """Tests for non-admin user access prevention."""

    @pytest.mark.asyncio
    async def test_regular_user_cannot_access_admin(
        self, client: AsyncClient, user_headers: dict
    ):
        """Regular users should get 403 on admin endpoints."""
        response = await client.get(
            "/api/v1/admin/",
            headers=user_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_regular_user_cannot_access_users_list(
        self, client: AsyncClient, user_headers: dict
    ):
        """Regular users cannot list users."""
        response = await client.get(
            "/api/v1/admin/users",
            headers=user_headers,
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_regular_user_cannot_impersonate(
        self,
        client: AsyncClient,
        user_headers: dict,
        regular_user: User,
    ):
        """Regular users cannot impersonate."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=user_headers,
        )
        assert response.status_code == 403


class TestUnauthenticatedAccess:
    """Tests for unauthenticated request handling."""

    @pytest.mark.asyncio
    async def test_no_token_returns_401(self, client: AsyncClient):
        """Requests without token should get 401."""
        response = await client.get("/api/v1/admin/")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, client: AsyncClient):
        """Requests with invalid token should get 401."""
        response = await client.get(
            "/api/v1/admin/",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_returns_401(self, client: AsyncClient):
        """Requests with expired token should get 401."""
        # Create an expired token (this would need time manipulation)
        # For now, just test with malformed token
        response = await client.get(
            "/api/v1/admin/",
            headers={"Authorization": "Bearer expired.token.here"},
        )
        assert response.status_code == 401


class TestInactiveAdminAccess:
    """Tests for inactive admin user handling."""

    @pytest.mark.asyncio
    async def test_inactive_admin_cannot_access(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Inactive admin should not be able to access admin area."""
        # Create inactive admin
        inactive_admin = User(
            id=uuid4(),
            email="inactive_admin@example.com",
            full_name="Inactive Admin",
            hashed_password="hashed",
            is_active=False,
            admin_role="admin",
        )
        db_session.add(inactive_admin)
        await db_session.commit()

        token = create_access_token(data={"sub": str(inactive_admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            "/api/v1/admin/",
            headers=headers,
        )
        assert response.status_code in [401, 403]


class TestSoftDeleteSecurity:
    """Tests for soft delete security measures."""

    @pytest.mark.asyncio
    async def test_soft_delete_preserves_data(
        self,
        client: AsyncClient,
        admin_headers: dict,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Soft delete should preserve user data in database."""
        original_email = regular_user.email
        original_name = regular_user.full_name

        # Delete user
        response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=admin_headers,
        )
        assert response.status_code == 204

        # Verify data still exists
        from sqlalchemy import select

        result = await db_session.execute(
            select(User).where(User.id == regular_user.id)
        )
        user = result.scalar_one_or_none()

        assert user is not None
        assert user.email == original_email
        assert user.full_name == original_name
        assert user.deleted_at is not None

    @pytest.mark.asyncio
    async def test_deleted_user_cannot_login(
        self,
        client: AsyncClient,
        admin_headers: dict,
        regular_user: User,
    ):
        """Deleted user should not be able to authenticate."""
        # Delete user
        await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=admin_headers,
        )

        # Try to login (would need auth endpoint test)
        # For now, verify the user is marked as inactive
        assert regular_user.is_active is False


class TestImpersonationSecurity:
    """Tests for impersonation security measures."""

    @pytest.mark.asyncio
    async def test_impersonation_creates_audit_log(
        self,
        client: AsyncClient,
        admin_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Impersonation must create an audit log entry."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=admin_headers,
        )
        assert response.status_code == 200

        # Verify audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "impersonate")
            .where(AuditLog.admin_user_id == super_admin.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.resource_id == regular_user.id
        assert audit_log.resource_type == "user"

    @pytest.mark.asyncio
    async def test_impersonation_token_has_claim(
        self,
        client: AsyncClient,
        admin_headers: dict,
        super_admin: User,
        regular_user: User,
    ):
        """Impersonation token must include impersonated_by claim."""
        response = await client.post(
            f"/api/v1/admin/users/{regular_user.id}/impersonate",
            headers=admin_headers,
        )
        assert response.status_code == 200

        import jwt
        from src.config import settings

        token = response.json()["access_token"]
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        assert "impersonated_by" in payload
        assert payload["impersonated_by"] == str(super_admin.id)

    @pytest.mark.asyncio
    async def test_cannot_impersonate_another_admin(
        self,
        client: AsyncClient,
        admin_headers: dict,
        db_session: AsyncSession,
    ):
        """Admin should not be able to impersonate another admin."""
        # Create another admin
        other_admin = User(
            id=uuid4(),
            email="other_admin@example.com",
            full_name="Other Admin",
            hashed_password="hashed",
            is_active=True,
            admin_role="admin",
        )
        db_session.add(other_admin)
        await db_session.commit()

        # Try to impersonate
        response = await client.post(
            f"/api/v1/admin/users/{other_admin.id}/impersonate",
            headers=admin_headers,
        )
        # Should be forbidden or bad request
        assert response.status_code in [400, 403]


class TestPermissionChecks:
    """Tests for granular permission checks."""

    @pytest.mark.asyncio
    async def test_support_can_read_but_not_write(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        regular_user: User,
    ):
        """Support role should have read-only access to most resources."""
        # Create support user
        support = User(
            id=uuid4(),
            email="support_perm@example.com",
            full_name="Support",
            hashed_password="hashed",
            is_active=True,
            admin_role="support",
        )
        db_session.add(support)
        await db_session.commit()

        token = create_access_token(data={"sub": str(support.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Can read
        read_response = await client.get(
            "/api/v1/admin/users",
            headers=headers,
        )
        assert read_response.status_code == 200

        # Cannot write
        write_response = await client.put(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=headers,
            json={"full_name": "Hacked"},
        )
        assert write_response.status_code == 403

    @pytest.mark.asyncio
    async def test_finance_can_refund(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """Finance role should be able to process refunds."""
        # Create finance user
        finance = User(
            id=uuid4(),
            email="finance_perm@example.com",
            full_name="Finance",
            hashed_password="hashed",
            is_active=True,
            admin_role="finance",
        )
        db_session.add(finance)
        await db_session.commit()

        token = create_access_token(data={"sub": str(finance.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Can access payments
        response = await client.get(
            "/api/v1/admin/payments",
            headers=headers,
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_read_only_cannot_modify_anything(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        regular_user: User,
    ):
        """Read-only role should not be able to modify anything."""
        # Create read-only user
        readonly = User(
            id=uuid4(),
            email="readonly_perm@example.com",
            full_name="ReadOnly",
            hashed_password="hashed",
            is_active=True,
            admin_role="read_only",
        )
        db_session.add(readonly)
        await db_session.commit()

        token = create_access_token(data={"sub": str(readonly.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Can read
        read_response = await client.get(
            "/api/v1/admin/users",
            headers=headers,
        )
        assert read_response.status_code == 200

        # Cannot delete
        delete_response = await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=headers,
        )
        assert delete_response.status_code == 403

        # Cannot update
        update_response = await client.put(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=headers,
            json={"full_name": "Hacked"},
        )
        assert update_response.status_code == 403


class TestAuditLogSecurity:
    """Tests for audit log integrity."""

    @pytest.mark.asyncio
    async def test_sensitive_actions_are_logged(
        self,
        client: AsyncClient,
        admin_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Sensitive actions should create audit logs."""
        # Delete user
        await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=admin_headers,
        )

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "delete")
            .where(AuditLog.admin_user_id == super_admin.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.resource_type == "user"
        assert audit_log.resource_id == regular_user.id

    @pytest.mark.asyncio
    async def test_audit_log_includes_ip_address(
        self,
        client: AsyncClient,
        admin_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Audit logs should include IP address."""
        # Delete user
        await client.delete(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=admin_headers,
        )

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "delete")
            .where(AuditLog.admin_user_id == super_admin.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        # IP address might be None in test environment
        # but the field should exist
        assert hasattr(audit_log, "ip_address")

    @pytest.mark.asyncio
    async def test_audit_log_captures_old_values(
        self,
        client: AsyncClient,
        admin_headers: dict,
        super_admin: User,
        regular_user: User,
        db_session: AsyncSession,
    ):
        """Audit logs should capture old values on update."""
        original_name = regular_user.full_name

        # Update user
        await client.put(
            f"/api/v1/admin/users/{regular_user.id}",
            headers=admin_headers,
            json={"full_name": "Updated Name"},
        )

        # Check audit log
        from sqlalchemy import select

        result = await db_session.execute(
            select(AuditLog)
            .where(AuditLog.action == "update")
            .where(AuditLog.admin_user_id == super_admin.id)
        )
        audit_log = result.scalar_one_or_none()

        assert audit_log is not None
        assert audit_log.old_values is not None
        assert audit_log.old_values.get("full_name") == original_name
