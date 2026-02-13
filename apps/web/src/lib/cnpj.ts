/**
 * CNPJ validation and formatting utilities for Brazilian CNPJ numbers.
 */

/**
 * Remove all non-digit characters from CNPJ.
 */
export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/**
 * Format CNPJ to XX.XXX.XXX/XXXX-XX pattern.
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanCNPJ(cnpj);

  if (cleaned.length !== 14) {
    return cnpj; // Return as-is if invalid length
  }

  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Validate CNPJ using the official checksum algorithm.
 *
 * @param cnpj - CNPJ string (with or without formatting)
 * @returns true if CNPJ is valid, false otherwise
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cleanCNPJ(cnpj);

  // Must have exactly 14 digits
  if (cleaned.length !== 14) {
    return false;
  }

  // Reject known invalid patterns (all same digit)
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }

  // Calculate first verification digit
  const multipliersFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sumFirst = 0;
  for (let i = 0; i < 12; i++) {
    sumFirst += parseInt(cleaned[i]) * multipliersFirst[i];
  }
  const remainderFirst = sumFirst % 11;
  const digitFirst = remainderFirst < 2 ? 0 : 11 - remainderFirst;

  // Verify first digit
  if (parseInt(cleaned[12]) !== digitFirst) {
    return false;
  }

  // Calculate second verification digit
  const multipliersSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sumSecond = 0;
  for (let i = 0; i < 13; i++) {
    sumSecond += parseInt(cleaned[i]) * multipliersSecond[i];
  }
  const remainderSecond = sumSecond % 11;
  const digitSecond = remainderSecond < 2 ? 0 : 11 - remainderSecond;

  // Verify second digit
  return parseInt(cleaned[13]) === digitSecond;
}

/**
 * Get validation error message for invalid CNPJ.
 */
export function getCNPJErrorMessage(cnpj: string): string | null {
  const cleaned = cleanCNPJ(cnpj);

  if (!cnpj || cleaned.length === 0) {
    return null; // Empty is OK (will be caught by required validation)
  }

  if (cleaned.length !== 14) {
    return `CNPJ deve ter 14 dígitos (${String(cleaned.length)} informado${cleaned.length !== 1 ? "s" : ""})`;
  }

  if (/^(\d)\1{13}$/.test(cleaned)) {
    return "CNPJ inválido (dígitos repetidos)";
  }

  if (!validateCNPJ(cnpj)) {
    return "CNPJ inválido (dígitos verificadores incorretos)";
  }

  return null; // Valid
}

/**
 * Check if CNPJ is valid (boolean helper).
 */
export function isValidCNPJ(cnpj: string): boolean {
  return getCNPJErrorMessage(cnpj) === null && cleanCNPJ(cnpj).length === 14;
}

/**
 * Format CNPJ as user types (for input fields).
 * Limits to 18 characters (formatted: XX.XXX.XXX/XXXX-XX).
 */
export function formatCNPJInput(value: string): string {
  const cleaned = cleanCNPJ(value);
  const limited = cleaned.slice(0, 14); // Max 14 digits

  // Format progressively as user types
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 5) {
    return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  } else if (limited.length <= 12) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  } else {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
  }
}
