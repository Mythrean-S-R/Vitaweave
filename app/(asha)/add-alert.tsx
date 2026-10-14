import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { addWeeklyAlert } from '../../lib/api';
import { Colors, Fonts } from '../_constants/theme';
import type { RiskLevel } from '../_constants/data';
import { VoiceDictationButton } from '../../components/VoiceDictationButton';
import { writeLocalFirst } from '../../lib/sync/SyncService';
import { newLocalId, nowIso } from '../../lib/repositories/base';
import { getStoredUserId } from '../../lib/authGuard';
import { withAudit } from '../../lib/withAudit';
import { runOutbreakDetectionAndFlag } from '../../lib/surveillance/clusterDetector';
import { SegmentedControl } from '../../components/SegmentedControl';

type Mode = 'alert' | 'symptom';

export default function AddAlertScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('alert');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [symptom, setSymptom] = useState('');
  const [ward, setWard] = useState('');
  const [count, setCount] = useState('1');
  const [severity, setSeverity] = useState<RiskLevel>('Low');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (mode === 'alert') {
        if (!title || !description) {
          Alert.alert('Missing Fields', 'Please fill in Title and Description.');
          return;
        }
        await withAudit(
          { action: 'create', resourceType: 'weekly_alert', metadata: { title } },
          async () => {
            const { error } = await addWeeklyAlert({
              title,
              description,
              severity,
              time: 'Just now',
            });
            if (error) throw error;
          }
        );
        Alert.alert('Success', 'Alert broadcasted successfully.');
      } else {
        if (!symptom.trim() || !ward.trim()) {
          Alert.alert('Missing Fields', 'Enter symptom and ward.');
          return;
        }
        const ashaId = await getStoredUserId();
        await withAudit(
          { action: 'create', resourceType: 'symptom_report', metadata: { symptom, ward } },
          async () => {
            await writeLocalFirst('symptom_reports', {
              id: newLocalId(),
              symptom: symptom.trim(),
              ward: ward.trim(),
              count: Number(count) || 1,
              trend: 'up',
              reported_by: ashaId,
              notes_enc: description ? description : null,
              created_at: nowIso(),
              updated_at: nowIso(),
            });
            await runOutbreakDetectionAndFlag();
          }
        );
        Alert.alert('Recorded', 'Symptom report saved. Outbreak rules re-evaluated.');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <SegmentedControl
            options={[
              { value: 'alert', label: 'Weekly alert' },
              { value: 'symptom', label: 'Symptom' },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === 'alert' ? (
            <>
              <Text style={styles.sectionTitle}>Alert Details</Text>
              <View style={styles.inputWrapper}>
                <AlertCircle size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Alert Title (e.g. Malaria Rising)"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
              <View style={styles.labelRow}>
                <Text style={styles.hint}>Description</Text>
                <VoiceDictationButton
                  onTranscript={(t) => setDescription((d) => (d ? `${d} ${t}` : t))}
                />
              </View>
              <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  style={[styles.input, { height: 76, textAlignVertical: 'top' }]}
                  placeholder="Alert Description..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
              <Text style={styles.hint}>Severity</Text>
              <View style={styles.sevRow}>
                {(['Low', 'Medium', 'High'] as RiskLevel[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sevPill, severity === s && styles.sevActive]}
                    onPress={() => setSeverity(s)}>
                    <Text style={[styles.sevText, severity === s && styles.sevTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Symptom capture</Text>
              <View style={styles.labelRow}>
                <Text style={styles.hint}>Symptom</Text>
                <VoiceDictationButton onTranscript={(t) => setSymptom((s) => (s ? `${s} ${t}` : t))} />
              </View>
              <TextInput
                style={styles.field}
                placeholder="e.g. Fever, Diarrhoea"
                value={symptom}
                onChangeText={setSymptom}
              />
              <Text style={styles.hint}>Ward</Text>
              <TextInput style={styles.field} placeholder="Ward 3" value={ward} onChangeText={setWard} />
              <Text style={styles.hint}>Case count</Text>
              <TextInput
                style={styles.field}
                keyboardType="number-pad"
                value={count}
                onChangeText={setCount}
              />
              <View style={styles.labelRow}>
                <Text style={styles.hint}>Notes (optional)</Text>
                <VoiceDictationButton
                  onTranscript={(t) => setDescription((d) => (d ? `${d} ${t}` : t))}
                />
              </View>
              <TextInput
                style={[styles.field, { minHeight: 72, textAlignVertical: 'top' }]}
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Extra context…"
              />
            </>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{mode === 'alert' ? 'Broadcast alert' : 'Save symptom'}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: Fonts.semiBold, fontSize: 14, marginTop: 16, marginBottom: 10 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 14 },
  field: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontFamily: Fonts.regular,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { fontFamily: Fonts.medium, fontSize: 12, color: '#64748b', marginBottom: 6 },
  sevRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sevPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  sevActive: { backgroundColor: '#d97706' },
  sevText: { fontFamily: Fonts.medium, color: '#64748b' },
  sevTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { fontFamily: Fonts.semiBold, color: '#fff' },
});
