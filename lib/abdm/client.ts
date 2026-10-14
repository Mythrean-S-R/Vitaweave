import type { AbdmClient } from './types';
import { MockAbdmClient } from './MockAbdmClient';
import { HttpAbdmClient } from './HttpAbdmClient';
import { DisabledAbdmClient } from './DisabledAbdmClient';

let cached: AbdmClient | null = null;

function isProductionBuild(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getAbdmClient(): AbdmClient {
  if (cached) return cached;

  const mode = (process.env.EXPO_PUBLIC_ABDM_MODE ?? 'mock').toLowerCase();
  const baseUrl = (process.env.EXPO_PUBLIC_ABDM_BASE_URL ?? '').trim();

  // Production never uses MockAbdmClient (no OTP 123456).
  if (isProductionBuild()) {
    if (mode === 'live' && baseUrl) {
      cached = new HttpAbdmClient(baseUrl);
    } else {
      cached = new DisabledAbdmClient();
    }
    return cached;
  }

  if (mode === 'live') {
    cached = baseUrl ? new HttpAbdmClient(baseUrl) : new DisabledAbdmClient();
  } else {
    cached = new MockAbdmClient();
  }
  return cached;
}

export function isAbdmConfigured(): boolean {
  const client = getAbdmClient();
  return !client.disabled;
}

export function resetAbdmClientForTests(): void {
  cached = null;
}
