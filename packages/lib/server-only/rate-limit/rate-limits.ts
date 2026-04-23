import { createRateLimit } from './rate-limit';

// ---- Auth (Tier 1 - Critical, sends emails) ----

export const signupRateLimit = createRateLimit({
  action: 'auth.signup',
  max: 10,
  window: '1h',
});

export const forgotPasswordRateLimit = createRateLimit({
  action: 'auth.forgot-password',
  max: 3,
  globalMax: 20,
  window: '1h',
});

export const resendVerifyEmailRateLimit = createRateLimit({
  action: 'auth.resend-verify-email',
  max: 3,
  globalMax: 20,
  window: '1h',
});

export const request2FAEmailRateLimit = createRateLimit({
  action: 'auth.request-2fa-email',
  max: 5,
  globalMax: 20,
  window: '15m',
});

// ---- Auth (Tier 2 - Unauthenticated) ----

export const loginRateLimit = createRateLimit({
  action: 'auth.login',
  max: 10,
  globalMax: 50,
  window: '15m',
});

export const resetPasswordRateLimit = createRateLimit({
  action: 'auth.reset-password',
  max: 5,
  globalMax: 20,
  window: '1h',
});

export const verifyEmailRateLimit = createRateLimit({
  action: 'auth.verify-email',
  max: 5,
  globalMax: 20,
  window: '15m',
});

export const passkeyRateLimit = createRateLimit({
  action: 'auth.passkey',
  max: 10,
  globalMax: 50,
  window: '15m',
});

export const linkOrgAccountRateLimit = createRateLimit({
  action: 'auth.link-org-account',
  max: 5,
  globalMax: 20,
  window: '1h',
});

// ---- API (Tier 4 - Standard) ----

export const apiV1RateLimit = createRateLimit({
  action: 'api.v1',
  max: 100,
  window: '1m',
});

export const apiV2RateLimit = createRateLimit({
  action: 'api.v2',
  max: 100,
  window: '1m',
});

// Dedicated bucket for `/api/v2/admin/*` (platform admin API, env-ctl automation).
// Kept separate from apiV2RateLimit to decouple env-ctl's burst profile (concurrent
// env teardowns) from back-law's document/template flows on `/api/v2/*`. 300/min
// is roomy for ~50-env concurrent teardown bursts while bounding abuse potential
// if the admin key is ever compromised.
export const adminV2RateLimit = createRateLimit({
  action: 'api.v2.admin',
  max: 300,
  window: '1m',
});

export const apiTrpcRateLimit = createRateLimit({
  action: 'api.trpc',
  max: 100,
  window: '1m',
});

export const aiRateLimit = createRateLimit({
  action: 'api.ai',
  max: 3,
  window: '1m',
});

export const fileUploadRateLimit = createRateLimit({
  action: 'api.file-upload',
  max: 20,
  window: '1m',
});
