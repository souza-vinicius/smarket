# Deployment Guide - Mercado Esperto VPS

Production deployment guide for Hostinger VPS (2 vCPU, 8GB RAM, 100GB disk, São Paulo).

## Prerequisites

- VPS with Ubuntu 22.04 LTS
- Root or sudo access
- Domain name configured (DNS A records pointing to VPS IP)
- SSH key-based authentication configured

---

## Step 1: VPS Initial Setup

### 1.1 Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Create Deploy User

```bash
# Create non-root user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Copy SSH keys to deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 1.3 Configure Firewall (UFW)

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 1.4 Install Docker

```bash
# Update package index
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**Expected output:**
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

---

## Step 2: Verify Dokploy/Traefik Setup

### 2.1 Verify Dokploy Installation

**Dokploy is already installed on your VPS** and includes Traefik by default.

```bash
# Check Dokploy status
docker ps | grep dokploy

# Check Traefik status (embedded in Dokploy)
docker ps | grep traefik

# Access Dokploy dashboard
# Open browser: https://YOUR_VPS_IP:3000
```

**Expected output:** Both `dokploy` and `traefik` containers running.

### 2.2 Verify Network

```bash
# Verify dokploy-network exists
docker network ls | grep dokploy-network
```

**Expected output:**
```
<network-id>   dokploy-network   bridge    local
```

> **Note:** Traefik is managed by Dokploy. SSL certificates are issued automatically
> via Let's Encrypt when you configure domains in Dokploy dashboard.

---

## Deployment Options

You have **two deployment options**:

| Option | Method | Complexity | Recommended For |
|--------|--------|------------|-----------------|
| **A** | Dokploy Dashboard | Low (UI-based) | Quick setup, managed updates |
| **B** | Manual Docker Compose | Medium (CLI-based) | Full control, infrastructure-as-code |

Choose **Option A** if you want Dokploy to manage deployments, backups, and SSL automatically.

Choose **Option B** if you prefer full control via CLI and `docker-compose.production.yml`.

---

## Option A: Deploy via Dokploy Dashboard (Recommended)

### A1. Access Dokploy

1. Open browser: `https://YOUR_VPS_IP:3000`
2. Login with credentials created during Dokploy installation

### A2. Create New Project

1. Click **New Project**
2. Name: `Mercado Esperto`
3. Click **Create**

### A3. Add PostgreSQL Database

1. In project, click **Add Service** → **Database** → **PostgreSQL**
2. Configure:
   - **Name:** `mercadoesperto-db`
   - **Database Name:** `mercadoesperto`
   - **Username:** `mercadoesperto`
   - **Password:** (generate strong password)
3. Click **Create**

### A4. Add Redis Database

1. Click **Add Service** → **Database** → **Redis**
2. Configure:
   - **Name:** `mercadoesperto-redis`
3. Click **Create**

### A5. Deploy API Service

1. Click **Add Service** → **Application** → **Docker Compose**
2. Configure:
   - **Name:** `mercadoesperto-api`
   - **Repository:** `https://github.com/your-org/smarket.git`
   - **Branch:** `main`
   - **Docker Compose File:** `docker-compose.production.yml`
   - **Service:** `api`
