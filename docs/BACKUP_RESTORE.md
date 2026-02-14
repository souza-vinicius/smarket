# Backup & Restore Guide - Mercado Esperto

Complete guide for backing up and restoring the PostgreSQL database.

---

## Backup Strategy Overview

Mercado Esperto uses a **multi-layer backup approach** for maximum data safety:

| Layer | Tool | Frequency | Retention | Purpose |
|-------|------|-----------|-----------|---------|
| **L1: VPS Snapshots** | Hostinger | Weekly (default) | 20 days | Full system recovery |
| **L2: Dokploy DB Backups** | Dokploy built-in | Daily (recommended) | Configurable | Database-specific |
| **L3: Custom Script** | `backup.sh` | Daily (optional) | 7 daily + 4 weekly | Granular control + S3 |

**Recommendation:** Use **L1 + L2** for simplicity. Add **L3** only if you need:
- Custom retention beyond Dokploy limits
- Off-site S3/B2 storage
- Backup validation scripts

---

## L1: Hostinger VPS Snapshots (Recommended for Beginners)

### Enable Automatic Weekly Backups

**Default:** Hostinger backs up your VPS **automatically every week** at no extra cost.

**To enable daily backups:**

1. Go to [Hostinger VPS Dashboard](https://hpanel.hostinger.com)
2. Select your VPS
3. Navigate to **Backups** → **Manage Backup Schedule**
4. Select **Daily** (additional cost applies)

**Retention:**
- Daily backups: 7 days
- Weekly backups: Varies by plan
- Snapshots: 20 days (1 snapshot at a time)

**Restore process:**
1. Go to VPS Dashboard → Backups
2. Select backup date
3. Click **Restore**
4. Wait 5-15 minutes for restore to complete

**Sources:**
- [How to Back Up or Restore a VPS at Hostinger](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)
- [How to Activate Daily Backups](https://support.hostinger.com/en/articles/1665153-how-to-activate-daily-backups)

**Pros:**
- ✅ Zero configuration
- ✅ Full system backup (OS + Docker + data)
- ✅ One-click restore via dashboard
- ✅ Managed by Hostinger

**Cons:**
- ❌ Weekly by default (daily costs extra)
- ❌ Limited retention (20 days max)
- ❌ No granular database restore
- ❌ Restore affects entire VPS

---

## L2: Dokploy Database Backups (Recommended for Production)

### Setup Automated Database Backups in Dokploy

Dokploy has **built-in automated backups** for PostgreSQL with S3 support.

**1. Configure S3 Destination (optional but recommended):**

1. Access Dokploy dashboard: `https://YOUR_VPS_IP:3000`
2. Go to **Settings** → **Backup Destinations**
3. Add new destination:
   - **Provider:** Backblaze B2 / AWS S3 / DigitalOcean Spaces
   - **Bucket name:** `smarket-backups`
   - **Access key / Secret:** From your S3 provider
   - **Region:** Your provider's region

**2. Enable Database Backups:**

1. In Dokploy, go to your **PostgreSQL Database**
2. Navigate to **Backups** tab
3. Click **Enable Automatic Backups**
4. Configure:
   - **Schedule:** Daily at 3:00 AM
   - **Retention:** 7 backups
   - **Destination:** Select your S3 destination (or local if not configured)

**3. Verify backup creation:**

Check Dokploy dashboard → Database → Backups tab after 24 hours.

**Restore from Dokploy:**

1. Go to Database → Backups tab
2. Select backup date
3. Click **Restore**
4. Confirm restoration

**Sources:**
- [Dokploy Backups Documentation](https://docs.dokploy.com/docs/core/backups)
- [Dokploy Database Management](https://ramnode.com/guides/series/dokploy/database-management)
- [Backup Destinations](https://deepwiki.com/Dokploy/dokploy/12.3-backup-destinations)

**Pros:**
- ✅ Database-specific backups (PostgreSQL only)
- ✅ Automated scheduling via UI
- ✅ S3 support (Backblaze B2, AWS S3, etc.)
- ✅ One-click restore
- ✅ Retention policy enforcement
- ✅ Volume backups (files in containers)

**Cons:**
- ❌ Requires S3 for off-site storage (local-only is risky)
- ❌ UI-based config (not infrastructure-as-code)

---

## L3: Custom Backup Script (Advanced)

Use this **only if** Dokploy backups don't meet your needs.

### When to use custom script:

- Need retention beyond 7 backups (e.g., 30 days)
- Want backup verification scripts
- Need multiple S3 destinations
- Prefer infrastructure-as-code over UI config

---

## Automated Backups

### Setup Automated Daily Backups

The `scripts/backup.sh` script handles automated backups with retention policies.

**1. Create required directories:**

```bash
mkdir -p /home/deploy/backups/{daily,weekly}
mkdir -p /home/deploy/smarket/logs
```

**2. Test the backup script:**

```bash
cd /home/deploy/smarket
./scripts/backup.sh
```

**Expected output:**
```
[2026-02-14 03:00:00] ==========================================
[2026-02-14 03:00:00] Mercado Esperto - Database Backup
[2026-02-14 03:00:00] ==========================================
[2026-02-14 03:00:00] Disk space: 85GB available
[2026-02-14 03:00:00] Backup directories ready: /home/deploy/backups
[2026-02-14 03:00:00] ✓ PostgreSQL container running
[2026-02-14 03:00:00] Starting backup of database 'mercadoesperto'...
[2026-02-14 03:00:00] Daily backup
[2026-02-14 03:00:05] ✓ Backup created: /home/deploy/backups/daily/smarket_backup_2026-02-14_03-00-00.sql.gz
[2026-02-14 03:00:05]    Size: 1.2M
[2026-02-14 03:00:05]    Duration: 5s
[2026-02-14 03:00:05] ✓ Backup file integrity verified
[2026-02-14 03:00:05] Cleaning up old backups...
[2026-02-14 03:00:05]    Retained: 1 daily, 0 weekly backups
[2026-02-14 03:00:05] ✓ Backup completed successfully
```

**3. Setup cron job for automated daily backups (3 AM):**

```bash
crontab -e
```

Add the following line:

```cron
# Mercado Esperto - Daily database backup at 3 AM
0 3 * * * /home/deploy/smarket/scripts/backup.sh >> /home/deploy/smarket/logs/backup.log 2>&1
```

**4. Verify cron job:**

```bash
crontab -l
```

---

## Backup Retention Policy

| Type | Retention | Location |
|------|-----------|----------|
| **Daily** | 7 days | `/home/deploy/backups/daily/` |
| **Weekly** | 4 weeks (28 days) | `/home/deploy/backups/weekly/` |

- **Daily backups** are created Monday-Saturday
- **Weekly backups** are created on Sundays
- Old backups are automatically deleted according to retention policy

---

## Manual Backup

### Create Manual Backup

```bash
# Using the backup script
cd /home/deploy/smarket
./scripts/backup.sh

# Or manually with docker exec
docker exec smarket-postgres-1 pg_dump \
  -U mercadoesperto \
  -d mercadoesperto \
  --clean --if-exists --no-owner --no-privileges \
  | gzip > backup_manual_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Download Backup from VPS

```bash
# From your local machine
scp deploy@YOUR_VPS_IP:/home/deploy/backups/daily/smarket_backup_*.sql.gz ./
```

---

## Restore from Backup

### 1. Stop API Service (to prevent new writes)

```bash
cd /home/deploy/smarket
docker compose -f docker-compose.production.yml stop api web
```

### 2. Restore Database

**Option A: Restore from compressed backup**

```bash
# Decompress and restore
gunzip -c /home/deploy/backups/daily/smarket_backup_2026-02-14_03-00-00.sql.gz \
  | docker exec -i smarket-postgres-1 psql \
    -U mercadoesperto \
    -d mercadoesperto
```

**Option B: Restore from uncompressed SQL**

```bash
# If you have an uncompressed .sql file
docker exec -i smarket-postgres-1 psql \
  -U mercadoesperto \
  -d mercadoesperto \
  < backup.sql
```

**Expected output:**
```
DROP TABLE
DROP TABLE
...
CREATE TABLE
CREATE TABLE
...
COPY 1234
COPY 5678
...
```

### 3. Verify Restore

```bash
# Check table count
docker exec smarket-postgres-1 psql \
  -U mercadoesperto \
  -d mercadoesperto \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Check data count (invoices as example)
docker exec smarket-postgres-1 psql \
  -U mercadoesperto \
  -d mercadoesperto \
  -c "SELECT COUNT(*) FROM invoices;"
```

### 4. Restart Services

```bash
docker compose -f docker-compose.production.yml start api web

# Verify health
./scripts/health_check.sh
```

---

## Disaster Recovery Scenarios

### Scenario 1: Corrupted Database

**Symptoms:** API errors, database connection issues, data inconsistencies.

**Recovery:**

```bash
# 1. Stop services
docker compose -f docker-compose.production.yml stop api web

# 2. Drop and recreate database
docker exec smarket-postgres-1 psql -U mercadoesperto -c "DROP DATABASE mercadoesperto;"
docker exec smarket-postgres-1 psql -U mercadoesperto -c "CREATE DATABASE mercadoesperto;"

# 3. Restore from latest backup
gunzip -c /home/deploy/backups/daily/smarket_backup_LATEST.sql.gz \
  | docker exec -i smarket-postgres-1 psql -U mercadoesperto -d mercadoesperto

# 4. Restart services
docker compose -f docker-compose.production.yml start api web
```

### Scenario 2: Accidental Data Deletion

**Recovery:**

```bash
# 1. Identify when deletion occurred (check logs)
docker compose -f docker-compose.production.yml logs api | grep DELETE

# 2. Find backup from before deletion
ls -lth /home/deploy/backups/daily/ | head -10

# 3. Restore specific tables (not full DB)
# Extract specific table from backup
gunzip -c backup.sql.gz | grep -A 10000 "CREATE TABLE invoices" > invoices_restore.sql

# Restore only that table
docker exec -i smarket-postgres-1 psql \
  -U mercadoesperto \
  -d mercadoesperto \
  < invoices_restore.sql
```

### Scenario 3: Complete VPS Failure

**Recovery on new VPS:**

```bash
# 1. Setup new VPS (follow docs/DEPLOYMENT.md steps 1-3)

# 2. Transfer backup from old VPS or download from S3
scp user@OLD_VPS_IP:/home/deploy/backups/daily/latest.sql.gz ./

# 3. Copy to new VPS
scp latest.sql.gz deploy@NEW_VPS_IP:/home/deploy/

# 4. Start services without restoring first
cd /home/deploy/smarket
docker compose -f docker-compose.production.yml up -d

# 5. Restore database
gunzip -c latest.sql.gz | docker exec -i smarket-postgres-1 psql \
  -U mercadoesperto -d mercadoesperto

# 6. Verify and update DNS
./scripts/health_check.sh
```

---

## Off-site Backups (S3-compatible storage)

### Setup Backblaze B2 (Recommended - $0.005/GB)

**1. Create Backblaze B2 account and bucket:**
- Sign up at https://www.backblaze.com/b2/sign-up.html
- Create bucket: `smarket-backups`
- Get application key

**2. Install s3cmd:**

```bash
sudo apt install s3cmd

# Configure s3cmd for Backblaze B2
s3cmd --configure
```

Configuration values:
- Access Key: Your B2 keyID
- Secret Key: Your B2 applicationKey
- Default Region: us-west-000
- S3 Endpoint: s3.us-west-000.backblazeb2.com
- DNS-style bucket: %(bucket)s.s3.us-west-000.backblazeb2.com

**3. Set S3_BUCKET environment variable:**

```bash
# Add to .env or export in backup script
export S3_BUCKET=smarket-backups
```

**4. Backups will now automatically upload to S3**

The `backup.sh` script will detect `S3_BUCKET` and upload after creating local backup.

### Manual S3 Upload

```bash
# Upload specific backup
s3cmd put /home/deploy/backups/daily/backup.sql.gz \
  s3://smarket-backups/backups/backup.sql.gz

# List S3 backups
s3cmd ls s3://smarket-backups/backups/

# Download from S3
s3cmd get s3://smarket-backups/backups/backup.sql.gz ./
```

---

## Backup Size & Frequency Guidelines

| Data Volume | Backup Size (compressed) | Frequency | Retention |
|-------------|-------------------------|-----------|-----------|
| < 1k invoices | ~500KB - 2MB | Daily | 7 days + 4 weeks |
| 1k - 10k invoices | ~2MB - 20MB | Daily | 7 days + 4 weeks |
| 10k - 100k invoices | ~20MB - 200MB | Daily + hourly (critical) | 7 days + 12 weeks |

**Disk usage estimate:**
- 7 daily backups × 20MB = 140MB
- 4 weekly backups × 20MB = 80MB
- **Total: ~220MB** for 10k invoices

With 100GB disk, backups will use < 1% of storage.

---

## Monitoring Backups

### Check Last Backup

```bash
# Check when last backup was created
ls -lth /home/deploy/backups/daily/ | head -5

# Check backup log
tail -n 50 /home/deploy/smarket/logs/backup.log

# Verify backup integrity
gzip -t /home/deploy/backups/daily/smarket_backup_*.sql.gz && echo "OK" || echo "CORRUPTED"
```

### Backup Alerts

Add to health check script or monitoring:

```bash
# Alert if no backup in last 25 hours
LAST_BACKUP=$(find /home/deploy/backups/daily -name "*.sql.gz" -mtime -1 | wc -l)

if [ "$LAST_BACKUP" -eq 0 ]; then
  echo "WARNING: No backup created in last 24 hours"
  # Send alert (email, Slack, etc.)
fi
```

---

## Restore Testing

**⚠️ CRITICAL:** Test restore procedures quarterly to ensure backups are valid.

### Test Restore (Safe - doesn't affect production)

```bash
# 1. Create test container
docker run -d --name postgres-test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=testdb \
  postgres:16-alpine

# 2. Restore backup to test container
gunzip -c /home/deploy/backups/daily/latest.sql.gz \
  | docker exec -i postgres-test psql -U test -d testdb

# 3. Verify data
docker exec postgres-test psql -U test -d testdb -c "SELECT COUNT(*) FROM invoices;"

# 4. Cleanup test container
docker stop postgres-test && docker rm postgres-test
```

Schedule quarterly restore tests:

```cron
# Test restore every 3 months (1st day of Jan, Apr, Jul, Oct at 4 AM)
0 4 1 1,4,7,10 * /home/deploy/smarket/scripts/test_restore.sh
```

---

## Troubleshooting

### Backup fails: "PostgreSQL container not running"

```bash
# Check container status
docker ps | grep postgres

# Start container if stopped
docker compose -f docker-compose.production.yml up -d postgres
```

### Restore fails: "role does not exist"

The backup was created with `--no-owner`, so role errors are expected. They can be safely ignored as long as data is restored.

To suppress warnings:
```bash
gunzip -c backup.sql.gz | docker exec -i smarket-postgres-1 psql \
  -U mercadoesperto -d mercadoesperto 2>&1 | grep -v "ERROR:  role"
```

### Disk full during backup

```bash
# Check disk usage
df -h

# Clean up old backups manually
find /home/deploy/backups/daily -name "*.sql.gz" -mtime +7 -delete

# Clean up Docker system
docker system prune -af
```

---

## Recommended Backup Configuration

### For Production (Choose One):

**Option A: Dokploy Backups (Recommended)**
- [ ] Enable daily backups in Dokploy dashboard
- [ ] Configure S3 destination (Backblaze B2 recommended)
- [ ] Set retention to 7 backups
- [ ] Test restore procedure
- [ ] Enable Hostinger weekly VPS snapshots (default)

**Option B: Custom Script + Dokploy Snapshots**
- [ ] Automated daily backups configured (cron)
- [ ] Backup script tested successfully
- [ ] Retention policy configured (7 daily + 4 weekly)
- [ ] Off-site backups enabled (S3/B2)
- [ ] Restore procedure tested
- [ ] Backup monitoring/alerts configured
- [ ] Quarterly restore tests scheduled
- [ ] Enable Hostinger weekly VPS snapshots (default)

### Minimum Viable Backup (Free)

Just rely on Hostinger's **default weekly snapshots** (already active):
- ✅ Zero cost
- ✅ Zero configuration
- ✅ 20-day retention
- ⚠️ Recovery point objective (RPO): Up to 7 days data loss
- ⚠️ Full VPS restore only (no granular database restore)

**This is acceptable for MVP/testing phase**, but upgrade to Dokploy backups before production launch.
