import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveConsentRecord } from './repositories/dataRightsRepo';
import { getStoredUserId } from './sessionStorage';
import { logAuditEvent } from './auditLog';

const CONSENT_KEY = '@vitaweave_consent_accepted';
const CONSENT_VERSION = '1.1';

export type GuardianConsent = {
  isMinor: boolean;
  guardianName?: string;
  guardianRelationship?: string;
  guardianAcknowledged?: boolean;
};

export type ConsentRecord = {
  version: string;
  acceptedAt: string;
  medicalDisclaimer: boolean;
  privacyPolicy: boolean;
  dataProcessing: boolean;
  guardian?: GuardianConsent;
};

export async function hasAcceptedConsent(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as ConsentRecord;
    const baseOk =
      (record.version === CONSENT_VERSION || record.version === '1.0') &&
      record.medicalDisclaimer &&
      record.privacyPolicy &&
      record.dataProcessing;
    if (!baseOk) return false;
    // Minors require guardian acknowledgment (v1.1+)
    if (record.guardian?.isMinor) {
      return Boolean(
        record.guardian.guardianAcknowledged &&
          record.guardian.guardianName?.trim() &&
          record.guardian.guardianRelationship?.trim()
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function acceptConsent(guardian?: GuardianConsent): Promise<void> {
  if (guardian?.isMinor) {
    if (!guardian.guardianName?.trim() || !guardian.guardianRelationship?.trim()) {
      throw new Error('Guardian name and relationship are required for minors.');
    }
    if (!guardian.guardianAcknowledged) {
      throw new Error('Guardian must acknowledge consent for a minor.');
    }
  }

  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    medicalDisclaimer: true,
    privacyPolicy: true,
    dataProcessing: true,
    guardian: guardian?.isMinor
      ? {
          isMinor: true,
          guardianName: guardian.guardianName?.trim(),
          guardianRelationship: guardian.guardianRelationship?.trim(),
          guardianAcknowledged: true,
        }
      : { isMinor: false },
  };
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(record));

  const actorId = await getStoredUserId();
  if (actorId) {
    const purposes = ['care_delivery', 'ai_assist', 'notifications'];
    if (record.guardian?.isMinor) {
      purposes.push('parental_consent');
    }
    await saveConsentRecord({
      actorId,
      version: CONSENT_VERSION,
      purposes,
      guardian: record.guardian,
    }).catch(() => undefined);
    await logAuditEvent({
      action: 'create',
      resourceType: 'consent',
      resourceId: actorId,
      metadata: {
        version: CONSENT_VERSION,
        isMinor: Boolean(record.guardian?.isMinor),
      },
    }).catch(() => undefined);
  }
}

export async function clearConsent(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_KEY);
}

export const MEDICAL_DISCLAIMER =
  'VitaWeave provides health information and AI-assisted guidance for educational and operational support only. ' +
  'It is not a substitute for professional medical advice, diagnosis, or treatment. ' +
  'Always seek the advice of a qualified healthcare provider for medical emergencies or clinical decisions.';

export const PRIVACY_SUMMARY =
  'We collect account information, health records you enter, and usage data to operate the app. ' +
  'Data is stored securely via Supabase with role-based access. AI features may process de-identified prompts through secured servers. ' +
  'You can download your data or request erasure from your Profile → Data rights.';

export const PARENTAL_CONSENT_SUMMARY =
  'If this account or patient records concern a person under 18, a parent or legal guardian must provide name, ' +
  'relationship, and acknowledgment before health data is processed.';
