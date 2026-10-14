import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSegments, useRouter, useFocusEffect } from 'expo-router';
// @ts-ignore
import {
  Bell,
  Calendar,
  Activity,
  Heart,
  Users,
  TrendingUp,
  ChevronRight,
  Radio,
  Plus,
  Sparkles,
  BriefcaseMedical,
  Syringe,
  UserPlus,
} from 'lucide-react-native';
import { Colors, Fonts, getRiskColors } from '../_constants/theme';
import {
  COMMUNITY_RISK_LEVEL,
  WEEKLY_ALERTS,
  DASHBOARD_TASKS,
  ALL_PATIENTS,
  type RiskLevel,
} from '../_constants/data';
import { getDashboardTasks, getWeeklyAlerts, getPatientsForCaregiver, addDashboardTask } from '../../lib/api';
import { generateAITaskSuggestions } from '../../lib/ai';
import { resolveWithDemoFallback } from '../../lib/dataPolicy';
import { getStoredUserId } from '../../lib/authGuard';
import { syncRoleNotifications } from '../../lib/careNotifications';
import { upsertAshaComplianceLog } from '../../lib/gigCompliance';
import { SyncStatusDot } from '../../components/SyncStatusDot';
import { FieldRouteMap } from '../../components/FieldRouteMap';

const HEALTH_TIPS = [
  { id: 1, title: 'Pregnancy Care', desc: 'Regular check-ups & nutrition', color: '#0891b2', bg: '#e0f2fe' },
  { id: 2, title: 'Child Vaccination', desc: 'Immunisation schedules', color: '#7c3aed', bg: '#ede9fe' },
  { id: 3, title: 'Nutrition', desc: 'Balanced diet guidelines', color: '#059669', bg: '#d1fae5' },
  { id: 4, title: 'Sanitation', desc: 'Hygiene best practices', color: '#d97706', bg: '#fef3c7' },
];

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  urgent: { label: '🔴 Urgent', bg: '#fee2e2', text: '#dc2626' },
  today: { label: '🟡 Today', bg: '#fef3c7', text: '#d97706' },
  routine: { label: '🟢 Routine', bg: '#d1fae5', text: '#059669' },
};

