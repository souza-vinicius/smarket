# CNPJ Feature Flags - Control Guide

## Overview

The CNPJ validation and enrichment features can be controlled through environment variables. This allows you to disable these features when necessary without changing code.

## Feature Flags

### Master Flag

**`ENABLE_CNPJ_FEATURES`** (default: `true`)
- **Description**: Master switch for all CNPJ-related features
- **Effect**: When set to `false`, disables both validation and enrichment regardless of individual flags
- **Use case**: Quickly disable all CNPJ features at once

### Individual Flags

**`ENABLE_CNPJ_VALIDATION`** (default: `true`)
- **Description**: Controls CNPJ checksum validation
- **Effect**: When disabled, invalid CNPJs will not be blocked
- **Respects**: Master flag (`ENABLE_CNPJ_FEATURES`)
- **Use case**: Disable validation during testing or if validation is causing issues

**`ENABLE_CNPJ_ENRICHMENT`** (default: `true`)
- **Description**: Controls CNPJ enrichment via public APIs
- **Effect**: When disabled, no API calls to BrasilAPI/ReceitaWS
- **Respects**: Master flag (`ENABLE_CNPJ_FEATURES`)
- **Use case**: Disable enrichment if APIs are down or to reduce external dependencies

### Configuration Flags

**`CNPJ_API_TIMEOUT`** (default: `5`)
- **Description**: Timeout in seconds for API requests
- **Range**: 1-30 seconds
- **Use case**: Increase if APIs are slow, decrease to fail faster

**`CNPJ_CACHE_TTL`** (default: `86400`)
- **Description**: Cache time-to-live in seconds (default: 24 hours)
- **Range**: 0-604800 (0 = no cache, 604800 = 7 days)
- **Use case**: Adjust based on how fresh you need the data

## How to Disable Features

### Option 1: Disable Everything (Recommended for emergencies)

Add to your `.env` file:
```bash
ENABLE_CNPJ_FEATURES=false
```

**Result**: Both validation and enrichment are disabled immediately.

### Option 2: Disable Validation Only

Add to your `.env` file:
```bash
ENABLE_CNPJ_VALIDATION=false
```

**Result**: Invalid CNPJs will be accepted, but enrichment still works.

### Option 3: Disable Enrichment Only

Add to your `.env` file:
```bash
ENABLE_CNPJ_ENRICHMENT=false
```

**Result**: CNPJs are validated but no API calls for enrichment.

### Option 4: Selective Control

Add to your `.env` file:
```bash
# Keep master flag enabled
ENABLE_CNPJ_FEATURES=true

# Disable specific features
ENABLE_CNPJ_VALIDATION=false
ENABLE_CNPJ_ENRICHMENT=true
```

**Result**: Enrichment works, but validation is skipped.

## Environment Variables Priority

```
ENABLE_CNPJ_FEATURES (master)
    ↓
    ├─ ENABLE_CNPJ_VALIDATION
    │   ↓
    │   Final: cnpj_validation_enabled = ENABLE_CNPJ_FEATURES AND ENABLE_CNPJ_VALIDATION
    │
    └─ ENABLE_CNPJ_ENRICHMENT
        ↓
        Final: cnpj_enrichment_enabled = ENABLE_CNPJ_FEATURES AND ENABLE_CNPJ_ENRICHMENT
```

**Examples**:

| ENABLE_CNPJ_FEATURES | ENABLE_CNPJ_VALIDATION | Final Validation | ENABLE_CNPJ_ENRICHMENT | Final Enrichment |
|---------------------|------------------------|------------------|------------------------|------------------|
| true                | true                   | ✅ enabled       | true                   | ✅ enabled       |
| true                | false                  | ❌ disabled      | true                   | ✅ enabled       |
| false               | true                   | ❌ disabled      | true                   | ❌ disabled      |
| false               | false                  | ❌ disabled      | false                  | ❌ disabled      |

## Checking Feature Status

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

### Via Logs

When features are disabled, you'll see logs like:
```
INFO: CNPJ validation disabled (flag: false)
INFO: CNPJ enrichment disabled (flag: false)
```

## When to Disable Features

### Disable Validation When:
- ✅ Testing with mock/invalid CNPJs
- ✅ Importing old data with potentially invalid CNPJs
- ✅ Validation algorithm has issues
- ✅ Need to accept invoices without CNPJ validation temporarily

### Disable Enrichment When:
- ✅ BrasilAPI/ReceitaWS are down
- ✅ Rate limits are being hit frequently
- ✅ You want to reduce external API dependencies
- ✅ Testing without network access
- ✅ Cost reduction (avoid API calls)

