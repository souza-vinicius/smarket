import pytest
from unittest.mock import Mock, patch, AsyncMock

from src.services.gemini_extractor import LangChainGeminiExtractor
from src.schemas.invoice_processing import ExtractedInvoiceData, ExtractedItem

SAMPLE_ACCESS_KEY = "53190101000101000101550010000012341000000123"


class TestLangChainGeminiExtractor:
    """Testes para o extrator LangChain + Gemini"""

    @pytest.fixture
    def extractor(self):
        """Fixture do extractor com mocks."""
        with patch('src.services.gemini_extractor.ChatGoogleGenerativeAI'):
            extractor = LangChainGeminiExtractor()
            return extractor

    @pytest.fixture
    def sample_image_bytes(self):
        """Bytes de imagem mockados."""
        return b"fake image data for testing"

    @pytest.fixture
    def mock_llm_response(self):
        """Resposta mockada do LLM."""
        response = Mock()
        response.content = """
        {
            "access_key": "53190101000101000101550010000012341000000123",
            "number": "00001234",
            "series": "1",
            "issue_date": "2024-01-15T10:30:00",
            "issuer_name": "SUPERMERCADO EXEMPLO LTDA",
            "issuer_cnpj": "01234567000123",
            "total_value": 150.50,
            "items": [
                {
                    "description": "ARROZ 5KG",
                    "quantity": 1.0,
                    "unit": "UN",
                    "unit_price": 25.00,
                    "total_price": 25.00
                },
                {
                    "description": "FEIJAO 1KG",
                    "quantity": 2.0,
                    "unit": "UN",
                    "unit_price": 8.50,
                    "total_price": 17.00
                }
            ],
            "confidence": 0.95,
            "warnings": []
        }
        """
        return response

    @pytest.mark.asyncio
    async def test_extract_from_image_success(
        self,
        extractor,
        sample_image_bytes,
        mock_llm_response
    ):
        """Testa extração bem-sucedida."""
        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_llm_response

            result = await extractor.extract_from_image(sample_image_bytes)

            assert isinstance(result, ExtractedInvoiceData)
            assert result.access_key == SAMPLE_ACCESS_KEY
            assert result.number == "00001234"
            assert result.series == "1"
            assert result.issuer_name == "SUPERMERCADO EXEMPLO LTDA"
            assert result.total_value == 150.50
            assert len(result.items) == 2
            assert result.confidence == 0.95

    @pytest.mark.asyncio
    async def test_extract_from_image_handles_error(
        self,
        extractor,
        sample_image_bytes
    ):
        """Testa tratamento de erro."""
        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.side_effect = Exception("API Error")

            with pytest.raises(ValueError) as exc_info:
                await extractor.extract_from_image(sample_image_bytes)

            assert "Extração falhou" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_extract_with_invalid_json(
        self,
        extractor,
        sample_image_bytes
    ):
        """Testa resposta JSON inválida."""
        mock_response = Mock()
        mock_response.content = "not a json response"

        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_response

            with pytest.raises(ValueError):
                await extractor.extract_from_image(sample_image_bytes)

    @pytest.mark.asyncio
    async def test_extract_with_missing_fields(
        self,
        extractor,
        sample_image_bytes
    ):
        """Testa resposta com campos faltando."""
        mock_response = Mock()
        mock_response.content = '{"access_key": "12345"}'

        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_response

            with pytest.raises(Exception):
                await extractor.extract_from_image(sample_image_bytes)

    @pytest.mark.asyncio
    async def test_extract_multiple_items(
        self,
        extractor,
        sample_image_bytes,
        mock_llm_response
    ):
        """Testa extração de múltiplos itens."""
        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_llm_response

            result = await extractor.extract_from_image(sample_image_bytes)

            assert len(result.items) == 2

            # Verifica primeiro item
            assert result.items[0].description == "ARROZ 5KG"
            assert result.items[0].quantity == 1.0
            assert result.items[0].unit_price == 25.00

            # Verifica segundo item
            assert result.items[1].description == "FEIJAO 1KG"
            assert result.items[1].quantity == 2.0
            assert result.items[1].unit_price == 8.50

    @pytest.mark.asyncio
    async def test_extract_confidence_score(
        self,
        extractor,
        sample_image_bytes,
        mock_llm_response
    ):
        """Testa score de confiança."""
        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_llm_response

            result = await extractor.extract_from_image(sample_image_bytes)

            assert result.confidence == 0.95
            assert 0.0 <= result.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_extract_with_warnings(
        self,
        extractor,
        sample_image_bytes
    ):
        """Testa extração com avisos."""
        mock_response = Mock()
        mock_response.content = """
        {
            "access_key": "53190101000101000101550010000012341000000123",
            "number": "00001234",
            "series": "1",
            "issue_date": "2024-01-15T10:30:00",
            "issuer_name": "LOJA TESTE",
            "issuer_cnpj": "01234567000123",
            "total_value": 100.00,
            "items": [],
            "confidence": 0.70,
            "warnings": ["Imagem de baixa qualidade"]
        }
        """

        with patch.object(
            extractor.llm, 'ainvoke', new_callable=AsyncMock
        ) as mock_invoke:
            mock_invoke.return_value = mock_response

            result = await extractor.extract_from_image(sample_image_bytes)

            assert len(result.warnings) == 1
            assert "Imagem de baixa qualidade" in result.warnings[0]
            assert result.confidence == 0.70


class TestExtractedItem:
    """Testes para o schema ExtractedItem."""

    def test_create_item(self):
        """Testa criação de item."""
        item = ExtractedItem(
            description="ARROZ 5KG",
            quantity=2.0,
            unit="UN",
            unit_price=25.00,
            total_price=50.00
        )

        assert item.description == "ARROZ 5KG"
        assert item.quantity == 2.0
        assert item.unit == "UN"
        assert item.unit_price == 25.00
        assert item.total_price == 50.00

    def test_create_item_with_none_values(self):
        """Testa criação de item com valores None."""
        item = ExtractedItem(
            description=None,
            quantity=None,
            unit=None,
            unit_price=None,
            total_price=None
        )

        assert item.description is None
        assert item.quantity is None


class TestExtractedInvoiceData:
    """Testes para o schema ExtractedInvoiceData."""

    def test_create_invoice_data(self):
        """Testa criação de dados de invoice."""
        items = [
            ExtractedItem(
                description="PRODUTO 1",
                quantity=1.0,
                unit="UN",
                unit_price=10.00,
                total_price=10.00
            )
        ]

        data = ExtractedInvoiceData(
            access_key="12345",
            number="001",
            series="1",
            issuer_name="LOJA TESTE",
            total_value=10.00,
            items=items,
            confidence=0.95
        )

        assert data.access_key == "12345"
        assert data.number == "001"
        assert len(data.items) == 1
        assert data.confidence == 0.95

    def test_invoice_data_defaults(self):
        """Testa valores padrão."""
        data = ExtractedInvoiceData()

        assert data.access_key is None
        assert data.number is None
        assert data.items == []
        assert data.confidence == 0.0
        assert data.warnings == []
