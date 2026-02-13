# Plano do Backend - Mercado Esperto API

## Visão Geral

Backend em Python com FastAPI para processamento de notas fiscais, análise de dados e geração de insights inteligentes.

## Estrutura de Pastas

```
apps/api/
├── src/
│   ├── __init__.py
│   ├── main.py                 # Entry point FastAPI
│   ├── config.py               # Configurações (env vars)
│   ├── database.py             # Conexão PostgreSQL
│   ├── dependencies.py         # Injeção de dependências
│   │
│   ├── models/                 # SQLAlchemy Models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── invoice.py
│   │   ├── product.py
│   │   ├── category.py
│   │   └── analysis.py
│   │
│   ├── schemas/                # Pydantic Schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── invoice.py
│   │   ├── product.py
│   │   ├── category.py
│   │   └── analysis.py
│   │
│   ├── routers/                # API Routes
│   │   ├── __init__.py
│   │   ├── auth.py             # Autenticação JWT
│   │   ├── users.py            # CRUD usuários
│   │   ├── invoices.py         # Upload e processamento
│   │   ├── products.py         # Produtos e categorias
│   │   ├── categories.py       # Gestão de categorias
│   │   └── analysis.py         # Análises e insights
│   │
│   ├── services/               # Lógica de negócio
│   │   ├── __init__.py
│   │   ├── invoice_service.py
│   │   ├── product_service.py
│   │   ├── analysis_service.py
│   │   └── auth_service.py
│   │
│   ├── parsers/                # Parsers de notas fiscais
│   │   ├── __init__.py
│   │   ├── xml_parser.py       # Parser XML NF-e/NFC-e
│   │   ├── qrcode_parser.py    # Consulta QR Code Sefaz
│   │   └── pdf_parser.py       # OCR para PDFs
│   │
│   ├── ai/                     # Integração com OpenAI
│   │   ├── __init__.py
│   │   ├── categorizer.py      # Categorização de produtos
│   │   └── insights.py         # Geração de insights
│   │
│   └── utils/                  # Utilitários
│       ├── __init__.py
│       ├── validators.py
│       └── formatters.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   ├── env.py
│   └── alembic.ini
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_invoices.py
│   └── test_parsers.py
│
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
└── .env.example
```

## Dependências (requirements.txt)

```txt
# FastAPI e servidor
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Banco de dados
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
asyncpg==0.29.0

# Validação e serialização
pydantic==2.5.3
pydantic-settings==2.1.0
email-validator==2.1.0

# Autenticação
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# HTTP client
httpx==0.26.0

# Parser XML
lxml==5.1.0
xmltodict==0.13.0

# OCR e PDF
PyPDF2==3.0.1
pytesseract==0.3.10
Pillow==10.2.0
pdf2image==1.17.0

# OpenAI
openai==1.10.0

# Utilitários
python-dateutil==2.8.2
pytz==2023.4

# Logging e monitoramento
structlog==24.1.0

# Testes
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
factory-boy==3.3.0
```

## Modelos de Dados (SQLAlchemy)

### User
```python
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="user")
    categories: Mapped[list["Category"]] = relationship(back_populates="user")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user")
```

### Invoice (Nota Fiscal)
```python
class Invoice(Base):
    __tablename__ = "invoices"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    
    # Dados da nota fiscal
    access_key: Mapped[str] = mapped_column(String(44), unique=True, index=True)  # Chave de acesso
    number: Mapped[str] = mapped_column(String(20))
    series: Mapped[str] = mapped_column(String(10))
    issue_date: Mapped[datetime]
    
    # Dados do emitente
    issuer_cnpj: Mapped[str] = mapped_column(String(14))
    issuer_name: Mapped[str] = mapped_column(String(255))
    
    # Valores
    total_value: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    
    # Tipo e formato
    type: Mapped[str] = mapped_column(String(10))  # NFC-e, NF-e
    source: Mapped[str] = mapped_column(String(20))  # qrcode, xml, pdf
    
    # XML completo (JSON)
    raw_data: Mapped[dict] = mapped_column(JSON)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="invoices")
    products: Mapped[list["Product"]] = relationship(back_populates="invoice")
```

### Product
```python
class Product(Base):
    __tablename__ = "products"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id"))
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    
    # Dados do produto
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    unit: Mapped[str] = mapped_column(String(10))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    total_price: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    
    # Categorização
    ai_category_suggestion: Mapped[str | None] = mapped_column(String(100))
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="products")
    category: Mapped["Category | None"] = relationship(back_populates="products")
```

### Category
```python
class Category(Base):
    __tablename__ = "categories"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )  # Null = categoria padrão do sistema
    
    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7), default="#3B82F6")  # Hex color
    icon: Mapped[str | None] = mapped_column(String(50))  # Nome do ícone
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User | None"] = relationship(back_populates="categories")
    products: Mapped[list["Product"]] = relationship(back_populates="category")
```

### Analysis
```python
class Analysis(Base):
    __tablename__ = "analyses"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    
    # Tipo de análise
    type: Mapped[str] = mapped_column(String(20))  # pattern, insight, alert, summary
    
    # Conteúdo
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    
    # Dados específicos da análise (JSON)
    data: Mapped[dict] = mapped_column(JSON)
    
    # Período de referência
    reference_date: Mapped[date]
    
    # Status
    is_read: Mapped[bool] = mapped_column(default=False)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="analyses")
```

## Endpoints da API

