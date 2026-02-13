"""
Public coupon validation endpoint.
"""

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.coupon import CouponValidateRequest, CouponValidateResponse
from src.services.coupon_service import CouponService

logger = structlog.get_logger()

coupons_router = APIRouter(prefix="/coupons", tags=["coupons"])


@coupons_router.post("/validate")
async def validate_coupon(
    data: CouponValidateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CouponValidateResponse:
    """
    Validate a coupon for checkout.

    Public endpoint (requires authentication) for users to validate
    coupons before completing checkout.
    """
    service = CouponService(db)
    result = await service.validate_coupon(user, data)

    return result
