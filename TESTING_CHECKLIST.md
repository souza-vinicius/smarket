# 🧪 Checklist de Testes - Sistema de Assinaturas

Guia completo para testar o sistema de assinaturas antes de ativar em produção.

---

## 🔧 Preparação (5 min)

### Setup Inicial

```bash
# 1. Aplicar migration
cd apps/api
alembic upgrade head

# 2. Verificar tabelas criadas
docker-compose exec postgres psql -U user -d db -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'payments', 'usage_records');
"
```

**✅ Resultado esperado**: 3 tabelas listadas

### Configurar Stripe Test Mode

```bash
# 1. Criar produtos no Stripe Dashboard (Test Mode)
# https://dashboard.stripe.com/test/products

# 2. Criar 4 prices e copiar IDs para .env:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Do stripe CLI
STRIPE_BASIC_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_YEARLY_PRICE_ID=price_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...

# 3. Rebuild
docker-compose up -d --build api web

# 4. Iniciar Stripe CLI (terminal separado)
stripe listen --forward-to http://localhost:8000/api/v1/subscriptions/webhooks/stripe
```

**✅ Resultado esperado**: "Ready! You are using Stripe API Version..."

---

## 📦 PARTE 1: Testes de Backend (30 min)

### 1.1 Health Check

```bash
curl http://localhost:8000/health
```

**✅ Esperado**: `{"status":"ok","version":"1.0.0"}`

---

### 1.2 Feature Flags

```bash
curl http://localhost:8000/features | jq .subscription_system
```

**✅ Esperado**:
```json
{
  "enabled": false,
  "trial_duration_days": 30,
  "description": "Subscription limits for invoices and AI analyses"
}
```

---

### 1.3 Registro + Auto-Trial

**Teste**: Registrar novo usuário deve criar subscription trial automaticamente

```bash
# 1. Registrar usuário
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "senha123",
    "full_name": "Usuário Teste"
  }' | jq .

# Copie o email retornado

# 2. Login
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-XXXXX@example.com",
    "password": "senha123"
  }' | jq -r .access_token)

echo "Token: $TOKEN"

# 3. Verificar subscription criada
curl http://localhost:8000/api/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**✅ Checklist**:
- [ ] `subscription.plan = "free"`
- [ ] `subscription.status = "trial"`
- [ ] `subscription.is_active = true`
- [ ] `subscription.trial_end` está ~30 dias no futuro
- [ ] `subscription.invoice_limit = 1`
- [ ] `subscription.analysis_limit = 2`
- [ ] `usage.invoices_used = 0`
- [ ] `usage.ai_analyses_used = 0`

---

### 1.4 Teste de Limite (Feature Flag OFF)

**Teste**: Com feature flag OFF, limites não devem ser aplicados

```bash
# Fazer múltiplos uploads (mais de 1) - deve funcionar
# Upload 1
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/path/to/invoice1.jpg"

# Upload 2
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@/path/to/invoice2.jpg"
```

**✅ Checklist**:
- [ ] Ambos uploads retornam **202 Accepted**
- [ ] Nenhum erro de limite aparece
- [ ] `usage.invoices_used` NÃO incrementa (feature flag OFF)

---

### 1.5 Ativar Feature Flag

```bash
# Editar .env
ENABLE_SUBSCRIPTION_SYSTEM=true

# Reiniciar
docker-compose restart api

# Aguardar 10 segundos
sleep 10

# Verificar feature flag
curl http://localhost:8000/features | jq .subscription_system.enabled
```

**✅ Esperado**: `true`

---

### 1.6 Teste de Limite (Feature Flag ON)

**Teste**: Com feature flag ON, limites devem ser aplicados

```bash
# Registrar novo usuário para teste limpo
TOKEN2=$(curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "limit-test-'$(date +%s)'@example.com",
    "password": "senha123",
    "full_name": "Teste Limite"
  }' | jq -r .access_token)

