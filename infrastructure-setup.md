# Infrastructure Setup Plan: Mercado Esperto VPS (Revised)

## Goal
Production-ready infrastructure for Mercado Esperto on Hostinger VPS (2 vCPU, 8GB RAM, 100GB disk, São Paulo).
Target: 100-150 concurrent users (~800-1500 registered active users). Budget: $16.67/month (infra only, LLM costs separate).

## Current State (baseline)

| Component | Status | Gap |
|-----------|--------|-----|
| **Reverse Proxy** | Traefik via Dokploy (SSL auto) | No rate limiting configured |
| **DB Pooling** | NullPool (debug) / default (prod) | No explicit pool_size, overflow, timeout |
| **Caching** | Redis 1h TTL for LLM extractions | TTL too short, no metrics |
| **Background Tasks** | FastAPI BackgroundTasks | Works for current scale, no persistence |
| **Health Check** | `GET /health` → `{"status": "ok"}` | No DB/Redis/provider verification |
| **Backups** | None | **Critical gap** |
| **Rate Limiting** | None | Vulnerable to abuse |
| **LLM Resilience** | Basic fallback chain | No circuit breakers, no timeouts |
| **Logging** | Text-based, stdout | No structured JSON logging |
| **Monitoring** | None | No metrics, no alerts |

---

## Phase 1: Production Docker & Deploy (3-4 hours)

**Output**: Production docker-compose + deploy guide + health checks

### Task 1.1: Production Docker Compose
- Create `docker-compose.production.yml` with resource limits for all services
- Services: postgres, redis, api, web (same 4 services, no Nginx — Traefik handles routing)
- Resource limits based on 2 vCPU / 8GB RAM VPS:

| Service | Memory Limit | CPU Limit | Notes |
|---------|-------------|-----------|-------|
| postgres | 2 GB | shared | Shared buffers = 512MB |
| redis | 256 MB | shared | maxmemory 256MB (allkeys-lru) |
| api | 2.5 GB | shared | 2 uvicorn workers |
| web | 1 GB | shared | Next.js SSR |
| OS + Traefik | ~1 GB | shared | Reserved for system |
| **Headroom** | **~1.2 GB** | | Buffer for spikes |

> **Note**: With 2 vCPU, CPU limits per container are not set (all services share
> the 2 cores). Docker `cpus` constraints only make sense with 4+ cores.
> Memory limits ARE set to prevent OOM kills.

- Verify: `docker-compose -f docker-compose.production.yml config` parses without errors
- Rollback: `git checkout docker-compose.production.yml`

### Task 1.2: Environment Configuration Template
- Create `.env.production.example` with all required variables (masked)
- Document all 30+ variables with descriptions and default values
- Include Traefik domain variables (`API_DOMAIN`, `WEB_DOMAIN`)
- Verify: All variables from current `docker-compose.yml` + `config.py` documented
- Rollback: `rm .env.production.example`

### Task 1.3: Deployment Procedure Guide
- Create `docs/DEPLOYMENT.md` with step-by-step:
  1. VPS initial setup (SSH, firewall, Docker install)
  2. Dokploy/Traefik setup (already in use)
  3. Clone repo + configure `.env`
  4. Build + start services
  5. Run migrations (`alembic upgrade head`)
  6. Verify health
  7. DNS configuration (point domain to VPS IP)
- Include Traefik-specific config (labels are already in docker-compose.yml)
- Verify: All steps have expected output examples
- Rollback: Delete file

### Task 1.4: Health Check Script
- Create `scripts/health_check.sh`:
  - `curl /health` (API alive)
  - `pg_isready` (DB connection)
  - `redis-cli ping` (Cache connection)
  - Check LLM provider connectivity (non-blocking)
  - Report memory/disk usage
- Verify: Script is executable, all checks return pass/fail
- Rollback: `rm scripts/health_check.sh`

### Task 1.5: Database Backup Script
- Create `scripts/backup.sh`:
  - `pg_dump` compressed backup to `/backups/` directory
  - Retention: keep last 7 daily + 4 weekly
  - Log backup size and duration
  - Optional: upload to S3-compatible storage (Backblaze B2 = $0.005/GB)
