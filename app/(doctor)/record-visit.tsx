import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { addMedicalRecord } from '../../lib/api';
import { getStoredUserId } from '../../lib/authGuard';
import { queueFollowUpTaskAfterVisit } from '../../lib/clinicalWorkflow';
import { PatientPicker } from '../../components/PatientPicker';
import { VoiceDictationButton } from '../../components/VoiceDictationButton';
import { VitalsCaptureForm } from '../../components/VitalsCaptureForm';
import { useCareTeamPatients } from '../../hooks/useCareTeamPatients';
import type { Patient } from '../_constants/data';
import type { VitalReading } from '../../lib/urgencyScoring';
import { buildAbdmPrescription, type MedicationLine } from '../../lib/abdm/erxBuilder';
import { getAbdmClient } from '../../lib/abdm/client';
import { getPatientAbhaByPatientId } from '../../lib/repositories/patientRepo';

export default function RecordVisitScreen() {
    const router = useRouter();
    const { patients, loading: loadingPatients } = useCareTeamPatients('doctor');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [prescription, setPrescription] = useState('');
    const [notes, setNotes] = useState('');
    const [vitals, setVitals] = useState<VitalReading>({});
    const [loading, setLoading] = useState(false);
    const [erxJson, setErxJson] = useState<string | null>(null);

    const handleSave = async () => {
        if (!selectedPatient || !diagnosis) {
            Alert.alert('Missing Fields', 'Select a patient and enter a diagnosis.');
            return;
        }

        const doctorId = await getStoredUserId();
        if (!doctorId) {
            Alert.alert('Not signed in', 'Please log in as a doctor.');
            return;
        }

        setLoading(true);
        const vitalsPayload: Record<string, unknown> = {};
        if (vitals.bloodPressure) vitalsPayload.blood_pressure = vitals.bloodPressure;
        if (vitals.heartRate != null) vitalsPayload.heart_rate = vitals.heartRate;
        if (vitals.respiratoryRate != null) vitalsPayload.respiratory_rate = vitals.respiratoryRate;
        if (vitals.spo2 != null) vitalsPayload.spo2 = vitals.spo2;
        if (vitals.temperature != null) vitalsPayload.temperature = vitals.temperature;
        if (vitals.bloodSugar != null) vitalsPayload.blood_sugar = vitals.bloodSugar;

        const { error } = await addMedicalRecord({
            patientId: selectedPatient.id,
            doctorId,
            diagnosis,
            prescription: prescription || undefined,
            notes: notes || undefined,
            vitals: vitalsPayload,
            erxJson,
        });

        setLoading(false);

        if (error) {
            Alert.alert('Save Failed', error instanceof Error ? error.message : 'Could not save medical record.');
            return;
        }

        await queueFollowUpTaskAfterVisit(
            selectedPatient,
            `Post-visit follow-up after diagnosis: ${diagnosis}`
        );

        Alert.alert('Saved', 'Medical record added and follow-up queued if needed.', [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    const handleGenerateErx = async () => {
        if (!selectedPatient || !prescription.trim()) {
            Alert.alert('Prescription required', 'Enter prescription text or medication lines first.');
            return;
        }
        const doctorId = await getStoredUserId();
        const abha = await getPatientAbhaByPatientId(selectedPatient.id);
        const lines: MedicationLine[] = prescription
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
                const parts = line.split(',').map((p) => p.trim());
                return {
                    name: parts[0] || line,
                    dose: parts[1],
                    frequency: parts[2],
                    duration: parts[3],
                };
            });

        const bundle = buildAbdmPrescription({
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            patientAbha: abha.abhaId,
            doctorId: doctorId ?? 'unknown',
            diagnosis,
            medications: lines,
            notes,
        });

        const client = getAbdmClient();
        const result = await client.createPrescription(bundle);
        setErxJson(JSON.stringify(result.bundle ?? bundle, null, 2));
        Alert.alert('eRx generated', `Status: ${result.status}. Preview ready to share.`);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={22} color="#0891b2" />
                </TouchableOpacity>
                <Text style={styles.title}>Record Visit</Text>
            </View>

            <PatientPicker
                patients={patients}
                loading={loadingPatients}
                selectedId={selectedPatient?.id}
                onSelect={setSelectedPatient}
                label="Patient"
                placeholder="Search and select patient"
            />

            {selectedPatient && (
                <TouchableOpacity
                    style={styles.referBtn}
                    onPress={() =>
                        router.push({
                            pathname: '/(doctor)/refer-patient',
                            params: { patientId: selectedPatient.id, patientName: selectedPatient.name },
                        } as any)
                    }
                >
                    <Text style={styles.referBtnText}>Refer {selectedPatient.name}</Text>
                </TouchableOpacity>
            )}

            <View style={styles.labelRow}>
                <Text style={styles.label}>Diagnosis *</Text>
                <VoiceDictationButton onTranscript={(t) => setDiagnosis((d) => (d ? `${d} ${t}` : t))} />
            </View>
            <TextInput style={styles.input} value={diagnosis} onChangeText={setDiagnosis} />

            <View style={styles.labelRow}>
                <Text style={styles.label}>Prescription</Text>
                <VoiceDictationButton onTranscript={(t) => setPrescription((p) => (p ? `${p}\n${t}` : t))} />
            </View>
            <TextInput
                style={[styles.input, styles.multiline]}
                value={prescription}
                onChangeText={setPrescription}
                multiline
                placeholder="Medicine, dose, frequency, duration (one per line)"
            />

            <View style={styles.labelRow}>
                <Text style={styles.label}>Clinical Notes</Text>
                <VoiceDictationButton onTranscript={(t) => setNotes((n) => (n ? `${n} ${t}` : t))} />
            </View>
            <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline />

            <VitalsCaptureForm initial={vitals} onChange={setVitals} />

            <TouchableOpacity style={styles.erxBtn} onPress={handleGenerateErx}>
                <Text style={styles.erxBtnText}>Generate ABDM e-Prescription</Text>
            </TouchableOpacity>
            {erxJson ? (
                <TouchableOpacity
                    style={styles.shareErx}
                    onPress={() => Share.share({ message: erxJson, title: 'ABDM eRx' })}>
                    <Text style={styles.shareErxText}>Share / Export eRx JSON</Text>
                </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveText}>Save Visit</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, paddingBottom: 48 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 40 },
    backBtn: { padding: 4 },
    title: { fontFamily: 'Inter-Bold', fontSize: 20, color: '#0f172a' },
    label: { fontFamily: 'Inter-Medium', fontSize: 13, color: '#64748b', marginTop: 12, marginBottom: 6 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        fontFamily: 'Inter-Regular',
        fontSize: 14,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    referBtn: {
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#ecfeff',
        alignItems: 'center',
    },
    referBtnText: { fontFamily: 'Inter-SemiBold', color: '#0891b2' },
    erxBtn: {
        marginTop: 16,
        backgroundColor: '#0f766e',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    erxBtnText: { fontFamily: 'Inter-SemiBold', color: '#fff' },
    shareErx: { marginTop: 8, padding: 10, alignItems: 'center' },
    shareErxText: { fontFamily: 'Inter-Medium', color: '#0f766e', fontSize: 13 },
    saveBtn: {
        marginTop: 16,
        backgroundColor: '#0891b2',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
    saveText: { fontFamily: 'Inter-SemiBold', color: '#fff', fontSize: 15 },
});
