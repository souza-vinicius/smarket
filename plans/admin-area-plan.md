# Plano de Implementação - Área Administrativa Mercado Esperto

## Visão Geral

Este documento descreve o plano para implementação da área administrativa do Mercado Esperto, um SaaS de análise de notas fiscais brasileiras.

> **Restrição de Acesso:** A área administrativa é destinada exclusivamente ao uso via navegador (Web). **Não deve estar disponível ou acessível através do aplicativo móvel (Capacitor/App Store/Play Store).** Implementar bloqueios no middleware e ocultar links de navegação quando detectado ambiente nativo.

### Infraestrutura Existente (Reaproveitamento)

Antes de listar o que construir, é importante mapear o que **já existe** e será reaproveitado:

| Componente | Arquivo Existente | O que reaproveitar |
|-----------|-------------------|-------------------|
| **Subscription model** | `src/models/subscription.py` | Enums (SubscriptionPlan, BillingCycle, SubscriptionStatus), properties (is_active, invoice_limit, analysis_limit) |
| **Payment model** | `src/models/payment.py` | amount, currency, status, provider, provider_payment_id |
| **UsageRecord model** | `src/models/usage_record.py` | Contadores mensais por user (invoices_count, ai_analyses_count) |
| **Stripe service** | `src/services/stripe_service.py` | Checkout, portal, cancel, webhook verification, price mapping |
| **Subscription service** | `src/services/subscription_service.py` | Webhook handlers completos (payment succeeded/failed, subscription updated/deleted) |
| **User model** | `src/models/user.py` | Já tem `is_active`; falta apenas `admin_role` e `deleted_at` |
| **Auth system** | `src/dependencies.py` | `get_current_user` dependency — base para `get_current_admin` |
| **Redis** | `docker-compose.yml` | Redis 7-alpine já configurado com persistência e LRU policy |
| **Recharts** | `apps/web/package.json` | recharts@2.15.4 já instalado e em uso no dashboard de analytics |
| **UI components** | `apps/web/src/components/ui/` | button, input, card, badge, modal, skeleton — todos reutilizáveis |
| **Capacitor detection** | `apps/web/src/lib/capacitor.ts` | `isNative()` e `getPlatform()` — base para bloqueio nativo do admin |

---

## 1. Análise de Requisitos

### 1.1 Métricas SaaS (KPIs)

| Métrica | Descrição | Fórmula |
|---------|-----------|---------|
| **MRR** | Receita recorrente mensal | Soma de assinaturas ativas mensais + (anuais/12) |
| **ARR** | Receita recorrente anual | MRR x 12 |
| **ARPU** | Receita média por usuário | MRR / Usuários pagantes |
| **Churn Rate** | Taxa de cancelamento | Cancelamentos no mês / Assinantes início do mês |
| **LTV** | Valor vitalício do cliente | ARPU / Churn Rate |
| **Trial Conversion** | Conversão de trial | Trials convertidos / Trials finalizados |
| **Active Users** | Usuários ativos | DAU (diário) / MAU (mensal) |
| **Net MRR** | MRR líquido | MRR + Expansão - Contração - Churn |

### 1.2 Métricas Operacionais (produto de OCR)

| Métrica | Descrição | Fonte de dados |
|---------|-----------|----------------|
| **Invoices/dia** | Notas processadas por dia | `invoice_processing` table |
| **OCR Success Rate** | Taxa de sucesso da extração | status `extracted` vs `error` |
| **Avg Processing Time** | Tempo médio de processamento | timestamps em `invoice_processing` |
| **Provider Breakdown** | Uso por provider LLM | Logs de token_callback |
| **Token Cost/Invoice** | Custo médio de tokens por nota | Logs de token_callback |

### 1.3 Funcionalidades por Módulo

#### Dashboard
- Cards com KPIs principais (MRR, users, churn, trial conversion)
- Gráfico de receita (MRR ao longo do tempo)
- Gráfico de crescimento de usuários
- Métricas operacionais (invoices processadas, taxa de sucesso OCR)
- Alertas e notificações

#### Gestão de Usuários
- Listagem com busca e filtros
- Visualização detalhada do perfil (incluindo subscription, usage, invoices)
- Edição de informações
- Desativação/ativação de contas (soft delete)
- Impersonação simplificada para suporte (V1: JWT + audit log)
- Visualização de histórico de atividades

#### Gestão de Assinaturas
- Listagem com filtros por status/plano
- Modificação de planos (upgrade/downgrade via Stripe)
- Extensão de período trial
- Cancelamento de assinaturas
- Histórico de alterações

#### Gestão de Pagamentos
- Listagem de transações
- Detalhes de cada pagamento
- Processamento de reembolsos via Stripe (parcial/total)

#### Relatórios
- Análise de churn
- Funil de conversão
- Exportação CSV
- Relatório de Net MRR (movimentações)

#### Configurações
- Feature flags
- Logs de auditoria
- Papéis e permissões administrativas

#### Gestão de Cupons e Promoções
- Criar/editar/desativar cupons
- Definir tipos de desconto (percentual ou valor fixo)
- Configurar validade e limites de uso
- Aplicar a planos específicos
- Rastrear uso de cupons
- Restrição de stacking (não acumulativo)
- Cupom para primeira compra apenas
- Reutilização após cancelamento (configurável)

#### System Health
- Status dos serviços (DB, Redis, Stripe, LLM providers)
- Métricas de processamento em tempo real

---

## 2. Arquitetura

