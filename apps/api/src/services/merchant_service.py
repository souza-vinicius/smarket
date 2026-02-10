import logging
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.invoice import Invoice
from src.models.merchant import Merchant

logger = logging.getLogger(__name__)

class MerchantService:
    @staticmethod
    async def get_or_create_merchant(
        db: AsyncSession,
        user_id: uuid.UUID,
        cnpj: str,
        name: str,
        category: Optional[str] = None,
    ) -> Merchant:
        """
        Get an existing merchant by CNPJ or create a new one.
        Ensures a merchant is unique per user_id + cnpj.
        """
        # Clean CNPJ just in case
        cnpj = "".join(c for c in cnpj if c.isdigit())

        if not cnpj:
            logger.warning(f"Attempted to get_or_create_merchant with empty CNPJ for user {user_id}")
            # If no CNPJ, we can't reliably link/deduplicate.
            # In a real app we might use name, but CNPJ is our primary key for merchants.
            return None

        # Check existing
        result = await db.execute(
            select(Merchant).where(
                and_(Merchant.user_id == user_id, Merchant.cnpj == cnpj)
            )
        )
        merchant = result.scalar_one_or_none()

        if not merchant:
            logger.info(f"Creating new merchant: {name} (CNPJ: {cnpj}) for user {user_id}")
            merchant = Merchant(
                user_id=user_id,
                cnpj=cnpj,
                name=name,
                category=category,
                visit_count=0,
                total_spent=Decimal("0.00"),
                average_ticket=Decimal("0.00"),
            )
            db.add(merchant)
            await db.flush()
        else:
            # Update name if it was generic and now we have a better one
            if name and (not merchant.name or len(name) > len(merchant.name)):
                merchant.name = name

            if category and not merchant.category:
                merchant.category = category

        return merchant

    @staticmethod
    async def link_invoice_to_merchant(
        db: AsyncSession,
        invoice: Invoice
    ) -> bool:
        """
        Link a single invoice to a merchant based on its issuer_cnpj.
        Updates merchant stats.
        """
        if not invoice.issuer_cnpj:
            return False

        merchant = await MerchantService.get_or_create_merchant(
            db=db,
            user_id=invoice.user_id,
            cnpj=invoice.issuer_cnpj,
            name=invoice.issuer_name
        )

        if merchant:
            invoice.merchant_id = merchant.id

            # Update merchant stats (simple version)
            # In a more robust system, this might be handled by a task or triggers
            merchant.visit_count += 1
            merchant.total_spent += invoice.total_value
            if merchant.visit_count > 0:
                merchant.average_ticket = merchant.total_spent / merchant.visit_count

            merchant.last_visit = invoice.issue_date
            if not merchant.first_visit or invoice.issue_date < merchant.first_visit:
                merchant.first_visit = invoice.issue_date

            return True

        return False

    @staticmethod
    async def link_all_unlinked_invoices(
        db: AsyncSession,
        user_id: uuid.UUID
    ) -> int:
        """
        Backfill: Find all invoices for a user that don't have a merchant_id
        and try to link them.
        """
        result = await db.execute(
            select(Invoice).where(
                and_(
                    Invoice.user_id == user_id,
                    Invoice.merchant_id.is_(None),
                    Invoice.issuer_cnpj.isnot(None),
                    Invoice.issuer_cnpj != ""
                )
            )
        )
        unlinked_invoices = result.scalars().all()

        if not unlinked_invoices:
            return 0

        count = 0
        for invoice in unlinked_invoices:
            success = await MerchantService.link_invoice_to_merchant(db, invoice)
            if success:
                count += 1

        if count > 0:
            await db.commit()
            logger.info(f"Backfilled {count} merchants for user {user_id}")

        return count

merchant_service = MerchantService()
