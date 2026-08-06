import { describe, expect, it } from 'vitest';

import { normalizeCheckboxRadioValues } from './fields';

describe('normalizeCheckboxRadioValues', () => {
  it('returns the values unchanged when at least one value exists', () => {
    const values = [
      { id: 1, checked: true, value: 'Option 1' },
      { id: 2, checked: false, value: 'Option 2' },
    ];

    expect(normalizeCheckboxRadioValues(values)).toBe(values);
  });

  it('falls back to a single unchecked value when values is undefined', () => {
    expect(normalizeCheckboxRadioValues(undefined)).toEqual([{ id: 1, checked: false, value: '' }]);
  });

  it('falls back to a single unchecked value when values is empty', () => {
    expect(normalizeCheckboxRadioValues([])).toEqual([{ id: 1, checked: false, value: '' }]);
  });
});
