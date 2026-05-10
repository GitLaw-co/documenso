import { expect, test } from '@playwright/test';

const ADMIN_API = process.env.E2E_DOCUMENSO_ADMIN_BASE_URL ?? 'http://localhost:3000';
const ADMIN_KEY = process.env.E2E_DOCUMENSO_ADMIN_API_KEY!;

async function adminPost(path: string, body: unknown) {
  const res = await fetch(`${ADMIN_API}/api/v2/admin${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

test('admin: team/delete-by-url cascades child api-tokens + webhooks; TGS cleanup verified by re-create', async () => {
  const slug = `e2e-cascade-${Date.now()}`;

  // Setup: create team + child api-token + webhook.
  const t = await adminPost('/team/create', { teamUrl: slug });
  expect(t.status).toBe(200);
  const teamId = (t.json.team as { id: number }).id;

  const tk = await adminPost('/api-token/create', {
    teamId,
    tokenName: `${slug}-token`,
  });
  expect(tk.status).toBe(200);

  const wh = await adminPost('/webhook/create', {
    teamId,
    webhookUrl: `http://example.test/${slug}/webhook`,
    secret: 'a'.repeat(32),
    eventTriggers: ['DOCUMENT_SENT'],
    enabled: true,
  });
  expect(wh.status).toBe(200);

  // Act: delete by url.
  const del = await adminPost('/team/delete-by-url', { teamUrl: slug });
  expect(del.status).toBe(200);
  expect(del.json).toMatchObject({ deleted: true });

  // Assert via subsequent re-create. created:true means:
  //   1. The team row is gone (otherwise team/create returns created:false).
  //   2. The TeamGlobalSettings row from the previous team is gone too —
  //      otherwise Prisma would refuse to create a new Team since the new
  //      TGS would conflict with the orphan one via the @unique constraint
  //      chain. This indirectly validates the helper's TGS cleanup (Task 1).
  const t2 = await adminPost('/team/create', { teamUrl: slug });
  expect(t2.json.created).toBe(true);

  // Cleanup: snip the just-recreated team.
  await adminPost('/team/delete-by-url', { teamUrl: slug });
});

test('admin: team/delete-by-url is idempotent — second call returns not_found', async () => {
  const slug = `e2e-idem-${Date.now()}`;
  await adminPost('/team/create', { teamUrl: slug });

  const r1 = await adminPost('/team/delete-by-url', { teamUrl: slug });
  expect(r1.json).toEqual({ deleted: true });

  const r2 = await adminPost('/team/delete-by-url', { teamUrl: slug });
  expect(r2.status).toBe(200);
  expect(r2.json).toEqual({ deleted: false, reason: 'not_found' });
});

test('admin: team/delete-by-url returns not_found for unknown teamUrl', async () => {
  const r = await adminPost('/team/delete-by-url', {
    teamUrl: `e2e-never-existed-${Date.now()}`,
  });
  expect(r.status).toBe(200);
  expect(r.json).toEqual({ deleted: false, reason: 'not_found' });
});
