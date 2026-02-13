# SMarket - Project Memory Bank

## Project Overview

**SMarket** (Mercado Esperto) is a Brazilian invoice (NF-e/NFC-e) analysis application that uses artificial intelligence to provide insights about purchases and help users save money. It functions as a personal "shopping analyst."

### Core Purpose
- Parse and process Brazilian fiscal invoices (NF-e/NFC-e)
- Extract product data and categorize purchases using AI
- Generate intelligent insights about spending patterns
- Provide a dashboard for financial analysis
- Track spending habits and suggest savings opportunities

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
- **AI Providers**: OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Cache**: Redis 7
- **Payments**: Stripe integration

### Frontend Stack (apps/web/)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Charts**: Recharts
- **Tables**: TanStack React Table
- **Linting**: ESLint with comprehensive plugins (TypeScript, React, a11y, Tailwind, Security)
- **Mobile**: Capacitor for Android/iOS

## Data Model (14 Core Entities)

### Entity Relationships
```
User ─┬─► Subscription ─► Payment ─► CouponUsage
      │        │                │
      │        └─► UsageRecord   └─► Coupon
      │
      ├─► Merchant ─► Invoice ─► InvoiceItem ─► Product
      │                    │
      │                    └─► InvoiceProcessing
      │                                              │
      ├─► Category ◄────────────────────────────────┘
      │
      ├─► Analysis
      │
      ├─► PurchasePattern
      │
      └─► AuditLog (admin actions)
```

### Entities Summary
1. **User**: Authentication, household profile, and user identification (includes `admin_role` for RBAC)
2. **Subscription**: User subscription with trial support (FREE/BASIC/PREMIUM)
3. **Payment**: Payment records for subscription transactions
4. **UsageRecord**: Monthly usage tracking (invoices, AI analyses)
5. **Merchant**: Store/establishment information (CNPJ-based)
6. **Invoice**: Complete fiscal invoice data (NF-e/NFC-e)
7. **InvoiceItem**: Individual products in an invoice
8. **InvoiceProcessing**: Photo processing records via LLM
9. **Product**: Generic product catalog for analysis
10. **Category**: Product classification (system + user-defined)
11. **Analysis**: AI-generated insights and alerts
12. **PurchasePattern**: Detected recurring purchase patterns
13. **Coupon**: Discount coupons for subscriptions (percentage/fixed)
14. **CouponUsage**: Records of coupon usage by users
15. **AuditLog**: Administrative action tracking for compliance

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - JWT login
- `POST /refresh` - Token refresh
- `GET /me` - Current user info

### Core Resources
- `/api/v1/invoices` - Invoice CRUD + upload (XML/QRCode/Photo)
- `/api/v1/merchants` - Merchant management with CNPJ enrichment
- `/api/v1/categories` - Category management
- `/api/v1/products` - Product catalog
- `/api/v1/invoice-items` - Invoice line items
- `/api/v1/analysis` - AI insights and dashboard
- `/api/v1/purchase-patterns` - Recurring patterns
- `/api/v1/subscriptions` - Subscription and payment management
- `/api/v1/coupons` - Coupon validation

### Subscription Endpoints (`/api/v1/subscriptions`)
- `GET /` - Get subscription and current month usage
- `POST /checkout` - Create Stripe Checkout session
- `POST /portal` - Create Stripe Customer Portal session
- `POST /cancel` - Cancel subscription at period end
- `GET /payments` - List payment history
- `POST /webhooks/stripe` - Handle Stripe webhook events

