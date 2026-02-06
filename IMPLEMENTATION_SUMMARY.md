# CNPJ Validation & Enrichment - Implementation Summary

## ✅ Implementation Complete

This implementation adds CNPJ validation and enrichment to the invoice confirmation flow using public Brazilian APIs.

## 📁 Files Created

### 1. `/apps/api/src/utils/cnpj_validator.py`
- **Purpose**: CNPJ validation using official checksum algorithm
- **Functions**:
  - `clean_cnpj()`: Remove formatting
  - `validate_cnpj()`: Validate using checksum algorithm
  - `format_cnpj()`: Format for display
- **Tests**: ✅ Validated with real CNPJs (Banco do Brasil, Bradesco, Itaú)

### 2. `/apps/api/src/services/cnpj_enrichment.py`
- **Purpose**: Enrich merchant data from public APIs
- **APIs**:
  - Primary: BrasilAPI (https://brasilapi.com.br/)
  - Fallback: ReceitaWS (https://receitaws.com.br/)
- **Features**:
  - Async requests with 5s timeout
  - 24h cache (TTLCache, 1000 entries max)
  - Automatic fallback on failure
  - Returns: razao_social, nome_fantasia, address, CNAE, status, etc.
- **Tests**: ✅ Successfully enriched CNPJ 00.000.000/0001-91

### 3. `/test_cnpj.py`
- **Purpose**: Standalone test script
- **Coverage**:
  - Valid CNPJ validation (3 real examples)
  - Invalid CNPJ rejection (3 test cases)
  - Live API enrichment test
- **Status**: ✅ All tests passing

### 4. `/CNPJ_IMPLEMENTATION.md`
- **Purpose**: Complete implementation documentation
- **Contents**: Usage, configuration, examples, troubleshooting

## 📝 Files Modified

### 1. `/apps/api/src/config.py`
**Added settings**:
```python
ENABLE_CNPJ_VALIDATION: bool = True
ENABLE_CNPJ_ENRICHMENT: bool = True
CNPJ_API_TIMEOUT: int = 5
CNPJ_CACHE_TTL: int = 86400
```

### 2. `/apps/api/src/routers/invoices.py`
**Modified function**: `confirm_extracted_invoice()`
**Added logic** (after line 451):
1. Clean CNPJ using validator
2. Validate CNPJ checksum (if enabled)
   - Block with HTTP 400 if invalid
3. Enrich CNPJ data (if enabled)
   - Try BrasilAPI → ReceitaWS (fallback)
   - Update `issuer_name` if enriched name is more complete
   - Save enrichment data in `raw_data.cnpj_enrichment`
   - Don't block if enrichment fails
4. Create invoice with validated/enriched data

**New imports**:
- `from src.utils.cnpj_validator import validate_cnpj, clean_cnpj, format_cnpj`
- `from src.services.cnpj_enrichment import enrich_cnpj_data`
- `from src.config import settings`

### 3. `/apps/api/requirements.txt`
**Added dependency**:
- `cachetools==5.3.3`

## 🎯 Features

### Validation
- ✅ Official CNPJ checksum algorithm
- ✅ Blocks invalid CNPJs (HTTP 400)
- ✅ Formatted error messages
- ✅ Configurable via `ENABLE_CNPJ_VALIDATION`

### Enrichment
- ✅ Query BrasilAPI (primary)
- ✅ Fallback to ReceitaWS
- ✅ 24h cache to avoid repeated requests
- ✅ 5s timeout to prevent blocking
- ✅ Non-blocking: continues if enrichment fails
- ✅ Smart name update: only if enriched name is more complete (+5 chars)
- ✅ Full data saved in `raw_data.cnpj_enrichment`
- ✅ Configurable via `ENABLE_CNPJ_ENRICHMENT`

## 🧪 Test Results

```bash
$ python test_cnpj.py

============================================================
Testing CNPJ Validation
============================================================

✓ Testing valid CNPJs:
  00.000.000/0001-91 -> Valid: True
  33.000.167/0001-01 -> Valid: True
  60.701.190/0001-04 -> Valid: True

✗ Testing invalid CNPJs:
  11.111.111/1111-11 -> Valid: False
  12.345.678/9012-34 -> Valid: False
  00.000.000/0000-00 -> Valid: False

✓ All validation tests passed!

============================================================
Testing CNPJ Enrichment
============================================================

Enriching CNPJ: 00.000.000/0001-91

✓ Enrichment successful from: brasilapi
  Razão Social: BANCO DO BRASIL SA
  Nome Fantasia: DIRECAO GERAL
  CNPJ: 00.000.000/0001-91
  Município: BRASILIA/DF
  Situação: ATIVA
  CNAE: 6422100

============================================================
All tests completed!
============================================================
```

## 🔄 Flow Diagram

```
User confirms invoice
  ↓
Clean CNPJ
  ↓
[NEW] Validate checksum
  ├─ Invalid? → HTTP 400 "CNPJ inválido"
  └─ Valid? → Continue
       ↓
[NEW] Query BrasilAPI
  ├─ Success? → Use data
  └─ Fail? → Try ReceitaWS
       ├─ Success? → Use data
       └─ Fail? → Continue with original data
            ↓
Update issuer_name (if enriched is better)
  ↓
Save invoice with enriched data
  ↓
Return success
```

## 📊 Data Enrichment Example

**Before enrichment**:
```json
{
  "issuer_cnpj": "00000000000191",
  "issuer_name": "BANCO DO BRASIL"
}
```

**After enrichment**:
```json
{
  "issuer_cnpj": "00000000000191",
  "issuer_name": "BANCO DO BRASIL SA",
  "raw_data": {
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
}
```

## ⚙️ Configuration

Default values (already set in `config.py`):
```python
ENABLE_CNPJ_VALIDATION = True   # Block invalid CNPJs
ENABLE_CNPJ_ENRICHMENT = True   # Enrich from APIs
CNPJ_API_TIMEOUT = 5            # Timeout in seconds
CNPJ_CACHE_TTL = 86400          # 24 hours
```

To disable (add to `.env`):
```bash
ENABLE_CNPJ_VALIDATION=false
ENABLE_CNPJ_ENRICHMENT=false
```

## 🚀 Usage

### Install Dependencies
```bash
cd apps/api
pip install -r requirements.txt
```

### Run Tests
```bash
python test_cnpj.py
```

### Start API
```bash
cd apps/api
uvicorn src.main:app --reload
```

The validation and enrichment will automatically run during invoice confirmation.

## 📋 Logs Generated

```
INFO: Cleaned CNPJ: '00000000000191' (length: 14)
INFO: ✓ CNPJ validated successfully: 00000000000191
INFO: ✓ CNPJ enriched from brasilapi: 00000000000191
INFO: ✓ Updated issuer_name: 'BANCO DO BRASIL' -> 'BANCO DO BRASIL SA'
INFO: ✓ Invoice confirmed successfully: <uuid>
```

## ⚠️ Error Handling

### Invalid CNPJ
**Request**:
```json
{
  "issuer_cnpj": "11.111.111/1111-11",
  ...
}
```

**Response** (HTTP 400):
```json
{
  "detail": {
    "message": "CNPJ inválido",
    "field": "issuer_cnpj",
    "value": "11.111.111/1111-11"
  }
}
```

### API Failure
If both BrasilAPI and ReceitaWS fail:
- Log warning: "CNPJ enrichment failed"
- Continue with original data
- Don't block invoice creation

## 🎓 Key Design Decisions

1. **Validation is blocking**: Invalid CNPJs are rejected to maintain data quality
2. **Enrichment is non-blocking**: API failures don't prevent invoice creation
3. **Smart name updates**: Only update if enriched name is significantly better
4. **Cache first**: 24h cache prevents repeated API calls for same CNPJ
5. **Fallback strategy**: BrasilAPI → ReceitaWS → Original data
6. **Full audit trail**: All enrichment data saved in `raw_data`
7. **Configurable**: Both features can be disabled via environment variables

## 📚 Documentation

- **Implementation details**: `/CNPJ_IMPLEMENTATION.md`
- **Original plan**: `/VALIDA_CNPJ.md`
- **Test script**: `/test_cnpj.py`

## ✨ Benefits

1. **Data Quality**: Blocks invalid CNPJs before saving
2. **Auto-correction**: Fixes merchant names extracted incorrectly by AI
3. **Rich metadata**: Stores complete merchant info for future use
4. **User transparency**: Clear error messages for invalid CNPJs
5. **Auditability**: Full enrichment data saved for compliance
6. **Performance**: Cache prevents redundant API calls
7. **Reliability**: Fallback ensures high availability

## 🔮 Future Enhancements

### Phase 3: UI Feedback (Optional)
- Badge "✓ CNPJ Validado" in review page
- Badge "⚠ CNPJ Inválido" for invalid CNPJs
- Tooltip showing enrichment source
- Visual highlight for auto-corrected fields

### Scalability (High Volume)
- Migrate cache from TTLCache to Redis
- Add background job queue (Celery)
- Consider paid API with SLA guarantees

---

**Status**: ✅ **COMPLETE & TESTED**
**Date**: 2025-02-06
**Version**: 1.0
