# apps/api/src/exceptions.py
from fastapi import HTTPException, status

from src.utils.logger import logger


class MercadoEspertoException(Exception):
    """Base exception for Mercado Esperto application."""

    def __init__(self, message: str, detail: str = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class InvoiceProcessingError(MercadoEspertoException):
    """Raised when invoice processing fails."""

    pass


class InvoiceAlreadyExistsError(MercadoEspertoException):
    """Raised when trying to add a duplicate invoice."""

    pass


class InvalidInvoiceFormatError(MercadoEspertoException):
    """Raised when invoice format is invalid."""

    pass


class ExternalServiceError(MercadoEspertoException):
    """Raised when external service (Sefaz, OpenAI) fails."""

    pass


class AIServiceError(MercadoEspertoException):
    """Raised when AI analysis fails."""

    pass


class SubscriptionError(MercadoEspertoException):
    """Raised when subscription operation fails."""

    pass


class UsageLimitExceededError(MercadoEspertoException):
    """Raised when user exceeds plan limits."""

    pass


def handle_exception(exc: Exception) -> HTTPException:
    """Convert custom exceptions to HTTP responses."""
    if isinstance(exc, InvoiceAlreadyExistsError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=exc.message
        )
    elif isinstance(exc, InvalidInvoiceFormatError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message
        )
    elif isinstance(exc, ExternalServiceError):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="External service unavailable. Please try again later.",
        )
    elif isinstance(exc, AIServiceError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI analysis service unavailable. "
                "Your invoice will be processed shortly."
            ),
        )
    else:
        # Log unexpected errors
        logger.error("unexpected_error", error=str(exc), exc_info=True)
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later.",
        )
