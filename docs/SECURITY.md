# Security Hardening Checklist

> **Mercado Esperto VPS Security** — Production security best practices for Hostinger deployment

This guide provides a comprehensive security checklist for the production environment. Follow these steps to secure your VPS, application, and user data.

---

## Table of Contents

1. [Server Hardening](#server-hardening)
2. [Application Security](#application-security)
3. [Database Security](#database-security)
4. [Docker Security](#docker-security)
5. [API Key & Secrets Management](#api-key--secrets-management)
6. [HTTPS & SSL/TLS](#https--ssltls)
7. [Monitoring & Incident Response](#monitoring--incident-response)
8. [Compliance (LGPD)](#compliance-lgpd)
9. [Security Checklist](#security-checklist)

---

## Server Hardening

### 1. SSH Security

**✓ Disable root login:**
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Set these values:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

**✓ Use SSH keys only** (never passwords):
```bash
# Generate key on local machine (if not exists)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-vps-ip
```

**✓ Change default SSH port** (optional, reduces automated attacks):
```bash
# In /etc/ssh/sshd_config
Port 2222  # Instead of 22

# Update firewall
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

### 2. Firewall Configuration

**✓ Enable UFW (Uncomplicated Firewall):**
```bash
# Allow necessary ports
sudo ufw allow 80/tcp    # HTTP (Traefik redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH (or custom port)

# Deny all other incoming traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

**✓ Verify firewall status:**
```bash
sudo ufw status verbose
```

### 3. Fail2Ban (Brute Force Protection)

**✓ Install and configure:**
```bash
sudo apt update
sudo apt install fail2ban -y
```

**✓ Create custom jail for SSH:**
```bash
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

Restart:
```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

### 4. Automatic Security Updates

**✓ Enable unattended upgrades:**
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

**✓ Configure to auto-install security patches:**
```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Ensure enabled:
```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
```

---

## Application Security

### 1. Environment Variables

**✓ Never commit `.env` files:**
```bash
# Verify .gitignore contains:
cat .gitignore | grep ".env"
# Should output: .env
```

**✓ Use strong secrets** (minimum 32 characters):
```bash
# Generate strong SECRET_KEY
openssl rand -hex 32

# Generate strong database password
openssl rand -base64 24
```

**✓ Store secrets securely:**
- **Production:** Store in `.env` file on VPS (readable only by root/deploy user)
- **Never:** Hard-code secrets in source code or Dockerfiles

### 2. CORS Configuration

**✓ Restrict allowed origins:**

In `.env.production`:
```bash
# Only allow your frontend domain (no wildcards)
ALLOWED_ORIGINS=https://app.your-domain.com
```

**✓ Verify in `src/main.py`:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,  # Specific domains only
    allow_credentials=True,
    # Do NOT use allow_origins=["*"] in production
)
```

### 3. Rate Limiting

**✓ Network-level (Traefik):**
Already configured in `docker-compose.production.yml`:
```yaml
- "traefik.http.middlewares.smarket-ratelimit.ratelimit.average=100"
- "traefik.http.middlewares.smarket-ratelimit.ratelimit.burst=50"
```

**✓ Application-level (SlowAPI):**
Verify `RATE_LIMIT_ENABLED=true` in `.env.production`

**✓ Monitor for abuse:**
```bash
# Check for suspicious IPs
docker logs dokploy-traefik-1 | grep "429" | awk '{print $1}' | sort | uniq -c | sort -rn
```

### 4. Input Validation

**✓ All handled by Pydantic schemas** (automatic validation)

**✓ Additional checks for file uploads:**
- File type validation (XML, images only)
- File size limits (10MB max)
- Image optimization (prevents memory bombs)

**✓ SQL Injection prevention:**
- ✅ Using SQLAlchemy ORM (parameterized queries)
- ✅ No raw SQL with user input
- ✅ All queries use async sessions

### 5. CNPJ API Security

**✓ API calls use HTTPS only:**
- BrasilAPI: `https://brasilapi.com.br`
- ReceitaWS: `https://receitaws.com.br`

**✓ Rate limiting respected:**
- Timeout: 5 seconds
- Retry: 2 attempts
- Cache: 24 hours (reduces API load)

---

## Database Security

### 1. PostgreSQL Hardening

**✓ Strong password:**
```bash
# In .env.production (minimum 16 characters)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
```

**✓ Network isolation:**
- ✅ PostgreSQL only accessible via internal Docker network
- ✅ No external port exposure (port 5432 not published)
- ✅ Only `api` service can connect

**✓ Connection limits:**
```yaml
# In docker-compose.production.yml
command: >
  postgres
  -c max_connections=50  # Prevent resource exhaustion
```

### 2. Database Encryption

**✓ Encryption at rest:**
- Hostinger VPS uses encrypted storage (check with provider)
- Consider: LUKS encryption for `/var/lib/docker/volumes` (optional)

**✓ Encryption in transit:**
- ✅ All connections within Docker network (internal)
- ✅ No remote database connections

**✓ Sensitive data:**
- User passwords: **bcrypt hashed** (via `passlib`)
- JWT tokens: **signed with SECRET_KEY** (HS256 algorithm)
- No credit card storage (Stripe handles payment data)

### 3. Backup Security

**✓ Encrypted backups:**
```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Decrypt when restoring
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

**✓ Offsite storage:**
- L1: Hostinger snapshots (encrypted by provider)
- L2: Dokploy S3 backups (configure encryption in Dokploy UI)
- L3: Custom script with Backblaze B2 (server-side encryption enabled)

**✓ Access control:**
```bash
# Backups readable only by root
chmod 600 /root/backups/*.sql.gz
```

---

## Docker Security

### 1. Container User Permissions

**✓ Run as non-root user:**

Already implemented in `apps/api/Dockerfile`:
```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser
USER appuser
```

**✓ Verify:**
```bash
docker exec smarket-api-1 whoami
# Output: appuser (not root)
```

### 2. Network Isolation

**✓ Separate networks:**
- `internal` — PostgreSQL, Redis, API, Web (isolated)
- `dokploy-network` — Only API and Web exposed via Traefik

**✓ Verify isolation:**
```bash
docker network inspect smarket_internal | grep -A 5 "Containers"
# Should NOT include Traefik
```

### 3. Image Security

**✓ Use official images:**
- ✅ `postgres:16-alpine` (official, minimal)
- ✅ `redis:7-alpine` (official, minimal)
- ✅ `python:3.11-slim` (official, minimal)

**✓ Scan for vulnerabilities:**
```bash
# Scan API image
docker scout cves smarket-api-1

# Or use Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image smarket-api-1
```

**✓ Regular updates:**
```bash
# Rebuild images with latest base images
docker-compose -f docker-compose.production.yml build --pull --no-cache
```

### 4. Resource Limits

**✓ Prevent DoS via resource exhaustion:**

Already configured in `docker-compose.production.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Hard limit
    reservations:
      memory: 1G  # Guaranteed
```

---

## API Key & Secrets Management

### 1. LLM Provider Keys

**✓ Restrict API key permissions:**
- **OpenRouter:** No admin access, billing alerts enabled
- **Gemini:** Project-scoped key (not account-wide)
- **OpenAI:** Separate key per environment (dev/prod)
- **Anthropic:** Usage limits configured

**✓ Monitor usage:**
```bash
# Check daily token consumption
docker logs smarket-api-1 --since 24h | grep "💰" | tail -20
```

**✓ Rotate keys quarterly:**
- Set calendar reminder: Rotate every 3 months
- Update `.env.production` → Restart API

### 2. Stripe API Keys

**✓ Use separate keys for production:**
```bash
# .env.production
STRIPE_SECRET_KEY=sk_live_...  # NOT sk_test_
```

**✓ Webhook signature verification:**
Already implemented in `src/services/stripe_service.py`:
```python
stripe.Webhook.construct_event(
    payload,
    sig_header,
    settings.STRIPE_WEBHOOK_SECRET  # Required for security
)
```

**✓ IP whitelist (optional):**
- Stripe webhook IPs: https://stripe.com/docs/ips
- Configure in Hostinger firewall if needed

### 3. JWT Secret Key

**✓ Generate strong key:**
```bash
openssl rand -hex 32
# Use output as SECRET_KEY in .env.production
```

**✓ Verify algorithm:**
```python
# In src/config.py
ALGORITHM: str = "HS256"  # Symmetric (fast, secure for internal use)
```

**✓ Token expiration:**
```bash
ACCESS_TOKEN_EXPIRE_MINUTES=30  # Short-lived
REFRESH_TOKEN_EXPIRE_DAYS=7     # Longer, but still limited
```

---

## HTTPS & SSL/TLS

### 1. Let's Encrypt (Automatic via Traefik/Dokploy)

**✓ Verify certificate:**
```bash
curl -I https://api.your-domain.com | grep -i "strict-transport"
# Should include: strict-transport-security: max-age=...
```

**✓ Check expiration:**
```bash
echo | openssl s_client -connect api.your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

**✓ Auto-renewal:**
- Traefik handles renewal automatically
- Certificates expire after 90 days
- Check Dokploy logs: `docker logs dokploy-traefik-1 | grep "acme"`

### 2. Security Headers

**✓ Add to API responses** (via middleware in `src/main.py`):

```python
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

**✓ Verify headers:**
```bash
curl -I https://api.your-domain.com/health | grep -E "X-|Strict"
```

### 3. TLS Configuration

**✓ Minimum TLS 1.2:**
Already enforced by Traefik/Dokploy default configuration.

**✓ Test SSL strength:**
```bash
# Use SSL Labs (external service)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=api.your-domain.com
# Target: A or A+ rating
```

---

## Monitoring & Incident Response

### 1. Security Monitoring

**✓ Failed login attempts:**
```bash
# API logs
docker logs smarket-api-1 | grep "401 Unauthorized" | wc -l
```

**✓ Unusual activity:**
- Sudden spike in invoice uploads
- High LLM token consumption
- Database connection errors

**✓ Set up alerts:**
- Uptime monitoring: UptimeRobot, Better Uptime
- Log monitoring: Papertrail, Logtail
- Error tracking: Sentry (optional)

### 2. Incident Response Plan

**If compromised:**

1. **Isolate:** Disable affected service immediately
   ```bash
   docker-compose stop api
   ```

2. **Investigate:** Check logs for attack vector
   ```bash
   docker logs smarket-api-1 --since 24h > /tmp/incident.log
   ```

3. **Rotate secrets:** Change all API keys and database passwords
   ```bash
   # Update .env.production
   # Restart all services
   docker-compose up -d --force-recreate
   ```

4. **Notify users:** If data breach, comply with LGPD notification requirements (72 hours)

5. **Review:** Post-mortem analysis, update security practices

### 3. Backup Verification

**✓ Test restores regularly:**
```bash
# Monthly test restore to verify backups work
bash scripts/restore.sh /root/backups/latest.sql.gz
```

---

## Compliance (LGPD)

### 1. Data Protection (Lei Geral de Proteção de Dados)

**✓ Collect only necessary data:**
- User: email, password (hashed), name, household info (optional)
- Invoices: access_key, merchant, items, amounts
- **Not collected:** CPF, address, phone (unless explicitly needed)

**✓ Data retention policy:**
- Active users: Indefinite (while account active)
- Deleted accounts: 30-day soft delete, then purged
- Backups: 30 days max retention

**✓ User rights:**
- **Access:** `/api/v1/users/me` — view own data
- **Correction:** `PATCH /api/v1/users/me` — update profile
- **Deletion:** `DELETE /api/v1/users/me` — account deletion
- **Portability:** Export JSON (to be implemented)

### 2. Privacy Policy & Terms

**✓ Create documents:**
- Privacy Policy (`/privacy`)
- Terms of Service (`/terms`)
- Cookie Policy (if using analytics)

**✓ User consent:**
- Checkbox on registration: "I agree to Terms and Privacy Policy"
- Stored in database: `user.consent_date`

### 3. Data Processing Records

**✓ Document data flows:**
- **Collection:** User registration, invoice upload
- **Processing:** LLM extraction, AI analysis, categorization
- **Storage:** PostgreSQL (VPS), S3 backups (Backblaze/AWS)
- **Sharing:** Stripe (payments), OpenRouter/Gemini (LLM)

**✓ Third-party processors:**
- Stripe: Payment processing (PCI-DSS compliant)
- OpenRouter: Invoice OCR (no data retention per their policy)
- Hostinger: Infrastructure (GDPR/LGPD compliant)

### 4. Breach Notification

**✓ Procedure:**
1. Detect breach within 24 hours (monitoring)
2. Investigate and contain within 48 hours
3. Notify ANPD (Brazil) within 72 hours if high risk
4. Notify affected users within 72 hours
5. Document incident and response

---

## Security Checklist

### Pre-Deployment Checklist

- [ ] **Server Hardening**
  - [ ] SSH key-only authentication enabled
  - [ ] Root login disabled
  - [ ] UFW firewall configured (ports 80, 443, 22 only)
  - [ ] Fail2Ban installed and active
  - [ ] Automatic security updates enabled

- [ ] **Application Security**
  - [ ] All secrets in `.env.production` (not hard-coded)
  - [ ] `SECRET_KEY` is 32+ characters (generated with `openssl rand -hex 32`)
  - [ ] `POSTGRES_PASSWORD` is 16+ characters
  - [ ] `ALLOWED_ORIGINS` set to specific domain (no wildcards)
  - [ ] `DEBUG=false` in production
  - [ ] Rate limiting enabled (`RATE_LIMIT_ENABLED=true`)

- [ ] **Database Security**
  - [ ] PostgreSQL not exposed externally (no published ports)
  - [ ] Strong database password configured
  - [ ] Backups encrypted and tested
  - [ ] Connection limits set (`max_connections=50`)

- [ ] **Docker Security**
  - [ ] Containers run as non-root user (`appuser`)
  - [ ] Resource limits configured (memory, CPU)
  - [ ] Images scanned for vulnerabilities (`docker scout cves`)
  - [ ] Networks isolated (`internal` vs `dokploy-network`)

- [ ] **HTTPS/SSL**
  - [ ] Let's Encrypt certificate active (Traefik)
  - [ ] HSTS header enabled (`Strict-Transport-Security`)
  - [ ] TLS 1.2+ only (no SSL, TLS 1.0, TLS 1.1)
  - [ ] SSL Labs grade A or A+

- [ ] **API Keys**
  - [ ] Stripe production keys configured (`sk_live_...`)
  - [ ] LLM provider keys rotated quarterly
  - [ ] Webhook signature verification enabled (Stripe)
  - [ ] JWT tokens short-lived (30min access, 7d refresh)

- [ ] **Monitoring**
  - [ ] Health checks configured (`/health` endpoint)
  - [ ] Log monitoring active (JSON logs in production)
  - [ ] Uptime monitoring enabled (UptimeRobot, etc.)
  - [ ] Alert thresholds set (disk, memory, errors)

- [ ] **Compliance (LGPD)**
  - [ ] Privacy Policy published
  - [ ] Terms of Service published
  - [ ] User consent checkbox on registration
  - [ ] Data deletion endpoint implemented
  - [ ] Incident response plan documented

### Monthly Security Review

- [ ] Check for Docker image updates
- [ ] Review failed login attempts
- [ ] Verify backup integrity (test restore)
- [ ] Scan containers for vulnerabilities
- [ ] Review LLM API usage and costs
- [ ] Check SSL certificate expiration
- [ ] Audit user accounts (disable inactive)

### Quarterly Security Tasks

- [ ] Rotate LLM API keys
- [ ] Rotate Stripe API keys (optional)
- [ ] Update all Docker images to latest versions
- [ ] Review and update firewall rules
- [ ] Penetration testing (optional, recommended)
- [ ] Security training for team members

---

## Additional Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Docker Security:** https://docs.docker.com/engine/security/
- **FastAPI Security:** https://fastapi.tiangolo.com/tutorial/security/
- **LGPD Guide:** https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- **SSL Labs Test:** https://www.ssllabs.com/ssltest/

---

**Related Guides:**
- [Deployment Guide](DEPLOYMENT.md) — Initial setup
- [Monitoring Guide](MONITORING.md) — Health checks and alerts
- [Backup & Restore](BACKUP_RESTORE.md) — Data protection
