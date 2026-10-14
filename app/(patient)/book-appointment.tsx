import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
// @ts-ignore
import { User, CalendarClock, ChevronLeft, CheckCircle, Calendar, Clock } from 'lucide-react-native';
import { getDoctors, bookAppointment } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { Analytics } from '../../lib/analytics';
import { DateTimeField } from '../../components/DateTimeField';
import type { DoctorProfile } from '../../lib/api';

const VISIT_TYPES = [
    'General Checkup',
    'Follow-up Visit',
    'Prenatal Care',
    'Chronic Care',
    'Vaccination',
    'Telemedicine Consultation',
];

function offsetDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export default function BookAppointmentScreen() {
    const router = useRouter();
    const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
    const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
    const [date, setDate] = useState(() => offsetDate(1));
    const [time, setTime] = useState('10:00');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [bookedSuccess, setBookedSuccess] = useState(false);

    useEffect(() => {
        getDoctors().then((list) => {
            setDoctors(list);
            if (list.length > 0) setSelectedDoctor(list[0].id);
            setLoadingDoctors(false);
        });
    }, []);

    const handleBook = useCallback(async () => {
        if (!selectedDoctor || !date || !time) {
            Alert.alert('Missing Information', 'Please select a doctor, date, and time.');
            return;
        }

        const profileId = (await getStoredUserId()) || 'c3333333-3333-4333-8333-333333333333';

        const appointmentTime = new Date(`${date}T${time}:00`).toISOString();
        if (Number.isNaN(new Date(appointmentTime).getTime())) {
            Alert.alert('Invalid Date', 'Use date format YYYY-MM-DD and time HH:MM (24h).');
            return;
        }

        setLoading(true);
        const { error } = await bookAppointment({
            patientProfileId: profileId,
            doctorId: selectedDoctor,
            title: visitType,
            description: notes || undefined,
            appointmentTime,
        });
        setLoading(false);

        if (error) {
            Alert.alert('Booking Notice', error instanceof Error ? error.message : 'Could not save appointment.');
            return;
        }

        Analytics.trackAppointment('book');

        // Show the in-app confirmation modal
        setBookedSuccess(true);

        // Also trigger native Alert
        Alert.alert(
            'Appointment Scheduled!',
            `Your appointment for ${visitType} on ${date} at ${time} has been confirmed.`,
            [
                {
                    text: 'View Appointments',
                    onPress: () => router.replace('/(patient)/appointments'),
                },
            ]
        );
    }, [selectedDoctor, date, time, notes, visitType, router]);

    const activeDoctorObj = doctors.find((d) => d.id === selectedDoctor);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={22} color="#059669" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Book Appointment</Text>
                </View>

                <Text style={styles.label}>Select Doctor</Text>
                {loadingDoctors ? (
                    <ActivityIndicator color="#059669" />
                ) : doctors.length === 0 ? (
                    <Text style={styles.hint}>No doctors registered yet. Please try again later.</Text>
                ) : (
                    doctors.map((doc) => (
                        <TouchableOpacity
                            key={doc.id}
                            style={[styles.doctorCard, selectedDoctor === doc.id && styles.doctorCardActive]}
                            onPress={() => setSelectedDoctor(doc.id)}>
                            <View style={styles.docAvatar}>
                                <User size={18} color="#059669" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docName}>{doc.name}</Text>
                                {doc.ward ? <Text style={styles.docWard}>Ward {doc.ward}</Text> : null}
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <Text style={styles.label}>Visit Type</Text>
                <View style={styles.chipRow}>
                    {VISIT_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.chip, visitType === type && styles.chipActive]}
                            onPress={() => setVisitType(type)}>
                            <Text style={[styles.chipText, visitType === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <DateTimeField date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Symptoms or reason for visit..."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                />

                <TouchableOpacity
                    style={[styles.bookBtn, loading && styles.bookBtnDisabled]}
                    onPress={handleBook}
                    disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <CalendarClock size={18} color="#fff" />
                            <Text style={styles.bookText}>Confirm Booking</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* In-App Success Confirmation Modal */}
            <Modal visible={bookedSuccess} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconCircle}>
                            <CheckCircle size={44} color="#059669" />
                        </View>
                        <Text style={styles.modalTitle}>Appointment Scheduled!</Text>
                        <Text style={styles.modalSubtitle}>
                            Your appointment has been successfully scheduled with{' '}
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                                {activeDoctorObj?.name ?? 'Dr. Shalini'}
                            </Text>.
                        </Text>

                        <View style={styles.modalDetailsBox}>
                            <View style={styles.detailRow}>
                                <Calendar size={16} color="#059669" />
                                <Text style={styles.detailText}>{date}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Clock size={16} color="#059669" />
                                <Text style={styles.detailText}>{time}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <CalendarClock size={16} color="#059669" />
                                <Text style={styles.detailText}>{visitType}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalDoneBtn}
                            onPress={() => {
                                setBookedSuccess(false);
                                router.replace('/(patient)/appointments');
                            }}>
                            <Text style={styles.modalDoneText}>View My Appointments</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
    backBtn: { padding: 4 },
    title: { fontFamily: 'Inter-Bold', fontSize: 22, color: '#0f172a' },
    label: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#334155', marginBottom: 8, marginTop: 16 },
    hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: '#64748b', marginBottom: 12 },
    doctorCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        borderWidth: 2, borderColor: '#e2e8f0',
    },
    doctorCardActive: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
    docAvatar: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#d1fae5',
        justifyContent: 'center', alignItems: 'center',
    },
    docName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#0f172a' },
    docWard: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: '#e2e8f0',
    },
    chipActive: { backgroundColor: '#d1fae5' },
    chipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748b' },
    chipTextActive: { color: '#059669' },
    input: {
        backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter-Regular', fontSize: 14,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    bookBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#059669', borderRadius: 14, height: 52, marginTop: 24,
    },
    bookBtnDisabled: { backgroundColor: '#94a3b8' },
    bookText: { fontFamily: 'Inter-Bold', fontSize: 15, color: '#fff' },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 26,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    modalDetailsBox: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        marginBottom: 22,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#334155',
    },
    modalDoneBtn: {
        width: '100%',
        backgroundColor: '#059669',
        borderRadius: 14,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalDoneText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#ffffff',
    },
});