function RiskBanner({ risk }: { risk: RiskLevel }) {
  const colors = getRiskColors(risk);
  const icons: Record<RiskLevel, string> = { High: '🔴', Medium: '🟡', Low: '🟢' };
  const messages: Record<RiskLevel, string> = {
    High: 'High community risk - immediate action needed',
    Medium: '2 anomalies detected - monitor closely',
    Low: 'Community health looks stable this week',
  };
  return (
    <View style={[styles.riskBanner, { backgroundColor: colors.bg, borderColor: colors.text + '40' }]}>
      <View style={styles.riskBannerLeft}>
        <Radio size={18} color={colors.text} />
        <View style={{ marginLeft: 10 }}>
          <Text style={[styles.riskBannerTitle, { color: colors.text }]}>
            Community Health Signals
          </Text>
          <Text style={[styles.riskBannerDesc, { color: colors.text + 'cc' }]}>
            {messages[risk]}
          </Text>
        </View>
      </View>
      <View style={[styles.riskPill, { backgroundColor: colors.text }]}>
        <Text style={styles.riskPillText}>{icons[risk]} {risk} Risk</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [notifCount] = useState(3);
  const [tasks, setTasks] = useState(DASHBOARD_TASKS);
  const [alerts, setAlerts] = useState(WEEKLY_ALERTS);
  const [patientCount, setPatientCount] = useState(ALL_PATIENTS.length);
  const [loading, setLoading] = useState(true);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [role, setRole] = useState<'doctor' | 'patient'>('doctor');
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const getRole = async () => {
      const storedRole = await AsyncStorage.getItem('user_role');
      if (storedRole) setRole(storedRole as 'doctor' | 'patient');
    };
    getRole();
  }, [segments]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    setLoading(true);
    const ashaId = await getStoredUserId();
    const [t, a, p] = await Promise.all([
      getDashboardTasks(),
      getWeeklyAlerts(),
      ashaId ? getPatientsForCaregiver(ashaId, 'asha') : Promise.resolve([]),
    ]);

    setTasks(resolveWithDemoFallback(t, DASHBOARD_TASKS));
    setAlerts(resolveWithDemoFallback(a, WEEKLY_ALERTS));
    setPatientCount(resolveWithDemoFallback(p, ALL_PATIENTS).length);
    if (ashaId) {
      syncRoleNotifications(ashaId, 'asha').catch(() => undefined);
      upsertAshaComplianceLog({
        ashaId,
        tasksCompleted: t.filter((task) => task.priority === 'urgent').length,
        visitsCompleted: resolveWithDemoFallback(p, ALL_PATIENTS).length,
        hoursLogged: Math.min(8, resolveWithDemoFallback(p, ALL_PATIENTS).length * 0.25),
      }).catch(() => undefined);
    }
    setLoading(false);
  };

  const handleGenerateTasks = async () => {
    setIsGeneratingTasks(true);
    try {
      const newTasks = await generateAITaskSuggestions();
      if (newTasks && newTasks.length > 0) {
        await Promise.all(newTasks.map(task => addDashboardTask(task)));
        await loadDashboardData();
        Alert.alert('MedGemma AI', `Generated ${newTasks.length} new tasks based on community context.`);
      } else {
        Alert.alert('MedGemma AI', 'No new tasks needed at this time.');
      }
    } catch (e: any) {
      if (e.message?.includes('API Key')) {
        Alert.alert('MedGemma Disabled', 'Please enter your Gemini API Key in the AI Assistant tab to enable this feature.');
      } else {
        Alert.alert('Error', 'Failed to generate tasks.');
      }
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} colors={[Colors.primary]} tintColor={Colors.primary} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>
            {role === 'doctor' ? 'Dr. Anjali Desai 👋' : 'Sunita Sharma 👋'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <SyncStatusDot accentColor={Colors.primary} />
          <TouchableOpacity
            style={styles.bellContainer}
            onPress={() => Alert.alert('Notifications', 'You have 3 new notifications')}>
            <Bell size={22} color="#0f172a" />
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Community Health Signals Card */}
      <View style={styles.section}>
        <RiskBanner risk={COMMUNITY_RISK_LEVEL} />
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: role === 'doctor' ? '#0891b2' : '#059669' }]}>
          <Users size={20} color="#fff" />
          <Text style={styles.statNum}>{role === 'doctor' ? patientCount : '8.2k'}</Text>
          <Text style={styles.statLabel}>{role === 'doctor' ? 'Patients' : 'Steps Today'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: role === 'doctor' ? '#7c3aed' : '#0891b2' }]}
          onPress={() => router.push('/(asha)/vaccinations')}
        >
          <Activity size={20} color="#fff" />
          <Text style={styles.statNum}>{role === 'doctor' ? '48' : '15'}</Text>
          <Text style={styles.statLabel}>{role === 'doctor' ? 'Campaigns' : 'Vaccinations'}</Text>
        </TouchableOpacity>
        <View style={[styles.statCard, { backgroundColor: role === 'doctor' ? '#059669' : '#7c3aed' }]}>
          <TrendingUp size={20} color="#fff" />
          <Text style={styles.statNum}>{role === 'doctor' ? '893' : '3L'}</Text>
          <Text style={styles.statLabel}>{role === 'doctor' ? 'Hours' : 'Water Target'}</Text>
        </View>
      </View>

      {/* Field route */}
      <View style={styles.section}>
        <FieldRouteMap />
      </View>

      {/* Quick Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <View style={styles.quickToolsRow}>
          <TouchableOpacity style={styles.quickTool} onPress={() => router.push('/(asha)/services')}>
            <BriefcaseMedical size={20} color="#d97706" />
            <Text style={styles.quickToolText}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickTool} onPress={() => router.push('/(asha)/vaccinations')}>
            <Syringe size={20} color="#7c3aed" />
            <Text style={styles.quickToolText}>Vaccines</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickTool} onPress={() => router.push('/(asha)/add-patient')}>
            <UserPlus size={20} color="#0891b2" />
            <Text style={styles.quickToolText}>Add Patient</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekly Alerts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text style={styles.sectionTitle}>Weekly Alerts</Text>
            <View style={styles.alertCountBadge}>
              <Text style={styles.alertCountText}>{alerts.length} new</Text>
            </View>
            {loading && <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />}
          </View>
          <TouchableOpacity onPress={() => router.push('/(asha)/add-alert')} style={{ padding: 4 }}>
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {alerts.map((alert) => {
          const colors = getRiskColors(alert.severity);
          return (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertCard, { borderLeftColor: colors.text }]}
              onPress={() => Alert.alert(alert.title, alert.description)}>
              <View style={[styles.alertDot, { backgroundColor: colors.text }]} />
              <View style={styles.alertBody}>
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={[styles.severityPill, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.severityText, { color: colors.text }]}>{alert.severity}</Text>
                  </View>
                </View>
                <Text style={styles.alertDesc}>{alert.description}</Text>
                <Text style={styles.alertTime}>{(alert as any).time || (alert as any).time_ago}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            {(loading || isGeneratingTasks) && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
          <TouchableOpacity onPress={handleGenerateTasks} style={{ padding: 4, marginRight: 8 }} disabled={isGeneratingTasks}>
            <Sparkles size={20} color={isGeneratingTasks ? Colors.textMuted : '#7c3aed'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(asha)/add-task')} style={{ padding: 4 }}>
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {tasks.map((task) => {
          const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.routine;
          const iconColor = task.icon === 'calendar' ? '#0891b2' : task.icon === 'activity' ? '#7c3aed' : '#e11d48';
          const IconComp = task.icon === 'calendar' ? Calendar : task.icon === 'activity' ? Activity : Heart;
          return (
            <TouchableOpacity
              key={task.id}
              style={styles.card}
              onPress={() => Alert.alert(task.title, task.subtitle)}>
              <View style={styles.cardIcon}>
                <IconComp size={20} color={iconColor} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.taskText}>{task.title}</Text>
                <Text style={styles.taskSub}>{task.subtitle}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                <Text style={[styles.priorityText, { color: priority.text }]}>{priority.label}</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent Updates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Updates</Text>
        <TouchableOpacity
          style={styles.updateCard}
          onPress={() => Alert.alert('Advisory', 'Opening health advisory details...')}>
          <View style={styles.updateDot} />
          <View style={styles.updateBody}>
            <Text style={styles.updateTitle}>New Health Advisory</Text>
            <Text style={styles.updateText}>
              Updated guidelines for maternal care - revised iron supplementation protocol for Q1 2026.
            </Text>
            <Text style={styles.updateTime}>2 hours ago</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.updateCard}
          onPress={() => Alert.alert('Scheme', 'Opening scheme details...')}>
          <View style={[styles.updateDot, { backgroundColor: '#7c3aed' }]} />
          <View style={styles.updateBody}>
            <Text style={styles.updateTitle}>PM-JAY Scheme Update</Text>
            <Text style={styles.updateText}>
              New beneficiary registration portal is now live. Enrol eligible patients.
            </Text>
            <Text style={styles.updateTime}>Yesterday</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Health Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Tips</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsContainer}>
          {HEALTH_TIPS.map((tip) => (
            <TouchableOpacity
              key={tip.id}
              style={[styles.tipCard, { backgroundColor: tip.bg }]}
              onPress={() => {
                if (tip.id === 1) {
                  router.push('/(asha)/anc-pnc');
                  return;
                }
                if (tip.id === 2) {
                  router.push('/(asha)/vaccinations');
                  return;
                }
                Alert.alert(tip.title, tip.desc);
              }}>
              <Text style={[styles.tipTitle, { color: tip.color }]}>{tip.title}</Text>
              <Text style={[styles.tipDesc, { color: tip.color }]}>{tip.desc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#fff',
  },
  // Risk Banner
  riskBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  riskBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riskBannerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    marginBottom: 2,
  },
  riskBannerDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  riskPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#fff',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: '#fff',
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  // Section
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  quickToolsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTool: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickToolText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  alertCountBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 12,
  },
  alertCountText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#fff',
  },
  // Alert Cards
  alertCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    gap: 10,
    alignItems: 'flex-start',
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  alertBody: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  alertTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  severityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  alertDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  alertTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
  },
  // Task Cards
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  taskText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  taskSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  // Update Cards
  updateCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
    alignItems: 'flex-start',
  },
  updateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  updateBody: {
    flex: 1,
  },
  updateTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  updateText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  updateTime: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  // Tips
  tipsContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tipCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 160,
  },
  tipTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  tipDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    opacity: 0.8,
  },
});