# Mercado Esperto - Analista de Compras Inteligente

Mercado Esperto é um aplicativo brasileiro de análise de notas fiscais (NF-e/NFC-e) que utiliza inteligência artificial para fornecer insights sobre suas compras e ajudá-lo a economizar dinheiro.

## 🚀 Funcionalidades

### Backend (FastAPI)
- ✅ Autenticação JWT completa
- ✅ Upload de notas fiscais via XML e QR Code
- ✅ Parser automático de notas fiscais brasileiras
- ✅ **Serviço de IA com OpenAI GPT-4o-mini**
- ✅ Geração automática de insights após cada upload
- ✅ Análise de preços acima da média
- ✅ Insights por categoria de gastos
- ✅ Análise de estabelecimentos
- ✅ Dashboard com resumo financeiro
- ✅ Tendências de gastos
- ✅ Insights por merchant

### Frontend (Next.js)
- ✅ Dashboard interativo com cards de resumo
- ✅ Visualização de insights recentes
- ✅ Design responsivo com Tailwind CSS
- ✅ Interface moderna e intuitiva
- ✅ Ações rápidas para upload de notas

## 🏗️ Arquitetura

```
smarket/
├── apps/
│   ├── api/              # Backend FastAPI
│   │   ├── src/
│   │   │   ├── models/     # SQLAlchemy ORM models
│   │   │   ├── schemas/    # Pydantic schemas
│   │   │   ├── routers/     # API endpoints
│   │   │   ├── services/    # Business logic (AI analyzer)
│   │   │   ├── parsers/     # XML/QR Code parsers
│   │   │   └── utils/       # Helper functions
│   │   ├── tests/       # Pytest tests
│   │   └── Dockerfile
│   └── web/              # Frontend Next.js
│       ├── src/
│       │   ├── app/        # Next.js pages
│       │   ├── components/  # React components
│       │   ├── lib/         # Utilities
│       │   ├── hooks/       # Custom hooks
│       │   └── types/       # TypeScript types
│       └── Dockerfile
├── docker-compose.yml    # Orchestration
├── .env.example        # Environment variables template
└── README.md
```

## 🛠️ Tecnologias

### Backend
- **FastAPI 0.109.0** - Framework web assíncrono
- **SQLAlchemy 2.0.25** - ORM com suporte async
- **PostgreSQL** - Banco de dados
- **OpenAI GPT-4o-mini** - Análise inteligente
- **Pydantic v2** - Validação de dados
- **Alembic** - Migrations de banco

### Frontend
- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de dados
- **Recharts** - Gráficos e visualizações

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Multi-stage builds** - Otimização de imagens

## 📋 Pré-requisitos

- Docker e Docker Compose
- Python 3.11+ (para desenvolvimento local)
- Node.js 18+ (para desenvolvimento local)
- Chave da API OpenAI

## 🚀 Início Rápido

### 1. Clone o repositório

```bash
git clone <repository-url>
cd smarket
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure as credenciais necessárias. **Todas as configurações podem ser feitas através de variáveis de ambiente** - não é necessário modificar o código.

**📖 Veja o guia completo:** [ENV_CONFIG.md](ENV_CONFIG.md)

Configurações mínimas obrigatórias:
- `SECRET_KEY` - Chave secreta para JWT (gerar com `openssl rand -hex 32`)
- Pelo menos uma API key de IA: `GEMINI_API_KEY`, `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`

### 3. Inicie os serviços com Docker

```bash
docker-compose up -d
```

Isso iniciará:
- **API** em `http://localhost:8000`
- **Frontend** em `http://localhost:3000`
- **PostgreSQL** em `localhost:5433`

### 4. Acesse a aplicação

Abra seu navegador em `http://localhost:3000`

## 📚 Documentação da API

A documentação interativa da API está disponível em:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔧 Desenvolvimento Local

### Backend

```bash
cd apps/api

# Instalar dependências
pip install -r requirements.txt

# Executar migrações
alembic upgrade head

# Iniciar servidor de desenvolvimento
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd apps/web

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🧪 Testes

### Backend

```bash
cd apps/api

# Executar todos os testes
pytest

# Executar com coverage
pytest --cov=src --cov-report=term-missing

# Executar teste específico
pytest tests/test_auth.py::test_register_user
```

## 📊 Tipos de Análises Geradas

### 1. Price Alerts (Alertas de Preço)
Detecta quando você paga mais caro que a média histórica:
- "Você pagou R$ 25,90 pelo arroz, 30% acima da média de R$ 19,90"

### 2. Category Insights (Insights por Categoria)
Analisa padrões de gastos por categoria:
- "Seus gastos com alimentos estão 40% acima da média dos últimos 3 meses"

### 3. Merchant Patterns (Padrões por Estabelecimento)
Compara preços entre diferentes estabelecimentos:
- "O ticket médio neste mercado é 25% maior que a categoria"

### 4. Summary (Resumo)
Fornece um resumo inteligente da compra:
- "Visão geral da compra com destaques e dicas de economia"

## 🔐 Segurança

- Autenticação JWT com tokens de acesso e refresh
- Senhas hasheadas com bcrypt
- CORS configurado para produção
- Containers Docker executam como usuário não-root
- Health checks implementados para monitoramento

## 🚀 Deploy

### Docker Compose (Produção)

```bash
# Build e iniciar todos os serviços
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v
```

### Variáveis de Ambiente de Produção

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://user:password@host:port/db
SECRET_KEY=<strong-secret-key>
OPENAI_API_KEY=sk-<your-openai-key>
ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## 📈 Roadmap

### MVP (Atual)
- [x] Backend básico com autenticação
- [x] Upload de notas fiscais (XML/QR Code)
- [x] Serviço de IA para análises
- [x] Dashboard básico
- [x] Insights automáticos

### Próximas Funcionalidades
- [ ] Página de tendências de gastos
- [ ] Página de comparação de preços
- [ ] Gráficos interativos
- [ ] Filtros avançados
- [ ] Exportação de dados (CSV/PDF)
- [ ] Modo escuro
- [ ] Notificações push/email
- [ ] Previsão de compras recorrentes
- [ ] Metas de economia

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👥 Suporte

Para questões, sugestões ou contribuições:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

Desenvolvido com ❤️ para ajudar brasileiros a economizar dinheiro
