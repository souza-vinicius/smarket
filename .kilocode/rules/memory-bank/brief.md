# SMarket - Project Memory Bank

## Project Overview

**SMarket** is a Brazilian invoice (NF-e/NFC-e) analysis application that uses artificial intelligence to provide insights about purchases and help users save money. It functions as a personal "shopping analyst."

### Core Purpose
- Parse and process Brazilian fiscal invoices (NF-e/NFC-e)
- Extract product data and categorize purchases using AI
- Generate intelligent insights about spending patterns
- Provide a dashboard for financial analysis

## Architecture

### Monorepo Structure
```
smarket/
├── apps/
│   ├── api/              # FastAPI Backend (Python 3.11+)
│   └── web/              # Next.js 14 Frontend (TypeScript)
├── plans/                # Architecture and implementation plans
├── docker-compose.yml    # Container orchestration
└── AGENTS.md             # AI agent guidelines
```

### Backend Stack (apps/api/)
- **Framework**: FastAPI 0.109.0
- **ORM**: SQLAlchemy 2.0.25 (async)
- **Database**: PostgreSQL 16
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **AI**: OpenAI GPT-4o-mini
- **Cache**: Redis 7

### Frontend Stack (apps/web/)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Charts**: Recharts
- **Linting**: ESLint with comprehensive plugins (TypeScript, React, a11y, Tailwind, Security)

## Data Model (8 Core Entities)

### Entity Relationships
```
User ─┬─► Merchant ─► Invoice ─► InvoiceItem ─► Product
      │                                              │
      ├─► Category ◄────────────────────────────────┘
      │
      ├─► Analysis
      │
      └─► PurchasePattern
```

### Entities Summary
1. **User**: Authentication and user identification
2. **Merchant**: Store/establishment information (CNPJ-based)
3. **Invoice**: Complete fiscal invoice data (NF-e/NFC-e)
4. **InvoiceItem**: Individual products in an invoice
5. **Product**: Generic product catalog for analysis
6. **Category**: Product classification (system + user-defined)
7. **Analysis**: AI-generated insights and alerts
8. **PurchasePattern**: Detected recurring purchase patterns

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - JWT login
- `POST /refresh` - Token refresh
- `GET /me` - Current user info

### Core Resources
- `/api/v1/invoices` - Invoice CRUD + upload (XML/QRCode)
- `/api/v1/merchants` - Merchant management
- `/api/v1/categories` - Category management
- `/api/v1/products` - Product catalog
- `/api/v1/invoice-items` - Invoice line items
- `/api/v1/analysis` - AI insights and dashboard
- `/api/v1/purchase-patterns` - Recurring patterns

## Key Features

### Implemented (MVP)
- ✅ JWT authentication (access + refresh tokens)
- ✅ Invoice upload via XML and QR Code
- ✅ Automatic NF-e/NFC-e parsing
- ✅ AI service with OpenAI GPT-4o-mini
- ✅ Automatic insight generation after upload
- ✅ Price alerts (above average detection)
- ✅ Category-based spending insights
- ✅ Merchant analysis
- ✅ Dashboard with financial summary
- ✅ Spending trends
- ✅ Interactive dashboard with summary cards
- ✅ Recent insights visualization
- ✅ Responsive design with Tailwind CSS

### Planned Features
- [ ] Spending trends page
- [ ] Price comparison page
- [ ] Interactive charts
- [ ] Advanced filters
- [ ] Data export (CSV/PDF)
- [ ] Dark mode
- [ ] Push/email notifications
- [ ] Recurring purchase predictions
- [ ] Savings goals

## Analysis Types Generated

1. **Price Alerts**: Detects when user pays above historical average
2. **Category Insights**: Analyzes spending patterns by category
3. **Merchant Patterns**: Compares prices across establishments
4. **Summary**: Intelligent purchase overview with savings tips

## Development Commands

### Backend (from apps/api/)
```bash
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
pytest                                    # Run tests
pytest --cov=src --cov-report=term-missing  # With coverage
alembic upgrade head                      # Apply migrations
alembic revision --autogenerate -m "desc" # Create migration
```

### Frontend (from apps/web/)
```bash
npm install
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Docker (from repo root)
```bash
docker-compose up -d              # Start all services
docker-compose up -d --build api  # Rebuild API
docker-compose logs -f api        # View logs
docker-compose down -v            # Stop and remove volumes
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API access
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Code Style Guidelines

### Python (Backend)
- PEP 8 compliant
- Line length: 88 characters (Black-compatible)
- Type hints on all function signatures
- `async`/`await` for all database operations
- Absolute imports only (e.g., `from src.models.user import User`)

### Import Order
1. Standard library
2. Third-party packages
3. Local application modules

### Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| Modules | snake_case | `invoice_parser.py` |
| Classes | PascalCase | `User`, `InvoiceCreate` |
| Functions | snake_case | `get_current_user()` |
| Variables | snake_case | `access_token` |
| Constants | UPPER_SNAKE | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Pydantic schemas | PascalCase + suffix | `UserCreate`, `UserResponse` |

### Schema Pattern
```python
class EntityBase(BaseModel):
    # Common fields

class EntityCreate(EntityBase):
    # Fields for creation

class EntityResponse(EntityBase):
    id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
```

