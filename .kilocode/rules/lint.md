# Lint Policy - SMarket

Política de linting e formatação de código para todo o projeto SMarket. Estas regras garantem consistência, legibilidade e qualidade do código.

---

## Quick Reference

| Task | Backend | Frontend |
|------|---------|----------|
| Lint | `ruff check` | `npm run lint` |
| Fix | `ruff check --fix` | `npm run lint:fix` |
| Format | `ruff format` | (integrado no lint) |
| Type Check | `mypy` | `npm run type-check` |

---

## Python (Backend - apps/api/)

### Ferramentas Obrigatórias

| Ferramenta | Propósito |
|------------|-----------|
| **Ruff** | Linter + Formatter (substitui flake8, isort, black) |
| **mypy** | Type checking (modo strict) |
| **pytest** | Testes com coverage |

### Configuração Ruff

Ver `pyproject.toml` para configuração completa.

### Comandos

```bash
cd apps/api
ruff check src/ --fix     # Lint + auto-fix
ruff format src/          # Formatar
mypy src/ --strict        # Type check
```

---

## TypeScript/JavaScript (Frontend - apps/web/)

### Arquivo de Configuração

**Novo**: [`apps/web/eslint.config.mjs`](../../apps/web/eslint.config.mjs) (Flat Config)

### Plugins Instalados

| Plugin | Propósito |
|--------|-----------|
| `@typescript-eslint` | Regras TypeScript estritas |
| `eslint-plugin-react` | Regras React |
| `eslint-plugin-react-hooks` | Hooks quality (`exhaustive-deps`) |
| `eslint-plugin-jsx-a11y` | Acessibilidade WCAG |
| `eslint-plugin-import` | Organização de imports |
| `eslint-plugin-tailwindcss` | Classes Tailwind válidas |
| `eslint-plugin-security` | Vulnerabilidades de segurança |

### Regras Essenciais

```javascript
// eslint.config.mjs (resumo)
{
  // TypeScript
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/explicit-function-return-type': 'warn',
  
  // React
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
  
  // Acessibilidade
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/label-has-associated-control': 'error',
  
  // Segurança
  'security/detect-object-injection': 'error',
  
  // Imports
  'import/order': ['error', { groups: ['builtin', 'external', 'parent', 'sibling', 'index'] }]
}
```

### Scripts NPM

```bash
cd apps/web
npm run lint         # Verificar erros
npm run lint:fix     # Corrigir automaticamente
npm run type-check   # Verificar tipos TS
```

### Exemplos de Código

#### ✅ Correto

```typescript
// Tipos explícitos
interface User {
  id: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Hooks corretos
function useUserData(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

#### ❌ Incorreto

```typescript
// any implícito
function fetchUser(id) {
  return fetch(`/api/users/${id}`).then(r => r.json());
}

// Dependências incompletas
useEffect(() => {
  doSomething(props.id);
}, []); // Erro: missing dependencies
```

---

## Regras Gerais (Ambos)

### Proibições Absolutas

| Regra | Motivo |
|-------|--------|
| ❌ `any` sem justificativa | Remove type safety |
| ❌ `console.log` em prod | Usar logger |
| ❌ Código comentado | Usar git |
| ❌ Imports relativos (Py) | Usar `from src.` |
| ❌ `var` (JS) | Usar `const`/`let` |

### Convenções de Nomenclatura

| Elemento | Python | TypeScript |
|----------|--------|------------|
| Arquivos | `snake_case.py` | `kebab-case.tsx` |
| Classes | `PascalCase` | `PascalCase` |
| Funções | `snake_case()` | `camelCase()` |
| Variáveis | `snake_case` | `camelCase` |
| Constantes | `UPPER_SNAKE` | `UPPER_SNAKE` |
| Componentes | - | `PascalCase` |
| Hooks | - | `useCamelCase()` |

---

## Pre-commit Hooks

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    hooks: [ruff, ruff-format]

  - repo: https://github.com/pre-commit/mirrors-eslint
    hooks: [eslint]
```

---

## CI/CD Checks

```yaml
# GitHub Actions
- name: Lint Backend
  run: |
    cd apps/api
    ruff check && ruff format --check
    mypy

- name: Lint Frontend
  run: |
    cd apps/web
    npm run lint
    npm run type-check
```

---

## Referência Rápida

### Antes do Commit

```bash
# Backend
cd apps/api && ruff check --fix && ruff format && mypy

# Frontend  
cd apps/web && npm run lint:fix && npm run type-check
```

### Ignorar Regras (moderadamente)

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = getData();

// ruff: noqa: PLR0913
def complex_function(a, b, c, d, e, f, g):
    ...
```

---

## Documentação Detalhada

Consulte [`apps/web/ESLINT.md`](../../apps/web/ESLINT.md) para:
- Lista completa de regras
- Exemplos detalhados de cada regra
- Como corrigir problemas comuns
- Links para documentação oficial
