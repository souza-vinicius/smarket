"""Endpoints de debug para verificar configuração."""
from fastapi import APIRouter

from src.config import settings


router = APIRouter()


@router.get("/providers")
async def list_providers():
    """Lista todos os provedores de LLM configurados."""
    providers = []

    if settings.OPENROUTER_API_KEY:
        providers.append(
            {
                "name": "OpenRouter",
                "enabled": True,
                "model": settings.OPENROUTER_MODEL,
                "priority": 1,
            }
        )

    if settings.GEMINI_API_KEY:
        providers.append(
            {
                "name": "Gemini",
                "enabled": True,
                "model": settings.GEMINI_MODEL,
                "priority": 2,
            }
        )

    if settings.OPENAI_API_KEY:
        providers.append(
            {"name": "OpenAI", "enabled": True, "model": "gpt-4o-mini", "priority": 3}
        )

    if settings.ANTHROPIC_API_KEY:
        providers.append(
            {
                "name": "Anthropic",
                "enabled": True,
                "model": settings.ANTHROPIC_MODEL,
                "priority": 4,
            }
        )

    return {
        "providers": providers,
        "total_providers": len(providers),
        "first_provider": providers[0]["name"] if providers else None,
        "note": "O primeiro provider da lista será usado primeiro, com fallback para os demais",
    }