### TypeScript (Frontend)
- ESLint with Flat Config format
- Strict type checking with TypeScript ESLint
- React best practices with React Hooks rules
- Accessibility (a11y) compliance via jsx-a11y
- Import organization with eslint-plugin-import
- Tailwind CSS class validation
- Security vulnerability detection
- Line length: 100 characters (ESLint-compatible)

### ESLint Plugins (Frontend)
| Plugin | Purpose |
|--------|-----------|
| `@typescript-eslint` | Strict type checking and TypeScript best practices |
| `eslint-plugin-react` | React and JSX patterns |
| `eslint-plugin-react-hooks` | Hooks rules (exhaustive-deps) |
| `eslint-plugin-jsx-a11y` | WCAG accessibility compliance |
| `eslint-plugin-import` | Import organization and validation |
| `eslint-plugin-tailwindcss` | Tailwind class validation |
| `eslint-plugin-security` | Security vulnerability detection |

### Frontend Lint Commands
```bash
cd apps/web
npm run lint         # Check for errors
npm run lint:fix     # Auto-fix issues
npm run type-check   # TypeScript type checking
```

### Key ESLint Rules
- **TypeScript**: `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`
- **React**: `react-hooks/exhaustive-deps`, `react/jsx-key`, `react/jsx-no-target-blank`
- **Accessibility**: `jsx-a11y/alt-text`, `jsx-a11y/label-has-associated-control`
- **Security**: `security/detect-object-injection`, `security/detect-unsafe-regex`
- **Imports**: `import/order` (organized groups: builtin, external, internal, sibling, index)

### Frontend Naming Conventions
| Element | Convention | Example |
|----------|------------|---------|
| Files | kebab-case | `user-profile.tsx` |
| Components | PascalCase | `UserProfile`, `InvoiceList` |
| Hooks | useCamelCase | `useAuth`, `useDashboard` |
| Functions | camelCase | `fetchUser()`, `calculateTotal()` |
| Variables | camelCase | `userName`, `invoiceId` |
| Constants | UPPER_SNAKE | `API_BASE_URL`, `MAX_ITEMS` |

## Project Files Reference

### Documentation
- [`README.md`](README.md) - Project overview and setup
- [`AGENTS.md`](AGENTS.md) - AI agent guidelines
- [`CLAUDE.md`](CLAUDE.md) - Claude-specific instructions
- [`plans/backend-plan.md`](plans/backend-plan.md) - Backend implementation plan
- [`plans/data-model-analysis.md`](plans/data-model-analysis.md) - Data model design
- [`plans/arquitetura-sistema.md`](plans/arquitetura-sistema.md) - System architecture
- [`apps/web/eslint.config.mjs`](apps/web/eslint.config.mjs) - ESLint Flat Config
- [`apps/web/ESLINT.md`](apps/web/ESLINT.md) - ESLint rules documentation

### Key Source Files
- [`apps/api/src/main.py`](apps/api/src/main.py) - FastAPI app entry point
- [`apps/api/src/config.py`](apps/api/src/config.py) - Pydantic Settings
- [`apps/api/src/database.py`](apps/api/src/database.py) - SQLAlchemy setup
- [`apps/api/src/dependencies.py`](apps/api/src/dependencies.py) - FastAPI dependencies
- [`apps/api/src/services/ai_analyzer.py`](apps/api/src/services/ai_analyzer.py) - OpenAI integration
- [`apps/web/src/lib/api.ts`](apps/web/src/lib/api.ts) - Frontend API client
- [`apps/web/src/types/index.ts`](apps/web/src/types/index.ts) - TypeScript interfaces

## Services

### Docker Services
| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| postgres | smarket-postgres | 5432 | PostgreSQL 16 database |
| redis | smarket-redis | 6379 | Redis 7 cache |
| api | smarket-api | 8000 | FastAPI backend |
| web | smarket-web | 3000 | Next.js frontend |

## Security Considerations

- JWT authentication with access and refresh tokens
- Passwords hashed with bcrypt
- CORS configured for production
- Docker containers run as non-root user
- Health checks implemented for monitoring
- Input validation via Pydantic

## Current State

The project is at **MVP stage** with core functionality implemented:
- Full authentication flow
- Invoice processing (XML/QRCode)
- AI-powered analysis generation
- Basic dashboard and insights display
- Comprehensive ESLint configuration for frontend code quality

The codebase follows a clean architecture with clear separation between:
- Models (SQLAlchemy ORM)
- Schemas (Pydantic validation)
- Routers (API endpoints)
- Services (Business logic)
- Parsers (Invoice processing)

### ESLint Feature (feature/eslint branch)
The ESLint feature branch implements comprehensive linting for the frontend:
- Flat Config format (ESLint 9+)
- 7 plugins covering TypeScript, React, a11y, imports, Tailwind, and security
- Strict type checking with relaxed rules for existing codebase
- Accessibility compliance (WCAG)
- Security vulnerability detection
- Import organization and validation
- Tailwind CSS class validation
- Detailed documentation in [`apps/web/ESLINT.md`](apps/web/ESLINT.md)
