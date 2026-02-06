#!/bin/bash

echo "=========================================="
echo "CNPJ Implementation Verification"
echo "=========================================="
echo ""

# Check if files exist
echo "1. Checking created files..."
files=(
    "apps/api/src/utils/cnpj_validator.py"
    "apps/api/src/services/cnpj_enrichment.py"
    "test_cnpj.py"
    "CNPJ_IMPLEMENTATION.md"
    "IMPLEMENTATION_SUMMARY.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (MISSING)"
    fi
done

echo ""
echo "2. Checking modified files..."
modified_files=(
    "apps/api/src/config.py"
    "apps/api/src/routers/invoices.py"
    "apps/api/requirements.txt"
)

for file in "${modified_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ✗ $file (MISSING)"
    fi
done

echo ""
echo "3. Checking dependencies..."
if pip show cachetools > /dev/null 2>&1; then
    VERSION=$(pip show cachetools | grep Version | cut -d' ' -f2)
    echo "   ✓ cachetools installed (version $VERSION)"
else
    echo "   ✗ cachetools NOT installed"
fi

echo ""
echo "4. Testing imports..."
cd apps/api
if python -c "from src.utils.cnpj_validator import validate_cnpj; from src.services.cnpj_enrichment import enrich_cnpj_data; from src.config import settings" 2>/dev/null; then
    echo "   ✓ All imports successful"
else
    echo "   ✗ Import errors detected"
fi

echo ""
echo "5. Running CNPJ tests..."
cd ../..
python test_cnpj.py > /tmp/cnpj_test_output.txt 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ All tests passed"
    echo ""
    echo "   Test Results:"
    grep "✓" /tmp/cnpj_test_output.txt | head -5 | sed 's/^/     /'
else
    echo "   ✗ Tests failed"
    cat /tmp/cnpj_test_output.txt
fi

echo ""
echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