- Create `docs/BACKUP_RESTORE.md` with restore procedures
- Add cron job documentation: `0 3 * * * /path/to/backup.sh`
- Verify: Script creates valid backup, restore procedure tested
- Rollback: Delete files

---

## Phase 2: Backend Optimizations (4-5 hours)

**Output**: Connection pooling + cache improvements + rate limiting + health check upgrade

### Task 2.1: Connection Pooling Configuration
Modify `apps/api/src/database.py`:

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    future=True,
    poolclass=NullPool if settings.DEBUG else None,
    # Production pool settings (ignored when NullPool)
    pool_size=settings.DB_POOL_SIZE,          # 10
    max_overflow=settings.DB_MAX_OVERFLOW,     # 5
    pool_pre_ping=True,                        # detect stale connections
    pool_recycle=settings.DB_POOL_RECYCLE,     # 1800s (30min)
    pool_timeout=settings.DB_POOL_TIMEOUT,     # 30s
)
```

- Sized for 2 workers: pool_size(10) × workers(2) = 20 max connections + 5 overflow = 25 total
- Verify: `pool_size=10, max_overflow=5, pool_pre_ping=True` visible in code
- Rollback: `git checkout apps/api/src/database.py`

### Task 2.2: Expand LLM Cache TTL
Modify `apps/api/src/services/cached_prompts.py`:

```python
# Before:  self.ttl = 3600  (1 hour)
# After:   self.ttl = settings.LLM_CACHE_TTL  (configurable, default 24h)
```

- Same image + same provider = same extraction result (deterministic)
- 24h default is conservative; can increase to 72h after validation
- Add cache hit/miss logging for monitoring
- Verify: TTL reads from config, cache metrics logged
- Rollback: `git checkout apps/api/src/services/cached_prompts.py`

### Task 2.3: Rate Limiting with slowapi
Install `slowapi` and add rate limiting to key endpoints:

```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
app.state.limiter = limiter
```

Limits:
| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `POST /auth/register` | 5/hour | Prevent spam accounts |
| `POST /auth/login` | 10/minute | Prevent brute force |
| `POST /invoices/upload/*` | 30/hour | Prevent LLM cost abuse |
| `POST /invoices/*/confirm` | 60/hour | Prevent AI analysis abuse |
| Global default | 100/minute | General protection |

- Feature flag: `RATE_LIMIT_ENABLED` (default: true in prod)
- Verify: Hitting limit returns 429 with `Retry-After` header
- Rollback: Remove slowapi from requirements + revert main.py

### Task 2.4: Enhanced Health Check Endpoint
Upgrade `GET /health` in `main.py`:

```python
@app.get("/health")
async def health_check():
    checks = {"api": "ok", "version": "1.0.0"}

    # DB check
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    # Redis check
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, **checks}
```

- Verify: `/health` returns DB and Redis status
- Rollback: `git checkout apps/api/src/main.py`

### Task 2.5: LLM Circuit Breakers
Add retry + circuit breaker logic to `multi_provider_extractor.py`:

```python
# Use tenacity for retry with exponential backoff
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
)
async def _call_provider(self, provider, images, ...):
    ...
```

- Add per-provider timeout: `LLM_TIMEOUT_SECONDS` (default: 60s)
- Log provider failures with structured data (provider, error, duration)
- Don't change the provider fallback order (current smart routing is correct)
- Verify: Timeout kills hanging LLM calls, retries work
- Rollback: `git checkout apps/api/src/services/multi_provider_extractor.py`

### Task 2.6: Configuration for All Optimizations
Add to `apps/api/src/config.py`:

```python
# Database Pool
DB_POOL_SIZE: int = 10         # connections per worker (2 workers × 10 = 20 base)
DB_MAX_OVERFLOW: int = 5       # extra connections under load (total max: 25 per worker)
DB_POOL_RECYCLE: int = 1800    # 30 minutes
DB_POOL_TIMEOUT: int = 30      # seconds

# LLM Cache
LLM_CACHE_TTL: int = 86400    # 24 hours (seconds)

# Rate Limiting
RATE_LIMIT_ENABLED: bool = True

