# AGENTS.md - SMarket API

Guidelines for AI agents working on this repository.

## Project Overview

SMarket is a Brazilian invoice (NF-e/NFC-e) analysis API built with FastAPI, SQLAlchemy, and PostgreSQL. It parses XML invoices, extracts product data, and provides spending analysis using AI.

## Build/Test/Lint Commands

All commands run from `apps/api/` directory:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the API (development)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
pytest

# Run single test file
pytest tests/test_auth.py

# Run single test
pytest tests/test_auth.py::test_register_user

# Run specific test class
pytest tests/test_parsers.py::TestXMLParser

# Run with coverage
pytest --cov=src --cov-report=term-missing

# Database migrations
alembic upgrade head          # Apply migrations
alembic downgrade -1          # Rollback one migration
alembic revision --autogenerate -m "description"  # Create new migration
```

## Docker Commands

```bash
# Start all services (from repo root)
docker-compose up -d

# Rebuild and restart API
docker-compose up -d --build api

# View logs
docker-compose logs -f api
```

## Code Style Guidelines

### Python Style
- Follow PEP 8
- Use type hints everywhere (function signatures, variables)
- Use `async`/`await` for all database operations
- Line length: 88 characters (Black-compatible)

### Imports (isort-style grouping)

```python
# 1. Standard library
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

# 2. Third-party
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

# 3. Local application (absolute imports only)
from src.database import get_db
from src.models.user import User
from src.schemas.auth import Token, LoginRequest
from src.utils.security import verify_password
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Modules | snake_case | `invoice_parser.py` |
| Classes | PascalCase | `User`, `InvoiceCreate` |
| Functions | snake_case | `get_current_user()` |
| Variables | snake_case | `access_token` |
| Constants | UPPER_SNAKE | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Database models | PascalCase, singular | `class User(Base)` |
| Pydantic schemas | PascalCase + suffix | `UserCreate`, `UserResponse` |
| Router instances | lowercase | `router = APIRouter()` |

### Project Structure

```
apps/api/
├── src/
│   ├── main.py              # FastAPI app instance
│   ├── config.py            # Pydantic Settings
│   ├── database.py          # SQLAlchemy engine/session
│   ├── dependencies.py      # FastAPI dependencies
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic models
│   ├── routers/             # API route handlers
│   ├── utils/               # Helper functions
│   └── parsers/             # Invoice parsers (XML, QRCode)
├── tests/                   # pytest test files
├── alembic/                 # Database migrations
└── requirements.txt
```

### SQLAlchemy Models

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    
    # Relationships with type hints
    invoices: Mapped[List["Invoice"]] = relationship(back_populates="user")
```

### Pydantic Schemas

```python
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode
```

### Error Handling

Use FastAPI's HTTPException with appropriate status codes:

```python
from fastapi import HTTPException, status

# Validation errors
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Email already registered"
)

# Auth errors
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Incorrect email or password",
    headers={"WWW-Authenticate": "Bearer"},
)

# Not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Invoice not found"
)
```

### Router Pattern

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    ...
```

### Testing

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "pass123", "full_name": "Test"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
```

## Environment Variables

Required in `.env` file:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API access
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)

## Key Technologies

- **FastAPI** - Web framework
- **SQLAlchemy 2.0** - ORM with async support
- **Pydantic v2** - Data validation
- **Alembic** - Database migrations
- **pytest** - Testing framework
- **PostgreSQL** - Database
