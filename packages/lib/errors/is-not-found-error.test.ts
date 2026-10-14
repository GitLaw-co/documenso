import { describe, expect, it } from 'vitest';

import { AppError, AppErrorCode } from './app-error';
import { isNotFoundError } from './is-not-found-error';

describe('isNotFoundError', () => {
  it('recognises a not-found app error', () => {
    expect(isNotFoundError(new AppError(AppErrorCode.NOT_FOUND))).toBe(true);
  });

  it('does not mistake a database or unknown failure for not found', () => {
    expect(isNotFoundError(new Error('connection terminated'))).toBe(false);
    expect(isNotFoundError(new AppError(AppErrorCode.UNKNOWN_ERROR))).toBe(false);
  });
});
