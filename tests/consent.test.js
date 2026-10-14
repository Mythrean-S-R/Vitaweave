jest.mock('../lib/repositories/dataRightsRepo', () => ({
  saveConsentRecord: jest.fn(async () => undefined),
}));
jest.mock('../lib/auditLog', () => ({
  logAuditEvent: jest.fn(async () => undefined),
}));
jest.mock('../lib/sessionStorage', () => ({
  getStoredUserId: jest.fn(async () => null),
}));

import {
  acceptConsent,
  hasAcceptedConsent,
  clearConsent,
} from '../lib/consent';

describe('Consent management', () => {
  beforeEach(async () => {
    await clearConsent();
  });

  test('starts without consent', async () => {
    expect(await hasAcceptedConsent()).toBe(false);
  });

  test('accepts and persists adult consent', async () => {
    await acceptConsent({ isMinor: false });
    expect(await hasAcceptedConsent()).toBe(true);
  });

  test('clears consent', async () => {
    await acceptConsent({ isMinor: false });
    await clearConsent();
    expect(await hasAcceptedConsent()).toBe(false);
  });

  test('requires guardian fields for minors', async () => {
    await expect(
      acceptConsent({ isMinor: true, guardianAcknowledged: true })
    ).rejects.toThrow(/Guardian name/);
    expect(await hasAcceptedConsent()).toBe(false);
  });

  test('accepts parental consent for minors', async () => {
    await acceptConsent({
      isMinor: true,
      guardianName: 'Ramesh Kumar',
      guardianRelationship: 'father',
      guardianAcknowledged: true,
    });
    expect(await hasAcceptedConsent()).toBe(true);
  });
});
