#!/usr/bin/env python3
"""
Quick test script for CNPJ validation and enrichment.
"""

import sys
import asyncio
sys.path.insert(0, 'apps/api')

from src.utils.cnpj_validator import validate_cnpj, clean_cnpj, format_cnpj
from src.services.cnpj_enrichment import enrich_cnpj_data


def test_validation():
    """Test CNPJ validation."""
    print("=" * 60)
    print("Testing CNPJ Validation")
    print("=" * 60)

    # Valid CNPJs (real examples)
    valid_cnpjs = [
        "00.000.000/0001-91",  # Banco do Brasil
        "33.000.167/0001-01",  # Bradesco
        "60.701.190/0001-04",  # Itaú
    ]

    # Invalid CNPJs
    invalid_cnpjs = [
        "11.111.111/1111-11",  # All same digits
        "12.345.678/9012-34",  # Random numbers
        "00.000.000/0000-00",  # All zeros
    ]

    print("\n✓ Testing valid CNPJs:")
    for cnpj in valid_cnpjs:
        clean = clean_cnpj(cnpj)
        is_valid = validate_cnpj(cnpj)
        formatted = format_cnpj(clean)
        print(f"  {cnpj} -> Clean: {clean} -> Valid: {is_valid} -> Formatted: {formatted}")
        assert is_valid, f"Expected {cnpj} to be valid"

    print("\n✗ Testing invalid CNPJs:")
    for cnpj in invalid_cnpjs:
        clean = clean_cnpj(cnpj)
        is_valid = validate_cnpj(cnpj)
        print(f"  {cnpj} -> Clean: {clean} -> Valid: {is_valid}")
        assert not is_valid, f"Expected {cnpj} to be invalid"

    print("\n✓ All validation tests passed!")


async def test_enrichment():
    """Test CNPJ enrichment."""
    print("\n" + "=" * 60)
    print("Testing CNPJ Enrichment")
    print("=" * 60)

    # Test with Banco do Brasil CNPJ
    test_cnpj = "00000000000191"
    print(f"\nEnriching CNPJ: {format_cnpj(test_cnpj)}")

    try:
        data = await enrich_cnpj_data(test_cnpj, timeout=10)

        if data:
            print(f"\n✓ Enrichment successful from: {data.get('source')}")
            print(f"  Razão Social: {data.get('razao_social')}")
            print(f"  Nome Fantasia: {data.get('nome_fantasia')}")
            print(f"  CNPJ: {data.get('cnpj')}")
            print(f"  Município: {data.get('municipio')}/{data.get('uf')}")
            print(f"  Situação: {data.get('situacao')}")
            print(f"  CNAE: {data.get('cnae_fiscal')}")
        else:
            print("✗ Enrichment returned no data")

    except Exception as e:
        print(f"✗ Enrichment failed: {e}")


def main():
    """Run all tests."""
    # Test validation (synchronous)
    test_validation()

    # Test enrichment (asynchronous)
    asyncio.run(test_enrichment())

    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
