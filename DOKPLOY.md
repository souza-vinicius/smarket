# Deploy no Dokploy

Este guia explica como fazer o deploy da aplicação SMarket no Dokploy.

## Pré-requisitos

1. Instância do Dokploy configurada
2. Acesso ao painel do Dokploy
3. Repositório no GitHub/GitLab conectado ao Dokploy

## Configuração no Dokploy

### 1. Criar Projeto

1. Acesse o painel do Dokploy
2. Clique em "Create Project"
3. Nome: `SMarket`
4. Descrição: `Analisador de Notas Fiscais`

### 2. Criar Aplicação (Backend)

1. Dentro do projeto, clique em "Create Service" → "Application"
2. Configure:
   - **Name**: `smarket-api`
   - **Type**: `Docker`
   - **Repository**: Seu repositório Git
   - **Branch**: `main` (ou a branch desejada)
   - **Build Path**: `apps/api`
   - **Dockerfile**: `Dockerfile`
   - **Port**: `8000`

### 3. Configurar Variáveis de Ambiente

No painel da aplicação, vá em "Environment" e adicione:

```env
DEBUG=false
APP_NAME=SMarket API
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/smarket
SECRET_KEY=sua-chave-secreta-super-segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
OPENAI_API_KEY=sk-sua-chave-openai
SEFAZ_API_URL=https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica
ALLOWED_ORIGINS=https://seu-frontend.com
```

**Nota**: O Dokploy pode fornecer automaticamente a `DATABASE_URL` se você criar um banco PostgreSQL através dele.

### 4. Criar Banco de Dados (Opcional)

1. No projeto, clique em "Create Service" → "Database"
2. Escolha "PostgreSQL"
3. Configure:
   - **Name**: `smarket-db`
   - **Database**: `smarket`
   - **User**: `smarket`
   - **Password**: senha segura
4. Após criar, copie a `DATABASE_URL` fornecida e use nas variáveis de ambiente da API

### 5. Configurar Domínio

1. Na aplicação `smarket-api`, vá em "Domains"
2. Clique em "Add Domain"
3. Configure:
   - **Host**: `api.seudominio.com` (ou subdomínio desejado)
   - **Port**: `8000`
   - **HTTPS**: Ativado (recomendado)

### 6. Deploy

1. Na aplicação, clique em "Deploy"
2. O Dokploy irá:
   - Clonar o repositório
   - Buildar a imagem Docker
   - Executar as migrations (alembic)
   - Iniciar a aplicação

3. Acompanhe os logs em "Logs"

## Estrutura de Deploy

```
Dokploy Project: SMarket
├── Service: smarket-api (Docker)
│   ├── Port: 8000
│   ├── Domain: api.seudominio.com
│   └── Env: DATABASE_URL, SECRET_KEY, etc.
│
└── Service: smarket-db (PostgreSQL)
    └── Port: 5432 (internal)
```

## Comandos Úteis

### Verificar Health
```bash
curl https://api.seudominio.com/health
```

### Ver Logs
Acesse a aba "Logs" no painel do Dokploy ou use:
```bash
dokploy-app logs smarket-api
```

### Redeploy
```bash
dokploy-app deploy smarket-api
```

## Troubleshooting

### Erro de conexão com banco
- Verifique se a `DATABASE_URL` está correta
- Confirme que o banco está rodando
- Verifique se a rede interna do Dokploy permite comunicação

### Erro nas migrations
- Verifique os logs da aplicação
- Acesse o container e rode manualmente:
  ```bash
  alembic upgrade head
  ```

### Porta em uso
- Certifique-se de que a porta 8000 está configurada corretamente no Dokploy
- Verifique se não há conflitos com outros serviços

## Atualizações

Para atualizar a aplicação:

1. Faça push das alterações para o repositório
2. No Dokploy, clique em "Deploy" novamente
3. O Dokploy fará o build e deploy automaticamente

Ou configure deploy automático (webhook) no GitHub/GitLab.