### 2.1 Diagrama de Alto Nível

```mermaid
graph TB
    subgraph Frontend [Next.js 14 - Admin Area]
        AD[Admin Dashboard]
        AU[Users Management]
        AS[Subscriptions Management]
        AP[Payments Management]
        AR[Reports]
        AC[Settings]
        ACP[Coupons Management]
    end

    subgraph Backend [FastAPI - Admin Endpoints]
        API[/api/v1/admin/*]
        AUTH[Admin Auth Middleware]
        RBAC[Role-Based Access Control]
        SVC[Admin Services]
    end

    subgraph Database [PostgreSQL]
        U[Users - EXISTENTE]
        S[Subscriptions - EXISTENTE]
        P[Payments - EXISTENTE]
        UR[UsageRecords - EXISTENTE]
        AL[AuditLogs - NOVO]
        CP[Coupons - NOVO]
        CU[CouponUsages - NOVO]
    end

    subgraph External [External Services - EXISTENTE]
        STRIPE[Stripe API]
    end

    AD --> API
    AU --> API
    AS --> API
    AP --> API
    AR --> API
    AC --> API
    ACP --> API

    API --> AUTH
    AUTH --> RBAC
    RBAC --> SVC
    SVC --> U
    SVC --> S
    SVC --> P
    SVC --> AL
    SVC --> UR
    SVC --> CP
    SVC --> CU
    SVC --> STRIPE
```

### 2.2 Estrutura de Arquivos

#### Backend — Novos arquivos (apps/api/src/)

```
src/
├── models/
│   ├── audit_log.py              # NOVO: Modelo de log de auditoria
│   ├── coupon.py                 # NOVO: Modelo de cupom + CouponUsage
│   └── user.py                   # MODIFICAR: Adicionar admin_role, deleted_at
├── schemas/
│   ├── admin.py                  # NOVO: Schemas para área admin
│   └── coupon.py                 # NOVO: Schemas para cupons
├── routers/
│   ├── admin/
│   │   ├── __init__.py           # Router agregador + admin middleware
│   │   ├── dashboard.py          # Endpoints de dashboard + métricas operacionais
│   │   ├── users.py              # Endpoints de usuários
│   │   ├── subscriptions.py      # Endpoints de assinaturas
│   │   ├── payments.py           # Endpoints de pagamentos
│   │   ├── reports.py            # Endpoints de relatórios
│   │   ├── settings.py           # Endpoints de configurações
│   │   ├── coupons.py            # Endpoints de cupons (admin)
│   │   └── system.py             # Health check dos serviços
│   └── coupons.py                # NOVO: Rota pública de validação de cupom
├── services/
│   ├── admin_service.py          # NOVO: Lógica de negócio admin
│   ├── coupon_service.py         # NOVO: Lógica de cupons
│   └── metrics_service.py        # NOVO: Cálculo de métricas (queries diretas)
├── dependencies.py               # MODIFICAR: Adicionar get_current_admin, require_permission
└── core/
    └── roles.py                  # NOVO: Definição de papéis e permissões
```

#### Frontend — Novos arquivos (apps/web/src/)

```
src/
├── middleware.ts                  # NOVO: Next.js middleware — bloqueia /admin/* em ambiente nativo (WebView)
├── app/admin/
│   ├── layout.tsx                # Layout admin com sidebar + guard de acesso (WEB ONLY + isNative() block)
│   ├── page.tsx                  # Dashboard principal
│   ├── users/
│   │   ├── page.tsx              # Lista de usuários
│   │   └── [id]/page.tsx         # Detalhes do usuário
│   ├── subscriptions/
│   │   ├── page.tsx              # Lista de assinaturas
│   │   └── [id]/page.tsx         # Detalhes da assinatura
│   ├── payments/
│   │   └── page.tsx              # Lista de pagamentos
│   ├── coupons/
│   │   ├── page.tsx              # Lista de cupons
│   │   ├── new/page.tsx          # Criar novo cupom
│   │   └── [id]/page.tsx         # Editar cupom
│   ├── reports/
│   │   └── page.tsx              # Relatórios gerais + exportação
│   └── settings/
│       ├── page.tsx              # Configurações gerais
│       └── audit-logs/page.tsx   # Logs de auditoria
├── components/
│   ├── ui/
│   │   └── data-table.tsx        # NOVO: Componente genérico de tabela (TanStack Table)
│   └── admin/
│       ├── admin-sidebar.tsx     # Sidebar de navegação admin
│       ├── impersonation-bar.tsx # Barra de aviso de impersonação
│       ├── stats-card.tsx        # Card de estatística
│       └── charts/
│           ├── revenue-chart.tsx
│           └── growth-chart.tsx
├── hooks/
│   ├── use-admin-users.ts        # CRUD de usuários (admin)
│   ├── use-admin-subscriptions.ts
│   ├── use-admin-payments.ts
│   ├── use-admin-analytics.ts    # Métricas SaaS + operacionais
│   └── use-admin-coupons.ts
└── lib/
    └── admin-api.ts              # Cliente API admin (Axios com interceptors + header X-Platform)
```

---

## 3. Endpoints da API

### 3.1 Dashboard e Métricas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/admin/dashboard/stats` | Estatísticas gerais (users, MRR, churn) |
| GET | `/api/v1/admin/dashboard/revenue` | Dados de receita (MRR ao longo do tempo) |
| GET | `/api/v1/admin/dashboard/growth` | Métricas de crescimento de usuários |
| GET | `/api/v1/admin/dashboard/operations` | Métricas operacionais (OCR success rate, invoices/dia, avg time, provider breakdown) |
| GET | `/api/v1/admin/system/health` | Status dos serviços (DB, Redis, Stripe, LLM providers) |