### Admin Endpoints (`/api/v1/admin`) - Web Only
- `GET /` - Admin area info
- `GET /dashboard/stats` - Dashboard KPIs (MRR, users, churn, etc.)
- `GET /dashboard/revenue` - Revenue chart data
- `GET /dashboard/growth` - User growth chart
- `GET /dashboard/operations` - Operational metrics (OCR success rate)
- `GET /users` - List users with filters
- `GET /users/{id}` - User details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Soft delete user
- `POST /users/{id}/restore` - Restore deleted user
- `POST /users/{id}/impersonate` - Generate impersonation token
- `GET /users/{id}/activity` - User activity log
- `GET /subscriptions` - List subscriptions
- `POST /subscriptions/{id}/cancel` - Cancel subscription
- `POST /subscriptions/{id}/extend-trial` - Extend trial
- `GET /payments` - List payments
- `POST /payments/{id}/refund` - Process refund
- `GET /coupons` - List coupons
- `POST /coupons` - Create coupon
- `PUT /coupons/{id}` - Update coupon
- `GET /audit-logs` - System audit logs
- `GET /settings` - System settings
- `GET /reports/churn` - Churn analysis report
- `GET /reports/conversion` - Conversion funnel report
- `GET /reports/mrr` - MRR breakdown report
- `GET /reports/export/users` - Export users to CSV
- `GET /reports/export/subscriptions` - Export subscriptions to CSV
- `GET /reports/export/payments` - Export payments to CSV

## Key Features

### Implemented (MVP+)
- ✅ JWT authentication (access + refresh tokens)
- ✅ Invoice upload via XML, QR Code, and Photo
- ✅ Automatic NF-e/NFC-e parsing
- ✅ Multi-provider AI service (OpenAI, Gemini, Anthropic, OpenRouter)
- ✅ Photo processing with LLM vision models
- ✅ Automatic insight generation after upload
- ✅ Price alerts (above average detection)
- ✅ Category-based spending insights
- ✅ Merchant analysis with CNPJ enrichment
- ✅ Dashboard with financial summary
- ✅ Spending trends and analytics
- ✅ Interactive dashboard with summary cards
- ✅ Recent insights visualization
- ✅ Responsive design with Tailwind CSS
- ✅ Subscription system with trial period (30 days)
- ✅ Stripe payment integration
- ✅ Usage limits per plan
- ✅ CNPJ validation and enrichment via BrasilAPI/ReceitaWS
- ✅ Feature flags for AI analysis types
- ✅ Mobile app via Capacitor (Android)
- ✅ Admin area with RBAC (Web only)
- ✅ Coupon system for discounts
- ✅ Audit logging for admin actions
- ✅ User impersonation for support
- ✅ SaaS metrics (MRR, ARR, ARPU, churn, trial conversion)
- ✅ Reports (churn, conversion, MRR) with CSV export

### Planned Features
- [ ] Price comparison page
- [ ] Advanced filters
- [ ] Dark mode
- [ ] Push/email notifications
- [ ] Recurring purchase predictions
- [ ] Savings goals
- [ ] Apple IAP and Google Play billing (Phase 3)

## Analysis Types Generated

1. **Price Alerts**: Detects when user pays above historical average
2. **Category Insights**: Analyzes spending patterns by category
3. **Merchant Patterns**: Compares prices across establishments
4. **Summary**: Intelligent purchase overview with savings tips
5. **Budget Health**: Overall budget health assessment
6. **Per Capita Spending**: Spending per household member
7. **Essential Ratio**: Essential vs non-essential spending
8. **Income Commitment**: Percentage of income spent on groceries
9. **Children Spending**: Products specifically for children
10. **Wholesale Opportunity**: Bulk purchase recommendations
11. **Shopping Frequency**: Shopping frequency analysis
12. **Seasonal Alert**: Seasonal price variations
13. **Savings Potential**: Estimated savings opportunities
14. **Family Nutrition**: Nutrition-focused insights

## Subscription Plans

| Plan | Invoices/Month | AI Analyses/Month | Price |
|------|----------------|-------------------|-------|
| FREE | 1 | 2 | R$ 0 |
| BASIC | 5 | 5 | R$ 9.90/mo |
| PREMIUM | Unlimited | Unlimited | R$ 19.90/mo |

- All new users get 30-day trial with unlimited access
- Trial users have PREMIUM-level features during trial period

