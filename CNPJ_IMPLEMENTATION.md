# Validação e Enriquecimento de CNPJ - Documentação de Implementação

## Visão Geral

Este documento descreve a implementação da validação e enriquecimento de CNPJ usando APIs públicas brasileiras no sistema Mercado Esperto.

## Funcionalidades Implementadas

### 1. Validação de CNPJ (Checksum)

**Arquivo**: `apps/api/src/utils/cnpj_validator.py`

Implementa o algoritmo oficial de validação de CNPJ através dos dígitos verificadores.

**Funções disponíveis**:
- `clean_cnpj(cnpj: str) -> str`: Remove formatação (pontos, hífens, barras)
- `validate_cnpj(cnpj: str) -> bool`: Valida CNPJ usando algoritmo de checksum
- `format_cnpj(cnpj: str) -> str`: Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)

**Exemplos**:
```python
from src.utils.cnpj_validator import validate_cnpj, format_cnpj

# Validar CNPJ
is_valid = validate_cnpj("00.000.000/0001-91")  # True
is_valid = validate_cnpj("11.111.111/1111-11")  # False

# Formatar CNPJ
formatted = format_cnpj("00000000000191")  # "00.000.000/0001-91"
```

### 2. Enriquecimento de Dados via APIs Públicas

**Arquivo**: `apps/api/src/services/cnpj_enrichment.py`

Consulta APIs públicas para obter dados completos do estabelecimento:

**APIs utilizadas** (com fallback):
1. **BrasilAPI** (primária): https://brasilapi.com.br/
   - Gratuita e open source
   - Mantida pela comunidade brasileira
   - Baixa latência
   - Sem autenticação necessária

2. **ReceitaWS** (fallback): https://receitaws.com.br/
   - Gratuita com rate limits
   - Dados da Receita Federal
   - Usada se BrasilAPI falhar

**Dados retornados**:
- Razão Social
- Nome Fantasia
- CNPJ formatado
- Endereço completo (logradouro, número, complemento, bairro, município, UF, CEP)
- Telefone e email
- Situação cadastral (ATIVA, INAPTA, etc)
- CNAE fiscal
- Data de abertura

**Cache**: Resultados são cacheados por 24 horas (TTLCache com max 1000 entradas)

### 3. Integração no Fluxo de Confirmação

**Arquivo**: `apps/api/src/routers/invoices.py`

**Endpoint modificado**: `POST /api/v1/invoices/processing/{processing_id}/confirm`

**Fluxo implementado**:

1. **Limpeza do CNPJ**: Remove formatação
2. **Validação** (se habilitada):
   - Valida checksum do CNPJ
   - Se inválido: retorna HTTP 400 com mensagem clara
   - Se válido: continua para enriquecimento
3. **Enriquecimento** (se habilitado):
   - Consulta APIs públicas (BrasilAPI → ReceitaWS)
   - Se sucesso: atualiza `issuer_name` se o nome enriquecido for mais completo
   - Salva dados completos em `raw_data.cnpj_enrichment` para referência
   - Se falha: continua com dados originais (não bloqueia o fluxo)
4. **Salvamento**: Cria invoice com dados validados/enriquecidos

## Configuração

**Arquivo**: `apps/api/src/config.py`

Variáveis de ambiente (valores padrão já configurados):

```bash
# CNPJ Enrichment
ENABLE_CNPJ_VALIDATION=true      # Habilita validação de checksum
ENABLE_CNPJ_ENRICHMENT=true      # Habilita enriquecimento via APIs
CNPJ_API_TIMEOUT=5               # Timeout em segundos para APIs externas
CNPJ_CACHE_TTL=86400             # TTL do cache em segundos (24h)
```

## Dependências

Novas dependências em `apps/api/requirements.txt`:
- `cachetools==5.3.3` (nova) - Cache em memória com TTL

## Testes

**Arquivo de teste**: `test_cnpj.py` (na raiz do projeto)

**Executar testes**:
```bash
python test_cnpj.py
```

**Resultado esperado**:
```
✓ All validation tests passed!
✓ Enrichment successful from: brasilapi
  Razão Social: BANCO DO BRASIL SA
  Nome Fantasia: DIRECAO GERAL
  ...
```

## Comportamento

### Validação
- ✅ **Bloqueia** se CNPJ for inválido (retorna HTTP 400)
- ✅ Valida apenas CNPJs com 14 dígitos
- ✅ Rejeita CNPJs com todos os dígitos iguais
- ✅ Usa algoritmo oficial da Receita Federal

### Enriquecimento
- ✅ **Não bloqueia** se enriquecimento falhar
- ✅ Tenta BrasilAPI primeiro (mais rápida)
- ✅ Fallback para ReceitaWS se BrasilAPI falhar
- ✅ Atualiza `issuer_name` apenas se o nome enriquecido for mais completo (+5 caracteres)
- ✅ Salva dados completos em `raw_data.cnpj_enrichment` para auditoria
- ✅ Cache de 24h para evitar requisições repetidas
- ✅ Timeout de 5s para não travar o fluxo

## Estrutura de Dados no raw_data

Quando o enriquecimento é bem-sucedido:

```json
{
  "cnpj_enrichment": {
    "source": "brasilapi",
    "enriched_at": "2025-02-06T15:30:00",
    "data": {
      "razao_social": "BANCO DO BRASIL SA",
      "nome_fantasia": "DIRECAO GERAL",
      "cnpj": "00.000.000/0001-91",
      "municipio": "BRASILIA",
      "uf": "DF",
      "situacao": "ATIVA",
      "cnae_fiscal": "6422100",
      ...
    }
  }
}
```

## Referências

- [Brasil API](https://brasilapi.com.br/)
- [ReceitaWS](https://receitaws.com.br/)

---

**Implementado**: 2025-02-06
**Versão**: 1.0
