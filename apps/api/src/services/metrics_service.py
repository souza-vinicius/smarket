"""
Metrics service for SaaS KPI calculations.

Provides calculations for MRR, churn, ARPU, LTV, and other metrics.
All calculations use direct SQL queries for accuracy.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.invoice import Invoice
from src.models.invoice_processing import InvoiceProcessing
from src.models.payment import Payment
from src.models.subscription import Subscription, SubscriptionStatus
from src.models.user import User

logger = structlog.get_logger()


class MetricsService:
    """Service for calculating SaaS metrics and KPIs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self) -> dict:
        """
        Get high-level KPIs for admin dashboard.

        Returns:
            Dict with all key metrics
        """
        now = datetime.utcnow()

        # User counts
        total_users = await self._get_total_users()
        active_users = await self._get_active_users()
        paying_users = await self._get_paying_users()
        trial_users = await self._get_trial_users()

        # Revenue metrics
        mrr = await self._calculate_mrr()
        arr = mrr * 12
        arpu = await self._calculate_arpu(mrr, paying_users)

        # Growth metrics
        churn_rate = await self._calculate_churn_rate()
        trial_conversion_rate = await self._calculate_trial_conversion()

        # Invoice counts
        total_invoices = await self._get_total_invoices()
        invoices_this_month = await self._get_invoices_this_month()

        return {
            "total_users": total_users,
            "active_users": active_users,
            "paying_users": paying_users,
            "trial_users": trial_users,
            "mrr": float(mrr),
            "arr": float(arr),
            "arpu": float(arpu),
            "churn_rate": round(churn_rate, 2),
            "trial_conversion_rate": round(trial_conversion_rate, 2),
            "total_invoices": total_invoices,
            "invoices_this_month": invoices_this_month,
        }

    async def get_revenue_chart_data(self, months: int = 12) -> list:
        """
        Get MRR data points for revenue chart.

        Args:
            months: Number of months to include (default: 12)

        Returns:
            List of monthly revenue data points
        """
        query = text("""
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', NOW() - INTERVAL ':months months'),
                    DATE_TRUNC('month', NOW()),
                    INTERVAL '1 month'
                ) AS month
            ),
            monthly_payments AS (
                SELECT
                    DATE_TRUNC('month', p.created_at) AS month,
                    p.amount,
                    s.billing_cycle
                FROM payments p
                JOIN subscriptions s ON p.subscription_id = s.id
                WHERE p.status = 'succeeded'
                    AND p.created_at >= NOW() - INTERVAL ':months months'
            ),
            mrr_by_month AS (
                SELECT
                    m.month,
                    COALESCE(SUM(
                        CASE
                            WHEN mp.billing_cycle = 'yearly' THEN mp.amount / 12
                            ELSE mp.amount
                        END
                    ), 0) AS mrr
                FROM months m
                LEFT JOIN monthly_payments mp ON DATE_TRUNC('month', mp.month) = m.month
                GROUP BY m.month
                ORDER BY m.month
            )
            SELECT
                TO_CHAR(month, 'YYYY-MM') AS month,
                mrr::float,
                0::float AS new_mrr,
                0::float AS expansion_mrr,
                0::float AS contraction_mrr,
                0::float AS churn_mrr
            FROM mrr_by_month
        """).bindparams(months=months)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "month": row.month,
                "mrr": row.mrr,
                "new_mrr": row.new_mrr,
                "expansion_mrr": row.expansion_mrr,
                "contraction_mrr": row.contraction_mrr,
                "churn_mrr": row.churn_mrr,
            }
            for row in rows
        ]

    async def get_growth_chart_data(self, months: int = 12) -> list:
        """
        Get user growth data points.

        Args:
            months: Number of months to include (default: 12)

        Returns:
            List of monthly growth data points
        """
        query = text("""
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', NOW() - INTERVAL ':months months'),
                    DATE_TRUNC('month', NOW()),
                    INTERVAL '1 month'
                ) AS month
            ),
            users_by_month AS (
                SELECT
                    DATE_TRUNC('month', created_at) AS month,
                    COUNT(*) AS new_users
                FROM users
                WHERE created_at >= NOW() - INTERVAL ':months months'
                GROUP BY DATE_TRUNC('month', created_at)
            ),
            cancelled_by_month AS (
                SELECT
                    DATE_TRUNC('month', cancelled_at) AS month,
                    COUNT(*) AS churned_users
                FROM subscriptions
                WHERE status = 'cancelled'
                    AND cancelled_at >= NOW() - INTERVAL ':months months'
                GROUP BY DATE_TRUNC('month', cancelled_at)
            )
            SELECT
                TO_CHAR(m.month, 'YYYY-MM') AS month,
                COALESCE(ubm.new_users, 0) AS new_users,
                COALESCE(cbm.churned_users, 0) AS churned_users,
                COALESCE(ubm.new_users, 0) - COALESCE(cbm.churned_users, 0) AS net_growth,
                (
                    SELECT COUNT(*)
                    FROM users
                    WHERE created_at < m.month + INTERVAL '1 month'
                        AND (deleted_at IS NULL OR deleted_at >= m.month)
                ) AS total_users
            FROM months m
            LEFT JOIN users_by_month ubm ON ubm.month = m.month
            LEFT JOIN cancelled_by_month cbm ON cbm.month = m.month
            ORDER BY m.month
        """).bindparams(months=months)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            {
                "month": row.month,
                "new_users": row.new_users,
                "churned_users": row.churned_users,
                "net_growth": row.net_growth,
                "total_users": row.total_users,
            }
            for row in rows
        ]

    async def get_operational_metrics(self) -> dict:
        """
        Get operational metrics for OCR/invoice processing.

        Returns:
            Dict with operational metrics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)

        # Invoice counts
        invoices_today = await self._get_invoice_count_since(today_start)
        invoices_this_week = await self._get_invoice_count_since(week_start)
        invoices_this_month = await self._get_invoice_count_since(month_start)

        # OCR metrics
        ocr_success_rate = await self._calculate_ocr_success_rate()
        avg_processing_time = await self._calculate_avg_processing_time()

        # Provider usage (from token_callback logs)
        provider_stats = await self._get_provider_usage()

        return {
            "invoices_today": invoices_today,
            "invoices_this_week": invoices_this_week,
            "invoices_this_month": invoices_this_month,
            "ocr_success_rate": round(ocr_success_rate, 2),
            "avg_processing_time": round(avg_processing_time, 2),
            **provider_stats,
        }

    # ==========================================================================
    # Private helper methods
    # ==========================================================================

    async def _get_total_users(self) -> int:
        """Get total user count (excluding soft-deleted)."""
        query = select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_active_users(self) -> int:
        """Get count of active users."""
        query = (
            select(func.count())
            .select_from(User)
            .where(User.is_active == True, User.deleted_at.is_(None))
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_paying_users(self) -> int:
        """Get count of users with active paid subscriptions."""
        query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE.value,
                Subscription.plan != "free",
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_trial_users(self) -> int:
        """Get count of users in trial period."""
        now = datetime.utcnow()
        query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.TRIAL.value,
                Subscription.trial_end > now,
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _calculate_mrr(self) -> Decimal:
        """
        Calculate Monthly Recurring Revenue.

        Monthly subscriptions = full amount
        Yearly subscriptions = amount / 12
        """
        # Monthly subscriptions
        monthly_query = select(func.sum(Payment.amount)).where(
            Payment.status == "succeeded",
            Payment.created_at >= datetime.utcnow() - timedelta(days=30),
        ).select_from(Payment).join(Subscription).where(
            Subscription.billing_cycle == "monthly"
        )

        # Yearly subscriptions (divide by 12 for MRR)
        yearly_query = select(func.sum(Payment.amount) / 12).where(
            Payment.status == "succeeded",
            Payment.created_at >= datetime.utcnow() - timedelta(days=365),
        ).select_from(Payment).join(Subscription).where(
            Subscription.billing_cycle == "yearly"
        )

        monthly_result = await self.db.execute(monthly_query)
        yearly_result = await self.db.execute(yearly_query)

        monthly_mrr = monthly_result.scalar() or Decimal("0")
        yearly_mrr = yearly_result.scalar() or Decimal("0")

        return monthly_mrr + yearly_mrr

    async def _calculate_arpu(self, mrr: Decimal, paying_users: int) -> Decimal:
        """Calculate Average Revenue Per User."""
        if paying_users == 0:
            return Decimal("0")
        return mrr / paying_users

    async def _calculate_churn_rate(self) -> float:
        """
        Calculate monthly churn rate.

        Churn rate = cancellations / subscribers at start of month
        """
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Subscribers at start of month
        subscribers_query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status.in_(["active", "cancelled"]),
                Subscription.created_at < month_start,
            )
        )

        # Cancellations this month
        cancellations_query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.CANCELLED.value,
                Subscription.cancelled_at >= month_start,
            )
        )

        subscribers_result = await self.db.execute(subscribers_query)
        cancellations_result = await self.db.execute(cancellations_query)

        subscribers = subscribers_result.scalar() or 0
        cancellations = cancellations_result.scalar() or 0

        if subscribers == 0:
            return 0.0

        return (cancellations / subscribers) * 100

    async def _calculate_trial_conversion(self) -> float:
        """
        Calculate trial conversion rate.

        Conversion rate = converted trials / ended trials
        """
        now = datetime.utcnow()

        # Trials that ended in the last 30 days
        ended_trials_query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.TRIAL.value,
                Subscription.trial_end < now,
                Subscription.trial_end >= now - timedelta(days=30),
            )
        )

        # Trials that converted to paid
        converted_query = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE.value,
                Subscription.plan != "free",
                Subscription.created_at >= now - timedelta(days=30),
            )
        )

        ended_result = await self.db.execute(ended_trials_query)
        converted_result = await self.db.execute(converted_query)

        ended_trials = ended_result.scalar() or 0
        converted = converted_result.scalar() or 0

        if ended_trials == 0:
            return 0.0

        return (converted / ended_trials) * 100

    async def _get_total_invoices(self) -> int:
        """Get total invoice count."""
        query = select(func.count()).select_from(Invoice)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_invoices_this_month(self) -> int:
        """Get invoice count for current month."""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        query = select(func.count()).where(Invoice.created_at >= month_start)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_invoice_count_since(self, since: datetime) -> int:
        """Get invoice count since a specific date."""
        query = select(func.count()).where(Invoice.created_at >= since)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _calculate_ocr_success_rate(self) -> float:
        """Calculate OCR success rate from invoice processing."""
        total_query = select(func.count()).select_from(InvoiceProcessing)
        success_query = (
            select(func.count())
            .select_from(InvoiceProcessing)
            .where(InvoiceProcessing.status == "completed")
        )

        total_result = await self.db.execute(total_query)
        success_result = await self.db.execute(success_query)

        total = total_result.scalar() or 0
        success = success_result.scalar() or 0

        if total == 0:
            return 100.0

        return (success / total) * 100

    async def _calculate_avg_processing_time(self) -> float:
        """Calculate average invoice processing time in seconds."""
        query = text("""
            SELECT AVG(
                EXTRACT(EPOCH FROM (updated_at - created_at))
            ) as avg_time
            FROM invoice_processing
            WHERE status = 'completed'
                AND updated_at > created_at
        """)

        result = await self.db.execute(query)
        avg_time = result.scalar()

        return float(avg_time) if avg_time else 0.0

    async def _get_provider_usage(self) -> dict:
        """Get AI provider usage breakdown."""
        # This would normally query from token_callback logs
        # For now, return placeholder values
        return {
            "openrouter_usage": 0,
            "gemini_usage": 0,
            "openai_usage": 0,
            "anthropic_usage": 0,
            "avg_tokens_per_invoice": 0,
            "estimated_monthly_cost": 0.0,
        }

    async def get_audit_logs(
        self,
        page: int = 1,
        per_page: int = 20,
        resource_type: Optional[str] = None,
        action: Optional[str] = None,
    ) -> dict:
        """
        Get paginated audit logs.

        Args:
            page: Page number
            per_page: Items per page
            resource_type: Filter by resource type
            action: Filter by action

        Returns:
            Paginated audit logs
        """
        from src.models.audit_log import AuditLog

        # Build base query
        query = select(AuditLog, User.email.label("admin_email")).join(
            User, AuditLog.admin_user_id == User.id
        )

        # Apply filters
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if action:
            query = query.where(AuditLog.action == action)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_query)).scalar() or 0

        # Order and paginate
        query = (
            query.order_by(AuditLog.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        result = await self.db.execute(query)
        rows = result.all()

        logs = []
        for log, admin_email in rows:
            logs.append({
                "id": str(log.id),
                "admin_user_id": str(log.admin_user_id),
                "admin_email": admin_email,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "ip_address": log.ip_address,
                "success": log.success,
                "created_at": log.created_at.isoformat(),
            })

        return {
            "logs": logs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page,
        }
