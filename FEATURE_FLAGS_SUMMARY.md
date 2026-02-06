# Feature Flags Implementation Summary

## ✅ Implementation Complete

The CNPJ validation and enrichment features can now be controlled via environment variables with a master kill switch.

## 🎛️ Feature Flags Added

### Master Flag
- **`ENABLE_CNPJ_FEATURES`** (default: `true`)
  - Master switch to disable all CNPJ features at once
  - Overrides individual flags when set to `false`
  - Use for emergency rollback

### Individual Flags
- **`ENABLE_CNPJ_VALIDATION`** (default: `true`)
  - Controls CNPJ checksum validation
  - Respects master flag
  
- **`ENABLE_CNPJ_ENRICHMENT`** (default: `true`)
  - Controls API enrichment calls
  - Respects master flag

### Configuration Flags
- **`CNPJ_API_TIMEOUT`** (default: `5`)
  - API request timeout in seconds
  
- **`CNPJ_CACHE_TTL`** (default: `86400`)
  - Cache time-to-live in seconds (24 hours)

## 📁 Files Modified

### 1. `apps/api/src/config.py`
**Added**:
```python
# Master flag
ENABLE_CNPJ_FEATURES: bool = True

# Computed properties (respect master flag)
@property
def cnpj_validation_enabled(self) -> bool:
    return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_VALIDATION

@property
def cnpj_enrichment_enabled(self) -> bool:
    return self.ENABLE_CNPJ_FEATURES and self.ENABLE_CNPJ_ENRICHMENT
```

### 2. `apps/api/src/routers/invoices.py`
**Updated checks**:
```python
# Before
if settings.ENABLE_CNPJ_VALIDATION and issuer_cnpj:

# After
if settings.cnpj_validation_enabled and issuer_cnpj:
```

### 3. `apps/api/src/main.py`
**Added feature status endpoint**:
```python
@app.get("/features")
async def feature_status():
    """Get status of feature flags."""
    return {
        "cnpj_features": {
            "master_enabled": settings.ENABLE_CNPJ_FEATURES,
            "validation": {...},
            "enrichment": {...}
        }
    }
```

### 4. `.env.example`
**Added CNPJ section**:
```bash
# CNPJ Features
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_VALIDATION=true
ENABLE_CNPJ_ENRICHMENT=true
CNPJ_API_TIMEOUT=5
CNPJ_CACHE_TTL=86400
```

## 📚 Documentation Created

1. **`FEATURE_FLAGS.md`** - Complete feature flag guide (4,000+ words)
   - When to disable features
   - Configuration examples
   - Impact analysis
   - Troubleshooting

2. **`CNPJ_QUICK_REFERENCE.md`** - Quick reference card
   - Common scenarios
   - One-line commands
   - Quick tips table

3. **`test_flags_simple.py`** - Feature flag logic tests
   - Tests all flag combinations
   - Validates AND logic
   - ✅ All tests passing

## 🎯 How Feature Flags Work

### Logic Flow
```
Final validation enabled = ENABLE_CNPJ_FEATURES AND ENABLE_CNPJ_VALIDATION
Final enrichment enabled = ENABLE_CNPJ_FEATURES AND ENABLE_CNPJ_ENRICHMENT
```

### Truth Table

| Master | Validation | Final Validation | Enrichment | Final Enrichment |
|--------|------------|------------------|------------|------------------|
| ✅ true  | ✅ true     | ✅ **enabled**      | ✅ true     | ✅ **enabled**      |
| ✅ true  | ❌ false    | ❌ **disabled**     | ✅ true     | ✅ **enabled**      |
| ✅ true  | ✅ true     | ✅ **enabled**      | ❌ false    | ❌ **disabled**     |
| ❌ false | ✅ true     | ❌ **disabled**     | ✅ true     | ❌ **disabled**     |
| ❌ false | ❌ false    | ❌ **disabled**     | ❌ false    | ❌ **disabled**     |

## 🚨 Quick Disable Commands

