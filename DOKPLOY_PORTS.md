# Configuração de Portas no Dokploy

Se está recebendo o erro `Bind for 0.0.0.0:3000 failed: port is already allocated`, a porta está em uso. A solução é ajustar as portas via variáveis de ambiente.

## 🚀 Solução Rápida

No Dokploy, na aba **Environment**, adicione:

```bash
API_PORT=8001
WEB_PORT=3001
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8001
```

## 📋 Alternativas de Porta

**Para WEB (Next.js frontend):**
- Padrão: `3000`
- Alternativas: `3001`, `3002`, `4000`, `5000`, etc.

**Para API (FastAPI backend):**
- Padrão: `8000`
- Alternativas: `8001`, `8002`, `8080`, `9000`, etc.

## 🔧 Passos no Dokploy

1. **Abra o painel do Dokploy**
2. **Vá para sua aplicação SMarket**
3. **Clique em Environment (ou Settings)**
4. **Adicione/modifique:**
   ```
   API_PORT=8001
   WEB_PORT=3001
   ```
5. **IMPORTANTE:** Também atualize `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8001
   ```
6. **Se usar domínios custom**, atualize para:
   ```
   ALLOWED_ORIGINS=https://seu-dominio.com,https://api.seu-dominio.com
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   ```
7. **Salve e faça redeploy**

## ✅ Verificar se Funcionou

Após o deploy, teste:

```bash
# Web
curl http://localhost:3001

# API
curl http://localhost:8001/api/v1/debug/providers
```

## 📚 Docs Completos

Veja [ENV_CONFIG.md](./ENV_CONFIG.md) para todas as variáveis disponíveis.

## ⚠️ Notas

- **Não altere `PYTHONUNBUFFERED`** ou outras configurações da aplicação
- **ALLOWED_ORIGINS é crítico** para evitar erros CORS
- Se usar **domínios customizados**, configure ambos em ALLOWED_ORIGINS
- Portas **devem ser numéricas** e > 1024 em produção