# Login (se register não retornar token)
# TOKEN2=$(curl -X POST http://localhost:8000/api/v1/auth/login ...)

# Upload 1 (deve funcionar)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN2" \
  -F "files=@/path/to/invoice.jpg" \
  -w "\nHTTP Status: %{http_code}\n"

# Upload 2 (deve falhar com 429)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN2" \
  -F "files=@/path/to/invoice2.jpg" \
  -w "\nHTTP Status: %{http_code}\n"
```

**✅ Checklist**:
- [ ] Upload 1 retorna **202 Accepted**
- [ ] Upload 2 retorna **429 Too Many Requests**
- [ ] Mensagem: "Limite de 1 notas fiscais/mês atingido. Faça upgrade."

---

### 1.7 Stripe Checkout Session

**Teste**: Criar sessão de checkout Stripe

```bash
curl -X POST http://localhost:8000/api/v1/subscriptions/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "basic",
    "billing_cycle": "monthly",
    "success_url": "http://localhost:3000/dashboard?payment=success",
    "cancel_url": "http://localhost:3000/pricing?payment=cancelled"
  }' | jq .
```

**✅ Checklist**:
- [ ] Retorna `checkout_url` começando com `https://checkout.stripe.com/`
- [ ] Retorna `session_id` começando com `cs_test_`
- [ ] URL é válida (copie e cole no navegador)

---

### 1.8 Webhook Handler (Simulado)

**Teste**: Simular webhook do Stripe

```bash
# Simular checkout.session.completed
stripe trigger checkout.session.completed

# Verificar logs
docker-compose logs api | grep "checkout_completed"
```

**✅ Checklist**:
- [ ] Log mostra: `checkout_completed_success`
- [ ] Sem erros de processamento

---

### 1.9 Customer Portal Session

**Teste**: Criar sessão do Customer Portal (requer stripe_customer_id)

```bash
# Só funciona se o usuário já tem stripe_customer_id
# (depois de completar um checkout)
curl -X POST http://localhost:8000/api/v1/subscriptions/portal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"return_url": "http://localhost:3000/settings/subscription"}' | jq .
```

**✅ Esperado**:
- Se sem customer_id: **400 Bad Request** "Nenhum cliente Stripe vinculado"
- Se com customer_id: `{"url": "https://billing.stripe.com/..."}`

---

### 1.10 Cancelar Subscription

```bash
curl -X POST http://localhost:8000/api/v1/subscriptions/cancel \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**✅ Esperado**:
- Se sem subscription paga: **400 Bad Request**
- Se com subscription: `{"message": "Assinatura cancelada..."}`

---

### 1.11 Histórico de Pagamentos

```bash
curl http://localhost:8000/api/v1/subscriptions/payments \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**✅ Esperado**: Array vazio `[]` (ou com pagamentos se houver)

---

## 🎨 PARTE 2: Testes de Frontend (30 min)

### 2.1 Página de Pricing

**URL**: http://localhost:3000/pricing

**✅ Checklist Visual**:
- [ ] Página carrega sem erros
- [ ] 3 cards de planos visíveis (Gratuito, Básico, Premium)
- [ ] Toggle mensal/anual funciona
- [ ] Preços mudam ao trocar toggle:
  - Mensal: R$ 9,90 / R$ 19,90
  - Anual: R$ 99 / R$ 199
- [ ] Badge "Recomendado" no Premium
- [ ] Plano atual está desabilitado (se logado)
- [ ] Footer com informações de trial e pagamento

---

### 2.2 Fluxo de Checkout

**Teste**: Clicar em "Escolher Básico"

**✅ Checklist**:
1. [ ] Botão "Escolher Básico" clicável
2. [ ] Loading state aparece (botão desabilitado)
3. [ ] Redirect para `checkout.stripe.com`
4. [ ] Checkout page mostra:
   - Produto correto (Mercado Esperto Básico)
   - Preço correto (R$ 9,90/mês ou R$ 99/ano)
   - Email pré-preenchido