> **Nota sobre cache:** Queries SQL diretas são suficientes no volume atual (< 100k registros). Cache Redis será adicionado somente quando métricas demorarem > 2s. Ver seção 7 para estratégia futura.

### 3.2 Usuários

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/v1/admin/users` | Listar usuários com paginação | user:read |
| GET | `/api/v1/admin/users/{id}` | Detalhes do usuário (+ subscription, usage) | user:read |
| PUT | `/api/v1/admin/users/{id}` | Atualizar usuário | user:update |
| DELETE | `/api/v1/admin/users/{id}` | Desativar usuário (soft delete) | user:delete |
| POST | `/api/v1/admin/users/{id}/restore` | Reativar usuário | user:update |
| POST | `/api/v1/admin/users/{id}/impersonate` | Gerar token de impersonação | user:impersonate |
| GET | `/api/v1/admin/users/{id}/activity` | Histórico de atividades | user:read |

### 3.3 Assinaturas

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/v1/admin/subscriptions` | Listar assinaturas | subscription:read |
| GET | `/api/v1/admin/subscriptions/{id}` | Detalhes da assinatura | subscription:read |
| PUT | `/api/v1/admin/subscriptions/{id}` | Modificar assinatura | subscription:update |
| POST | `/api/v1/admin/subscriptions/{id}/cancel` | Cancelar assinatura | subscription:delete |
| POST | `/api/v1/admin/subscriptions/{id}/extend-trial` | Estender trial | subscription:update |

### 3.4 Pagamentos

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/v1/admin/payments` | Listar pagamentos | payment:read |
| GET | `/api/v1/admin/payments/{id}` | Detalhes do pagamento | payment:read |
| POST | `/api/v1/admin/payments/{id}/refund` | Processar reembolso via Stripe | payment:refund |

### 3.5 Relatórios

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/admin/reports/mrr` | Relatório MRR detalhado |
| GET | `/api/v1/admin/reports/churn` | Análise de churn |
| GET | `/api/v1/admin/reports/conversion` | Taxa de conversão trial -> paid |
| GET | `/api/v1/admin/reports/export` | Exportação CSV (streaming) |

### 3.6 Configurações

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/v1/admin/settings` | Configurações atuais | settings:read |
| PUT | `/api/v1/admin/settings` | Atualizar configurações | settings:update |
| GET | `/api/v1/admin/audit-logs` | Logs de auditoria | audit:read |
| GET | `/api/v1/admin/roles` | Listar papéis | settings:read |

### 3.7 Cupons e Promoções

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/v1/admin/coupons` | Listar cupons | coupon:read |
| GET | `/api/v1/admin/coupons/{id}` | Detalhes do cupom | coupon:read |
| POST | `/api/v1/admin/coupons` | Criar novo cupom | coupon:create |
| PUT | `/api/v1/admin/coupons/{id}` | Atualizar cupom | coupon:update |
| DELETE | `/api/v1/admin/coupons/{id}` | Desativar cupom | coupon:delete |
| GET | `/api/v1/admin/coupons/{id}/usages` | Histórico de uso do cupom | coupon:read |
| GET | `/api/v1/admin/coupons/{id}/stats` | Estatísticas do cupom | coupon:read |
| POST | `/api/v1/coupons/validate` | Validar cupom (público) | - |

---

## 4. Modelo de Dados

### 4.1 Enum: AdminRole

```python
from enum import Enum

class AdminRole(str, Enum):
    """Papeis administrativos com diferentes niveis de acesso."""
    SUPER_ADMIN = "super_admin"      # Acesso total
    ADMIN = "admin"                  # Acesso a maioria das funcionalidades
    SUPPORT = "support"              # Apenas leitura + impersonacao
    FINANCE = "finance"              # Relatorios e pagamentos
    READ_ONLY = "read_only"          # Apenas visualizacao


# Mapeamento de permissoes por papel
ROLE_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: ["*"],
    AdminRole.ADMIN: [
        "user:*",
        "subscription:*",
        "payment:read", "payment:refund",
        "coupon:*",
        "settings:read",
        "audit:read",
    ],
    AdminRole.SUPPORT: [
        "user:read", "user:impersonate",
        "subscription:read",
        "payment:read",
    ],
    AdminRole.FINANCE: [
        "user:read",
        "subscription:read",
        "payment:*",
        "coupon:read",
        "audit:read",
    ],
    AdminRole.READ_ONLY: [
        "user:read",
        "subscription:read",
        "payment:read",
        "coupon:read",
        "settings:read",
        "audit:read",
    ],
}
```

### 4.2 Modificacao: User

O modelo User (`src/models/user.py`) ja possui `is_active`. Adicionar apenas:

```python
# Adicionar ao modelo User existente:
admin_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

# Property derivada (sem coluna extra no DB):
@property
def is_admin(self) -> bool:
    return self.admin_role is not None

# Indice parcial para queries admin
__table_args__ = (
    # ... constraints existentes ...
    Index('idx_users_admin_role', 'admin_role', postgresql_where=text("admin_role IS NOT NULL")),
)
```

> **Decisao:** Usar apenas `admin_role` (nullable) em vez de `is_admin` booleano separado. `admin_role IS NOT NULL` = eh admin. Menos redundancia, menos bugs.

