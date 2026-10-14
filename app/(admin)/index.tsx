import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { ListSkeleton } from '../../components/ListSkeleton';
import {
  getAdminSummary,
  getDistrictMetrics,
  getRecentAuditLogs,
  getRecentScoringAudit,
  type AdminSummary,
  type DistrictMetric,
  type AuditLogEntry,
  type ScoringAuditEntry,
} from '../../lib/adminApi';
import { signOutUser } from '../../lib/auth';
import { clearSession } from '../../lib/authGuard';
import { SyncStatusDot } from '../../components/SyncStatusDot';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: accent }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [metrics, setMetrics] = useState<DistrictMetric[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [scoringLogs, setScoringLogs] = useState<ScoringAuditEntry[]>([]);

  const load = useCallback(async () => {
    const [s, m, a, sc] = await Promise.all([
      getAdminSummary(),
      getDistrictMetrics(10),
      getRecentAuditLogs(8),
      getRecentScoringAudit(8),
    ]);
    setSummary(s);
    setMetrics(m);
    setAuditLogs(a);
    setScoringLogs(sc);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logout = () => {
    Alert.alert('Logout', 'Sign out of supervisor console?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
          await clearSession();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ListSkeleton rows={6} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#475569" />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Program overview</Text>
          <Text style={styles.subheading}>Live counts from Supabase</Text>
        </View>
        <View style={styles.headerActions}>
          <SyncStatusDot accentColor="#475569" />
          <TouchableOpacity onPress={logout} hitSlop={8}>
            <LogOut size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {summary && (
        <View style={styles.statsGrid}>
          <StatCard label="Patients" value={summary.totalPatients} accent="#0891b2" />
          <StatCard label="High priority" value={summary.highRiskPatients} accent="#dc2626" />
          <StatCard label="Pending referrals" value={summary.pendingReferrals} accent="#d97706" />
          <StatCard label="ASHA workers" value={summary.activeAshaWorkers} accent="#059669" />
        </View>
      )}

      <Text style={styles.sectionTitle}>District metrics</Text>
      {metrics.length === 0 ? (
        <Text style={styles.empty}>
          No district_metrics rows yet. Seed via SQL or nightly rollup job.
        </Text>
      ) : (
        metrics.map((m) => (
          <View key={m.id} style={styles.metricRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricDistrict}>{m.district}</Text>
              <Text style={styles.metricDate}>{m.metricDate}</Text>
            </View>
            <Text style={styles.metricMeta}>
              {m.patientsRegistered} pts · {m.highRiskOpen} high · {m.referralsPending} ref
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Priority score audit</Text>
      {scoringLogs.length === 0 ? (
        <Text style={styles.empty}>No scoring events logged yet.</Text>
      ) : (
        scoringLogs.map((row) => (
          <View key={row.id} style={styles.logRow}>
            <Text style={styles.logMain}>Patient {row.patientId.slice(0, 8)}… → score {row.score}</Text>
            <Text style={styles.logMeta}>{row.source} · {new Date(row.createdAt).toLocaleString()}</Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Access audit (today: {summary?.todayAuditEvents ?? 0})</Text>
      {auditLogs.length === 0 ? (
        <Text style={styles.empty}>No audit events recorded.</Text>
      ) : (
        auditLogs.map((row) => (
          <View key={row.id} style={styles.logRow}>
            <Text style={styles.logMain}>
              {row.action.toUpperCase()} {row.resourceType}
              {row.resourceId ? ` ${row.resourceId.slice(0, 8)}` : ''}
            </Text>
            <Text style={styles.logMeta}>{new Date(row.createdAt).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
  subheading: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a', marginBottom: 8, marginTop: 8 },
  empty: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginBottom: 12 },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricDistrict: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a' },
  metricDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginTop: 2 },
  metricMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#475569', maxWidth: 120, textAlign: 'right' },
  logRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logMain: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#334155' },
  logMeta: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#94a3b8', marginTop: 2 },
});
