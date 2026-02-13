# Infrastructure Setup Plan: Mercado Esperto VPS (Phases 1-3)

## Goal
Create production-ready infrastructure documentation and configuration files for deploying Mercado Esperto to Hostinger VPS (16GB RAM, 8 vCPU, São Paulo) supporting 1000 concurrent users while maintaining strict $16.67/month budget.

## Deliverables Summary

### Phase 1: Infrastructure Configuration (2-3 hours)
**Output**: Domain/DNS setup guide + Nginx config + CloudFlare setup guide
- [ ] **Task 1.1**: Domain & DNS Setup Guide
  - Create `docs/DOMAIN_SETUP.md` with Registro.br + CloudFlare steps
  - Verify: File created, all steps documented with screenshots
  - Rollback: Delete file (no infrastructure yet)

- [ ] **Task 1.2**: CloudFlare Configuration Guide
  - Create `docs/CLOUDFLARE_SETUP.md` with DNS records, page rules, firewall rules
  - Verify: Guide includes all 10 configuration steps with expected results
  - Rollback: Delete file

- [ ] **Task 1.3**: Nginx Reverse Proxy Config
  - Create `nginx.conf` (rate limiting + SSL + caching headers)
  - Verify: File validates with `nginx -t`, all zones/upstreams defined
  - Rollback: `git checkout nginx.conf`

- [ ] **Task 1.4**: SSL Certificate Setup Guide
  - Create `docs/SSL_SETUP.md` with Let's Encrypt + Certbot steps
  - Verify: Include renewal automation steps, expected file locations
  - Rollback: Delete file

---

### Phase 2: Docker & Application Deployment (3-4 hours)
**Output**: Production docker-compose file + deployment procedures + health check script
- [ ] **Task 2.1**: Production Docker Compose
  - Create `docker-compose.production.yml` with all services + resource limits
  - Verify: File parses with `docker-compose config`, all services have healthchecks
  - Rollback: `git checkout docker-compose.production.yml`

- [ ] **Task 2.2**: Environment Configuration Template
  - Create `.env.production.example` with all required secrets (masked)
  - Verify: All 25+ variables documented with descriptions
  - Rollback: `rm .env.production.example`

- [ ] **Task 2.3**: Deployment Procedure Guide
  - Create `docs/DEPLOYMENT.md` with step-by-step (clone → .env → build → up → migrate → verify)
  - Verify: All 12 steps documented, expected output for each step
  - Rollback: `git checkout DEPLOYMENT.md`

- [ ] **Task 2.4**: Health Check & Verification Script
  - Create `scripts/health_check.sh` (curl /health endpoints, db ping, redis ping)
  - Verify: Script is executable, all checks documented
  - Rollback: `rm scripts/health_check.sh`

- [ ] **Task 2.5**: Database Migration Documentation
  - Create `docs/DATABASE_MIGRATION.md` with alembic commands + rollback procedures
  - Verify: Include both forward (upgrade head) and backward (downgrade) steps
  - Rollback: `git checkout DATABASE_MIGRATION.md`

---

### Phase 3: Backend Optimizations (4-5 hours)
**Output**: Code changes for performance + caching + rate limiting + LLM cost reduction

- [ ] **Task 3.1**: Connection Pooling Configuration
  - Modify `apps/api/src/database.py` with SQLAlchemy pool settings (20+10 connections)
  - Verify: File parses, `pool_size=20, max_overflow=10` visible, comments explain why
  - Rollback: `git checkout apps/api/src/database.py`

- [ ] **Task 3.2**: Celery Task Queue Integration
  - Create `apps/api/src/celery_app.py` (Redis broker, task config, decorators)
  - Modify `apps/api/src/routers/invoices.py` to use Celery instead of BackgroundTasks
  - Verify: Both files exist, no syntax errors, Celery config has acks_late + retry config
  - Rollback: `git checkout apps/api/src/celery_app.py apps/api/src/routers/invoices.py`

- [ ] **Task 3.3**: Rate Limiting Middleware
  - Create `apps/api/src/middleware/rate_limiter.py` (Redis-backed sliding window)
  - Modify `apps/api/src/main.py` to import and apply middleware
  - Verify: Both files exist, test endpoint has rate limit decorator
  - Rollback: `git checkout apps/api/src/middleware/rate_limiter.py apps/api/src/main.py`

