# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`apps/api/`)

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Tests
pytest
pytest tests/test_auth.py                          # single file
pytest tests/test_auth.py::test_register_user      # single test
pytest tests/test_parsers.py::TestXMLParser        # single class
pytest --cov=src --cov-report=term-missing         # with coverage

# Database migrations (Alembic)
alembic upgrade head
alembic downgrade -1
alembic revision --autogenerate -m "description"
```

### Frontend (`apps/web/`)

```bash
npm install
npm run dev        # dev server (port 3000)
npm run build      # production build
npm run lint       # ESLint via Next.js
npm run start      # production server
```

### Docker (from repo root)

```bash
docker-compose up -d              # start all services
docker-compose up -d --build api  # rebuild and restart API
docker-compose logs -f api        # tail API logs
docker-compose down -v            # stop and remove volumes
```

## Architecture

Monorepo with two apps sharing a single `docker-compose.yml`:

- **`apps/api/`** — FastAPI backend (Python 3.11, async throughout)
- **`apps/web/`** — Next.js 14 frontend (App Router, TypeScript)
- **`plans/`** — Architecture and implementation plans (reference, not prescriptive)

### Docker services

| Service      | Image               | Port | Purpose                        |
|------------- |----------------------|------|--------------------------------|
| **postgres** | postgres:16-alpine   | 5432 | Primary database               |
| **redis**    | redis:7-alpine       | 6379 | Cache (CNPJ, LLM prompts)     |
| **api**      | ./apps/api/Dockerfile| 8000 | FastAPI backend                |
| **web**      | ./apps/web/Dockerfile| 3000 | Next.js frontend               |

### Backend layer structure

```
src/
├── main.py            # FastAPI app; mounts all routers under /api/v1
├── config.py          # Pydantic Settings (reads .env); 47+ config vars
├── database.py        # Async SQLAlchemy engine + get_db() dependency
├── dependencies.py    # Shared FastAPI Depends (get_current_user)
├── exceptions.py      # Custom exception hierarchy (MercadoEspertoException base)
├── models/            # SQLAlchemy ORM — one file per entity (9 models)
├── schemas/           # Pydantic request/response models (Base/Create/Response pattern)
├── routers/           # One router file per resource (10 routers, 29+ endpoints)
├── services/          # Business logic — LLM extraction, AI analysis, CNPJ, caching
├── tasks/             # Background tasks — photo processing, AI analysis
├── parsers/           # NF-e XML parsing, QR code handling
└── utils/             # Security (JWT), CNPJ validation, image processing, logging
```

Each resource follows a consistent three-layer pattern: **model → schema → router**. Schemas use a `Base / Create / Response` inheritance hierarchy with `from_attributes = True` for ORM compatibility. All DB access is async (`AsyncSession`). Routers receive the session via `Depends(get_db)` and the authenticated user via a dependency in `dependencies.py`.

### Data model (12 entities)

| Entity             | Table                | Key relationships                                      |
|--------------------|----------------------|--------------------------------------------------------|
| **User**           | users                | Has invoices, categories, analyses, merchants, products, subscription|
| **Invoice**        | invoices             | Belongs to user + merchant; has items                  |
| **InvoiceItem**    | invoice_items        | Belongs to invoice + product + category                |
| **Product**        | products             | Has price tracking (avg, min, max, trend)              |
| **Category**       | categories           | Self-referential (parent/children), hierarchical       |
| **Merchant**       | merchants            | Tracks visit count, total spent, avg ticket            |
| **Analysis**       | analyses             | AI-generated insights per invoice                      |
| **PurchasePattern**| purchase_patterns    | Detected recurring patterns with predictions           |
| **InvoiceProcessing**| invoice_processing | Tracks photo extraction workflow (status machine)      |
| **Subscription**   | subscriptions        | User's plan (Free/Basic/Premium), status, trial dates, Stripe IDs |
| **Payment**        | payments             | Payment history linked to subscription                 |
| **UsageRecord**    | usage_records        | Monthly counters (invoices, AI analyses) per user      |

Relationships use `selectin` lazy loading. Unique constraint on `(access_key, user_id)` for invoices. One subscription per user (unique constraint on `user_id`).

### API routes (all under `/api/v1`)

| Router            | Prefix              | Key endpoints                                          |
|-------------------|----------------------|--------------------------------------------------------|
| **auth**          | /auth                | register, login, refresh, me                           |
| **invoices**      | /invoices            | CRUD + upload (photos/xml/qrcode) + processing + confirm|
| **invoice_items** | /invoice-items       | List items by invoice                                  |
| **merchants**     | /merchants           | List merchants                                         |
| **categories**    | /categories          | List categories (hierarchical tree)                    |
| **products**      | /products            | List products                                          |
| **analysis**      | /analysis            | List AI insights                                       |
| **purchase_patterns** | /purchase-patterns| List detected patterns                                |
| **users**         | /users               | Get/update profile (household data for AI)             |
| **subscriptions** | /subscriptions       | Get subscription + usage, checkout, portal, cancel, payments, webhooks |
| **debug**         | /debug               | List available LLM providers                           |

### HTTP Status Codes & Error Handling

The API uses standard HTTP status codes with custom headers for subscription errors:

| Code | Meaning | When Used | Custom Headers |
|------|---------|-----------|----------------|
| **200** | OK | Successful GET requests | - |
| **201** | Created | Successful POST creating a resource | - |
| **204** | No Content | Successful DELETE requests | - |
| **400** | Bad Request | Invalid input data, validation errors | - |
| **401** | Unauthorized | Missing or invalid JWT token | `WWW-Authenticate: Bearer` |
| **402** | Payment Required | Subscription inactive, trial expired, or not found | `X-Subscription-Error`, `X-Limit-Type`, `X-Current-Plan` |
| **403** | Forbidden | User inactive or insufficient permissions | - |
| **404** | Not Found | Resource doesn't exist | - |
| **409** | Conflict | Duplicate invoice (same access_key + user_id) | - |
| **422** | Unprocessable Entity | Semantic validation errors (e.g., invalid date format) | - |
| **429** | Too Many Requests | Monthly usage limit reached (invoices or AI analyses) | `X-Subscription-Error`, `X-Limit-Type`, `X-Current-Plan` |
| **500** | Internal Server Error | Unexpected server errors | `X-Request-ID` |

**Subscription Error Headers** (402 & 429):
- `X-Subscription-Error`: Error type (`no_subscription`, `trial_expired`, `subscription_inactive`, `invoice_limit_reached`, `analysis_limit_reached`)
- `X-Limit-Type`: Resource type (`invoice` or `analysis`)
- `X-Current-Plan`: User's current plan (`free`, `basic`, `premium`)

**CORS Exposed Headers**: `X-Request-ID`, `X-Subscription-Error`, `X-Limit-Type`, `X-Current-Plan`

**Frontend Error Handling**:
- **401**: Auto-refresh JWT token via Axios interceptor, redirect to login if refresh fails
- **402/429**: Display `UpgradeModal` with plan upgrade options
- **500**: Display generic error message with request ID for support

### Services layer

| Service                      | Purpose                                                  |
|------------------------------|----------------------------------------------------------|
| **multi_provider_extractor** | LLM-based invoice photo OCR with 4-provider fallback     |
| **ai_analyzer**              | Post-invoice AI insights (GPT-4o-mini)                   |
| **categorizer**              | AI-powered product categorization                        |
| **name_normalizer**          | Expand Brazilian NF-e abbreviations (200+ mappings)      |
| **cnpj_enrichment**          | Fetch company data from BrasilAPI/ReceitaWS (Redis cache)|
| **token_callback**           | LangChain callback to log token usage across providers   |
| **cached_prompts**           | Redis-based LLM prompt caching by image hash             |
| **stripe_service**           | Stripe Checkout, Customer Portal, webhook verification   |
| **subscription_service**     | Webhook handlers (payment succeeded/failed, subscription updated/deleted) |

### Background tasks

| Task                        | Trigger                    | Duration   | Purpose                       |
|-----------------------------|----------------------------|------------|-------------------------------|
| **process_invoice_photos**  | POST /invoices/upload/photos| 20-40s    | Image optimize → LLM OCR → normalize → categorize → duplicate check |
| **ai_analysis**             | After invoice confirmation | 5-10s      | Generate spending insights     |

### Multi-provider LLM strategy

Provider fallback chain: **OpenRouter (Gemini 2.0 Flash)** → Gemini Direct → OpenAI → Anthropic. Token usage tracked via LangChain callbacks. Images optimized to 1536px max dimension before sending (60-75% token reduction).

### Frontend layer structure

```
src/
├── app/                    # Next.js App Router — 13 routes
│   ├── login/, register/   # Auth pages
│   ├── dashboard/          # Main dashboard + analytics
│   ├── invoices/           # List, add, detail, edit, review
│   ├── insights/           # AI insights
│   ├── products/           # Product catalog
│   ├── pricing/            # Subscription plans comparison
│   └── settings/           # User profile + preferences + subscription management
├── components/
│   ├── ui/                 # Primitives: card, button, input, badge, modal, skeleton
│   ├── dashboard/          # summary-card, spending-chart, insight-card
│   ├── invoices/           # invoice-list, pending-list, upload-modal, delete-modal, category-donut-chart
│   ├── subscription/       # upgrade-modal, usage-banner, trial-banner
│   └── layout/             # header, sidebar, mobile-nav, page-layout
├── hooks/                  # 10 React Query hooks (auth, invoices, insights, analytics, products, settings, cnpj, subscription)
├── lib/
│   ├── api.ts              # Axios client with JWT interceptor + auto-refresh
│   ├── utils.ts            # formatCurrency (BRL), formatDate (pt-BR), cn()
│   ├── cnpj.ts             # Client-side CNPJ validation/formatting
│   ├── query-client.ts     # React Query config (staleTime: 5min)
│   └── feature-flags.ts    # Feature flag constants
└── types/index.ts          # TypeScript interfaces mirroring backend schemas
```

State is fetched via TanStack React Query. The root layout wraps children in a `providers.tsx` that sets up the Query Client.

### Key cross-cutting concerns

- **Auth flow**: JWT access (30min) + refresh (7d) tokens. Backend issues both on login; frontend stores in localStorage and auto-refreshes on 401 via Axios interceptor.

- **Subscription system** (feature-flagged via `ENABLE_SUBSCRIPTION_SYSTEM`):
  - **Plans & Limits**:

    | Plan | Price | Invoices/Month | AI Analyses/Month |
    |------|-------|----------------|-------------------|
    | **Gratuito (Trial)** | R$ 0 | **Ilimitado** (30 dias) | **Ilimitado** (30 dias) |
    | **Gratuito (Expired)** | R$ 0 | 1 | 2 |
    | **Básico** | R$ 9,90/mês · R$ 99/ano | 5 | 5 |
    | **Premium** | R$ 19,90/mês · R$ 199/ano | Ilimitado | Ilimitado |

  - **Trial behavior**: First 30 days after registration are **unlimited** regardless of plan (status: `trial`). After trial expires without payment, user remains on Free plan with limits (1 invoice, 2 analyses/month).
  - **Billing**: Monthly/yearly via Stripe (web only). Mobile IAP support planned.
  - **State machine**: `trial` (unlimited) → `active` (after payment) → `past_due` (payment failed) → `cancelled`/`expired`
  - **Enforcement**: `check_invoice_limit` and `check_analysis_limit` dependencies use `subscription.invoice_limit` and `subscription.analysis_limit` properties (which return `None` = unlimited during trial). Returns 402 (subscription inactive) or 429 (limit reached).
  - **Usage tracking**: Monthly counters in `usage_records` table (unique per user/year/month). Incremented on invoice creation and AI analysis completion.
  - **Webhooks**: Idempotent handlers for Stripe events (checkout completed, payment succeeded/failed, subscription updated/deleted). Signature verification via `stripe_service`.
  - **Frontend**: `UploadModal` shared across Dashboard, Invoices list, and Add invoice. On 402/429 errors, displays `UpgradeModal` with plan comparison.

- **Invoice ingestion**: Three paths — (1) Photo upload → LLM OCR → review → confirm, (2) XML upload → parse → create, (3) QR code → Sefaz API → parse → create. All paths trigger AI analysis on confirmation.

- **AI analysis**: GPT-4o-mini generates price alerts, category insights, merchant patterns, and spending summaries. Results persisted in `analyses` table.

- **CNPJ features**: Feature-flagged. Validation (checksum), enrichment (BrasilAPI/ReceitaWS with 24h Redis cache), auto-populate issuer name on confirmation.

- **Image optimization**: Server-side resize to 1536px + JPEG conversion before LLM. Configurable via `IMAGE_OPTIMIZATION_ENABLED`, `IMAGE_MAX_DIMENSION`, `IMAGE_JPEG_QUALITY`.

- **Duplicate detection**: Composite unique constraint `(access_key, user_id)`. Early check in background task shows warning banner (non-blocking).

- **Date handling**: `dateutil.parser.parse(dayfirst=True)` in Pydantic validators. Supports DD/MM/YYYY (Brazilian), ISO 8601, and US formats.
  - **⚠️ AsyncPG timezone mismatch**: DB columns are `TIMESTAMP WITHOUT TIME ZONE` (naive). AsyncPG rejects timezone-aware datetimes (`datetime.now(timezone.utc)`) with error `can't subtract offset-naive and offset-aware datetimes`. Always use `datetime.utcnow()` (naive) when storing/comparing timestamps. When reading from DB for comparisons, use `datetime.utcnow()` not `datetime.now(timezone.utc)`.

