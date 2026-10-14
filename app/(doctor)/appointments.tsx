import React, { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
// @ts-ignore
import {
    CalendarClock, Clock, ChevronRight,
    Plus, Video,
} from 'lucide-react-native';
import { getDoctorAppointments } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { startTelemedicineSession } from '../../lib/appointmentWorkflow';
import {
    formatAppointmentDate,
    formatAppointmentTime,
    isAppointmentToday,
    mapAppointmentStatusToUi,
} from '../../lib/formatters';
import type { AppointmentRecord } from '../_constants/data';

type TabType = 'today' | 'upcoming';

export default function AppointmentsScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<TabType>('today');
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const doctorId = await getStoredUserId();
            if (!doctorId) return;
            const data = await getDoctorAppointments(doctorId);
            setAppointments(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAppointments();
        }, [loadAppointments])
    );

    const todayList = appointments.filter((a) => isAppointmentToday(a.appointmentTime));
    const upcomingList = appointments.filter(
        (a) => !isAppointmentToday(a.appointmentTime) && a.status !== 'Completed' && a.status !== 'Cancelled'
    );
    const completedToday = todayList.filter((a) => a.status === 'Completed').length;
    const list = tab === 'today' ? todayList : upcomingList;

    const statusStyle = (s: string) =>
        s === 'completed' ? styles.statusDone :
            s === 'in-progress' ? styles.statusActive : styles.statusPending;

    const statusLabel = (s: string) =>
        s === 'completed' ? 'Done' :
            s === 'in-progress' ? 'In Progress' : 'Upcoming';

    const handleJoinCall = async (appt: AppointmentRecord) => {
        const doctorId = await getStoredUserId();
        if (!doctorId) return;
        const session = await startTelemedicineSession(appt, doctorId);
        router.push({
            pathname: '/(doctor)/telemedicine',
            params: {
                appointmentId: session.appointmentId,
                channelName: session.channelName,
                patientName: appt.patientName ?? 'Patient',
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#0891b2" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: '#0891b2' }]}>
                    <Text style={styles.summaryValue}>{todayList.length}</Text>
                    <Text style={styles.summaryLabel}>Today</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#7c3aed' }]}>
                    <Text style={styles.summaryValue}>{upcomingList.length}</Text>
                    <Text style={styles.summaryLabel}>Upcoming</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
                    <Text style={styles.summaryValue}>{completedToday}</Text>
                    <Text style={styles.summaryLabel}>Completed</Text>
                </View>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'today' && styles.tabActive]}
                    onPress={() => setTab('today')}>
                    <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
                    onPress={() => setTab('upcoming')}>
                    <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
                </TouchableOpacity>
            </View>

            {list.length === 0 && (
                <Text style={styles.emptyText}>
                    {tab === 'today' ? 'No appointments scheduled for today.' : 'No upcoming appointments.'}
                </Text>
            )}

            {tab === 'today' && list.map((appt) => {
                const uiStatus = mapAppointmentStatusToUi(appt.status, appt.appointmentTime);
                return (
                    <View key={appt.id} style={styles.cardWrapper}>
                        <TouchableOpacity style={styles.cardHeader}>
                            <View style={styles.cardLeft}>
                                <View style={styles.timeWrap}>
                                    <Clock size={14} color="#94a3b8" />
                                    <Text style={styles.timeText}>{formatAppointmentTime(appt.appointmentTime)}</Text>
                                </View>
                                <Text style={styles.cardName}>{appt.patientName ?? 'Patient'}</Text>
                                <Text style={styles.cardType}>{appt.title}</Text>
                            </View>
                            <View style={styles.cardRight}>
                                <View style={[styles.statusBadge, statusStyle(uiStatus)]}>
                                    <Text style={[styles.statusText, statusStyle(uiStatus)]}>{statusLabel(uiStatus)}</Text>
                                </View>
                                <ChevronRight size={18} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                        {(uiStatus === 'in-progress' || uiStatus === 'upcoming') && (
                            <TouchableOpacity style={styles.joinCallBtn} onPress={() => handleJoinCall(appt)}>
                                <Video size={16} color="#fff" />
                                <Text style={styles.joinCallText}>Join Telemedicine Call</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })}

            {tab === 'upcoming' && list.map((appt) => (
                <TouchableOpacity key={appt.id} style={styles.card}>
                    <View style={styles.cardLeft}>
                        <View style={styles.dateBadge}>
                            <CalendarClock size={12} color="#7c3aed" />
                            <Text style={styles.dateText}>{formatAppointmentDate(appt.appointmentTime)}</Text>
                        </View>
                        <Text style={styles.cardName}>{appt.patientName ?? 'Patient'}</Text>
                        <Text style={styles.cardType}>
                            {appt.title} • {formatAppointmentTime(appt.appointmentTime)}
                        </Text>
                    </View>
                    <ChevronRight size={18} color="#cbd5e1" />
                </TouchableOpacity>
            ))}

            <TouchableOpacity
                style={styles.fabSecondary}
                onPress={() => router.push('/(doctor)/record-visit')}
            >
                <Plus size={20} color="#0891b2" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(doctor)/add-patient')}
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 100 },
    emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', marginVertical: 24 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    summaryCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
        borderLeftWidth: 3, alignItems: 'center',
    },
    summaryValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#0f172a' },
    summaryLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginTop: 2 },
    tabRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#94a3b8' },
    tabTextActive: { color: '#0891b2', fontFamily: 'Inter-SemiBold' },
    cardWrapper: {
        backgroundColor: '#fff', borderRadius: 14, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 3, elevation: 1, overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16,
    },
    card: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    },
    cardLeft: { flex: 1 },
    cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    timeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#94a3b8' },
    cardName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a' },
    cardType: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusDone: { backgroundColor: '#d1fae5', color: '#059669' },
    statusActive: { backgroundColor: '#e0f2fe', color: '#0891b2' },
    statusPending: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
    statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
    dateBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6,
    },
    dateText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#7c3aed' },
    fabSecondary: {
        position: 'absolute', bottom: 30, right: 86,
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0891b2',
    },
    fab: {
        position: 'absolute', bottom: 30, right: 20,
        width: 56, height: 56, borderRadius: 28, backgroundColor: '#0891b2',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#0891b2', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    joinCallBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#0891b2', paddingVertical: 12,
    },
    joinCallText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
});
