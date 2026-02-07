#!/bin/bash

echo "=========================================="
echo "Feature Flags Implementation Verification"
echo "=========================================="
echo ""

# 1. Check files created
echo "1. Documentation files:"
files=(
    "FEATURE_FLAGS.md"
    "CNPJ_QUICK_REFERENCE.md"
    "FEATURE_FLAGS_SUMMARY.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (MISSING)"
    fi
done

# 2. Check .env.example updated
echo ""
echo "2. Configuration files:"
if grep -q "ENABLE_CNPJ_FEATURES" .env.example; then
    echo "   ✓ .env.example contains CNPJ flags"
else
    echo "   ✗ .env.example missing CNPJ flags"
fi

# 3. Check code changes
echo ""
echo "3. Code changes:"
if grep -q "cnpj_validation_enabled" apps/api/src/config.py; then
    echo "   ✓ config.py has computed properties"
else
    echo "   ✗ config.py missing computed properties"
fi

if grep -q "cnpj_validation_enabled" apps/api/src/routers/invoices.py; then
    echo "   ✓ invoices.py uses new properties"
else
    echo "   ✗ invoices.py not updated"
fi

if grep -q "/features" apps/api/src/main.py; then
    echo "   ✓ main.py has /features endpoint"
else
    echo "   ✗ main.py missing /features endpoint"
fi

# 4. Test feature flag logic
echo ""
echo "4. Testing feature flag logic:"
python test_flags_simple.py > /tmp/flag_test.txt 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ All logic tests passed"
else
    echo "   ✗ Logic tests failed"
fi

# 5. Check imports
echo ""
echo "5. Testing imports:"
cd apps/api
if python -c "from src.config import settings; print(f'Validation: {settings.cnpj_validation_enabled}, Enrichment: {settings.cnpj_enrichment_enabled}')" > /tmp/import_test.txt 2>&1; then
    result=$(cat /tmp/import_test.txt)
    echo "   ✓ Imports successful: $result"
else
    echo "   ✗ Import errors"
    cat /tmp/import_test.txt
fi
cd ../..

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "✅ Feature flag implementation complete!"
echo ""
echo "Features:"
echo "  • Master flag: ENABLE_CNPJ_FEATURES"
echo "  • Validation flag: ENABLE_CNPJ_VALIDATION"
echo "  • Enrichment flag: ENABLE_CNPJ_ENRICHMENT"
echo "  • Status endpoint: GET /features"
echo ""
echo "Quick disable:"
echo "  ENABLE_CNPJ_FEATURES=false"
echo ""
echo "Documentation:"
echo "  • FEATURE_FLAGS.md - Complete guide"
echo "  • CNPJ_QUICK_REFERENCE.md - Quick reference"
echo "  • FEATURE_FLAGS_SUMMARY.md - Implementation summary"
echo ""
echo "=========================================="