### 4.3 Bootstrap do Primeiro Admin

Script de seed ou variavel de ambiente para criar o primeiro admin:

```python
# Em config.py:
ADMIN_BOOTSTRAP_EMAIL: Optional[str] = None
ADMIN_BOOTSTRAP_ROLE: str = "super_admin"

# Em main.py (startup event):
async def bootstrap_admin():
    """Cria o primeiro admin se ADMIN_BOOTSTRAP_EMAIL estiver configurado."""
    if not settings.ADMIN_BOOTSTRAP_EMAIL:
        return
    async with AsyncSessionLocal() as db:
        user = await db.execute(
            select(User).where(User.email == settings.ADMIN_BOOTSTRAP_EMAIL)
        )
        user = user.scalar_one_or_none()
        if user and not user.admin_role:
            user.admin_role = settings.ADMIN_BOOTSTRAP_ROLE
            await db.commit()
            logger.info(f"Admin bootstrapped: {user.email} -> {settings.ADMIN_BOOTSTRAP_ROLE}")
```

### 4.4 Novo Modelo: AuditLog

```python
class AuditLog(Base):
    """Registro de acoes administrativas para auditoria."""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))  # create, update, delete, impersonate
    resource_type: Mapped[str] = mapped_column(String(50))  # user, subscription, payment
    resource_id: Mapped[uuid.UUID] = mapped_column(nullable=True)
    old_values: Mapped[dict] = mapped_column(JSON, nullable=True)
    new_values: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Rastreabilidade
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Resultado
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Indices para consultas comuns
    __table_args__ = (
        Index('idx_audit_logs_created_at', 'created_at'),
        Index('idx_audit_logs_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_logs_admin_user', 'admin_user_id', 'created_at'),
    )
```

### 4.5 Novo Modelo: Coupon

```python
class CouponType(str, enum.Enum):
    PERCENTAGE = "percentage"  # Desconto percentual
    FIXED = "fixed"            # Desconto em valor fixo (R$)


class Coupon(Base):
    """Cupom de desconto para assinaturas."""
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    # Tipo e valor do desconto
    discount_type: Mapped[str] = mapped_column(String(20))
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    # Restricoes de uso
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1)
    min_purchase_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Controle avancado
    first_time_only: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_reuse_after_cancel: Mapped[bool] = mapped_column(Boolean, default=False)
    is_stackable: Mapped[bool] = mapped_column(Boolean, default=False)

    # Aplicabilidade (JSON — validacao na camada de aplicacao via Pydantic)
    # Valores validos: ["free", "basic", "premium"] (SubscriptionPlan enum)
    applicable_plans: Mapped[list] = mapped_column(JSON, default=list)
    # Valores validos: ["monthly", "yearly"] (BillingCycle enum)
    applicable_cycles: Mapped[list] = mapped_column(JSON, default=list)

    # Validade
    valid_from: Mapped[datetime] = mapped_column(nullable=False)
    valid_until: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Metadados
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    usages: Mapped[list["CouponUsage"]] = relationship(back_populates="coupon")

    # Indices
    __table_args__ = (
        Index('idx_coupons_active_code', 'is_active', 'code'),
        Index('idx_coupons_validity', 'valid_from', 'valid_until'),
    )
```

### 4.6 Novo Modelo: CouponUsage

```python
class CouponUsage(Base):
    """Registro de uso de um cupom."""
    __tablename__ = "coupon_usages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    coupon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("coupons.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    subscription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscriptions.id"))

    # Detalhes do uso
    original_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    final_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    canceled_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    used_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Relacionamentos
    coupon: Mapped["Coupon"] = relationship(back_populates="usages")
```

---

## 5. Fases de Implementacao

### FASE 1: Fundacao (Backend + Frontend base) ✅ COMPLETO

**Backend:**
- [x] Adicionar `admin_role` (String, nullable) e `deleted_at` ao modelo User
- [x] Criar migration para alteracao do User
- [x] Criar enum `AdminRole` e mapeamento de permissoes (`src/core/roles.py`)
- [x] Criar dependencies `get_current_admin` e `require_permission` (`src/dependencies.py`)
- [x] Implementar bootstrap de admin via `ADMIN_BOOTSTRAP_EMAIL` env var
- [x] Criar modelo `AuditLog` + migration
- [x] Criar schemas Pydantic para area admin (`src/schemas/admin.py`)
- [x] Criar router base `/api/v1/admin/` com middleware RBAC
- [x] **Bloqueio nativo (backend):** No middleware admin (`routers/admin/__init__.py`), rejeitar requests com header `X-Platform: ios` ou `X-Platform: android` com HTTP 403 + registrar tentativa no AuditLog

**Frontend:**
- [x] Instalar `@tanstack/react-table`
- [x] Criar componente generico `data-table.tsx` (sorting, filtering, pagination)
- [x] Criar layout admin (`app/admin/layout.tsx`) com sidebar e guard de acesso
- [x] Adicionar interceptor Axios para 403 -> redirect `/dashboard` com toast
- [x] Criar `lib/admin-api.ts` (cliente API admin com header `X-Platform` via `getPlatform()`)
- [x] Criar hooks base (`use-admin-users.ts`, etc.)

