"""
Common utilities for admin routers.
"""

import structlog
from fastapi import HTTPException, Request, status

logger = structlog.get_logger()


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