5. [ ] Usar cartão teste: **4242 4242 4242 4242**
   - Qualquer CVV (ex: 123)
   - Qualquer data futura (ex: 12/30)
   - Qualquer nome
6. [ ] Clicar "Subscribe"
7. [ ] Redirect de volta para `/dashboard?payment=success`
8. [ ] Toast de sucesso aparece (se implementado)

---

### 2.3 Verificar Subscription Atualizada

**Após completar checkout**:

```bash
# No terminal
curl http://localhost:8000/api/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .subscription
```

**✅ Checklist**:
- [ ] `plan = "basic"` (ou "premium" se escolheu Premium)
- [ ] `status = "active"`
- [ ] `billing_cycle = "monthly"` (ou "yearly")
- [ ] `stripe_customer_id` está preenchido (começa com `cus_`)
- [ ] `stripe_subscription_id` está preenchido (começa com `sub_`)
- [ ] `current_period_end` está ~1 mês no futuro
- [ ] `invoice_limit = 5` (se Básico) ou `null` (se Premium)
- [ ] `analysis_limit = 5` (se Básico) ou `null` (se Premium)

---

### 2.4 Componente UsageBanner

**Onde testar**: Dashboard ou qualquer página com o banner

**Setup**: Fazer 1-2 uploads para ter dados de uso

**✅ Checklist Visual**:
- [ ] Banner aparece (verde/amarelo/vermelho dependendo do uso)
- [ ] Mostra "Plano Gratuito" ou "Plano Básico" correto
- [ ] Barra de progresso de "Notas fiscais": X / Y
- [ ] Barra de progresso de "Análises IA": X / Y
- [ ] Cor muda para amarelo quando ≥80%
- [ ] Cor muda para vermelho quando 100%
- [ ] Link "Ver planos" aparece quando ≥80%
- [ ] Banner NÃO aparece para plano Premium (ilimitado)

---

### 2.5 Componente TrialBanner

**Onde testar**: Dashboard (com usuário em trial)

**✅ Checklist Visual**:
- [ ] Banner aparece no topo (azul/amarelo/vermelho)
- [ ] Badge mostra "X dias restantes"
- [ ] Cor azul se >7 dias
- [ ] Cor amarela se 4-7 dias
- [ ] Cor vermelha se ≤3 dias
- [ ] Texto muda baseado na urgência
- [ ] Link "Escolher plano agora →" funciona
- [ ] Banner NÃO aparece para status "active" ou "expired"

---

### 2.6 Componente UpgradeModal

**Como testar**: Atingir limite de uploads (com feature flag ON)

**Setup**:
```bash
# Criar usuário novo
# Fazer 1 upload (limite do free)
# Tentar 2º upload → deve abrir modal
```

**✅ Checklist Visual**:
- [ ] Modal abre automaticamente ao atingir limite
- [ ] Ícone de raio (Zap) no topo
- [ ] Título "Limite Atingido"
- [ ] Mensagem clara sobre qual limite (notas ou análises)
- [ ] Box verde com benefícios do Premium
- [ ] Botão "Mais tarde" fecha modal
- [ ] Botão "Ver Planos" redireciona para `/pricing`
- [ ] ESC fecha modal
- [ ] Clicar fora fecha modal
- [ ] Body scroll bloqueado quando aberto
- [ ] Animação de entrada suave

---

### 2.7 Página Settings/Subscription

**URL**: http://localhost:3000/settings/subscription

**✅ Checklist Visual**:
1. [ ] Card de "Plano Atual" aparece
2. [ ] Mostra nome do plano correto
3. [ ] Badge de status correto (Trial/Ativo/Cancelado)
4. [ ] Ciclo de cobrança aparece (mensal/anual) se aplicável
5. [ ] Box azul de trial aparece se status = trial
6. [ ] Próxima cobrança aparece se subscription ativa
7. [ ] Stats de uso aparecem (2 cards):
   - Notas fiscais: X / Y
   - Análises IA: X / Y
