import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import type { Patient } from '../app/_constants/data';

type PatientPickerProps = {
  patients: Patient[];
  loading?: boolean;
  selectedId?: string;
  onSelect: (patient: Patient) => void;
  label?: string;
  placeholder?: string;
};

export function PatientPicker({
  patients,
  loading = false,
  selectedId,
  onSelect,
  label = 'Patient',
  placeholder = 'Select a patient',
}: PatientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = patients.find((p) => p.id === selectedId);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.condition.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#0891b2" />
        ) : (
          <Text style={selected ? styles.value : styles.placeholder}>
            {selected ? `${selected.name} · ${selected.condition}` : placeholder}
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Patient</Text>
            <TextInput
              style={styles.search}
              placeholder="Search by name or condition"
              value={query}
              onChangeText={setQuery}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.empty}>No patients found for your care team.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, item.id === selectedId && styles.rowSelected]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.age}y · {item.condition} · {item.riskLevel} risk
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  trigger: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#0f172a',
  },
  placeholder: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#94a3b8',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  sheetTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#0f172a',
    marginBottom: 12,
  },
  search: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowSelected: {
    backgroundColor: '#ecfeff',
  },
  rowName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#0f172a',
  },
  rowMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 24,
    fontFamily: 'Inter-Regular',
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    color: '#0891b2',
    fontSize: 15,
  },
});