3. **Environment Variables:** Copy from `.env.production.example` and fill in:
   - `DATABASE_URL` (use Dokploy's PostgreSQL connection string)
   - `REDIS_URL` (use Dokploy's Redis connection string)
   - `SECRET_KEY`, LLM keys, etc.
4. **Domains:** Add your domain `api.yourdomain.com`
5. Click **Deploy**

### A6. Deploy Web Service

1. Click **Add Service** → **Application** → **Docker Compose**
2. Configure:
   - **Name:** `mercadoesperto-web`
   - **Repository:** Same as API
   - **Docker Compose File:** `docker-compose.production.yml`
   - **Service:** `web`
3. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
4. **Domains:** Add your domain `yourdomain.com`
5. Click **Deploy**

### A7. Setup Automated Backups (Dokploy)

1. Go to PostgreSQL Database → **Backups** tab
2. Click **Enable Automatic Backups**
3. Configure:
   - Schedule: Daily at 3:00 AM
   - Retention: 7 backups
   - Destination: S3 (optional but recommended)

**Done!** Dokploy will handle SSL, deployments, and backups automatically.

---

## Option B: Deploy via Docker Compose (CLI)

### Step 3: Clone Repository & Configure Environment

### 3.1 Clone Repository

```bash
# Switch to deploy user
su - deploy

# Clone repository
cd ~
git clone https://github.com/your-org/smarket.git
cd smarket
```

### 3.2 Create Production Environment File

```bash
# Copy example
cp .env.production.example .env

# Edit with real values
nano .env
```

**Critical variables to set:**
```bash
# Domains
API_DOMAIN=api.yourdomain.com
WEB_DOMAIN=yourdomain.com

# Database (generate secure password)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

# JWT (generate secure key)
SECRET_KEY=$(openssl rand -hex 32)

# LLM Provider (at minimum, set one)
OPENROUTER_API_KEY=sk-or-v1-XXXXX

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Admin
ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
```

**Save and set permissions:**
```bash
chmod 600 .env
```

---

## Step 4: Build & Start Services

### 4.1 Build Images

```bash
docker compose -f docker-compose.production.yml build --no-cache
```

**Expected output:** Build completes without errors for `api` and `web` services.

### 4.2 Start Services

```bash
docker compose -f docker-compose.production.yml up -d
```

**Expected output:**
```
[+] Running 4/4
 ✔ Container smarket-postgres-1  Started
 ✔ Container smarket-redis-1     Started
 ✔ Container smarket-api-1       Started
 ✔ Container smarket-web-1       Started
```

### 4.3 Verify Containers

```bash
docker compose -f docker-compose.production.yml ps
```

**Expected output:** All 4 containers with status `Up` and `healthy`.

---

## Step 5: Run Database Migrations

```bash
# Migrations run automatically on API container startup via Dockerfile CMD
# Verify migrations completed:
docker compose -f docker-compose.production.yml logs api | grep "alembic upgrade head"
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> xxxxx, Initial migration
```

### Manual migration (if needed):

```bash
docker compose -f docker-compose.production.yml exec api alembic upgrade head
```

---

## Step 6: Verify Health

### 6.1 Check API Health

```bash
# From VPS
curl http://localhost:8000/health

# From outside (after DNS configured)
curl https://api.yourdomain.com/health
```

**Expected output:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### 6.2 Check Logs

```bash
# API logs
docker compose -f docker-compose.production.yml logs -f api

# All services
docker compose -f docker-compose.production.yml logs -f
```

**Expected:** No error messages, uvicorn started with 2 workers.

### 6.3 Run Health Check Script (after creating in Step 1.4)

```bash
chmod +x scripts/health_check.sh
./scripts/health_check.sh
```

**Expected output:**
```
✓ API Health: ok
✓ Database: ok
✓ Redis: ok
✓ LLM Provider: ok
✓ Disk Usage: 15% (15GB/100GB)
✓ Memory Usage: 45% (3.6GB/8GB)
```

---

## Step 7: DNS Configuration

### 7.1 Configure DNS Records

At your domain registrar (Registro.br, CloudFlare, etc.):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_VPS_IP` | 300 |
| A | api | `YOUR_VPS_IP` | 300 |
| CNAME | www | yourdomain.com | 300 |

### 7.2 Verify DNS Propagation

```bash
# Check A record
dig yourdomain.com +short

# Check API subdomain
dig api.yourdomain.com +short
```

**Expected output:** Both return `YOUR_VPS_IP`.

### 7.3 Verify SSL Certificate

After DNS propagates (5-10 minutes), Traefik will automatically request Let's Encrypt certificates.

```bash
# Check Traefik logs for certificate acquisition
docker logs traefik | grep letsencrypt

# Test HTTPS
curl https://api.yourdomain.com/health
curl https://yourdomain.com
```

**Expected:** Both return 200 OK with valid SSL certificate.

---

## Post-Deployment

### Create First Admin User

If `ADMIN_BOOTSTRAP_EMAIL` is set in `.env`, the user will be promoted to admin on first API startup.

Otherwise, register via web UI and manually promote:

```bash
# Connect to database
docker compose -f docker-compose.production.yml exec postgres psql -U mercadoesperto

# Promote user to admin
UPDATE users SET admin_role = 'super_admin' WHERE email = 'admin@yourdomain.com';
\q
```

### Setup Automated Backups

```bash
# Setup cron job (see docs/BACKUP_RESTORE.md)
crontab -e

# Add line:
0 3 * * * /home/deploy/smarket/scripts/backup.sh
```

### Monitor Services

```bash
# Resource usage
docker stats

# Logs
docker compose -f docker-compose.production.yml logs -f

# Health checks
./scripts/health_check.sh
```

---

## Troubleshooting

### Services not starting

```bash
# Check logs
docker compose -f docker-compose.production.yml logs

# Check individual service
docker compose -f docker-compose.production.yml logs api

# Restart services
docker compose -f docker-compose.production.yml restart
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker compose -f docker-compose.production.yml ps postgres

# Test connection
docker compose -f docker-compose.production.yml exec postgres \
  psql -U mercadoesperto -c "SELECT version();"
```

### SSL certificate not issued

```bash
# Verify DNS points to VPS
dig api.yourdomain.com +short

# Check Traefik logs
docker logs traefik | grep "error"

# Manually trigger certificate request (if using standalone Traefik)
docker restart traefik
```

### Memory issues

```bash
# Check memory usage
free -h
docker stats

# If services are restarting due to OOM:
# - Reduce UVICORN_WORKERS from 2 to 1
# - Lower PostgreSQL shared_buffers (see Phase 3)
```

---

## Updating the Application

```bash
cd ~/smarket
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d

# Run migrations
docker compose -f docker-compose.production.yml exec api alembic upgrade head

# Verify
./scripts/health_check.sh
```

---

## Rollback

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
docker compose -f docker-compose.production.yml up -d --build

# Rollback migrations
docker compose -f docker-compose.production.yml exec api alembic downgrade -1
```

---

## Deployment Method Comparison

| Feature | Dokploy Dashboard (Option A) | Docker Compose CLI (Option B) |
|---------|----------------------------|-------------------------------|
| **Setup Time** | 15-30 minutes | 45-60 minutes |
| **Complexity** | Low (UI clicks) | Medium (CLI commands) |
| **SSL Setup** | Automatic (Let's Encrypt) | Automatic (Traefik labels) |
| **Backups** | Built-in (UI toggle) | Custom script + cron |
| **Updates** | Git webhook → auto-deploy | Manual `git pull` + rebuild |
| **Monitoring** | Built-in dashboard | Custom scripts |
| **Infrastructure-as-Code** | No (UI-based) | Yes (`docker-compose.yml`) |
| **Rollback** | One-click (UI) | Manual (`git checkout` + rebuild) |
| **Best For** | Quick setup, less DevOps knowledge | Full control, CI/CD integration |

**Recommendation:**
- **MVP/Testing:** Use Dokploy Dashboard (Option A) for speed
- **Production at scale:** Use Docker Compose CLI (Option B) for reproducibility and CI/CD

You can **start with Option A** and migrate to Option B later if needed.

---

## Support

- **Logs:** `docker compose -f docker-compose.production.yml logs -f` (Option B) or Dokploy Dashboard → Logs (Option A)
- **Health:** `curl https://api.yourdomain.com/health`
- **Docs:** https://docs.mercadoesperto.com.br
- **Issues:** https://github.com/your-org/smarket/issues

## Sources

- [Dokploy Backups Documentation](https://docs.dokploy.com/docs/core/backups)
- [Dokploy Database Management Guide](https://ramnode.com/guides/series/dokploy/database-management)
- [Hostinger VPS Backup Guide](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)
