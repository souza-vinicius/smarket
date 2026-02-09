import hashlib
import json
import logging
from typing import Optional

import redis.asyncio as redis

from src.config import settings


logger = logging.getLogger(__name__)


class PromptCache:
    """Cache de respostas de prompts usando Redis."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.ttl = 3600  # 1 hora

    async def connect(self):
        """Conecta ao Redis."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Redis connection established for prompt cache")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            self.redis_client = None

    def _get_cache_key(self, provider: str, image_hash: str) -> str:
        """Gera chave de cache."""
        return f"invoice:extract:{provider}:{image_hash}"

    def _hash_image(self, image_bytes: bytes) -> str:
        """Gera hash da imagem para cache."""
        return hashlib.md5(image_bytes).hexdigest()

    async def get(self, provider: str, image_bytes: bytes) -> Optional[dict]:
        """Busca resultado em cache.

        Args:
            provider: Nome do provedor (gemini|openai)
            image_bytes: Bytes da imagem

        Returns:
            Dict com resultado ou None se não encontrado
        """

        if not self.redis_client:
            return None

        try:
            image_hash = self._hash_image(image_bytes)
            cache_key = self._get_cache_key(provider, image_hash)

            cached = await self.redis_client.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for {cache_key}")
                return json.loads(cached)

            return None

        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None

    async def set(self, provider: str, image_bytes: bytes, result: dict) -> bool:
        """Salva resultado em cache.

        Args:
            provider: Nome do provedor
            image_bytes: Bytes da imagem
            result: Resultado a ser cacheado

        Returns:
            True se sucesso, False caso contrário
        """

        if not self.redis_client:
            return False

        try:
            image_hash = self._hash_image(image_bytes)
            cache_key = self._get_cache_key(provider, image_hash)

            await self.redis_client.setex(
                cache_key, self.ttl, json.dumps(result, default=str)
            )
            logger.debug(f"Cached result for {cache_key}")
            return True

        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False

    async def invalidate(self, provider: str, image_bytes: bytes) -> bool:
        """Invalida cache específico."""
        if not self.redis_client:
            return False

        try:
            image_hash = self._hash_image(image_bytes)
            cache_key = self._get_cache_key(provider, image_hash)
            await self.redis_client.delete(cache_key)
            return True
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")
            return False

    async def clear_all(self) -> int:
        """Limpa todo o cache de extrações."""
        if not self.redis_client:
            return 0

        try:
            pattern = "invoice:extract:*"
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")
            return 0


# Instância global
prompt_cache = PromptCache()


async def get_cached_extraction(provider: str, image_bytes: bytes) -> Optional[dict]:
    """Wrapper para buscar extração em cache."""
    return await prompt_cache.get(provider, image_bytes)


async def cache_extraction(provider: str, image_bytes: bytes, result: dict) -> bool:
    """Wrapper para salvar extração em cache."""
    return await prompt_cache.set(provider, image_bytes, result)


async def init_cache():
    """Inicializa conexão com Redis."""
    await prompt_cache.connect()
