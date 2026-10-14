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

/** Deterministic mock for local demos only (never used in production builds). OTP 123456. */
export class MockAbdmClient implements AbdmClient {
  async linkAbha(input: AbhaLinkInput): Promise<AbhaLinkResult> {
    const txnId = `mock-txn-${input.patientId.slice(0, 8)}-${Date.now()}`;
    return {
      txnId,
      message: 'OTP sent to registered mobile (mock). Use 123456.',
      otpHint: '123456',
    };
  }

  async verifyOtp(txnId: string, otp: string): Promise<AbhaIdentity> {
    if (otp !== '123456') {
      throw new Error('Invalid OTP. Mock mode accepts 123456 only.');
    }
    const suffix = txnId.replace(/\D/g, '').slice(-10).padStart(10, '0');
    const abhaNumber = `${suffix.slice(0, 2)}-${suffix.slice(2, 6)}-${suffix.slice(6, 10)}-${suffix.slice(0, 4)}`;
    return {
      abhaId: `${abhaNumber}@sbx`,
      abhaNumber,
      name: 'Demo Beneficiary',
      verified: true,
    };
  }

  async createPrescription(bundle: ERxBundle): Promise<ERxResult> {
    return {
      status: 'created',
      prescriptionId: `ERX-MOCK-${Date.now()}`,
      bundle,
      message: 'Mock ABDM e-prescription created',
    };
  }

  async requestConsent(input: AbhaConsentRequest): Promise<AbhaConsentStatus> {
    return {
      consentId: `mock-consent-${input.patientId.slice(0, 8)}`,
      status: 'granted',
      message: 'Mock HIU consent granted',
    };
  }

  async getConsentStatus(consentId: string): Promise<AbhaConsentStatus> {
    return { consentId, status: 'granted', message: 'Mock consent active' };
  }

  async fetchRecords(consentId: string): Promise<AbhaHealthRecord[]> {
    return [
      {
        id: `rec-${consentId.slice(0, 8)}`,
        hiType: 'Prescription',
        title: 'Mock prescription record',
        authoredOn: new Date().toISOString().slice(0, 10),
        summary: 'Demo HIU fetch - replace with live NHA gateway',
      },
    ];
  }
}
