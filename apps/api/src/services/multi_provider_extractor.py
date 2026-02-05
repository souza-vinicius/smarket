import base64
import json
import logging
import re
from abc import ABC, abstractmethod

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage

from src.config import settings
from src.schemas.invoice_processing import ExtractedInvoiceData
from src.services.cached_prompts import cache_extraction, get_cached_extraction

logger = logging.getLogger(__name__)


def parse_invoice_response(content: str) -> ExtractedInvoiceData:
    """Parse LLM response into ExtractedInvoiceData.
    
    Handles JSON extraction and type coercion before Pydantic validation.
    """
    # Remover markdown code blocks se presentes
    content = content.strip()
    if content.startswith("```"):
        # Remove ```json or ``` at start and ``` at end
        content = re.sub(r'^```(?:json)?\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
    
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")
    
    # Pré-processar dados antes de passar para Pydantic
    # Converter campos que devem ser string
    for field in ['number', 'series', 'access_key']:
        if field in data and data[field] is not None:
            data[field] = str(data[field])
    
    # Extrair issuer se for objeto aninhado
    if 'issuer' in data and isinstance(data['issuer'], dict):
        issuer = data.pop('issuer')
        if 'name' in issuer and not data.get('issuer_name'):
            data['issuer_name'] = issuer['name']
        if 'cnpj' in issuer and not data.get('issuer_cnpj'):
            data['issuer_cnpj'] = issuer['cnpj']
    
    return ExtractedInvoiceData(**data)


# Prompt do sistema
SYSTEM_PROMPT = """Você é um especialista em extrair dados de notas fiscais
brasileiras (NFC-e/NF-e). Analise a imagem e extraia os campos em JSON.
Retorne APENAS o JSON, sem markdown ou texto adicional.

Campos obrigatórios (todos os valores devem ser strings, exceto números e arrays):
- access_key: string com chave de 44 dígitos
- number: string com número da nota (ex: "123456")
- series: string com série da nota (ex: "001")
- issue_date: string ISO 8601 (ex: "2024-01-15T14:30:00Z")
- issuer_name: string com nome do estabelecimento
- issuer_cnpj: string com CNPJ do estabelecimento
- total_value: número decimal (ex: 150.75)
- items: array de objetos com:
  - description: string
  - quantity: número decimal
  - unit: string (ex: "UN", "KG")
  - unit_price: número decimal
  - total_price: número decimal
- confidence: número entre 0.0 e 1.0 indicando confiança na extração
- warnings: array de strings com avisos sobre dados incertos ou ilegíveis"""


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
            model=settings.GEMINI_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
            max_output_tokens=2048
        )

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        logger.debug(f"GeminiExtractor: Preparando imagem ({len(image_bytes)} bytes)")
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"

        message = HumanMessage(
            content=[
                {"type": "text", "text": SYSTEM_PROMPT},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        )

        logger.debug("GeminiExtractor: Enviando requisição para Gemini API...")
        response = await self.llm.ainvoke([message])
        logger.debug(f"GeminiExtractor: Resposta recebida ({len(response.content)} chars)")
        return parse_invoice_response(response.content)


class OpenAIExtractor(BaseInvoiceExtractor):
    """Extrator usando OpenAI GPT-4o via LangChain."""

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.1,
            max_tokens=2048
        )

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        logger.debug(f"OpenAIExtractor: Preparando imagem ({len(image_bytes)} bytes)")
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{mime_type};base64,{image_base64}"

        message = HumanMessage(
            content=[
                {"type": "text", "text": SYSTEM_PROMPT},
                {"type": "image_url", "image_url": {"url": image_url}}
            ]
        )

        logger.debug("OpenAIExtractor: Enviando requisição para OpenAI API...")
        response = await self.llm.ainvoke([message])
        logger.debug(f"OpenAIExtractor: Resposta recebida ({len(response.content)} chars)")
        return parse_invoice_response(response.content)


