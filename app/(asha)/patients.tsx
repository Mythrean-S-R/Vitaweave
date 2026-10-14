import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
// @ts-ignore
import { Search, Filter, Phone, X, TriangleAlert as AlertTriangle, Clock, UserPlus } from 'lucide-react-native';
import { Colors, Fonts, getRiskColors } from '../_constants/theme';
import { ALL_PATIENTS, type Patient, type RiskLevel } from '../_constants/data';
import { runPatientTriage } from '../../lib/clinicalWorkflow';
import { useCareTeamPatients } from '../../hooks/useCareTeamPatients';
import { useRouter } from 'expo-router';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#d1fae5', text: '#059669' },
  Critical: { bg: '#fee2e2', text: '#dc2626' },
  Stable: { bg: '#e0f2fe', text: '#0891b2' },
};

type FilterMode = 'All' | RiskLevel;

import { generateCaseSummary, getRecommendedServices } from '../../lib/logic';
import { logAuditEvent } from '../../lib/auditLog';
import { VitalsCaptureForm } from '../../components/VitalsCaptureForm';
import { addPatientVitals } from '../../lib/referralsApi';
import { recalculateAndPersistUrgency } from '../../lib/urgencyWorkflow';
import { getStoredUserId } from '../../lib/authGuard';
import type { VitalReading } from '../../lib/urgencyScoring';
import { withAudit } from '../../lib/withAudit';