### Disable Both When:
- ✅ Emergency rollback needed
- ✅ Critical bug in CNPJ features
- ✅ Need to bypass CNPJ processing entirely
- ✅ Maintenance mode

## Impact of Disabling

### When Validation is Disabled:
- ⚠️ Invalid CNPJs will be accepted and saved
- ⚠️ Data quality may decrease
- ✅ No HTTP 400 errors for invalid CNPJs
- ✅ Faster processing (no validation overhead)

### When Enrichment is Disabled:
- ⚠️ Merchant names won't be auto-corrected
- ⚠️ No additional merchant data in `raw_data.cnpj_enrichment`
- ✅ No external API dependencies
- ✅ Faster processing (no API calls)
- ✅ No rate limit issues

### When Both are Disabled:
- ⚠️ CNPJ features completely bypassed
- ✅ Falls back to original behavior (pre-feature implementation)
- ✅ Maximum processing speed
- ✅ Zero external dependencies

## Re-enabling Features

### To re-enable, simply remove the flags from `.env`:
```bash
# Option 1: Remove the lines
# ENABLE_CNPJ_FEATURES=false

# Option 2: Set to true
ENABLE_CNPJ_FEATURES=true
```

### Then restart the API:
```bash
# Docker
docker-compose restart api

# Manual
# Stop uvicorn (Ctrl+C)
# Start again
uvicorn src.main:app --reload
```

## Testing Feature Flags

### Test with features enabled:
```bash
# Set in .env
ENABLE_CNPJ_FEATURES=true

# Upload and confirm invoice with valid CNPJ
# Should see: "✓ CNPJ validated" in logs
```

### Test with features disabled:
```bash
# Set in .env
ENABLE_CNPJ_FEATURES=false

# Upload and confirm invoice with invalid CNPJ
# Should accept without validation error
```

### Test validation only:
```bash
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_VALIDATION=true
ENABLE_CNPJ_ENRICHMENT=false

# Should validate but not enrich
```

## Default Configuration

If no environment variables are set, the defaults are:
```python
ENABLE_CNPJ_FEATURES = True
ENABLE_CNPJ_VALIDATION = True
ENABLE_CNPJ_ENRICHMENT = True
CNPJ_API_TIMEOUT = 5
CNPJ_CACHE_TTL = 86400
```

## Example .env Configurations

### Production (Recommended):
```bash
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_VALIDATION=true
ENABLE_CNPJ_ENRICHMENT=true
CNPJ_API_TIMEOUT=5
CNPJ_CACHE_TTL=86400
```

### Development (With Enrichment):
```bash
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_VALIDATION=true
ENABLE_CNPJ_ENRICHMENT=true
CNPJ_API_TIMEOUT=10
CNPJ_CACHE_TTL=3600
```

### Testing (No External APIs):
```bash
ENABLE_CNPJ_FEATURES=true
ENABLE_CNPJ_VALIDATION=true
ENABLE_CNPJ_ENRICHMENT=false
```

### Emergency Disable (Rollback):
```bash
ENABLE_CNPJ_FEATURES=false
```

## Monitoring

To monitor feature flag changes:

1. **Check status endpoint**:
   ```bash
   curl http://localhost:8000/features | jq '.cnpj_features'
   ```

2. **Check logs** for feature-related messages:
   ```bash
   docker-compose logs -f api | grep CNPJ
   ```

3. **Test invoice confirmation** and verify behavior

## Troubleshooting

### Features not disabling:
- ✅ Verify `.env` file exists in correct location
- ✅ Restart API after changing `.env`
- ✅ Check `/features` endpoint for current status
- ✅ Look for typos in environment variable names

### Features disabled but still running:
- ❌ Check if you're using cached settings
- ❌ Verify no override in `docker-compose.yml`
- ❌ Check for multiple `.env` files

### Validation disabled but enrichment not working:
- ⚠️ Enrichment only runs after successful validation
- ⚠️ If validation is disabled, enrichment may be skipped
- ⚠️ Check `ENABLE_CNPJ_FEATURES` master flag

## Best Practices

1. **Use master flag for emergencies**: Disable `ENABLE_CNPJ_FEATURES` for quick rollback
2. **Test flags in development first**: Don't disable in production without testing
3. **Document why you disabled**: Add comment in `.env` explaining reason
4. **Monitor after disabling**: Check logs to ensure expected behavior
5. **Re-enable when issue resolved**: Don't leave features disabled indefinitely

## Support

For issues with feature flags:
1. Check current status: `GET /features`
2. Verify `.env` configuration
3. Check application logs
4. Test with simple CNPJ validation/enrichment request

---

**Last Updated**: 2025-02-06
**Version**: 1.0
