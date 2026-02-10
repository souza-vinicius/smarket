"""
CNPJ enrichment service using public Brazilian APIs.

This module provides functions to enrich merchant data by querying public
CNPJ databases. It uses BrasilAPI as the primary source with ReceitaWS as fallback.
"""

import logging
from typing import Optional

import httpx
from cachetools import TTLCache

from src.utils.cnpj_validator import clean_cnpj, format_cnpj


logger = logging.getLogger(__name__)

# Cache for CNPJ queries: (CNPJ -> data, TTL 24 hours)
# Max 1000 entries to prevent memory issues
_cnpj_cache: TTLCache = TTLCache(maxsize=1000, ttl=86400)


async def enrich_cnpj_data(
    cnpj: str, timeout: int = 5, use_cache: bool = True
) -> Optional[dict]:
    """
    Enrich CNPJ data using public APIs.

    Tries BrasilAPI first, falls back to ReceitaWS if it fails.
    Results are cached for 24 hours to avoid repeated requests.

    Args:
        cnpj: CNPJ string (with or without formatting)
        timeout: Request timeout in seconds (default: 5)
        use_cache: Whether to use cached results (default: True)

    Returns:
        Dictionary with enriched data or None if all sources fail.
        Returns dict with keys:
        - razao_social: Legal business name
        - nome_fantasia: Trade name (may be empty)
        - cnpj: Formatted CNPJ
        - logradouro: Street address
        - numero: Street number
        - complemento: Address complement
        - bairro: Neighborhood
        - municipio: City
        - uf: State (2-letter code)
        - cep: Postal code
        - telefone: Phone number
        - email: Email address
        - situacao: Registration status (ATIVA, INAPTA, etc)
        - cnae_fiscal: Main economic activity code
        - data_abertura: Opening date
        - source: API source used ('brasilapi' or 'receitaws')
    """
    cnpj_clean = clean_cnpj(cnpj)

    # Check cache
    if use_cache and cnpj_clean in _cnpj_cache:
        logger.info(f"CNPJ cache hit: {cnpj_clean}")
        return _cnpj_cache[cnpj_clean]

    # Try BrasilAPI first
    try:
        data = await fetch_from_brasilapi(cnpj_clean, timeout)
        if data:
            logger.info(f"CNPJ enriched from BrasilAPI: {cnpj_clean}")
            data["source"] = "brasilapi"
            _cnpj_cache[cnpj_clean] = data
            return data
    except Exception as e:
        logger.warning(f"BrasilAPI failed for CNPJ {cnpj_clean}: {e}")

    # Fallback to ReceitaWS
    try:
        data = await fetch_from_receitaws(cnpj_clean, timeout)
        if data:
            logger.info(f"CNPJ enriched from ReceitaWS: {cnpj_clean}")
            data["source"] = "receitaws"
            _cnpj_cache[cnpj_clean] = data
            return data
    except Exception as e:
        logger.warning(f"ReceitaWS failed for CNPJ {cnpj_clean}: {e}")

    logger.error(f"All CNPJ enrichment sources failed for: {cnpj_clean}")
    return None


async def fetch_from_brasilapi(cnpj: str, timeout: int = 5) -> Optional[dict]:
    """
    Fetch CNPJ data from BrasilAPI.

    BrasilAPI is a free, open-source API maintained by the Brazilian developer
    community. It provides fast access to public government data.

    API Documentation: https://brasilapi.com.br/docs#tag/CNPJ

    Args:
        cnpj: Clean CNPJ (14 digits, no formatting)
        timeout: Request timeout in seconds

    Returns:
        Normalized dictionary with CNPJ data or None if request fails

    Raises:
        httpx.HTTPError: On HTTP errors (4xx, 5xx)
        httpx.TimeoutException: On timeout
    """
    url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        # Normalize BrasilAPI response to our schema
        return {
            "razao_social": data.get("razao_social", ""),
            "nome_fantasia": data.get("nome_fantasia", ""),
            "cnpj": format_cnpj(data.get("cnpj", cnpj)),
            "logradouro": data.get("logradouro", ""),
            "numero": data.get("numero", ""),
            "complemento": data.get("complemento", ""),
            "bairro": data.get("bairro", ""),
            "municipio": data.get("municipio", ""),
            "uf": data.get("uf", ""),
            "cep": data.get("cep", ""),
            "telefone": data.get("ddd_telefone_1", ""),
            "email": data.get("email", ""),
            "situacao": data.get("descricao_situacao_cadastral", ""),
            "cnae_fiscal": str(data.get("cnae_fiscal", "")),
            "data_abertura": data.get("data_inicio_atividade", ""),
        }


async def fetch_from_receitaws(cnpj: str, timeout: int = 5) -> Optional[dict]:
    """
    Fetch CNPJ data from ReceitaWS (fallback).

    ReceitaWS is a free API that provides data from the Brazilian Federal
    Revenue Service. It has rate limits for free usage.

    API Documentation: https://receitaws.com.br/api

    Args:
        cnpj: Clean CNPJ (14 digits, no formatting)
        timeout: Request timeout in seconds

    Returns:
        Normalized dictionary with CNPJ data or None if request fails

    Raises:
        httpx.HTTPError: On HTTP errors (4xx, 5xx)
        httpx.TimeoutException: On timeout
    """
    url = f"https://receitaws.com.br/v1/cnpj/{cnpj}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        # Check for API error response
        if data.get("status") == "ERROR":
            logger.error(f"ReceitaWS error: {data.get('message')}")
            return None

        # Normalize ReceitaWS response to our schema
        return {
            "razao_social": data.get("nome", ""),
            "nome_fantasia": data.get("fantasia", ""),
            "cnpj": format_cnpj(data.get("cnpj", cnpj)),
            "logradouro": data.get("logradouro", ""),
            "numero": data.get("numero", ""),
            "complemento": data.get("complemento", ""),
            "bairro": data.get("bairro", ""),
            "municipio": data.get("municipio", ""),
            "uf": data.get("uf", ""),
            "cep": data.get("cep", ""),
            "telefone": data.get("telefone", ""),
            "email": data.get("email", ""),
            "situacao": data.get("situacao", ""),
            "cnae_fiscal": data.get("atividade_principal", [{}])[0].get("code", "")
            if data.get("atividade_principal")
            else "",
            "data_abertura": data.get("abertura", ""),
        }


def clear_cache():
    """Clear the CNPJ cache. Useful for testing."""
    _cnpj_cache.clear()
    logger.info("CNPJ cache cleared")
