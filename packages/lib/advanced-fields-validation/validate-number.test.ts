import { describe, expect, it } from 'vitest';

import { validateNumberField } from './validate-number';

describe('validateNumberField', () => {
  describe('plain number format (123456789.00)', () => {
    it('accepts plain decimals and integers', () => {
      expect(
        validateNumberField('42.00', {
          type: 'number',
          numberFormat: '123456789.00',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('42', {
          type: 'number',
          numberFormat: '123456789.00',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('50.5', {
          type: 'number',
          numberFormat: '123456789.00',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('123456789.00', {
          type: 'number',
          numberFormat: '123456789.00',
        }),
      ).toEqual([]);
    });

    it('rejects values with thousands separators', () => {
      expect(
        validateNumberField('1,234.00', {
          type: 'number',
          numberFormat: '123456789.00',
        }),
      ).toContain('Value 1,234.00 does not match the number format - 123456789.00');
    });
  });

  describe('comma format (123,456,789.00)', () => {
    it('still accepts comma separated values', () => {
      expect(
        validateNumberField('123,456,789.00', {
          type: 'number',
          numberFormat: '123,456,789.00',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('42.00', {
          type: 'number',
          numberFormat: '123,456,789.00',
        }),
      ).toEqual([]);
    });

    it('rejects values that do not match the format', () => {
      expect(
        validateNumberField('123.456.789,00', {
          type: 'number',
          numberFormat: '123,456,789.00',
        }),
      ).toContain('Value 123.456.789,00 does not match the number format - 123,456,789.00');
    });
  });

  describe('single comma format (123456,789.00)', () => {
    it('accepts plain decimals', () => {
      expect(
        validateNumberField('42.00', {
          type: 'number',
          numberFormat: '123456,789.00',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('123456,789.00', {
          type: 'number',
          numberFormat: '123456,789.00',
        }),
      ).toEqual([]);
    });
  });

  describe('unknown number format', () => {
    it('falls back to plain numeric validation instead of rejecting outright', () => {
      expect(
        validateNumberField('42.00', {
          type: 'number',
          numberFormat: 'some-legacy-format',
        }),
      ).toEqual([]);
      expect(
        validateNumberField('1,000.50', {
          type: 'number',
          numberFormat: 'some-legacy-format',
        }),
      ).toEqual([]);
    });

    it('still rejects non-numeric values', () => {
      const errors = validateNumberField('12.34.56', {
        type: 'number',
        numberFormat: 'some-legacy-format',
      });

      expect(errors).toContain('Value 12.34.56 is not a valid number');
    });
  });

  describe('empty or missing number format', () => {
    it('skips format validation entirely', () => {
      expect(validateNumberField('42.00', { type: 'number', numberFormat: '' })).toEqual([]);
      expect(validateNumberField('42.00', { type: 'number' })).toEqual([]);
      expect(validateNumberField('42.00')).toEqual([]);
    });
  });

  describe('min/max validation', () => {
    it('enforces minimum value', () => {
      expect(validateNumberField('5', { type: 'number', minValue: 10 })).toContain(
        'Value 5 is less than the minimum value of 10',
      );
    });

    it('enforces maximum value', () => {
      expect(validateNumberField('50', { type: 'number', maxValue: 10 })).toContain(
        'Value 50 is greater than the maximum value of 10',
      );
    });

    it('accepts values within range', () => {
      expect(validateNumberField('5', { type: 'number', minValue: 1, maxValue: 10 })).toEqual([]);
    });
  });
});