- [ ] **Task 3.4**: LLM Response Caching (72h TTL)
  - Expand `apps/api/src/services/cached_prompts.py` with image hash + prompt hash caching
  - Modify `apps/api/src/services/multi_provider_extractor.py` to check cache first
  - Verify: Both files exist, cache TTL = 86400*3 (259200s), logic before LLM call
  - Rollback: `git checkout apps/api/src/services/cached_prompts.py apps/api/src/services/multi_provider_extractor.py`

- [ ] **Task 3.5**: Gemini Direct API Prioritization
  - Modify `apps/api/src/services/multi_provider_extractor.py` to prioritize Gemini Direct
  - Change provider order: Gemini Direct → OpenRouter → OpenAI → Anthropic
  - Verify: File shows new priority order, comments explain 80% cost savings
  - Rollback: `git checkout apps/api/src/services/multi_provider_extractor.py`

- [ ] **Task 3.6**: Batch AI Analysis
  - Modify `apps/api/src/services/ai_analyzer.py` to combine 14 analyses into 1 LLM call
  - Verify: Single prompt with 14 analysis types, returns one JSON response
  - Rollback: `git checkout apps/api/src/services/ai_analyzer.py`

- [ ] **Task 3.7**: Conditional Analysis (Skip Low-Value Invoices)
  - Modify `apps/api/src/tasks/ai_analysis.py` with business logic (Premium only, < R$50 skip)
  - Verify: Function `should_run_analysis()` exists with 3 conditions documented
  - Rollback: `git checkout apps/api/src/tasks/ai_analysis.py`

- [ ] **Task 3.8**: Configuration for Optimizations
  - Add to `apps/api/src/config.py`: `CELERY_ENABLED`, `RATE_LIMIT_ENABLED`, `CACHE_TTL_HOURS`, `MIN_INVOICE_VALUE_FOR_ANALYSIS`
  - Verify: All settings have defaults + doc strings
  - Rollback: `git checkout apps/api/src/config.py`

- [ ] **Task 3.9**: Create Optimization Summary Document
  - Create `docs/OPTIMIZATIONS.md` explaining all changes (pool size, Celery, caching, Gemini Direct)
  - Include before/after cost estimates (LLM: $1500 → $300/month)
  - Verify: Document includes 8+ optimizations with cost/performance impact
  - Rollback: `rm docs/OPTIMIZATIONS.md`

---

## Dependency Graph

```
Phase 1:
  1.1 (Domain) → 1.2 (CloudFlare) [both needed before VPS setup]
  1.3 (Nginx) ← depends on domain SSL
  1.4 (SSL) → 1.3 (Nginx SSL config)

Phase 2:
  2.1 (docker-compose.prod) [independent]
  2.2 (.env.example) ← depends on what services in 2.1
  2.3 (Deploy guide) → 2.4 (Health script) → 2.5 (DB migration)
  All Phase 2 tasks → Phase 3 (backend depends on docker infra)

Phase 3:
  3.1 (DB pooling) [independent]
  3.2 (Celery) [independent]
  3.3 (Rate limiting) [independent]
  3.4-3.7 (LLM optimizations) [all independent]
  3.8 (Config) ← depends on 3.1-3.7 (add config vars for new features)
  3.9 (Docs) ← depends on 3.1-3.8 (document all changes)
```

**Critical Path**: 1.1 → 1.2 → 1.4 → 1.3 → 2.1 → 2.3 → Phase 3

---

## Budget Impact Analysis

| Task | Component | Monthly Cost | Notes |
|------|-----------|--------------|-------|
| 1.1-1.4 | Domain + CloudFlare + SSL | $0.67 | R$ 40/year domain, free SSL, free CDN |
| 2.1 | VPS (Hostinger) | $16.00 | **Fixed. Included in budget.** |
| 2.1-2.5 | Docker services (local storage) | $0 | PostgreSQL, Redis, Nginx all local |
| 3.1-3.7 | Backend optimizations | Variable LLM savings | See below |

### LLM Cost Projection (Before vs After Optimizations)

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Invoice Extraction** | OpenRouter: $0.15/invoice | Gemini Direct: $0.03 | -80% |
| **AI Analysis** | 14 calls × $0.05 | 1 batch call × $0.10 | -85% |
| **Monthly (10k invoices)** | $1,500 + $700 = **$2,200** | $300 + $100 = **$400** | **-82%** 🎯 |