function PatientDetailModal({
  patient,
  onClose,
  onRefer,
  onAnc,
  onUpdated,
}: {
  patient: Patient;
  onClose: () => void;
  onRefer: () => void;
  onAnc?: () => void;
  onUpdated?: () => void;
}) {
  const riskColors = getRiskColors(patient.riskLevel);
  const statusColors = STATUS_COLORS[patient.status] || STATUS_COLORS.Stable;
  const summary = useMemo(() => generateCaseSummary(patient), [patient]);
  const referrals = useMemo(() => getRecommendedServices(patient), [patient]);
  const [vitals, setVitals] = useState<VitalReading>({});
  const [notes, setNotes] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);

  const saveVitals = async () => {
    setSavingVitals(true);
    try {
      const ashaId = await getStoredUserId();
      await withAudit(
        { action: 'update', resourceType: 'patient_vitals', resourceId: patient.id },
        async () => {
          await addPatientVitals({
            patientId: patient.id,
            recordedBy: ashaId ?? 'asha-offline',
            vitals: {
              heartRate: vitals.heartRate,
              bloodPressure: vitals.bloodPressure,
              bloodSugar: vitals.bloodSugar,
              temperature: vitals.temperature,
              respiratoryRate: vitals.respiratoryRate,
              spo2: vitals.spo2,
            },
          });
          await recalculateAndPersistUrgency(patient, [vitals]);
        }
      );
      Alert.alert('Saved', notes ? `Vitals saved. Notes: ${notes.slice(0, 80)}` : 'Vitals saved and priority score updated.');
      onUpdated?.();
    } catch {
      Alert.alert('Failed', 'Could not save vitals. They will retry when online.');
    } finally {
      setSavingVitals(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <ScrollView style={modal.sheet} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <Image source={{ uri: patient.image }} style={modal.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={modal.name}>{patient.name}</Text>
              <Text style={modal.sub}>{patient.age} yrs · {patient.condition}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={modal.badgeRow}>
            <View style={[modal.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[modal.badgeText, { color: statusColors.text }]}>{patient.status}</Text>
            </View>
            <View style={[modal.badge, { backgroundColor: riskColors.bg }]}>
              <Text style={[modal.badgeText, { color: riskColors.text }]}>{patient.riskLevel} Risk</Text>
            </View>
            {patient.urgencyScore != null && (
              <View style={[modal.badge, { backgroundColor: '#f1f5f9' }]}>
                <Text style={[modal.badgeText, { color: '#475569' }]}>Score {patient.urgencyScore}</Text>
              </View>
            )}
          </View>

          <View style={modal.summaryCard}>
            <Text style={modal.sectionTitle}>Clinical Summary</Text>
            <Text style={modal.summaryText}>{summary}</Text>
          </View>

          {referrals.length > 0 && (
            <View style={modal.referralSection}>
              <Text style={modal.sectionTitle}>Recommended Services</Text>
              {referrals.map(ref => (
                <View key={ref.id} style={modal.referralCard}>
                  <View style={modal.referralIcon}>
                    <Text style={{ fontSize: 16 }}>📌</Text>
                  </View>
                  <View>
                    <Text style={modal.referralTitle}>{ref.title}</Text>
                    <Text style={modal.referralReason}>{ref.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={modal.infoRow}>
            <Clock size={14} color={Colors.textMuted} />
            <Text style={modal.infoText}>Last visit: {patient.lastVisit}</Text>
          </View>
          <View style={[modal.followUpCard, { backgroundColor: patient.followUpUrgent ? Colors.riskHighBg : Colors.riskLowBg }]}>
            <AlertTriangle size={14} color={patient.followUpUrgent ? Colors.riskHigh : Colors.riskLow} />
            <Text style={[modal.followUpText, { color: patient.followUpUrgent ? Colors.riskHigh : Colors.riskLow }]}>
              Follow-up: {patient.followUpDue}
            </Text>
          </View>

          <VitalsCaptureForm
            initial={vitals}
            onChange={setVitals}
            showVoiceNotes
            notes={notes}
            onNotesChange={setNotes}
          />
          <TouchableOpacity
            style={[modal.referBtn, { backgroundColor: Colors.primary, marginBottom: 8 }]}
            onPress={saveVitals}
            disabled={savingVitals}>
            <Text style={modal.referBtnText}>{savingVitals ? 'Saving…' : 'Save vitals + re-score'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={modal.referBtn} onPress={onRefer}>
            <Text style={modal.referBtnText}>Refer to facility</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[modal.referBtn, { backgroundColor: '#0f766e' }]}
            onPress={() => {
              onClose();
              onAnc?.();
            }}>
            <Text style={modal.referBtnText}>ANC / PNC</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={modal.callBtn}
            onPress={() => Alert.alert('Call', `Calling ${patient.name} at ${patient.phone}`)}>
            <Phone size={16} color="#fff" />
            <Text style={modal.callBtnText}>Call {patient.phone}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function PatientsScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isLargeScreen = width >= 768;
  const { patients, loading, refresh } = useCareTeamPatients('asha');
  const [searchText, setSearchText] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('All');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [triaging, setTriaging] = useState(false);

  const handleAutoTriage = async () => {
    if (!patients.length) {
      Alert.alert('No Patients', 'Register patients before running triage.');
      return;
    }
    setTriaging(true);
    try {
      const triaged = await runPatientTriage(patients);
      await refresh();
      Alert.alert(
        'Triage Complete',
        `${triaged.filter((p) => p.riskLevel === 'High').length} high-risk patients prioritized.`
      );
    } catch {
      Alert.alert('Triage Failed', 'Could not save risk scores. Check your connection.');
    } finally {
      setTriaging(false);
    }
  };

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (filterMode !== 'All') {
      list = list.filter((p) => p.riskLevel === filterMode);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.condition.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0));
  }, [patients, searchText, filterMode]);

  const filterOptions: FilterMode[] = ['All', 'High', 'Medium', 'Low'];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }>
        {/* Search Bar */}
        <View style={[styles.searchContainer, isLargeScreen && styles.searchContainerLarge]}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients, conditions..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, filterMode !== 'All' && styles.filterBtnActive]}
            onPress={() => setShowFilterMenu(!showFilterMenu)}>
            <Filter size={20} color={filterMode !== 'All' ? '#fff' : Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        {showFilterMenu && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {filterOptions.map((opt) => {
              const isActive = filterMode === opt;
              const colors = opt === 'All' ? { bg: Colors.primaryLight, text: Colors.primary } : getRiskColors(opt as RiskLevel);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterPill, isActive && { backgroundColor: colors.text }]}
                  onPress={() => { setFilterMode(opt); setShowFilterMenu(false); }}>
                  <Text style={[styles.filterPillText, isActive && { color: '#fff' }]}>
                    {opt === 'All' ? 'All Patients' : `${opt} Risk`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
            {filterMode !== 'All' ? ` · ${filterMode} Risk` : ''}
          </Text>
          <TouchableOpacity onPress={handleAutoTriage} style={styles.triageBtn} disabled={triaging}>
            <Text style={styles.triageBtnText}>{triaging ? 'Triaging…' : '⚡ Auto-Triage'}</Text>
          </TouchableOpacity>
        </View>

        {/* Patient Grid */}
        <View style={[styles.grid, isLargeScreen && styles.gridLarge]}>
          {loading && patients.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Fetching patient records...</Text>
            </View>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptyText}>Try a different name or risk filter</Text>
            </View>
          ) : (
            filteredPatients.map((patient) => {
              const statusStyle = STATUS_COLORS[patient.status];
              const riskColors = getRiskColors(patient.riskLevel);
              return (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientCard,
                    isLargeScreen ? styles.patientCardLarge : styles.patientCardMobile,
                  ]}
                  onPress={() => {
                    setSelectedPatient(patient);
                    logAuditEvent({
                      action: 'read',
                      resourceType: 'patient',
                      resourceId: patient.id,
                    }).catch(() => undefined);
                  }}>
                  <Image source={{ uri: patient.image }} style={styles.patientImage} />
                  <View style={styles.patientInfo}>
                    <View style={styles.patientNameRow}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {patient.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.patientDetails}>
                      {patient.age} yrs · {patient.condition}
                    </Text>
                    {/* Risk Tag */}
                    <View style={styles.riskRow}>
                      <View style={[styles.riskTag, { backgroundColor: riskColors.bg }]}>
                        <Text style={[styles.riskTagText, { color: riskColors.text }]}>
                          {patient.riskLevel} Risk
                        </Text>
                      </View>
                      <View style={[styles.followUpChip, { backgroundColor: patient.followUpUrgent ? Colors.riskHighBg : Colors.riskLowBg }]}>
                        <Text style={[styles.followUpChipText, { color: patient.followUpUrgent ? Colors.riskHigh : Colors.riskLow }]}>
                          {patient.followUpUrgent ? '⚠️ ' : '✅ '}{patient.followUpDue}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Alert.alert('Call', `Calling ${patient.name} at ${patient.phone}`)}>
                    <Phone size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Patient FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(asha)/add-patient')}>
        <UserPlus size={22} color="#fff" />
      </TouchableOpacity>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onUpdated={() => refresh()}
          onRefer={() => {
            const p = selectedPatient;
            setSelectedPatient(null);
            router.push({
              pathname: '/(asha)/refer-patient',
              params: { patientId: p.id, patientName: p.name },
            } as any);
          }}
          onAnc={() => {
            const p = selectedPatient;
            setSelectedPatient(null);
            router.push({
              pathname: '/(asha)/anc-pnc',
              params: { patientId: p.id, patientName: p.name },
            } as any);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingBottom: Platform.OS === 'ios' ? 120 : 100 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchContainerLarge: { padding: 20 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },
  clearBtn: { fontSize: 14, color: Colors.textMuted, paddingHorizontal: 4 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterRow: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  countRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  countText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  triageBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  triageBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  grid: { padding: 16, gap: 12 },
  gridLarge: { padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  patientCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  patientCardMobile: { width: '100%' },
  patientCardLarge: { width: '48%' },
  patientImage: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.border },
  patientInfo: { flex: 1 },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  patientName: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontFamily: Fonts.semiBold, fontSize: 11 },
  patientDetails: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  riskRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  riskTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  riskTagText: { fontFamily: Fonts.semiBold, fontSize: 10 },
  followUpChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  followUpChipText: { fontFamily: Fonts.semiBold, fontSize: 10 },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.border },
  name: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textPrimary },
  sub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontFamily: Fonts.semiBold, fontSize: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  followUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  followUpText: { fontFamily: Fonts.semiBold, fontSize: 13 },
  referBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  referBtnText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.primary },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
  },
  callBtnText: { fontFamily: Fonts.semiBold, fontSize: 15, color: '#fff' },
  summaryCard: {
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  summaryText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  referralSection: {
    marginBottom: 16,
    gap: 8,
  },
  referralCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  referralIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  referralTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  referralReason: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});