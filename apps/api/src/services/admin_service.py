"""
Admin service for user management and administrative operations.

Provides business logic for admin operations with audit logging.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

import structlog
from fastapi import HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.roles import AdminRole
from src.models.audit_log import AuditLog
from src.models.subscription import Subscription
from src.models.user import User
from src.schemas.admin import AdminUserUpdate
from src.utils.security import create_access_token

logger = structlog.get_logger()


class AdminService:
    """Service for administrative operations."""

    def __init__(self, db: AsyncSession, admin: User, request: Optional[Request] = None):
        self.db = db
        self.admin = admin
        self.request = request

    async def soft_delete_user(self, user_id: uuid.UUID) -> dict:
        """
        Soft delete a user (set deleted_at and is_active=False).

        Args:
            user_id: UUID of user to delete

        Returns:
            Success message dict

        Raises:
            HTTPException: If user not found or is another admin
        """
        # Prevent self-deletion
        if user_id == self.admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode desativar sua própria conta.",
            )

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado.",
            )

        # Prevent deleting another admin (super_admin can delete other admins)
        if user.is_admin and self.admin.admin_role != AdminRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas super_admin pode desativar outras contas administrativas.",
            )

        # Capture old values for audit
        old_values = {
            "is_active": user.is_active,
            "deleted_at": user.deleted_at.isoformat() if user.deleted_at else None,
        }

        # Perform soft delete
        user.is_active = False
        user.deleted_at = datetime.utcnow()
        await self.db.commit()

        # Create audit log
        await self.create_audit_log(
            action="delete",
            resource_type="user",
            resource_id=user_id,
            old_values=old_values,
            new_values={
                "is_active": False,
                "deleted_at": user.deleted_at.isoformat(),
            },
        )

        logger.info(
            "User soft deleted by admin",
            admin_id=str(self.admin.id),
            admin_email=self.admin.email,
            user_id=str(user_id),
            user_email=user.email,
        )

        return {"message": "Usuário desativado com sucesso."}

    async def restore_user(self, user_id: uuid.UUID) -> dict:
        """
        Restore a soft-deleted user.

        Args:
            user_id: UUID of user to restore

        Returns:
            Success message dict
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado.",
            )

        if user.deleted_at is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário já está ativo.",
            )

        # Capture old values for audit
        old_values = {
            "is_active": user.is_active,
            "deleted_at": user.deleted_at.isoformat() if user.deleted_at else None,
        }

        # Restore user
        user.is_active = True
        user.deleted_at = None
        await self.db.commit()

        # Create audit log
        await self.create_audit_log(
            action="restore",
            resource_type="user",
            resource_id=user_id,
            old_values=old_values,
            new_values={"is_active": True, "deleted_at": None},
        )

        logger.info(
            "User restored by admin",
            admin_id=str(self.admin.id),
            admin_email=self.admin.email,
            user_id=str(user_id),
            user_email=user.email,
        )

        return {"message": "Usuário reativado com sucesso."}

    async def update_user(
        self, user_id: uuid.UUID, data: AdminUserUpdate
    ) -> dict:
        """
        Update user fields with audit logging.

        Args:
            user_id: UUID of user to update
            data: Update data

        Returns:
            Success message dict
        """
        # Prevent modifying own admin_role
        if data.admin_role is not None and user_id == self.admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode alterar sua própria função administrativa.",
            )

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado.",
            )

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum campo para atualizar.",
            )

        # Capture old values for audit
        old_values = {}
        for key in update_data.keys():
            old_values[key] = getattr(user, key)
            if hasattr(old_values[key], "value"):  # Handle enums
                old_values[key] = old_values[key].value

        # Convert enum to string value for admin_role
        if "admin_role" in update_data and update_data["admin_role"] is not None:
            update_data["admin_role"] = update_data["admin_role"].value

        # Perform update
        await self.db.execute(
            update(User).where(User.id == user_id).values(**update_data)
        )
        await self.db.commit()

        # Create audit log
        await self.create_audit_log(
            action="update",
            resource_type="user",
            resource_id=user_id,
            old_values=old_values,
            new_values=update_data,
        )

        logger.info(
            "User updated by admin",
            admin_id=str(self.admin.id),
            admin_email=self.admin.email,
            user_id=str(user_id),
            fields=list(update_data.keys()),
        )

        return {"message": "Usuário atualizado com sucesso."}

    async def impersonate_user(self, user_id: uuid.UUID) -> dict:
        """
        Generate impersonation token for a user.

        Creates a short-lived JWT token that allows an admin to act as a user.
        The token includes an 'impersonated_by' claim for audit purposes.

        Args:
            user_id: UUID of user to impersonate

        Returns:
            Dict with access_token and user info
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        target_user = result.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado.",
            )

        # Cannot impersonate another admin
        if target_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Não é possível impersonar outro administrador.",
            )

        # Generate impersonation token (30 minutes)
        token = create_access_token(
            data={
                "sub": str(target_user.id),
                "type": "access",
                "impersonated_by": str(self.admin.id),
            },
            expires_delta=timedelta(minutes=30),
        )

        # Create audit log
        await self.create_audit_log(
            action="impersonate",
            resource_type="user",
            resource_id=user_id,
            new_values={"token_expires": "30m"},
        )

        logger.info(
            "Admin impersonating user",
            admin_id=str(self.admin.id),
            admin_email=self.admin.email,
            target_user_id=str(user_id),
            target_user_email=target_user.email,
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(target_user.id),
                "email": target_user.email,
                "full_name": target_user.full_name,
            },
        }

    async def get_user_activity(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """
        Get audit log activity for a specific user.

        Args:
            user_id: UUID of user to get activity for
            page: Page number
            per_page: Items per page

        Returns:
            Paginated list of audit log entries
        """
        from sqlalchemy import func

        # Count total
        count_query = select(func.count()).where(
            AuditLog.resource_type == "user",
            AuditLog.resource_id == user_id,
        )
        total = (await self.db.execute(count_query)).scalar() or 0

        # Get logs with admin info
        query = (
            select(AuditLog, User.email.label("admin_email"))
            .join(User, AuditLog.admin_user_id == User.id)
            .where(
                AuditLog.resource_type == "user",
                AuditLog.resource_id == user_id,
            )
            .order_by(AuditLog.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        result = await self.db.execute(query)
        rows = result.all()

        logs = []
        for log, admin_email in rows:
            logs.append({
                "id": str(log.id),
                "admin_user_id": str(log.admin_user_id),
                "admin_email": admin_email,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "success": log.success,
                "created_at": log.created_at.isoformat(),
            })

        return {
            "logs": logs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page,
        }

    async def create_audit_log(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[uuid.UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.

        Args:
            action: Action performed (create, update, delete, etc.)
            resource_type: Type of resource affected
            resource_id: UUID of affected resource
            old_values: Previous values (for updates/deletes)
            new_values: New values (for creates/updates)
            success: Whether the action succeeded
            error_message: Error message if action failed

        Returns:
            Created AuditLog entry
        """
        log = AuditLog(
            admin_user_id=self.admin.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            success=success,
            error_message=error_message,
        )

        # Add request metadata if available
        if self.request:
            log.ip_address = self.request.client.host if self.request.client else None
            log.user_agent = self.request.headers.get("user-agent")
            log.request_id = self.request.headers.get("x-request-id")

        self.db.add(log)
        await self.db.commit()

        return log


async def get_admin_service(
    db: AsyncSession,
    admin: User,
    request: Optional[Request] = None,
) -> AdminService:
    """Factory function to create AdminService instance."""
    return AdminService(db, admin, request)
