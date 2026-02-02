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

This is a monorepo with two apps sharing a single `docker-compose.yml`:

- **`apps/api/`** — FastAPI backend (Python 3.11, async throughout)
- **`apps/web/`** — Next.js 14 frontend (App Router, TypeScript)
- **`plans/`** — Architecture and implementation plans (reference, not prescriptive)

### Backend layer structure

```
src/
├── main.py            # FastAPI app; mounts all routers under /api/v1
├── config.py          # Pydantic Settings (reads .env)
├── database.py        # Async SQLAlchemy engine + get_db() dependency
├── dependencies.py    # Shared FastAPI Depends (e.g. get_current_user)
├── models/            # SQLAlchemy ORM — one file per entity
├── schemas/           # Pydantic request/response models (Base/Create/Response pattern)
├── routers/           # One router file per resource; each exports `router = APIRouter()`
├── services/          # Business logic (ai_analyzer.py calls OpenAI GPT-4o-mini)
├── parsers/           # NF-e XML parsing and QR code handling
└── utils/             # security.py: password hashing + JWT helpers
```

Each resource follows a consistent three-layer pattern: **model → schema → router**. Schemas use a `Base / Create / Response` inheritance hierarchy with `from_attributes = True` for ORM compatibility. All DB access is async (`AsyncSession`). Routers receive the session via `Depends(get_db)` and the authenticated user via a dependency in `dependencies.py`.

The 8 core entities are: `User`, `Invoice`, `InvoiceItem`, `Product`, `Category`, `Merchant`, `Analysis`, `PurchasePattern`. Relationships use `selectin` lazy loading. See `plans/data-model-analysis.md` for the full entity relationship design.

### Frontend layer structure

```
src/
├── app/               # Next.js App Router pages (dashboard, invoices, insights, auth)
├── components/
│   ├── ui/            # Base UI primitives (shadcn-style: card, button, input, badge, skeleton)
│   ├── dashboard/     # Dashboard-specific components
│   ├── invoices/      # Invoice list + upload modal
│   ├── insights/      # Insights display
│   └── layout/        # Header + sidebar (shared chrome)
├── lib/
│   ├── api.ts         # Axios-based HTTP client targeting NEXT_PUBLIC_API_URL
│   ├── auth.ts        # Token storage and auth utilities
│   └── utils.ts       # General helpers
├── hooks/             # Custom React hooks
└── types/index.ts     # TypeScript interfaces mirroring backend schemas
```

State is fetched via TanStack React Query. The root layout (`app/layout.tsx`) wraps children in a `providers.tsx` that sets up the Query Client.

### Key cross-cutting concerns

- **Auth flow**: JWT access + refresh tokens. Backend issues both on `/api/v1/auth/login`; frontend stores them and calls `/api/v1/auth/refresh` to rotate. `dependencies.py` exposes `get_current_user` for route protection.
- **AI analysis**: After each invoice upload the backend calls OpenAI GPT-4o-mini via `services/ai_analyzer.py` to generate price alerts, category insights, merchant patterns, and a summary. Results are persisted in the `analyses` table.
- **Invoice ingestion**: NF-e/NFC-e invoices arrive as XML or via QR code. `parsers/xml_parser.py` extracts structured data; `parsers/qrcode_parser.py` handles QR code resolution. Parsed data is stored across `invoices`, `invoice_items`, `products`, `merchants`, and `categories`.
- **Database**: Alembic migrations live in `apps/api/alembic/versions/` (currently no committed migrations — tables are created via `Base.metadata.create_all`). The Docker entrypoint runs `alembic upgrade head` before starting uvicorn.

## Code style (backend)

- PEP 8, line length 88 (Black-compatible)
- Type hints on all function signatures
- `async`/`await` for every DB operation
- Imports grouped: stdlib → third-party → local (absolute only, e.g. `from src.models.user import User`)
- Naming: `snake_case` for modules/functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- Pydantic schemas: `<Entity>Base` → `<Entity>Create` → `<Entity>Response`
- Errors via `HTTPException` with explicit `status` constants

## Environment

Copy `.env.example` to `.env` at the repo root. Required values: `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY`, `ALLOWED_ORIGINS`. The frontend only needs `NEXT_PUBLIC_API_URL` (set in its own `.env.local` or passed via `docker-compose.yml`).
