export type AbhaLinkInput = {
  mobile?: string;
  aadhaarLast4?: string;
  patientId: string;
};

export type AbhaLinkResult = {
  txnId: string;
  message: string;
  otpHint?: string;
};

export type AbhaIdentity = {
  abhaId: string;
  abhaNumber: string;
  name?: string;
  verified: boolean;
};

export type ERxMedication = {
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

export type ERxBundle = {
  resourceType: 'Bundle';
  type: 'document';
  timestamp: string;
  identifier: { system: string; value: string };
  entry: Record<string, unknown>[];
};

export type ERxResult = {
  status: 'created' | 'queued' | 'error';
  prescriptionId: string;
  bundle?: ERxBundle;
  message?: string;
};

/** M3 HIU - request consent to fetch records (scaffold until NHA live). */
export type AbhaConsentRequest = {
  patientId: string;
  abhaId: string;
  purpose: string;
  hiTypes?: string[];
  fromDate?: string;
  toDate?: string;
};

export type AbhaConsentStatus = {
  consentId: string;
  status: 'requested' | 'granted' | 'denied' | 'expired' | 'error';
  message?: string;
};

export type AbhaHealthRecord = {
  id: string;
  hiType: string;
  title: string;
  authoredOn?: string;
  summary?: string;
};

export interface AbdmClient {
  /** True when production build lacks live ABDM config. */
  readonly disabled?: boolean;
  linkAbha(input: AbhaLinkInput): Promise<AbhaLinkResult>;
  verifyOtp(txnId: string, otp: string): Promise<AbhaIdentity>;
  createPrescription(bundle: ERxBundle): Promise<ERxResult>;
  /** M3 scaffold - HIU consent request */
  requestConsent(input: AbhaConsentRequest): Promise<AbhaConsentStatus>;
  getConsentStatus(consentId: string): Promise<AbhaConsentStatus>;
  fetchRecords(consentId: string): Promise<AbhaHealthRecord[]>;
}
