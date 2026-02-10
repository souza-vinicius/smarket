"""
Serviço de IA para análise de compras e geração de insights.
Utiliza OpenAI API para gerar análises inteligentes sobre notas fiscais.
"""

from datetime import timedelta
from decimal import Decimal
from typing import Any, Optional

from openai import AsyncOpenAI
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.models.analysis import Analysis
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.merchant import Merchant
from src.models.product import Product


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
        self, invoice: Invoice, user_history: dict[str, Any], db: AsyncSession
    ) -> list[Analysis]:
        """
        Analisa uma nota fiscal específica e gera insights.

        Args:
            invoice: Nota fiscal a ser analisada
            user_history: Histórico de compras do usuário
            db: Sessão do banco de dados

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

        # Gerar diferentes tipos de análises
        price_alerts = await self._detect_price_alerts(invoice, items, user_history, db)
        analyses.extend(price_alerts)

        category_insights = await self._generate_category_insights(
            invoice, items, user_history, db
        )
        analyses.extend(category_insights)

        merchant_analysis = await self._analyze_merchant(
            invoice, merchant, user_history, db
        )
        if merchant_analysis:
            analyses.append(merchant_analysis)

        # Gerar resumo da compra
        summary = await self._generate_purchase_summary(invoice, items, merchant, db)
        if summary:
            analyses.append(summary)

        return analyses

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