# LLM Resilience
LLM_TIMEOUT_SECONDS: int = 60
```

Add to `docker-compose.yml` environment section:
```yaml
DB_POOL_SIZE: ${DB_POOL_SIZE:-10}
DB_MAX_OVERFLOW: ${DB_MAX_OVERFLOW:-5}
LLM_CACHE_TTL: ${LLM_CACHE_TTL:-86400}
RATE_LIMIT_ENABLED: ${RATE_LIMIT_ENABLED:-true}
LLM_TIMEOUT_SECONDS: ${LLM_TIMEOUT_SECONDS:-60}
```

- Verify: All settings have defaults, documented in `.env.production.example`
- Rollback: `git checkout apps/api/src/config.py`

---

## Phase 3: Observability & Hardening (3-4 hours)

**Output**: Structured logging + Traefik rate limiting + graceful shutdown + monitoring docs

### Task 3.1: Structured JSON Logging
Modify `apps/api/src/main.py` logging configuration:

```python
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)
```

- All logs become JSON for easy parsing (grep, jq, future log aggregation)
- Keep existing `logger.info(...)` calls — structlog wraps stdlib
- Verify: Logs output JSON format in Docker
- Rollback: `git checkout apps/api/src/main.py`

### Task 3.2: Traefik Rate Limiting Labels
Add rate limiting via Traefik labels in `docker-compose.production.yml`:

```yaml
labels:
  # Existing Traefik labels...
  - "traefik.http.middlewares.smarket-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.smarket-ratelimit.ratelimit.burst=50"
  - "traefik.http.middlewares.smarket-ratelimit.ratelimit.period=1m"
  - "traefik.http.routers.smarket-api.middlewares=smarket-ratelimit"
```

- This provides network-level rate limiting WITHOUT application code changes
- Complements slowapi (Task 2.3) which provides per-endpoint granularity
- Verify: Traefik config validates, 429 returned on burst
- Rollback: Remove labels

### Task 3.3: Graceful Shutdown
Modify `apps/api/Dockerfile` CMD:

```dockerfile
# Add SIGTERM handling + drain timeout
CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app \
  --host 0.0.0.0 --port 8000 \
  --workers ${UVICORN_WORKERS:-2} \
  --proxy-headers --forwarded-allow-ips='*' \
  --timeout-graceful-shutdown 30"]
```

Add FastAPI shutdown event in `main.py`:

```python
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down gracefully...")
    # Close DB pool
    await engine.dispose()
    # Close Redis connections
    if prompt_cache.redis_client:
        await prompt_cache.redis_client.close()
```

- Verify: `docker stop` allows in-flight requests to complete (up to 30s)
- Rollback: `git checkout apps/api/Dockerfile apps/api/src/main.py`

### Task 3.4: PostgreSQL Production Tuning
Add PostgreSQL config in `docker-compose.production.yml`:

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=512MB
    -c effective_cache_size=1536MB
    -c work_mem=8MB
    -c maintenance_work_mem=128MB
    -c max_connections=50
    -c wal_buffers=8MB
    -c checkpoint_completion_target=0.9
    -c random_page_cost=1.1
    -c log_min_duration_statement=1000
```

- Tuned for 8GB VPS with 2GB allocated to PostgreSQL
- `shared_buffers=512MB` (~25% of PG memory allocation)
- `max_connections=50` (pool_size(10) × workers(2) + background tasks + overhead)
- `log_min_duration_statement=1000` logs slow queries (>1s)
- Verify: `SHOW shared_buffers` returns 512MB after restart
- Rollback: Remove `command` from docker-compose

### Task 3.5: Uvicorn Workers Configuration
Keep worker count at 2 (matches vCPU count):

```yaml
# docker-compose.production.yml
environment:
  UVICORN_WORKERS: 2  # 2 vCPU → 2 workers (IO-bound, async handles concurrency)
```

- 2 workers × ~500MB each = ~1GB RAM for uvicorn processes
- Remaining ~1.5GB API allocation for background tasks + spikes
- Async IO means 2 workers handle many concurrent connections efficiently
- Verify: `ps aux | grep uvicorn` shows 2 worker processes + 1 master
- Rollback: N/A (already the current value)

### Task 3.6: Monitoring Setup Guide
Create `docs/MONITORING.md`:
- **Uptime Robot** (free tier): Monitor `/health` endpoint every 5 min
- **Docker stats**: `docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"` via cron
- **Disk usage alert**: Script to warn at 80% disk usage
- **LLM cost monitoring**: Token callback logs + grep script for daily spend estimate
- **PostgreSQL**: Slow query log analysis (`log_min_duration_statement=1000`)
- Future: Prometheus + Grafana (Phase 4, when needed)

