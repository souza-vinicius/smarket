# Botão de Enriquecimento de CNPJ - Documentação

## ✅ Implementação Completa

Adicionado botão no frontend para consultar dados de CNPJ em APIs públicas e atualizar automaticamente o nome do estabelecimento.

## 🎯 Funcionalidade

### O que faz

O botão de enriquecimento (🔍) permite ao usuário:
1. Consultar dados do CNPJ em tempo real
2. Obter informações oficiais da Receita Federal
3. Atualizar automaticamente o nome do estabelecimento
4. Ver de qual fonte vieram os dados (BrasilAPI ou ReceitaWS)

### Onde está

**Localização**: Tela de revisão de nota fiscal
**Rota**: `/invoices/review/[processingId]`
**Posição**: Ao lado do campo de CNPJ, à direita

## 📁 Arquivos Criados/Modificados

### Backend

**Criado:**
1. `/apps/api/src/routers/invoices.py` - Novo endpoint
   - **Rota**: `GET /api/v1/invoices/cnpj/{cnpj}/enrich`
   - **Autenticação**: Requer login (JWT)
   - **Função**: Consulta BrasilAPI → ReceitaWS (fallback)

### Frontend

**Criado:**
2. `/apps/web/src/hooks/use-cnpj-enrichment.ts`
   - Hook React Query para chamar a API
   - Tipagem TypeScript completa
   - Tratamento de erros

**Modificado:**
3. `/apps/web/src/app/invoices/review/[processingId]/page.tsx`
   - Botão de enriquecimento ao lado do campo CNPJ
   - Estado de loading
   - Mensagens de sucesso/erro
   - Atualização automática do nome

## 🎨 Interface

### Botão

```
┌─────────────────────────┬────┐
│ 00.000.000/0001-91      │ 🔍 │
└─────────────────────────┴────┘
      Campo CNPJ          Botão
```

### Estados do Botão

**Normal:**
- Ícone: 🔍
- Cor: Preto com borda
- Hover: Fundo preto, texto branco

**Carregando:**
- Ícone: ...
- Desabilitado temporariamente

**Desabilitado:**
- CNPJ vazio → Botão desabilitado
- CNPJ inválido → Botão desabilitado
- Erro de validação → Botão desabilitado
- Opacidade: 40%

## 🔄 Fluxo de Uso

### 1. Usuário Digita CNPJ

```
1. Usuário digita: "00000000000191"
   ↓
2. Frontend formata: "00.000.000/0001-91"
   ↓
3. Frontend valida: ✅ Válido
   ↓
4. Botão 🔍 fica habilitado
```

### 2. Usuário Clica no Botão 🔍

```
1. Validação local do CNPJ
   ↓
2. Se inválido → Mostra erro e para
   ↓
3. Se válido → Faz requisição para backend
   ↓
4. Backend consulta BrasilAPI
   ├─ Sucesso → Retorna dados
   └─ Falha → Tenta ReceitaWS
       ├─ Sucesso → Retorna dados
       └─ Falha → Retorna erro
   ↓
5. Frontend recebe resposta
   ├─ Sucesso:
   │   • Atualiza issuer_name automaticamente
   │   • Mostra: "✓ Nome atualizado com sucesso! Fonte: BrasilAPI"
   │   • Cor verde
   └─ Erro:
       • Mostra mensagem de erro
       • Cor vermelha
```

### 3. Nome Atualizado

```
Antes:
  Nome: BANCO DO BRASIL (parcial/incorreto)

Depois de clicar 🔍:
  Nome: BANCO DO BRASIL SA (completo/oficial)
  Mensagem: "✓ Nome atualizado com sucesso! Fonte: BrasilAPI"
```

## 📊 Respostas da API

### Sucesso (HTTP 200)

```json
{
  "success": true,
  "cnpj": "00.000.000/0001-91",
  "suggested_name": "BANCO DO BRASIL SA",
  "data": {
    "razao_social": "BANCO DO BRASIL SA",
    "nome_fantasia": "DIRECAO GERAL",
    "cnpj": "00.000.000/0001-91",
    "municipio": "BRASILIA",
    "uf": "DF",
    "situacao": "ATIVA",
    "cnae_fiscal": "6422100",
    "source": "brasilapi"
  }
}
```

### Erro - CNPJ Inválido (HTTP 400)

```json
{
  "detail": {
    "error": "invalid_cnpj",
    "message": "CNPJ inválido. Verifique os dígitos verificadores.",
    "cnpj": "11.111.111/1111-11"
  }
}
```

### Erro - CNPJ Não Encontrado (HTTP 404)

```json
{
  "detail": {
    "error": "cnpj_not_found",
    "message": "CNPJ não encontrado nas bases de dados públicas",
    "cnpj": "12.345.678/9012-34",
    "hint": "Verifique se o CNPJ está correto e ativo"
  }
}
```

### Erro - Serviço Desabilitado (HTTP 503)

```json
{
  "detail": {
    "error": "service_disabled",
    "message": "Serviço de enriquecimento de CNPJ está desabilitado"
  }
}
```

### Erro - APIs Indisponíveis (HTTP 500)

```json
{
  "detail": {
    "error": "enrichment_failed",
    "message": "Falha ao consultar dados do CNPJ. Tente novamente.",
    "hint": "As APIs públicas podem estar temporariamente indisponíveis"
  }
}
```

## 🎨 Mensagens de Feedback

### Sucesso

```
✓ Nome atualizado com sucesso! Fonte: BrasilAPI
```
ou
```
✓ Nome atualizado com sucesso! Fonte: ReceitaWS
```

**Cor**: Verde (`text-green-600`)

### Erro

```
❌ CNPJ não encontrado nas bases de dados públicas
Verifique se o CNPJ está correto e ativo
```

ou