- **Database migrations**: 8 Alembic migrations in `apps/api/alembic/versions/`. Docker entrypoint runs `alembic upgrade head` before starting uvicorn.

## Code style (backend)

- PEP 8, line length 88 (Black-compatible)
- Type hints on all function signatures
- `async`/`await` for every DB operation
- Imports grouped: stdlib → third-party → local (absolute only, e.g. `from src.models.user import User`)
- Naming: `snake_case` for modules/functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- Pydantic schemas: `<Entity>Base` → `<Entity>Create` → `<Entity>Response`
- Custom exceptions via `MercadoEspertoException` hierarchy in `exceptions.py`; converted to `HTTPException` by handler

## Code style (frontend)

- TypeScript strict mode
- React Query for all server state (hooks in `src/hooks/`)
- Tailwind CSS for styling (shadcn-inspired component library in `components/ui/`)
- Brazilian locale: `pt-BR` for dates, `BRL` for currency formatting
- Recharts for data visualization

### Subscription Error Handling (Frontend Pattern)

All upload flows (Dashboard, Invoices list, Add invoice) use the same pattern:

```typescript
const handleSubscriptionError = (error: any) => {
  const status = error?.response?.status;
  if (status === 402 || status === 429) {
    const headers = error?.response?.headers;
    const limitType = headers?.["x-limit-type"] || "invoice";
    const currentPlan = headers?.["x-current-plan"] || "free";

    setSubscriptionError({ limitType, currentPlan });
    setIsUploadModalOpen(false);
  }
};

// Applied to all mutation onError callbacks
uploadPhotosMutation.mutate(files, {
  onSuccess: (data) => { /* handle success */ },
  onError: handleSubscriptionError,
});
```

