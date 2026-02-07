"""Serviço de categorização de itens de nota fiscal.

Roda como segundo passo, após a extração OCR.
Usa modelo de texto (barato) para classificar itens em categorias.
"""

import json
import logging
import re
from typing import List, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from src.config import settings
from src.schemas.invoice_processing import ExtractedItem

logger = logging.getLogger(__name__)

CATEGORIZATION_PROMPT = """Você é um especialista em categorização de produtos de supermercado brasileiro.

Dada a lista de produtos abaixo, classifique cada um com:
- category_name: categoria principal (ex: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Padaria, Hortifruti, Mercearia, Frios, Congelados, Pet, Outros)
- subcategory: subcategoria mais específica (ex: Leite, Iogurte, Frango, Cerveja, Detergente)

Retorne APENAS um JSON array com objetos {index, category_name, subcategory}:

Exemplo de entrada:
0: LEITE INTEGRAL PARMALAT 1L
1: DETERGENTE LIMPOL 500ML
2: FILE PEITO FRANGO KG

Exemplo de saída:
[
  {"index": 0, "category_name": "Laticínios", "subcategory": "Leite"},
  {"index": 1, "category_name": "Limpeza", "subcategory": "Detergente"},
  {"index": 2, "category_name": "Carnes", "subcategory": "Frango"}
]

Produtos para categorizar:
"""


async def categorize_items(
    items: List[ExtractedItem],
) -> List[ExtractedItem]:
    """Categoriza uma lista de itens extraídos.

    Usa OpenRouter (ou fallback) para classificar itens em categorias.
    Não falha se a categorização der erro — retorna itens sem categoria.

    Args:
        items: Lista de ExtractedItem com description preenchida

    Returns:
        Mesma lista com category_name e subcategory preenchidos
    """
    if not items:
        return items

    # Construir lista de descrições
    descriptions = []
    for i, item in enumerate(items):
        desc = item.description or "Item sem descrição"
        descriptions.append(f"{i}: {desc}")

    prompt_text = CATEGORIZATION_PROMPT + "\n".join(descriptions)

    try:
        llm = _get_categorization_llm()
        if not llm:
            logger.warning("Nenhum LLM disponível para categorização")
            return items

        message = HumanMessage(content=prompt_text)
        response = await llm.ainvoke([message])
        content = response.content.strip()

        # Limpar markdown
        if content.startswith("```"):
            content = re.sub(r'^```(?:json)?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)

        categories = json.loads(content)

        # Aplicar categorias
        for cat in categories:
            idx = cat.get("index")
            if idx is not None and 0 <= idx < len(items):
                items[idx].category_name = cat.get("category_name")
                items[idx].subcategory = cat.get("subcategory")

        logger.info(
            f"✓ Categorização completa: {len(categories)} itens categorizados"
        )

    except Exception as e:
        logger.warning(f"Categorização falhou (não-crítico): {e}")
        # Não falha — itens ficam sem categoria

    return items


def _get_categorization_llm() -> Optional[ChatOpenAI]:
    """Retorna LLM para categorização (texto puro, modelo barato)."""
    # Prefere OpenRouter (permite trocar modelo facilmente)
    if settings.OPENROUTER_API_KEY:
        return ChatOpenAI(
            model="google/gemini-2.0-flash-lite-001",
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            temperature=0.0,
            max_tokens=2048,
            default_headers={
                "HTTP-Referer": "https://smarket.app",
                "X-Title": "SMarket Categorizer",
            },
        )

    if settings.OPENAI_API_KEY:
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.0,
            max_tokens=2048,
        )

    return None