### Emergency (Disable Everything)
```bash
# Add to .env
ENABLE_CNPJ_FEATURES=false

# Restart API
docker-compose restart api
```

### Disable Validation Only
```bash
ENABLE_CNPJ_VALIDATION=false
```

### Disable Enrichment Only
```bash
ENABLE_CNPJ_ENRICHMENT=false
```

## 📊 Check Feature Status

### Via API Endpoint
```bash
curl http://localhost:8000/features
```

**Response**:
```json
{
  "cnpj_features": {
    "master_enabled": true,
    "validation": {
      "flag": true,
      "enabled": true,
      "description": "Validates CNPJ checksum before saving invoices"
    },
    "enrichment": {
      "flag": true,
      "enabled": true,
      "description": "Enriches merchant data from BrasilAPI/ReceitaWS",
      "timeout": 5,
      "cache_ttl": 86400
    }
  }
}
```

### Via Python
```python
from src.config import settings

print(f"Validation enabled: {settings.cnpj_validation_enabled}")
print(f"Enrichment enabled: {settings.cnpj_enrichment_enabled}")
```

## ✅ Tests Results

```
Testing CNPJ Feature Flags Logic
======================================================================

1. All enabled ✅ PASS
2. Master disabled ✅ PASS
3. Master enabled, validation disabled ✅ PASS
4. Master enabled, enrichment disabled ✅ PASS
5. All disabled ✅ PASS

✅ ALL LOGIC TESTS PASSED!
```

## 🔄 Migration Path

### From Current Setup (No Flags)
**Before**: Features always enabled, can't disable
**After**: Features configurable via environment variables

### Zero Downtime Migration
1. Deploy code with feature flags (defaults to `true`)
2. Features continue working as before
3. Can disable if needed via `.env`
4. No code changes required

## 🎓 Best Practices

1. **Use master flag for emergencies**
   ```bash
   ENABLE_CNPJ_FEATURES=false  # Quick rollback
   ```

2. **Document when disabling**
   ```bash
   # Disabled due to BrasilAPI outage - 2025-02-06
   ENABLE_CNPJ_ENRICHMENT=false
   ```

3. **Monitor after disabling**
   - Check `/features` endpoint
   - Review logs for expected behavior
   - Test invoice confirmation

4. **Re-enable when issue resolved**
   ```bash
   # Remove or set back to true
   ENABLE_CNPJ_ENRICHMENT=true
   ```

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| `FEATURE_FLAGS.md` | Complete configuration guide |
| `CNPJ_QUICK_REFERENCE.md` | Quick reference card |
| `FEATURE_FLAGS_SUMMARY.md` | This document |
| `.env.example` | Example configuration |

## 🔍 Verification

```bash
# Check current status
curl http://localhost:8000/features | jq '.cnpj_features'

# Test validation enabled
python -c "from src.config import settings; print(settings.cnpj_validation_enabled)"

# Test enrichment enabled
python -c "from src.config import settings; print(settings.cnpj_enrichment_enabled)"
```

## 💡 Common Use Cases

### Testing
```bash
ENABLE_CNPJ_ENRICHMENT=false  # No external API calls
```

### Production with API issues
```bash
ENABLE_CNPJ_ENRICHMENT=false  # Temporary disable
```

### Import legacy data
```bash
ENABLE_CNPJ_VALIDATION=false  # Allow invalid CNPJs
```

### Emergency rollback
```bash
ENABLE_CNPJ_FEATURES=false    # Disable everything
```

---

## ✨ Key Benefits

1. **Zero-downtime control**: Enable/disable without code changes
2. **Emergency rollback**: Single flag disables everything
3. **Granular control**: Individual flags for validation/enrichment
4. **Observable**: `/features` endpoint shows current status
5. **Well-documented**: 3 documentation files + examples
6. **Tested**: Logic validated with automated tests
7. **Backward compatible**: Defaults match current behavior

---

**Status**: ✅ **COMPLETE & TESTED**
**Date**: 2025-02-06
**Version**: 1.0
