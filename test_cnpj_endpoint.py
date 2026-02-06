#!/usr/bin/env python3
"""
Test script for CNPJ enrichment endpoint.
"""

import sys
sys.path.insert(0, 'apps/api')

import asyncio
from src.services.cnpj_enrichment import enrich_cnpj_data
from src.utils.cnpj_validator import validate_cnpj, clean_cnpj

async def test_enrichment():
    """Test CNPJ enrichment service directly."""
    
    test_cnpj = "00000000000191"  # Banco do Brasil
    
    print("=" * 60)
    print("Testing CNPJ Enrichment Service")
    print("=" * 60)
    print(f"\nTesting CNPJ: {test_cnpj}")
    
    # Test validation
    print("\n1. Validating CNPJ...")
    is_valid = validate_cnpj(test_cnpj)
    print(f"   Valid: {is_valid}")
    
    if not is_valid:
        print("   ✗ CNPJ is invalid, stopping test")
        return
    
    # Test enrichment
    print("\n2. Enriching CNPJ...")
    try:
        data = await enrich_cnpj_data(test_cnpj, timeout=10)
        
        if data:
            print("   ✓ Enrichment successful!")
            print(f"   Source: {data.get('source')}")
            print(f"   Razão Social: {data.get('razao_social')}")
            print(f"   Nome Fantasia: {data.get('nome_fantasia')}")
            print(f"   CNPJ: {data.get('cnpj')}")
            print(f"   Situação: {data.get('situacao')}")
        else:
            print("   ✗ Enrichment returned no data")
            
    except Exception as e:
        print(f"   ✗ Enrichment failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_enrichment())
