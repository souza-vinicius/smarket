# Debug: Erro no Enriquecimento de CNPJ

## Erro Recebido
```
Erro ao consultar CNPJ. Tente novamente.
```

## Checklist de Troubleshooting

### 1. Verificar se o Backend Está Rodando

```bash
# Check if API is running
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","version":"1.0.0"}
```

Se não responder:
```bash
cd apps/api
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Verificar se o Endpoint Existe

```bash
# Test the enrichment endpoint directly (replace TOKEN with your JWT)
TOKEN="your-jwt-token-here"

curl -X GET "http://localhost:8000/api/v1/invoices/cnpj/00000000000191/enrich" \
  -H "Authorization: Bearer $TOKEN" \
  -v
```

**Como obter o TOKEN:**
1. Abra DevTools (F12)
2. Vá para Application → Local Storage → http://localhost:3000
3. Procure por `token` ou `access_token`
4. Copie o valor

### 3. Testar Endpoint com Token

```bash
# Replace YOUR_TOKEN with actual token
curl -X GET "http://localhost:8000/api/v1/invoices/cnpj/00000000000191/enrich" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Respostas Esperadas:**

✅ Sucesso (HTTP 200):
```json
{
  "success": true,
  "cnpj": "00.000.000/0001-91",
  "suggested_name": "BANCO DO BRASIL SA",
  "data": {...}
}
```

❌ Não autenticado (HTTP 401):
```json
{
  "detail": "Not authenticated"
}
```

❌ Token inválido (HTTP 403):
```json
{
  "detail": "Invalid authentication credentials"
}
```

### 4. Verificar Logs do Backend

```bash
# Se rodando com docker-compose
docker-compose logs -f api

# Se rodando manualmente
# Verifique o terminal onde uvicorn está rodando
```

**Procure por:**
- `Enriching CNPJ: ...`
- `✓ CNPJ enriched successfully`
- Erros ou exceções

### 5. Verificar Console do Browser

1. Abra DevTools (F12)
2. Vá para Console
3. Clique no botão 🔍
4. Procure por:
   - `Enriching CNPJ: ...`
   - `Request URL: ...`
   - Erros em vermelho

### 6. Verificar Network Tab

1. Abra DevTools (F12)
2. Vá para Network
3. Clique no botão 🔍
4. Procure por requisição para `/cnpj/.../ enrich`
5. Clique na requisição
6. Veja:
   - **Status Code**: Deve ser 200
   - **Request URL**: Deve ser correto
   - **Request Headers**: Deve ter `Authorization: Bearer ...`
   - **Response**: Deve ter os dados ou erro específico

### 7. Verificar Feature Flags

```bash
curl http://localhost:8000/features
```

**Verifique se:**
- `cnpj_features.master_enabled`: `true`
- `cnpj_features.enrichment.enabled`: `true`

Se `false`, habilite no `.env`:
```bash
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_ENRICHMENT=true
```

E reinicie o backend:
```bash
# Ctrl+C para parar
# Depois rode novamente
uvicorn src.main:app --reload
```

### 8. Testar Serviço Diretamente

```bash
cd /Users/vinicius/code/smarket
python test_cnpj_endpoint.py
```

**Resultado esperado:**
```
✓ Enrichment successful!
Source: brasilapi
Razão Social: BANCO DO BRASIL SA
```

## Possíveis Causas e Soluções

### Causa 1: Backend Não Está Rodando

**Sintoma**: Network error, conexão recusada

**Solução**:
```bash
cd apps/api
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Causa 2: Não Autenticado

**Sintoma**: HTTP 401 ou 403

**Solução**:
1. Faça login novamente
2. Token pode ter expirado
3. Verifique se token está sendo enviado (DevTools → Network → Headers)

### Causa 3: Endpoint Não Registrado

**Sintoma**: HTTP 404

**Solução**:
1. Verifique se adicionou o endpoint em `apps/api/src/routers/invoices.py`
2. Reinicie o servidor
3. Verifique se não há erros de sintaxe

### Causa 4: Feature Flag Desabilitada

**Sintoma**: HTTP 503 - "Serviço desabilitado"

**Solução**:
```bash
# Adicione no .env
ENABLE_CNPJ_ENRICHMENT=true
ENABLE_CNPJ_FEATURES=true

# Reinicie o backend
```

### Causa 5: APIs Públicas Indisponíveis

**Sintoma**: HTTP 500 - "Falha ao consultar dados"

**Solução**:
- BrasilAPI ou ReceitaWS podem estar offline temporariamente
- Aguarde alguns minutos e tente novamente
- Verifique se tem acesso à internet

### Causa 6: CORS

**Sintoma**: Erro de CORS no console do browser

**Solução**:
Verifique ALLOWED_ORIGINS no `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000
```

## Script de Teste Completo

```bash
#!/bin/bash

echo "===== CNPJ Enrichment Debug ====="
echo ""

echo "1. Testing backend health..."
curl -s http://localhost:8000/health | jq '.'
echo ""

echo "2. Testing feature flags..."
curl -s http://localhost:8000/features | jq '.cnpj_features'
echo ""

echo "3. Testing enrichment service..."
python test_cnpj_endpoint.py
echo ""

echo "4. Testing endpoint (need token)..."
echo "   Get token from DevTools → Application → Local Storage"
echo "   Then run:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8000/api/v1/invoices/cnpj/00000000000191/enrich"
echo ""

echo "===== Debug Complete ====="
```

## Se Ainda Não Funcionar

1. Reinicie tudo:
   ```bash
   # Backend
   cd apps/api
   # Ctrl+C para parar
   uvicorn src.main:app --reload
   
   # Frontend (em outro terminal)
   cd apps/web
   # Ctrl+C para parar
   npm run dev
   ```

2. Limpe cache do browser (Ctrl+Shift+Delete)

3. Faça logout e login novamente

4. Verifique logs completos:
   - Backend: Terminal onde uvicorn está rodando
   - Frontend: DevTools Console + Network

5. Compartilhe os logs/erros específicos para debug mais detalhado

---

**Nota**: Os logs adicionados no código vão aparecer no Console do browser e ajudar a identificar o problema exato.
