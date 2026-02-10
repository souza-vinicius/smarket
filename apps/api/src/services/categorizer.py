"""Serviço de categorização de itens de nota fiscal.

Roda como segundo passo, após a extração OCR.
Usa modelo de texto (barato) para classificar itens em categorias.
"""

import json
import logging
import re
from typing import Optional

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from src.config import settings
from src.schemas.invoice_processing import ExtractedItem


logger = logging.getLogger(__name__)

CATEGORIZATION_PROMPT = """Você é um especialista em categorização de produtos de supermercado brasileiro.

Dada a lista de produtos abaixo, classifique cada um usando APENAS as categorias e subcategorias listadas abaixo.

## CATEGORIAS E SUBCATEGORIAS PERMITIDAS:

**Laticínios**
- Leite, Iogurte, Queijos, Manteiga, Margarina, Requeijão, Creme de Leite, Leite Condensado, Outros Laticínios

**Carnes e Aves**
- Frango, Carne Bovina, Carne Suína, Peixes, Frutos do Mar, Linguiças, Embutidos, Outras Carnes

**Frios**
- Presunto, Mortadela, Salsicha, Queijos Fatiados, Patês, Outros Frios

**Bebidas**
- Refrigerantes, Sucos, Águas, Cervejas, Vinhos, Destilados, Energéticos, Isotônicos, Chás Prontos, Cafés Prontos, Outras Bebidas

**Padaria**
- Pães, Bolos, Biscoitos, Torradas, Salgadinhos, Doces, Outros Padaria

**Hortifruti**
- Frutas, Verduras, Legumes, Temperos Frescos, Outros Hortifruti

**Mercearia**
- Arroz, Feijão, Massas, Óleos, Açúcar, Sal, Farinhas, Grãos, Cereais, Conservas, Molhos, Condimentos, Temperos Secos, Enlatados, Outros Mercearia

**Congelados**
- Pizzas, Lasanhas, Hambúrgueres, Nuggets, Sorvetes, Polpas de Frutas, Vegetais Congelados, Outros Congelados

**Limpeza**
- Detergentes, Sabão em Pó, Amaciantes, Desinfetantes, Água Sanitária, Esponjas, Panos, Sacos de Lixo, Multiuso, Outros Limpeza

**Higiene Pessoal**
- Sabonetes, Shampoos, Condicionadores, Cremes Dentais, Escovas de Dente, Desodorantes, Papel Higiênico, Absorventes, Fraldas, Outros Higiene

**Bebê**
- Fraldas, Leites Infantis, Papinhas, Lenços Umedecidos, Pomadas, Outros Bebê

**Pet**
- Ração Cães, Ração Gatos, Petiscos, Areia Sanitária, Outros Pet

**Snacks**
- Chocolates, Balas, Chicletes, Salgadinhos, Biscoitos Recheados, Barras de Cereais, Outros Snacks

**Matinais**
- Cereais, Achocolatados, Aveia, Granola, Mel, Geleias, Outros Matinais

**Utilidades Domésticas**
- Papel Toalha, Guardanapos, Papel Alumínio, Filme PVC, Velas, Fósforos, Outros Utilidades

**Outros**
- Diversos, Não Classificado

## INSTRUÇÕES:

1. Use APENAS as categorias principais listadas acima (ex: "Laticínios", "Carnes e Aves", "Bebidas")
2. Use APENAS as subcategorias listadas para cada categoria (ex: "Leite", "Frango", "Refrigerantes")
3. Se não encontrar uma subcategoria exata, use a opção "Outros [Categoria]" (ex: "Outros Laticínios")
4. Se o produto não se encaixar em nenhuma categoria, use "Outros" como categoria e "Diversos" como subcategoria

Retorne APENAS um JSON array com objetos {index, category_name, subcategory}:

Exemplo de entrada:
0: LEITE INTEGRAL PARMALAT 1L
1: DETERGENTE LIMPOL 500ML
2: FILE PEITO FRANGO KG

Exemplo de saída:
[
  {"index": 0, "category_name": "Laticínios", "subcategory": "Leite"},
  {"index": 1, "category_name": "Limpeza", "subcategory": "Detergentes"},
  {"index": 2, "category_name": "Carnes e Aves", "subcategory": "Frango"}
]

Produtos para categorizar:
"""


async def categorize_items(
    items: list[ExtractedItem],
) -> list[ExtractedItem]:
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

    # Construir lista de descrições (prefere normalized_name se disponível)
    descriptions = []
    for i, item in enumerate(items):
        desc = item.normalized_name or item.description or "Item sem descrição"
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
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)

        categories = json.loads(content)

        # Aplicar categorias
        for cat in categories:
            idx = cat.get("index")
            if idx is not None and 0 <= idx < len(items):
                items[idx].category_name = cat.get("category_name")
                items[idx].subcategory = cat.get("subcategory")

        logger.info(f"✓ Categorização completa: {len(categories)} itens categorizados")

    except Exception as e:
        logger.warning(f"Categorização falhou (não-crítico): {e}")
        # Não falha — itens ficam sem categoria

    return items


def _get_categorization_llm() -> Optional[ChatOpenAI]:
    """Retorna LLM para categorização (texto puro, modelo barato)."""
    # Prefere OpenRouter (permite trocar modelo facilmente)
    if settings.OPENROUTER_API_KEY:
        return ChatOpenAI(
            model="mistralai/mistral-small-3.2-24b-instruct",
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