```
❌ Falha ao consultar dados do CNPJ. Tente novamente.
As APIs públicas podem estar temporariamente indisponíveis
```

**Cor**: Vermelho (`text-red-600`)

## 🔒 Segurança

### Backend

- ✅ Autenticação obrigatória (JWT token)
- ✅ Validação de CNPJ antes de consultar APIs
- ✅ Rate limiting via cache (24h TTL)
- ✅ Timeout de 5 segundos
- ✅ Mensagens de erro sem informações sensíveis

### Frontend

- ✅ Validação local antes de enviar
- ✅ Botão desabilitado durante requisição (prevent double-click)
- ✅ Sanitização de input
- ✅ Tratamento de erros completo

## 🎛️ Controle (Feature Flags)

O botão respeita as feature flags do backend:

```bash
# Desabilitar enriquecimento (botão retorna erro 503)
ENABLE_CNPJ_ENRICHMENT=false

# Desabilitar validação (permite CNPJs inválidos serem consultados)
ENABLE_CNPJ_VALIDATION=false

# Desabilitar tudo (botão retorna erro 503)
ENABLE_CNPJ_FEATURES=false
```

**Verificar status**:
```bash
curl http://localhost:8000/features
```

## 🧪 Como Testar

### 1. Teste Básico (Sucesso)

1. Acesse: `http://localhost:3000/invoices`
2. Faça upload de uma nota fiscal
3. Na tela de revisão:
   - Campo CNPJ: `00000000000191`
   - Clique no botão 🔍
4. **Resultado esperado**:
   - Nome atualizado para "BANCO DO BRASIL SA"
   - Mensagem verde: "✓ Nome atualizado com sucesso! Fonte: BrasilAPI"

### 2. Teste com CNPJ Inválido

1. Na tela de revisão:
   - Campo CNPJ: `11111111111111`
   - Tente clicar no botão 🔍
2. **Resultado esperado**:
   - Botão desabilitado
   - Mensagem de erro: "CNPJ inválido (dígitos repetidos)"

### 3. Teste com CNPJ Não Encontrado

1. Na tela de revisão:
   - Campo CNPJ: `12345678901234` (válido mas não existe)
   - Clique no botão 🔍
2. **Resultado esperado**:
   - Mensagem vermelha: "CNPJ não encontrado nas bases de dados públicas"
   - Nome NÃO é atualizado

### 4. Teste de Loading

1. Abra DevTools → Network → Throttle to "Slow 3G"
2. Digite CNPJ válido: `60746948000112`
3. Clique no botão 🔍
4. **Resultado esperado**:
   - Botão mostra "..."
   - Botão fica desabilitado
   - Após resposta: nome é atualizado

## 💡 Casos de Uso

### 1. IA Reconheceu Nome Parcialmente

**Antes**: "BANCO DO BRA"
**Ação**: Usuário clica em 🔍
**Depois**: "BANCO DO BRASIL SA"

### 2. IA Errou o Nome

**Antes**: "BRADESCO" (mas CNPJ é do Itaú)
**Ação**: Usuário clica em 🔍
**Depois**: "ITAU UNIBANCO SA"

### 3. Usuário Quer Confirmar Nome

**Antes**: "PADARIA SAO JOSE"
**Ação**: Usuário clica em 🔍
**Depois**: "PADARIA SAO JOSE LTDA" (versão oficial)

### 4. CNPJ Digitado Manualmente

**Antes**: Campo vazio
**Ação**: 
1. Usuário digita CNPJ: `00000000000191`
2. Clica em 🔍
**Depois**: Nome preenchido automaticamente

## 📈 Benefícios

### UX (Experiência do Usuário)

1. **Praticidade** - Um clique para preencher nome correto
2. **Confiança** - Dados oficiais da Receita Federal
3. **Transparência** - Mostra fonte dos dados (BrasilAPI/ReceitaWS)
4. **Feedback claro** - Mensagens de sucesso/erro específicas

### DX (Experiência do Desenvolvedor)

1. **Reutilizável** - Hook pode ser usado em outros lugares
2. **Tipado** - TypeScript garante type safety
3. **Testável** - Fácil de testar (mock do hook)
4. **Configurável** - Responde a feature flags

### Qualidade de Dados

1. **Precisão** - Nome oficial da Receita Federal
2. **Completude** - Nome completo (não parcial)
3. **Atualizado** - Dados em tempo real
4. **Validado** - Apenas CNPJs válidos podem ser consultados

## 🔍 Fontes de Dados

### BrasilAPI (Primária)

- **URL**: https://brasilapi.com.br/
- **Vantagens**: Rápida, gratuita, sem rate limit agressivo
- **Fonte**: Dados da Receita Federal

### ReceitaWS (Fallback)

- **URL**: https://receitaws.com.br/
- **Vantagens**: Dados completos, backup confiável
- **Limitação**: 3 requisições/minuto (plano gratuito)
- **Fonte**: Dados da Receita Federal

### Cache

- **Duração**: 24 horas
- **Motivo**: Evitar requisições repetidas ao mesmo CNPJ
- **Benefício**: Performance + respeitar rate limits

## 🚀 Próximas Melhorias (Futuras)

1. **Tooltip com dados completos** - Mostrar todos os dados (endereço, CNAE, etc.) em hover
2. **Histórico de consultas** - Salvar quais CNPJs foram enriquecidos
3. **Indicador visual** - Badge mostrando "Dados validados pela Receita"
4. **Preenchimento automático** - Preencher outros campos (endereço, etc.)
5. **Sugestão proativa** - Sugerir enriquecimento se nome parecer incompleto

---

**Status**: ✅ **COMPLETO E FUNCIONANDO**
**Data**: 2025-02-06
**Versão**: 1.0
**Testado**: ✅ Backend + Frontend