### Task 3.7: Security Hardening Checklist
Create `docs/SECURITY.md`:
- SSH: Disable password auth, use key-based only
- Firewall: Only ports 80, 443, 22 open (ufw)
- Docker: Non-root user (already done in Dockerfile)
- Secrets: Document `.env` file permissions (`chmod 600`)
- CORS: Verify allowed origins match production domains only
- JWT: Verify `SECRET_KEY` is strong (32+ random chars)
- Traefik: Enable security headers (HSTS, X-Frame-Options, etc.)

---

## Dependency Graph

```
Phase 1 (Deploy Foundation):
  1.1 (docker-compose.prod) [independent]
  1.2 (.env.example) ← depends on 1.1 (knows which vars exist)
  1.3 (Deploy guide) ← depends on 1.1, 1.2
  1.4 (Health script) [independent]
  1.5 (Backup script) [independent]

Phase 2 (Backend Optimization):
  2.1 (DB pooling) [independent]
  2.2 (Cache TTL) [independent]
  2.3 (Rate limiting) [independent]
  2.4 (Health endpoint) [independent]
  2.5 (Circuit breakers) [independent]
  2.6 (Config) ← depends on 2.1-2.5 (collects all new vars)

Phase 3 (Observability):
  3.1 (Logging) [independent]
  3.2 (Traefik rate limit) ← depends on 1.1 (prod compose)
  3.3 (Graceful shutdown) [independent]
  3.4 (PG tuning) ← depends on 1.1 (prod compose)
  3.5 (Workers) ← depends on 1.1 (prod compose)
  3.6 (Monitoring docs) ← depends on 2.4 (health endpoint)
  3.7 (Security docs) [independent]
```

**Critical Path**: 1.1 → 1.2 → 1.3 → Phase 2 → Phase 3

---

## Budget Impact

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| VPS (Hostinger) | $16.00 | 2 vCPU, 8GB RAM, 100GB disk, São Paulo |
| Domain (.com.br) | ~$0.67 | R$ 40/year at Registro.br |
| Traefik + SSL | $0 | Free, auto-renewal via Let's Encrypt |
| CloudFlare CDN | $0 | Free tier (DNS + basic CDN) |
| Uptime Robot | $0 | Free tier (50 monitors) |
| Backup storage | $0-$1 | Local + optional Backblaze B2 |
| **Total infra** | **~$16.67/month** | Within budget |

### Capacity Estimation (2 vCPU / 8GB RAM)

**Bottleneck**: CPU (2 cores). Memory is sufficient for all services.

| Operação | Tempo Resposta | CPU Impact | % do Tráfego |
|----------|---------------|------------|-------------|
| GET endpoints (listas, dashboard) | 50-200ms | Baixo (IO-bound) | ~80% |
| POST upload foto | ~100ms (retorno) | **Alto** (background 20-40s) | ~5% |
| POST confirm invoice | ~100ms (retorno) | Médio (background 5-10s) | ~5% |
| Auth (login/register) | 100-300ms | Médio (bcrypt) | ~10% |

| Cenário | Usuários Simultâneos | Req/segundo |
|---------|---------------------|-------------|
| **Navegação normal** (dashboard, listas) | **150-200** | ~15-20 req/s |
| **Carga mista** (navegação + uploads) | **80-120** | ~10-15 req/s |
| **Pico de uploads** (muitos enviando fotos) | **30-50** | ~5-8 req/s |

**Conversão para usuários registrados:**
- Concorrência típica: 5-10% dos ativos estão online simultaneamente
- 100 concurrent ÷ 7% = **~1.400 usuários registrados** confortavelmente
- Cenário conservador: **~800-1.000 usuários ativos**

**Quando escalar:**
- Monitorar CPU > 80% sustentado por 5+ minutos
- Próximo degrau: 4 vCPU / 16GB RAM (~$30-35/mês)
- Com 4 vCPU: 4 uvicorn workers, pool_size=20, ~300-400 concurrent users

### Disk Usage Estimate (100GB)

