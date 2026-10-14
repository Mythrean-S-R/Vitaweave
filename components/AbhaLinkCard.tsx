import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, Fonts } from '../app/_constants/theme';
import { getAbdmClient, isAbdmConfigured } from '../lib/abdm/client';
import type { AbhaHealthRecord } from '../lib/abdm/types';
import { updatePatientLocal } from '../lib/repositories/patientRepo';
import { getPatientIdForProfile } from '../lib/api';
import { logAuditEvent } from '../lib/auditLog';

type Props = {
  profileId?: string;
  patientId?: string;
  abhaId?: string | null;
  verified?: boolean;
  onLinked?: (abhaId: string) => void;
};

/**
 * ABHA M2 linking + M3 HIU record-request scaffold.
 * Production builds disable mock OTP; live requires EXPO_PUBLIC_ABDM_BASE_URL.
 */
export function AbhaLinkCard({ profileId, patientId: patientIdProp, abhaId, verified, onLinked }: Props) {
  const configured = useMemo(() => isAbdmConfigured(), []);
  const [step, setStep] = useState<'idle' | 'otp' | 'done'>(abhaId ? 'done' : 'idle');
  const [mobile, setMobile] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [linkedId, setLinkedId] = useState(abhaId ?? '');
  const [isVerified, setIsVerified] = useState(Boolean(verified));
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AbhaHealthRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const resolvePatientId = async (): Promise<string | null> => {
    if (patientIdProp) return patientIdProp;
    if (profileId) return getPatientIdForProfile(profileId);
    return null;
  };

  const startLink = async () => {
    if (!configured) {
      Alert.alert(
        'ABDM not configured',
        'Set EXPO_PUBLIC_ABDM_MODE=live and EXPO_PUBLIC_ABDM_BASE_URL after NHA sandbox access.'
      );
      return;
    }
    if (!mobile.trim() && aadhaarLast4.length !== 4) {
      Alert.alert('Required', 'Enter mobile number or Aadhaar last 4 digits.');
      return;
    }
    const patientId = await resolvePatientId();
    if (!patientId) {
      Alert.alert('No patient record', 'Patient profile must be linked before ABHA linking.');
      return;
    }
    setLoading(true);
    try {
      const client = getAbdmClient();
      const result = await client.linkAbha({
        patientId,
        mobile: mobile.trim() || undefined,
        aadhaarLast4: aadhaarLast4 || undefined,
      });
      setTxnId(result.txnId);
      setStep('otp');
      const otpMsg = result.otpHint ? `\n\nDemo OTP: ${result.otpHint}` : '';
      Alert.alert('OTP sent', result.message + otpMsg);
    } catch (e) {
      Alert.alert('Link failed', e instanceof Error ? e.message : 'Could not start ABHA link');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      const client = getAbdmClient();
      const identity = await client.verifyOtp(txnId, otp.trim());
      const patientId = await resolvePatientId();
      if (patientId) {
        await updatePatientLocal(patientId, {
          abha_id: identity.abhaId,
          abha_verified: true,
        });
      }
      await logAuditEvent({
        action: 'update',
        resourceType: 'abha_link',
        resourceId: patientId ?? undefined,
        metadata: { abhaId: identity.abhaId },
      });
      setLinkedId(identity.abhaId);
      setIsVerified(true);
      setStep('done');
      onLinked?.(identity.abhaId);
    } catch (e) {
      Alert.alert('Verification failed', e instanceof Error ? e.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const requestRecords = async () => {
    if (!configured) {
      Alert.alert(
        'ABDM not configured',
        'HIU record fetch requires live ABDM credentials (M3).'
      );
      return;
    }
    if (!linkedId) {
      Alert.alert('Link ABHA first', 'Complete M2 linking before requesting records.');
      return;
    }
    const patientId = await resolvePatientId();
    if (!patientId) {
      Alert.alert('No patient record', 'Patient profile required.');
      return;
    }
    setRecordsLoading(true);
    try {
      const client = getAbdmClient();
      const consent = await client.requestConsent({
        patientId,
        abhaId: linkedId,
        purpose: 'Care management',
        hiTypes: ['Prescription', 'DiagnosticReport'],
      });
      if (consent.status !== 'granted') {
        Alert.alert('Consent pending', consent.message ?? `Status: ${consent.status}`);
        return;
      }
      const fetched = await client.fetchRecords(consent.consentId);
      setRecords(fetched);
      await logAuditEvent({
        action: 'read',
        resourceType: 'abha_hiu_records',
        resourceId: patientId,
        metadata: { consentId: consent.consentId, count: fetched.length },
      });
    } catch (e) {
      Alert.alert('Record request failed', e instanceof Error ? e.message : 'HIU unavailable');
    } finally {
      setRecordsLoading(false);
    }
  };

  if (!configured && !linkedId) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>ABHA HEALTH ID</Text>
        <Text style={styles.hint}>
          ABDM linking is disabled until live NHA credentials are configured
          (`EXPO_PUBLIC_ABDM_MODE=live` + `EXPO_PUBLIC_ABDM_BASE_URL`). Mock OTP is not available in
          production builds.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>ABHA HEALTH ID</Text>
      {step === 'done' && linkedId ? (
        <>
          <Text style={styles.id}>{linkedId}</Text>
          <Text style={styles.status}>{isVerified ? 'Verified' : 'Pending verification'}</Text>
          <TouchableOpacity onPress={() => setStep('idle')}>
            <Text style={styles.linkAgain}>Re-link / update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={requestRecords} disabled={recordsLoading}>
            {recordsLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.secondaryBtnText}>Request health records (M3)</Text>
            )}
          </TouchableOpacity>
          {records.map((r) => (
            <View key={r.id} style={styles.recordRow}>
              <Text style={styles.recordTitle}>{r.title}</Text>
              <Text style={styles.recordMeta}>{r.hiType}{r.authoredOn ? ` · ${r.authoredOn}` : ''}</Text>
              {r.summary ? <Text style={styles.recordMeta}>{r.summary}</Text> : null}
            </View>
          ))}
        </>
      ) : step === 'otp' ? (
        <>
          <Text style={styles.hint}>Enter OTP sent to your mobile</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="OTP"
            maxLength={6}
          />
          <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Link ABHA via mobile or Aadhaar last 4 (M2 flow)</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder="Mobile number"
          />
          <TextInput
            style={styles.input}
            value={aadhaarLast4}
            onChangeText={setAadhaarLast4}
            keyboardType="number-pad"
            placeholder="Aadhaar last 4"
            maxLength={4}
          />
          <TouchableOpacity style={styles.btn} onPress={startLink} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  id: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary, marginTop: 6 },
  status: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  hint: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 6, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontFamily: Fonts.regular,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  btnText: { fontFamily: Fonts.semiBold, color: '#fff' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 10,
  },
  secondaryBtnText: { fontFamily: Fonts.semiBold, color: Colors.primary },
  linkAgain: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.primary, marginTop: 8 },
  recordRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recordTitle: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.textPrimary },
  recordMeta: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
