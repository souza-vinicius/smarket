"""
Admin area router with RBAC middleware.

All admin routes require authentication and admin privileges.
Native platform (iOS/Android) access is blocked for security.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.dependencies import get_current_admin
from src.models.user import User

logger = structlog.get_logger()

# Base admin router
admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],  # All routes require admin
)


async def validate_platform(request: Request):
    """
    Middleware to block native platform access to admin area.

    Admin area is web-only. Reject requests from iOS/Android apps.
    """
    platform = request.headers.get("x-platform", "web").lower()

    if platform in ("ios", "android"):
        logger.warning(
            "Admin access attempt from native platform blocked",
            platform=platform,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Área administrativa disponível apenas via navegador web.",
            headers={"X-Admin-Error": "native_platform_blocked"},
        )


# Apply platform validation to all admin routes
admin_router.dependencies.append(Depends(validate_platform))


# Placeholder for dashboard endpoint (will be implemented in Delivery 2)
@admin_router.get("/")
async def admin_root(admin: User = Depends(get_current_admin)):
    """Admin area root - basic info."""
    return {
        "message": "Admin area",
        "admin": {
            "id": str(admin.id),
            "email": admin.email,
            "role": admin.admin_role,
        },
    }
