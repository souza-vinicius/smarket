# Validação de CNPJ - Implementação Completa (Backend + Frontend)

## ✅ Implementação Completa

A validação de CNPJ agora funciona em **dois níveis**:
1. **Frontend** - Validação em tempo real enquanto o usuário digita
2. **Backend** - Validação final antes de salvar no banco de dados

## 🎯 Funcionalidades

### Frontend (React/TypeScript)

#### ✅ Formatação Automática
- CNPJ formatado automaticamente enquanto o usuário digita
- Formato: `XX.XXX.XXX/XXXX-XX`
- Limitado a 18 caracteres (14 dígitos + 4 caracteres de formatação)

#### ✅ Validação em Tempo Real
- Validação de checksum conforme algoritmo oficial
- Feedback visual instantâneo:
  - ❌ **Vermelho** - CNPJ inválido
  - ✅ **Verde** - CNPJ válido
- Mensagens de erro específicas:
  - Tamanho incorreto
  - Dígitos repetidos
  - Dígitos verificadores incorretos

#### ✅ Prevenção de Envio
- Botão "Confirmar" desabilitado se CNPJ inválido
- Validação antes do submit
- Mensagem de erro clara

### Backend (Python/FastAPI)

#### ✅ Validação Robusta
- Verifica tamanho (14 dígitos)
- Valida checksum usando algoritmo oficial
- Rejeita padrões inválidos (dígitos repetidos)

#### ✅ Mensagens de Erro Estruturadas
- Código de erro: `invalid_cnpj`
- Mensagem clara em português
- Campo afetado identificado
- Sugestões de correção (hint)

#### ✅ Enriquecimento Opcional
- Consulta BrasilAPI/ReceitaWS após validação
- Correção automática de nome do estabelecimento
- Dados completos salvos em `raw_data`

## 📁 Arquivos Criados/Modificados

### Backend

**Criados:**
1. `/apps/api/src/utils/cnpj_validator.py`
   - `clean_cnpj()` - Remove formatação
   - `validate_cnpj()` - Valida checksum
   - `format_cnpj()` - Formata para exibição

2. `/apps/api/src/services/cnpj_enrichment.py`
   - `enrich_cnpj_data()` - Enriquece via APIs públicas
   - `fetch_from_brasilapi()` - Consulta BrasilAPI
   - `fetch_from_receitaws()` - Fallback ReceitaWS

**Modificados:**
3. `/apps/api/src/routers/invoices.py`
   - Validação melhorada com mensagens de erro estruturadas
   - Tratamento de CNPJ com tamanho incorreto
   - Mensagens de erro detalhadas

4. `/apps/api/src/config.py`
   - Feature flags para controlar validação/enrichment

### Frontend

**Criados:**
1. `/apps/web/src/lib/cnpj.ts`
   - `cleanCNPJ()` - Remove formatação
   - `validateCNPJ()` - Valida checksum
   - `formatCNPJ()` - Formata completo
   - `formatCNPJInput()` - Formata progressivamente
   - `getCNPJErrorMessage()` - Retorna mensagem de erro
   - `isValidCNPJ()` - Verifica se válido

2. `/apps/web/src/lib/__tests__/cnpj.test.ts`
   - Testes unitários completos para todas as funções
   - Cobertura de casos válidos e inválidos

**Modificados:**
3. `/apps/web/src/app/invoices/review/[processingId]/page.tsx`
   - Estado para erro de CNPJ
   - Validação em tempo real
   - Formatação automática
   - Feedback visual (cores)
   - Desabilita botão se inválido
   - Tratamento de erro do backend

## 🔄 Fluxo Completo

### 1. Usuário Digita CNPJ

```
Usuário digita: "00000000000191"
       ↓
Frontend formata: "00.000.000/0001-91"
       ↓
Frontend valida: ✅ Válido
       ↓
Mostra feedback: "✓ CNPJ válido" (verde)
```

### 2. CNPJ Inválido

```
Usuário digita: "11111111111111"
       ↓
Frontend formata: "11.111.111/1111-11"
       ↓
Frontend valida: ❌ Inválido
       ↓
Mostra erro: "CNPJ inválido (dígitos repetidos)" (vermelho)
       ↓
Botão "Confirmar" desabilitado
```

### 3. Tentativa de Envio

```
Usuário clica "Confirmar"
       ↓
Frontend valida novamente
       ↓
Se inválido: bloqueia e mostra erro
       ↓
Se válido: envia para backend
       ↓
Backend valida checksum
       ↓
Se inválido: retorna HTTP 400
       ↓
Se válido: enriquece (se habilitado)
       ↓
Salva no banco de dados
```

## 🎨 Feedback Visual (Frontend)

### Campo CNPJ Normal
```typescript
className="border-transparent text-[#666] hover:border-[#e5e5e5]"
```

### Campo CNPJ com Erro
```typescript
className="border-red-500 text-red-600 focus:border-red-600"
```

### Mensagem de Sucesso
```html
<p className="text-green-600">✓ CNPJ válido</p>
```

### Mensagem de Erro
```html
<p className="text-red-600">❌ CNPJ inválido (dígitos repetidos)</p>
```

## 📊 Mensagens de Erro

### Frontend

| Situação | Mensagem |
|----------|----------|
| Tamanho incorreto | `CNPJ deve ter 14 dígitos (X informados)` |
| Dígitos repetidos | `CNPJ inválido (dígitos repetidos)` |
| Checksum inválido | `CNPJ inválido (dígitos verificadores incorretos)` |

