import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../app/_constants/theme';
import { createReferral } from '../lib/api';
import { getStoredUserId } from '../lib/authGuard';
import type { ReferralRecord } from '../app/_constants/data';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  patientId: string;
  patientName: string;
  accentColor?: string;
};

const DESTINATION_OPTIONS: { value: ReferralRecord['referredToType']; label: string }[] = [
  { value: 'asha_escalate', label: 'ASHA Escalate' },
  { value: 'phc', label: 'PHC' },
  { value: 'chc', label: 'CHC' },
  { value: 'district_hospital', label: 'District Hospital' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'telemedicine', label: 'Telemedicine' },
  { value: 'specialist', label: 'Specialist' },
];

const URGENCY_OPTIONS: { value: ReferralRecord['urgency']; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
];

export function ReferPatientForm({ patientId, patientName, accentColor = Colors.primary }: Props) {
  const router = useRouter();
  const [destination, setDestination] = useState<ReferralRecord['referredToType']>('phc');
  const [facilityName, setFacilityName] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<ReferralRecord['urgency']>('routine');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Describe why this patient needs referral.');
      return;
    }
    setLoading(true);
    try {
      const userId = await getStoredUserId();
      if (!userId) {
        Alert.alert('Session expired', 'Please sign in again.');
        return;
      }
      const { error } = await createReferral({
        patientId,
        referredBy: userId,
        referredToType: destination,
        referredToName: facilityName.trim() || undefined,
        reason: reason.trim(),
        urgency,
      });
      if (error) throw error;
      Alert.alert('Referral sent', `${patientName} has been referred. The receiving facility will be notified.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Failed', 'Could not create referral. It will retry when you are back online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.patientLabel}>Patient</Text>
      <Text style={styles.patientName}>{patientName}</Text>

      <Text style={styles.label}>Destination type</Text>
      <SegmentedControl
        options={DESTINATION_OPTIONS}
        value={destination}
        onChange={setDestination}
      />

      <Text style={styles.label}>Facility or doctor name (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. District Hospital, Dr. Mehta"
        placeholderTextColor={Colors.textMuted}
        value={facilityName}
        onChangeText={setFacilityName}
      />

      <Text style={styles.label}>Clinical reason</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Symptoms, vitals, and why referral is needed"
        placeholderTextColor={Colors.textMuted}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Urgency</Text>
      <SegmentedControl
        options={URGENCY_OPTIONS}
        value={urgency}
        onChange={setUrgency}
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: accentColor }, loading && styles.disabled]}
        onPress={submit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Send referral</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  patientLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase' },
  patientName: { fontFamily: Fonts.semiBold, fontSize: 20, color: Colors.textPrimary, marginBottom: 20 },
  label: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { marginTop: 28, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitText: { fontFamily: Fonts.semiBold, fontSize: 15, color: '#fff' },
  disabled: { opacity: 0.7 },
});