| Component | Size Estimate | Growth Rate |
|-----------|--------------|-------------|
| PostgreSQL data | 1-5 GB | ~500MB/10k invoices |
| Redis data | < 256 MB | Capped by maxmemory |
| Docker images | ~2-3 GB | Per rebuild |
| Uploads (photos) | 10-50 GB | ~5MB/invoice (optimized) |
| Backups (7 daily + 4 weekly) | 5-15 GB | Proportional to DB |
| OS + logs | ~5 GB | Rotation needed |
| **Total estimated** | **~25-80 GB** | **100GB sufficient for 1-2 years** |

> **Alert at 80GB** (80% threshold). At current growth, disk is not a concern
> until ~20k+ invoices with photos. Configure log rotation to prevent log bloat.

---

### LLM Cost Reality (current architecture)

| Operation | Cost per Unit | Monthly (1k invoices) | Monthly (10k invoices) |
|-----------|--------------|----------------------|----------------------|
| Invoice extraction (OpenRouter Gemini Flash) | ~$0.01-0.02 | $10-20 | $100-200 |
| AI analysis (4-8 calls × gpt-4o-mini) | ~$0.005-0.01 | $5-10 | $50-100 |
| **Total LLM** | | **$15-30** | **$150-300** |

**Optimization impact (Phase 2)**:
- Cache TTL 1h → 24h: Eliminates re-extractions of same photos → **~20% reduction**
- Circuit breakers: Prevents wasted tokens on failing requests → **~5% reduction**
- Total estimated LLM savings: **~25% reduction** from cache + resilience improvements

> Note: The original plan claimed $2,200/month → $400/month savings. The actual current LLM cost
> for 10k invoices is ~$150-300/month. The smart provider routing already uses the cheapest
> models (Gemini Flash Lite → Flash → Flash Standard). Further cost reduction would require
> reducing the number of AI analysis types, which is a product decision, not an infrastructure one.

---

## Rollback Procedures

### Phase 1 Rollback
```bash
# Delete all new files (no infrastructure changed)
rm docker-compose.production.yml .env.production.example
rm -rf docs/ scripts/
```

### Phase 2 Rollback
```bash
git checkout \
  apps/api/src/database.py \
  apps/api/src/config.py \
  apps/api/src/main.py \
  apps/api/src/services/cached_prompts.py \
  apps/api/src/services/multi_provider_extractor.py
pip uninstall slowapi tenacity  # if added
```

### Phase 3 Rollback
```bash
git checkout \
  apps/api/src/main.py \
  apps/api/Dockerfile \
  docker-compose.production.yml
pip uninstall structlog  # if added
```

---

## Verification Checklist

### Phase 1 ✓
- [ ] `docker-compose -f docker-compose.production.yml config` validates
- [ ] Resource limits set for all 4 services (memory + CPU)
- [ ] `.env.production.example` has 30+ variables with descriptions
- [ ] `docs/DEPLOYMENT.md` has sequential steps with expected output
- [ ] `scripts/health_check.sh` is executable and checks DB + Redis
- [ ] `scripts/backup.sh` creates valid `pg_dump` backup
- [ ] `docs/BACKUP_RESTORE.md` includes restore procedure

### Phase 2 ✓
- [ ] `database.py`: `pool_size=10, max_overflow=5, pool_pre_ping=True`
- [ ] `cached_prompts.py`: TTL reads from `settings.LLM_CACHE_TTL`, cache hit/miss logging
- [ ] `main.py`: slowapi limiter active, `/health` returns DB + Redis status
- [ ] `multi_provider_extractor.py`: tenacity retry decorator, timeout on LLM calls
- [ ] `config.py`: All 7 new settings with defaults documented
- [ ] `docker-compose.yml`: New env vars forwarded to container
- [ ] Python syntax check passes on all modified files

### Phase 3 ✓
- [ ] Logs output JSON format (structlog)
- [ ] Traefik rate limiting labels in production compose
- [ ] `docker stop` allows 30s graceful drain
- [ ] PostgreSQL tuned: `shared_buffers=512MB`, `max_connections=50`, slow query logging
- [ ] Uvicorn workers = 2 in production (matches 2 vCPU)
- [ ] `docs/MONITORING.md` covers uptime, disk, LLM costs
- [ ] `docs/SECURITY.md` covers SSH, firewall, secrets, CORS

