# Production Monitoring Guide

> **Mercado Esperto VPS Monitoring** — Health checks, logs, metrics, and alerting

This guide covers monitoring strategies for the production deployment on Hostinger VPS (2 vCPU / 8GB RAM / 100GB disk).

---

## Table of Contents

1. [Health Checks](#health-checks)
2. [Log Monitoring](#log-monitoring)
3. [Resource Monitoring](#resource-monitoring)
4. [Database Monitoring](#database-monitoring)
5. [LLM Cost Tracking](#llm-cost-tracking)
6. [Alert Thresholds](#alert-thresholds)
7. [Troubleshooting](#troubleshooting)

---

## Health Checks

### 1. API Health Endpoint

**Endpoint:** `https://api.your-domain.com/health`

**Expected Response:**
```json
{
  "status": "ok",
  "api": "ok",
  "version": "1.0.0",
  "database": "ok",
  "redis": "ok"
}
```

**Check Command:**
```bash
curl -s https://api.your-domain.com/health | jq
```

**Status Codes:**
- `200 OK` — All systems operational
- `503 Service Unavailable` — Database or Redis unhealthy (status: "degraded")

### 2. Comprehensive Health Check Script

Run the full health check script (covers all services + resources):

```bash
# From VPS
cd /root/smarket
bash scripts/health_check.sh
```

**What it checks:**
- ✓ API responding (HTTP 200)
- ✓ PostgreSQL ready (`pg_isready`)
- ✓ Redis ping
- ✓ LLM provider API keys configured
- ✓ Disk usage < 80%
- ✓ Memory usage < 85%
- ✓ Docker services running

**Scheduling:** Add to cron for automatic checks:
```bash
# Check every 5 minutes, log to file
*/5 * * * * /root/smarket/scripts/health_check.sh >> /var/log/smarket-health.log 2>&1
```

### 3. Docker Health Status

Check all containers:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```
NAMES                STATUS
smarket-api-1        Up 2 hours (healthy)
smarket-web-1        Up 2 hours
smarket-postgres-1   Up 2 hours (healthy)
smarket-redis-1      Up 2 hours (healthy)
```

Check specific service health:
```bash
docker inspect --format='{{.State.Health.Status}}' smarket-api-1
# Output: healthy
```

---

## Log Monitoring

### 1. Structured JSON Logs (Production)

In production, API logs are in **JSON format** for easy parsing:

```bash
# View API logs
docker logs smarket-api-1 --tail 100 -f

# Filter by log level
docker logs smarket-api-1 -f | jq 'select(.level=="ERROR")'

# Filter LLM cache hits/misses
docker logs smarket-api-1 -f | grep "LLM cache"
```

**Example JSON log entry:**
```json
{
  "event": "LLM cache HIT: invoice:extract:openrouter:abc123",
  "level": "info",
  "logger": "src.services.cached_prompts",
  "timestamp": "2026-02-14T12:34:56.789Z"
}
```

### 2. Key Log Patterns

| Pattern | What to Monitor | Alert If |
|---------|----------------|----------|
| `"level":"ERROR"` | Application errors | > 5 errors/minute |
| `LLM cache HIT` | Cache effectiveness | Hit rate < 30% |
| `💰 OpenRouter` | Token usage | Sudden spike (>2x avg) |
| `Database health check failed` | DB connectivity | Any occurrence |
| `Redis not available` | Cache connectivity | Any occurrence |
| `Unhandled exception` | Unexpected errors | Any occurrence |

### 3. Web Frontend Logs

```bash
docker logs smarket-web-1 --tail 100 -f
```

Look for:
- Build errors
- API connection failures
- JavaScript runtime errors

### 4. Log Rotation

Prevent disk fill-up with Docker log rotation (already configured in `docker-compose.production.yml`):

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Manual cleanup (if needed):**
```bash
# Prune old logs
docker system prune -f

# Check Docker disk usage
docker system df
```

---

## Resource Monitoring

### 1. Real-time System Resources

**CPU and Memory:**
```bash
# All containers
docker stats

# Specific service
docker stats smarket-api-1 --no-stream
```

**Expected usage (2 vCPU / 8GB RAM):**
| Service | Memory Limit | Expected Usage | CPU Usage |
|---------|--------------|----------------|-----------|
| postgres | 2GB | 1-1.5GB | 10-30% |
| redis | 256MB | 50-150MB | 1-5% |
| api | 2.5GB | 1-2GB | 20-60% |
| web | 1GB | 300-600MB | 5-15% |

**Alert if:**
- Memory usage > 85% of limit for > 5 minutes
- CPU sustained > 80% for > 10 minutes

### 2. Disk Usage

```bash
# Overall disk usage
df -h

# Docker volumes
docker system df -v
```

**Expected disk usage:**
- PostgreSQL data: ~500MB-2GB (1000 invoices)
- Redis cache: ~50-100MB
- API uploads: ~1-5GB (invoice photos)
- Docker images: ~2-3GB

**Alert thresholds:**
- **Warning:** Disk > 70% (70GB / 100GB)
- **Critical:** Disk > 85% (85GB / 100GB)

**Cleanup strategy:**
```bash
# Prune unused images/volumes
docker system prune -a --volumes -f

# Check old invoice photos (if needed)
find /var/lib/docker/volumes/smarket_api_uploads -type f -mtime +90
```

### 3. Network Monitoring

Check API response times:
```bash
# Average response time (100 requests)
for i in {1..100}; do
  curl -s -w "%{time_total}\n" -o /dev/null https://api.your-domain.com/health
done | awk '{ total += $1; count++ } END { print total/count }'
```

**Expected:** < 200ms for `/health` endpoint

---

## Database Monitoring

### 1. Connection Pool Status

Check active connections:
```bash
docker exec smarket-postgres-1 psql -U mercadoesperto -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
```

**Expected:** 2-10 active connections (pool_size=10, workers=2)

**Alert if:** > 40 connections (approaching max_connections=50)

### 2. Database Size

```bash
docker exec smarket-postgres-1 psql -U mercadoesperto -c \
  "SELECT pg_size_pretty(pg_database_size('mercadoesperto'));"
```

**Expected growth:** ~500MB per 1000 invoices with items

### 3. Slow Query Detection

Enable slow query logging (add to PostgreSQL command in `docker-compose.production.yml`):
```yaml
command: >
  postgres
  ... (existing params)
  -c log_min_duration_statement=1000
```

Then check logs:
```bash
docker logs smarket-postgres-1 | grep "duration:"
```

**Alert if:** Queries > 2 seconds regularly

### 4. Table Statistics

```bash
docker exec smarket-postgres-1 psql -U mercadoesperto -c \
  "SELECT schemaname,relname,n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

Monitor row counts for capacity planning.

---

## LLM Cost Tracking

### 1. Token Usage Logs

Filter token usage from logs:
```bash
docker logs smarket-api-1 -f | grep "💰"
```

**Example output:**
```
💰 OpenRouter [google/gemini-2.0-flash-001]: Input=8,234 tokens, Output=1,456 tokens, Total=9,690 tokens
```

### 2. Daily Cost Estimation

**Current pricing (OpenRouter — Gemini 2.0 Flash):**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Calculate daily cost:**
```bash
# Extract token counts from logs (last 24h)
docker logs smarket-api-1 --since 24h | grep "💰" | \
  awk '{print $6, $9}' | sed 's/,//g' | \
  awk '{ input+=$1; output+=$2 } END {
    cost_input = input / 1000000 * 0.075;
    cost_output = output / 1000000 * 0.30;
    printf "Input: %.2fM tokens ($%.2f)\nOutput: %.2fM tokens ($%.2f)\nTotal: $%.2f\n",
    input/1000000, cost_input, output/1000000, cost_output, cost_input + cost_output
  }'
```

### 3. Cache Effectiveness

Monitor cache hit rate:
```bash
# Count cache hits vs misses
docker logs smarket-api-1 --since 24h | grep "LLM cache" | \
  awk '/HIT/{hit++} /MISS/{miss++} END {
    total=hit+miss;
    hit_rate=hit/total*100;
    printf "Hits: %d | Misses: %d | Hit Rate: %.1f%%\n", hit, miss, hit_rate
  }'
```

**Expected hit rate:** 40-60% (users re-uploading same invoices)

**Alert if:** < 20% (cache not working or TTL too short)

### 4. Monthly Budget Alerts

Set up budget monitoring:
- **Target:** < R$ 300/month (~$60 USD)
- **Warning:** > R$ 250/month
- **Critical:** > R$ 400/month

**Cost breakdown (10k invoices/month):**
- Invoice extraction: R$ 200-250
- AI analysis: R$ 50-75
- Cache savings: -R$ 50-75 (25-30% reduction)

---

## Alert Thresholds

### Critical Alerts (Immediate Action)

| Metric | Threshold | Action |
|--------|-----------|--------|
| API health check failed | 2 consecutive failures | Restart API container |
| Database unavailable | Any occurrence | Check PostgreSQL logs, restart if needed |
| Disk usage > 90% | Any occurrence | Prune Docker volumes, delete old backups |
| Memory usage > 95% | Sustained 5+ min | Restart affected container |
| LLM cost spike | >3x daily average | Check for abuse, throttle if needed |

### Warning Alerts (Monitor Closely)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Disk usage > 70% | Any occurrence | Plan cleanup or disk expansion |
| Memory usage > 80% | Sustained 10+ min | Monitor for memory leaks |
| Database connections > 40 | Any occurrence | Check for connection pool issues |
| Cache hit rate < 30% | Daily average | Review cache TTL settings |
| Response time > 500ms | p95 | Investigate slow queries/endpoints |

---

## Troubleshooting

### Issue: High Memory Usage (API)

**Symptoms:**
- `docker stats` shows API > 2GB
- OOMKilled in `docker ps -a`

**Diagnosis:**
```bash
# Check logs for memory errors
docker logs smarket-api-1 | grep -i "memory\|oom"

# Check worker count
docker exec smarket-api-1 ps aux | grep uvicorn
```

**Solutions:**
1. Reduce workers: `UVICORN_WORKERS=1` in `.env`
2. Reduce DB pool: `DB_POOL_SIZE=5` in `.env`
3. Enable swap on VPS (Hostinger allows up to 2GB)

### Issue: Slow Invoice Processing

**Symptoms:**
- Photo uploads take > 60 seconds
- Timeout errors in logs

**Diagnosis:**
```bash
# Check LLM latency
docker logs smarket-api-1 -f | grep "💰"

# Check image optimization
docker logs smarket-api-1 -f | grep "Image optimized"
```

**Solutions:**
1. Verify image optimization is enabled: `IMAGE_OPTIMIZATION_ENABLED=true`
2. Check LLM provider status (OpenRouter dashboard)
3. Increase timeout: `LLM_TIMEOUT_SECONDS=90`

### Issue: Database Connection Errors

**Symptoms:**
- `FATAL: sorry, too many clients already`
- API returns 500 errors

**Diagnosis:**
```bash
# Check active connections
docker exec smarket-postgres-1 psql -U mercadoesperto -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
1. Increase max_connections: Add `-c max_connections=100` to PostgreSQL command
2. Reduce pool size: `DB_POOL_SIZE=5`
3. Check for connection leaks in code

### Issue: Redis Cache Not Working

**Symptoms:**
- All LLM requests show "cache MISS"
- High LLM costs despite repeat uploads

**Diagnosis:**
```bash
# Check Redis connectivity
docker exec smarket-redis-1 redis-cli ping
# Expected: PONG

# Check cache keys
docker exec smarket-redis-1 redis-cli KEYS "invoice:extract:*"
```

**Solutions:**
1. Verify `REDIS_URL=redis://redis:6379/0` in `.env`
2. Restart Redis: `docker-compose restart redis`
3. Check cache TTL: `LLM_CACHE_TTL=86400` (24h)

### Issue: Disk Full

**Symptoms:**
- Cannot upload invoices
- Database write errors

**Diagnosis:**
```bash
df -h
docker system df
```

**Solutions:**
```bash
# 1. Prune Docker system
docker system prune -a --volumes -f

# 2. Remove old backups
find /root/backups -name "*.sql.gz" -mtime +30 -delete

# 3. Clear old logs
truncate -s 0 /var/log/syslog
journalctl --vacuum-time=7d
```

---

## Next Steps

After monitoring is set up:

1. **Set up automated alerts** — Use Hostinger's built-in monitoring or external services (UptimeRobot, Better Uptime)
2. **Create dashboards** — Grafana + Prometheus for advanced visualization (optional)
3. **Document incident response** — Create runbooks for common issues
4. **Review weekly** — Check metrics every Monday, adjust thresholds as needed

---

**Related Guides:**
- [Deployment Guide](DEPLOYMENT.md) — Initial setup
- [Backup & Restore](BACKUP_RESTORE.md) — Data protection
- [Security Hardening](SECURITY.md) — Security checklist
