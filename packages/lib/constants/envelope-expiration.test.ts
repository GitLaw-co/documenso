import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveExpiresAt } from './envelope-expiration';

describe('resolveExpiresAt', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when the period is null (unset means no expiry)', () => {
    expect(resolveExpiresAt(null)).toBeNull();
  });

  it('returns null when the period is undefined (unset means no expiry)', () => {
    expect(resolveExpiresAt(undefined)).toBeNull();
  });

  it('returns null when expiry is explicitly disabled', () => {
    expect(resolveExpiresAt({ disabled: true })).toBeNull();
  });

  it('computes a timestamp ~7 days out for an explicit duration period', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const result = resolveExpiresAt({ unit: 'day', amount: 7 });

    expect(result).toEqual(new Date('2026-01-08T00:00:00.000Z'));
  });
});