### Autenticação (`/api/v1/auth`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/register` | Registrar novo usuário |
| POST | `/login` | Login (retorna JWT) |
| POST | `/refresh` | Refresh token |
| POST | `/logout` | Logout (blacklist token) |
| GET | `/me` | Dados do usuário logado |

### Usuários (`/api/v1/users`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Listar usuários (admin) |
| GET | `/{id}` | Obter usuário |
| PUT | `/{id}` | Atualizar usuário |
| DELETE | `/{id}` | Deletar usuário |

### Notas Fiscais (`/api/v1/invoices`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Listar notas do usuário |
| POST | `/qrcode` | Processar QR Code |
| POST | `/upload/xml` | Upload de XML |
| POST | `/upload/pdf` | Upload de PDF |
| GET | `/{id}` | Obter nota fiscal |
| DELETE | `/{id}` | Deletar nota fiscal |

### Produtos (`/api/v1/products`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Listar produtos do usuário |
| GET | `/{id}` | Obter produto |
| PUT | `/{id}/category` | Atualizar categoria do produto |

### Categorias (`/api/v1/categories`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Listar categorias (padrão + do usuário) |
| POST | `/` | Criar categoria personalizada |
| PUT | `/{id}` | Atualizar categoria |
| DELETE | `/{id}` | Deletar categoria |

### Análises (`/api/v1/analysis`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Listar análises do usuário |
| GET | `/dashboard` | Dados consolidados do dashboard |
| GET | `/insights` | Insights gerados |
| GET | `/spending-by-category` | Gastos por categoria |
| GET | `/spending-over-time` | Evolução dos gastos |
| POST | `/{id}/read` | Marcar análise como lida |

## Fluxos Principais

### 1. Processamento de QR Code

```python
# POST /api/v1/invoices/qrcode
async def process_qrcode(
    qrcode_data: str,  # URL do QR Code
    current_user: User = Depends(get_current_user)
):
    # 1. Extrair chave de acesso da URL
    access_key = extract_access_key(qrcode_data)
    
    # 2. Verificar se nota já existe
    if await invoice_exists(access_key, current_user.id):
        raise HTTPException(409, "Nota fiscal já cadastrada")
    
    # 3. Consultar API Sefaz
    invoice_data = await fetch_invoice_from_sefaz(access_key)
    
    # 4. Parsear dados
    invoice = parse_invoice_data(invoice_data)
    
    # 5. Salvar no banco
    db_invoice = await save_invoice(invoice, current_user.id)
    
    # 6. Extrair e salvar produtos
    products = extract_products(invoice_data)
    await save_products(products, db_invoice.id)
    
    # 7. Categorizar produtos (async)
    await categorize_products_task.delay(db_invoice.id)
    
    # 8. Retornar nota criada
    return db_invoice
```

### 2. Categorização com IA

```python
async def categorize_products(invoice_id: UUID):
    # 1. Buscar produtos não categorizados
    products = await get_uncategorized_products(invoice_id)
    
    # 2. Buscar categorias do usuário + padrão
    categories = await get_available_categories(invoice_id)
    
    # 3. Montar prompt para OpenAI
    prompt = build_categorization_prompt(products, categories)
    
    # 4. Chamar OpenAI
    response = await openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    # 5. Parsear resposta
    categorizations = json.loads(response.choices[0].message.content)
    
    # 6. Atualizar produtos
    for product_id, category_id in categorizations.items():
        await update_product_category(product_id, category_id)
```

### 3. Geração de Insights

```python
async def generate_insights(user_id: UUID, reference_date: date):
    insights = []
    
    # 1. Análise de gastos por categoria vs mês anterior
    spending_change = await analyze_spending_change(user_id, reference_date)
    if spending_change.significant_changes:
        insights.append(create_spending_alert(spending_change))
    
    # 2. Detectar padrões de compra
    patterns = await detect_purchase_patterns(user_id)
    for pattern in patterns:
        insights.append(create_pattern_insight(pattern))
    
    # 3. Compras recorrentes
    recurring = await find_recurring_purchases(user_id)
    for purchase in recurring:
        insights.append(create_recurring_insight(purchase))
    
    # 4. Salvar insights
    await save_insights(insights, user_id, reference_date)
```

## Configuração do Projeto

### main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Mercado Esperto API",
    description="API para análise de notas fiscais",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["invoices"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

### config.py
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Mercado Esperto API"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/mercadoesperto"
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # Sefaz (configuração por estado)
    SEFAZ_API_URL: str = "https://..."
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Variáveis de Ambiente (.env.example)

```bash
# App
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/mercadoesperto

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI
OPENAI_API_KEY=sk-...

# Sefaz
SEFAZ_API_URL=https://...
```

## Comandos Úteis

```bash
# Instalar dependências
pip install -r requirements.txt

# Rodar migrations
alembic upgrade head

# Criar nova migration
alembic revision --autogenerate -m "description"

# Rodar servidor de desenvolvimento
uvicorn src.main:app --reload --port 8000

# Rodar testes
pytest

# Cobertura de testes
pytest --cov=src --cov-report=html
```

## Próximos Passos de Implementação

1. **Setup inicial**: Criar estrutura de pastas e arquivos de configuração
2. **Modelos**: Implementar SQLAlchemy models
3. **Schemas**: Criar Pydantic schemas
4. **Autenticação**: Implementar JWT auth
5. **Parsers**: Criar parsers de XML e QR Code
6. **Routers**: Implementar endpoints principais
7. **Integração OpenAI**: Categorização e insights
8. **Testes**: Cobertura de testes unitários