**Frontend — Bloqueio Nativo (WEB ONLY — OBRIGATORIO):**
- [x] No `app/admin/layout.tsx`: verificar `isNative()` no mount — se `true`, redirect para `/dashboard` com toast "Area disponivel apenas no navegador"
- [x] Criar middleware Next.js (`src/middleware.ts`): interceptar rotas `/admin/*` e retornar redirect se User-Agent indicar WebView/Capacitor
- [x] Na sidebar principal (`components/layout/sidebar.tsx`): renderizar link "Admin" apenas se `user.admin_role && !isNative()`
- [x] Na mobile-nav (`components/layout/mobile-nav.tsx`): NUNCA renderizar link admin (contexto mobile = potencialmente nativo)
- [x] Avaliar exclusao de `/admin` do build estatico Capacitor (via script pos-build ou `next.config.js`)

### FASE 2: Gestao de Usuarios ✅ COMPLETO

**Backend:**
- [x] Endpoint: Listar usuarios com paginacao/filtros (incluindo soft-deleted)
- [x] Endpoint: Detalhes do usuario (+ subscription + usage_record + invoices count)
- [x] Endpoint: Atualizar usuario
- [x] Endpoint: Desativar usuario (soft delete: set `deleted_at`, `is_active=False`)
- [x] Endpoint: Reativar usuario
- [x] Endpoint: Impersonacao V1 (gerar JWT com claim `impersonated_by`)
- [x] Endpoint: Historico de atividades (audit_logs filtrado por user)
- [x] Registrar todas acoes no AuditLog

**Frontend:**
- [x] Pagina: Lista de usuarios (data-table com busca, filtros por status/plano)
- [x] Pagina: Detalhes do usuario (perfil + subscription + usage + atividade)
- [x] Barra de impersonacao (banner amarelo fixo no topo)

### FASE 3: Gestao de Assinaturas + Pagamentos ✅ COMPLETO

> Reaproveitamento: `stripe_service.py` (checkout, cancel), `subscription_service.py` (webhooks), modelos Subscription e Payment ja existem.

**Backend — Assinaturas:**
- [x] Endpoint: Listar assinaturas (com filtros status/plano/periodo)
- [x] Endpoint: Detalhes da assinatura (+ historico de pagamentos)
- [x] Endpoint: Modificar assinatura (via Stripe API — upgrade/downgrade)
- [x] Endpoint: Cancelar assinatura (via `stripe_service.cancel_subscription`)
- [x] Endpoint: Estender trial (update `trial_end` no Stripe + DB)

**Backend — Pagamentos:**
- [x] Endpoint: Listar pagamentos (com filtros status/periodo/valor)
- [x] Endpoint: Detalhes do pagamento
- [x] Endpoint: Processar reembolso via Stripe (`stripe.Refund.create`)

**Frontend:**
- [x] Pagina: Lista de assinaturas (data-table)
- [x] Pagina: Detalhes da assinatura
- [x] Pagina: Lista de pagamentos (data-table)
- [x] Modal de reembolso com confirmacao

### FASE 4: Cupons e Promocoes ⏳ PENDENTE

**Backend:**
- [ ] Criar modelos `Coupon` e `CouponUsage` + migration
- [ ] Criar `CouponService` com regras de validacao:
  - Verificar validade (data)
  - Verificar limite de uso global
  - Verificar limite de uso por usuario
  - Verificar `first_time_only`
  - Verificar `allow_reuse_after_cancel`
  - Verificar `is_stackable`
  - Verificar `applicable_plans` e `applicable_cycles`
- [ ] Endpoints CRUD de cupons (admin)
- [ ] Endpoint: Validar cupom (publico — para checkout)
- [ ] Endpoint: Historico de uso e estatisticas do cupom
- [ ] Integrar cupons no fluxo de checkout Stripe (Stripe Coupons API)

**Frontend:**
- [ ] Pagina: Lista de cupons (data-table com status, uso, validade)
- [ ] Pagina: Formulario de criacao/edicao de cupom
- [ ] Aplicar cupom na pagina de pricing/checkout

### FASE 5: Dashboard e Metricas ✅ COMPLETO

> Agora que ha dados de usuarios, assinaturas, pagamentos e cupons, o dashboard tem conteudo real para mostrar.

**Backend:**
- [x] Criar `MetricsService` com queries SQL diretas:
  - MRR: `SUM(amount) FROM payments WHERE status='succeeded' AND period=current_month`
  - Churn: `COUNT cancelamentos / COUNT inicio_do_mes`
  - Trial conversion: `COUNT converted / COUNT trial_ended`
  - ARPU: MRR / paying users count
  - Growth: novos usuarios por periodo
- [x] Endpoint: `/dashboard/stats` — KPIs principais
- [x] Endpoint: `/dashboard/revenue` — MRR ao longo do tempo
- [x] Endpoint: `/dashboard/growth` — Crescimento de usuarios
- [x] Endpoint: `/dashboard/operations` — Metricas operacionais (OCR success rate, invoices/dia, avg processing time, provider breakdown)
- [x] Endpoint: `/system/health` — Status DB, Redis, Stripe, LLM providers

**Frontend:**
- [x] Dashboard: Cards de KPIs (MRR, users, churn, trial conversion)
- [x] Dashboard: Grafico de receita (Recharts — ja instalado)
- [x] Dashboard: Grafico de crescimento
- [x] Dashboard: Secao de metricas operacionais
- [x] System health: Indicadores de status dos servicos

### FASE 6: Relatorios e Exportacao ⏳ PENDENTE

**Backend:**
- [ ] Endpoint: Relatorio de churn (motivos, timeline, por plano)
- [ ] Endpoint: Relatorio de conversao (funil trial -> free -> basic -> premium)
- [ ] Endpoint: Exportacao CSV (streaming com `StreamingResponse` para grandes volumes)