8. [ ] Botão "Fazer Upgrade" aparece se free/trial
9. [ ] Botão "Gerenciar Pagamento" aparece se subscription paga
10. [ ] Botão "Cancelar Assinatura" aparece se ativa (texto vermelho)
11. [ ] Seção "Histórico de Pagamentos" aparece se houver pagamentos
12. [ ] Pagamentos mostram: valor, data, status com ícone correto

---

### 2.8 Fluxo de Cancelamento

**Teste**: Clicar em "Cancelar Assinatura"

**✅ Checklist**:
1. [ ] Modal de confirmação aparece
2. [ ] Título "Cancelar Assinatura?"
3. [ ] Mensagem explica que acesso continua até fim do período
4. [ ] Mostra data de término
5. [ ] Botão "Manter Assinatura" fecha modal
6. [ ] Botão "Confirmar Cancelamento" (vermelho):
   - Loading state aparece
   - API é chamada
   - Toast de sucesso aparece
   - Modal fecha
   - Página atualiza mostrando `cancelled_at` preenchido

---

### 2.9 Customer Portal

**Teste**: Clicar em "Gerenciar Pagamento"

**✅ Checklist**:
1. [ ] Botão habilitado apenas se `stripe_customer_id` existe
2. [ ] Loading state aparece
3. [ ] Redirect para `billing.stripe.com`
4. [ ] Portal mostra:
   - Subscription atual
   - Método de pagamento
   - Histórico de faturas
   - Opção de cancelar
   - Opção de atualizar cartão

---

## 🔄 PARTE 3: Testes de Integração E2E (30 min)

### 3.1 Fluxo Completo: Novo Usuário → Trial → Upgrade → Premium

**Cenário**: Simular jornada completa do usuário

```
1. Registrar novo usuário
   ✓ Recebe trial de 30 dias automaticamente
   ✓ Plano = free, Status = trial

2. Fazer 1 upload de nota fiscal
   ✓ Aceito (dentro do limite de 1)
   ✓ usage.invoices_used = 1

3. Tentar 2º upload
   ✓ Bloqueado com 429
   ✓ Modal de upgrade aparece no frontend

4. Acessar /pricing
   ✓ Ver 3 planos
   ✓ Escolher Premium Mensal

5. Completar checkout Stripe
   ✓ Usar cartão teste 4242...
   ✓ Webhook recebido
   ✓ Subscription atualizada para active

6. Verificar subscription
   ✓ plan = "premium"
   ✓ status = "active"
   ✓ invoice_limit = null (ilimitado)

7. Fazer múltiplos uploads
   ✓ Todos aceitos (sem limite)
```

**✅ Checklist**:
- [ ] Todo o fluxo completa sem erros
- [ ] Trial → Active transition funciona
- [ ] Limites são removidos após upgrade
- [ ] Webhooks processam corretamente

---

### 3.2 Teste de Idempotência de Webhooks

**Teste**: Stripe pode enviar o mesmo webhook múltiplas vezes

```bash
# Simular o mesmo evento 3x
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed

# Verificar banco de dados
docker-compose exec postgres psql -U user -d db -c "
  SELECT COUNT(*) FROM payments;
"
```

**✅ Esperado**: Apenas 1 payment registrado (não 3)

---

### 3.3 Teste de Múltiplos Usuários Simultâneos

**Teste**: 3 usuários fazem upload ao mesmo tempo

```bash
# Terminal 1
TOKEN1=$(...)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN1" -F "files=@invoice1.jpg" &

# Terminal 2
TOKEN2=$(...)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN2" -F "files=@invoice2.jpg" &

# Terminal 3
TOKEN3=$(...)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN3" -F "files=@invoice3.jpg" &

wait
```

