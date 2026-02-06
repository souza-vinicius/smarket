# CNPJ Features - Quick Reference Card

## 🚨 Emergency Disable (One Command)

Add to `.env` and restart API:
```bash
ENABLE_CNPJ_FEATURES=false
```
✅ Disables everything instantly

---

## 🎛️ Common Scenarios

### Scenario 1: APIs are down (BrasilAPI/ReceitaWS)
```bash
# Keep validation, disable enrichment
ENABLE_CNPJ_ENRICHMENT=false
```

### Scenario 2: Need to import old data with invalid CNPJs
```bash
# Disable validation temporarily
ENABLE_CNPJ_VALIDATION=false
```

### Scenario 3: Rate limiting issues
```bash
# Disable enrichment or increase cache time
ENABLE_CNPJ_ENRICHMENT=false
# OR
CNPJ_CACHE_TTL=604800  # 7 days
```

### Scenario 4: Testing without network
```bash
# Disable enrichment only
ENABLE_CNPJ_ENRICHMENT=false
```

---

## 📊 Check Current Status

```bash
curl http://localhost:8000/features
```

---

## 🔄 Default Values

```bash
ENABLE_CNPJ_FEATURES=true       # Master switch
ENABLE_CNPJ_VALIDATION=true     # Validate CNPJs
ENABLE_CNPJ_ENRICHMENT=true     # Enrich from APIs
CNPJ_API_TIMEOUT=5              # 5 seconds
CNPJ_CACHE_TTL=86400            # 24 hours
```

---

## 💡 Quick Tips

| Want to...                          | Set...                        |
|-------------------------------------|-------------------------------|
| Disable everything                  | `ENABLE_CNPJ_FEATURES=false`  |
| Allow invalid CNPJs                 | `ENABLE_CNPJ_VALIDATION=false`|
| Stop API calls                      | `ENABLE_CNPJ_ENRICHMENT=false`|
| Disable cache                       | `CNPJ_CACHE_TTL=0`            |
| Increase timeout (slow APIs)        | `CNPJ_API_TIMEOUT=10`         |

---

## 🔧 How to Apply Changes

1. Edit `.env` file
2. Restart API:
   ```bash
   # Docker
   docker-compose restart api
   
   # Manual
   # Stop (Ctrl+C) and restart
   uvicorn src.main:app --reload
   ```
3. Verify: `curl http://localhost:8000/features`

---

## 📖 Full Documentation

See `FEATURE_FLAGS.md` for complete guide.

---

**Quick Help**: 
- Status endpoint: `/features`
- Validation blocks invalid CNPJs (HTTP 400)
- Enrichment queries BrasilAPI → ReceitaWS (fallback)
- Master flag overrides individual flags
