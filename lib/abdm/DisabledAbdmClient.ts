import type {
  AbdmClient,
  AbhaIdentity,
  AbhaLinkInput,
  AbhaLinkResult,
  AbhaConsentRequest,
  AbhaConsentStatus,
  AbhaHealthRecord,
  ERxBundle,
  ERxResult,
} from './types';

const MSG =
  'ABDM is not configured for this build. Set EXPO_PUBLIC_ABDM_MODE=live and EXPO_PUBLIC_ABDM_BASE_URL after NHA sandbox access.';

/** Production-safe stub - never returns mock OTP 123456. */
export class DisabledAbdmClient implements AbdmClient {
  readonly disabled = true;

  async linkAbha(_input: AbhaLinkInput): Promise<AbhaLinkResult> {
    throw new Error(MSG);
  }

  async verifyOtp(_txnId: string, _otp: string): Promise<AbhaIdentity> {
    throw new Error(MSG);
  }

  async createPrescription(_bundle: ERxBundle): Promise<ERxResult> {
    throw new Error(MSG);
  }

  async requestConsent(_input: AbhaConsentRequest): Promise<AbhaConsentStatus> {
    throw new Error(MSG);
  }

  async getConsentStatus(_consentId: string): Promise<AbhaConsentStatus> {
    throw new Error(MSG);
  }

  async fetchRecords(_consentId: string): Promise<AbhaHealthRecord[]> {
    throw new Error(MSG);
  }
}

export function isAbdmDisabled(client: AbdmClient): boolean {
  return Boolean((client as DisabledAbdmClient).disabled);
}
