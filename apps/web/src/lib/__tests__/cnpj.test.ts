import { cleanCNPJ, formatCNPJ, validateCNPJ, getCNPJErrorMessage, isValidCNPJ, formatCNPJInput } from '../cnpj';

describe('CNPJ utilities', () => {
  describe('cleanCNPJ', () => {
    it('should remove all non-digit characters', () => {
      expect(cleanCNPJ('00.000.000/0001-91')).toBe('00000000000191');
      expect(cleanCNPJ('00000000000191')).toBe('00000000000191');
      expect(cleanCNPJ('00 000 000 0001 91')).toBe('00000000000191');
    });
  });

  describe('formatCNPJ', () => {
    it('should format valid CNPJ', () => {
      expect(formatCNPJ('00000000000191')).toBe('00.000.000/0001-91');
      expect(formatCNPJ('00.000.000/0001-91')).toBe('00.000.000/0001-91');
    });

    it('should return as-is if length is not 14', () => {
      expect(formatCNPJ('123')).toBe('123');
      expect(formatCNPJ('000000000001911')).toBe('000000000001911');
    });
  });

  describe('validateCNPJ', () => {
    it('should validate correct CNPJs', () => {
      // Banco do Brasil
      expect(validateCNPJ('00.000.000/0001-91')).toBe(true);
      expect(validateCNPJ('00000000000191')).toBe(true);

      // Bradesco
      expect(validateCNPJ('60.746.948/0001-12')).toBe(true);
      expect(validateCNPJ('60746948000112')).toBe(true);
    });

    it('should reject invalid CNPJs', () => {
      expect(validateCNPJ('11.111.111/1111-11')).toBe(false);
      expect(validateCNPJ('12.345.678/9012-34')).toBe(false);
      expect(validateCNPJ('00.000.000/0000-00')).toBe(false);
    });

    it('should reject CNPJs with wrong length', () => {
      expect(validateCNPJ('123')).toBe(false);
      expect(validateCNPJ('000000000001911')).toBe(false);
    });

    it('should reject CNPJs with all same digits', () => {
      expect(validateCNPJ('11111111111111')).toBe(false);
      expect(validateCNPJ('00000000000000')).toBe(false);
      expect(validateCNPJ('99999999999999')).toBe(false);
    });
  });

  describe('getCNPJErrorMessage', () => {
    it('should return null for valid CNPJ', () => {
      expect(getCNPJErrorMessage('00.000.000/0001-91')).toBeNull();
      expect(getCNPJErrorMessage('60746948000112')).toBeNull();
    });

    it('should return null for empty CNPJ', () => {
      expect(getCNPJErrorMessage('')).toBeNull();
    });

    it('should return error for wrong length', () => {
      const error = getCNPJErrorMessage('123');
      expect(error).toContain('14 dígitos');
      expect(error).toContain('3 informado');
    });

    it('should return error for repeated digits', () => {
      const error = getCNPJErrorMessage('11111111111111');
      expect(error).toContain('dígitos repetidos');
    });

    it('should return error for invalid checksum', () => {
      const error = getCNPJErrorMessage('12345678901234');
      expect(error).toContain('dígitos verificadores');
    });
  });

  describe('isValidCNPJ', () => {
    it('should return true for valid CNPJ', () => {
      expect(isValidCNPJ('00.000.000/0001-91')).toBe(true);
      expect(isValidCNPJ('60746948000112')).toBe(true);
    });

    it('should return false for invalid CNPJ', () => {
      expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
      expect(isValidCNPJ('')).toBe(false);
      expect(isValidCNPJ('123')).toBe(false);
    });
  });

  describe('formatCNPJInput', () => {
    it('should format progressively as user types', () => {
      expect(formatCNPJInput('0')).toBe('0');
      expect(formatCNPJInput('00')).toBe('00');
      expect(formatCNPJInput('000')).toBe('00.0');
      expect(formatCNPJInput('00000')).toBe('00.000');
      expect(formatCNPJInput('000000')).toBe('00.000.0');
      expect(formatCNPJInput('00000000')).toBe('00.000.000');
      expect(formatCNPJInput('000000000')).toBe('00.000.000/0');
      expect(formatCNPJInput('0000000000001')).toBe('00.000.000/0001');
      expect(formatCNPJInput('00000000000191')).toBe('00.000.000/0001-91');
    });

    it('should limit to 14 digits', () => {
      expect(formatCNPJInput('000000000001919999')).toBe('00.000.000/0001-91');
    });

    it('should handle already formatted input', () => {
      expect(formatCNPJInput('00.000.000/0001-91')).toBe('00.000.000/0001-91');
    });
  });
});
