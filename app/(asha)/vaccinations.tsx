import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Syringe, Calendar, CheckCircle, ChevronLeft, Printer } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getVaccinations, markVaccinationComplete } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { resolveWithDemoFallback } from '../../lib/dataPolicy';
import { isDevModeEnabled } from '../../lib/devMode';
import { listVaccinationsLocal, markVaccinationLocal } from '../../lib/repositories/vaccinationRepo';
import { formatVaccinationReport } from '../../lib/immunization/uipCalendar';
import { logAuditEvent } from '../../lib/auditLog';
import type { VaccinationRecord } from '../_constants/data';
import { EmptyState } from '../../components/EmptyState';

const DEMO_VACCINATIONS: VaccinationRecord[] = [
  { id: 'demo-1', childName: 'Arjun Singh', ageLabel: '6 Weeks', vaccineName: 'OPV-1, Pentavalent-1', dueDate: 'Today', status: 'due' },
  { id: 'demo-2', childName: 'Riya Sharma', ageLabel: '10 Weeks', vaccineName: 'OPV-2, Pentavalent-2', dueDate: 'Tomorrow', status: 'due' },
  { id: 'demo-3', childName: 'Aarav Patel', ageLabel: '9 Months', vaccineName: 'Measles-1', dueDate: 'Overdue (2 Days)', status: 'due' },
  { id: 'demo-4', childName: 'Sneha Verma', ageLabel: 'Birth', vaccineName: 'BCG, OPV-0', dueDate: '15 Feb 2026', status: 'completed' },
];

export default function VaccinationTrackerScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'due' | 'completed'>('due');
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVaccinations = useCallback(async () => {
    setLoading(true);
    const ashaId = await getStoredUserId();
    const local = await listVaccinationsLocal(ashaId ?? undefined);
    if (local.length > 0) {
      setRecords(local);
    } else {
      const live = await getVaccinations(ashaId ?? undefined);
      setRecords(
        isDevModeEnabled() ? resolveWithDemoFallback(live, DEMO_VACCINATIONS) : live
      );
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVaccinations();
    }, [loadVaccinations])
  );

  const filtered = records.filter((v) => v.status === filter);

  const handleMarkGiven = async (record: VaccinationRecord) => {
    const ashaId = await getStoredUserId();
    if (!ashaId || record.id.startsWith('demo-')) {
      Alert.alert('Recorded', `${record.vaccineName} marked as administered (demo).`);
      return;
    }

    await markVaccinationLocal(record.id, ashaId);
    const { error } = await markVaccinationComplete(record.id, ashaId);
    await logAuditEvent({
      action: 'update',
      resourceType: 'vaccination',
      resourceId: record.id,
      metadata: { vaccineName: record.vaccineName },
    });
    if (error) {
      // Local save succeeded; remote may sync later
    }
    await loadVaccinations();
    Alert.alert('Recorded', `${record.vaccineName} marked as administered.`);
  };

  const handlePrintReport = async () => {
    const byChild = new Map<string, VaccinationRecord[]>();
    for (const r of records) {
      const list = byChild.get(r.childName) ?? [];
      list.push(r);
      byChild.set(r.childName, list);
    }
    const report = Array.from(byChild.entries())
      .map(([name, list]) =>
        formatVaccinationReport(
          name,
          list.map((r) => ({
            vaccineName: r.vaccineName,
            dueDate: r.dueDate,
            status: r.status,
            administeredAt: r.administeredAt,
          }))
        )
      )
      .join('\n\n');

    try {
      await Share.share({ message: report, title: 'UIP Immunization Report' });
    } catch {
      Alert.alert('Report', report.slice(0, 500) + (report.length > 500 ? '…' : ''));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Vaccinations</Text>
        </View>
        <TouchableOpacity style={styles.reportBtn} onPress={handlePrintReport}>
          <Printer size={16} color="#475569" />
          <Text style={styles.reportText}>Print Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, filter === 'due' && styles.tabActive]} onPress={() => setFilter('due')}>
          <Text style={[styles.tabText, filter === 'due' && styles.tabTextActive]}>Due / Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter === 'completed' && styles.tabActive]} onPress={() => setFilter('completed')}>
          <Text style={[styles.tabText, filter === 'completed' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0891b2" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={filter === 'due' ? 'No vaccinations due' : 'No completed doses yet'}
            message="Immunization records will appear here once synced from your ward."
            icon="💉"
          />
        ) : (
          filtered.map((vac) => (
            <View key={vac.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{vac.childName.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.childName}>{vac.childName}</Text>
                  <Text style={styles.childMeta}>{vac.ageLabel} · {vac.vaccineName}</Text>
                  <View style={styles.dateWrap}>
                    <Calendar size={12} color="#64748b" />
                    <Text style={[styles.dateText, vac.dueDate.includes('Overdue') && styles.textDanger]}>
                      {vac.dueDate}
                    </Text>
                  </View>
                </View>
              </View>

              {filter === 'due' ? (
                <TouchableOpacity style={styles.markBtn} onPress={() => handleMarkGiven(vac)}>
                  <Syringe size={16} color="#fff" />
                  <Text style={styles.markText}>Give Dose</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.doneBadge}>
                  <CheckCircle size={16} color="#059669" />
                  <Text style={styles.doneText}>Given</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  reportText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#475569' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b' },
  tabTextActive: { color: '#0891b2' },
  content: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfeff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#0891b2' },
  info: { flex: 1 },
  childName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a' },
  childMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
  dateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dateText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748b' },
  textDanger: { color: '#dc2626' },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0891b2', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  markText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#fff' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#059669' },
});