### Backend

#### Erro de Tamanho
```json
{
  "error": "invalid_cnpj",
  "message": "CNPJ deve ter 14 dígitos",
  "field": "issuer_cnpj",
  "value": "123",
  "expected_length": 14,
  "actual_length": 3
}
```

#### Erro de Checksum
```json
{
  "error": "invalid_cnpj",
  "message": "CNPJ inválido. Verifique os dígitos verificadores.",
  "field": "issuer_cnpj",
  "value": "11.111.111/1111-11",
  "hint": "O CNPJ informado não passa na validação dos dígitos verificadores."
}
```

## 🧪 Testes

### Backend
```bash
# Teste completo
python test_cnpj.py

# Resultado esperado:
✓ All validation tests passed!
✓ Enrichment successful from: brasilapi
```

### Frontend
```bash
cd apps/web
npm test -- cnpj.test.ts

# Resultado esperado:
PASS  src/lib/__tests__/cnpj.test.ts
  ✓ cleanCNPJ
  ✓ formatCNPJ
  ✓ validateCNPJ (válido)
  ✓ validateCNPJ (inválido)
  ✓ getCNPJErrorMessage
  ✓ isValidCNPJ
  ✓ formatCNPJInput
```

## 🎛️ Feature Flags

Todas as features podem ser desabilitadas via `.env`:

```bash
# Desabilitar tudo
ENABLE_CNPJ_FEATURES=false

# Desabilitar apenas validação (permite CNPJs inválidos)
ENABLE_CNPJ_VALIDATION=false

# Desabilitar apenas enriquecimento (sem chamadas de API)
ENABLE_CNPJ_ENRICHMENT=false
```

## 📖 Exemplos de Uso

### Frontend - Validação Manual
```typescript
import { validateCNPJ, formatCNPJ } from '@/lib/cnpj';

const cnpj = "00000000000191";

if (validateCNPJ(cnpj)) {
  console.log("CNPJ válido:", formatCNPJ(cnpj));
  // Output: "CNPJ válido: 00.000.000/0001-91"
} else {
  console.log("CNPJ inválido");
}
```

### Frontend - Formatação em Input
```typescript
import { formatCNPJInput } from '@/lib/cnpj';

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatCNPJInput(e.target.value);
  setValue(formatted);
};
```

### Backend - Validação Manual
```python
from src.utils.cnpj_validator import validate_cnpj, format_cnpj

cnpj = "00000000000191"

if validate_cnpj(cnpj):
    print(f"CNPJ válido: {format_cnpj(cnpj)}")
    # Output: "CNPJ válido: 00.000.000/0001-91"
else:
    print("CNPJ inválido")
```

## 🚀 Como Testar

### 1. Teste no Frontend

1. Acesse: `http://localhost:3000/invoices`
2. Faça upload de uma foto de nota fiscal
3. Aguarde o processamento
4. Na tela de revisão, edite o campo CNPJ:
   - Digite um CNPJ inválido: `11111111111111`
   - Observe erro em vermelho
   - Botão "Confirmar" desabilitado
5. Digite um CNPJ válido: `00000000000191`
   - Observe mensagem verde "✓ CNPJ válido"
   - Botão "Confirmar" habilitado

### 2. Teste no Backend

```bash
# Teste validação
python test_cnpj.py

# Teste via API
curl -X POST http://localhost:8000/api/v1/invoices/processing/{id}/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "issuer_cnpj": "11.111.111/1111-11",
    ...
  }'

# Deve retornar:
# HTTP 400
# {
#   "error": "invalid_cnpj",
#   "message": "CNPJ inválido. Verifique os dígitos verificadores."
# }
```

## 💡 Benefícios

### UX (Experiência do Usuário)
1. **Feedback imediato** - Usuário vê erro enquanto digita
2. **Formatação automática** - Não precisa digitar pontos/traços
3. **Mensagens claras** - Erro específico, não genérico
4. **Prevenção de erros** - Botão desabilitado se inválido

### DX (Experiência do Desenvolvedor)
1. **Código reutilizável** - Funções podem ser usadas em outros lugares
2. **Testado** - Cobertura completa de testes
3. **Tipado** - TypeScript garante type safety
4. **Documentado** - Comentários e exemplos claros

### Qualidade de Dados
1. **Validação em dois níveis** - Frontend + Backend
2. **Consistência** - Mesmo algoritmo em ambos os lados
3. **Enriquecimento** - Dados corrigidos automaticamente
4. **Auditoria** - Histórico salvo em `raw_data`

## 🔒 Segurança

### Frontend
- ✅ Validação antes de enviar ao backend
- ✅ Sanitização de input (apenas dígitos)
- ✅ Limite de caracteres (maxLength)

### Backend
- ✅ Validação independente (não confia no frontend)
- ✅ Mensagens de erro sem informações sensíveis
- ✅ Enriquecimento opcional (pode ser desabilitado)

## 📚 Documentação Relacionada

- `FEATURE_FLAGS.md` - Como controlar features via env vars
- `CNPJ_QUICK_REFERENCE.md` - Referência rápida
- `CNPJ_IMPLEMENTATION.md` - Detalhes de implementação backend

---

**Status**: ✅ **COMPLETO - FRONTEND + BACKEND**
**Data**: 2025-02-06
**Versão**: 1.0
**Testado**: ✅ Backend + Frontend
