import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
// @ts-ignore
import {
    Heart, Activity, Droplets, Thermometer, Moon,
    CalendarClock, ChevronRight, Lightbulb, BellDot, Pill,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import {
    getPatientVitals,
    getPatientMedications,
    getPatientAppointments,
    getPatientDisplayName,
    getMedicationDosesForProfile,
    markMedicationDoseTaken,
    getActiveCampaignTips,
} from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { getUserProfile } from '../../lib/auth';
import { formatAppointmentDate, formatAppointmentTime } from '../../lib/formatters';
import { SyncStatusDot } from '../../components/SyncStatusDot';
import { useTranslation } from '../../hooks/useTranslation';
import type { MedicationReminderDose, PatientMedication, PatientVital } from '../_constants/data';

const FALLBACK_TIPS = [
    'Drink at least 8 glasses of water daily',
    'Walk 30 minutes after dinner for better digestion',
    'Include leafy greens in at least one meal today',
];

export default function PatientDashboard() {
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('Patient');
    const [profileLanguage, setProfileLanguage] = useState<string | null>(null);
    const { t } = useTranslation(profileLanguage);
    const [vitals, setVitals] = useState<PatientVital | null>(null);
    const [medDoses, setMedDoses] = useState<MedicationReminderDose[]>([]);
    const [tips, setTips] = useState<string[]>(FALLBACK_TIPS);
    const [upcomingAppointments, setUpcomingAppointments] = useState<
        { doctor: string; type: string; date: string; color: string }[]
    >([]);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const profileId = await getStoredUserId();
            if (!profileId) return;

            const [displayName, vitalData, doses, legacyMeds, appointments, profileRes, campaignTips] =
                await Promise.all([
                    getPatientDisplayName(profileId),
                    getPatientVitals(profileId),
                    getMedicationDosesForProfile(profileId),
                    getPatientMedications(profileId),
                    getPatientAppointments(profileId),
                    getUserProfile(profileId),
                    getActiveCampaignTips(5),
                ]);

            if (profileRes.data?.language) setProfileLanguage(profileRes.data.language);
            setName(displayName);
            setVitals(vitalData);
            setTips(campaignTips.length > 0 ? campaignTips : FALLBACK_TIPS);

            if (doses.length) {
                setMedDoses(doses);
            } else {
                setMedDoses(
                    legacyMeds.map((med: PatientMedication) => ({
                        reminderId: `legacy-${med.id}`,
                        medicationName: med.name,
                        timeLabel: med.schedule || 'As directed',
                        timeKey: med.schedule || 'any',
                        takenToday: med.takenToday,
                    }))
                );
            }

            const colors = ['#0891b2', '#7c3aed', '#d97706'];
            const upcoming = appointments
                .filter((a) => a.status === 'Scheduled' || a.status === 'Active')
                .filter((a) => new Date(a.appointmentTime).getTime() >= Date.now())
                .slice(0, 3)
                .map((a, i) => ({
                    doctor: a.doctorName ?? 'Doctor',
                    type: a.title,
                    date: `${formatAppointmentDate(a.appointmentTime)}, ${formatAppointmentTime(a.appointmentTime)}`,
                    color: colors[i % colors.length],
                }));
            setUpcomingAppointments(upcoming);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [loadDashboard])
    );

    const vitalCards = vitals
        ? [
            { label: 'Heart Rate', value: String(vitals.heartRate ?? '-'), unit: 'bpm', icon: Heart, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Blood Pressure', value: vitals.bloodPressure ?? '-', unit: 'mmHg', icon: Activity, color: '#0891b2', bg: '#e0f2fe' },
            { label: 'Blood Sugar', value: String(vitals.bloodSugar ?? '-'), unit: 'mg/dL', icon: Droplets, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Temperature', value: String(vitals.temperature ?? '-'), unit: '°F', icon: Thermometer, color: '#d97706', bg: '#fef3c7' },
        ]
        : [];

    const toggleDose = async (dose: MedicationReminderDose) => {
        if (dose.takenToday || dose.reminderId.startsWith('legacy-')) return;
        await markMedicationDoseTaken(dose.reminderId, dose.timeKey);
        setMedDoses((prev) =>
            prev.map((d) =>
                d.reminderId === dose.reminderId && d.timeKey === dose.timeKey
                    ? { ...d, takenToday: true }
                    : d
            )
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#059669" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{t('common.welcome')}</Text>
                    <Text style={styles.name}>{name}</Text>
                </View>
                <View style={styles.headerRight}>
                    <SyncStatusDot accentColor="#059669" />
                    <TouchableOpacity style={styles.notifBtn}>
                        <BellDot size={22} color="#059669" />
                        <View style={styles.notifDot} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                <Text style={styles.sectionTitle}>{t('patient.vitals')}</Text>
                {vitalCards.length > 0 ? (
                    <View style={styles.vitalGrid}>
                        {vitalCards.map(({ label, value, unit, icon: Icon, color, bg }) => (
                            <View key={label} style={[styles.vitalCard, { borderTopColor: color }]}>
                                <View style={[styles.vitalIcon, { backgroundColor: bg }]}>
                                    <Icon size={18} color={color} />
                                </View>
                                <Text style={[styles.vitalValue, { color }]}>{value}</Text>
                                <Text style={styles.vitalUnit}>{unit}</Text>
                                <Text style={styles.vitalLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>{t('patient.noVitals')}</Text>
                )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                <Text style={styles.sectionTitle}>{t('patient.medications')}</Text>
                {medDoses.length > 0 ? (
                    medDoses.map((med) => (
                        <TouchableOpacity
                            key={`${med.reminderId}-${med.timeKey}`}
                            style={styles.medRow}
                            onPress={() => toggleDose(med)}
                            disabled={med.takenToday || med.reminderId.startsWith('legacy-')}
                        >
                            <View style={[styles.medCheck, med.takenToday && styles.medCheckDone]}>
                                {med.takenToday && <Text style={styles.medCheckMark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.medName, med.takenToday && styles.medNameDone]}>{med.medicationName}</Text>
                                <Text style={styles.medTime}>
                                    {med.dosage ? `${med.dosage} · ` : ''}{t('patient.doseDue', { time: med.timeLabel })}
                                </Text>
                            </View>
                            <Pill size={16} color={med.takenToday ? '#059669' : '#94a3b8'} />
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>{t('patient.noMeds')}</Text>
                )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('patient.visits')}</Text>
                </View>
                {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appt, i) => (
                        <TouchableOpacity key={i} style={styles.apptCard}>
                            <View style={[styles.apptDot, { backgroundColor: appt.color }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.apptDoctor}>{appt.doctor}</Text>
                                <Text style={styles.apptType}>{appt.type}</Text>
                            </View>
                            <View style={styles.apptDateWrap}>
                                <CalendarClock size={14} color="#94a3b8" />
                                <Text style={styles.apptDate}>{appt.date}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.emptyText}>{t('patient.noVisits')}</Text>
                )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                    <Lightbulb size={16} color="#d97706" />
                    <Text style={styles.tipsTitle}>{t('patient.tips')}</Text>
                </View>
                {tips.map((tip, i) => (
                    <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.sleepCard}>
                <View style={styles.sleepHeader}>
                    <Moon size={16} color="#7c3aed" />
                    <Text style={styles.sleepTitle}>{t('patient.wellness')}</Text>
                </View>
                <Text style={styles.emptyText}>Sleep tracking will be available in a future update.</Text>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 24,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    greeting: { fontFamily: 'Inter-Regular', fontSize: 14, color: '#64748b' },
    name: { fontFamily: 'Inter-Bold', fontSize: 24, color: '#0f172a' },
    notifBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: '#d1fae5',
        justifyContent: 'center', alignItems: 'center',
    },
    notifDot: {
        position: 'absolute', top: 10, right: 10,
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626',
    },
    sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0f172a', marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 },
    vitalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    vitalCard: {
        flex: 1, minWidth: '46%', backgroundColor: '#fff', borderRadius: 14,
        padding: 14, borderTopWidth: 3, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    vitalIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    vitalValue: { fontFamily: 'Inter-Bold', fontSize: 22 },
    vitalUnit: { fontFamily: 'Inter-Regular', fontSize: 11, color: '#94a3b8' },
    vitalLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748b', marginTop: 4 },
    medRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
    },
    medCheck: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2,
        borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center',
    },
    medCheckDone: { backgroundColor: '#059669', borderColor: '#059669' },
    medCheckMark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    medName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a' },
    medNameDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
    medTime: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    apptCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
    },
    apptDot: { width: 10, height: 10, borderRadius: 5 },
    apptDoctor: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#0f172a' },
    apptType: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#94a3b8', marginTop: 2 },
    apptDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    apptDate: { fontFamily: 'Inter-Medium', fontSize: 11, color: '#64748b' },
    tipsCard: {
        backgroundColor: '#fffbeb', borderRadius: 16, padding: 18,
        marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a',
    },
    tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    tipsTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#d97706' },
    tipText: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#92400e', lineHeight: 22 },
    sleepCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    sleepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    sleepTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#7c3aed' },
});