**✅ Checklist**:
- [ ] Todos 3 uploads processam sem race condition
- [ ] Contadores incrementam corretamente para cada usuário
- [ ] Sem deadlocks ou timeouts

---

### 3.4 Teste de Expiração de Trial

**Teste**: Trial expira após 30 dias

```bash
# Simular expiração (modificar trial_end no banco)
docker-compose exec postgres psql -U user -d db -c "
  UPDATE subscriptions
  SET trial_end = NOW() - INTERVAL '1 day'
  WHERE status = 'trial';
"

# Tentar fazer upload
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@invoice.jpg" \
  -w "\nHTTP: %{http_code}\n"
```

**✅ Esperado**:
- [ ] Retorna **403 Forbidden**
- [ ] Mensagem: "Assinatura expired. Renove para continuar."

---

### 3.5 Teste de Cancelamento com Acesso Mantido

**Cenário**: Cancelar subscription mas manter acesso até fim do período

```bash
# 1. Cancelar
curl -X POST http://localhost:8000/api/v1/subscriptions/cancel \
  -H "Authorization: Bearer $TOKEN"

# 2. Verificar subscription
curl http://localhost:8000/api/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .subscription

# 3. Tentar upload (deve funcionar ainda)
curl -X POST http://localhost:8000/api/v1/invoices/upload/photos \
  -H "Authorization: Bearer $TOKEN" -F "files=@invoice.jpg"
```

**✅ Checklist**:
- [ ] `cancelled_at` está preenchido
- [ ] `current_period_end` ainda no futuro
- [ ] `is_active = true` (ainda ativo até fim do período)
- [ ] Upload ainda funciona (sem limite)

---

## 🐛 PARTE 4: Testes de Edge Cases (20 min)

### 4.1 Usuário sem Subscription

**Teste**: Deletar subscription e tentar acessar

```bash
# Deletar subscription
docker-compose exec postgres psql -U user -d db -c "
  DELETE FROM subscriptions WHERE user_id = 'UUID_DO_USUARIO';
"

# Tentar acessar
curl http://localhost:8000/api/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP: %{http_code}\n"
```

**✅ Esperado**:
- [ ] Retorna **404 Not Found**
- [ ] Mensagem: "Nenhuma assinatura encontrada"

---

### 4.2 Checkout com Price ID Inválido

**Teste**: Configurar price ID errado

```bash
# Temporariamente mudar .env
STRIPE_BASIC_MONTHLY_PRICE_ID=price_invalid

# Reiniciar
docker-compose restart api

# Tentar checkout
curl -X POST http://localhost:8000/api/v1/subscriptions/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "basic",
    "billing_cycle": "monthly",
    "success_url": "http://localhost:3000/dashboard",
    "cancel_url": "http://localhost:3000/pricing"
  }' -w "\nHTTP: %{http_code}\n"
```

**✅ Esperado**: Erro do Stripe (price não existe)

---

### 4.3 Webhook com Signature Inválida

**Teste**: Enviar webhook sem signature válida

```bash
curl -X POST http://localhost:8000/api/v1/subscriptions/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: invalid" \
  -d '{"type":"test"}' \
  -w "\nHTTP: %{http_code}\n"
```

**✅ Esperado**:
- [ ] Retorna **400 Bad Request**
- [ ] Mensagem: "Invalid signature"
- [ ] Log mostra: "stripe_webhook_invalid_signature"

---

### 4.4 Upgrade de Free → Premium (skip Basic)

**Teste**: Pular direto para Premium sem passar por Básico

```bash
# Criar usuário novo (trial)
# Ir direto para checkout Premium
curl -X POST http://localhost:8000/api/v1/subscriptions/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "premium",
    "billing_cycle": "yearly",
    "success_url": "http://localhost:3000/dashboard",
    "cancel_url": "http://localhost:3000/pricing"
  }' | jq .
```

