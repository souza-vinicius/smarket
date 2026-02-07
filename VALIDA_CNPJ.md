# Plano: Validação e Enriquecimento de CNPJ via APIs Públicas

## Objetivo

Melhorar a fidelidade do reconhecimento de notas fiscais validando e enriquecendo dados do estabelecimento usando o CNPJ extraído através de APIs públicas brasileiras.

## Contexto

Atualmente, o sistema extrai CNPJ e nome do estabelecimento via IA (Gemini/OpenAI/Anthropic) de fotos de notas fiscais, mas:
- Não valida se o CNPJ é válido (checksum)
- Não verifica se o estabelecimento existe
- Não corrige/enriquece dados quando a IA erra ou reconhece parcialmente

## APIs Públicas Disponíveis

### Opção 1: BrasilAPI (Recomendada)
- **URL**: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- **Vantagens**:
  - Gratuita e open source
  - Mantida pela comunidade
  - Sem autenticação necessária
  - Baixa latência
  - Moderna e bem documentada
- **Fonte**: [Brasil API](https://brasilapi.com.br/)

### Opção 2: ReceitaWS
- **URL**: `https://receitaws.com.br/v1/cnpj/{cnpj}`
- **Vantagens**:
  - Gratuita
  - Dados completos da Receita Federal
  - Inclui CNAE, situação cadastral, etc.
- **Limitação**: Rate limit para uso gratuito
- **Fonte**: [ReceitaWS](https://receitaws.com.br/)

### Opção 3: CNPJ.ws
- **URL**: `https://www.cnpj.ws/{cnpj}`
- **Vantagens**: Rápida e sem registro
- **Fonte**: [CNPJ.ws](https://www.cnpj.ws/en-US)

## Arquitetura da Solução

### 1. Validação de CNPJ (Checksum)

**Arquivo**: `/Users/vinicius/code/smarket/apps/api/src/utils/cnpj_validator.py` (novo)

**Funções**:
```python
def clean_cnpj(cnpj: str) -> str:
    """Remove formatação (pontos, hífens, barras)"""
    return "".join(c for c in cnpj if c.isdigit())

def validate_cnpj(cnpj: str) -> bool:
    """Valida CNPJ usando algoritmo de checksum oficial"""
    # Implementar validação dos dígitos verificadores
    # Retorna True se válido, False caso contrário

def format_cnpj(cnpj: str) -> str:
    """Formata CNPJ: XX.XXX.XXX/XXXX-XX"""
    # Para exibição amigável
```

**Algoritmo de Validação**:
- CNPJ tem 14 dígitos (12 base + 2 verificadores)
- Usa multiplicadores específicos para calcular dígitos verificadores
- Biblioteca Python recomendada: `validate-docbr` ou implementação custom

### 2. Serviço de Enriquecimento

**Arquivo**: `/Users/vinicius/code/smarket/apps/api/src/services/cnpj_enrichment.py` (novo)

**Funções**:
```python
async def enrich_cnpj_data(cnpj: str) -> Optional[dict]:
    """
    Consulta API pública para obter dados do estabelecimento.

    Returns:
        dict com campos:
        - razao_social: str
        - nome_fantasia: str
        - cnpj: str (formatado)
        - logradouro: str
        - numero: str
        - complemento: str
        - bairro: str
        - municipio: str
        - uf: str
        - cep: str
        - telefone: str
        - email: str
        - situacao: str (ATIVA, INAPTA, etc)
        - cnae_fiscal: str
        - data_abertura: str
    """

async def fetch_from_brasilapi(cnpj: str) -> Optional[dict]:
    """Consulta BrasilAPI"""
    url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
    # Usar httpx para requisição async
    # Timeout de 5 segundos
    # Retry 2 vezes em caso de erro

async def fetch_from_receitaws(cnpj: str) -> Optional[dict]:
    """Fallback: consulta ReceitaWS se BrasilAPI falhar"""
    url = f"https://receitaws.com.br/v1/cnpj/{cnpj}"
```

**Estratégia de Fallback**:
1. Tentar BrasilAPI primeiro (mais rápida)
2. Se falhar, tentar ReceitaWS
3. Se ambas falharem, continuar sem enriquecimento (não bloquear fluxo)
4. Cachear resultados por CNPJ para evitar requisições repetidas

### 3. Configuração

**Arquivo**: `/Users/vinicius/code/smarket/apps/api/src/config.py`

**Adicionar**:
```python
class Settings(BaseSettings):
    # ... existing settings ...

    # CNPJ Enrichment
    ENABLE_CNPJ_VALIDATION: bool = True
    ENABLE_CNPJ_ENRICHMENT: bool = True
    CNPJ_API_TIMEOUT: int = 5  # segundos
    CNPJ_CACHE_TTL: int = 86400  # 24 horas em segundos
```

### 4. Integração no Fluxo de Confirmação

**Arquivo**: `/Users/vinicius/code/smarket/apps/api/src/routers/invoices.py`

**Localização**: Função `confirm_extracted_invoice()`, após linha 451 (limpeza de CNPJ)

**Lógica de Integração**:
```python
# Após linha 451 (CNPJ cleaning)
from src.utils.cnpj_validator import validate_cnpj, format_cnpj
from src.services.cnpj_enrichment import enrich_cnpj_data

# 1. Validar CNPJ
if issuer_cnpj and len(issuer_cnpj) == 14:
    is_valid = validate_cnpj(issuer_cnpj)

    if not is_valid:
        logger.warning(f"Invalid CNPJ detected: {issuer_cnpj}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "CNPJ inválido",
                "field": "issuer_cnpj",
                "value": issuer_cnpj
            }
        )

    # 2. Enriquecer dados (se habilitado)
    if settings.ENABLE_CNPJ_ENRICHMENT:
        try:
            enriched = await enrich_cnpj_data(issuer_cnpj)

            if enriched:
                logger.info(f"CNPJ enriched: {issuer_cnpj}")

                # Usar nome fantasia se disponível, senão razão social
                enriched_name = enriched.get('nome_fantasia') or enriched.get('razao_social')

                # Atualizar issuer_name se:
                # - Estiver vazio
                # - OU nome enriquecido for mais completo (heurística)
                if not request.issuer_name or len(enriched_name) > len(request.issuer_name):
                    old_name = request.issuer_name
                    request.issuer_name = enriched_name
                    logger.info(f"Updated issuer_name: '{old_name}' -> '{enriched_name}'")

                # Salvar dados completos em raw_data para referência
                raw_data['cnpj_enrichment'] = {
                    'source': 'brasilapi',  # ou 'receitaws'
                    'enriched_at': datetime.utcnow().isoformat(),
                    'data': enriched
                }
        except Exception as e:
            # Não falhar se enriquecimento falhar
            logger.warning(f"CNPJ enrichment failed: {e}")
            # Continuar com dados originais
```

**Comportamento**:
- ✅ **Validação**: Bloqueia se CNPJ for inválido (retorna HTTP 400)
- ✅ **Enriquecimento**: Tenta melhorar dados, mas não bloqueia se falhar
- ✅ **Logs**: Registra todas as etapas para debugging
- ✅ **Cache**: Evita consultas repetidas (implementar com Redis ou TTLCache)

## Frontend: Feedback Visual

**Arquivo**: `/Users/vinicius/code/smarket/apps/web/src/app/invoices/review/[processingId]/page.tsx`

**Melhorias**:
1. Mostrar badge "✓ CNPJ Validado" quando CNPJ for válido
2. Mostrar badge "⚠ CNPJ Inválido" se falhar validação
3. Mostrar tooltip "Dados enriquecidos via Receita Federal" se enrichment foi usado
4. Highlight visual em campos que foram corrigidos por enriquecimento

## Dependências Necessárias

**Arquivo**: `/Users/vinicius/code/smarket/apps/api/requirements.txt`

**Adicionar**:
```
httpx==0.27.0          # Para requisições HTTP async
cachetools==5.3.3      # Para cache de consultas CNPJ
validate-docbr==1.10.0 # Validação de documentos brasileiros (opcional)
```

## Fluxo Completo (End-to-End)

### 1. Upload de Foto
```
Usuário → Upload foto → Background task → IA extrai CNPJ (pode ter erros)
```

### 2. Revisão
```
Usuário revisa → Tela de review → Edita se necessário
```

### 3. Confirmação (NOVO FLUXO)
```
Usuário confirma
  ↓
Backend limpa CNPJ (remove formatação)
  ↓
[NOVO] Valida checksum do CNPJ
  ├─ Inválido? → Retorna HTTP 400 com mensagem clara
  └─ Válido? → Continua
       ↓
[NOVO] Consulta API pública (BrasilAPI/ReceitaWS)
  ├─ Sucesso? → Enriquece issuer_name e salva dados extras em raw_data
  └─ Falha? → Continua com dados originais (não bloqueia)
       ↓
Salva Invoice no banco de dados
  ↓
Retorna sucesso → Redireciona para lista
```

## Arquivos a Criar

1. `/Users/vinicius/code/smarket/apps/api/src/utils/cnpj_validator.py`
   - Validação de CNPJ (checksum)
   - Formatação e limpeza

2. `/Users/vinicius/code/smarket/apps/api/src/services/cnpj_enrichment.py`
   - Integração com BrasilAPI
   - Fallback para ReceitaWS
   - Cache de consultas

## Arquivos a Modificar

1. `/Users/vinicius/code/smarket/apps/api/src/routers/invoices.py`
   - Função `confirm_extracted_invoice()` (linha ~451)
   - Adicionar validação e enriquecimento

2. `/Users/vinicius/code/smarket/apps/api/src/config.py`
   - Adicionar configurações de CNPJ

3. `/Users/vinicius/code/smarket/apps/api/requirements.txt`
   - Adicionar httpx e cachetools

4. `/Users/vinicius/code/smarket/apps/web/src/app/invoices/review/[processingId]/page.tsx`
   - Adicionar feedback visual (opcional, pode ser fase 2)

## Testes e Validação

### 1. Teste de Validação
```bash
# CNPJ válido
curl -X POST http://localhost:8000/api/v1/invoices/processing/{id}/confirm \
  -H "Authorization: Bearer TOKEN" \
  -d '{"issuer_cnpj": "00.000.000/0001-91", ...}'

# Deve aceitar e processar

# CNPJ inválido
curl -X POST http://localhost:8000/api/v1/invoices/processing/{id}/confirm \
  -H "Authorization: Bearer TOKEN" \
  -d '{"issuer_cnpj": "11.111.111/1111-11", ...}'

# Deve retornar HTTP 400 com mensagem "CNPJ inválido"
```

### 2. Teste de Enriquecimento
```bash
# Upload foto com CNPJ real
# Confirmar nota
# Verificar logs: "CNPJ enriched", "Updated issuer_name"
# Verificar raw_data tem campo 'cnpj_enrichment'
```

### 3. Teste de Fallback
```bash
# Simular falha de API (desconectar internet ou mock)
# Confirmar nota deve ainda funcionar
# Logs devem mostrar "CNPJ enrichment failed" mas processo continua
```

## Ordem de Implementação

### Fase 1: Validação (Alto Impacto, Baixo Risco)
1. Criar `cnpj_validator.py` com validação de checksum
2. Integrar validação no endpoint de confirmação
3. Adicionar testes unitários
4. Testar com CNPJs válidos e inválidos

**Benefício**: Evita salvar notas com CNPJ claramente inválido

### Fase 2: Enriquecimento (Alto Impacto, Médio Risco)
1. Criar `cnpj_enrichment.py` com integração BrasilAPI
2. Adicionar fallback para ReceitaWS
3. Implementar cache (TTLCache ou Redis)
4. Integrar no endpoint de confirmação
5. Testar com CNPJs reais

**Benefício**: Corrige automaticamente nomes de estabelecimentos mal reconhecidos pela IA

### Fase 3: UI Feedback (Baixo Impacto, Baixo Risco)
1. Adicionar badges visuais na tela de review
2. Mostrar indicador quando dados foram enriquecidos
3. Adicionar tooltip com informações extras

**Benefício**: Transparência para o usuário sobre qualidade dos dados

## Considerações

### Performance
- APIs públicas têm rate limits (especialmente ReceitaWS)
- Cache é essencial para evitar requisições repetidas
- Timeout de 5s para não travar o fluxo
- Enriquecimento é async e não bloqueia

### Privacidade
- CNPJ é dado público no Brasil
- Consultas não violam LGPD
- Dados enriquecidos são apenas informativos

### Escalabilidade
- Para alto volume, considerar:
  - Cache distribuído (Redis)
  - Fila de enriquecimento assíncrona (Celery)
  - API paga com SLA garantido

## Métricas de Sucesso

- Taxa de CNPJs válidos aumenta
- Taxa de nomes corrigidos/melhorados por enriquecimento
- Tempo médio de confirmação (não deve aumentar significativamente)
- Taxa de erro de APIs externas (deve ter fallback gracioso)

## Referências

- [Brasil API](https://brasilapi.com.br/)
- [ReceitaWS](https://receitaws.com.br/)
- [CNPJ.ws](https://www.cnpj.ws/en-US)
- [Free APIs for Brazilian Developers](https://medium.com/@berohlfs/8-free-apis-to-power-your-projects-plus-3-bonus-picks-for-brazilian-devs-609c1e47276d)