**Key points**:
- Check for both 402 (subscription inactive) and 429 (limit reached)
- Extract custom headers for contextual error display
- Close upload modal and show `UpgradeModal` with plan details
- Same `UploadModal` component shared across all upload locations

## Environment

Copy `.env.example` to `.env` at the repo root.

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `OPENROUTER_API_KEY` — Primary LLM provider for invoice extraction

**Optional AI keys** (fallback providers):
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

**Optional features:**
- `REDIS_URL` — Cache for CNPJ enrichment and prompt caching
- `ENABLE_CNPJ_FEATURES` — Master toggle for CNPJ validation/enrichment
- `IMAGE_OPTIMIZATION_ENABLED` — Toggle image preprocessing (default: true)

**Subscription system** (optional, disabled by default):
- `ENABLE_SUBSCRIPTION_SYSTEM` — Master toggle (default: `false`)
- `TRIAL_DURATION_DAYS` — Trial period in days (default: `30`)
- `STRIPE_SECRET_KEY` — Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_ID_BASIC_MONTHLY` — Stripe price ID for Basic monthly plan
- `STRIPE_PRICE_ID_BASIC_YEARLY` — Stripe price ID for Basic yearly plan
- `STRIPE_PRICE_ID_PREMIUM_MONTHLY` — Stripe price ID for Premium monthly plan
- `STRIPE_PRICE_ID_PREMIUM_YEARLY` — Stripe price ID for Premium yearly plan

**Frontend:** `NEXT_PUBLIC_API_URL` (set in `apps/web/.env.local` or via `docker-compose.yml`).

### ⚠️ Environment Variables Management

**Critical**: Every new environment variable added to the codebase MUST be configured in three places:

1. **`.env.example`** — Document the variable with comments explaining its purpose
2. **`docker-compose.yml`** — Add to the `api` (or `web`) service's `environment:` section to make it available in the container:
   ```yaml
   environment:
     NEW_VAR: ${NEW_VAR:-default_value}
   ```
3. **`Dockerfile`** (if applicable) — If the variable is needed at build time or in the Dockerfile entrypoint

**Why?** Variables in `.env` are NOT automatically passed to Docker containers. They must be explicitly referenced in `docker-compose.yml`'s `environment:` block. Without this, the app will not see the variable even if it's set in `.env`.

**Example workflow:**
- Add `ADMIN_BOOTSTRAP_EMAIL=admin@example.com` to `.env.example` and `.env`
- Add `ADMIN_BOOTSTRAP_EMAIL: ${ADMIN_BOOTSTRAP_EMAIL:-}` to `docker-compose.yml` under the `api` service's `environment:` block
- Run `docker-compose up -d api` to recreate the container with the new variable
