import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Fonts } from '../_constants/theme';
import { PatientPicker } from '../../components/PatientPicker';
import { getStoredUserId } from '../../lib/authGuard';
import { getPatientsForCaregiver } from '../../lib/api';
import type { Patient } from '../_constants/data';
import {
  createPregnancy,
  listPregnancies,
  addAncVisit,
  addPncVisit,
  listAncVisits,
  listPncVisits,
  type PregnancyRecord,
  type AncVisitRecord,
  type PncVisitRecord,
} from '../../lib/repositories/ancPncRepo';
import { logAuditEvent } from '../../lib/auditLog';

export default function AncPncScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string }>();
  const [patientId, setPatientId] = useState(params.patientId ?? '');
  const [patientName, setPatientName] = useState(params.patientName ?? '');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pregnancies, setPregnancies] = useState<PregnancyRecord[]>([]);
  const [active, setActive] = useState<PregnancyRecord | null>(null);
  const [ancVisits, setAncVisits] = useState<AncVisitRecord[]>([]);
  const [pncVisits, setPncVisits] = useState<PncVisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lmp, setLmp] = useState('');
  const [findings, setFindings] = useState('');
  const [bp, setBp] = useState('');
  const [mode, setMode] = useState<'anc' | 'pnc'>('anc');

  const reload = useCallback(async () => {
    setLoading(true);
    const ashaId = await getStoredUserId();
    if (ashaId) {
      const list = await getPatientsForCaregiver(ashaId, 'asha');
      setPatients(list);
    }
    if (!patientId) {
      setLoading(false);
      return;
    }
    const list = await listPregnancies(patientId);
    setPregnancies(list);
    const current = list.find((p) => p.status === 'active') ?? list[0] ?? null;
    setActive(current);
    if (current) {
      setAncVisits(await listAncVisits(current.id));
      setPncVisits(await listPncVisits(current.id));
    } else {
      setAncVisits([]);
      setPncVisits([]);
    }
    setLoading(false);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const startPregnancy = async () => {
    if (!patientId) {
      Alert.alert('Select patient', 'Choose a patient to start ANC tracking.');
      return;
    }
    const ashaId = await getStoredUserId();
    const preg = await createPregnancy({
      patientId,
      lmp: lmp || undefined,
      assignedAshaId: ashaId ?? undefined,
    });
    await logAuditEvent({
      action: 'create',
      resourceType: 'pregnancy',
      resourceId: preg.id,
      metadata: { patientId },
    });
    setLmp('');
    await reload();
    Alert.alert('ANC started', `EDD: ${preg.edd ?? 'set LMP to estimate'}`);
  };

  const recordAnc = async () => {
    if (!active) {
      Alert.alert('No pregnancy', 'Start a pregnancy record first.');
      return;
    }
    const ashaId = await getStoredUserId();
    const visitNumber = ancVisits.length + 1;
    const visit = await addAncVisit({
      pregnancyId: active.id,
      patientId: active.patientId,
      visitNumber,
      findings,
      bp,
      recordedBy: ashaId ?? undefined,
    });
    await logAuditEvent({
      action: 'create',
      resourceType: 'anc_visit',
      resourceId: visit.id,
    });
    setFindings('');
    setBp('');
    await reload();
  };

  const recordPnc = async (day: 1 | 3 | 7 | 42) => {
    if (!active) {
      Alert.alert('No pregnancy', 'Start a pregnancy record first.');
      return;
    }
    const ashaId = await getStoredUserId();
    const visit = await addPncVisit({
      pregnancyId: active.id,
      patientId: active.patientId,
      visitDay: day,
      findings,
      recordedBy: ashaId ?? undefined,
    });
    await logAuditEvent({
      action: 'create',
      resourceType: 'pnc_visit',
      resourceId: visit.id,
    });
    setFindings('');
    await reload();
    Alert.alert('PNC recorded', `Day ${day} visit saved.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>ANC / PNC Tracking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Patient</Text>
        <PatientPicker
          patients={patients}
          selectedId={patientId}
          onSelect={(p) => {
            setPatientId(p.id);
            setPatientName(p.name);
          }}
        />

        <Text style={styles.label}>LMP (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={lmp} onChangeText={setLmp} placeholder="2026-01-15" />
        <TouchableOpacity style={styles.primaryBtn} onPress={startPregnancy}>
          <Text style={styles.primaryText}>Start / Register Pregnancy</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
        ) : active ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{patientName || 'Patient'}</Text>
              <Text style={styles.meta}>EDD: {active.edd ?? '-'} · LMP: {active.lmp ?? '-'}</Text>
              <Text style={styles.meta}>
                Gravida {active.gravida ?? '-'} / Para {active.para ?? '-'}
              </Text>
            </View>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'anc' && styles.tabActive]}
                onPress={() => setMode('anc')}>
                <Text style={[styles.tabText, mode === 'anc' && styles.tabTextActive]}>ANC</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'pnc' && styles.tabActive]}
                onPress={() => setMode('pnc')}>
                <Text style={[styles.tabText, mode === 'pnc' && styles.tabTextActive]}>PNC</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Findings</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={findings}
              onChangeText={setFindings}
              multiline
              placeholder="Clinical notes"
            />
            {mode === 'anc' && (
              <>
                <Text style={styles.label}>BP</Text>
                <TextInput style={styles.input} value={bp} onChangeText={setBp} placeholder="120/80" />
                <TouchableOpacity style={styles.primaryBtn} onPress={recordAnc}>
                  <Text style={styles.primaryText}>Record ANC Visit #{ancVisits.length + 1}</Text>
                </TouchableOpacity>
                {ancVisits.map((v) => (
                  <View key={v.id} style={styles.visitCard}>
                    <Text style={styles.visitTitle}>ANC #{v.visitNumber}</Text>
                    <Text style={styles.meta}>
                      {v.visitDate} · BP {v.bp ?? '-'}
                    </Text>
                    {v.findings ? <Text style={styles.meta}>{v.findings}</Text> : null}
                  </View>
                ))}
              </>
            )}
            {mode === 'pnc' && (
              <>
                <View style={styles.pncRow}>
                  {([1, 3, 7, 42] as const).map((day) => (
                    <TouchableOpacity key={day} style={styles.pncBtn} onPress={() => recordPnc(day)}>
                      <Text style={styles.pncBtnText}>Day {day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {pncVisits.map((v) => (
                  <View key={v.id} style={styles.visitCard}>
                    <Text style={styles.visitTitle}>PNC Day {v.visitDay}</Text>
                    <Text style={styles.meta}>{v.visitDate}</Text>
                    {v.findings ? <Text style={styles.meta}>{v.findings}</Text> : null}
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <Text style={styles.empty}>
            {patientId ? 'No pregnancy on file yet.' : 'Select a patient to begin.'}
          </Text>
        )}
        {pregnancies.length > 1 ? (
          <Text style={styles.meta}>{pregnancies.length} pregnancy records on device</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: Fonts.semiBold, fontSize: 18, color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontFamily: Fonts.medium, fontSize: 12, color: '#64748b', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryText: { fontFamily: Fonts.semiBold, color: '#fff', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#0f172a' },
  meta: { fontFamily: Fonts.regular, fontSize: 12, color: '#64748b', marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontFamily: Fonts.medium, color: '#475569' },
  tabTextActive: { color: '#fff' },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visitTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#0f172a' },
  pncRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pncBtn: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pncBtnText: { fontFamily: Fonts.semiBold, color: '#fff', fontSize: 13 },
  empty: { fontFamily: Fonts.regular, color: '#94a3b8', marginTop: 24, textAlign: 'center' },
});
