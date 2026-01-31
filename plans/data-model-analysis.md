# Análise do Modelo de Dados - SMarket

## Visão Geral

O sistema precisa capturar, processar e analisar notas fiscais para gerar insights sobre padrões de compra. Vamos analisar os requisitos e propor um modelo robusto.

## Entidades Principais

### 1. User (Usuário)
**Responsabilidade**: Autenticação e identificação do usuário

```yaml
User:
  - id: UUID (PK)
  - email: string (unique)
  - hashed_password: string
  - full_name: string
  - is_active: boolean
  - preferences: JSON (configurações do usuário)
  - created_at: datetime
  - updated_at: datetime
```

**Relacionamentos**:
- 1:N com Invoice (um usuário tem muitas notas)
- 1:N com Category (categorias personalizadas)
- 1:N com Analysis (insights gerados)
- 1:N com Merchant (estabelecimentos favoritos)

---

### 2. Merchant (Estabelecimento)
**Responsabilidade**: Armazenar informações sobre lojas/estabelecimentos

**Por que separar?**
- Um mesmo CNPJ pode emitir várias notas
- Permite análise por estabelecimento
- Identifica padrões de compra em locais específicos

```yaml
Merchant:
  - id: UUID (PK)
  - cnpj: string (14 dígitos, unique)
  - name: string (nome fantasia)
  - legal_name: string (razão social)
  - address: JSON (endereço completo)
  - city: string
  - state: string (UF)
  - category: string (tipo de estabelecimento: supermercado, farmácia, etc.)
  - is_favorite: boolean (marcado pelo usuário)
  - visit_count: integer (quantidade de visitas)
  - total_spent: decimal (total gasto no estabelecimento)
  - user_id: UUID (FK) - permite múltiplos usuários terem o mesmo merchant
  - created_at: datetime
```

**Relacionamentos**:
- N:1 com User
- 1:N com Invoice (um merchant emite várias notas)

---

### 3. Invoice (Nota Fiscal)
**Responsabilidade**: Dados da nota fiscal completa

```yaml
Invoice:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - merchant_id: UUID (FK)
  
  # Dados da Nota Fiscal
  - access_key: string (44 dígitos, chave única da Sefaz)
  - number: string (número da nota)
  - series: string (série)
  - issue_date: datetime (data de emissão)
  - invoice_type: enum (NFC-e, NF-e)
  
  # Valores
  - total_value: decimal
  - discount_value: decimal (opcional)
  - tax_value: decimal (impostos)
  
  # Metadados
  - source: enum (qrcode, xml, pdf, manual)
  - raw_data: JSON (XML completo ou dados brutos)
  - status: enum (processed, processing, error)
  
  # Análise
  - item_count: integer (quantidade de itens)
  - category_distribution: JSON (percentual por categoria)
  
  - created_at: datetime
  - updated_at: datetime
```

**Relacionamentos**:
- N:1 com User
- N:1 com Merchant
- 1:N com InvoiceItem (itens da nota)
- 1:N com InvoiceAnalysis (análises específicas desta nota)

---

### 4. InvoiceItem (Item da Nota)
**Responsabilidade**: Cada produto/serviço na nota fiscal

**Por que separar de Product?**
- InvoiceItem é uma instância específica (ex: "Arroz 5kg comprado dia X por R$ 25,00")
- Product é o conceito genérico (ex: "Arroz")
- Permite histórico de preços do mesmo produto

```yaml
InvoiceItem:
  - id: UUID (PK)
  - invoice_id: UUID (FK)
  - product_id: UUID (FK, nullable) - link para produto genérico
  
  # Dados do item na nota
  - code: string (código do produto na nota)
  - description: string (descrição como veio na nota)
  - quantity: decimal
  - unit: string (UN, KG, LT, etc.)
  - unit_price: decimal
  - total_price: decimal
  - discount: decimal
  
  # Categorização
  - category_id: UUID (FK, nullable)
  - ai_suggested_category: string (sugestão da IA antes de confirmar)
  - ai_confidence: float (0-1, confiança da sugestão)
  
  # Normalização (extraído da descrição)
  - normalized_name: string (nome limpo: "ARROZ" ao invés de "ARROZ TIPO 1 5KG")
  - brand: string (marca extraída)
  - quantity_normalized: decimal (quantidade em unidade base)
  
  - created_at: datetime
```

**Relacionamentos**:
- N:1 com Invoice
- N:1 com Product (opcional)
- N:1 com Category

---

### 5. Product (Produto Genérico)
**Responsabilidade**: Catalogar produtos únicos para análise

**Exemplo**: 
- InvoiceItem: "ARROZ TIPO 1 5KG" - R$ 25,00 - 2024-01-15
- InvoiceItem: "ARROZ TIPO 1 5KG" - R$ 27,00 - 2024-02-10
- Product: "Arroz Tipo 1" (consolida ambos)

```yaml
Product:
  - id: UUID (PK)
  - user_id: UUID (FK, nullable) - null = produto global
  
  # Identificação
  - name: string (nome normalizado)
  - normalized_name: string (nome para matching: "ARROZ_TIPO_1")
  - category_id: UUID (FK)
  
  # Características
  - typical_unit: string (unidade mais comum)
  - typical_quantity: decimal (quantidade típica)
  - brand: string (marca, se identificável)
  
  # Estatísticas do usuário
  - purchase_count: integer (quantas vezes comprou)
  - average_price: decimal (preço médio pago)
  - last_price: decimal (último preço pago)
  - price_trend: enum (increasing, decreasing, stable)
  
  # Matching
  - aliases: JSON (variações de nome: ["ARROZ 5KG", "ARROZ TIPO 1"])
  
  - created_at: datetime
  - updated_at: datetime
```

