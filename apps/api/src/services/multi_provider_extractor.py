import base64
import json
import logging
import re
from abc import ABC, abstractmethod
from decimal import Decimal

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from src.config import settings
from src.schemas.invoice_processing import ExtractedInvoiceData
from src.services.cached_prompts import cache_extraction, get_cached_extraction


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Prompt de extração — focado em OCR preciso, sem categorização
# ---------------------------------------------------------------------------
# TODO(ocr-quality): Melhorar processo de OCR — considerar:
#   1. Pré-processamento de imagem (contraste, binarização, deskew) antes de enviar ao LLM
#   2. Prompt com exemplos reais de NFC-e de diferentes supermercados
#   3. Fallback OCR dedicado (Tesseract/Google Vision) para campos críticos (CNPJ, chave de acesso)
#   4. Structured output / function calling para garantir JSON schema correto
#   5. Retry com prompt ajustado quando validação pós-extração detecta muitos problemas
#   6. Avaliar modelos especializados em OCR (e.g. Gemini 2.5 Pro, Claude 3.5 Sonnet)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Você é um especialista em OCR de notas fiscais brasileiras (NFC-e/NF-e).
Analise a(s) imagem(ns) e extraia TODOS os dados estruturados.

Se houver múltiplas imagens, elas são partes da MESMA nota fiscal.
Combine os dados de todas as imagens em um único resultado.
Se um item aparece em mais de uma imagem, inclua-o apenas uma vez.

ONDE ENCONTRAR CADA CAMPO NA NOTA:
- CNPJ do emissor: aparece no topo, formato XX.XXX.XXX/XXXX-XX
- Nome do emissor: razão social ou nome fantasia, logo abaixo do CNPJ
- Número da NFC-e: após "NFC-e Nº" ou "NF-e Nº" no cabeçalho
- Série: após "Série:" no cabeçalho (geralmente "001")
- Data de emissão: formato DD/MM/AAAA HH:MM:SS
- Chave de acesso: sequência de 44 dígitos, geralmente no rodapé
- Itens: tabela com colunas Descrição, Qtd, UN, Vl.Unit, Vl.Total
- Valor total: no rodapé, após "VALOR TOTAL R$" ou "TOTAL R$"

REGRAS DE FORMATAÇÃO (CRÍTICO — siga exatamente):
1. issuer_cnpj: retorne SOMENTE os 14 dígitos, SEM pontos/barras/hífens
   Ex: nota mostra "61.585.865/0001-51" → retorne "61585865000151"
2. access_key: retorne SOMENTE os 44 dígitos, SEM espaços
   Ex: "3525 0261 5858 6500 0151 6500 1000 0001 2510 0000 4297" → "3525026158586500015165001000001251000004297"
3. number: o número impresso da nota, como string
   Ex: nota mostra "Nº 001.234" → retorne "001234"
4. issue_date: converta para ISO 8601
   Ex: "15/01/2024 14:30:22" → "2024-01-15T14:30:22"
5. Valores monetários: use PONTO como decimal
   Ex: "R$ 15,90" → 15.90 (número, não string)
6. total_price de cada item DEVE ser igual a quantity × unit_price
   Se não bater, use quantity × unit_price
7. description de cada item: SOMENTE o nome do produto, SEM código numérico
   Notas fiscais mostram um código antes da descrição (ex: "001 LEITE INTEGRAL 1L")
   → code: "001", description: "LEITE INTEGRAL 1L"
   NUNCA inclua o código na description. Se houver código, coloque no campo "code".
8. discount: valor de desconto no item (decimal, 0 se não houver)
   Notas fiscais podem conter colunas "Desc", "Vl.Desc", "DESC(-)" ou "Desconto"
   Se houver desconto, total_price deve ser (quantity × unit_price) - discount
   Se não houver coluna de desconto na nota, retorne 0

VERIFICAÇÃO OBRIGATÓRIA ANTES DE RESPONDER:
- Some todos os total_price dos itens
- Compare com total_value
- Se a diferença for > R$ 1,00, adicione warning explicando

CONFIANÇA (seja honesto):
- 0.95: todos os campos legíveis e valores conferem
- 0.80: maioria legível, 1-2 campos ilegíveis ou valores com pequena divergência
- 0.60: imagem parcial, vários campos ilegíveis
- 0.40: imagem muito ruim, dados muito incertos