---

## What Was Removed From Original Plan (and why)

| Original Task | Reason Removed |
|---------------|----------------|
| **Nginx reverse proxy** | Traefik already in use via Dokploy. Adding Nginx would conflict. |
| **Celery task queue** | Adds container + complexity. BackgroundTasks works for current volume. Revisit at 10k+ invoices/month. |
| **Gemini Direct prioritization** | Current smart routing (Lite → Standard → Classic) is already optimal. Gemini Direct free tier has aggressive rate limits. |
| **Batch AI analysis (14→1 call)** | Loses per-analysis feature flags. Giant prompt costs more tokens. Single failure kills all analyses. |
| **Conditional analysis (skip <R$50)** | Product decision, not infrastructure. Small purchases can be significant (daily coffee = R$300/month). |
| **CloudFlare/Domain setup docs** | Generic docs don't add value; official docs are better. Deploy guide (1.3) covers DNS pointing. |
| **SSL/Certbot setup** | Traefik handles SSL automatically via Let's Encrypt. No manual Certbot needed. |

## What Was Added (gaps in original plan)

| New Task | Why |
|----------|-----|
| **Database backup script** | Critical gap — no backup = potential data loss |
| **Enhanced health check** | Current `/health` doesn't verify DB or Redis |
| **Circuit breakers (tenacity)** | LLM provider failures need timeout + retry logic |
| **Graceful shutdown** | In-flight requests lost on container restart |
| **PostgreSQL tuning** | Default PG config wastes VPS resources (8GB RAM) |
| **Structured logging** | Text logs unusable at scale; JSON enables filtering |
| **Security hardening docs** | No SSH/firewall documentation existed |

---

## Timeline

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1** | 5 tasks (deploy + backup) | 3-4 hours |
| **Phase 2** | 6 tasks (backend optimizations) | 4-5 hours |
| **Phase 3** | 7 tasks (observability + hardening) | 3-4 hours |
| **Total** | **18 deliverables** | **10-13 hours** |

---

## Future Phases (not in scope)

| Phase | Content | When |
|-------|---------|------|
| **Phase 4: VPS upgrade** | 4 vCPU / 16GB RAM, 4 workers, pool_size=20 | When CPU > 80% sustained |
| **Phase 5: Monitoring stack** | Prometheus + Grafana + alerting | When >500 active users |
| **Phase 6: CI/CD** | GitHub Actions → auto-deploy on push to main | After Phase 3 stable |
| **Phase 7: Celery migration** | Persistent task queue + Flower dashboard | When >10k invoices/month |
| **Phase 8: Load testing** | k6 scripts + performance benchmarks | Before marketing launch |

---

## File Structure After Completion

```
smarket/
├── docker-compose.yml                     # EXISTING: Dev/staging (unchanged)
├── docker-compose.production.yml          # NEW: Production with resource limits
├── .env.production.example                # NEW: Production env template
├── docs/
│   ├── DEPLOYMENT.md                      # NEW: VPS deploy guide
│   ├── BACKUP_RESTORE.md                  # NEW: Backup + restore procedures
│   ├── MONITORING.md                      # NEW: Monitoring setup
│   └── SECURITY.md                        # NEW: Security hardening
├── scripts/
│   ├── health_check.sh                    # NEW: Service health verification
│   └── backup.sh                          # NEW: PostgreSQL backup
├── apps/
│   ├── api/
│   │   ├── Dockerfile                     # MODIFIED: Graceful shutdown
│   │   ├── requirements.txt               # MODIFIED: +slowapi, +tenacity, +structlog
│   │   └── src/
│   │       ├── database.py                # MODIFIED: Connection pooling
│   │       ├── config.py                  # MODIFIED: 7 new config vars
│   │       ├── main.py                    # MODIFIED: Rate limiting, health check, logging, shutdown
│   │       └── services/
│   │           ├── cached_prompts.py      # MODIFIED: Configurable TTL, metrics logging
│   │           └── multi_provider_extractor.py  # MODIFIED: Circuit breakers, timeouts
│   └── web/                               # UNCHANGED
└── infrastructure-setup.md                # THIS FILE
```

**Total new files: 7** | **Modified files: 6** | **Deleted files: 0**
