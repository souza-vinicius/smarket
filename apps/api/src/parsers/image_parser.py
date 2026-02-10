"""
DEPRECATED: Parser de imagens de notas fiscais usando OpenAI Vision API.

Este módulo foi substituído por `src.services.multi_provider_extractor`
que oferece:
  - Suporte a múltiplos provedores (OpenRouter, Gemini, OpenAI, Anthropic)
  - Prompt otimizado com few-shot e regras de formatação
  - Validação pós-extração (CNPJ, access_key, totais)
  - Processamento assíncrono via background tasks
  - Categorização separada via `src.services.categorizer`

O endpoint /upload/images que usava este módulo agora retorna 410 Gone.
Use /upload/photos em vez disso.

Mantenha este arquivo apenas como referência — será removido em versão futura.
"""

import base64
import json
import re
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from openai import AsyncOpenAI

from src.config import settings


EXTRACTION_SYSTEM_PROMPT = """Você é um especialista em extrair dados estruturados de imagens de notas fiscais brasileiras (NFC-e e NF-e).

Analise todas as imagens fornecidas — elas representam partes de uma ÚNICA nota fiscal que foi fotografada em múltiplas fotos.

Extraia os dados e retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem texto extra) com esta estrutura:

{
  "access_key": "chave de acesso de 44 dígitos, se visível",
  "number": "número da nota fiscal",
  "series": "série da nota fiscal",
  "issue_date": "data de emissão no formato YYYY-MM-DDTHH:MM:SS",
  "issuer_cnpj": "CNPJ do emissor (apenas números)",
  "issuer_name": "razão social ou nome fantasia do emissor",
  "total_value": 0.00,
  "invoice_type": "NFC-e ou NF-e",
  "products": [
    {
      "code": "código do produto",
      "description": "descrição do produto",
      "quantity": 1.000,
      "unit": "UN, KG, etc",
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ]
}

Regras importantes:
- Combine os dados de TODAS as imagens em uma única nota fiscal
- Se um produto aparece em mais de uma imagem, inclua-o apenas uma vez
- Se a chave de acesso não estiver visível, use uma string vazia ""
- Use valores numéricos (não strings) para preços e quantidades
- Se a série não estiver visível, use "1"
- Se o código do produto não estiver visível, use "000"
- Se a unidade não estiver visível, use "UN"
- Retorne APENAS o JSON, sem nenhum texto adicional ou formatação markdown"""


async def parse_invoice_images(image_contents: list[bytes]) -> dict[str, Any]:
    """
    Extrai dados de nota fiscal a partir de múltiplas imagens usando
    OpenAI Vision API.

    Args:
        image_contents: Lista de conteúdos binários das imagens.

    Returns:
        Dicionário com dados da nota fiscal no formato padrão do sistema.

    Raises:
        ValueError: Se nenhuma imagem for fornecida ou se a resposta
            da API não puder ser processada.
    """
    if not image_contents:
        raise ValueError("Nenhuma imagem fornecida")

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    # Build message content with all images
    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                "Extraia todos os dados desta nota fiscal. "
                f"{'Estas ' + str(len(image_contents)) + ' imagens são partes da MESMA nota fiscal.' if len(image_contents) > 1 else 'Esta é a imagem da nota fiscal.'}"
            ),
        }
    ]

    for img_bytes in image_contents:
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{b64}",
                    "detail": "high",
                },
            }
        )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        temperature=0.1,
        max_tokens=4096,
    )

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Falha ao processar resposta da IA: {e}. Resposta: {raw_text[:200]}"
        )

    return _normalize_invoice_data(data)


def _normalize_invoice_data(data: dict[str, Any]) -> dict[str, Any]:
    """
    Normaliza os dados extraídos pela IA para o formato esperado
    pelo sistema.
    """
    access_key = str(data.get("access_key", "")).strip()
    # Ensure access_key is exactly 44 digits or generate a unique placeholder
    if not re.match(r"^\d{44}$", access_key):
        access_key = uuid.uuid4().hex.ljust(44, "0")[:44]

    issue_date = _parse_date(data.get("issue_date", ""))
    total_value = _safe_decimal(data.get("total_value", 0))

    products = []
    for item in data.get("products", []):
        products.append(
            {
                "code": str(item.get("code", "000")),
                "description": str(item.get("description", "")),
                "quantity": _safe_decimal(item.get("quantity", 1)),
                "unit": str(item.get("unit", "UN")),
                "unit_price": _safe_decimal(item.get("unit_price", 0)),
                "total_price": _safe_decimal(item.get("total_price", 0)),
            }
        )

    # If total_value is zero but we have products, calculate it
    if total_value == 0 and products:
        total_value = sum(p["total_price"] for p in products)

    invoice_type = str(data.get("invoice_type", "NFC-e"))
    if invoice_type not in ("NFC-e", "NF-e"):
        invoice_type = "NFC-e"

    return {
        "access_key": access_key,
        "number": str(data.get("number", "000000")),
        "series": str(data.get("series", "1")),
        "issue_date": issue_date,
        "issuer_cnpj": re.sub(r"\D", "", str(data.get("issuer_cnpj", ""))),
        "issuer_name": str(data.get("issuer_name", "Não identificado")),
        "total_value": total_value,
        "type": invoice_type,
        "products": products,
        "raw_data": {"source": "image", "ai_extracted": True},
    }


def _parse_date(value: Any) -> datetime:
    """Tenta parsear uma data em diversos formatos."""
    if isinstance(value, datetime):
        return value

    date_str = str(value).strip()
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    return datetime.utcnow()


def _safe_decimal(value: Any) -> Decimal:
    """Converte um valor para Decimal de forma segura."""
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")
