import type {
  AbdmClient,
  AbhaConsentRequest,
  AbhaConsentStatus,
  AbhaHealthRecord,
  AbhaIdentity,
  AbhaLinkInput,
  AbhaLinkResult,
  ERxBundle,
  ERxResult,
} from './types';

/**
 * Live HTTP client - enabled when EXPO_PUBLIC_ABDM_MODE=live and base URL is set.
 * Throws a clear error until real NHA credentials are configured.
 */
export class HttpAbdmClient implements AbdmClient {
  constructor(private baseUrl: string) {}

  private ensureConfigured() {
    if (!this.baseUrl) {
      throw new Error(
        'ABDM credentials not configured. Set EXPO_PUBLIC_ABDM_BASE_URL and switch EXPO_PUBLIC_ABDM_MODE=live after NHA sandbox access.'
      );
    }
  }

  async linkAbha(input: AbhaLinkInput): Promise<AbhaLinkResult> {
    this.ensureConfigured();
    const res = await fetch(`${this.baseUrl}/v1/abha/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`ABDM link failed: ${res.status}`);
    return res.json();
  }

  async verifyOtp(txnId: string, otp: string): Promise<AbhaIdentity> {
    this.ensureConfigured();
    const res = await fetch(`${this.baseUrl}/v1/abha/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txnId, otp }),
    });
    if (!res.ok) throw new Error(`ABDM OTP verify failed: ${res.status}`);
    return res.json();
  }

  async createPrescription(bundle: ERxBundle): Promise<ERxResult> {
    this.ensureConfigured();
    const res = await fetch(`${this.baseUrl}/v1/prescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    });
    if (!res.ok) throw new Error(`ABDM eRx failed: ${res.status}`);
    return res.json();
  }

  async requestConsent(input: AbhaConsentRequest): Promise<AbhaConsentStatus> {
    this.ensureConfigured();
    const res = await fetch(`${this.baseUrl}/v1/hiu/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`ABDM consent request failed: ${res.status}`);
    return res.json();
  }

  async getConsentStatus(consentId: string): Promise<AbhaConsentStatus> {
    this.ensureConfigured();
    const res = await fetch(`${this.baseUrl}/v1/hiu/consent/${encodeURIComponent(consentId)}`);
    if (!res.ok) throw new Error(`ABDM consent status failed: ${res.status}`);
    return res.json();
  }

  async fetchRecords(consentId: string): Promise<AbhaHealthRecord[]> {
    this.ensureConfigured();
    const res = await fetch(
      `${this.baseUrl}/v1/hiu/records?consentId=${encodeURIComponent(consentId)}`
    );
    if (!res.ok) throw new Error(`ABDM record fetch failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data?.records ?? [];
  }
}