**Relacionamentos**:
- N:1 com User (opcional)
- N:1 com Category
- 1:N com InvoiceItem

---

### 6. Category (Categoria)
**Responsabilidade**: Classificar produtos e gastos

```yaml
Category:
  - id: UUID (PK)
  - user_id: UUID (FK, nullable) - null = categoria padrão do sistema
  
  # Dados básicos
  - name: string (ex: "Alimentação", "Higiene Pessoal")
  - description: string
  - color: string (hex para gráficos)
  - icon: string (nome do ícone)
  
  # Hierarquia (opcional para subcategorias)
  - parent_id: UUID (FK, nullable)
  - level: integer (0 = raiz, 1 = subcategoria)
  
  # Estatísticas
  - total_spent: decimal (total gasto nesta categoria)
  - transaction_count: integer
  
  - created_at: datetime
```

**Relacionamentos**:
- N:1 com User (opcional)
- 1:N com InvoiceItem
- 1:N com Product
- 1:N com Category (auto-relacionamento para subcategorias)

---

### 7. Analysis (Análise/Insight)
**Responsabilidade**: Insights gerados pela IA sobre padrões de compra

```yaml
Analysis:
  - id: UUID (PK)
  - user_id: UUID (FK)
  - invoice_id: UUID (FK, nullable) - se for análise específica de uma nota
  
  # Classificação
  - type: enum (
      spending_pattern,    # Padrão de gastos
      price_alert,         # Alerta de preço
      category_insight,    # Insight sobre categoria
      merchant_pattern,    # Padrão de compra em estabelecimento
      recommendation,      # Recomendação
      summary              # Resumo periódico
    )
  - priority: enum (low, medium, high, critical)
  
  # Conteúdo
  - title: string
  - description: string
  - details: JSON (dados estruturados da análise)
  
  # Exemplo de details para diferentes tipos:
  # spending_pattern: { category: "Alimentação", change_percent: 15, period: "monthly" }
  # price_alert: { product: "Arroz", old_price: 25.0, new_price: 30.0, increase_percent: 20 }
  
  # Contexto
  - reference_period_start: date
  - reference_period_end: date
  - related_categories: JSON (array de category_ids)
  - related_merchants: JSON (array de merchant_ids)
  
  # Status
  - is_read: boolean
  - is_acted_upon: boolean (usuário tomou alguma ação)
  - dismissed_at: datetime (se o usuário descartou)
  
  # Métricas
  - ai_model: string (qual modelo gerou: gpt-4o-mini)
  - confidence_score: float (0-1)
  
  - created_at: datetime
  - updated_at: datetime
```

**Relacionamentos**:
- N:1 com User
- N:1 com Invoice (opcional)

---

### 8. PurchasePattern (Padrão de Compra)
**Responsabilidade**: Detectar e armazenar padrões recorrentes

```yaml
PurchasePattern:
  - id: UUID (PK)
  - user_id: UUID (FK)
  
  # O que é o padrão
  - pattern_type: enum (
      recurring_product,   # Compra o mesmo produto periodicamente
      recurring_merchant,  # Visita o mesmo estabelecimento
      day_of_week,         # Compra em dia específico
      time_of_day,         # Compra em horário específico
      seasonal             # Padrão sazonal
    )
  
  # Alvo do padrão
  - target_type: enum (product, merchant, category)
  - target_id: UUID (referência ao alvo)
  
  # Frequência
  - frequency: enum (daily, weekly, biweekly, monthly)
  - average_interval_days: integer (média de dias entre compras)
  - last_occurrence: datetime
  - next_predicted: datetime (quando a IA prevê a próxima compra)
  
  # Estatísticas
  - occurrence_count: integer (quantas vezes ocorreu)
  - consistency_score: float (0-1, quão regular é)
  
  # Alerta
  - alert_enabled: boolean
  - alert_threshold_days: integer (alertar se passar X dias)
  
  - created_at: datetime
  - updated_at: datetime
```

**Relacionamentos**:
- N:1 com User

---

## Diagrama de Relacionamentos

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│    User     │◄──────┤   Merchant   │◄──────┤   Invoice   │
│             │   1:N │              │   1:N │             │
└──────┬──────┘       └──────────────┘       └──────┬──────┘
       │                                            │
       │         ┌──────────────┐                   │
       │    ┌────┤ InvoiceItem  │◄──────────────────┘
       │    │    │              │              1:N
       │    │    └──────┬───────┘
       │    │           │
       │    │    ┌──────▼───────┐       ┌─────────────┐
       │    └───►│   Product    │◄──────┤  Category   │
       │      N:1│              │  N:1  │             │
       │         └──────────────┘       └──────┬──────┘
       │                                       │
       │    ┌──────────────┐                   │
       └───►│   Analysis   │                   │
       1:N  │              │                   │
            └──────────────┘                   │
                                               │
            ┌──────────────┐                   │
            │PurchasePattern│◄─────────────────┘
            │              │              1:N
            └──────────────┘
```

## Fluxo de Dados

### 1. Captura da Nota Fiscal
```
QR Code/XML/PDF → Parser → Invoice + InvoiceItems
```

### 2. Processamento
```
InvoiceItems → Normalização → Product (matching/criação)
           → Categorização → Category (IA ou manual)
```

### 3. Análise
```
Invoice + InvoiceItems + History → IA → Analysis + PurchasePattern
```

## Vantagens deste Modelo

1. **Flexibilidade**: Suporta diferentes fontes (QR, XML, PDF)
2. **Normalização**: Produtos são catalogados para análise de preços
3. **Extensibilidade**: Fácil adicionar novos tipos de análise
4. **Performance**: Índices estratégicos em campos de consulta frequente
5. **Histórico**: Mantém dados brutos da nota para auditoria
6. **Insights**: Estrutura rica para geração de padrões e recomendações
