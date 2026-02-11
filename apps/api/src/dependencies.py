import uuid
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models.user import User
from src.utils.security import decode_token


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    token_type: Optional[str] = payload.get("type")

    if user_id is None or token_type != "access":
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    # Query user from database
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive"
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(lambda: None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Get current user if token is provided, otherwise return None."""
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# Subscription-related dependencies


async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's subscription (auto-creates free tier if missing)."""
    from src.config import settings

    if not settings.subscription_enabled:
        return None  # Feature disabled - everything allowed

    from datetime import datetime, timedelta

    from sqlalchemy import select

    from src.models.subscription import Subscription, SubscriptionPlan

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        # Auto-create a free subscription with expired trial
        # Use naive UTC datetimes (DB columns are TIMESTAMP WITHOUT TIME ZONE)
        now = datetime.utcnow()
        sub = Subscription(
            user_id=current_user.id,
            plan=SubscriptionPlan.FREE.value,
            status="expired",
            trial_start=now - timedelta(days=31),
            trial_end=now - timedelta(days=1),
            created_at=now,
            updated_at=now,
        )
        db.add(sub)
        await db.flush()

    return sub


async def check_invoice_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Check if user can create more invoices this month."""
    from datetime import datetime, timezone

    from sqlalchemy import select

    from src.config import settings
    from src.models.subscription import Subscription
    from src.models.usage_record import UsageRecord

    if not settings.subscription_enabled:
        return current_user

    sub = await _get_active_subscription(current_user.id, db)

    # Check limit (None = unlimited, applies to Premium and Trial)
    limit = sub.invoice_limit
    if limit is None:
        return current_user  # unlimited (Premium or Trial)

    now = datetime.now(timezone.utc)
    usage = await _get_or_create_usage(current_user.id, now.year, now.month, db)

    if usage.invoices_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Limite de {limit} notas fiscais/mês atingido. Faça upgrade para continuar.",
            headers={
                "X-Subscription-Error": "invoice_limit_reached",
                "X-Limit-Type": "invoice",
                "X-Current-Plan": sub.plan,
            },
        )

    return current_user


async def check_analysis_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Check if user can request more AI analyses this month."""
    from datetime import datetime, timezone

    from sqlalchemy import select

    from src.config import settings
    from src.models.subscription import Subscription
    from src.models.usage_record import UsageRecord

    if not settings.subscription_enabled:
        return current_user

    sub = await _get_active_subscription(current_user.id, db)

    # Check limit (None = unlimited, applies to Premium and Trial)
    limit = sub.analysis_limit
    if limit is None:
        return current_user  # unlimited (Premium or Trial)

    now = datetime.now(timezone.utc)
    usage = await _get_or_create_usage(current_user.id, now.year, now.month, db)

    if usage.ai_analyses_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Limite de {limit} análises de IA/mês atingido. Faça upgrade para continuar.",
            headers={
                "X-Subscription-Error": "analysis_limit_reached",
                "X-Limit-Type": "analysis",
                "X-Current-Plan": sub.plan,
            },
        )

    return current_user


# Private helpers


async def _get_active_subscription(user_id: uuid.UUID, db: AsyncSession):
    """Get subscription with limit enforcement.

    Free-tier users (expired trial) are allowed through so that
    the caller can enforce per-plan limits (1 invoice/month, 2 analyses/month).
    Only paid plans that become inactive are blocked with 402.
    If no subscription record exists, a free-tier one is auto-created.
    """
    from datetime import datetime, timedelta

    from sqlalchemy import select

    from src.models.subscription import Subscription, SubscriptionPlan

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        # Auto-create a free subscription with expired trial
        # Use naive UTC datetimes (DB columns are TIMESTAMP WITHOUT TIME ZONE)
        now = datetime.utcnow()
        sub = Subscription(
            user_id=user_id,
            plan=SubscriptionPlan.FREE.value,
            status="expired",
            trial_start=now - timedelta(days=31),
            trial_end=now - timedelta(days=1),
            created_at=now,
            updated_at=now,
        )
        db.add(sub)
        await db.flush()
        return sub

    if not sub.is_active:
        # Free plan with expired trial: allow through (limits enforced by caller)
        if sub.plan == SubscriptionPlan.FREE.value:
            return sub

        # Paid plans that became inactive: block with 402
        if sub.status == "expired":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Seu trial expirou. Faça upgrade para continuar.",
                headers={"X-Subscription-Error": "trial_expired"},
            )
        elif sub.status in ["cancelled", "past_due"]:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Assinatura {sub.status}. Reative para continuar.",
                headers={"X-Subscription-Error": "subscription_inactive"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Assinatura inativa. Entre em contato com o suporte.",
                headers={"X-Subscription-Error": "subscription_inactive"},
            )

    return sub


async def _get_or_create_usage(
    user_id: uuid.UUID, year: int, month: int, db: AsyncSession
):
    """Get or create usage record for user/year/month."""
    from sqlalchemy import select

    from src.models.usage_record import UsageRecord

    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.year == year,
            UsageRecord.month == month,
        )
    )
    usage = result.scalar_one_or_none()
    if not usage:
        usage = UsageRecord(user_id=user_id, year=year, month=month)
        db.add(usage)
        await db.flush()
    return usage