**✅ Checklist**:
- [ ] Checkout criado com sucesso
- [ ] Mostra Premium Anual (R$ 199)
- [ ] Após completar, `plan = "premium"`
- [ ] Limites removidos (invoices/analyses = null)

---

### 4.5 Downgrade de Premium → Basic

**Teste**: Customer Portal permite downgrade?

1. Fazer upgrade para Premium
2. Abrir Customer Portal
3. Tentar trocar plano para Basic

**✅ Esperado**: Stripe permite troca (se configurado no dashboard)

---

## 🚀 PARTE 5: Smoke Tests Produção (10 min)

**⚠️ Só executar após deploy em produção com `sk_live_...`**

### 5.1 Health Check Produção

```bash
curl https://api.seudominio.com/health
```

**✅ Esperado**: `{"status":"ok",...}`

---

### 5.2 Feature Flag Produção

```bash
curl https://api.seudominio.com/features | jq .subscription_system
```

**✅ Esperado**: `{"enabled":true,...}`

---

### 5.3 Webhook Produção

Verificar no Stripe Dashboard:
- URL: https://dashboard.stripe.com/webhooks
- Status: **✓ Enabled**
- Events: 5 eventos configurados
- Recent deliveries: Sem erros 4xx/5xx

---

### 5.4 Registro Real

Criar usuário real (com seu email):

```bash
# Via frontend
# https://seudominio.com/register

# Verificar que recebeu trial
curl https://api.seudominio.com/api/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .subscription.status
```

**✅ Esperado**: `"trial"`

---

### 5.5 Checkout Real (valor mínimo)

**⚠️ Usar cartão real para testar cobrança**

1. Acessar https://seudominio.com/pricing
2. Escolher plano Básico Mensal (R$ 9,90)
3. Completar checkout com cartão real
4. Verificar email de confirmação do Stripe
5. Cancelar imediatamente (se for só teste)

**✅ Checklist**:
- [ ] Cobrança aparece no Stripe Dashboard
- [ ] Email de confirmação recebido
- [ ] Subscription ativa no backend
- [ ] Limites atualizados

---

## 📊 PARTE 6: Monitoring (Contínuo)

### 6.1 Logs de Subscription

```bash
# Ver todas operações de subscription
docker-compose logs api | grep -E "subscription|checkout|stripe"

# Ver webhooks processados
docker-compose logs api | grep "stripe_webhook"

# Ver erros
docker-compose logs api | grep -i error | grep subscription
```

---

### 6.2 Métricas no Banco

```sql
-- Distribuição de planos
SELECT plan, COUNT(*) as users
FROM subscriptions
GROUP BY plan
ORDER BY users DESC;

-- Distribuição de status
SELECT status, COUNT(*) as users
FROM subscriptions
GROUP BY status
ORDER BY users DESC;

-- Conversão trial → active
SELECT
  COUNT(CASE WHEN status = 'trial' THEN 1 END) as trials,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
  ROUND(
    COUNT(CASE WHEN status = 'active' THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN status = 'trial' THEN 1 END), 0) * 100,
    2
  ) as conversion_rate_percent
FROM subscriptions;

-- Uso médio por plano
SELECT
  s.plan,
  ROUND(AVG(u.invoices_count), 2) as avg_invoices,
  ROUND(AVG(u.ai_analyses_count), 2) as avg_analyses,
  COUNT(DISTINCT u.user_id) as active_users
FROM subscriptions s
LEFT JOIN usage_records u ON u.user_id = s.user_id
WHERE u.year = EXTRACT(YEAR FROM NOW())
  AND u.month = EXTRACT(MONTH FROM NOW())
GROUP BY s.plan;

-- Receita estimada (mensal)
SELECT
  SUM(CASE
    WHEN plan = 'basic' AND billing_cycle = 'monthly' THEN 9.90
    WHEN plan = 'basic' AND billing_cycle = 'yearly' THEN 99.00 / 12
    WHEN plan = 'premium' AND billing_cycle = 'monthly' THEN 19.90
    WHEN plan = 'premium' AND billing_cycle = 'yearly' THEN 199.00 / 12
    ELSE 0
  END) as monthly_recurring_revenue
FROM subscriptions
WHERE status = 'active';
```