**Result**: Phases 1-3 reduce LLM costs from $26,400/year to $4,800/year = **$21,600 annual savings**.

---

## Rollback Procedures

### Phase 1 Rollback
- Delete all `docs/*_SETUP.md` files
- Revert `nginx.conf`: `git checkout nginx.conf`
- No infrastructure changed yet

### Phase 2 Rollback
- Revert `docker-compose.production.yml`: `git checkout docker-compose.production.yml`
- Delete `.env.production.example`
- Stop any running containers: `docker-compose -f docker-compose.production.yml down`

### Phase 3 Rollback
- Revert all modified files:
  ```bash
  git checkout apps/api/src/database.py \
    apps/api/src/celery_app.py \
    apps/api/src/routers/invoices.py \
    apps/api/src/middleware/rate_limiter.py \
    apps/api/src/main.py \
    apps/api/src/services/cached_prompts.py \
    apps/api/src/services/multi_provider_extractor.py \
    apps/api/src/services/ai_analyzer.py \
    apps/api/src/tasks/ai_analysis.py \
    apps/api/src/config.py
  ```
- Database rollback: Run `alembic downgrade -1` if needed (for future migrations)

---

## Verification Checklist

### Phase 1 Completion
- [ ] `docs/DOMAIN_SETUP.md` exists with all 8 Registro.br + CloudFlare steps
- [ ] `docs/CLOUDFLARE_SETUP.md` includes DNS records (A, CNAME) + 3 page rules + 5 firewall rules
- [ ] `nginx.conf` is valid: run `docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t`
- [ ] `docs/SSL_SETUP.md` documents Certbot installation + renewal cron job
- [ ] All 4 files committed to git: `git status` shows no modified docs

### Phase 2 Completion
- [ ] `docker-compose.production.yml` validates: `docker-compose -f docker-compose.production.yml config > /dev/null`
- [ ] All 6 services defined: postgres, redis, api, celery_worker, web, nginx
- [ ] Resource limits set for each service (memory + CPU constraints)
- [ ] `.env.production.example` has 25+ variables with descriptions
- [ ] `docs/DEPLOYMENT.md` has 12 sequential steps with expected output
- [ ] `scripts/health_check.sh` is executable: `chmod +x scripts/health_check.sh`
- [ ] `docs/DATABASE_MIGRATION.md` includes forward/backward migration procedures
- [ ] All Phase 2 files committed: `git status` shows clean

### Phase 3 Completion
- [ ] `database.py` has `pool_size=20, max_overflow=10, pool_pre_ping=True`
- [ ] `celery_app.py` exists with Redis broker + task config + acks_late=True
- [ ] `invoices.py` uses `process_invoice_photos_task.delay()` instead of `background_tasks.add_task()`
- [ ] `rate_limiter.py` exists with Redis-backed sliding window limiter
- [ ] `cached_prompts.py` caches by `{image_hash}:{prompt_hash}` with 72h TTL
- [ ] `multi_provider_extractor.py` has Gemini Direct first in provider priority
- [ ] `ai_analyzer.py` combines 14 analyses into single LLM call
- [ ] `ai_analysis.py` has `should_run_analysis()` function with 3 conditions
- [ ] `config.py` has `CELERY_ENABLED`, `RATE_LIMIT_ENABLED`, `CACHE_TTL_HOURS`
- [ ] `docs/OPTIMIZATIONS.md` documents all changes + before/after costs
- [ ] Python syntax check: `python -m py_compile apps/api/src/database.py ...` (all modified files)
- [ ] All Phase 3 files committed: `git status` shows clean

---

## Timeline & Effort Estimates

| Phase | Tasks | Effort | Timeline |
|-------|-------|--------|----------|
| **Phase 1** | 4 config + docs | 2-3 hours | Day 1 |
| **Phase 2** | 5 deployment + scripts | 3-4 hours | Day 2 |
| **Phase 3** | 9 backend optimizations | 4-5 hours | Day 3-4 |
| **Total** | 18 deliverables | **9-12 hours** | **4 days** |

---

## Next Steps After Phases 1-3

### Phase 4: Monitoring & Observability (1-2 days)
- Prometheus + Grafana config
- Sentry integration
- Uptime Robot setup guide

