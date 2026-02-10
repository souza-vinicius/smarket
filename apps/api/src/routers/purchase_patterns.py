import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.purchase_pattern import (
    PurchasePattern,
)
from src.models.user import User


router = APIRouter()


class AlertConfigRequest(BaseModel):
    alert_enabled: bool
    alert_days_before: Optional[int] = None


@router.get("/", response_model=list[dict])
async def list_purchase_patterns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    pattern_type: Optional[str] = None,
    target_type: Optional[str] = None,
    alert_enabled: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all purchase patterns for current user."""
    query = select(PurchasePattern).where(PurchasePattern.user_id == current_user.id)

    if pattern_type:
        query = query.where(PurchasePattern.pattern_type == pattern_type)

    if target_type:
        query = query.where(PurchasePattern.target_type == target_type)

    if alert_enabled is not None:
        query = query.where(PurchasePattern.alert_enabled == alert_enabled)

    query = (
        query.order_by(
            PurchasePattern.confidence_score.desc(),
            PurchasePattern.last_occurrence.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    patterns = result.scalars().all()

    return [
        {
            "id": p.id,
            "pattern_type": p.pattern_type.value if p.pattern_type else None,
            "target_type": p.target_type.value if p.target_type else None,
            "target_id": p.target_id,
            "frequency": p.frequency.value if p.frequency else None,
            "average_interval_days": p.average_interval_days,
            "last_occurrence": p.last_occurrence,
            "next_predicted": p.next_predicted,
            "occurrence_count": p.occurrence_count,
            "confidence_score": p.confidence_score,
            "alert_enabled": p.alert_enabled,
            "alert_days_before": p.alert_days_before,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in patterns
    ]


@router.get("/{pattern_id}", response_model=dict)
async def get_purchase_pattern(
    pattern_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific purchase pattern by ID."""
    result = await db.execute(
        select(PurchasePattern).where(
            and_(
                PurchasePattern.id == pattern_id,
                PurchasePattern.user_id == current_user.id,
            )
        )
    )
    pattern = result.scalar_one_or_none()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Purchase pattern not found"
        )

    return {
        "id": pattern.id,
        "pattern_type": pattern.pattern_type.value if pattern.pattern_type else None,
        "target_type": pattern.target_type.value if pattern.target_type else None,
        "target_id": pattern.target_id,
        "frequency": pattern.frequency.value if pattern.frequency else None,
        "average_interval_days": pattern.average_interval_days,
        "last_occurrence": pattern.last_occurrence,
        "next_predicted": pattern.next_predicted,
        "occurrence_count": pattern.occurrence_count,
        "confidence_score": pattern.confidence_score,
        "alert_enabled": pattern.alert_enabled,
        "alert_days_before": pattern.alert_days_before,
        "notes": pattern.notes,
        "created_at": pattern.created_at,
        "updated_at": pattern.updated_at,
    }


@router.patch("/{pattern_id}/alert", response_model=dict)
async def configure_alert(
    pattern_id: uuid.UUID,
    config: AlertConfigRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Configure alert settings for a purchase pattern."""
    result = await db.execute(
        select(PurchasePattern).where(
            and_(
                PurchasePattern.id == pattern_id,
                PurchasePattern.user_id == current_user.id,
            )
        )
    )
    pattern = result.scalar_one_or_none()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Purchase pattern not found"
        )

    pattern.alert_enabled = config.alert_enabled
    pattern.alert_days_before = config.alert_days_before
    pattern.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(pattern)

    return {
        "id": pattern.id,
        "alert_enabled": pattern.alert_enabled,
        "alert_days_before": pattern.alert_days_before,
        "updated_at": pattern.updated_at,
    }


@router.delete("/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase_pattern(
    pattern_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a purchase pattern."""
    result = await db.execute(
        select(PurchasePattern).where(
            and_(
                PurchasePattern.id == pattern_id,
                PurchasePattern.user_id == current_user.id,
            )
        )
    )
    pattern = result.scalar_one_or_none()

    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Purchase pattern not found"
        )

    await db.delete(pattern)
    await db.commit()
