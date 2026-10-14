import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../app/_constants/theme';
import type { VitalReading } from '../lib/urgencyScoring';
import { VoiceDictationButton } from './VoiceDictationButton';

type Props = {
  initial?: VitalReading;
  onChange: (vitals: VitalReading) => void;
  showVoiceNotes?: boolean;
  onNotesChange?: (notes: string) => void;
  notes?: string;
};

export function VitalsCaptureForm({
  initial,
  onChange,
  showVoiceNotes,
  onNotesChange,
  notes = '',
}: Props) {
  const [vitals, setVitals] = useState<VitalReading>(initial ?? {});

  const update = (patch: Partial<VitalReading>) => {
    const next = { ...vitals, ...patch };
    setVitals(next);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Vitals</Text>
      <View style={styles.row}>
        <Field
          label="HR"
          value={vitals.heartRate != null ? String(vitals.heartRate) : ''}
          onChangeText={(t) => update({ heartRate: t ? Number(t) : undefined })}
          keyboardType="numeric"
        />
        <Field
          label="RR"
          value={vitals.respiratoryRate != null ? String(vitals.respiratoryRate) : ''}
          onChangeText={(t) => update({ respiratoryRate: t ? Number(t) : undefined })}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.row}>
        <Field
          label="BP"
          value={vitals.bloodPressure ?? ''}
          onChangeText={(t) => update({ bloodPressure: t || undefined })}
          placeholder="120/80"
        />
        <Field
          label="SpO2"
          value={vitals.spo2 != null ? String(vitals.spo2) : ''}
          onChangeText={(t) => update({ spo2: t ? Number(t) : undefined })}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.row}>
        <Field
          label="Temp °C"
          value={vitals.temperature != null ? String(vitals.temperature) : ''}
          onChangeText={(t) => update({ temperature: t ? Number(t) : undefined })}
          keyboardType="numeric"
        />
        <Field
          label="Sugar"
          value={vitals.bloodSugar != null ? String(vitals.bloodSugar) : ''}
          onChangeText={(t) => update({ bloodSugar: t ? Number(t) : undefined })}
          keyboardType="numeric"
        />
      </View>
      {showVoiceNotes && onNotesChange ? (
        <View style={styles.notesBlock}>
          <View style={styles.notesHeader}>
            <Text style={styles.label}>Symptom / notes</Text>
            <VoiceDictationButton
              onTranscript={(text) => onNotesChange(notes ? `${notes} ${text}` : text)}
            />
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={onNotesChange}
            multiline
            placeholder="Describe symptoms…"
          />
        </View>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  heading: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#0f172a', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  field: { flex: 1 },
  label: { fontFamily: Fonts.medium, fontSize: 11, color: '#64748b', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  notesBlock: { marginTop: 8 },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