### Phase 5: Backups & Automation (1 day)
- `scripts/backup.sh` (daily PostgreSQL backup)
- `scripts/deploy.sh` (automated deploy)
- Cron job configuration

### Phase 6: CI/CD Pipeline (1 day)
- `.github/workflows/deploy.yml` (GitHub Actions)
- Environment secrets setup

### Phase 7: Testing & Performance (2-3 days)
- Load testing (Apache Bench, k6)
- Security checklist (SSL Labs, OWASP)
- Disaster recovery simulation

---

## Important Notes

### Budget Constraint
- **$16.67/month cap is FOR INFRASTRUCTURE ONLY** (VPS + domain + CloudFlare CDN)
- LLM costs are VARIABLE and NOT part of cap
- With optimizations in Phase 3, LLM costs drop 82% (most impactful)

### Implementation Order
- **Do NOT deploy to VPS yet** - this plan is documentation only
- Follow phases in order (dependencies matter)
- Commit changes after each phase
- Test locally with `docker-compose` before VPS deployment

### Cost Savings Achieved by Each Phase
- **Phase 1**: $0 (setup cost, not infra)
- **Phase 2**: $0 (same infrastructure)
- **Phase 3**: **$1,800/month LLM savings** (biggest ROI)
- **Phase 4-7**: $0 (monitoring + backups + testing)

### Risk Mitigation
- All changes are reversible (git + rollback scripts)
- No infrastructure modified until actual VPS deployment
- Health checks verify all services before considering deployment complete
- Rate limiting prevents cost explosion from abuse

---

## File Structure After Completion

```
smarket/
├── nginx.conf                              # NEW: Reverse proxy config
├── docker-compose.production.yml           # NEW: Production deployment config
├── docs/
│   ├── DOMAIN_SETUP.md                    # NEW: Domain registration guide
│   ├── CLOUDFLARE_SETUP.md                # NEW: CDN + DNS configuration
│   ├── SSL_SETUP.md                       # NEW: Let's Encrypt + Certbot
│   ├── DEPLOYMENT.md                      # NEW: Step-by-step deploy guide
│   ├── DATABASE_MIGRATION.md              # NEW: Alembic migration procedures
│   └── OPTIMIZATIONS.md                   # NEW: Cost/performance summary
├── scripts/
│   ├── health_check.sh                    # NEW: Service health verification
│   ├── backup.sh                          # (TODO Phase 5)
│   ├── deploy.sh                          # (TODO Phase 5)
│   └── rollback.sh                        # (TODO Phase 5)
├── .env.production.example                # NEW: Environment template
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── database.py                # MODIFIED: Connection pooling
│   │   │   ├── config.py                  # MODIFIED: New config vars
│   │   │   ├── celery_app.py              # NEW: Celery task queue
│   │   │   ├── main.py                    # MODIFIED: Add rate limiting
│   │   │   ├── routers/invoices.py        # MODIFIED: Use Celery instead of BackgroundTasks
│   │   │   ├── middleware/rate_limiter.py # NEW: Rate limiting middleware
│   │   │   ├── services/
│   │   │   │   ├── cached_prompts.py      # MODIFIED: 72h TTL caching
│   │   │   │   ├── multi_provider_extractor.py # MODIFIED: Gemini Direct priority
│   │   │   │   └── ai_analyzer.py         # MODIFIED: Batch analysis
│   │   │   └── tasks/ai_analysis.py       # MODIFIED: Conditional analysis
│   │   └── Dockerfile                     # (no changes, but includes Celery worker)
│   └── web/
│       └── next.config.js                 # (no changes, CDN headers via nginx)
└── infrastructure-setup.md                # THIS FILE: Implementation plan
```

---

## Questions Before Starting?

Before you begin Phase 1, confirm:

1. **Hostinger VPS Details**: Can you provide the IP address and SSH access details? (Not needed for documentation, but good to have ready)
2. **Domain Status**: Is the `.br` domain already registered, or does that need to be done first?
3. **LangChain Version**: Should Phase 3 assume Pydantic v2 (current) or v1?
4. **Celery Worker Deployment**: Should celery worker run as separate container or within API container?
5. **Git Workflow**: Do you want separate branches for Phases 1/2/3, or all commits to one branch?

Once confirmed, I'll begin with **Phase 1 (Infrastructure Configuration)**.
