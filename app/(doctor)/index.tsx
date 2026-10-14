import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
// @ts-ignore
import {
    Calendar, Users, Clock, Activity, TrendingUp, AlertCircle,
    ChevronRight, BellDot, Megaphone,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { getDoctorAppointments, getCampaigns, getPatientsForCaregiver, getCommunityAlerts } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { syncRoleNotifications } from '../../lib/careNotifications';
import { getUserProfile } from '../../lib/auth';
import { formatAppointmentTime, isAppointmentToday } from '../../lib/formatters';
import { summarizeCommunitySignals } from '../../lib/communityHealth';
import { SyncStatusDot } from '../../components/SyncStatusDot';
import { ListSkeleton } from '../../components/ListSkeleton';
import type { CommunityAlert } from '../_constants/data';

type QueueItem = {
    id: string;
    name: string;
    time: string;
    type: string;
    risk: string;
    urgencyScore: number;
};

function buildDoctorAlerts(
    patients: { riskLevel: string; name: string }[],
    communityAlerts: CommunityAlert[],
    campaignCount: number
) {
    const alerts: { text: string; severity: 'high' | 'moderate' | 'low' }[] = [];
    const highRisk = patients.filter((p) => p.riskLevel === 'High');
    if (highRisk.length > 0) {
        alerts.push({
            text: `${highRisk.length} high-risk patient(s) need review - including ${highRisk[0].name}.`,
            severity: 'high',
        });
    }
    const summary = summarizeCommunitySignals(communityAlerts);
    if (summary.highCount > 0) {
        alerts.push({
            text: `${summary.highCount} community alert(s) flagged in your ward.`,
            severity: 'moderate',
        });
    }
    if (campaignCount > 0) {
        alerts.push({
            text: `${campaignCount} active health campaign(s) - review outreach progress.`,
            severity: 'low',
        });
    }
    if (!alerts.length) {
        alerts.push({ text: 'No priority alerts. Patient queue is up to date.', severity: 'low' });
    }
    return alerts;
}

export default function DoctorDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [doctorName, setDoctorName] = useState('Doctor');
    const [todayCount, setTodayCount] = useState(0);
    const [patientCount, setPatientCount] = useState(0);
    const [campaignCount, setCampaignCount] = useState(0);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [alerts, setAlerts] = useState<{ text: string; severity: 'high' | 'moderate' | 'low' }[]>([]);

    const moveQueueUp = (id: string) => {
        setQueue((prev) => {
            const idx = prev.findIndex((q) => q.id === id);
            if (idx <= 0) return prev;
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const onQueueLongPress = (item: QueueItem) => {
        Alert.alert(item.name, undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Move up', onPress: () => moveQueueUp(item.id) },
            {
                text: 'See now',
                onPress: () => router.push({ pathname: '/(doctor)/appointments', params: { focusId: item.id } }),
            },
        ]);
    };

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const doctorId = await getStoredUserId();
            if (!doctorId) return;

            const [profile, appointments, campaigns, patients, communityAlerts] = await Promise.all([
                getUserProfile(doctorId),
                getDoctorAppointments(doctorId),
                getCampaigns(),
                getPatientsForCaregiver(doctorId, 'doctor'),
                getCommunityAlerts(),
            ]);

            if (profile.data?.name) setDoctorName(profile.data.name);

            const todayAppts = appointments
                .filter((a) => isAppointmentToday(a.appointmentTime))
                .sort((a, b) => {
                    const u = (b.patientUrgencyScore ?? 0) - (a.patientUrgencyScore ?? 0);
                    if (u !== 0) return u;
                    return new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime();
                });

            setTodayCount(todayAppts.length);
            setCampaignCount(campaigns.length);
            setPatientCount(patients.length);

            setQueue(
                todayAppts.slice(0, 6).map((a) => ({
                    id: a.id,
                    name: a.patientName ?? 'Patient',
                    time: formatAppointmentTime(a.appointmentTime),
                    type: a.title,
                    risk: (a.patientRiskLevel ?? 'low').toLowerCase(),
                    urgencyScore: a.patientUrgencyScore ?? 0,
                }))
            );
            setAlerts(buildDoctorAlerts(patients, communityAlerts, campaigns.length));
            syncRoleNotifications(doctorId, 'doctor').catch(() => undefined);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [loadDashboard])
    );

    const STATS = [
        { label: 'Today', value: String(todayCount), icon: Calendar, color: '#0891b2', bg: '#e0f2fe', route: '/(doctor)/appointments' },
        { label: 'Patients', value: String(patientCount), icon: Users, color: '#7c3aed', bg: '#ede9fe', route: null },
        { label: 'Campaigns', value: String(campaignCount), icon: Megaphone, color: '#d97706', bg: '#fef3c7', route: '/(doctor)/campaigns' },
        { label: 'Critical', value: String(queue.filter((q) => q.risk === 'high').length), icon: AlertCircle, color: '#dc2626', bg: '#fee2e2', route: null },
    ];

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ListSkeleton rows={6} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good Morning,</Text>
                    <Text style={styles.doctorName}>{doctorName}</Text>
                </View>
                <View style={styles.headerRight}>
                    <SyncStatusDot accentColor="#0891b2" />
                    <TouchableOpacity style={styles.notifBtn}>
                        <BellDot size={22} color="#0891b2" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Stats */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.statsGrid}>
                {STATS.map(({ label, value, icon: Icon, color, bg, route }) => (
                    <TouchableOpacity
                        key={label}
                        style={[styles.statCard, { borderLeftColor: color }]}
                        onPress={() => route && router.push(route as any)}
                        disabled={!route}
                    >
                        <View style={[styles.statIcon, { backgroundColor: bg }]}>
                            <Icon size={18} color={color} />
                        </View>
                        <Text style={[styles.statValue, { color }]}>{value}</Text>
                        <Text style={styles.statLabel}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </Animated.View>

            {/* AI Quick Insights */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.aiCard}>
                <View style={styles.aiHeader}>
                    <View style={styles.aiIconWrap}>
                        <Activity size={18} color="#0891b2" />
                    </View>
                    <Text style={styles.aiTitle}>AI Quick Insights</Text>
                </View>
                <Text style={styles.aiText}>
                    3 patients showing deteriorating trends. Sunita Devi's BP has risen 15% over 2 weeks.
                    Mohan Kumar's glucose levels require medication adjustment.
                </Text>
                <TouchableOpacity style={styles.aiBtn} onPress={() => router.push('/(doctor)/insights')}>
                    <Text style={styles.aiBtnText}>View Full Analysis</Text>
                    <ChevronRight size={16} color="#0891b2" />
                </TouchableOpacity>
            </Animated.View>

            {/* Alerts */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                <Text style={styles.sectionTitle}>Priority Alerts</Text>
                {alerts.map((a, i) => (
                    <View key={i} style={[
                        styles.alertRow,
                        a.severity === 'high' && styles.alertHigh,
                        a.severity === 'moderate' && styles.alertModerate,
                    ]}>
                        <AlertCircle size={16} color={
                            a.severity === 'high' ? '#dc2626' :
                                a.severity === 'moderate' ? '#d97706' : '#059669'
                        } />
                        <Text style={styles.alertText}>{a.text}</Text>
                    </View>
                ))}
            </Animated.View>

            {/* Today's Queue */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)}>
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>Patient Queue</Text>
                        <Text style={styles.queueHint}>SORTED BY URGENCY SCORE</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(doctor)/appointments')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>
                {queue.length === 0 ? (
                    <Text style={styles.emptyText}>No patients in today's queue.</Text>
                ) : (
                queue.map((appt) => (
                    <TouchableOpacity
                        key={appt.id}
                        style={styles.apptCard}
                        onLongPress={() => onQueueLongPress(appt)}
                        onPress={() => router.push('/(doctor)/appointments')}
                    >
                        <View style={[
                            styles.riskDot,
                            appt.urgencyScore >= 80 && { backgroundColor: '#dc2626' },
                            appt.urgencyScore >= 50 && appt.urgencyScore < 80 && { backgroundColor: '#d97706' },
                            appt.urgencyScore < 50 && { backgroundColor: '#059669' },
                        ]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.apptName}>{appt.name}</Text>
                            <Text style={styles.apptType}>{appt.type} · score {appt.urgencyScore}</Text>
                        </View>
                        <View style={styles.apptTimeWrap}>
                            <Clock size={14} color="#94a3b8" />
                            <Text style={styles.apptTime}>{appt.time}</Text>
                        </View>
                        <ChevronRight size={18} color="#cbd5e1" />
                    </TouchableOpacity>
                ))
                )}
            </Animated.View>

            {/* Quick Actions */}
            <Animated.View entering={FadeInDown.delay(550).duration(500)} style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/record-visit')}>
                        <Text style={styles.quickActionText}>Record Visit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/summarize-report' as any)}>
                        <Text style={styles.quickActionText}>Summarize</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/referrals' as any)}>
                        <Text style={styles.quickActionText}>Referrals</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/campaigns')}>
                        <Text style={styles.quickActionText}>Campaigns</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/telemedicine')}>
                        <Text style={styles.quickActionText}>Telemedicine</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(doctor)/add-patient')}>
                        <Text style={styles.quickActionText}>Add Patient</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Performance */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.perfCard}>
                <View style={styles.perfHeader}>
                    <TrendingUp size={18} color="#059669" />
                    <Text style={styles.perfTitle}>Weekly Performance</Text>
                </View>
                <View style={styles.perfGrid}>
                    <View style={styles.perfItem}>
                        <Text style={styles.perfValue}>47</Text>
                        <Text style={styles.perfLabel}>Consultations</Text>
                    </View>
                    <View style={styles.perfDivider} />
                    <View style={styles.perfItem}>
                        <Text style={styles.perfValue}>92%</Text>
                        <Text style={styles.perfLabel}>Satisfaction</Text>
                    </View>
                    <View style={styles.perfDivider} />
                    <View style={styles.perfItem}>
                        <Text style={[styles.perfValue, { color: '#059669' }]}>↑12%</Text>
                        <Text style={styles.perfLabel}>vs. Last Week</Text>
                    </View>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    queueHint: { fontFamily: 'Inter-Regular', fontSize: 10, color: '#94a3b8', letterSpacing: 0.5, marginTop: 2 },
    greeting: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
    doctorName: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#0f172a' },
    notifBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0f2fe',
        justifyContent: 'center', alignItems: 'center',
    },
    badge: {
        position: 'absolute', top: 10, right: 10, width: 8, height: 8,
        borderRadius: 4, backgroundColor: '#dc2626',
    },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
    },
    statCard: {
        flex: 1, minWidth: '46%', backgroundColor: '#fff', borderRadius: 14,
        padding: 14, borderLeftWidth: 3, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04,
        shadowRadius: 4, elevation: 2,
    },
    statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { fontFamily: 'Inter-Bold', fontSize: 22 },
    statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    aiCard: {
        backgroundColor: '#f0f9ff', borderRadius: 16, padding: 18,
        marginBottom: 24, borderWidth: 1, borderColor: '#bae6fd',
    },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    aiIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
    aiTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0891b2' },
    aiText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#334155', lineHeight: 20, marginBottom: 12 },
    aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
    aiBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#0891b2' },
    sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a', marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    seeAll: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#0891b2' },
    emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginBottom: 12 },
    alertRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
        backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#059669',
    },
    alertHigh: { borderLeftColor: '#dc2626', backgroundColor: '#fef2f2' },
    alertModerate: { borderLeftColor: '#d97706', backgroundColor: '#fffbeb' },
    alertText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#334155', flex: 1, lineHeight: 18 },
    apptCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    },
    riskDot: { width: 10, height: 10, borderRadius: 5 },
    apptName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a' },
    apptType: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    apptTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    apptTime: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748b' },
    quickActions: { marginTop: 8, marginBottom: 8 },
    quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickActionBtn: {
        backgroundColor: '#e0f2fe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    quickActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#0891b2' },
    perfCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    perfHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    perfTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a' },
    perfGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    perfItem: { alignItems: 'center', flex: 1 },
    perfValue: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
    perfLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginTop: 2 },
    perfDivider: { width: 1, height: 36, backgroundColor: '#e2e8f0' },
});
