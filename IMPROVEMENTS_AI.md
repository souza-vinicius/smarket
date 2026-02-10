# 10 Novas Análises de IA com Perfil do Usuário

**Data:** 2026-02-10
**Branch:** feature/novo_layout_kimi
**Scope:** Backend AI Analyzer + Frontend Insights

---

## Contexto

O `AIAnalyzer` (`apps/api/src/services/ai_analyzer.py`) gera 4 tipos de análise (price_alert, category_insight, merchant_pattern, summary) mas **nenhum usa o perfil do usuário**. Os campos `household_income`, `adults_count` e `children_count` existem no banco, na API e no frontend (settings page) mas são **completamente ignorados** nas análises.

Este plano adiciona 10 novas análises que aproveitam o perfil familiar para gerar insights financeiros personalizados.

---

## Avaliação das Análises Existentes

| Tipo | Nota | Pontos Fortes | Fraquezas |
|------|------|---------------|-----------|
| `price_alert` | 7/10 | Granularidade por produto, histórico 90 dias | Fuzzy match impreciso, sem ajuste sazonal, sem inflação |
| `category_insight` | 6/10 | Visão por categoria, acionável | Ignora categorias < R$50, sem subcategorias, sem sazonalidade |
| `merchant_pattern` | 6/10 | Comparação entre pares, considera fidelidade | Só compara dados do próprio usuário (não de mercado), requer 3+ visitas |
| `summary` | 5/10 | Visão geral educativa | Genérico, baixa acionabilidade, prioridade sempre "low" |

**Problema comum**: Nenhuma análise contextualiza os dados com a realidade financeira do usuário (renda, tamanho da família).

---

## 10 Novas Análises (ordenadas por probabilidade de utilidade)

### 1. `budget_health` — Saúde do Orçamento Familiar (90%)

- **O que faz**: Avalia a proporção dos gastos com compras em relação à renda mensal, comparando com benchmarks brasileiros (DIEESE: famílias gastam 20-35% da renda com alimentação)
- **Usa perfil**: `household_income` (denominador), `adults_count` + `children_count` (contextualiza se o % é adequado para o tamanho da família)
- **Dados**: `Invoice.total_value` do mês + histórico 3 meses + `User.household_income`
- **Dispara quando**: `household_income` > 0 E gasto mensal > 25% da renda
- **Prioridade**: critical >50% | high >40% | medium >30% | low 25-30%
- **Confiança**: 0.85

### 2. `per_capita_spending` — Gasto por Pessoa da Família (85%)

- **O que faz**: Calcula gasto mensal per capita usando escala OECD (crianças = peso 0.7) e acompanha evolução
- **Usa perfil**: `adults_count` + `children_count` (divisor), `household_income` (renda per capita)
- **Dados**: `Invoice.total_value` mensal ÷ membros ponderados
- **Dispara quando**: Per capita muda >20% vs média 3 meses OU per capita > R$500/mês
- **Prioridade**: high >30% aumento ou >R$800 | medium 20-30% | low estável/decrescendo
- **Confiança**: 0.80

### 3. `essential_ratio` — Proporção Essenciais vs Supérfluos (82%)

- **O que faz**: Classifica itens entre essenciais (alimentos básicos, higiene, limpeza) e não-essenciais (snacks, bebidas alcoólicas, conveniência)
- **Usa perfil**: `household_income` (% da renda em supérfluos), `children_count` (famílias com crianças devem ter ratio essencial mais alto)
- **Dados**: `InvoiceItem.category_name` mapeado para essencial/não-essencial + `total_price`
- **Dispara quando**: Invoice com 5+ itens E não-essenciais > 35% do total
- **Prioridade**: high >50% não-essencial ou >15% da renda | medium 35-50%
- **Confiança**: 0.70

### 4. `income_commitment` — Comprometimento da Renda com Mercado (78%)

- **O que faz**: Rastreia acumulado do mês e projeta se vai ultrapassar limites saudáveis antes do fim do mês (sistema de alerta antecipado)
- **Usa perfil**: `household_income` (teto), `adults_count` + `children_count` (ajusta threshold — famílias maiores gastam % maior)
- **Dados**: `Invoice.total_value` acumulado no mês + dia do mês + run-rate diário + histórico
- **Dispara quando**: Gasto > 20% da renda com 10+ dias restantes OU projeção mensal > 35%
- **Prioridade**: critical acumulado >40% com 7+ dias | high projeção >40% | medium projeção >35%
- **Confiança**: 0.80

### 5. `children_spending` — Gastos com Crianças (75%)

- **O que faz**: Identifica e agrupa gastos com produtos infantis (fraldas, leite, papinha), mostra custo por criança e oportunidades de economia
- **Usa perfil**: `children_count` (OBRIGATÓRIO > 0), `household_income` (% da renda com crianças)
- **Dados**: `InvoiceItem.description` (keywords: fralda, leite, papinha, bebe, infantil) + `Product.min_price`
- **Dispara quando**: `children_count` > 0 E invoice tem 2+ itens infantis
- **Prioridade**: high gasto infantil > 25% vs média 3 meses ou >15% da renda | medium 8-15% da renda
- **Confiança**: 0.72

### 6. `wholesale_opportunity` — Oportunidade de Compra no Atacado (72%)

