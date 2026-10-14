import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ReferPatientForm } from '../../components/ReferPatientForm';
import { EmptyState } from '../../components/EmptyState';

export default function DoctorReferPatientScreen() {
  const { patientId, patientName } = useLocalSearchParams<{ patientId?: string; patientName?: string }>();

  if (!patientId || !patientName) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          title="No patient selected"
          message="Select a patient from Record Visit or appointments, then refer."
        />
      </View>
    );
  }

  return <ReferPatientForm patientId={patientId} patientName={patientName} accentColor="#0891b2" />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center' },
});
