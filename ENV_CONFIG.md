# Configuração via Variáveis de Ambiente

Este documento explica como configurar o Mercado Esperto usando variáveis de ambiente, sem precisar modificar o código-fonte.

## 📋 Setup Inicial

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Edite o arquivo `.env` com suas configurações**

3. **Reinicie os containers Docker:**
   ```bash
   docker-compose restart
   ```

## 🔧 Variáveis de Ambiente Disponíveis

### Aplicação

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DEBUG` | `false` | Ativa modo debug |
| `APP_NAME` | `Mercado Esperto API` | Nome da aplicação |

### Portas

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `API_PORT` | `8000` | Porta do FastAPI backend |
| `WEB_PORT` | `3000` | Porta do Next.js frontend |

**Usar portas customizadas:**
```bash
# .env
API_PORT=8080
WEB_PORT=3001
```

### Banco de Dados

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | `postgresql+asyncpg://smarket:smarket_password@postgres:5432/smarket` | Connection string do PostgreSQL |
| `DB_ECHO` | `false` | Exibe queries SQL nos logs |
| `POSTGRES_USER` | `smarket` | Usuário do PostgreSQL |
| `POSTGRES_PASSWORD` | `smarket_password` | Senha do PostgreSQL |
| `POSTGRES_DB` | `smarket` | Nome do banco |

### Autenticação JWT

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SECRET_KEY` | *obrigatório* | Chave secreta JWT |
| `ALGORITHM` | `HS256` | Algoritmo JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Tempo de expiração do token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Tempo de expiração do refresh token |

**Gerar chave segura:**
```bash
openssl rand -hex 32
```

### Provedores de IA (Configure pelo menos um)

#### OpenAI
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OPENAI_API_KEY` | - | API key da OpenAI |

**Onde obter:** https://platform.openai.com/api-keys

#### Google Gemini
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `GEMINI_API_KEY` | - | API key do Google Gemini |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Modelo a ser usado |

**Onde obter:** https://makersuite.google.com/app/apikey

**Modelos disponíveis:**
- `gemini-1.5-flash` - Rápido e eficiente
- `gemini-1.5-pro` - Maior qualidade
- `gemini-2.0-flash` - Versão mais recente

#### Anthropic Claude
| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ANTHROPIC_API_KEY` | - | API key da Anthropic |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Modelo a ser usado |

**Onde obter:** https://console.anthropic.com/

**Modelos disponíveis:**
- `claude-3-5-sonnet-20241022` - Melhor equilíbrio qualidade/velocidade
- `claude-3-haiku-20240307` - Mais rápido e econômico
- `claude-3-opus-20240229` - Máxima qualidade

### Cache e Serviços Externos

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `REDIS_URL` | `redis://redis:6379/0` | Connection string do Redis |
| `SEFAZ_API_URL` | `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica` | Endpoint da Sefaz |

### CORS

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:8000` | Origins permitidas (separadas por vírgula) |

**Ajustar se usar portas customizadas:**
```bash
# Para WEB_PORT=3001 e API_PORT=8080
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8080
```

### Frontend (Next.js)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL da API para o frontend |
| `NODE_ENV` | `development` | Ambiente Node.js |

## 🚀 Exemplos de Configuração

### Desenvolvimento Local

```bash
# .env
DEBUG=true
DB_ECHO=true
DATABASE_URL=postgresql+asyncpg://smarket:smarket_password@localhost:5432/smarket
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-flash
SECRET_KEY=$(openssl rand -hex 32)
```

### Produção

```bash
# .env
DEBUG=false
DB_ECHO=false
DATABASE_URL=postgresql+asyncpg://user:pass@production-db:5432/smarket
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
SECRET_KEY=<secure-key-here>
ALLOWED_ORIGINS=https://seudominio.com.br
NEXT_PUBLIC_API_URL=https://api.seudominio.com.br
```

### Resolver Conflito de Portas (Dokploy/Produção)

```bash
# .env
# Se as portas padrão (3000, 8000) estão ocupadas
API_PORT=8001
WEB_PORT=3001

# Atualizar CORS correspondentemente
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8001
```

### Usar múltiplos provedores de IA (Fallback)

```bash
# .env
# O sistema tentará na ordem: Gemini -> OpenAI -> Anthropic
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 🔄 Aplicar Mudanças

Após modificar o `.env`:

```bash
# Reiniciar apenas a API
docker-compose restart api

# Ou reiniciar todos os serviços
docker-compose restart

# Ou rebuild completo (necessário se mudou dependências)
docker-compose up -d --build
```

## ⚠️ Segurança

1. **Nunca commite o arquivo `.env`** (já está no `.gitignore`)
2. **Use chaves fortes para `SECRET_KEY`**
3. **Em produção, use senhas complexas para o banco de dados**
4. **Rotacione suas API keys regularmente**
5. **Configure CORS adequadamente em produção**

## 📝 Notas

- Todas as configurações têm valores padrão sensatos
- Se uma variável não for definida no `.env`, o valor padrão será usado
- Variáveis com `:-` no `docker-compose.yml` têm fallback automático
- API keys podem ser deixadas vazias se não for usar aquele provedor
