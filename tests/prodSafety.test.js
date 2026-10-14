/**
 * Production safety gates - DEV_MODE hard-off and ABDM never mocks in production.
 */

describe('Production safety gates', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDevMode = process.env.EXPO_PUBLIC_DEV_MODE;
  const originalAbdmMode = process.env.EXPO_PUBLIC_ABDM_MODE;
  const originalAbdmUrl = process.env.EXPO_PUBLIC_ABDM_BASE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.EXPO_PUBLIC_DEV_MODE = originalDevMode;
    process.env.EXPO_PUBLIC_ABDM_MODE = originalAbdmMode;
    process.env.EXPO_PUBLIC_ABDM_BASE_URL = originalAbdmUrl;
    jest.resetModules();
  });

  test('isDevModeEnabled is false in production even if EXPO_PUBLIC_DEV_MODE=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPO_PUBLIC_DEV_MODE = 'true';
    jest.resetModules();
    const { isDevModeEnabled } = require('../lib/devMode');
    expect(isDevModeEnabled()).toBe(false);
  });

  test('getAbdmClient returns disabled client in production without base URL', () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPO_PUBLIC_ABDM_MODE = 'live';
    delete process.env.EXPO_PUBLIC_ABDM_BASE_URL;
    jest.resetModules();
    const { getAbdmClient, resetAbdmClientForTests } = require('../lib/abdm/client');
    resetAbdmClientForTests();
    const client = getAbdmClient();
    expect(client.disabled).toBe(true);
  });

  test('getAbdmClient never returns mock OTP path in production with mode=mock', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPO_PUBLIC_ABDM_MODE = 'mock';
    jest.resetModules();
    const { getAbdmClient, resetAbdmClientForTests } = require('../lib/abdm/client');
    resetAbdmClientForTests();
    const client = getAbdmClient();
    expect(client.disabled).toBe(true);
    await expect(client.linkAbha({ patientId: 'test-patient-id' })).rejects.toThrow(/not configured/i);
  });
});
