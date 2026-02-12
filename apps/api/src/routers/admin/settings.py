"""
Admin settings router for feature flags and system configuration.
"""

from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from src.config import settings
from src.core.roles import ROLE_PERMISSIONS, AdminRole, get_role_permissions
from src.dependencies import get_current_admin, require_permission
from src.models.user import User
from src.routers.admin.common import validate_platform

logger = structlog.get_logger()

settings_router = APIRouter(
    prefix="/settings",
    tags=["admin-settings"],
    dependencies=[Depends(get_current_admin), Depends(validate_platform)],
)


class FeatureFlagsUpdate(BaseModel):
    """Update feature flags. Only include flags to change."""

    ENABLE_SUBSCRIPTION_SYSTEM: Optional[bool] = None
    ENABLE_CNPJ_FEATURES: Optional[bool] = None
    ENABLE_CNPJ_VALIDATION: Optional[bool] = None
    ENABLE_CNPJ_ENRICHMENT: Optional[bool] = None
    ENABLE_AI_ANALYSIS: Optional[bool] = None
    IMAGE_OPTIMIZATION_ENABLED: Optional[bool] = None
    IMAGE_MAX_DIMENSION: Optional[int] = None
    IMAGE_JPEG_QUALITY: Optional[int] = None


def _get_feature_flags() -> dict:
    """Read current feature flags from settings."""
    return {
        "subscription": {
            "ENABLE_SUBSCRIPTION_SYSTEM": settings.ENABLE_SUBSCRIPTION_SYSTEM,
            "TRIAL_DURATION_DAYS": settings.TRIAL_DURATION_DAYS,
        },
        "cnpj": {
            "ENABLE_CNPJ_FEATURES": settings.ENABLE_CNPJ_FEATURES,
            "ENABLE_CNPJ_VALIDATION": settings.ENABLE_CNPJ_VALIDATION,
            "ENABLE_CNPJ_ENRICHMENT": settings.ENABLE_CNPJ_ENRICHMENT,
        },
        "ai_analysis": {
            "ENABLE_AI_ANALYSIS": settings.ENABLE_AI_ANALYSIS,
            "ENABLE_ANALYSIS_PRICE_ALERT": settings.ENABLE_ANALYSIS_PRICE_ALERT,
            "ENABLE_ANALYSIS_CATEGORY_INSIGHT": settings.ENABLE_ANALYSIS_CATEGORY_INSIGHT,
            "ENABLE_ANALYSIS_MERCHANT_PATTERN": settings.ENABLE_ANALYSIS_MERCHANT_PATTERN,
            "ENABLE_ANALYSIS_SUMMARY": settings.ENABLE_ANALYSIS_SUMMARY,
            "ENABLE_ANALYSIS_BUDGET_HEALTH": settings.ENABLE_ANALYSIS_BUDGET_HEALTH,
            "ENABLE_ANALYSIS_PER_CAPITA_SPENDING": settings.ENABLE_ANALYSIS_PER_CAPITA_SPENDING,
            "ENABLE_ANALYSIS_ESSENTIAL_RATIO": settings.ENABLE_ANALYSIS_ESSENTIAL_RATIO,
            "ENABLE_ANALYSIS_INCOME_COMMITMENT": settings.ENABLE_ANALYSIS_INCOME_COMMITMENT,
            "ENABLE_ANALYSIS_CHILDREN_SPENDING": settings.ENABLE_ANALYSIS_CHILDREN_SPENDING,
            "ENABLE_ANALYSIS_WHOLESALE_OPPORTUNITY": settings.ENABLE_ANALYSIS_WHOLESALE_OPPORTUNITY,
            "ENABLE_ANALYSIS_SHOPPING_FREQUENCY": settings.ENABLE_ANALYSIS_SHOPPING_FREQUENCY,
            "ENABLE_ANALYSIS_SEASONAL_ALERT": settings.ENABLE_ANALYSIS_SEASONAL_ALERT,
            "ENABLE_ANALYSIS_SAVINGS_POTENTIAL": settings.ENABLE_ANALYSIS_SAVINGS_POTENTIAL,
            "ENABLE_ANALYSIS_FAMILY_NUTRITION": settings.ENABLE_ANALYSIS_FAMILY_NUTRITION,
        },
        "image_optimization": {
            "IMAGE_OPTIMIZATION_ENABLED": settings.IMAGE_OPTIMIZATION_ENABLED,
            "IMAGE_MAX_DIMENSION": settings.IMAGE_MAX_DIMENSION,
            "IMAGE_JPEG_QUALITY": settings.IMAGE_JPEG_QUALITY,
        },
        "providers": {
            "openrouter_configured": bool(settings.OPENROUTER_API_KEY),
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "openai_configured": bool(settings.OPENAI_API_KEY),
            "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
            "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
            "redis_url": settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else settings.REDIS_URL,
        },
    }


@settings_router.get(
    "/",
    dependencies=[Depends(require_permission("settings:read"))],
)
async def get_settings():
    """Get current system configuration and feature flags."""
    return {
        "feature_flags": _get_feature_flags(),
    }


@settings_router.put(
    "/feature-flags",
    dependencies=[Depends(require_permission("settings:update"))],
)
async def update_feature_flags(
    request: Request,
    data: FeatureFlagsUpdate,
    admin: User = Depends(get_current_admin),
):
    """
    Update feature flags at runtime.

    Changes are applied immediately but do NOT persist across restarts.
    To make permanent, also update the .env file.
    """
    changes = {}
    for field_name, value in data.model_dump(exclude_none=True).items():
        old_value = getattr(settings, field_name, None)
        if old_value != value:
            setattr(settings, field_name, value)
            changes[field_name] = {"old": old_value, "new": value}

    if not changes:
        return {"message": "Nenhuma alteracao detectada.", "changes": {}}

    logger.info(
        "Feature flags updated by admin",
        admin_email=admin.email,
        changes=changes,
    )

    return {
        "message": f"{len(changes)} flag(s) atualizada(s). Alteracoes sao temporarias ate o proximo restart.",
        "changes": changes,
    }


@settings_router.get(
    "/roles",
    dependencies=[Depends(require_permission("settings:read"))],
)
async def list_roles():
    """List all admin roles with their permissions."""
    roles = []
    for role in AdminRole:
        permissions = get_role_permissions(role)
        roles.append({
            "role": role.value,
            "label": role.value.replace("_", " ").title(),
            "permissions": permissions,
        })
    return {"roles": roles}
