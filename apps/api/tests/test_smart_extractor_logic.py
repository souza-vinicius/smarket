
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from src.services.multi_provider_extractor import MultiProviderExtractor
from src.schemas.invoice_processing import ExtractedInvoiceData

class TestSmartExtractorLogic(unittest.IsolatedAsyncioTestCase):
    def configure_mock_settings(self, mock_settings):
        # Default all keys to empty string to prevent unwanted provider init
        mock_settings.OPENROUTER_API_KEY = ""
        mock_settings.GEMINI_API_KEY = ""
        mock_settings.OPENAI_API_KEY = ""
        mock_settings.ANTHROPIC_API_KEY = ""
        mock_settings.OPENROUTER_MODEL = "google/gemini-2.0-flash-001"
        # Mock the new model settings
        mock_settings.OPENROUTER_MODEL_LITE = "google/gemini-2.0-flash-lite-preview-02-05"
        mock_settings.OPENROUTER_MODEL_FULL = "google/gemini-2.0-flash-thinking-exp-01-21"
        return mock_settings

    @patch("src.services.multi_provider_extractor.settings")
    @patch("src.services.multi_provider_extractor.OpenRouterExtractor")
    async def test_smart_selection_initialization(self, mock_or_extractor, mock_settings):
        self.configure_mock_settings(mock_settings)
        # Setup settings with OpenRouter Key
        mock_settings.OPENROUTER_API_KEY = "dummy_key"

        # Initialize
        extractor = MultiProviderExtractor()

        # Verify both specialized extractors are initialized
        self.assertIsNotNone(extractor.lite_extractor)
        self.assertIsNotNone(extractor.standard_extractor)

        # Check call args to verify model names
        calls = mock_or_extractor.call_args_list
        model_names = [call.kwargs.get('model') for call in calls]
        print(f"Initialized models: {model_names}")

        self.assertIn("google/gemini-2.0-flash-lite-preview-02-05", model_names)
        self.assertIn("google/gemini-2.0-flash-thinking-exp-01-21", model_names)

    @patch("src.services.multi_provider_extractor.settings")
    @patch("src.services.multi_provider_extractor.OpenRouterExtractor")
    @patch("src.services.multi_provider_extractor.get_cached_extraction", new_callable=AsyncMock)
    @patch("src.services.multi_provider_extractor.cache_extraction", new_callable=AsyncMock)
    async def test_single_image_logic(self, mock_cache_ext, mock_get_cache, mock_or_extractor, mock_settings):
        self.configure_mock_settings(mock_settings)
        mock_settings.OPENROUTER_API_KEY = "dummy_key"
        mock_get_cache.return_value = None

        # Setup mock instances
        lite_instance = AsyncMock()
        standard_instance = AsyncMock()

        # Configure side_effect to return specific instances based on model
        def side_effect(model=None):
            if model == mock_settings.OPENROUTER_MODEL_LITE:
                return lite_instance
            if model == mock_settings.OPENROUTER_MODEL_FULL:
                return standard_instance
            return AsyncMock()

        mock_or_extractor.side_effect = side_effect

        extractor = MultiProviderExtractor()

        # Force set them in case initialization logic didn't pick up the exact mock instances (though side_effect should work)
        extractor.lite_extractor = lite_instance
        extractor.standard_extractor = standard_instance

        # Test 1 Image -> Lite
        dummy_image = (b"image_data", "image/jpeg")
        await extractor.extract_multiple([dummy_image])

        lite_instance.extract_multiple.assert_called_once()
        standard_instance.extract_multiple.assert_not_called()

    @patch("src.services.multi_provider_extractor.settings")
    @patch("src.services.multi_provider_extractor.OpenRouterExtractor")
    @patch("src.services.multi_provider_extractor.get_cached_extraction", new_callable=AsyncMock)
    @patch("src.services.multi_provider_extractor.cache_extraction", new_callable=AsyncMock)
    async def test_multiple_images_logic(self, mock_cache_ext, mock_get_cache, mock_or_extractor, mock_settings):
        self.configure_mock_settings(mock_settings)
        mock_settings.OPENROUTER_API_KEY = "dummy_key"
        mock_get_cache.return_value = None

        lite_instance = AsyncMock()
        standard_instance = AsyncMock()

        extractor = MultiProviderExtractor()
        extractor.lite_extractor = lite_instance
        extractor.standard_extractor = standard_instance

        # Test 2 Images -> Standard
        dummy_image = (b"image_data", "image/jpeg")
        await extractor.extract_multiple([dummy_image, dummy_image])

        lite_instance.extract_multiple.assert_not_called()
        standard_instance.extract_multiple.assert_called_once()

    @patch("src.services.multi_provider_extractor.settings")
    @patch("src.services.multi_provider_extractor.OpenRouterExtractor")
    @patch("src.services.multi_provider_extractor.get_cached_extraction", new_callable=AsyncMock)
    @patch("src.services.multi_provider_extractor.cache_extraction", new_callable=AsyncMock)
    async def test_fallback_logic(self, mock_cache_ext, mock_get_cache, mock_or_extractor, mock_settings):
        self.configure_mock_settings(mock_settings)
        mock_settings.OPENROUTER_API_KEY = "dummy_key"
        mock_get_cache.return_value = None

        lite_instance = AsyncMock()
        standard_instance = AsyncMock()

        # Lite fails
        lite_instance.extract_multiple.side_effect = Exception("Lite failed")

        extractor = MultiProviderExtractor()
        extractor.lite_extractor = lite_instance
        extractor.standard_extractor = standard_instance

        # Test 1 Image -> Lite FAILS -> Standard
        dummy_image = (b"image_data", "image/jpeg")
        await extractor.extract_multiple([dummy_image])

        lite_instance.extract_multiple.assert_called_once()
        standard_instance.extract_multiple.assert_called_once()

if __name__ == "__main__":
    unittest.main()
