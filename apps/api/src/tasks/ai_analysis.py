import asyncio
import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import AsyncSessionLocal
from src.models.analysis import Analysis
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.user import User
from src.services.ai_analyzer import analyzer

logger = logging.getLogger(__name__)

RETRY_DELAYS = [2, 5, 10]


async def run_ai_analysis(invoice_id: str, user_id: str) -> None:
    """Run AI analysis for an invoice in the background.

    Creates its own DB session, loads the invoice, runs analysis,
    and persists results. Retries up to 3 times on transient errors.

    Args:
        invoice_id: UUID string of the invoice to analyze.
        user_id: UUID string of the invoice owner.
    """
    logger.info(
        "ai_analysis_task_started",
        extra={"invoice_id": invoice_id, "user_id": user_id},
    )

    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            async with AsyncSessionLocal() as db:
                # Load invoice
                result = await db.execute(
                    select(Invoice).where(Invoice.id == uuid.UUID(invoice_id))
                )
                invoice = result.scalar_one_or_none()

                if not invoice:
                    logger.warning(
                        "ai_analysis_invoice_not_found",
                        extra={"invoice_id": invoice_id},
                    )
                    return

                # Load user profile for personalized analyses
                user_result = await db.execute(
                    select(User).where(User.id == uuid.UUID(user_id))
                )
                user = user_result.scalar_one_or_none()

                user_history = await _get_user_history(uuid.UUID(user_id), db)
                analyses = await analyzer.analyze_invoice(
                    invoice, user_history, db, user=user
                )

                for analysis in analyses:
                    db.add(analysis)
                await db.commit()

            logger.info(
                "ai_analysis_completed",
                extra={
                    "invoice_id": invoice_id,
                    "user_id": user_id,
                    "analyses_count": len(analyses),
                },
            )
            return

        except Exception as e:
            if attempt < len(RETRY_DELAYS):
                delay = RETRY_DELAYS[attempt]
                logger.warning(
                    "ai_analysis_retry",
                    extra={
                        "invoice_id": invoice_id,
                        "attempt": attempt + 1,
                        "delay": delay,
                        "error": str(e),
                    },
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "ai_analysis_failed",
                    extra={
                        "invoice_id": invoice_id,
                        "user_id": user_id,
                        "attempts": attempt + 1,
                        "error": str(e),
                    },
                    exc_info=True,
                )


async def _get_user_history(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Get user's purchase history for AI analysis."""
    result = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.user_id == user_id)
    )
    total_invoices = result.scalar() or 0

    result = await db.execute(
        select(func.sum(Invoice.total_value)).where(Invoice.user_id == user_id)
    )
    total_spent = result.scalar() or 0

    result = await db.execute(
        select(
            InvoiceItem.category_name,
            func.sum(InvoiceItem.total_price).label("total"),
        )
        .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
        .where(Invoice.user_id == user_id)
        .group_by(InvoiceItem.category_name)
        .order_by(func.sum(InvoiceItem.total_price).desc())
        .limit(5)
    )
    top_categories = result.all()

    return {
        "total_invoices": total_invoices,
        "total_spent": float(total_spent),
        "top_categories": [
            {"category": cat[0], "total": float(cat[1])} for cat in top_categories
        ],
    }
