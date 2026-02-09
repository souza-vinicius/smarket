"""
CNPJ validation and formatting utilities.

This module provides functions to validate Brazilian CNPJ (Cadastro Nacional da
Pessoa Jurídica) numbers using the official checksum algorithm.
"""

import re


def clean_cnpj(cnpj: str) -> str:
    """
    Remove formatting characters from CNPJ.

    Args:
        cnpj: CNPJ string with or without formatting (dots, hyphens, slashes)

    Returns:
        String containing only digits

    Examples:
        >>> clean_cnpj("00.000.000/0001-91")
        "00000000000191"
        >>> clean_cnpj("00000000000191")
        "00000000000191"
    """
    return re.sub(r"[^0-9]", "", cnpj)


def validate_cnpj(cnpj: str) -> bool:
    """
    Validate CNPJ using the official checksum algorithm.

    CNPJ has 14 digits: 12 base digits + 2 verification digits.
    The verification digits are calculated using specific multipliers.

    Args:
        cnpj: CNPJ string (with or without formatting)

    Returns:
        True if CNPJ is valid, False otherwise

    Examples:
        >>> validate_cnpj("00.000.000/0001-91")
        True
        >>> validate_cnpj("11.111.111/1111-11")
        False
    """
    # Clean and validate format
    cnpj_digits = clean_cnpj(cnpj)

    # Must have exactly 14 digits
    if len(cnpj_digits) != 14:
        return False

    # Reject known invalid patterns (all same digit)
    if cnpj_digits == cnpj_digits[0] * 14:
        return False

    # Calculate first verification digit
    multipliers_first = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_first = sum(int(cnpj_digits[i]) * multipliers_first[i] for i in range(12))
    remainder_first = sum_first % 11
    digit_first = 0 if remainder_first < 2 else 11 - remainder_first

    # Verify first digit
    if int(cnpj_digits[12]) != digit_first:
        return False

    # Calculate second verification digit
    multipliers_second = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    sum_second = sum(int(cnpj_digits[i]) * multipliers_second[i] for i in range(13))
    remainder_second = sum_second % 11
    digit_second = 0 if remainder_second < 2 else 11 - remainder_second

    # Verify second digit
    return int(cnpj_digits[13]) == digit_second


def format_cnpj(cnpj: str) -> str:
    """
    Format CNPJ for display: XX.XXX.XXX/XXXX-XX

    Args:
        cnpj: CNPJ string (with or without formatting)

    Returns:
        Formatted CNPJ string

    Examples:
        >>> format_cnpj("00000000000191")
        "00.000.000/0001-91"
        >>> format_cnpj("00.000.000/0001-91")
        "00.000.000/0001-91"
    """
    cnpj_digits = clean_cnpj(cnpj)

    if len(cnpj_digits) != 14:
        return cnpj  # Return as-is if invalid length

    return f"{cnpj_digits[:2]}.{cnpj_digits[2:5]}.{cnpj_digits[5:8]}/{cnpj_digits[8:12]}-{cnpj_digits[12:]}"