Retorne APENAS JSON válido (sem markdown, sem ```):
{
  "access_key": "35250261585865000151650010000012510000042971",
  "number": "001234",
  "series": "001",
  "issue_date": "2024-01-15T14:30:22",
  "issuer_name": "SUPERMERCADO EXEMPLO LTDA",
  "issuer_cnpj": "61585865000151",
  "total_value": 87.40,
  "items": [
    {
      "code": "001",
      "description": "LEITE INTEGRAL PARMALAT 1L",
      "quantity": 2.0,
      "unit": "UN",
      "unit_price": 5.99,
      "discount": 0,
      "total_price": 11.98
    },
    {
      "code": "002",
      "description": "CERVEJA SKOL LT 350ML",
      "quantity": 6.0,
      "unit": "UN",
      "unit_price": 3.99,
      "discount": 5.94,
      "total_price": 18.00
    }
  ],
  "confidence": 0.92,
  "warnings": ["chave de acesso parcialmente ilegível"]
}"""


# ---------------------------------------------------------------------------
# Parsing e validação pós-extração
# ---------------------------------------------------------------------------


def parse_invoice_response(content: str) -> ExtractedInvoiceData:
    """Parse LLM response into ExtractedInvoiceData.

    Handles JSON extraction, type coercion, and data cleaning
    before Pydantic validation.
    """
    # Remover markdown code blocks se presentes
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")

    # Pré-processar dados antes de passar para Pydantic
    # Converter campos que devem ser string
    for field in ["number", "series", "access_key"]:
        if field in data and data[field] is not None:
            data[field] = str(data[field])

    # Extrair issuer se for objeto aninhado
    if "issuer" in data and isinstance(data["issuer"], dict):
        issuer = data.pop("issuer")
        if "name" in issuer and not data.get("issuer_name"):
            data["issuer_name"] = issuer["name"]
        if "cnpj" in issuer and not data.get("issuer_cnpj"):
            data["issuer_cnpj"] = issuer["cnpj"]

    result = ExtractedInvoiceData(**data)

    # Validação e correção pós-extração
    result = validate_and_fix_extraction(result)

    return result


def validate_and_fix_extraction(data: ExtractedInvoiceData) -> ExtractedInvoiceData:
    """Valida e corrige dados extraídos pela LLM.

    Limpa CNPJ/access_key, recalcula totais inconsistentes e
    adiciona warnings quando detecta problemas.
    """
    warnings = list(data.warnings) if data.warnings else []

    # --- Limpar CNPJ: manter somente dígitos ---
    if data.issuer_cnpj:
        clean_cnpj = re.sub(r"\D", "", data.issuer_cnpj)
        if clean_cnpj != data.issuer_cnpj:
            logger.debug(f"CNPJ limpo: '{data.issuer_cnpj}' → '{clean_cnpj}'")
        if len(clean_cnpj) != 14 and len(clean_cnpj) > 0:
            warnings.append(f"CNPJ com {len(clean_cnpj)} dígitos (esperado 14)")
        data.issuer_cnpj = clean_cnpj

    # --- Limpar access_key: manter somente dígitos ---
    if data.access_key:
        clean_key = re.sub(r"\D", "", data.access_key)
        if clean_key != data.access_key:
            logger.debug(f"Chave de acesso limpa: '{data.access_key}' → '{clean_key}'")
        if len(clean_key) != 44 and len(clean_key) > 0:
            warnings.append(
                f"Chave de acesso com {len(clean_key)} dígitos (esperado 44)"
            )
        data.access_key = clean_key
    else:
        warnings.append("Chave de acesso não encontrada na imagem")

    # --- Limpar número da nota ---
    if data.number:
        data.number = re.sub(r"[^\d]", "", data.number)

    # --- Limpar código do produto da descrição ---
    for item in data.items:
        if item.description:
            # Padrão: código numérico no início da descrição
            # Ex: "001 LEITE INTEGRAL 1L" → code="001",
            #     desc="LEITE INTEGRAL 1L"
            # Ex: "0000123 ARROZ TIPO 1" → code="0000123",
            #     desc="ARROZ TIPO 1"
            # Ex: "7891234567890 SABAO EM PO" (EAN-13)
            match = re.match(r"^(\d{3,13})\s+(.+)$", item.description.strip())
            if match:
                extracted_code = match.group(1)
                cleaned_desc = match.group(2).strip()
                # Só aceitar se a parte restante parece um nome
                # (tem pelo menos uma letra)
                if re.search(r"[A-Za-zÀ-ú]", cleaned_desc):
                    if not item.code or item.code == "":
                        item.code = extracted_code
                    item.description = cleaned_desc
                    logger.debug(
                        f"Código extraído da descrição: "
                        f"'{extracted_code}' → desc='{cleaned_desc}'"
                    )

    # --- Normalizar discount: None → 0 ---
    for item in data.items:
        if item.discount is None:
            item.discount = Decimal("0")
        elif item.discount < 0:
            item.discount = abs(item.discount)

    # --- Validar e corrigir totais dos itens ---
    items_fixed = 0
    for item in data.items:
        if item.quantity is not None and item.unit_price is not None:
            gross = item.quantity * item.unit_price
            discount = item.discount or Decimal("0")
            expected_total = gross - discount
            # Arredondar para 2 casas decimais
            expected_total = Decimal(str(round(float(expected_total), 2)))

            if item.total_price is None:
                item.total_price = expected_total
                items_fixed += 1
            else:
                diff = abs(float(item.total_price) - float(expected_total))
                if diff > 0.02:
                    logger.debug(
                        f"Item '{item.description}': total_price "
                        f"{item.total_price} ≠ (qty×price)-discount "
                        f"({item.quantity}×{item.unit_price})-{discount}="
                        f"{expected_total} (diff={diff:.2f}). Recalculando."
                    )
                    item.total_price = expected_total
                    items_fixed += 1

    if items_fixed > 0:
        warnings.append(
            f"{items_fixed} item(ns) com total recalculado "
            f"((quantity × unit_price) - discount)"
        )

    # --- Validar total geral vs soma dos itens ---
    if data.items:
        items_sum = sum(
            float(item.total_price)
            for item in data.items
            if item.total_price is not None
        )
        items_sum = round(items_sum, 2)

        if data.total_value is not None:
            total_val = float(data.total_value)
            diff = abs(total_val - items_sum)

            if diff > 1.0:
                warnings.append(
                    f"Divergência entre total da nota (R$ {total_val:.2f}) "
                    f"e soma dos itens (R$ {items_sum:.2f}). "
                    f"Diferença: R$ {diff:.2f}"
                )
                # Se a soma dos itens parece mais confiável (mais itens, mais dados),
                # usar como referência
                if len(data.items) >= 2:
                    logger.info(
                        f"Ajustando total_value: {total_val} → {items_sum} "
                        f"(soma dos itens)"
                    )
                    data.total_value = Decimal(str(items_sum))
        else:
            # total_value não veio: calcular a partir dos itens
            data.total_value = Decimal(str(items_sum))
            warnings.append("Total da nota calculado a partir da soma dos itens")

    # --- Ajustar confiança se há muitos warnings ---
    original_confidence = data.confidence
    if not data.access_key or len(re.sub(r"\D", "", data.access_key or "")) != 44:
        data.confidence = min(data.confidence, 0.80)
    if not data.issuer_cnpj or len(data.issuer_cnpj) != 14:
        data.confidence = min(data.confidence, 0.80)
    if not data.items:
        data.confidence = min(data.confidence, 0.50)
    if data.confidence != original_confidence:
        logger.debug(f"Confiança ajustada: {original_confidence} → {data.confidence}")

    data.warnings = warnings
    return data


class BaseInvoiceExtractor(ABC):
    """Interface base para extratores de invoice."""

    @abstractmethod
    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Extrai dados de uma imagem de nota fiscal."""
        pass

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        """Extrai dados de múltiplas imagens da mesma nota fiscal.

        Envia todas as imagens numa única request para o LLM.
        Implementação default — subclasses podem sobrescrever.

        Args:
            images: Lista de (image_bytes, mime_type)

        Returns:
            ExtractedInvoiceData com dados combinados
        """
        if len(images) == 1:
            return await self.extract(images[0][0], images[0][1])
        # Default: usa a primeira imagem apenas (subclasses melhoram isso)
        return await self.extract(images[0][0], images[0][1])


def _build_image_content_openai(
    images: list[tuple[bytes, str]],
) -> list:
    """Constrói content list com múltiplas imagens (formato OpenAI).

    Args:
        images: Lista de (image_bytes, mime_type)
    """
    n = len(images)
    if n > 1:
        intro = (
            f"Estas {n} imagens são partes da MESMA nota fiscal. "
            "Combine os dados de todas as imagens em um único resultado."
        )
    else:
        intro = "Extraia os dados desta nota fiscal."

    content: list = [{"type": "text", "text": f"{intro}\n\n{SYSTEM_PROMPT}"}]
    for img_bytes, mime in images:
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        image_url: dict = {"url": f"data:{mime};base64,{b64}"}
        content.append({"type": "image_url", "image_url": image_url})
    return content


def _build_image_content_anthropic(
    images: list[tuple[bytes, str]],
) -> list:
    """Constrói content list com múltiplas imagens (formato Anthropic)."""
    SUPPORTED = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    n = len(images)
    if n > 1:
        intro = (
            f"Estas {n} imagens são partes da MESMA nota fiscal. "
            "Combine os dados de todas as imagens em um único resultado."
        )
    else:
        intro = "Extraia os dados desta nota fiscal."

    content: list = [{"type": "text", "text": f"{intro}\n\n{SYSTEM_PROMPT}"}]
    for img_bytes, mime in images:
        if mime not in SUPPORTED:
            mime = "image/jpeg"
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime,
                    "data": b64,
                },
            }
        )
    return content


class GeminiExtractor(BaseInvoiceExtractor):
    """Extrator usando Google Gemini via LangChain."""

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.0,
            max_output_tokens=4096,
        )

    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        return await self.extract_multiple([(image_bytes, mime_type)])

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        from src.services.token_callback import TokenUsageCallback

        total = sum(len(b) for b, _ in images)
        logger.debug(f"GeminiExtractor: {len(images)} imagem(ns), {total} bytes")

        # Create callback for token tracking
        callback = TokenUsageCallback("Gemini", settings.GEMINI_MODEL)

        content = _build_image_content_openai(images)
        message = HumanMessage(content=content)

        # Pass callback to ainvoke for token tracking
        response = await self.llm.ainvoke([message], config={"callbacks": [callback]})

        logger.debug(
            f"GeminiExtractor: Resposta recebida ({len(response.content)} chars)"
        )
        return parse_invoice_response(response.content)


class OpenAIExtractor(BaseInvoiceExtractor):
    """Extrator usando OpenAI GPT-4o via LangChain."""

    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.0,
            max_tokens=4096,
        )

    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        return await self.extract_multiple([(image_bytes, mime_type)])

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        from src.services.token_callback import TokenUsageCallback

        total = sum(len(b) for b, _ in images)
        logger.debug(f"OpenAIExtractor: {len(images)} imagem(ns), {total} bytes")

        # Create callback for token tracking
        callback = TokenUsageCallback("OpenAI", "gpt-4o-mini")

        content = _build_image_content_openai(images)
        message = HumanMessage(content=content)

        # Pass callback to ainvoke for token tracking
        response = await self.llm.ainvoke([message], config={"callbacks": [callback]})

        logger.debug(
            f"OpenAIExtractor: Resposta recebida ({len(response.content)} chars)"
        )
        return parse_invoice_response(response.content)


class AnthropicExtractor(BaseInvoiceExtractor):
    """Extrator usando Anthropic Claude via LangChain."""

    def __init__(self):
        self.llm = ChatAnthropic(
            model=settings.ANTHROPIC_MODEL,
            api_key=settings.ANTHROPIC_API_KEY,
            temperature=0.0,
            max_tokens=4096,
        )

    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        return await self.extract_multiple([(image_bytes, mime_type)])

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        from src.services.token_callback import TokenUsageCallback

        total = sum(len(b) for b, _ in images)
        logger.debug(
            f"AnthropicExtractor: {len(images)} imagem(ns), {total} bytes, "
            f"modelo: {settings.ANTHROPIC_MODEL}"
        )

        # Create callback for token tracking
        callback = TokenUsageCallback("Anthropic", settings.ANTHROPIC_MODEL)

        content = _build_image_content_anthropic(images)
        message = HumanMessage(content=content)

        # Pass callback to ainvoke for token tracking
        response = await self.llm.ainvoke([message], config={"callbacks": [callback]})

        logger.debug(
            f"AnthropicExtractor: Resposta recebida ({len(response.content)} chars)"
        )
        return parse_invoice_response(response.content)


class OpenRouterExtractor(BaseInvoiceExtractor):
    """Extrator usando OpenRouter (API compatível com OpenAI, acesso a múltiplos modelos)."""

    def __init__(self, model: str | None = None):
        self.model_name = model or settings.OPENROUTER_MODEL
        self.llm = ChatOpenAI(
            model=self.model_name,
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            temperature=0.0,
            max_tokens=4096,
            default_headers={
                "HTTP-Referer": "https://mercadoesperto.app",
                "X-Title": "Mercado Esperto Invoice Extractor",
            },
        )

    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        return await self.extract_multiple([(image_bytes, mime_type)])

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        from src.services.token_callback import TokenUsageCallback

        total = sum(len(b) for b, _ in images)
        logger.debug(
            f"OpenRouterExtractor: {len(images)} imagem(ns), {total} bytes, "
            f"modelo: {self.model_name}"
        )

        # Create callback for token tracking
        callback = TokenUsageCallback("OpenRouter", self.model_name)

        content = _build_image_content_openai(images)
        message = HumanMessage(content=content)

        # Pass callback to ainvoke for token tracking
        response = await self.llm.ainvoke([message], config={"callbacks": [callback]})

        logger.debug(
            f"OpenRouterExtractor: Resposta recebida ({len(response.content)} chars)"
        )
        return parse_invoice_response(response.content)


class MultiProviderExtractor:
    """Extrator com fallback entre provedores."""

    def __init__(self):
        self.providers = []

        # Inicializar modelos específicos para otimização de custo (via OpenRouter)
        self.lite_extractor = None
        self.standard_extractor = None

        if settings.OPENROUTER_API_KEY:
            try:
                logger.info(f"Initializing Smart Extractors with settings: LITE={settings.OPENROUTER_MODEL_LITE}, FULL={settings.OPENROUTER_MODEL_FULL}")

                # Modelo mais barato/rápido para casos simples (1 imagem)
                self.lite_extractor = OpenRouterExtractor(model=settings.OPENROUTER_MODEL_LITE)

                # Modelo mais robusto para falhas ou múltiplas imagens
                self.standard_extractor = OpenRouterExtractor(model=settings.OPENROUTER_MODEL_FULL)

                logger.info("Smart optimization extractors initialized (Lite + Standard)")
            except Exception as e:
                logger.warning(f"Failed to initialize smart extractors: {e}", exc_info=True)

        # OpenRouter primeiro — permite trocar modelo rapidamente via env var
        if settings.OPENROUTER_API_KEY:
            self.providers.append(("openrouter", OpenRouterExtractor()))
            logger.info(
                f"OpenRouter provider initialized (model: {settings.OPENROUTER_MODEL})"
            )

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

        if not self.providers and not (self.lite_extractor or self.standard_extractor):
            raise ValueError("Nenhum provedor de LLM configurado")

    async def extract(
        self, image_bytes: bytes, mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Tenta extrair com fallback entre provedores (imagem única)."""
        return await self.extract_multiple([(image_bytes, mime_type)])

    async def extract_multiple(
        self,
        images: list[tuple[bytes, str]],
    ) -> ExtractedInvoiceData:
        """Tenta extrair de múltiplas imagens com fallback entre provedores.

        Todas as imagens são enviadas numa única request à LLM,
        que combina os dados internamente.

        Args:
            images: Lista de (image_bytes, mime_type)

        Returns:
            ExtractedInvoiceData com dados extraídos

        Raises:
            ValueError: Se todos os provedores falharem
        """
        # Validar imagens
        if not images:
            raise ValueError("At least one image is required")

        # Log detalhado do tamanho de cada imagem
        image_sizes = [len(b) for b, _ in images]
        total_size = sum(image_sizes)
        image_size_mb = total_size / (1024 * 1024)

        logger.info(
            f"📸 INICIANDO EXTRAÇÃO DE NOTA FISCAL | "
            f"{len(images)} imagem(ns), {image_size_mb:.2f}MB total"
        )

        # --- SMART SELECTION LOGIC ---
        # 1. Se tivermos os extratores otimizados configurados (via OpenRouter)
        if self.lite_extractor and self.standard_extractor:
            result = await self._smart_extraction(images)
            if result:
                return result
            # Se _smart_extraction retornou None (ou falhou internamente e capturou),
            # caímos para o fallback dos providers tradicionais abaixo.
            logger.info("⚠ Smart extraction failed/skipped, falling back to standard providers list")

        # --- FALLBACK: Lista de provedores configurados ---


        # Gerar cache key baseada na primeira imagem
        cache_image = images[0][0]

        errors = []

        for provider_name, extractor in self.providers:
            # Verificar cache primeiro
            cached = await get_cached_extraction(provider_name, cache_image)
            if cached:
                logger.info(
                    f"✓ SUCESSO - Cache hit para {provider_name}",
                    extra={
                        "provider": provider_name,
                        "source": "cache",
                        "confidence": cached.get("confidence"),
                    },
                )
                return ExtractedInvoiceData(**cached)

            try:
                logger.info(f"→ Tentando extração com {provider_name}...")
                result = await extractor.extract_multiple(images)

                # Salvar em cache
                await cache_extraction(provider_name, cache_image, result.model_dump())

                logger.info(
                    f"✓ SUCESSO - Extração completa com {provider_name.upper()}",
                    extra={
                        "provider": provider_name,
                        "source": "api",
                        "confidence": result.confidence,
                        "invoice_number": result.number,
                        "issuer": result.issuer_name,
                        "total_value": result.total_value,
                        "items_count": len(result.items),
                    },
                )
                return result

            except Exception as e:
                logger.warning(
                    f"✗ FALHA - Provider {provider_name} falhou: {e!s}",
                    extra={"provider": provider_name, "error": str(e)},
                )
                errors.append(f"{provider_name}: {e!s}")
                continue

        logger.error(
            f"✗✗✗ FALHA COMPLETA - Todos os {len(self.providers)} provedores falharam",
            extra={"errors": errors, "providers_count": len(self.providers)},
        )
        raise ValueError(f"Extração falhou com todos os provedores: {errors}")

    async def extract_with_preference(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        preferred_provider: str = "gemini",
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
            (name, ext) for name, ext in self.providers if name == preferred_provider
        ] + [(name, ext) for name, ext in self.providers if name != preferred_provider]

        errors = []

        for provider_name, extractor in reordered:
            try:
                result = await extractor.extract(image_bytes, mime_type)
                return result
            except Exception as e:
                errors.append(f"{provider_name}: {e!s}")
                continue

        raise ValueError(f"Extração falhou: {errors}")

    async def _smart_extraction(
        self, images: list[tuple[bytes, str]]
    ) -> ExtractedInvoiceData | None:
        """Tentativa otimizada de extração."""
        # Gerar chave de cache para a primeira imagem
        cache_image = images[0][0]

        # Caso 1: Apenas 1 imagem -> Tentar Lite
        if len(images) == 1:
            try:
                # Verificar cache primeiro
                cached = await get_cached_extraction("openrouter_lite", cache_image)
                if cached:
                    logger.info("✓ SUCESSO - Cache hit para openrouter_lite")
                    return ExtractedInvoiceData(**cached)

                logger.info(f"→ Tentando extração RÁPIDA (Lite) com modelo: {self.lite_extractor.model_name}...")
                if not self.lite_extractor:
                    # Should not accept if logic is correct, but safe guard
                     raise ValueError("Lite extractor not initialized")

                result = await self.lite_extractor.extract_multiple(images)

                # Salvar cache
                await cache_extraction("openrouter_lite", cache_image, result.model_dump())

                logger.info(f"✓ SUCESSO - Extração Lite completa com modelo: {self.lite_extractor.model_name}")
                return result
            except Exception as e:
                logger.warning(f"⚠ Extração Lite falhou: {e}. Tentando Standard...")
                # Fallthrough to standard

        # Caso 2: Múltiplas imagens OU falha no Lite -> Standard
        try:
            # Verificar cache (poderia usar chave diferente, mas ok)
            cached = await get_cached_extraction("openrouter_standard", cache_image)
            if cached:
                logger.info("✓ SUCESSO - Cache hit para openrouter_standard")
                return ExtractedInvoiceData(**cached)

            logger.info(f"→ Tentando extração ROBUSTA (Standard) com modelo: {self.standard_extractor.model_name}...")
            if not self.standard_extractor:
                 raise ValueError("Standard extractor not initialized")

            result = await self.standard_extractor.extract_multiple(images)

            # Salvar cache
            await cache_extraction("openrouter_standard", cache_image, result.model_dump())

            logger.info(f"✓ SUCESSO - Extração Standard completa com modelo: {self.standard_extractor.model_name}")
            return result
        except Exception as e:
            logger.error(f"⚠ Extração Standard falhou: {e}")
            return None  # Retorna None para acionar fallback tradicional


# Instância global com todos os provedores disponíveis
try:
    extractor = MultiProviderExtractor()
except ValueError as e:
    logger.error(f"Falha ao inicializar extrator: {e}")
    raise RuntimeError(
        "Nenhum provedor de LLM configurado. "
        "Configure GEMINI_API_KEY, OPENAI_API_KEY ou ANTHROPIC_API_KEY no arquivo .env"
    ) from e