## Admin Roles (RBAC)

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to everything |
| `admin` | Most features except super admin actions |
| `support` | Read-only + user impersonation |
| `finance` | Reports, payments, refunds |
| `read_only` | View-only access |

Permission format: `resource:action` (e.g., `user:delete`, `subscription:update`)

## Development Commands

### Backend (from apps/api/)
```bash
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
pytest                                    # Run tests
pytest --cov=src --cov-report=term-missing  # With coverage
alembic upgrade head                      # Apply migrations
alembic revision --autogenerate -m "desc" # Create migration
ruff check src/ --fix                     # Lint + auto-fix
ruff format src/                          # Format
mypy src/ --strict                        # Type check
```

### Frontend (from apps/web/)
```bash
npm install
npm run dev      # Development server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
npm run lint:fix # Auto-fix lint issues
npm run type-check # TypeScript type checking
```

### Docker (from repo root)
```bash
docker-compose up -d              # Start all services
docker-compose up -d --build api  # Rebuild API
docker-compose logs -f api        # View logs
docker-compose down -v            # Stop and remove volumes
docker compose down api && docker compose up --build api  # Clean restart
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)

### AI Providers (at least one required)
- `OPENAI_API_KEY` - OpenAI API access
- `GEMINI_API_KEY` - Google Gemini API access
- `ANTHROPIC_API_KEY` - Anthropic Claude API access
- `OPENROUTER_API_KEY` - OpenRouter unified API access

### Payment (Stripe)
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_*_PRICE_ID` - Stripe price IDs for each plan/cycle

### Admin System
- `ADMIN_BOOTSTRAP_EMAIL` - Email to promote to admin on startup
- `ADMIN_BOOTSTRAP_ROLE` - Role to assign (default: `super_admin`)

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
- [`ENV_CONFIG.md`](ENV_CONFIG.md) - Environment configuration guide
- [`FEATURE_FLAGS.md`](FEATURE_FLAGS.md) - Feature flags documentation
- [`apps/web/ESLINT.md`](apps/web/ESLINT.md) - ESLint rules documentation

### Key Source Files
- [`apps/api/src/main.py`](apps/api/src/main.py) - FastAPI app entry point
- [`apps/api/src/config.py`](apps/api/src/config.py) - Pydantic Settings with feature flags
- [`apps/api/src/database.py`](apps/api/src/database.py) - SQLAlchemy setup
- [`apps/api/src/dependencies.py`](apps/api/src/dependencies.py) - FastAPI dependencies
- [`apps/api/src/core/roles.py`](apps/api/src/core/roles.py) - Admin RBAC definitions
- [`apps/api/src/services/ai_analyzer.py`](apps/api/src/services/ai_analyzer.py) - Multi-provider AI integration
- [`apps/api/src/services/multi_provider_extractor.py`](apps/api/src/services/multi_provider_extractor.py) - LLM vision extraction
- [`apps/api/src/services/cnpj_enrichment.py`](apps/api/src/services/cnpj_enrichment.py) - CNPJ data enrichment
- [`apps/api/src/services/stripe_service.py`](apps/api/src/services/stripe_service.py) - Stripe integration
- [`apps/api/src/services/subscription_service.py`](apps/api/src/services/subscription_service.py) - Subscription logic
- [`apps/api/src/services/admin_service.py`](apps/api/src/services/admin_service.py) - Admin operations
- [`apps/api/src/services/metrics_service.py`](apps/api/src/services/metrics_service.py) - SaaS metrics calculation
- [`apps/api/src/services/coupon_service.py`](apps/api/src/services/coupon_service.py) - Coupon validation
- [`apps/api/src/routers/admin/__init__.py`](apps/api/src/routers/admin/__init__.py) - Admin router
- [`apps/web/src/lib/api.ts`](apps/web/src/lib/api.ts) - Frontend API client
- [`apps/web/src/types/index.ts`](apps/web/src/types/index.ts) - TypeScript interfaces

## Services

