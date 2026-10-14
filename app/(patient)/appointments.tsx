import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
// @ts-ignore
import {
    CalendarClock, Clock, MapPin, ChevronRight, Plus, User,
} from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getPatientAppointments } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { formatAppointmentDate, formatAppointmentTime, isAppointmentPast } from '../../lib/formatters';
import type { AppointmentRecord } from '../_constants/data';

type TabType = 'upcoming' | 'past';

export default function PatientAppointmentsScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<TabType>('upcoming');
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const profileId = await getStoredUserId();
            if (!profileId) return;
            const data = await getPatientAppointments(profileId);
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

    const upcoming = appointments.filter(
        (a) => !isAppointmentPast(a.appointmentTime) && a.status !== 'Completed' && a.status !== 'Cancelled'
    );
    const past = appointments.filter(
        (a) => isAppointmentPast(a.appointmentTime) || a.status === 'Completed' || a.status === 'Cancelled'
    );
    const list = tab === 'upcoming' ? upcoming : past;
    const nextVisit = upcoming[0];

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#059669" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderTopColor: '#059669' }]}>
                    <Text style={styles.summaryValue}>{upcoming.length}</Text>
                    <Text style={styles.summaryLabel}>Upcoming</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#7c3aed' }]}>
                    <Text style={styles.summaryValue}>{appointments.length}</Text>
                    <Text style={styles.summaryLabel}>Total Visits</Text>
                </View>
                <View style={[styles.summaryCard, { borderTopColor: '#d97706' }]}>
                    <Text style={styles.summaryValue}>
                        {nextVisit ? formatAppointmentDate(nextVisit.appointmentTime) : '-'}
                    </Text>
                    <Text style={styles.summaryLabel}>Next Visit</Text>
                </View>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
                    onPress={() => setTab('upcoming')}>
                    <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'past' && styles.tabActive]}
                    onPress={() => setTab('past')}>
                    <Text style={[styles.tabText, tab === 'past' && styles.tabTextActive]}>Past Visits</Text>
                </TouchableOpacity>
            </View>

            {list.length === 0 && (
                <Text style={styles.emptyText}>
                    {tab === 'upcoming' ? 'No upcoming appointments.' : 'No past visits on record.'}
                </Text>
            )}

            {tab === 'upcoming' && list.map((appt) => (
                <View key={appt.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.docAvatar}>
                            <User size={20} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.docName}>{appt.doctorName ?? 'Doctor'}</Text>
                            <Text style={styles.docSpec}>{appt.title}</Text>
                        </View>
                    </View>
                    <View style={styles.cardDetails}>
                        <View style={styles.detailItem}>
                            <CalendarClock size={14} color="#94a3b8" />
                            <Text style={styles.detailText}>
                                {formatAppointmentDate(appt.appointmentTime)} • {formatAppointmentTime(appt.appointmentTime)}
                            </Text>
                        </View>
                        {appt.description ? (
                            <View style={styles.detailItem}>
                                <MapPin size={14} color="#94a3b8" />
                                <Text style={styles.detailText}>{appt.description}</Text>
                            </View>
                        ) : null}
                    </View>
                    {(appt.status === 'Active' || appt.status === 'Scheduled') && (
                        <TouchableOpacity
                            style={styles.joinBtn}
                            onPress={() =>
                                router.push({
                                    pathname: '/(patient)/telemedicine',
                                    params: {
                                        appointmentId: appt.id,
                                        channelName: `vitaweave_${appt.id}`,
                                    },
                                } as any)
                            }>
                            <Text style={styles.joinText}>Join Telemedicine Call</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}

            {tab === 'past' && list.map((appt) => (
                <TouchableOpacity key={appt.id} style={[styles.card, styles.pastCard]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.docAvatar, { backgroundColor: '#f1f5f9' }]}>
                            <User size={20} color="#94a3b8" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.docName}>{appt.doctorName ?? 'Doctor'}</Text>
                            <Text style={styles.docSpec}>{appt.title}</Text>
                        </View>
                        <Text style={styles.pastDate}>{formatAppointmentDate(appt.appointmentTime)}</Text>
                    </View>
                    <Text style={styles.pastNotes}>{appt.description ?? appt.status}</Text>
                </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/(patient)/book-appointment')}>
                <Plus size={20} color="#fff" />
                <Text style={styles.bookText}>Book New Appointment</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b', textAlign: 'center', marginVertical: 24 },
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    summaryCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
        borderTopWidth: 3, alignItems: 'center',
    },
    summaryValue: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#0f172a', textAlign: 'center' },
    summaryLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8', marginTop: 2 },
    tabRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { fontFamily: 'Inter-Medium', fontSize: 14, color: '#94a3b8' },
    tabTextActive: { color: '#059669', fontFamily: 'Inter-SemiBold' },
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    pastCard: { opacity: 0.85 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    docAvatar: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: '#d1fae5',
        justifyContent: 'center', alignItems: 'center',
    },
    docName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a' },
    docSpec: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    cardDetails: { gap: 6, paddingLeft: 56 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b' },
    pastDate: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#94a3b8' },
    pastNotes: {
        fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b',
        paddingLeft: 56, marginTop: 4,
    },
    bookBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#059669', borderRadius: 14, height: 52, gap: 8,
        marginTop: 12, shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    bookText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#fff' },
    joinBtn: {
        marginTop: 12,
        marginLeft: 56,
        backgroundColor: '#059669',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    joinText: { fontFamily: 'Inter-SemiBold', color: '#fff', fontSize: 13 },
});