**Frontend:**
- [ ] Pagina: Relatorios com filtros de periodo
- [ ] Funcionalidade: Download CSV

### FASE 7: Configuracoes e Auditoria ✅ COMPLETO

**Backend:**
- [x] Endpoint: Listar/alterar configuracoes (feature flags)
- [x] Endpoint: Listar logs de auditoria (com filtros por admin, acao, recurso, periodo)
- [x] Endpoint: Listar papeis administrativos

**Frontend:**
- [x] Pagina: Configuracoes gerais
- [x] Pagina: Logs de auditoria (data-table com filtros avancados)

### FASE 8: Testes e Qualidade ⏳ PENDENTE

- [ ] Testes unitarios para `MetricsService` (calculos de MRR, churn, conversion)
- [ ] Testes unitarios para `CouponService` (todos os edge cases de validacao)
- [ ] Testes de integracao para endpoints admin (RBAC, soft delete, impersonacao)
- [ ] Testes de seguranca:
  - Usuario comum nao acessa `/admin/*`
  - Cada role so acessa suas permissoes
  - Impersonacao gera audit log
  - Soft delete preserva dados
  - **Request com header `X-Platform: ios` recebe 403 em `/admin/*`**
  - **Request com header `X-Platform: android` recebe 403 em `/admin/*`**
  - **Request sem header `X-Platform` (ou `web`) e permitido normalmente**
- [ ] Documentacao da API via OpenAPI/Swagger (automatica pelo FastAPI)

---

## 6. Consideracoes de Seguranca

### 6.1 Autenticacao e Autorizacao

- Todos os endpoints admin requerem JWT valido com `admin_role IS NOT NULL`
- Dependency `get_current_admin` verifica `admin_role` e `is_active`
- Dependency `require_permission` verifica permissoes RBAC por endpoint
- Acoes sensiveis sao registradas no AuditLog automaticamente

### 6.2 Impersonacao (V1 — Simplificada)

```python
# V1: JWT com claim extra, sem email ou restricoes de acoes
async def impersonate_user(admin: User, target_user_id: uuid.UUID, db: AsyncSession):
    target = await db.get(User, target_user_id)
    if not target:
        raise HTTPException(404)

    # Gerar JWT do usuario-alvo com claim de impersonacao
    token = create_access_token(
        data={
            "sub": str(target.id),
            "impersonated_by": str(admin.id),
        },
        expires_delta=timedelta(minutes=30),
    )

    # Registrar no audit log
    await create_audit_log(db, admin.id, "impersonate", "user", target.id)

    return {"access_token": token, "user": target}
```

**Frontend:** Banner amarelo fixo: "Voce esta visualizando como {user.name} — [Sair]"

**Evolucao futura (V2):**
- Notificacao por email ao usuario impersonado
- Restricao de acoes sensiveis (change_password, delete_account)
- Timeout de 15 minutos

### 6.3 Protecao de Dados

- Senhas nunca sao retornadas nas APIs
- Dados sensiveis sao mascarados nos logs
- Exportacoes limitadas a admins com permissao
- Soft delete preserva dados para auditoria
- Dados de cartao nunca armazenados (apenas referencias Stripe)

### 6.4 Rate Limiting (Futuro)

> Implementar quando necessario. Sugestao de limites:

| Endpoint | Limite | Biblioteca |
|----------|--------|-----------|
| Login admin | 5 tentativas / 15min | slowapi |
| Impersonacao | 10 / hora por admin | slowapi |
| Exportacao CSV | 5 / hora | slowapi |

### 6.5 Frontend — Tratamento de 403

```typescript
// Em lib/admin-api.ts ou no interceptor global do Axios:
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      toast.error("Acesso negado. Voce nao tem permissao para esta acao.");
      router.push("/dashboard");
    }
    return Promise.reject(error);
  }
);
```

### 6.6 Bloqueio de Acesso Nativo — Estrategia em Camadas (WEB ONLY)

A restricao web-only e implementada em **4 camadas independentes** (defense in depth):

| Camada | Onde | Mecanismo | O que faz |
|--------|------|-----------|----------|
| **1. UI** | Sidebar + MobileNav | `isNative()` check | Oculta links de admin no app nativo |
| **2. Layout** | `app/admin/layout.tsx` | `isNative()` no mount | Redirect para `/dashboard` com toast se nativo |
| **3. Middleware** | `src/middleware.ts` | User-Agent detection | Intercepta `/admin/*` e redireciona se WebView |
| **4. Backend** | `routers/admin/__init__.py` | Header `X-Platform` | Rejeita requests com 403 se `ios` ou `android` |

**Detalhamento:**

```typescript
// Camada 1 — Sidebar (components/layout/sidebar.tsx)
// Renderizar link admin SOMENTE se:
const showAdminLink = user?.admin_role && !isNative();

// Camada 2 — Layout guard (app/admin/layout.tsx)
"use client";
import { isNative } from "@/lib/capacitor";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AdminLayout({ children }) {
  const router = useRouter();
  useEffect(() => {
    if (isNative()) {
      toast.error("Area administrativa disponivel apenas no navegador.");
      router.replace("/dashboard");
    }
  }, [router]);
  if (isNative()) return null; // Nao renderiza nada enquanto redireciona
  return <>{children}</>;
}

// Camada 3 — Middleware Next.js (src/middleware.ts)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WEBVIEW_PATTERNS = /\b(wv|WebView|Capacitor|; wv\))\b/i;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const ua = request.headers.get("user-agent") || "";
    if (WEBVIEW_PATTERNS.test(ua)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };

// Camada 4 — Backend header (lib/admin-api.ts)
import { getPlatform } from "@/lib/capacitor";
const adminApi = axios.create({ baseURL: API_URL });
adminApi.interceptors.request.use((config) => {
  config.headers["X-Platform"] = getPlatform(); // "web" | "ios" | "android"
  return config;
});
```

