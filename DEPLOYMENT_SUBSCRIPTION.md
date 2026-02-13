# Deployment Guide - Sistema de Assinaturas

Guia completo para deploy do sistema de assinaturas Mercado Esperto com Stripe.

---

## 📋 Pré-requisitos

- [x] Conta Stripe (https://dashboard.stripe.com/)
- [x] Stripe CLI instalado (https://stripe.com/docs/stripe-cli)
- [x] Docker e Docker Compose
- [x] Acesso ao repositório Git

---

## 🚀 Parte 1: Configuração do Stripe

### 1.1 Criar Produtos no Stripe Dashboard

1. Acesse https://dashboard.stripe.com/products
2. Clique em **"+ Add product"**
3. Crie os 4 produtos:

#### Produto 1: Plano Básico
- **Name**: Mercado Esperto Básico
- **Description**: 5 notas fiscais/mês + 5 análises IA/mês
- **Pricing**:
  - **Mensal**: R$ 9,90 (recurring, monthly)
  - **Anual**: R$ 99 (recurring, yearly)
- Salve os **Price IDs**: `price_xxxBasicMonthly` e `price_xxxBasicYearly`

#### Produto 2: Plano Premium
- **Name**: Mercado Esperto Premium
- **Description**: Notas fiscais ilimitadas + análises IA ilimitadas
- **Pricing**:
  - **Mensal**: R$ 19,90 (recurring, monthly)
  - **Anual**: R$ 199 (recurring, yearly)
- Salve os **Price IDs**: `price_xxxPremiumMonthly` e `price_xxxPremiumYearly`

### 1.2 Configurar Webhooks

#### Desenvolvimento (Local)

1. Instale o Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.x.x/stripe_1.x.x_linux_x86_64.tar.gz
tar -xvf stripe_1.x.x_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

2. Faça login no Stripe CLI:
```bash
stripe login
```

3. Forward webhooks para o backend local:
```bash
stripe listen --forward-to http://localhost:8000/api/v1/subscriptions/webhooks/stripe
```

4. Copie o **webhook signing secret** que aparece (começa com `whsec_...`)

#### Produção

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://api.seudominio.com/api/v1/subscriptions/webhooks/stripe`
   - **Events to send**:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Salve o **Signing secret** (começa com `whsec_...`)

---

## ⚙️ Parte 2: Configuração do Backend

### 2.1 Variáveis de Ambiente

Edite o arquivo `.env` (baseado em `.env.example`):

```bash
# Subscription System
ENABLE_SUBSCRIPTION_SYSTEM=false  # Mude para true quando pronto
TRIAL_DURATION_DAYS=30

# Stripe Keys (use test keys primeiro)
STRIPE_SECRET_KEY=sk_test_...  # Pegar em https://dashboard.stripe.com/apikeys
STRIPE_WEBHOOK_SECRET=whsec_...  # Do Stripe CLI ou webhook dashboard

# Stripe Price IDs (dos produtos criados na Parte 1.1)
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxxBasicMonthly
STRIPE_BASIC_YEARLY_PRICE_ID=price_xxxBasicYearly
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxPremiumMonthly
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxPremiumYearly
```

### 2.2 Rodar Migration

```bash
cd apps/api

# Aplicar migration
alembic upgrade head

# Verificar se as tabelas foram criadas
docker-compose exec postgres psql -U user -d db -c "\dt"
# Deve mostrar: subscriptions, payments, usage_records
```

### 2.3 Rebuild e Restart

```bash
# Do diretório raiz do projeto
docker-compose up -d --build api

# Verificar logs
docker-compose logs -f api

# Verificar se não há erros
docker-compose logs api | grep -i error
```

---

## 🧪 Parte 3: Testes

### 3.1 Verificar API

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Feature flags (verificar subscription_system)
curl http://localhost:8000/features

# Resposta esperada:
# {
#   "subscription_system": {
#     "enabled": false,  <- deve estar false inicialmente
#     "trial_duration_days": 30,
#     "description": "Subscription limits for invoices and AI analyses"
#   },
#   ...
# }
```

### 3.2 Testar Registro com Auto-Trial

1. Registre um novo usuário (via frontend ou API):
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123",
    "full_name": "Usuário Teste"
  }'
```

2. Faça login e obtenha o token

3. Verifique se a subscription foi criada:
```bash
curl http://localhost:8000/api/v1/subscriptions \
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta esperada:
```json
{
  "subscription": {
    "plan": "free",
    "status": "trial",
    "trial_end": "2026-03-XX...",
    "is_active": true,
    "invoice_limit": 1,
    "analysis_limit": 2
  },
  "usage": {
    "invoices_used": 0,
    "invoices_limit": 1,
    "ai_analyses_used": 0,
    "ai_analyses_limit": 2,
    "month": 2,
    "year": 2026
  }
}
```

### 3.3 Testar Stripe Checkout (Test Mode)

1. Acesse o frontend: http://localhost:3000/pricing
2. Clique em **"Escolher Básico"** ou **"Escolher Premium"**
3. Você será redirecionado para Stripe Checkout
4. Use cartão de teste: `4242 4242 4242 4242` (qualquer CVV/data futura)
5. Complete o pagamento
6. Você deve ser redirecionado de volta para `/dashboard?payment=success`
7. Verifique no backend que o webhook foi recebido:
```bash
docker-compose logs api | grep "checkout_completed_success"
```

### 3.4 Testar Limites (quando ENABLE_SUBSCRIPTION_SYSTEM=true)

1. Ative o sistema:
```bash
# Edite .env
ENABLE_SUBSCRIPTION_SYSTEM=true

# Reinicie
docker-compose restart api
```

2. Tente fazer upload de mais notas do que o limite permite
3. Deve retornar erro **429 Too Many Requests**:
```json
{
  "detail": "Limite de 1 notas fiscais/mês atingido. Faça upgrade."
}
```

---

## 🌐 Parte 4: Produção

### 4.1 Checklist Pré-Deploy

- [ ] Trocar `sk_test_...` por `sk_live_...` em `.env`
- [ ] Criar webhook de produção no Stripe Dashboard
- [ ] Atualizar `STRIPE_WEBHOOK_SECRET` com o segredo de produção
- [ ] Verificar `STRIPE_*_PRICE_ID` (devem ser price IDs de produção)
- [ ] Definir `ENABLE_SUBSCRIPTION_SYSTEM=true`
- [ ] Verificar `ALLOWED_ORIGINS` (incluir domínio de produção)
- [ ] Backup do banco de dados

### 4.2 Deploy

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build

# 3. Run migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 4. Verificar logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### 4.3 Migração de Usuários Existentes

Criar script para adicionar trial automático para usuários sem subscription:

```sql
-- Executar no PostgreSQL
INSERT INTO subscriptions (id, user_id, plan, status, trial_start, trial_end, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  'free',
  'trial',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;
```

---

## 🔍 Parte 5: Monitoramento

### 5.1 Logs Importantes

```bash
# Ver logs de subscription
docker-compose logs api | grep -E "subscription|stripe|checkout"

# Ver webhooks recebidos
docker-compose logs api | grep "stripe_webhook"

# Ver token usage (se image optimization está ativa)
docker-compose logs api | grep "💰"
```

### 5.2 Stripe Dashboard

Monitorar no dashboard:
- **Subscriptions**: https://dashboard.stripe.com/subscriptions
- **Customers**: https://dashboard.stripe.com/customers
- **Payments**: https://dashboard.stripe.com/payments
- **Webhooks**: https://dashboard.stripe.com/webhooks (verificar falhas)

### 5.3 Métricas no Banco

```sql
-- Usuários por plano
SELECT plan, COUNT(*) FROM subscriptions GROUP BY plan;

-- Subscriptions ativas
SELECT status, COUNT(*) FROM subscriptions GROUP BY status;

-- Uso médio por plano
SELECT
  s.plan,
  AVG(u.invoices_count) as avg_invoices,
  AVG(u.ai_analyses_count) as avg_analyses
FROM subscriptions s
JOIN usage_records u ON u.user_id = s.user_id
GROUP BY s.plan;
```

---

## 🐛 Troubleshooting

### Problema: Webhook não é recebido

**Solução**:
1. Verificar logs do Stripe CLI: `stripe listen --forward-to ...`
2. Verificar logs da API: `docker-compose logs api | grep webhook`
3. Testar manualmente: `stripe trigger checkout.session.completed`
4. Verificar firewall/DNS em produção

### Problema: Duplicate subscription error

**Solução**:
```sql
-- Verificar duplicatas
SELECT user_id, COUNT(*)
FROM subscriptions
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Deletar duplicatas (manter a mais recente)
DELETE FROM subscriptions
WHERE id NOT IN (
  SELECT MAX(id) FROM subscriptions GROUP BY user_id
);
```

### Problema: Token limit exceeded

**Solução**:
- Verificar se `IMAGE_OPTIMIZATION_ENABLED=true` em `.env`
- Verificar logs de optimization: `docker-compose logs api | grep "Image optimized"`
- Reduzir `IMAGE_MAX_DIMENSION` se necessário (padrão: 1536px)

---

## 📞 Suporte

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

## ✅ Checklist Final

### Backend
- [ ] Migration aplicada
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Stripe webhooks configurados
- [ ] Sistema de subscription ativado (`ENABLE_SUBSCRIPTION_SYSTEM=true`)
- [ ] Logs sem erros

### Frontend
- [ ] Página `/pricing` acessível
- [ ] Página `/settings/subscription` acessível
- [ ] Componentes de UI funcionando (UsageBanner, TrialBanner, UpgradeModal)
- [ ] Redirect para Stripe Checkout funciona
- [ ] Redirect de volta (success/cancel) funciona

### Testes
- [ ] Registro cria subscription trial automaticamente
- [ ] Checkout com cartão de teste funciona
- [ ] Webhooks são recebidos e processados
- [ ] Limites são aplicados corretamente
- [ ] Customer Portal funciona (gerenciar cartão/cancelar)

### Produção
- [ ] Chaves de produção configuradas
- [ ] Webhook de produção criado
- [ ] Domínios configurados corretamente
- [ ] Backup do banco feito
- [ ] Monitoramento ativo

---

**Sistema pronto para produção!** 🚀
