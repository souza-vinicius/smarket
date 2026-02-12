# Admin Area Implementation Plan - Execution

> **Based on**: `admin-area-plan.md`
> **Strategy**: MVP in 3 deliveries
> **Status**: 🚧 In Progress

---

## 📦 Delivery Breakdown

### Delivery 1: Foundation (FASE 1) - **✅ COMPLETE**

**Goal**: Setup admin infrastructure, RBAC, and web-only access control

#### Backend Tasks
- [x] Create `AdminRole` enum and permissions mapping (`src/core/roles.py`)
- [x] Add `admin_role` (nullable) and `deleted_at` to User model
- [x] Create `AuditLog` model
- [x] Create migration for User alterations + AuditLog table
- [x] Create admin Pydantic schemas (`src/schemas/admin.py`)
- [x] Create `get_current_admin` and `require_permission` dependencies
- [x] Create base admin router with RBAC middleware (`src/routers/admin/__init__.py`)
- [x] Implement admin bootstrap script (startup event in `main.py`)
- [x] Add native platform blocking in admin middleware (X-Platform header check)
- [x] Update `UserResponse` schema to include `is_admin` and `admin_role`

#### Frontend Tasks
- [x] Install `@tanstack/react-table`
- [x] Create generic `data-table.tsx` component
- [x] Create admin layout (`app/admin/layout.tsx`) with:
  - Sidebar navigation
  - Access guard (admin_role check)
  - Native blocking (isNative() redirect)
- [x] Create `lib/admin-api.ts` with X-Platform header interceptor
- [x] Create admin dashboard page skeleton (`app/admin/page.tsx`)
- [x] Add admin link to main sidebar (conditional: admin_role && !isNative())
- [x] Create Next.js middleware (`src/middleware.ts`) for /admin/* routes
- [x] Update User type to include `is_admin` and `admin_role` fields

#### Testing
- [ ] Test User model loads with new fields
- [ ] Test AuditLog model and relationships
- [ ] Test `get_current_admin` dependency (403 for non-admins)
- [ ] Test admin bootstrap creates super_admin correctly
- [ ] Test native platform blocking (403 for X-Platform: ios/android)
- [ ] Test frontend guard redirects non-admins and native users

#### Environment
- [x] Add `ADMIN_BOOTSTRAP_EMAIL` to `.env.example`
- [x] Add `ADMIN_BOOTSTRAP_ROLE` to `.env.example` (default: super_admin)

---

### Delivery 2: Users + Dashboard (FASE 2 + FASE 5 básico)

**Goal**: Full user management + basic dashboard with KPIs

#### Backend Tasks
- [ ] Create `AdminService` with user CRUD operations
- [ ] Endpoints: List users (pagination, filters)
- [ ] Endpoints: Get user details (+ subscription + usage + invoices count)
- [ ] Endpoints: Update user
- [ ] Endpoints: Soft delete user (set deleted_at, is_active=False)
- [ ] Endpoints: Restore user
- [ ] Endpoints: Impersonate user (JWT with impersonated_by claim)
- [ ] Endpoints: User activity log (audit_logs filtered by user)
- [ ] Create `MetricsService` with basic KPI queries:
  - Total users count
  - Active subscriptions count
  - MRR calculation (monthly recurring revenue)
  - Churn rate (last 30 days)
- [ ] Endpoint: `/admin/dashboard/stats` (KPIs)
- [ ] Auto-create audit log on all admin actions

#### Frontend Tasks
- [ ] Create `use-admin-users.ts` hook (list, get, update, delete, restore)
- [ ] Create `use-admin-analytics.ts` hook (dashboard stats)
- [ ] Create admin users list page (`app/admin/users/page.tsx`)
- [ ] Create user details page (`app/admin/users/[id]/page.tsx`)
- [ ] Create impersonation banner component
- [ ] Create stats cards for dashboard
- [ ] Update dashboard page with real KPIs

#### Testing
- [ ] Test user CRUD endpoints (RBAC per role)
- [ ] Test soft delete preserves data
- [ ] Test impersonation creates audit log
- [ ] Test non-admin gets 403 on /admin/users
- [ ] Test support role can impersonate but not delete

---

### Delivery 3: Subscriptions + Real Metrics (FASE 3 + FASE 5 completo)

**Goal**: Subscription/payment management + complete SaaS metrics

#### Backend Tasks
- [ ] Endpoints: List subscriptions (filters by status/plan/period)
- [ ] Endpoints: Get subscription details (+ payment history)
- [ ] Endpoints: Modify subscription (Stripe API integration)
- [ ] Endpoints: Cancel subscription (via stripe_service)
- [ ] Endpoints: Extend trial
- [ ] Endpoints: List payments (filters)
- [ ] Endpoints: Get payment details
- [ ] Endpoints: Process refund (Stripe Refund API)
- [ ] Enhance MetricsService with:
  - ARR, ARPU, LTV
  - Trial conversion rate
  - Net MRR movement
  - Growth metrics (new users over time)
  - Operational metrics (invoices/day, OCR success rate)
- [ ] Endpoints: Revenue chart data
- [ ] Endpoints: Growth chart data
- [ ] Endpoints: Operational metrics

#### Frontend Tasks
- [ ] Create subscription management hooks
- [ ] Create payment management hooks
- [ ] Create subscriptions list page
- [ ] Create subscription details page
- [ ] Create payments list page
- [ ] Create refund modal component
- [ ] Add revenue chart to dashboard (Recharts)
- [ ] Add growth chart to dashboard
- [ ] Add operational metrics section to dashboard

#### Testing
- [ ] Test subscription modification calls Stripe
- [ ] Test refund calls Stripe API
- [ ] Test MRR calculation (monthly + annual/12)
- [ ] Test churn rate calculation
- [ ] Test trial conversion calculation

---

## 🎯 Current Focus: Delivery 1 - Foundation

### Next Steps
1. Create `src/core/roles.py` with AdminRole enum and ROLE_PERMISSIONS
2. Modify User model (add admin_role, deleted_at)
3. Create AuditLog model
4. Generate migration
5. Create admin schemas
6. Create admin dependencies
7. Setup frontend infrastructure

---

## 📊 Progress Tracking

| Delivery | Backend | Frontend | Tests | Status |
|----------|---------|----------|-------|--------|
| **D1: Foundation** | 10/10 | 8/8 | 0/6 | ✅ Complete (Code) - Tests Pending |
| **D2: Users + Dashboard** | 0/10 | 0/7 | 0/5 | ⏳ Pending |
| **D3: Subscriptions + Metrics** | 0/13 | 0/8 | 0/4 | ⏳ Pending |

**Total**: 18/65 tasks completed (27.7%)

---

## 🔐 Security Checklist (All Deliveries)

- [ ] All admin endpoints require `get_current_admin` dependency
- [ ] RBAC enforced via `require_permission` decorator
- [ ] All mutations create audit logs
- [ ] Impersonation generates audit log with admin_user_id
- [ ] Native platform blocking works (4-layer defense)
- [ ] Passwords never returned in API responses
- [ ] Sensitive data masked in logs
- [ ] 403 errors handled gracefully in frontend

---

## 📚 References

- **Full Plan**: `plans/admin-area-plan.md`
- **Architecture**: `CLAUDE.md` → Architecture section
- **Agents**: `.agent/backend-specialist.md`, `.agent/frontend-specialist.md`
- **Skills**: `@[skills/clean-code]`, `@[skills/database-design]`, `@[skills/api-patterns]`
