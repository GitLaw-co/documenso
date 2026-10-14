import { describe, expect, it } from 'vitest';

import { resolveSigningPageSender } from './document';

const serviceAccount = { name: 'GitLaw', email: 'service@gitlaw.co' };
const serviceTeam = { name: 'GitLaw', teamEmail: { email: 'team@gitlaw.co' } };

describe('resolveSigningPageSender', () => {
  it('names the real owner instead of the service team', () => {
    const document = {
      user: serviceAccount,
      team: serviceTeam,
      documentMeta: { externalOwnerName: 'Jane Doe', externalOwnerEmail: 'jane@example.com' },
    };

    expect(resolveSigningPageSender(document, true)).toEqual({
      name: 'Jane Doe',
      email: '(jane@example.com)',
      showOnBehalfOf: false,
    });
  });

  it('falls back to the owner email when the owner has no name', () => {
    const document = {
      user: serviceAccount,
      team: serviceTeam,
      documentMeta: { externalOwnerName: ' ', externalOwnerEmail: 'jane@example.com' },
    };

    expect(resolveSigningPageSender(document, true)).toEqual({
      name: 'jane@example.com',
      email: '',
      showOnBehalfOf: false,
    });
  });

  it('keeps the team sender details when there is no external owner', () => {
    const document = { user: serviceAccount, team: serviceTeam, documentMeta: null };

    expect(resolveSigningPageSender(document, true)).toEqual({
      name: 'GitLaw',
      email: '(team@gitlaw.co)',
      showOnBehalfOf: true,
    });
  });

  it('keeps the account sender when there is no external owner and sender details are off', () => {
    const document = { user: serviceAccount, team: serviceTeam, documentMeta: null };

    expect(resolveSigningPageSender(document, false)).toEqual({
      name: 'GitLaw',
      email: '(service@gitlaw.co)',
      showOnBehalfOf: false,
    });
  });
});
