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
├── exceptions.py      # Custom exception hierarchy (SMarketException base)
├── models/            # SQLAlchemy ORM — one file per entity (9 models)
├── schemas/           # Pydantic request/response models (Base/Create/Response pattern)
├── routers/           # One router file per resource (10 routers, 29+ endpoints)
├── services/          # Business logic — LLM extraction, AI analysis, CNPJ, caching
├── tasks/             # Background tasks — photo processing, AI analysis
├── parsers/           # NF-e XML parsing, QR code handling
└── utils/             # Security (JWT), CNPJ validation, image processing, logging
```

Each resource follows a consistent three-layer pattern: **model → schema → router**. Schemas use a `Base / Create / Response` inheritance hierarchy with `from_attributes = True` for ORM compatibility. All DB access is async (`AsyncSession`). Routers receive the session via `Depends(get_db)` and the authenticated user via a dependency in `dependencies.py`.

### Data model (9 entities)

| Entity             | Table                | Key relationships                                      |
|--------------------|----------------------|--------------------------------------------------------|
| **User**           | users                | Has invoices, categories, analyses, merchants, products|
| **Invoice**        | invoices             | Belongs to user + merchant; has items                  |
| **InvoiceItem**    | invoice_items        | Belongs to invoice + product + category                |
| **Product**        | products             | Has price tracking (avg, min, max, trend)              |
| **Category**       | categories           | Self-referential (parent/children), hierarchical       |
| **Merchant**       | merchants            | Tracks visit count, total spent, avg ticket            |
| **Analysis**       | analyses             | AI-generated insights per invoice                      |
| **PurchasePattern**| purchase_patterns    | Detected recurring patterns with predictions           |
| **InvoiceProcessing**| invoice_processing | Tracks photo extraction workflow (status machine)      |

Relationships use `selectin` lazy loading. Unique constraint on `(access_key, user_id)` for invoices.

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
| **debug**         | /debug               | List available LLM providers                           |

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
├── app/                    # Next.js App Router — 11 routes
│   ├── login/, register/   # Auth pages
│   ├── dashboard/          # Main dashboard + analytics
│   ├── invoices/           # List, add, detail, edit, review
│   ├── insights/           # AI insights
│   ├── products/           # Product catalog
│   └── settings/           # User profile + preferences
├── components/
│   ├── ui/                 # Primitives: card, button, input, badge, modal, skeleton
│   ├── dashboard/          # summary-card, spending-chart, insight-card
│   ├── invoices/           # invoice-list, pending-list, upload-modal, delete-modal, category-donut-chart
│   └── layout/             # header, sidebar, mobile-nav, page-layout
├── hooks/                  # 9 React Query hooks (auth, invoices, insights, analytics, products, settings, cnpj)
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
- **Invoice ingestion**: Three paths — (1) Photo upload → LLM OCR → review → confirm, (2) XML upload → parse → create, (3) QR code → Sefaz API → parse → create. All paths trigger AI analysis on confirmation.
- **AI analysis**: GPT-4o-mini generates price alerts, category insights, merchant patterns, and spending summaries. Results persisted in `analyses` table.
- **CNPJ features**: Feature-flagged. Validation (checksum), enrichment (BrasilAPI/ReceitaWS with 24h Redis cache), auto-populate issuer name on confirmation.
- **Image optimization**: Server-side resize to 1536px + JPEG conversion before LLM. Configurable via `IMAGE_OPTIMIZATION_ENABLED`, `IMAGE_MAX_DIMENSION`, `IMAGE_JPEG_QUALITY`.
- **Duplicate detection**: Composite unique constraint `(access_key, user_id)`. Early check in background task shows warning banner (non-blocking).
- **Date handling**: `dateutil.parser.parse(dayfirst=True)` in Pydantic validators. Supports DD/MM/YYYY (Brazilian), ISO 8601, and US formats.
- **Database migrations**: 7 Alembic migrations in `apps/api/alembic/versions/`. Docker entrypoint runs `alembic upgrade head` before starting uvicorn.

## Code style (backend)

- PEP 8, line length 88 (Black-compatible)
- Type hints on all function signatures
- `async`/`await` for every DB operation
- Imports grouped: stdlib → third-party → local (absolute only, e.g. `from src.models.user import User`)
- Naming: `snake_case` for modules/functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- Pydantic schemas: `<Entity>Base` → `<Entity>Create` → `<Entity>Response`
- Custom exceptions via `SMarketException` hierarchy in `exceptions.py`; converted to `HTTPException` by handler

## Code style (frontend)

- TypeScript strict mode
- React Query for all server state (hooks in `src/hooks/`)
- Tailwind CSS for styling (shadcn-inspired component library in `components/ui/`)
- Brazilian locale: `pt-BR` for dates, `BRL` for currency formatting
- Recharts for data visualization

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

**Frontend:** `NEXT_PUBLIC_API_URL` (set in `apps/web/.env.local` or via `docker-compose.yml`).