```python
# Camada 4 — Backend (routers/admin/__init__.py)
async def validate_platform(request: Request):
    """Rejeita acesso admin de plataformas nativas."""
    platform = request.headers.get("x-platform", "web").lower()
    if platform in ("ios", "android"):
        # Registrar tentativa no audit log
        logger.warning(f"Admin access attempt from native platform: {platform}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin area is only accessible via web browser."
        )
```

> **Nota sobre build:** O app usa static export (`webDir: 'out'`). As paginas `/admin/*` serao incluidas no bundle nativo, mas as 4 camadas de bloqueio garantem que nao sao acessiveis. Para eliminacao total, considerar script pos-build que remove `out/admin/` antes do `npx cap sync`.

---

## 7. Performance (Estrategia Progressiva)

### 7.1 Fase Inicial: Queries Diretas

Para o volume atual (< 100k registros), queries SQL com `GROUP BY` sao sub-segundo. **Nao implementar cache Redis ou materialized views na V1.**

```sql
-- Exemplo: MRR dos ultimos 12 meses (< 100ms com indice)
SELECT
    DATE_TRUNC('month', created_at) as month,
    SUM(amount) as mrr
FROM payments
WHERE status = 'succeeded'
    AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### 7.2 Indices Recomendados (na migration)

```sql
-- Audit logs (alto volume esperado)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_admin_user ON audit_logs(admin_user_id, created_at);

-- Coupons
CREATE INDEX idx_coupons_active_code ON coupons(is_active, code);

-- Subscriptions (para metricas — se nao existir)
CREATE INDEX idx_subscriptions_status_created ON subscriptions(status, created_at);

-- Payments (para metricas)
CREATE INDEX idx_payments_status_created ON payments(status, created_at);

-- Users admin (parcial)
CREATE INDEX idx_users_admin_role ON users(admin_role) WHERE admin_role IS NOT NULL;
```

### 7.3 Evolucao Futura (quando necessario)

Quando metricas demorarem > 2 segundos:

| Evolucao | Trigger | Implementacao |
|----------|---------|---------------|
| **Cache Redis** | Queries > 2s | TTL 5min para dashboard, 15min para reports |
| **Materialized Views** | Volume > 500k payments | `mv_mrr_daily`, refresh via pg_cron |
| **Celery** | Exportacoes > 30s ou tarefas agendadas | Worker separado, Redis como broker |

---

## 8. Tecnologias

| Camada | Tecnologia | Status |
|--------|------------|--------|
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 | Existente |
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Existente |
| Graficos | Recharts | Existente (v2.15.4) |
| **Tabelas** | **@tanstack/react-table** | **Instalar** |
| Icones | Lucide React | Existente |
| Cache | Redis 7 | Existente (docker-compose) |
| Pagamentos | Stripe | Existente (v11.4.1) |
| Background tasks | FastAPI BackgroundTasks | Existente |

> **Removido:** Celery — desnecessario no volume atual. Sera adicionado quando houver necessidade de tarefas agendadas ou bulk operations de alto volume.

---

## 9. Testes

### 9.1 Testes Unitarios

```python
# MetricsService
def test_mrr_calculation_monthly_only():
    """MRR com apenas assinaturas mensais."""

def test_mrr_calculation_mixed_cycles():
    """MRR com assinaturas mensais + anuais (anuais/12)."""

def test_churn_rate_no_cancellations():
    """Churn rate = 0 quando nao ha cancelamentos."""

def test_churn_rate_calculation():
    """Churn rate = cancelamentos / assinantes inicio do mes."""

# CouponService
def test_coupon_first_time_only():
    """Cupom so pode ser usado por usuarios sem assinaturas anteriores."""

def test_coupon_not_stackable():
    """Cupom nao acumulavel nao pode ser combinado."""

def test_coupon_max_uses_per_user():
    """Respeitar limite de usos por usuario."""

def test_coupon_reuse_after_cancel():
    """Permitir reutilizacao baseado na configuracao."""

def test_coupon_expired():
    """Rejeitar cupom com valid_until no passado."""

def test_coupon_applicable_plans():
    """Rejeitar cupom se plano do usuario nao esta em applicable_plans."""
```

### 9.2 Testes de Integracao

```python
@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_endpoints(client, regular_user):
    """Usuario comum recebe 403 ao acessar /admin/*."""

@pytest.mark.asyncio
async def test_support_cannot_delete_user(client, support_admin):
    """Admin com role support nao pode deletar usuarios."""

@pytest.mark.asyncio
async def test_impersonation_creates_audit_log(client, admin_user, target_user):
    """Impersonacao deve criar registro em audit_log."""

@pytest.mark.asyncio
async def test_soft_delete_preserves_data(client, admin_user, target_user):
    """Soft delete deve preservar dados e permitir restauracao."""

@pytest.mark.asyncio
async def test_refund_calls_stripe(client, admin_user, payment, mock_stripe):
    """Reembolso deve chamar Stripe Refund API."""
