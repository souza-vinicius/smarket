import base64
import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from src.config import settings
from src.schemas.invoice_processing import ExtractedInvoiceData, ExtractedItem

logger = logging.getLogger(__name__)

# Prompt otimizado para extração de notas fiscais brasileiras
EXTRACTION_PROMPT = """
Você é um especialista em extrair dados de notas fiscais brasileiras
(NFC-e/NF-e). Analise a imagem e extraia os seguintes campos em
formato JSON:

{
    "access_key": "chave de acesso de 44 dígitos (campo obrigatório)",
    "number": "número da nota",
    "series": "série da nota",
    "issue_date": "data de emissão no formato ISO 8601",
    "issuer": {
        "cnpj": "CNPJ do emitente",
        "name": "razão social do emitente"
    },
    "total_value": "valor total da nota como número",
    "items": [
        {
            "description": "descrição do produto",
            "quantity": "quantidade como número",
            "unit": "unidade (ex: UN, KG, LT)",
            "unit_price": "preço unitário como número",
            "total_price": "preço total como número"
        }
    ],
    "confidence": 0.0-1.0,
    "warnings": ["avisos sobre problemas na leitura"]
}

Se a imagem não contiver uma nota fiscal válida, retorne:
{
    "error": "Descrição do problema",
    "is_invoice": false
}

Formato de resposta: JSON válido, sem markdown.
"""


class GeminiExtractor:
    """Serviço de extração de dados de notas fiscais usando Gemini 3.0 Flash"""

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-3.0-flash"

    async def extract_from_image(
        self,
        image_bytes: bytes,
        image_mime_type: str = "image/jpeg"
    ) -> ExtractedInvoiceData:
        """Extrai dados de uma imagem de nota fiscal.

        Args:
            image_bytes: Conteúdo da imagem em bytes
            image_mime_type: Tipo MIME da imagem (image/jpeg, image/png, etc)

        Returns:
            ExtractedInvoiceData com dados estruturados

        Raises:
            ValueError: Se a imagem não contiver uma nota fiscal válida
            Exception: Se houver erro na chamada à API
        """

        # Converter para base64
        image_base64 = base64.standard_b64encode(image_bytes).decode("utf-8")

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(
                                "Extraia os dados desta nota fiscal:"
                            ),
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=image_mime_type,
                                    data=image_base64
                                )
                            )
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    system_instruction=EXTRACTION_PROMPT,
                    temperature=0.1,
                    max_output_tokens=2048
                )
            )

            # Parse resposta JSON
            response_text = response.text
            data = json.loads(response_text)

            # Verificar se houve erro
            if "error" in data:
                raise ValueError(f"Extração falhou: {data['error']}")

            # Converter para schema
            return self._parse_response(data)

        except json.JSONDecodeError as e:
            logger.error(f"Erro ao fazer parse JSON: {e}")
            raise ValueError(f"Resposta inválida do Gemini: {str(e)}")
        except Exception as e:
            logger.error(f"Erro na extração com Gemini: {e}")
            raise

    def _parse_response(self, data: dict) -> ExtractedInvoiceData:
        """Parse e validação da resposta do Gemini.

        Args:
            data: Dicionário com dados extraídos

        Returns:
            ExtractedInvoiceData validado

        Raises:
            ValueError: Se dados obrigatórios estiverem faltando
        """

        # Extrair issuer
        issuer = data.get("issuer", {})

        # Converter items
        items = []
        for item_data in data.get("items", []):
            items.append(
                ExtractedItem(
                    description=item_data.get("description"),
                    quantity=self._to_decimal(item_data.get("quantity")),
                    unit=item_data.get("unit"),
                    unit_price=self._to_decimal(item_data.get("unit_price")),
                    total_price=self._to_decimal(item_data.get("total_price"))
                )
            )

        return ExtractedInvoiceData(
            access_key=data.get("access_key"),
            number=data.get("number"),
            series=data.get("series"),
            issue_date=data.get("issue_date"),
            issuer_name=issuer.get("name"),
            issuer_cnpj=issuer.get("cnpj"),
            total_value=self._to_decimal(data.get("total_value")),
            items=items,
            confidence=float(data.get("confidence", 0.0)),
            warnings=data.get("warnings", [])
        )

    @staticmethod
    def _to_decimal(value: Optional[str | int | float]) -> Optional[float]:
        """Converte valor para float.

        Args:
            value: Valor a converter

        Returns:
            Float ou None se valor for None
        """

        if value is None:
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            return None


# Instância global
extractor = GeminiExtractor()