class AnthropicExtractor(BaseInvoiceExtractor):
    """Extrator usando Anthropic Claude via LangChain."""

    def __init__(self):
        self.llm = ChatAnthropic(
            model=settings.ANTHROPIC_MODEL,
            api_key=settings.ANTHROPIC_API_KEY,
            temperature=0.1,
            max_tokens=2048
        )

    async def extract(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        logger.debug(f"AnthropicExtractor: Preparando imagem ({len(image_bytes)} bytes)")
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")

        # Anthropic suporta: image/jpeg, image/png, image/gif, image/webp
        # Converter mime_type se necessário
        if mime_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
            logger.warning(
                f"AnthropicExtractor: Mime type {mime_type} may not be supported, "
                "treating as image/jpeg"
            )
            mime_type = "image/jpeg"

        # Anthropic usa formato diferente para imagens
        message = HumanMessage(
            content=[
                {"type": "text", "text": SYSTEM_PROMPT},
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": image_base64
                    }
                }
            ]
        )

        logger.debug(f"AnthropicExtractor: Enviando requisição para Anthropic API (modelo: {settings.ANTHROPIC_MODEL})...")
        response = await self.llm.ainvoke([message])
        logger.debug(f"AnthropicExtractor: Resposta recebida ({len(response.content)} chars)")
        return parse_invoice_response(response.content)


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

        # Inicializar Anthropic se API key disponível
        if settings.ANTHROPIC_API_KEY:
            self.providers.append(("anthropic", AnthropicExtractor()))
            logger.info("Anthropic provider initialized")

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
        
        # Validar imagem
        if not image_bytes:
            raise ValueError("Image bytes cannot be empty")

        image_size_mb = len(image_bytes) / (1024 * 1024)
        providers_list = ", ".join([name for name, _ in self.providers])
        logger.info(
            f"📸 INICIANDO EXTRAÇÃO DE NOTA FISCAL",
            extra={
                "size_mb": round(image_size_mb, 2),
                "size_bytes": len(image_bytes),
                "mime_type": mime_type,
                "available_providers": providers_list
            }
        )
        
        # Avisar se a imagem é muito grande (Claude tem limite de ~5MB)
        if image_size_mb > 5:
            logger.warning(
                f"Image size {image_size_mb:.2f}MB may exceed provider limits"
            )

        errors = []

        for provider_name, extractor in self.providers:
            # Verificar cache primeiro
            cached = await get_cached_extraction(provider_name, image_bytes)
            if cached:
                logger.info(
                    f"✓ SUCESSO - Cache hit para {provider_name}",
                    extra={
                        "provider": provider_name,
                        "source": "cache",
                        "confidence": cached.get("confidence")
                    }
                )
                return ExtractedInvoiceData(**cached)

            try:
                logger.info(f"→ Tentando extração com {provider_name}...")
                result = await extractor.extract(image_bytes, mime_type)

                # Salvar em cache
                await cache_extraction(
                    provider_name,
                    image_bytes,
                    result.model_dump()
                )

                logger.info(
                    f"✓ SUCESSO - Extração completa com {provider_name.upper()}",
                    extra={
                        "provider": provider_name,
                        "source": "api",
                        "confidence": result.confidence,
                        "invoice_number": result.number,
                        "issuer": result.issuer_name,
                        "total_value": result.total_value,
                        "items_count": len(result.items)
                    }
                )
                return result

            except Exception as e:
                logger.warning(
                    f"✗ FALHA - Provider {provider_name} falhou: {str(e)}",
                    extra={"provider": provider_name, "error": str(e)}
                )
                errors.append(f"{provider_name}: {str(e)}")
                continue

        logger.error(
            f"✗✗✗ FALHA COMPLETA - Todos os {len(self.providers)} provedores falharam",
            extra={"errors": errors, "providers_count": len(self.providers)}
        )
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
            preferred_provider: Provedor preferido (gemini|openai|anthropic)

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
        "Configure GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY no arquivo .env"
    ) from e