### Docker Services
| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| postgres | smarket-postgres | 5432 | PostgreSQL 16 database |
| redis | smarket-redis | 6372 | Redis 7 cache |
| api | smarket-api | 8000 | FastAPI backend |
| web | smarket-web | 3000 | Next.js frontend |

### Backend Services
| Service | Purpose |
|---------|---------|
| `AdminService` | User management, impersonation, audit logging |
| `MetricsService` | SaaS KPIs (MRR, ARR, ARPU, churn, trial conversion) |
| `CouponService` | Coupon validation and application |
| `ai_analyzer` | Multi-provider AI integration |
| `multi_provider_extractor` | LLM vision extraction |
| `cnpj_enrichment` | CNPJ data from BrasilAPI/ReceitaWS |
| `stripe_service` | Stripe Checkout, Portal, webhooks |
| `subscription_service` | Subscription lifecycle management |

## Security Considerations

- JWT authentication with access and refresh tokens
- Passwords hashed with bcrypt
- CORS configured for production
- Docker containers run as non-root user
- Health checks implemented for monitoring
- Input validation via Pydantic
- Stripe webhook signature verification
- CNPJ validation before enrichment
- Admin area blocked on native mobile platforms (iOS/Android)
- RBAC permission checks on all admin endpoints
- Audit logging for all administrative actions

## Current State

The project is at **MVP+ stage** with core functionality, subscription system, and admin area implemented:
- Full authentication flow with household profile
- Invoice processing (XML/QRCode/Photo)
- Multi-provider AI-powered analysis generation
- CNPJ validation and enrichment
- Subscription system with Stripe integration
- Usage tracking and limits
- Comprehensive dashboard and insights display
- Mobile app via Capacitor (Android)
- Admin area with RBAC (Web only)
- Coupon system for discounts
- SaaS metrics and analytics

The codebase follows a clean architecture with clear separation between:
- Models (SQLAlchemy ORM) - 14 entities
- Schemas (Pydantic validation)
- Routers (API endpoints)
- Services (Business logic)
- Parsers (Invoice processing)
- Tasks (Background processing)
- Utils (Helper functions)
- Core (Roles and permissions)

### Feature Flags System
The project uses a comprehensive feature flag system:
- **AI Analysis Master Flag**: `ENABLE_AI_ANALYSIS`
- **Individual Analysis Flags**: Each analysis type can be toggled
- **CNPJ Features**: `ENABLE_CNPJ_FEATURES`, `ENABLE_CNPJ_VALIDATION`, `ENABLE_CNPJ_ENRICHMENT`
- **Subscription System**: `ENABLE_SUBSCRIPTION_SYSTEM` for gradual rollout

### Frontend Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | User login |
| `/register` | User registration |
| `/forgot-password` | Password recovery |
| `/dashboard` | Main dashboard |
| `/dashboard/analytics` | Spending analytics |
| `/invoices` | Invoice list |
| `/invoices/add` | Upload new invoice |
| `/invoices/[id]` | Invoice details |
| `/invoices/[id]/edit` | Edit invoice |
| `/invoices/review/[id]` | Review photo-extracted data |
| `/insights` | AI insights list |
| `/products` | Product catalog |
| `/pricing` | Subscription plans |
| `/settings` | User settings |
| `/settings/subscription` | Subscription management |
| `/admin` | Admin dashboard (Web only) |
| `/admin/users` | User management |
| `/admin/subscriptions` | Subscription management |
| `/admin/payments` | Payment management |
| `/admin/coupons` | Coupon management |
| `/admin/settings` | System settings |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET requests |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid JWT token |
| 402 | Payment Required | Subscription inactive or trial expired |
| 403 | Forbidden | User inactive or insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate invoice |
| 429 | Too Many Requests | Monthly usage limit reached |
| 500 | Internal Server Error | Unexpected server errors |

### Subscription Error Headers (402 & 429)
- `X-Subscription-Error`: Error type
- `X-Limit-Type`: Resource type (`invoice` or `analysis`)
- `X-Current-Plan`: User's current plan
