# Lint Policy - SMarket

Política de linting e formatação de código para todo o projeto SMarket. Estas regras garantem consistência, legibilidade e qualidade do código.

---

## Python (Backend - apps/api/)

### Ferramentas Obrigatórias

| Ferramenta | Propósito | Configuração |
|------------|-----------|--------------|
| **Ruff** | Linter + Formatter | Substitui flake8, isort, black |
| **mypy** | Type checking | Modo strict |
| **pytest** | Testes | Com coverage |

### Configuração Ruff (pyproject.toml)

```toml
[tool.ruff]
target-version = "py311"
line-length = 88
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # Pyflakes
    "I",      # isort
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "UP",     # pyupgrade
    "ARG",    # flake8-unused-arguments
    "SIM",    # flake8-simplify
    "TCH",    # flake8-type-checking
    "PTH",    # flake8-use-pathlib
    "ERA",    # eradicate (commented code)
    "PL",     # Pylint
    "RUF",    # Ruff-specific rules
]
ignore = [
    "E501",   # line too long (handled by formatter)
    "PLR0913", # too many arguments
]

[tool.ruff.isort]
known-first-party = ["src"]
force-single-line = false
lines-after-imports = 2

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
```

### Regras de Estilo Python

#### Comprimento de Linha
- **Máximo**: 88 caracteres (compatível com Black)
- Exceção: URLs e strings longas podem exceder

#### Type Hints (Obrigatório)
```python
# ✅ Correto
def get_user(user_id: uuid.UUID, db: AsyncSession) -> User | None:
    ...

async def create_invoice(data: InvoiceCreate) -> InvoiceResponse:
    ...

# ❌ Incorreto
def get_user(user_id, db):
    ...
```

#### Imports (Ordem isort)
```python
# 1. Standard library
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

# 2. Third-party
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

# 3. Local application (absolute imports ONLY)
from src.database import get_db
from src.models.user import User
from src.schemas.auth import LoginRequest
```

#### Docstrings (Google Style)
```python
async def analyze_invoice(invoice_id: uuid.UUID) -> list[Analysis]:
    """Analyze an invoice and generate insights.

    Args:
        invoice_id: The UUID of the invoice to analyze.

    Returns:
        A list of Analysis objects with generated insights.

    Raises:
        HTTPException: If invoice is not found (404).
    """
    ...
```

#### Async/Await
- **SEMPRE** usar `async`/`await` para operações de banco de dados
- Nunca misturar código síncrono com assíncrono

```python
# ✅ Correto
async def get_invoices(db: AsyncSession) -> list[Invoice]:
    result = await db.execute(select(Invoice))
    return result.scalars().all()

# ❌ Incorreto
def get_invoices(db: Session) -> list[Invoice]:
    return db.query(Invoice).all()
```

### Comandos de Lint

```bash
# Executar linter
ruff check apps/api/src/

# Corrigir automaticamente
ruff check apps/api/src/ --fix

# Formatar código
ruff format apps/api/src/

# Type checking
mypy apps/api/src/ --strict

# Verificar tudo antes do commit
ruff check apps/api/src/ && ruff format --check apps/api/src/ && mypy apps/api/src/
```

---

## TypeScript/JavaScript (Frontend - apps/web/)

### Ferramentas Obrigatórias

| Ferramenta | Propósito |
|------------|-----------|
| **ESLint** | Linter |
| **Prettier** | Formatter |
| **TypeScript** | Type checking |

### Configuração ESLint (.eslintrc.json)

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Configuração Prettier (.prettierrc)

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Regras de Estilo TypeScript

#### Tipos Explícitos
```typescript
// ✅ Correto
interface User {
  id: string;
  email: string;
  fullName: string;
}

const fetchUser = async (id: string): Promise<User> => {
  // ...
};

// ❌ Incorreto
const fetchUser = async (id) => {
  // ...
};
```

#### Imports Organizados
```typescript
// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party
import { useQuery } from "@tanstack/react-query";

// 3. Local components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 4. Types
import type { Invoice, User } from "@/types";

// 5. Utils/Lib
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
```

#### Componentes React
```typescript
// ✅ Correto - Componente funcional com tipos
interface InvoiceCardProps {
  invoice: Invoice;
  onDelete?: (id: string) => void;
}

export function InvoiceCard({ invoice, onDelete }: InvoiceCardProps): JSX.Element {
  return (
    <Card>
      {/* ... */}
    </Card>
  );
}

// ❌ Incorreto - Sem tipos
export function InvoiceCard({ invoice, onDelete }) {
  // ...
}
```

### Comandos de Lint

```bash
# Executar ESLint
npm run lint

# Corrigir automaticamente
npm run lint -- --fix

# Formatar com Prettier
npx prettier --write "src/**/*.{ts,tsx}"

# Type check
npx tsc --noEmit
```

---

## Regras Gerais (Ambos)

### Proibições

| Regra | Motivo |
|-------|--------|
| ❌ `any` (TS) / sem type hints (Py) | Perde segurança de tipos |
| ❌ `console.log` em produção | Usar logger apropriado |
| ❌ Código comentado | Usar git para histórico |
| ❌ TODO sem issue | Criar issue no GitHub |
| ❌ Imports relativos (Python) | Usar absolutos: `from src.` |
| ❌ `var` (JavaScript) | Usar `const` ou `let` |
| ❌ Funções sem docstring/JSDoc | Documentar funções públicas |

### Convenções de Nomenclatura

| Elemento | Python | TypeScript |
|----------|--------|------------|
| Arquivos | `snake_case.py` | `kebab-case.tsx` |
| Classes | `PascalCase` | `PascalCase` |
| Funções | `snake_case` | `camelCase` |
| Variáveis | `snake_case` | `camelCase` |
| Constantes | `UPPER_SNAKE` | `UPPER_SNAKE` |
| Componentes React | - | `PascalCase` |
| Hooks | - | `useCamelCase` |

### Tratamento de Erros

```python
# Python - Usar HTTPException
from fastapi import HTTPException, status

raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Invoice not found"
)
```

```typescript
// TypeScript - Usar Error classes
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

throw new ApiError(404, "Invoice not found");
```

---

## Pre-commit Hooks

### Configuração (.pre-commit-config.yaml)

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.[jt]sx?$
        types: [file]
```

### Instalação

```bash
pip install pre-commit
pre-commit install
```

---

## CI/CD Lint Checks

Todo PR deve passar nas seguintes verificações:

1. **Python**: `ruff check` + `ruff format --check` + `mypy`
2. **TypeScript**: `npm run lint` + `tsc --noEmit`
3. **Testes**: `pytest` com coverage mínimo de 80%

### GitHub Actions Exemplo

```yaml
- name: Lint Python
  run: |
    ruff check apps/api/src/
    ruff format --check apps/api/src/
    mypy apps/api/src/ --strict

- name: Lint TypeScript
  run: |
    cd apps/web
    npm run lint
    npx tsc --noEmit
```

---

## Referência Rápida

### Antes de Commitar

```bash
# Backend
cd apps/api
ruff check src/ --fix
ruff format src/
mypy src/
pytest

# Frontend
cd apps/web
npm run lint -- --fix
npx prettier --write "src/**/*.{ts,tsx}"
npm run build
```

### Ignorar Regras (Usar com Moderação)

```python
# Python - Ignorar linha específica
some_code()  # noqa: E501

# Python - Ignorar bloco
# ruff: noqa: PLR0913
def function_with_many_args(...):
    ...
```

```typescript
// TypeScript - Ignorar linha
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;

// TypeScript - Ignorar arquivo (evitar!)
/* eslint-disable */
```
