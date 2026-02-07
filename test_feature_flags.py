#!/usr/bin/env python3
"""
Test script for CNPJ feature flags.
"""

import sys
import os
sys.path.insert(0, 'apps/api')

# Test different flag combinations
test_cases = [
    {
        "name": "All enabled (default)",
        "env": {
            "ENABLE_CNPJ_FEATURES": "true",
            "ENABLE_CNPJ_VALIDATION": "true",
            "ENABLE_CNPJ_ENRICHMENT": "true"
        },
        "expected": {
            "validation": True,
            "enrichment": True
        }
    },
    {
        "name": "Master disabled",
        "env": {
            "ENABLE_CNPJ_FEATURES": "false",
            "ENABLE_CNPJ_VALIDATION": "true",
            "ENABLE_CNPJ_ENRICHMENT": "true"
        },
        "expected": {
            "validation": False,
            "enrichment": False
        }
    },
    {
        "name": "Validation disabled",
        "env": {
            "ENABLE_CNPJ_FEATURES": "true",
            "ENABLE_CNPJ_VALIDATION": "false",
            "ENABLE_CNPJ_ENRICHMENT": "true"
        },
        "expected": {
            "validation": False,
            "enrichment": True
        }
    },
    {
        "name": "Enrichment disabled",
        "env": {
            "ENABLE_CNPJ_FEATURES": "true",
            "ENABLE_CNPJ_VALIDATION": "true",
            "ENABLE_CNPJ_ENRICHMENT": "false"
        },
        "expected": {
            "validation": True,
            "enrichment": False
        }
    },
    {
        "name": "All disabled",
        "env": {
            "ENABLE_CNPJ_FEATURES": "false",
            "ENABLE_CNPJ_VALIDATION": "false",
            "ENABLE_CNPJ_ENRICHMENT": "false"
        },
        "expected": {
            "validation": False,
            "enrichment": False
        }
    }
]

print("=" * 70)
print("Testing CNPJ Feature Flags")
print("=" * 70)

all_passed = True

for i, test in enumerate(test_cases, 1):
    print(f"\n{i}. {test['name']}")
    print("   Environment:")
    for key, value in test['env'].items():
        print(f"     {key}={value}")
    
    # Set environment variables
    for key, value in test['env'].items():
        os.environ[key] = value
    
    # Reload settings module to pick up new env vars
    if 'src.config' in sys.modules:
        del sys.modules['src.config']
    
    from src.config import settings
    
    # Get actual values
    actual_validation = settings.cnpj_validation_enabled
    actual_enrichment = settings.cnpj_enrichment_enabled
    
    # Compare with expected
    validation_ok = actual_validation == test['expected']['validation']
    enrichment_ok = actual_enrichment == test['expected']['enrichment']
    
    print("   Results:")
    print(f"     Validation: {actual_validation} {'✓' if validation_ok else '✗ FAILED'}")
    print(f"     Enrichment: {actual_enrichment} {'✓' if enrichment_ok else '✗ FAILED'}")
    
    if not (validation_ok and enrichment_ok):
        all_passed = False
        print("   ❌ TEST FAILED")
    else:
        print("   ✅ TEST PASSED")
    
    # Clean up for next test
    del sys.modules['src.config']

print("\n" + "=" * 70)
if all_passed:
    print("✅ ALL TESTS PASSED!")
else:
    print("❌ SOME TESTS FAILED")
print("=" * 70)

sys.exit(0 if all_passed else 1)