- **O que faz**: Identifica produtos comprados frequentemente em pequenas quantidades que seriam mais baratos no atacado/atacarejo
- **Usa perfil**: `adults_count` + `children_count` (volume de consumo), `household_income` (viabilidade de compra em lote)
- **Dados**: `PurchasePattern` (RECURRING_PRODUCT, WEEKLY/BIWEEKLY) + `Merchant.category` + `Product.average_price`
- **Dispara quando**: 3+ padrões recorrentes E pelo menos 1 produto comprado semanalmente em supermercado (não atacadista)
- **Prioridade**: high economia > R$100/mês ou >3% da renda | medium R$50-100 | low <R$50
- **Confiança**: 0.65

### 7. `shopping_frequency` — Frequência de Compras e Custos Ocultos (70%)

- **O que faz**: Analisa frequência de visitas e custos ocultos das "compras picadas" (impulso, deslocamento), sugere calendário otimizado
- **Usa perfil**: `adults_count` + `children_count` (famílias maiores precisam reposição mais frequente), `household_income` (viabilidade de consolidar compras)
- **Dados**: `Invoice.issue_date` (frequência), `Invoice.item_count` (<5 = compra de impulso), `Merchant.visit_count`
- **Dispara quando**: 8+ invoices/mês OU 5+ merchants diferentes OU média <5 itens/invoice
- **Prioridade**: high 12+ invoices com ticket <R$80 | medium 8-11 invoices
- **Confiança**: 0.75

### 8. `seasonal_alert` — Alerta Sazonal de Preços (65%)

- **O que faz**: Identifica produtos fora de temporada (mais caros) e sugere substituições in-season, considerando necessidades da família
- **Usa perfil**: `children_count` (prioriza alternativas child-friendly), `adults_count` (volume), `household_income` (famílias de menor renda se beneficiam mais)
- **Dados**: `InvoiceItem` em categorias "Frutas/Verduras/Legumes" + `Product.min_price/max_price` + calendário sazonal BR
- **Dispara quando**: Invoice com 3+ itens de hortifruti E 1+ item >30% acima do mínimo histórico
- **Prioridade**: high 3+ itens acima e economia >R$30 | medium 1-2 itens com crianças
- **Confiança**: 0.68

### 9. `savings_potential` — Potencial de Economia Mensal (60%)

- **O que faz**: Consolida TODAS as oportunidades de economia (marca, atacado, sazonalidade, impulso) em um plano de ação priorizado
- **Usa perfil**: `household_income` (prioriza ações por ROI relativo à renda), `adults_count` + `children_count` (mais vetores de economia, mais restrições)
- **Dados**: Todas as `Analysis` recentes do usuário + `Product.min_price` vs `last_price` + `Merchant.average_ticket`
- **Dispara quando**: 5+ análises existentes E gasto mensal > 20% da renda | máx 1x/mês
- **Prioridade**: high economia > 10% do gasto mensal | medium 5-10% | low <5%
- **Confiança**: 0.72

### 10. `family_nutrition` — Equilíbrio Nutricional da Família (55%)

- **O que faz**: Avalia distribuição de categorias de alimentos (proteínas, carboidratos, frutas/verduras, laticínios, processados) e identifica lacunas nutricionais
- **Usa perfil**: `children_count` (quando > 0, verifica cálcio, ferro, fibra), `adults_count` (necessidades calóricas), `household_income` (sugere alternativas acessíveis)
- **Dados**: `InvoiceItem.category_name` mapeado para grupos alimentares + últimos 30 dias de compras
- **Dispara quando**: 3+ invoices em 30 dias E 1+ grupo alimentar ausente ou <5% do gasto total
- **Prioridade**: high crianças + sem frutas/verduras ou laticínios em 30 dias | medium 1 grupo ausente | low informativo
- **Confiança**: 0.60

---

## Implementação

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `apps/api/src/services/ai_analyzer.py` | Adicionar 10 novos métodos de análise + carregar perfil do usuário |
| `apps/api/src/tasks/ai_analysis.py` | Carregar `User` model e passar para o analyzer; separar análises per-invoice vs mensais |
| `apps/web/src/app/insights/page.tsx` | Adicionar 10 novos tipos no `typeConfig` (labels, cores, ícones) |
| `apps/web/src/components/dashboard/insight-card.tsx` | Adicionar entradas em `typeIcons` e `typeLabels` |

### Mudança Chave no Backend

Em `ai_analysis.py`, carregar o `User`:
```python
user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
user = user_result.scalar_one_or_none()
```

Passar `user` para `analyze_invoice()`, que repassa `household_income`, `adults_count`, `children_count` para cada novo método.

### Degradação Graceful

Cada análise verifica se os campos necessários existem:
- Sem `household_income` → pula budget_health, income_commitment, savings_potential
- `children_count == 0` → pula children_spending
- Sem padrões recorrentes → pula wholesale_opportunity

### Cadência

- **Per-invoice** (rodam a cada confirmação): essential_ratio, seasonal_alert, children_spending
- **Mensais** (rodam 1x/mês ou na primeira invoice do mês): budget_health, per_capita_spending, income_commitment, shopping_frequency, wholesale_opportunity, savings_potential, family_nutrition

### Performance

Análises mensais rodam apenas quando é a primeira invoice do mês (ou última análise daquele tipo tem >30 dias). Isso evita sobrecarregar o processamento de cada invoice.

---

## Verificação

1. **Backend**: `docker-compose up -d --build api` e conferir logs
2. **Upload invoice**: Com usuário que tenha `household_income`, `adults_count`, `children_count` preenchidos
3. **Conferir insights**: `GET /api/v1/analysis/` deve retornar os novos tipos
4. **Frontend**: Página de insights deve exibir os novos tipos com ícones e cores corretos
5. **Degradação**: Testar com usuário SEM perfil preenchido → apenas análises antigas devem rodar
