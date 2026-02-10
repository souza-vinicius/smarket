"""
Token usage tracking callback for LangChain LLM providers.

This module provides a callback handler that extracts and logs token usage
from LLM responses, working with multiple providers (OpenRouter, Gemini, OpenAI, Anthropic).
"""

import logging
from langchain_core.callbacks import BaseCallbackHandler

logger = logging.getLogger(__name__)


class TokenUsageCallback(BaseCallbackHandler):
    """Callback to track and log token usage for all LLM providers.

    This callback intercepts LLM responses and extracts token usage from multiple
    sources (llm_output, response_metadata, generation_info) to ensure compatibility
    with different providers.

    Attributes:
        provider_name: Name of the LLM provider (e.g., "OpenRouter", "Gemini")
        model_name: Name of the specific model being used
        input_tokens: Number of input/prompt tokens consumed
        output_tokens: Number of output/completion tokens generated
        total_tokens: Total tokens (input + output)
    """

    def __init__(self, provider_name: str, model_name: str):
        """Initialize the callback with provider and model information.

        Args:
            provider_name: Name of the LLM provider for logging
            model_name: Specific model identifier
        """
        self.provider_name = provider_name
        self.model_name = model_name
        self.input_tokens = 0
        self.output_tokens = 0
        self.total_tokens = 0

    def on_llm_end(self, response, **kwargs) -> None:
        """Called when LLM finishes. Extract token usage from multiple sources.

        This method tries multiple extraction strategies in order:
        1. llm_output.token_usage or llm_output.usage (primary)
        2. response_metadata.usage (fallback)
        3. generations[].generation_info.usage (fallback)

        Args:
            response: LangChain LLMResult object containing the response
            **kwargs: Additional keyword arguments (unused)
        """
        try:
            usage = None

            # DEBUG: Log response structure (helps diagnose issues)
            logger.debug(f"DEBUG {self.provider_name}: Response type: {type(response)}")
            logger.debug(
                f"DEBUG {self.provider_name}: Has llm_output: "
                f"{hasattr(response, 'llm_output')}"
            )
            if hasattr(response, "llm_output") and response.llm_output:
                logger.debug(
                    f"DEBUG {self.provider_name}: llm_output keys: "
                    f"{list(response.llm_output.keys())}"
                )

            # Try 1: llm_output.token_usage or llm_output.usage (primary)
            if hasattr(response, "llm_output") and response.llm_output:
                usage = response.llm_output.get("token_usage") or response.llm_output.get(
                    "usage"
                )
                if usage:
                    logger.debug(
                        f"DEBUG {self.provider_name}: Found usage in llm_output: {usage}"
                    )

            # Try 2: response_metadata.usage (fallback for some providers)
            if not usage and hasattr(response, "response_metadata"):
                usage = response.response_metadata.get("usage")
                if usage:
                    logger.debug(
                        f"DEBUG {self.provider_name}: Found usage in response_metadata"
                    )

            # Try 3: Check for generations with usage info (fallback)
            if not usage and hasattr(response, "generations"):
                for gen_list in response.generations:
                    for gen in gen_list:
                        if hasattr(gen, "generation_info") and gen.generation_info:
                            usage = gen.generation_info.get("usage")
                            if usage:
                                logger.debug(
                                    f"DEBUG {self.provider_name}: "
                                    f"Found usage in generation_info"
                                )
                                break
                    if usage:
                        break

            if usage:
                # Extract tokens (handle different field names across providers)
                # OpenAI/OpenRouter: prompt_tokens, completion_tokens, total_tokens
                # Gemini: input_tokens, output_tokens
                self.input_tokens = usage.get("prompt_tokens", usage.get("input_tokens", 0))
                self.output_tokens = usage.get(
                    "completion_tokens", usage.get("output_tokens", 0)
                )
                self.total_tokens = usage.get(
                    "total_tokens", self.input_tokens + self.output_tokens
                )

                # Log token usage with emoji for visibility
                logger.info(
                    f"💰 {self.provider_name} [{self.model_name}]: "
                    f"Input={self.input_tokens:,} tokens, "
                    f"Output={self.output_tokens:,} tokens, "
                    f"Total={self.total_tokens:,} tokens"
                )
            else:
                # No usage found in any location - log warning
                logger.warning(
                    f"⚠️  {self.provider_name}: Token usage not available "
                    f"(no metadata found in response)"
                )

        except Exception as e:
            # Log errors but don't raise - token tracking should never break extraction
            logger.error(
                f"❌ {self.provider_name}: Error extracting token usage: {e}",
                exc_info=True,
            )

    def on_llm_error(self, error: Exception, **kwargs) -> None:
        """Called when LLM encounters an error.

        Args:
            error: The exception that occurred
            **kwargs: Additional keyword arguments (unused)
        """
        logger.error(f"❌ {self.provider_name}: LLM error - {error}")