```

---

## 10. Checklist de Dependencias

| Dependencia | Status | Acao Necessaria |
|-------------|--------|-----------------|
| Capacitor detection (`isNative()`) | ✅ Existe | Nenhuma — `apps/web/src/lib/capacitor.ts` |
| Modelo Subscription | ✅ Existe | Nenhuma — `src/models/subscription.py` |
| Modelo Payment | ✅ Existe | Nenhuma — `src/models/payment.py` |
| Modelo UsageRecord | ✅ Existe | Nenhuma — `src/models/usage_record.py` |
| Stripe Integration | ✅ Existe | Nenhuma — `src/services/stripe_service.py` |
| Redis | ✅ Existe | Nenhuma — ja no `docker-compose.yml` |
| Recharts | ✅ Existe | Nenhuma — `recharts@2.15.4` |
| @tanstack/react-table | ❌ Falta | `npm install @tanstack/react-table` |
| User.admin_role | ❌ Falta | Migration: adicionar coluna |
| AuditLog table | ❌ Falta | Migration: criar tabela |
| Coupon tables | ❌ Falta | Migration: criar tabelas |
| ADMIN_BOOTSTRAP_EMAIL | ❌ Falta | Adicionar ao `.env` e `config.py` |

---

---

## 11. Status Geral de Implementacao

| Fase | Descricao | Status | Conclusao |
|------|-----------|--------|-----------|
| **FASE 1** | Fundacao (Auth RBAC, modelo User, AuditLog) | ✅ | Completo (13 fev 2026) |
| **FASE 2** | Gestao de Usuarios | ✅ | Completo (13 fev 2026) |
| **FASE 3** | Gestao de Assinaturas + Pagamentos | ✅ | Completo (13 fev 2026) |
| **FASE 4** | Cupons e Promocoes | ⏳ | **Proximo** |
| **FASE 5** | Dashboard e Metricas | ✅ | Completo (13 fev 2026) |
| **FASE 6** | Relatorios e Exportacao CSV | ⏳ | Pendente |
| **FASE 7** | Configuracoes + Auditoria | ✅ | Completo (13 fev 2026) |
| **FASE 8** | Testes e Qualidade | ⏳ | Pendente |

**Resumo:** 5 de 8 fases implementadas (62.5%). Infra de admin totalmente funcional.

### Arquivos Implementados

**Backend:**
- `src/models/user.py` — Adicoes: `admin_role`, `deleted_at`, `is_admin` property
- `src/core/roles.py` — Enum AdminRole + mapeamento de permissoes
- `src/dependencies.py` — `get_current_admin`, `require_permission`
- `src/models/audit_log.py` — Modelo AuditLog com indices
- `src/schemas/admin.py` — Todos os schemas Pydantic
- `src/routers/admin/__init__.py` — Router base + endpoints dashboard/users/system
- `src/routers/admin/subscriptions.py` — Endpoints de assinaturas
- `src/routers/admin/payments.py` — Endpoints de pagamentos
- `src/routers/admin/settings.py` — Feature flags + roles + audit logs
- `src/services/admin_service.py` — Logica de negocio admin
- `src/services/metrics_service.py` — Calculos de metricas SaaS
- `src/config.py` — `ADMIN_BOOTSTRAP_EMAIL` config var
- Migrations Alembic — User, AuditLog tables

**Frontend:**
- `src/middleware.ts` — Bloqueio nativo em `/admin/*`
- `src/lib/admin-api.ts` — Cliente Axios com retry + header `X-Platform` + token refresh
- `src/app/admin/layout.tsx` — Guard de acesso + sidebar com links
- `src/app/admin/page.tsx` — Dashboard com Recharts (MRR, growth) + operational metrics + system health
- `src/app/admin/users/page.tsx` — Lista usuarios
- `src/app/admin/users/[id]/page.tsx` — Detalhes usuario + impersonacao
- `src/app/admin/subscriptions/page.tsx` — Lista assinaturas
- `src/app/admin/subscriptions/[id]/page.tsx` — Detalhes assinatura
- `src/app/admin/payments/page.tsx` — Lista pagamentos
- `src/app/admin/settings/page.tsx` — Feature flags + roles
- `src/app/admin/settings/audit-logs/page.tsx` — Audit logs com filtros
- `src/hooks/use-admin-analytics.ts` — Hooks para metricas + health
- `src/hooks/use-admin-users.ts` — Hooks para usuarios
- `src/hooks/use-admin-subscriptions.ts` — Hooks para assinaturas
- `src/hooks/use-admin-payments.ts` — Hooks para pagamentos
- `src/hooks/use-admin-settings.ts` — Hooks para settings + audit logs
- `src/types/admin.ts` — TypeScript interfaces

### Proximos Passos

1. **FASE 4: Cupons e Promocoes** (~2-3 horas)
   - Criar modelos `Coupon` + `CouponUsage`
   - `CouponService` com validacoes
   - Endpoints CRUD admin + validacao publica
   - Frontend: lista, criacao, edicao, aplicacao no checkout

2. **FASE 6: Relatorios** (~4-5 horas)
   - Relatorio de churn (timeline, motivos, por plano)
   - Relatorio de conversao (funil trial -> paid)
   - Exportacao CSV com streaming

3. **FASE 8: Testes** (~6-8 horas)
   - Cobertura de MetricsService, CouponService, endpoints admin
   - Testes de seguranca (RBAC, bloqueio nativo)
   - Documentacao OpenAPI/Swagger
