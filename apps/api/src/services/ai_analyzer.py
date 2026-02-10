"""
Serviço de IA para análise de compras e geração de insights.
Utiliza OpenAI API para gerar análises inteligentes sobre notas fiscais.
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from openai import AsyncOpenAI
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models.analysis import Analysis
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.merchant import Merchant
from src.models.product import Product
from src.models.purchase_pattern import PurchasePattern
from src.models.user import User

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """Serviço de análise de compras usando OpenAI."""

    def __init__(self):
        if settings.OPENROUTER_API_KEY:
            self.client = AsyncOpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
            )
            self.model = settings.OPENROUTER_MODEL
        else:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.model = "gpt-4o-mini"

    async def analyze_invoice(
        self,
        invoice: Invoice,
        user_history: dict[str, Any],
        db: AsyncSession,
        user: Optional[User] = None,
    ) -> list[Analysis]:
        """
        Analisa uma nota fiscal específica e gera insights.

        Args:
            invoice: Nota fiscal a ser analisada
            user_history: Histórico de compras do usuário
            db: Sessão do banco de dados
            user: Usuário com perfil (household_income, adults_count, children_count)

        Returns:
            Lista de análises geradas
        """
        analyses = []

        # Buscar itens da nota
        result = await db.execute(
            select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
        )
        items = result.scalars().all()

        # Buscar merchant
        merchant = None
        if invoice.merchant_id:
            merchant_result = await db.execute(
                select(Merchant).where(Merchant.id == invoice.merchant_id)
            )
            merchant = merchant_result.scalar_one_or_none()

        # Extract user profile data
        profile = self._get_user_profile(user)

        # === Existing analyses (per-invoice) ===
        if settings.is_analysis_enabled("price_alert"):
            price_alerts = await self._detect_price_alerts(
                invoice, items, user_history, db
            )
            analyses.extend(price_alerts)

        if settings.is_analysis_enabled("category_insight"):
            category_insights = await self._generate_category_insights(
                invoice, items, user_history, db
            )
            analyses.extend(category_insights)

        if settings.is_analysis_enabled("merchant_pattern"):
            merchant_analysis = await self._analyze_merchant(
                invoice, merchant, user_history, db
            )
            if merchant_analysis:
                analyses.append(merchant_analysis)

        if settings.is_analysis_enabled("summary"):
            summary = await self._generate_purchase_summary(
                invoice, items, merchant, db
            )
            if summary:
                analyses.append(summary)

        # === New per-invoice analyses ===
        if settings.is_analysis_enabled("essential_ratio"):
            try:
                essential = await self._analyze_essential_ratio(
                    invoice, items, profile, db
                )
                if essential:
                    analyses.append(essential)
            except Exception as e:
                logger.warning("essential_ratio analysis failed: %s", e)

        if settings.is_analysis_enabled("seasonal_alert"):
            try:
                seasonal = await self._analyze_seasonal_alert(
                    invoice, items, profile, db
                )
                analyses.extend(seasonal)
            except Exception as e:
                logger.warning("seasonal_alert analysis failed: %s", e)

        if (
            settings.is_analysis_enabled("children_spending")
            and profile["children_count"]
            and profile["children_count"] > 0
        ):
            try:
                children = await self._analyze_children_spending(
                    invoice, items, profile, db
                )
                if children:
                    analyses.append(children)
            except Exception as e:
                logger.warning("children_spending analysis failed: %s", e)

        # === Monthly analyses (run only if not run recently) ===
        should_run_monthly = await self._should_run_monthly_analyses(
            invoice.user_id, db
        )
        if should_run_monthly:
            if profile["household_income"] and profile["household_income"] > 0:
                if settings.is_analysis_enabled("budget_health"):
                    try:
                        budget = await self._analyze_budget_health(
                            invoice, profile, db
                        )
                        if budget:
                            analyses.append(budget)
                    except Exception as e:
                        logger.warning("budget_health analysis failed: %s", e)

                if settings.is_analysis_enabled("income_commitment"):
                    try:
                        commitment = await self._analyze_income_commitment(
                            invoice, profile, db
                        )
                        if commitment:
                            analyses.append(commitment)
                    except Exception as e:
                        logger.warning("income_commitment analysis failed: %s", e)

            if settings.is_analysis_enabled("per_capita_spending"):
                try:
                    per_capita = await self._analyze_per_capita_spending(
                        invoice, profile, db
                    )
                    if per_capita:
                        analyses.append(per_capita)
                except Exception as e:
                    logger.warning("per_capita_spending analysis failed: %s", e)

            if settings.is_analysis_enabled("shopping_frequency"):
                try:
                    frequency = await self._analyze_shopping_frequency(
                        invoice, profile, db
                    )
                    if frequency:
                        analyses.append(frequency)
                except Exception as e:
                    logger.warning("shopping_frequency analysis failed: %s", e)

            if settings.is_analysis_enabled("wholesale_opportunity"):
                try:
                    wholesale = await self._analyze_wholesale_opportunity(
                        invoice, profile, db
                    )
                    if wholesale:
                        analyses.append(wholesale)
                except Exception as e:
                    logger.warning("wholesale_opportunity analysis failed: %s", e)

            if settings.is_analysis_enabled("savings_potential"):
                try:
                    savings = await self._analyze_savings_potential(
                        invoice, profile, db
                    )
                    if savings:
                        analyses.append(savings)
                except Exception as e:
                    logger.warning("savings_potential analysis failed: %s", e)

            if settings.is_analysis_enabled("family_nutrition"):
                try:
                    nutrition = await self._analyze_family_nutrition(
                        invoice, profile, db
                    )
                    if nutrition:
                        analyses.append(nutrition)
                except Exception as e:
                    logger.warning("family_nutrition analysis failed: %s", e)

        return analyses

    def _get_user_profile(self, user: Optional[User]) -> dict[str, Any]:
        """Extract user profile data with safe defaults."""
        if not user:
            return {
                "household_income": None,
                "adults_count": 1,
                "children_count": 0,
            }
        return {
            "household_income": (
                float(user.household_income) if user.household_income else None
            ),
            "adults_count": user.adults_count or 1,
            "children_count": user.children_count or 0,
        }

    def _get_weighted_family_size(self, profile: dict[str, Any]) -> float:
        """Calculate OECD-weighted family size (children = 0.7 weight)."""
        adults = profile.get("adults_count") or 1
        children = profile.get("children_count") or 0
        return float(adults) + float(children) * 0.7

    async def _should_run_monthly_analyses(
        self, user_id: Any, db: AsyncSession
    ) -> bool:
        """Check if monthly analyses should run (last run > 30 days ago)."""
        monthly_types = [
            "budget_health", "per_capita_spending", "income_commitment",
            "shopping_frequency", "wholesale_opportunity", "savings_potential",
            "family_nutrition",
        ]
        result = await db.execute(
            select(func.max(Analysis.created_at))
            .where(
                and_(
                    Analysis.user_id == user_id,
                    Analysis.type.in_(monthly_types),
                )
            )
        )
        last_monthly = result.scalar()
        if not last_monthly:
            return True
        if isinstance(last_monthly, datetime):
            return (datetime.utcnow() - last_monthly).days >= 30
        return True

    async def generate_global_summary(self, analyses: list[Analysis]) -> str:
        """
        Gera um resumo executivo global com base em uma lista de insights.
        """
        if not analyses:
            return "Não há insights suficientes para gerar um relatório ainda."

        # Preparar dados para o prompt
        insights_text = "\n".join(
            [
                f"- [{a.type}] {a.title}: {a.description}"
                for a in analyses
            ]
        )

        prompt = (
            f"Analise os seguintes insights financeiros gerados recentemente para o usuário:\n\n"
            f"{insights_text}\n\n"
            f"Com base APENAS nestes insights, elabore um Resumo Executivo Financeiro (máximo 2 parágrafos). "
            f"O texto deve ser direto, profissional mas amigável (tom 'coach financeiro'). "
            f"Destaque os pontos positivos e as áreas de atenção. "
            f"Não liste os insights um a um, mas sim sintetize as tendências observadas."
            f"Comece com uma frase de impacto sobre a saúde financeira recente do usuário."
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Você é um consultor financeiro pessoal experiente "
                            "que ajuda pessoas a organizarem suas finanças domésticas."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content or "Não foi possível gerar o resumo."
        except Exception as e:
            print(f"Erro ao gerar resumo global: {e}")
            return "Ocorreu um erro ao gerar seu relatório de insights. Tente novamente mais tarde."


    async def _detect_price_alerts(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        user_history: dict[str, Any],
        db: AsyncSession,
    ) -> list[Analysis]:
        """
        Detecta preços acima da média para produtos na nota.
        """
        alerts = []

        for item in items:
            # Buscar histórico de preços para este produto
            result = await db.execute(
                select(InvoiceItem.unit_price, Invoice.merchant_id, Invoice.issue_date)
                .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
                .where(
                    and_(
                        InvoiceItem.description.ilike(f"%{item.description}%"),
                        Invoice.user_id == invoice.user_id,
                        Invoice.issue_date >= invoice.issue_date - timedelta(days=90),
                    )
                )
                .order_by(Invoice.issue_date.desc())
                .limit(10)
            )
            price_history = result.all()

            if len(price_history) < 2:
                continue

            # Calcular preço médio
            avg_price = sum(p[0] for p in price_history) / len(price_history)

            # Se preço atual for 20% acima da média, gerar alerta
            if item.unit_price > avg_price * Decimal("1.2"):
                # Usar IA para gerar descrição personalizada
                prompt = self._build_price_alert_prompt(
                    item.description, item.unit_price, avg_price, len(price_history)
                )

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Você é um analista de compras especializado "
                                "em identificar oportunidades de economia."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=300,
                )

                ai_text = response.choices[0].message.content

                alert = Analysis(
                    user_id=invoice.user_id,
                    invoice_id=invoice.id,
                    type="price_alert",
                    priority=(
                        "high"
                        if item.unit_price > avg_price * Decimal("1.5")
                        else "medium"
                    ),
                    title=f"Preço acima da média: {item.description}",
                    description=ai_text,
                    details={
                        "product": item.description,
                        "current_price": float(item.unit_price),
                        "average_price": float(avg_price),
                        "price_difference_percent": float(
                            (item.unit_price - avg_price) / avg_price * 100
                        ),
                        "history_count": len(price_history),
                        "quantity": item.quantity,
                    },
                    reference_period_start=invoice.issue_date - timedelta(days=90),
                    reference_period_end=invoice.issue_date,
                    ai_model=self.model,
                    confidence_score=0.8,
                )

                alerts.append(alert)

        return alerts

    async def _generate_category_insights(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        user_history: dict[str, Any],
        db: AsyncSession,
    ) -> list[Analysis]:
        """
        Gera insights sobre gastos por categoria.
        """
        insights = []

        # Agrupar itens por categoria
        category_totals = {}
        for item in items:
            category = item.category_name or "Outros"
            if category not in category_totals:
                category_totals[category] = Decimal("0")
            category_totals[category] += item.total_price

        # Para cada categoria com valor significativo
        for category, total in category_totals.items():
            if total < Decimal("50"):
                continue

            # Buscar gastos mensais nesta categoria
            month_start = invoice.issue_date.replace(day=1)
            result = await db.execute(
                select(func.sum(InvoiceItem.total_price))
                .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
                .where(
                    and_(
                        Invoice.user_id == invoice.user_id,
                        InvoiceItem.category_name == category,
                        Invoice.issue_date >= month_start,
                    )
                )
            )
            month_total = result.scalar() or Decimal("0")

            # Buscar média dos últimos 3 meses
            three_months_ago = month_start - timedelta(days=90)
            month_trunc = func.date_trunc("month", Invoice.issue_date).label("month")

            result = await db.execute(
                select(
                    month_trunc,
                    func.sum(InvoiceItem.total_price).label("total"),
                )
                .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
                .where(
                    and_(
                        Invoice.user_id == invoice.user_id,
                        InvoiceItem.category_name == category,
                        Invoice.issue_date >= three_months_ago,
                    )
                )
                .group_by(month_trunc)
            )
            monthly_totals = result.all()

            if len(monthly_totals) < 2:
                continue

            avg_monthly = sum(m[1] for m in monthly_totals) / len(monthly_totals)

            # Se gasto atual for 30% acima da média, gerar insight
            if month_total > avg_monthly * Decimal("1.3"):
                prompt = self._build_category_insight_prompt(
                    category, month_total, avg_monthly, len(monthly_totals)
                )

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Você é um analista financeiro especializado "
                                "em controle de gastos."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=300,
                )

                ai_text = response.choices[0].message.content

                insight = Analysis(
                    user_id=invoice.user_id,
                    invoice_id=invoice.id,
                    type="category_insight",
                    priority="medium",
                    title=f"Gasto elevado em {category}",
                    description=ai_text,
                    details={
                        "category": category,
                        "current_month_total": float(month_total),
                        "average_monthly": float(avg_monthly),
                        "difference_percent": float(
                            (month_total - avg_monthly) / avg_monthly * 100
                        ),
                        "months_analyzed": len(monthly_totals),
                    },
                    reference_period_start=three_months_ago,
                    reference_period_end=invoice.issue_date,
                    related_categories=[category],
                    ai_model=self.model,
                    confidence_score=0.75,
                )

                insights.append(insight)

        return insights

    async def _analyze_merchant(
        self,
        invoice: Invoice,
        merchant: Optional[Merchant],
        user_history: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """
        Analisa o estabelecimento e gera insights.
        """
        if not merchant:
            return None

        # Buscar histórico de compras neste merchant
        result = await db.execute(
            select(
                func.count(Invoice.id).label("visit_count"),
                func.sum(Invoice.total_value).label("total_spent"),
                func.avg(Invoice.total_value).label("avg_ticket"),
            ).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.merchant_id == merchant.id,
                )
            )
        )
        merchant_stats = result.first()

        if not merchant_stats or merchant_stats.visit_count < 3:
            return None

        # Comparar com outros merchants da mesma categoria
        if merchant.category:
            result = await db.execute(
                select(Merchant.name, func.avg(Invoice.total_value).label("avg_ticket"))
                .join(Invoice, Invoice.merchant_id == Merchant.id)
                .where(
                    and_(
                        Invoice.user_id == invoice.user_id,
                        Merchant.category == merchant.category,
                    )
                )
                .group_by(Merchant.id)
                .order_by(func.avg(Invoice.total_value).asc())
            )
            category_merchants = result.all()

            if len(category_merchants) > 1:
                # Encontrar posição deste merchant
                current_avg = float(merchant_stats.avg_ticket)
                category_avg = sum(m[1] for m in category_merchants) / len(
                    category_merchants
                )

                # Se ticket médio for 20% acima da categoria
                if current_avg > category_avg * 1.2:
                    prompt = self._build_merchant_insight_prompt(
                        merchant.name,
                        merchant.category,
                        current_avg,
                        category_avg,
                        merchant_stats.visit_count,
                    )

                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "Você é um analista de compras "
                                    "especializado em comparação de preços "
                                    "entre estabelecimentos."
                                ),
                            },
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.7,
                        max_tokens=300,
                    )

                    ai_text = response.choices[0].message.content

                    return Analysis(
                        user_id=invoice.user_id,
                        invoice_id=invoice.id,
                        type="merchant_pattern",
                        priority="medium",
                        title=f"Preços acima da média em {merchant.name}",
                        description=ai_text,
                        details={
                            "merchant_name": merchant.name,
                            "merchant_category": merchant.category,
                            "current_avg_ticket": current_avg,
                            "category_avg_ticket": category_avg,
                            "difference_percent": (
                                (current_avg - category_avg) / category_avg * 100
                            ),
                            "visit_count": merchant_stats.visit_count,
                        },
                        related_merchants=[merchant.id],
                        ai_model=self.model,
                        confidence_score=0.7,
                    )

        return None

    async def _generate_purchase_summary(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        merchant: Optional[Merchant],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """
        Gera um resumo da compra com insights gerais.
        """
        if len(items) < 3:
            return None

        # Preparar dados para a IA
        items_summary = [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "total_price": float(item.total_price),
                "category": item.category_name,
            }
            for item in items
        ]

        prompt = self._build_summary_prompt(
            invoice.total_value,
            items_summary,
            merchant.name if merchant else None,
            merchant.category if merchant else None,
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Você é um assistente financeiro que ajuda "
                        "usuários a entenderem suas compras."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=400,
        )

        ai_text = response.choices[0].message.content

        return Analysis(
            user_id=invoice.user_id,
            invoice_id=invoice.id,
            type="summary",
            priority="low",
            title="Resumo da compra",
            description=ai_text,
            details={
                "total_value": float(invoice.total_value),
                "item_count": len(items),
                "merchant": merchant.name if merchant else None,
                "categories": list(
                    set(item.category_name for item in items if item.category_name)
                ),
            },
            ai_model=self.model,
            confidence_score=0.85,
        )

    # =========================================================================
    # New profile-aware analyses
    # =========================================================================

    async def _analyze_budget_health(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Avalia proporção dos gastos com compras vs renda mensal (DIEESE benchmarks)."""
        income = profile["household_income"]
        if not income or income <= 0:
            return None

        month_start = invoice.issue_date.replace(day=1)
        result = await db.execute(
            select(func.sum(Invoice.total_value)).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
        )
        month_spent = float(result.scalar() or 0)

        # Also get last 3 months average for trend
        three_months_ago = month_start - timedelta(days=90)
        result = await db.execute(
            select(
                func.date_trunc("month", Invoice.issue_date).label("month"),
                func.sum(Invoice.total_value).label("total"),
            )
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= three_months_ago,
                    Invoice.issue_date < month_start,
                )
            )
            .group_by("month")
        )
        prev_months = result.all()
        avg_prev = (
            float(sum(m.total for m in prev_months) / len(prev_months))
            if prev_months
            else month_spent
        )

        pct_income = (month_spent / income) * 100
        family_size = self._get_weighted_family_size(profile)

        # DIEESE benchmarks: 20-35% for food. Adjust threshold by family size
        threshold = 25 + (family_size - 1) * 2  # bigger families naturally spend more %
        if pct_income < threshold:
            return None

        if pct_income > 50:
            priority = "critical"
        elif pct_income > 40:
            priority = "high"
        elif pct_income > 30:
            priority = "medium"
        else:
            priority = "low"

        prompt = (
            f"Analise a saúde do orçamento familiar:\n\n"
            f"Renda mensal: R$ {income:,.2f}\n"
            f"Gasto com compras este mês: R$ {month_spent:,.2f} ({pct_income:.1f}% da renda)\n"
            f"Média dos últimos 3 meses: R$ {avg_prev:,.2f}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n"
            f"Referência DIEESE: famílias brasileiras gastam 20-35% da renda com alimentação\n\n"
            f"Forneça uma análise concisa (máximo 3 frases):\n"
            f"1. Avaliação da proporção atual vs benchmark\n"
            f"2. Impacto no orçamento familiar\n"
            f"3. Uma ação concreta para o próximo mês\n\n"
            f"Use linguagem amigável de coach financeiro."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor financeiro pessoal especializado em finanças domésticas brasileiras.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="budget_health",
            priority=priority,
            title="Saúde do Orçamento Familiar",
            description=response.choices[0].message.content,
            details={
                "month_spent": month_spent,
                "household_income": income,
                "percent_of_income": round(pct_income, 1),
                "avg_previous_months": round(avg_prev, 2),
                "family_size_weighted": round(family_size, 1),
                "threshold_percent": round(threshold, 1),
            },
            reference_period_start=month_start,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.85,
        )

    async def _analyze_per_capita_spending(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Calcula gasto mensal per capita usando escala OECD."""
        family_size = self._get_weighted_family_size(profile)
        if family_size <= 0:
            return None

        month_start = invoice.issue_date.replace(day=1)
        result = await db.execute(
            select(func.sum(Invoice.total_value)).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
        )
        month_spent = float(result.scalar() or 0)
        per_capita = month_spent / family_size

        # Get 3 month average per capita
        three_months_ago = month_start - timedelta(days=90)
        result = await db.execute(
            select(
                func.date_trunc("month", Invoice.issue_date).label("month"),
                func.sum(Invoice.total_value).label("total"),
            )
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= three_months_ago,
                    Invoice.issue_date < month_start,
                )
            )
            .group_by("month")
        )
        prev_months = result.all()
        if not prev_months:
            return None

        avg_per_capita = float(
            sum(m.total for m in prev_months) / len(prev_months) / family_size
        )
        change_pct = ((per_capita - avg_per_capita) / avg_per_capita * 100) if avg_per_capita > 0 else 0

        if abs(change_pct) < 20 and per_capita < 500:
            return None

        if change_pct > 30 or per_capita > 800:
            priority = "high"
        elif change_pct > 20 or per_capita > 500:
            priority = "medium"
        else:
            priority = "low"

        income_per_capita = None
        if profile["household_income"] and profile["household_income"] > 0:
            income_per_capita = profile["household_income"] / family_size

        prompt = (
            f"Analise o gasto per capita desta família:\n\n"
            f"Gasto per capita este mês: R$ {per_capita:,.2f}\n"
            f"Média per capita últimos 3 meses: R$ {avg_per_capita:,.2f}\n"
            f"Variação: {change_pct:+.1f}%\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s) "
            f"(peso OECD: {family_size:.1f} equivalentes)\n"
            + (f"Renda per capita: R$ {income_per_capita:,.2f}\n" if income_per_capita else "")
            + f"\nForneça uma análise concisa (máximo 3 frases):\n"
            f"1. Avaliação da evolução do gasto per capita\n"
            f"2. Se o aumento é proporcional ao tamanho da família\n"
            f"3. Dica prática para otimizar\n\n"
            f"Use linguagem amigável."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor financeiro pessoal especializado em finanças domésticas.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="per_capita_spending",
            priority=priority,
            title="Gasto Por Pessoa da Família",
            description=response.choices[0].message.content,
            details={
                "per_capita_current": round(per_capita, 2),
                "per_capita_avg_3m": round(avg_per_capita, 2),
                "change_percent": round(change_pct, 1),
                "family_size_weighted": round(family_size, 1),
                "income_per_capita": round(income_per_capita, 2) if income_per_capita else None,
            },
            reference_period_start=three_months_ago,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.80,
        )

    async def _analyze_essential_ratio(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Classifica itens entre essenciais e não-essenciais."""
        if len(items) < 5:
            return None

        essential_categories = {
            "alimentos", "alimentos básicos", "carnes", "frutas", "verduras",
            "legumes", "laticínios", "padaria", "cereais", "grãos",
            "higiene", "higiene pessoal", "limpeza", "bebê", "infantil",
        }
        non_essential_categories = {
            "bebidas alcoólicas", "snacks", "doces", "guloseimas",
            "conveniência", "petiscos", "refrigerantes", "cervejas",
        }
        non_essential_keywords = [
            "cerveja", "vinho", "whisky", "vodka", "refrigerante", "salgadinho",
            "chocolate", "sorvete", "biscoito recheado", "energetico", "energy",
        ]

        essential_total = Decimal("0")
        non_essential_total = Decimal("0")
        total = Decimal("0")

        for item in items:
            total += item.total_price
            cat = (item.category_name or "").lower().strip()
            desc = (item.description or "").lower()

            if cat in non_essential_categories or any(
                kw in desc for kw in non_essential_keywords
            ):
                non_essential_total += item.total_price
            elif cat in essential_categories:
                essential_total += item.total_price

        if total == 0:
            return None

        non_essential_pct = float(non_essential_total / total * 100)
        if non_essential_pct < 35:
            return None

        income = profile["household_income"]
        income_pct = None
        if income and income > 0:
            income_pct = float(non_essential_total) / income * 100

        if non_essential_pct > 50 or (income_pct and income_pct > 15):
            priority = "high"
        else:
            priority = "medium"

        prompt = (
            f"Analise a proporção de essenciais vs supérfluos nesta compra:\n\n"
            f"Total da compra: R$ {total:.2f}\n"
            f"Itens essenciais: R$ {essential_total:.2f}\n"
            f"Itens não-essenciais: R$ {non_essential_total:.2f} ({non_essential_pct:.1f}%)\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n"
            + (f"Representa {income_pct:.1f}% da renda em supérfluos\n" if income_pct else "")
            + f"\nForneça uma análise concisa (máximo 3 frases):\n"
            f"1. Avaliação do equilíbrio essenciais/supérfluos\n"
            f"2. Sugestões de substituições econômicas\n"
            f"3. Meta realista de proporção ideal\n\n"
            f"Use linguagem amigável e sem julgamento."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor de compras inteligentes especializado em economia doméstica.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            invoice_id=invoice.id,
            type="essential_ratio",
            priority=priority,
            title="Proporção Essenciais vs Supérfluos",
            description=response.choices[0].message.content,
            details={
                "total_value": float(total),
                "essential_total": float(essential_total),
                "non_essential_total": float(non_essential_total),
                "non_essential_percent": round(non_essential_pct, 1),
                "income_percent_non_essential": round(income_pct, 1) if income_pct else None,
                "item_count": len(items),
            },
            reference_period_start=invoice.issue_date,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.70,
        )

    async def _analyze_income_commitment(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Rastreia acumulado do mês e projeta se ultrapassará limites."""
        income = profile["household_income"]
        if not income or income <= 0:
            return None

        month_start = invoice.issue_date.replace(day=1)
        today = invoice.issue_date

        result = await db.execute(
            select(func.sum(Invoice.total_value)).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
        )
        accumulated = float(result.scalar() or 0)
        pct_accumulated = (accumulated / income) * 100

        # Calculate days elapsed and remaining (issue_date is datetime)
        today_date = today.date() if isinstance(today, datetime) else today
        month_start_date = month_start.date() if isinstance(month_start, datetime) else month_start
        days_elapsed = max((today_date - month_start_date).days + 1, 1)
        # Approximate days in month
        if today_date.month == 12:
            next_month = date(today_date.year + 1, 1, 1)
        else:
            next_month = date(today_date.year, today_date.month + 1, 1)
        days_in_month = (next_month - month_start_date).days
        days_remaining = days_in_month - days_elapsed

        # Project monthly total based on daily run rate
        daily_rate = accumulated / days_elapsed
        projected_total = daily_rate * days_in_month
        projected_pct = (projected_total / income) * 100

        # Adjust threshold by family size
        family_size = self._get_weighted_family_size(profile)
        base_threshold = 30 + (family_size - 1) * 2

        if pct_accumulated < 20 and projected_pct < base_threshold:
            return None

        if pct_accumulated > 40 and days_remaining > 7:
            priority = "critical"
        elif projected_pct > 40:
            priority = "high"
        elif projected_pct > base_threshold:
            priority = "medium"
        else:
            priority = "low"

        prompt = (
            f"Analise o comprometimento da renda com mercado este mês:\n\n"
            f"Renda mensal: R$ {income:,.2f}\n"
            f"Gasto acumulado (dia {days_elapsed} de {days_in_month}): R$ {accumulated:,.2f} ({pct_accumulated:.1f}%)\n"
            f"Taxa diária: R$ {daily_rate:,.2f}/dia\n"
            f"Projeção para o mês: R$ {projected_total:,.2f} ({projected_pct:.1f}%)\n"
            f"Dias restantes: {days_remaining}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n\n"
            f"Forneça uma análise concisa (máximo 3 frases):\n"
            f"1. Situação atual do comprometimento\n"
            f"2. Projeção e risco para o restante do mês\n"
            f"3. Ação imediata para controlar gastos\n\n"
            f"Use linguagem de alerta mas construtiva."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor financeiro pessoal que ajuda famílias a controlarem o orçamento mensal.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="income_commitment",
            priority=priority,
            title="Comprometimento da Renda com Mercado",
            description=response.choices[0].message.content,
            details={
                "accumulated": round(accumulated, 2),
                "household_income": income,
                "percent_accumulated": round(pct_accumulated, 1),
                "daily_rate": round(daily_rate, 2),
                "projected_total": round(projected_total, 2),
                "projected_percent": round(projected_pct, 1),
                "days_elapsed": days_elapsed,
                "days_remaining": days_remaining,
            },
            reference_period_start=month_start,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.80,
        )

    async def _analyze_children_spending(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Identifica e agrupa gastos com produtos infantis."""
        if not profile["children_count"] or profile["children_count"] <= 0:
            return None

        child_keywords = [
            "fralda", "fraldas", "leite", "papinha", "bebe", "bebê",
            "infantil", "criança", "mamadeira", "chupeta", "lenço umedecido",
            "toalha umedecida", "pomada", "talco", "mingau", "nan ",
            "aptamil", "enfamil", "nestogeno", "mucilon",
        ]

        child_items = []
        child_total = Decimal("0")
        for item in items:
            desc = (item.description or "").lower()
            cat = (item.category_name or "").lower()
            if any(kw in desc for kw in child_keywords) or "bebê" in cat or "infantil" in cat:
                child_items.append(item)
                child_total += item.total_price

        if len(child_items) < 2:
            return None

        cost_per_child = float(child_total) / profile["children_count"]
        income = profile["household_income"]
        income_pct = (float(child_total) / income * 100) if income and income > 0 else None

        # Get 3 month average for children spending
        month_start = invoice.issue_date.replace(day=1)
        three_months_ago = month_start - timedelta(days=90)

        child_kw_filters = [
            InvoiceItem.description.ilike(f"%{kw}%") for kw in child_keywords[:10]
        ]
        result = await db.execute(
            select(func.sum(InvoiceItem.total_price))
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= three_months_ago,
                    Invoice.issue_date < month_start,
                    or_(*child_kw_filters),
                )
            )
        )
        prev_total = float(result.scalar() or 0)
        # Average over months that had data
        result2 = await db.execute(
            select(func.count(func.distinct(func.date_trunc("month", Invoice.issue_date))))
            .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= three_months_ago,
                    Invoice.issue_date < month_start,
                    or_(*child_kw_filters),
                )
            )
        )
        prev_months_count = result2.scalar() or 1
        avg_prev = prev_total / max(prev_months_count, 1)

        change_pct = ((float(child_total) - avg_prev) / avg_prev * 100) if avg_prev > 0 else 0

        if change_pct > 25 or (income_pct and income_pct > 15):
            priority = "high"
        elif income_pct and income_pct > 8:
            priority = "medium"
        else:
            priority = "low"

        items_text = ", ".join(
            f"{it.description} (R$ {it.total_price:.2f})" for it in child_items[:8]
        )

        prompt = (
            f"Analise os gastos com produtos infantis nesta compra:\n\n"
            f"Total com produtos infantis: R$ {child_total:.2f}\n"
            f"Itens: {items_text}\n"
            f"Número de crianças: {profile['children_count']}\n"
            f"Custo por criança nesta compra: R$ {cost_per_child:.2f}\n"
            f"Média mensal anterior: R$ {avg_prev:.2f}\n"
            + (f"Representa {income_pct:.1f}% da renda\n" if income_pct else "")
            + f"\nForneça uma análise concisa (máximo 3 frases):\n"
            f"1. Avaliação dos gastos infantis\n"
            f"2. Oportunidades de economia (marcas, tamanhos, atacado)\n"
            f"3. Dica prática para famílias com crianças\n\n"
            f"Use linguagem empática e prática."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor de economia doméstica especializado em famílias com crianças no Brasil.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            invoice_id=invoice.id,
            type="children_spending",
            priority=priority,
            title="Gastos com Crianças",
            description=response.choices[0].message.content,
            details={
                "child_items_count": len(child_items),
                "child_total": float(child_total),
                "cost_per_child": round(cost_per_child, 2),
                "children_count": profile["children_count"],
                "avg_previous_months": round(avg_prev, 2),
                "change_percent": round(change_pct, 1),
                "income_percent": round(income_pct, 1) if income_pct else None,
            },
            reference_period_start=invoice.issue_date,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.72,
        )

    async def _analyze_wholesale_opportunity(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Identifica produtos comprados frequentemente que seriam mais baratos no atacado."""
        result = await db.execute(
            select(PurchasePattern)
            .where(
                and_(
                    PurchasePattern.user_id == invoice.user_id,
                    PurchasePattern.pattern_type == "recurring_product",
                    PurchasePattern.occurrence_count >= 3,
                )
            )
            .limit(20)
        )
        patterns = result.scalars().all()

        if len(patterns) < 3:
            return None

        # Get product details for frequent purchases
        weekly_products = []
        for p in patterns:
            if p.frequency and p.frequency.value in ("weekly", "biweekly"):
                # Get product info
                prod_result = await db.execute(
                    select(Product).where(Product.id == p.target_id)
                )
                product = prod_result.scalar_one_or_none()
                if product:
                    weekly_products.append({
                        "name": product.description or product.normalized_name,
                        "frequency": p.frequency.value,
                        "avg_price": float(product.average_price) if product.average_price else 0,
                        "occurrences": p.occurrence_count,
                    })

        if not weekly_products:
            return None

        family_size = self._get_weighted_family_size(profile)
        estimated_monthly_savings = sum(
            p["avg_price"] * 0.15 * (4 if p["frequency"] == "weekly" else 2)
            for p in weekly_products
        )

        income = profile["household_income"]
        if income and income > 0:
            savings_pct = estimated_monthly_savings / income * 100
        else:
            savings_pct = None

        if estimated_monthly_savings > 100 or (savings_pct and savings_pct > 3):
            priority = "high"
        elif estimated_monthly_savings > 50:
            priority = "medium"
        else:
            priority = "low"

        products_text = "\n".join(
            f"- {p['name']}: ~R$ {p['avg_price']:.2f} ({p['frequency']}, {p['occurrences']}x comprado)"
            for p in weekly_products[:6]
        )

        prompt = (
            f"Analise oportunidades de compra no atacado/atacarejo:\n\n"
            f"Produtos comprados frequentemente em supermercado:\n{products_text}\n\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n"
            f"Economia estimada comprando no atacado: ~R$ {estimated_monthly_savings:.2f}/mês\n"
            + (f"Isso representa {savings_pct:.1f}% da renda mensal\n" if savings_pct else "")
            + f"\nForneça uma análise concisa (máximo 3 frases):\n"
            f"1. Quais produtos valem mais a pena comprar no atacado\n"
            f"2. Volume ideal considerando o tamanho da família\n"
            f"3. Cuidados (validade, armazenamento)\n\n"
            f"Use linguagem prática e direta."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um especialista em compras inteligentes no varejo brasileiro.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="wholesale_opportunity",
            priority=priority,
            title="Oportunidade de Compra no Atacado",
            description=response.choices[0].message.content,
            details={
                "frequent_products": weekly_products[:6],
                "estimated_monthly_savings": round(estimated_monthly_savings, 2),
                "savings_percent_income": round(savings_pct, 1) if savings_pct else None,
                "family_size_weighted": round(family_size, 1),
                "pattern_count": len(patterns),
            },
            reference_period_start=invoice.issue_date - timedelta(days=90),
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.65,
        )

    async def _analyze_shopping_frequency(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Analisa frequência de visitas e custos ocultos das compras picadas."""
        month_start = invoice.issue_date.replace(day=1)

        # Count invoices this month
        result = await db.execute(
            select(
                func.count(Invoice.id).label("count"),
                func.avg(Invoice.total_value).label("avg_ticket"),
                func.avg(
                    func.array_length(
                        select(func.count(InvoiceItem.id))
                        .where(InvoiceItem.invoice_id == Invoice.id)
                        .correlate(Invoice)
                        .scalar_subquery(),
                        1,
                    )
                ).label("avg_items"),
            ).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
        )
        stats = result.first()

        # Simpler approach: count invoices and get item counts
        result = await db.execute(
            select(Invoice.id, Invoice.total_value, Invoice.issue_date)
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
            .order_by(Invoice.issue_date)
        )
        month_invoices = result.all()
        invoice_count = len(month_invoices)

        if invoice_count < 8:
            return None

        # Count distinct merchants
        result = await db.execute(
            select(func.count(func.distinct(Invoice.merchant_id))).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                    Invoice.merchant_id.isnot(None),
                )
            )
        )
        merchant_count = result.scalar() or 0

        avg_ticket = float(
            sum(inv.total_value for inv in month_invoices) / invoice_count
        ) if invoice_count > 0 else 0

        # Count small purchases (likely impulse)
        small_purchase_count = sum(1 for inv in month_invoices if float(inv.total_value) < 50)

        family_size = self._get_weighted_family_size(profile)

        if invoice_count >= 12 and avg_ticket < 80:
            priority = "high"
        elif invoice_count >= 8:
            priority = "medium"
        else:
            priority = "low"

        prompt = (
            f"Analise a frequência de compras e custos ocultos:\n\n"
            f"Compras este mês: {invoice_count}\n"
            f"Ticket médio: R$ {avg_ticket:.2f}\n"
            f"Estabelecimentos diferentes: {merchant_count}\n"
            f"Compras pequenas (<R$50): {small_purchase_count}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n\n"
            f"Forneça uma análise concisa (máximo 3 frases):\n"
            f"1. Impacto das compras frequentes (impulso, deslocamento, tempo)\n"
            f"2. Calendário otimizado de compras para este perfil familiar\n"
            f"3. Economia estimada ao consolidar compras\n\n"
            f"Use linguagem prática e motivadora."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um consultor de planejamento de compras especializado em otimização de tempo e dinheiro.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="shopping_frequency",
            priority=priority,
            title="Frequência de Compras e Custos Ocultos",
            description=response.choices[0].message.content,
            details={
                "invoice_count": invoice_count,
                "avg_ticket": round(avg_ticket, 2),
                "merchant_count": merchant_count,
                "small_purchase_count": small_purchase_count,
                "family_size_weighted": round(family_size, 1),
            },
            reference_period_start=month_start,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.75,
        )

    async def _analyze_seasonal_alert(
        self,
        invoice: Invoice,
        items: list[InvoiceItem],
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> list[Analysis]:
        """Identifica produtos fora de temporada (mais caros) e sugere substituições."""
        # Brazilian seasonal produce calendar (approximate)
        seasonal_map: dict[str, list[int]] = {
            # Fruits - months when they are in season (cheaper)
            "manga": [10, 11, 12, 1, 2],
            "morango": [5, 6, 7, 8, 9],
            "uva": [1, 2, 3, 12],
            "pêssego": [10, 11, 12, 1],
            "melancia": [10, 11, 12, 1, 2],
            "abacaxi": [10, 11, 12, 1],
            "caqui": [3, 4, 5],
            "maçã": [1, 2, 3, 4],
            "laranja": [5, 6, 7, 8],
            "tangerina": [4, 5, 6, 7],
            "mexerica": [4, 5, 6, 7],
            "ponkan": [4, 5, 6, 7],
            "abacate": [3, 4, 5, 6, 7],
            "goiaba": [2, 3, 4],
            "mamão": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  # year-round
            "banana": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  # year-round
            # Vegetables
            "tomate": [1, 2, 3, 4],
            "abobrinha": [9, 10, 11, 12, 1],
            "berinjela": [3, 4, 5, 6],
            "couve-flor": [5, 6, 7, 8],
            "brócolis": [5, 6, 7, 8],
            "pepino": [9, 10, 11, 12, 1],
            "pimentão": [9, 10, 11, 12],
            "vagem": [5, 6, 7, 8],
            "chuchu": [5, 6, 7, 8, 9],
            "milho": [1, 2, 3],
        }

        current_month = invoice.issue_date.month
        alerts = []

        produce_items = [
            item for item in items
            if (item.category_name or "").lower() in (
                "frutas", "verduras", "legumes", "hortifruti", "hortifrutigranjeiros",
                "frutas e verduras",
            )
        ]

        if len(produce_items) < 3:
            return []

        off_season_items = []
        for item in produce_items:
            desc_lower = (item.description or "").lower()
            for product_name, months in seasonal_map.items():
                if product_name in desc_lower and current_month not in months:
                    # Check if price is above historical min
                    prod_result = await db.execute(
                        select(Product.min_price, Product.average_price)
                        .where(
                            and_(
                                Product.user_id == invoice.user_id,
                                Product.description.ilike(f"%{product_name}%"),
                            )
                        )
                        .limit(1)
                    )
                    prod = prod_result.first()
                    min_price = float(prod.min_price) if prod and prod.min_price else None
                    if min_price and float(item.unit_price) > min_price * 1.3:
                        off_season_items.append({
                            "name": item.description,
                            "price": float(item.unit_price),
                            "min_price": min_price,
                            "season_months": months,
                            "product_key": product_name,
                        })
                    break

        if not off_season_items:
            return []

        total_premium = sum(
            (i["price"] - i["min_price"]) for i in off_season_items if i["min_price"]
        )

        if len(off_season_items) >= 3 and total_premium > 30:
            priority = "high"
        elif profile["children_count"] and profile["children_count"] > 0:
            priority = "medium"
        else:
            priority = "low"

        items_text = "\n".join(
            f"- {i['name']}: R$ {i['price']:.2f} (preço mín. histórico: R$ {i['min_price']:.2f})"
            for i in off_season_items[:5]
        )

        prompt = (
            f"Analise os produtos fora de temporada nesta compra:\n\n"
            f"Mês atual: {current_month}\n"
            f"Produtos fora de safra:\n{items_text}\n"
            f"Sobrepreço total estimado: R$ {total_premium:.2f}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n\n"
            f"Forneça uma análise concisa (máximo 3 frases):\n"
            f"1. Quais frutas/verduras estão fora de safra\n"
            f"2. Substitutos da estação (mais baratos e frescos)\n"
            f"3. Economia possível com trocas sazonais\n\n"
            f"Use linguagem educativa e prática."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um nutricionista e consultor de compras especializado em sazonalidade de alimentos no Brasil.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        alert = Analysis(
            user_id=invoice.user_id,
            invoice_id=invoice.id,
            type="seasonal_alert",
            priority=priority,
            title="Alerta Sazonal de Preços",
            description=response.choices[0].message.content,
            details={
                "off_season_items": off_season_items[:5],
                "total_premium": round(total_premium, 2),
                "current_month": current_month,
                "produce_count": len(produce_items),
            },
            reference_period_start=invoice.issue_date,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.68,
        )
        alerts.append(alert)
        return alerts

    async def _analyze_savings_potential(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Consolida todas as oportunidades de economia em um plano priorizado."""
        # Check if we have enough recent analyses
        result = await db.execute(
            select(Analysis)
            .where(
                and_(
                    Analysis.user_id == invoice.user_id,
                    Analysis.created_at >= datetime.utcnow() - timedelta(days=60),
                )
            )
            .order_by(Analysis.created_at.desc())
            .limit(20)
        )
        recent_analyses = result.scalars().all()

        if len(recent_analyses) < 5:
            return None

        income = profile["household_income"]
        month_start = invoice.issue_date.replace(day=1)
        result = await db.execute(
            select(func.sum(Invoice.total_value)).where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= month_start,
                )
            )
        )
        month_spent = float(result.scalar() or 0)

        # Summarize recent insights for AI
        insights_text = "\n".join(
            f"- [{a.type}] {a.title}: {a.description[:120]}..."
            for a in recent_analyses[:10]
        )

        family_size = self._get_weighted_family_size(profile)

        prompt = (
            f"Com base nos insights recentes, crie um plano de economia priorizado:\n\n"
            f"Gasto mensal atual: R$ {month_spent:,.2f}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n"
            + (f"Renda mensal: R$ {income:,.2f}\n" if income else "")
            + f"\nInsights recentes:\n{insights_text}\n\n"
            f"Forneça um plano de ação conciso (máximo 4 frases):\n"
            f"1. Top 3 ações de maior impacto (ordenadas por economia estimada)\n"
            f"2. Meta realista de economia para o próximo mês (em R$ e %)\n"
            f"3. Uma mudança de hábito simples que tem grande efeito\n\n"
            f"Use linguagem motivadora de coach financeiro."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um planejador financeiro pessoal que cria planos de ação concretos e motivadores.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=400,
        )

        if month_spent > 0 and income and income > 0 and (month_spent / income) > 0.10:
            priority = "high"
        elif month_spent > 0:
            priority = "medium"
        else:
            priority = "low"

        return Analysis(
            user_id=invoice.user_id,
            type="savings_potential",
            priority=priority,
            title="Potencial de Economia Mensal",
            description=response.choices[0].message.content,
            details={
                "month_spent": round(month_spent, 2),
                "household_income": income,
                "analyses_count": len(recent_analyses),
                "family_size_weighted": round(family_size, 1),
                "analysis_types": list(set(a.type for a in recent_analyses)),
            },
            reference_period_start=month_start,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.72,
        )

    async def _analyze_family_nutrition(
        self,
        invoice: Invoice,
        profile: dict[str, Any],
        db: AsyncSession,
    ) -> Optional[Analysis]:
        """Avalia distribuição de categorias de alimentos e identifica lacunas nutricionais."""
        # Get items from last 30 days
        thirty_days_ago = invoice.issue_date - timedelta(days=30)
        result = await db.execute(
            select(InvoiceItem.category_name, func.sum(InvoiceItem.total_price).label("total"))
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .where(
                and_(
                    Invoice.user_id == invoice.user_id,
                    Invoice.issue_date >= thirty_days_ago,
                )
            )
            .group_by(InvoiceItem.category_name)
        )
        cat_totals = result.all()

        if len(cat_totals) < 3:
            return None

        # Map categories to food groups
        food_groups: dict[str, list[str]] = {
            "proteínas": ["carnes", "carne", "frango", "peixe", "ovos", "ovo", "proteína"],
            "carboidratos": ["arroz", "macarrão", "pão", "padaria", "cereais", "grãos", "massas"],
            "frutas_verduras": ["frutas", "verduras", "legumes", "hortifruti", "hortifrutigranjeiros"],
            "laticínios": ["laticínios", "leite", "queijo", "iogurte", "lácteos"],
            "processados": ["processados", "congelados", "instantâneo", "embutidos", "snacks"],
        }

        group_totals: dict[str, float] = {g: 0.0 for g in food_groups}
        total_food = 0.0

        for cat_name, cat_total in cat_totals:
            cat_lower = (cat_name or "").lower().strip()
            total_food += float(cat_total)
            for group, keywords in food_groups.items():
                if any(kw in cat_lower for kw in keywords):
                    group_totals[group] += float(cat_total)
                    break

        if total_food == 0:
            return None

        group_pcts = {g: (v / total_food * 100) for g, v in group_totals.items()}

        # Find missing or underrepresented groups
        missing_groups = [g for g, pct in group_pcts.items() if pct < 5]
        if not missing_groups:
            return None

        has_children = profile["children_count"] and profile["children_count"] > 0

        # Priority: if children and missing key groups
        child_critical = {"frutas_verduras", "laticínios"}
        if has_children and child_critical.intersection(missing_groups):
            priority = "high"
        elif len(missing_groups) >= 2:
            priority = "medium"
        else:
            priority = "low"

        groups_text = "\n".join(
            f"- {g.replace('_', '/')}: R$ {group_totals[g]:.2f} ({group_pcts[g]:.1f}%)"
            for g in food_groups
        )

        income = profile["household_income"]

        prompt = (
            f"Analise o equilíbrio nutricional das compras dos últimos 30 dias:\n\n"
            f"Distribuição por grupo alimentar:\n{groups_text}\n\n"
            f"Total gasto em alimentos: R$ {total_food:.2f}\n"
            f"Grupos sub-representados (<5%): {', '.join(g.replace('_', '/') for g in missing_groups)}\n"
            f"Família: {profile['adults_count']} adulto(s) e {profile['children_count']} criança(s)\n"
            + (f"Renda mensal: R$ {income:,.2f}\n" if income else "")
            + f"\nForneça uma análise concisa (máximo 3 frases):\n"
            f"1. Quais grupos alimentares estão faltando ou em excesso\n"
            f"2. Sugestões acessíveis para equilibrar a alimentação\n"
            f"3. Atenção especial para {'crianças' if has_children else 'a família'}\n\n"
            f"Use linguagem educativa e sem julgamento."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "Você é um nutricionista que ajuda famílias brasileiras a comer melhor com o orçamento disponível.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        return Analysis(
            user_id=invoice.user_id,
            type="family_nutrition",
            priority=priority,
            title="Equilíbrio Nutricional da Família",
            description=response.choices[0].message.content,
            details={
                "group_totals": {g: round(v, 2) for g, v in group_totals.items()},
                "group_percentages": {g: round(v, 1) for g, v in group_pcts.items()},
                "missing_groups": missing_groups,
                "total_food_spending": round(total_food, 2),
                "has_children": has_children,
                "days_analyzed": 30,
            },
            reference_period_start=thirty_days_ago,
            reference_period_end=invoice.issue_date,
            ai_model=self.model,
            confidence_score=0.60,
        )

    def _build_price_alert_prompt(
        self,
        product: str,
        current_price: Decimal,
        avg_price: Decimal,
        history_count: int,
    ) -> str:
        """Constrói prompt para alerta de preço."""
        diff_percent = (current_price - avg_price) / avg_price * 100
        return (
            f"Analise a seguinte situação de compra:\n\n"
            f"Produto: {product}\n"
            f"Preço atual: R$ {current_price:.2f}\n"
            f"Preço médio histórico (últimas {history_count} compras): "
            f"R$ {avg_price:.2f}\n"
            f"Diferença: {diff_percent:.1f}% acima da média\n\n"
            f"Forneça uma análise concisa (máximo 3 frases) sobre:\n"
            f"1. Se este preço é justificável\n"
            f"2. Sugestões para economizar neste produto\n"
            f"3. Quando seria um bom momento para comprar novamente\n\n"
            f"Use linguagem amigável e direta."
        )

    def _build_category_insight_prompt(
        self,
        category: str,
        current_month: Decimal,
        avg_monthly: Decimal,
        months_analyzed: int,
    ) -> str:
        """Constrói prompt para insight de categoria."""
        diff_percent = (current_month - avg_monthly) / avg_monthly * 100
        return (
            f"Analise o seguinte padrão de gastos:\n\n"
            f"Categoria: {category}\n"
            f"Gasto este mês: R$ {current_month:.2f}\n"
            f"Média mensal (últimos {months_analyzed} meses): "
            f"R$ {avg_monthly:.2f}\n"
            f"Diferença: {diff_percent:.1f}% acima da média\n\n"
            f"Forneça uma análise concisa (máximo 3 frases) sobre:\n"
            f"1. Possíveis causas deste aumento\n"
            f"2. Dicas para controlar gastos nesta categoria\n"
            f"3. Metas realistas para o próximo mês\n\n"
            f"Use linguagem amigável e motivadora."
        )

    def _build_merchant_insight_prompt(
        self,
        merchant_name: str,
        merchant_category: str,
        current_avg: float,
        category_avg: float,
        visit_count: int,
    ) -> str:
        """Constrói prompt para insight de merchant."""
        diff_percent = (current_avg - category_avg) / category_avg * 100
        return (
            f"Analise o seguinte estabelecimento:\n\n"
            f"Nome: {merchant_name}\n"
            f"Categoria: {merchant_category}\n"
            f"Ticket médio: R$ {current_avg:.2f}\n"
            f"Média da categoria: R$ {category_avg:.2f}\n"
            f"Diferença: {diff_percent:.1f}% acima da média\n"
            f"Número de visitas: {visit_count}\n\n"
            f"Forneça uma análise concisa (máximo 3 frases) sobre:\n"
            f"1. Se vale a pena continuar comprando neste estabelecimento\n"
            f"2. Alternativas que podem ser mais econômicas\n"
            f"3. Situações em que este estabelecimento pode ser vantajoso\n\n"
            f"Use linguagem amigável e prática."
        )

    def _build_summary_prompt(
        self,
        total_value: Decimal,
        items: list[dict[str, Any]],
        merchant_name: Optional[str],
        merchant_category: Optional[str],
    ) -> str:
        """Constrói prompt para resumo da compra."""
        items_text = "\n".join(
            [
                f"- {item['description']} ({item['quantity']}x "
                f"R$ {item['unit_price']:.2f} = R$ {item['total_price']:.2f})"
                for item in items
            ]
        )

        merchant_info = (
            f"{merchant_name or 'Não informado'} "
            f"({merchant_category or 'Categoria não informada'})"
        )

        return (
            f"Analise a seguinte compra e forneça um resumo útil:\n\n"
            f"Valor total: R$ {total_value:.2f}\n"
            f"Estabelecimento: {merchant_info}\n\n"
            f"Itens:\n{items_text}\n\n"
            f"Forneça um resumo conciso (máximo 4 frases) que inclua:\n"
            f"1. Uma visão geral da compra\n"
            f"2. Destaque para itens mais relevantes\n"
            f"3. Uma dica rápida para economizar em compras similares\n\n"
            f"Use linguagem amigável e informativa."
        )


# Instância global do analisador
analyzer = AIAnalyzer()
