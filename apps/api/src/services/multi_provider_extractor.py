import base64
import logging
from abc import ABC, abstractmethod

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import PydanticOutputParser

from src.config import settings
from src.schemas.invoice_processing import ExtractedInvoiceData
from src.services.cached_prompts import cache_extraction, get_cached_extraction

logger = logging.getLogger(__name__)


# Prompt do sistema
SYSTEM_PROMPT = """Você é um especialista em extrair dados de notas fiscais
brasileiras (NFC-e/NF-e). Analise a imagem e extraia os campos em JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Campos obrigatórios:
- access_key: chave de 44 dígitos
- number: número da nota
- series: série da nota
- issue_date: data ISO 8601
- issuer: {cnpj, name}
- total_value: número
- items: [{description, quantity, unit, unit_price, total_price}]
- confidence: 0.0-1.0
- warnings: []"""


class BaseInvoiceExtractor(ABC):
    """Interface base para extratores de invoice."""

    @abstractmethod
    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Extrai dados de uma imagem de nota fiscal."""
        pass


class GeminiExtractor(BaseInvoiceExtractor):
    """Extrator usando Google Gemini via LangChain."""

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.0-flash",
            api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
            max_output_tokens=2048
        )
        self.parser = PydanticOutputParser(
            pydantic_object=ExtractedInvoiceData
        )

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"

        message = HumanMessage(
            content=[
                {"type": "text", "text": SYSTEM_PROMPT},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        )

        response = await self.llm.ainvoke([message])
        return self.parser.parse(response.content)


class OpenAIExtractor(BaseInvoiceExtractor):
    """Extrator usando OpenAI GPT-4o via LangChain."""

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.1,
            max_tokens=2048
        )
        self.parser = PydanticOutputParser(
            pydantic_object=ExtractedInvoiceData
        )

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"

        message = HumanMessage(
            content=[
                {"type": "text", "text": SYSTEM_PROMPT},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        )

        response = await self.llm.ainvoke([message])
        return self.parser.parse(response.content)


class MultiProviderExtractor:
    """Extrator com fallback entre provedores."""

    def __init__(self):
        self.providers = []

        # Inicializar Gemini se API key disponível
        if settings.GEMINI_API_KEY:
            self.providers.append(("gemini", GeminiExtractor()))
            logger.info("Gemini provider initialized")

        # Inicializar OpenAI se API key disponível
        if settings.OPENAI_API_KEY:
            self.providers.append(("openai", OpenAIExtractor()))
            logger.info("OpenAI provider initialized")

        if not self.providers:
            raise ValueError("Nenhum provedor de LLM configurado")

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Tenta extrair com fallback entre provedores.

        Args:
            image_bytes: Bytes da imagem
            mime_type: Tipo MIME da imagem

        Returns:
            ExtractedInvoiceData com dados extraídos

        Raises:
            ValueError: Se todos os provedores falharem
        """

        errors = []

        for provider_name, extractor in self.providers:
            # Verificar cache primeiro
            cached = await get_cached_extraction(provider_name, image_bytes)
            if cached:
                logger.info(f"Cache hit para {provider_name}")
                return ExtractedInvoiceData(**cached)

            try:
                logger.info(f"Tentando extração com {provider_name}")
                result = await extractor.extract(image_bytes, mime_type)

                # Salvar em cache
                await cache_extraction(
                    provider_name,
                    image_bytes,
                    result.model_dump()
                )

                logger.info(
                    f"Extração bem-sucedida com {provider_name}",
                    extra={
                        "provider": provider_name,
                        "confidence": result.confidence
                    }
                )
                return result

            except Exception as e:
                logger.warning(
                    f"Provider {provider_name} falhou: {str(e)}",
                    extra={"provider": provider_name}
                )
                errors.append(f"{provider_name}: {str(e)}")
                continue

        logger.error("Todos os provedores falharam", extra={"errors": errors})
        raise ValueError(
            f"Extração falhou com todos os provedores: {errors}"
        )

    async def extract_with_preference(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        preferred_provider: str = "gemini"
    ) -> ExtractedInvoiceData:
        """Tenta extração com provedor preferido primeiro.

        Args:
            image_bytes: Bytes da imagem
            mime_type: Tipo MIME
            preferred_provider: Provedor preferido (gemini|openai)

        Returns:
            ExtractedInvoiceData

        Raises:
            ValueError: Se extração falhar
        """

        # Reordenar provedores
        reordered = [
            (name, ext) for name, ext in self.providers
            if name == preferred_provider
        ] + [
            (name, ext) for name, ext in self.providers
            if name != preferred_provider
        ]

        errors = []

        for provider_name, extractor in reordered:
            try:
                result = await extractor.extract(image_bytes, mime_type)
                return result
            except Exception as e:
                errors.append(f"{provider_name}: {str(e)}")
                continue

        raise ValueError(f"Extração falhou: {errors}")


# Instância global com todos os provedores disponíveis
try:
    extractor = MultiProviderExtractor()
except ValueError as e:
    logger.error(f"Falha ao inicializar extrator: {e}")
    raise RuntimeError(
        "Nenhum provedor de LLM configurado. "
        "Configure GEMINI_API_KEY ou OPENAI_API_KEY no arquivo .env"
    ) from e