---

### 6.3 Stripe Dashboard

Verificar diariamente:

1. **Subscriptions**: https://dashboard.stripe.com/subscriptions
   - [ ] Crescimento consistente
   - [ ] Taxa de churn baixa (<5%)

2. **Failed Payments**: https://dashboard.stripe.com/payments?status=failed
   - [ ] Investigar falhas recorrentes
   - [ ] Enviar emails de retry

3. **Webhooks**: https://dashboard.stripe.com/webhooks
   - [ ] Taxa de sucesso >99%
   - [ ] Investigar falhas 4xx/5xx

4. **Revenue**: https://dashboard.stripe.com/revenue
   - [ ] MRR (Monthly Recurring Revenue) crescendo
   - [ ] LTV (Lifetime Value) positivo

---

## ✅ Checklist Master

### Backend
- [ ] Migration aplicada sem erros
- [ ] Todas tabelas criadas (subscriptions, payments, usage_records)
- [ ] Feature flag funciona (ON/OFF)
- [ ] Auto-trial no registro funciona
- [ ] Limites aplicados corretamente (quando ON)
- [ ] Checkout session criada com sucesso
- [ ] Webhooks recebidos e processados
- [ ] Idempotência de webhooks funciona
- [ ] Customer Portal funciona
- [ ] Cancelamento funciona (acesso mantido)

### Frontend
- [ ] Página /pricing carrega e funciona
- [ ] Checkout redirect funciona
- [ ] UsageBanner aparece corretamente
- [ ] TrialBanner aparece e muda cor
- [ ] UpgradeModal abre ao atingir limite
- [ ] Página /settings/subscription completa
- [ ] Histórico de pagamentos aparece
- [ ] Cancelamento com confirmação funciona

### Integração
- [ ] Fluxo E2E Trial → Upgrade → Premium completo
- [ ] Múltiplos usuários simultâneos funciona
- [ ] Expiração de trial bloqueia acesso
- [ ] Cancelamento mantém acesso até fim

### Produção
- [ ] Chaves live configuradas
- [ ] Webhook de produção configurado
- [ ] Smoke tests passaram
- [ ] Monitoramento ativo

---

## 🎯 Critérios de Aprovação

Para considerar o sistema **pronto para produção**, todos os seguintes devem estar ✅:

1. **Funcionalidade Core** (30 pontos):
   - [ ] Auto-trial funciona (5 pts)
   - [ ] Limites aplicados corretamente (10 pts)
   - [ ] Checkout Stripe funciona (10 pts)
   - [ ] Webhooks processam sem erro (5 pts)

2. **User Experience** (20 pontos):
   - [ ] UI sem bugs visuais (5 pts)
   - [ ] Fluxo E2E suave (10 pts)
   - [ ] Mensagens de erro claras (5 pts)

3. **Segurança** (20 pontos):
   - [ ] Webhook signature válida (10 pts)
   - [ ] Limites não bypassáveis (10 pts)

4. **Confiabilidade** (20 pontos):
   - [ ] Idempotência funciona (10 pts)
   - [ ] Sem race conditions (10 pts)

5. **Monitoring** (10 pontos):
   - [ ] Logs funcionais (5 pts)
   - [ ] Métricas no banco (5 pts)

**Score mínimo**: 85/100 para deploy em produção

---

**Boa sorte nos testes!** 🚀

Se encontrar bugs, documente:
- Descrição do problema
- Steps to reproduce
- Expected vs Actual behavior
- Logs relevantes
- Severidade (Critical/High/Medium/Low)
