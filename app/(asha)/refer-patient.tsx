import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ReferPatientForm } from '../../components/ReferPatientForm';
import { Colors } from '../_constants/theme';
import { EmptyState } from '../../components/EmptyState';

export default function AshaReferPatientScreen() {
  const { patientId, patientName } = useLocalSearchParams<{ patientId?: string; patientName?: string }>();

  if (!patientId || !patientName) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          title="No patient selected"
          message="Open a patient record and tap Refer to start a referral."
        />
      </View>
    );
  }

  return <ReferPatientForm patientId={patientId} patientName={patientName} accentColor={Colors.primary} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center' },
});
