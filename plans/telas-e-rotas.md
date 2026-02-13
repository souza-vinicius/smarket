# Levantamento de Telas e Rotas - Frontend Mercado Esperto

## Telas Implementadas

### 1. Home (`/`)

- **Arquivo:** `apps/web/src/app/page.tsx`
- **Descrição:** Redireciona automaticamente para `/dashboard`

---

### 2. Login (`/login`)

- **Arquivo:** `apps/web/src/app/login/page.tsx`
- **Descrição:** Tela de autenticação de usuários

**Funcionalidades:**
- Formulário com email e senha
- Toggle de visibilidade de senha
- Checkbox "Lembrar de mim"
- Loading state durante login

---

### 3. Registro (`/register`)

- **Arquivo:** `apps/web/src/app/register/page.tsx`
- **Descrição:** Cadastro de novos usuários

**Campos:**
- Nome completo
- Email
- Senha (mínimo 8 caracteres)
- Confirmação de senha
- Termos de uso

---

### 4. Dashboard (`/dashboard`)

- **Arquivo:** `apps/web/src/app/dashboard/page.tsx`
- **Descrição:** Visão geral dos gastos e insights

**Cards de Resumo:**
- Gastos do mês (com variação %)
- Notas fiscais do mês
- Insights não lidos
- Top estabelecimento

**Ações:**
- Adicionar nota fiscal
- Ver análises

---

### 5. Análises (`/dashboard/analytics`)

- **Arquivo:** `apps/web/src/app/dashboard/analytics/page.tsx`
- **Descrição:** Gráficos e tendências de gastos

**Gráficos:**
- Gastos mensais (bar chart)
- Gastos por categoria (pie chart)
- Tendência de gastos (line chart)

**Estatísticas:**
- Média mensal
- Maior gasto
- Menor gasto
- Total no período

---

### 6. Insights (`/insights`)

- **Arquivo:** `apps/web/src/app/insights/page.tsx`
- **Descrição:** Lista completa de insights

**Filtros por Tipo:**
- Todos
- Não lidos
- Alertas de preço
- Categorias
- Estabelecimentos

**Filtros por Prioridade:**
- Crítica
- Alta
- Média
- Baixa

---

### 7. Notas Fiscais (`/invoices`)

- **Arquivo:** `apps/web/src/app/invoices/page.tsx`
- **Descrição:** Lista de todas as notas fiscais

**Funcionalidades:**
- Busca por estabelecimento ou chave
- Filtros: Todas, NFC-e, NF-e
- Modal de upload (XML/QR Code)

**Estatísticas:**
- Total de notas
- Total gasto
- Notas do mês

---

### 8. Adicionar Nota (`/invoices/add`)

- **Arquivo:** `apps/web/src/app/invoices/add/page.tsx`
- **Descrição:** Página para adicionar novas notas

**Opções de Upload:**
- Upload de arquivo XML
- Processamento de QR Code

**Exibe:**
- Últimas 3 notas recentes

---

## Componentes Compartilhados

### Layout

| Componente   | Arquivo                                      | Descrição                |
|--------------|----------------------------------------------|--------------------------|
| Sidebar      | components/layout/sidebar.tsx                | Barra lateral            |
| Header       | components/layout/header.tsx                 | Cabeçalho das páginas    |

### Dashboard

| Componente    | Arquivo                                       | Descrição                |
|---------------|-----------------------------------------------|--------------------------|
| SummaryCard   | components/dashboard/summary-card.tsx          | Card de resumo           |
| InsightCard   | components/dashboard/insight-card.tsx          | Card de insight          |
| SpendingChart | components/dashboard/spending-chart.tsx        | Gráficos de gastos      |

### Notas Fiscais

| Componente      | Arquivo                                        | Descrição            |
|-----------------|------------------------------------------------|----------------------|
| InvoiceList     | components/invoices/invoice-list.tsx           | Lista de notas       |
| AddInvoiceOptions| components/invoices/add-invoice-options.tsx    | Opções de upload     |
| UploadModal     | components/invoices/upload-modal.tsx           | Modal de upload      |

### UI

| Componente | Arquivo                              | Descrição         |
|------------|--------------------------------------|-------------------|
| Button     | components/ui/button.tsx             | Botões            |
| Card       | components/ui/card.tsx               | Cards             |
| Input      | components/ui/input.tsx              | Inputs            |
| Badge      | components/ui/badge.tsx             | Badges            |
| Skeleton   | components/ui/skeleton.tsx           | Loading states    |

---

## Hooks Personalizados

| Hook           | Arquivo                            | Descrição                  |
|----------------|------------------------------------|----------------------------|
| useAuth        | hooks/use-auth.ts                  | Autenticação               |
| useDashboard   | hooks/use-dashboard.ts             | Dados do dashboard         |
| useInsights    | hooks/use-insights.ts              | Dados de insights          |
| useInvoices    | hooks/use-invoices.ts              | Dados de notas fiscais     |

---

## Estrutura de Rotas

```
/
├── /login
├── /register
├── /dashboard
│   └── /analytics
├── /insights
└── /invoices
    └── /add
```

---

## Rotas Não Implementadas

| Rota                | Descrição                     |
|---------------------|-------------------------------|
| /invoices/[id]      | Detalhes da nota fiscal       |
| /merchants          | Lista de estabelecimentos     |
| /categories         | Gerenciamento de categorias   |
| /products          | Catálogo de produtos          |
| /settings          | Configurações do usuário      |
| /profile           | Perfil do usuário             |
| /forgot-password   | Recuperação de senha          |

---

## Próximas Telas Sugeridas

1. Detalhes da nota fiscal (`/invoices/[id]`)
2. Lista de estabelecimentos (`/merchants`)
3. Gerenciamento de categorias (`/categories`)
4. Configurações (`/settings`)
5. Perfil do usuário (`/profile`)
6. Recuperação de senha (`/forgot-password`)
7. Comparação de preços
8. Tendências de compras
9. Modo escuro
10. Notificações push