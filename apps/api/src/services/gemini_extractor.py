import base64
import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import PydanticOutputParser

from src.config import settings
from src.schemas.invoice_processing import ExtractedInvoiceData

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


class LangChainGeminiExtractor:
    """Serviço de extração usando LangChain + Google Gemini"""

    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.1,
            max_output_tokens=2048
        )
        self.parser = PydanticOutputParser(
            pydantic_object=ExtractedInvoiceData
        )

    async def extract_from_image(
        self,
        image_bytes: bytes,
        image_mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Extrai dados de uma imagem de nota fiscal.

        Args:
            image_bytes: Conteúdo da imagem em bytes
            image_mime_type: Tipo MIME da imagem

        Returns:
            ExtractedInvoiceData com dados estruturados
        """

        # Converter imagem para base64
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        image_url = f"data:{image_mime_type};base64,{image_base64}"

        try:
            # Criar mensagem com imagem
            message = HumanMessage(
                content=[
                    {"type": "text", "text": SYSTEM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    }
                ]
            )

            # Executar chain
            chain = self.parser
            response = await self.llm.ainvoke([message])

            # Parse da resposta
            result = chain.parse(response.content)
            return result

        except Exception as e:
            logger.error(f"Erro na extração com LangChain: {e}")
            raise ValueError(f"Extração falhou: {str(e)}")


# DEPRECATED: Use multi_provider_extractor for automatic fallback
# Only instantiate if you specifically need Gemini
# extractor = LangChainGeminiExtractor()
