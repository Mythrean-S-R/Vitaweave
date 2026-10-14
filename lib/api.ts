import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getCached, setCached } from './cache';
import { mapDbPatient } from './patientMapper';
import type { UserRole } from './roles';
import type {
    Patient,
    VaccinationRecord,
    CommunityAlert,
    PharmacyTrend,
    SymptomReport,
    WeeklyTrend,
    AIInsight,
    DashboardTask,
    WeeklyAlert,
    AppointmentRecord,
    CampaignRecord,
    PatientVital,
    PatientMedication,
    RiskLevel,
} from '../app/_constants/data';

import {
  syncQueue,
  queueTableUpdate,
  writeThroughQueue,
} from './syncEngine';
import { initializeLocalSync, flushSync, writeLocalFirst } from './sync/SyncService';
import { listPatientsLocal, savePatientLocal, updatePatientLocal, getPatientAbhaLocal, listPatientsForCaregiverLocal } from './repositories/patientRepo';
export { listPatientsLocal, savePatientLocal, updatePatientLocal, getPatientAbhaLocal, listPatientsForCaregiverLocal };
import { withAudit } from './withAudit';
import { listLocal, newLocalId, markSynced } from './repositories/base';
import { addPatientVitals } from './referralsApi';
export { getPendingSyncCount, subscribeSyncStatus } from './syncEngine';

const SYNC_SUBSCRIPTION_TABLES = [
    'patients',
    'community_alerts',
    'symptom_reports',
    'referrals',
    'medication_reminders',
    'vaccinations',
    'medical_records',
    'dashboard_tasks',
];

function generateQueueId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function newRecordId(): string {
    return newLocalId();
}

async function subscribeRealtimeTable(table: string) {
    try {
        const channel = supabase.channel(`realtime:${table}`);

        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            async (payload) => {
                const newRow = payload.new as { id?: string | number } | null;
                const oldRow = payload.old as { id?: string | number } | null;

                const currentCache = (await getCached<any[]>(table, 3600 * 1000)) || [];
                let updatedCache = currentCache;

                if (payload.eventType === 'DELETE' && oldRow) {
                    updatedCache = currentCache.filter((item) => item.id !== oldRow.id);
                } else if (newRow) {
                    updatedCache = currentCache.filter((item) => item.id !== newRow.id).concat(newRow);
                }

                await setCached(table, updatedCache);
            }
        );

        await channel.subscribe();
    } catch (error) {
        console.warn('Realtime subscription failed for table', table, error);
    }
}

export async function initializeSync() {
    try {
        await initializeLocalSync();
        await syncQueue();
        SYNC_SUBSCRIPTION_TABLES.forEach((table) => subscribeRealtimeTable(table));
    } catch (error) {
        console.warn('Failed to initialize sync engine:', error);
    }
}

export { queueTableUpdate } from './syncEngine';

export async function updatePatientRecord(patientId: string, updates: Partial<Patient>) {
    return queueTableUpdate('patients', patientId, updates);
}

export async function updatePatientVitals(patientId: string, vitals: Partial<Patient>) {
    return queueTableUpdate('patients', patientId, vitals);
}

export async function updatePatientRisk(patientId: string, riskLevel: RiskLevel) {
    await updatePatientLocal(patientId, { risk_level: riskLevel });
    return writeThroughQueue({
        table: 'patients',
        action: 'update',
        recordId: patientId,
        payload: { risk_level: riskLevel, updated_at: new Date().toISOString() },
        conflictKey: `patients:risk:${patientId}`,
        online: async () => {
            const { data, error } = await supabase
                .from('patients')
                .update({ risk_level: riskLevel, updated_at: new Date().toISOString() })
                .eq('id', patientId)
                .select()
                .maybeSingle();
            return { data, error };
        },
    });
}

/**
 * Generic fetcher with offline cache support
 */
async function fetchWithCache<T>(
    key: string,
    supabaseQuery: () => Promise<{ data: T[] | null; error: any }>,
    maxAge?: number
): Promise<T[]> {
    // 1. Try cache first for immediate UI update (optimistic)
    const cached = await getCached<T[]>(key, maxAge);

    // 2. Fetch fresh data from Supabase
    try {
        const { data, error } = await supabaseQuery();
        if (error) throw error;
        if (data) {
            // 3. Update cache
            await setCached(key, data);
            return data;
        }
    } catch (e) {
        console.warn(`Supabase fetch failed for ${key}, using cache:`, e);
    }

    // 4. Return cache if available, or empty array
    return cached || [];
}

// --- API Functions ---

export async function getPatients(): Promise<Patient[]> {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
            for (const row of data) {
                await savePatientLocal({
                    id: String(row.id),
                    name: row.name,
                    age: row.age,
                    gender: row.gender,
                    condition: row.condition,
                    status: row.status,
                    risk_level: row.risk_level,
                    phone: row.phone,
                    ward: row.ward,
                    image_url: row.image_url,
                    assigned_asha_id: row.assigned_asha_id,
                    assigned_doctor_id: row.assigned_doctor_id,
                    profile_id: row.profile_id,
                    abha_id: row.abha_id,
                    abha_verified: row.abha_verified,
                }).catch(() => undefined);
            }
            return data.map((row) => mapDbPatient(row));
        }
    } catch {
        // offline fallback
    }

    return listPatientsLocal();
}

export async function getPatientsForCaregiver(
    userId: string,
    role: UserRole
): Promise<Patient[]> {
    try {
        let query = supabase.from('patients').select('*').order('name', { ascending: true });

        if (role === 'asha') {
            query = query.or(`assigned_asha_id.eq.${userId},assigned_asha_id.is.null`);
        } else if (role === 'doctor') {
            query = query.or(`assigned_doctor_id.eq.${userId},assigned_doctor_id.is.null`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
            for (const row of data) {
                await savePatientLocal({
                    id: String(row.id),
                    name: row.name,
                    age: row.age,
                    gender: row.gender,
                    condition: row.condition,
                    status: row.status,
                    risk_level: row.risk_level,
                    phone: row.phone,
                    ward: row.ward,
                    image_url: row.image_url,
                    assigned_asha_id: row.assigned_asha_id,
                    assigned_doctor_id: row.assigned_doctor_id,
                    profile_id: row.profile_id,
                    abha_id: row.abha_id,
                    abha_verified: row.abha_verified,
                }).catch(() => undefined);
            }
            return data.map((row) => mapDbPatient(row));
        }
    } catch {
        // offline fallback
    }

    if (role === 'asha' || role === 'doctor') {
        const local = await listPatientsForCaregiverLocal(userId, role);
        if (local.length > 0) return local;
    }

    return listPatientsLocal();
}

export async function getCommunityAlerts(): Promise<CommunityAlert[]> {
    return fetchWithCache<CommunityAlert>('community_alerts', async () =>
        supabase
            .from('community_alerts')
            .select('*')
            .order('date', { ascending: false })
    );
}

export async function getPharmacyTrends(): Promise<PharmacyTrend[]> {
    return fetchWithCache<PharmacyTrend>('pharmacy_trends', async () => {
        const { data, error } = await supabase
            .from('pharmacy_trends')
            .select('*')
            .order('count', { ascending: false });
        
        if (data) {
            return {
                data: data.map(t => ({
                    ...t,
                    maxCount: t.max_count
                })),
                error
            };
        }
        return { data, error };
    });
}

export async function getSymptomReports(): Promise<SymptomReport[]> {
    return fetchWithCache<SymptomReport>('symptom_reports', async () =>
        supabase
            .from('symptom_reports')
            .select('*')
            .order('count', { ascending: false })
    );
}

export async function getWeeklyTrends(): Promise<WeeklyTrend[]> {
    return fetchWithCache<WeeklyTrend>('weekly_trends', async () => {
        const { data, error } = await supabase
            .from('weekly_trends')
            .select('*')
            .order('id', { ascending: true });
        
        if (data) {
            return {
                data: data.map(t => ({
                    ...t,
                    maxValue: t.max_value
                })),
                error
            };
        }
        return { data, error };
    });
}

export async function getAIInsights(): Promise<AIInsight[]> {
    return fetchWithCache<AIInsight>('ai_insights', async () =>
        supabase
            .from('ai_insights')
            .select('*')
            .order('created_at', { ascending: false })
    );
}

export async function getDashboardTasks(): Promise<DashboardTask[]> {
    return fetchWithCache<DashboardTask>('dashboard_tasks', async () =>
        supabase
            .from('dashboard_tasks')
            .select('*')
            .order('id', { ascending: true })
    );
}

export async function getWeeklyAlerts(): Promise<WeeklyAlert[]> {
    return fetchWithCache<WeeklyAlert>('weekly_alerts', async () =>
        supabase
            .from('weekly_alerts')
            .select('*')
            .order('created_at', { ascending: false })
    );
}

// --- Mutation Functions ---

export async function addPatient(payload: Record<string, unknown>) {
    const recordId = (payload.id as string) ?? newRecordId();
    const fullPayload = { ...payload, id: recordId };

    let local: Patient | null = null;
    try {
        local = await savePatientLocal({
            id: recordId,
            name: String(payload.name ?? 'Unknown'),
            age: Number(payload.age ?? 1),
            gender: payload.gender as string | undefined,
            condition: String(payload.condition ?? 'General'),
            status: payload.status as string | undefined,
            risk_level: payload.risk_level as string | undefined,
            phone: payload.phone as string | undefined,
            ward: payload.ward as string | undefined,
            image_url: (payload.image_url as string) ?? (payload.image as string),
            assigned_asha_id: payload.assigned_asha_id as string | undefined,
            assigned_doctor_id: payload.assigned_doctor_id as string | undefined,
            profile_id: payload.profile_id as string | undefined,
            date_of_birth: payload.date_of_birth as string | undefined,
        });
    } catch {
        // local save error
    }

    try {
        const { data: userData } = await supabase.auth.getUser();
        const ashaId = (payload.assigned_asha_id as string) || userData?.user?.id || null;

        const dbPayload = {
            id: recordId,
            name: String(payload.name ?? 'Unknown'),
            age: Number(payload.age ?? 1),
            gender: (payload.gender as string) || 'Not Specified',
            condition: String(payload.condition ?? 'General'),
            status: (payload.status as string) || 'Stable',
            risk_level: (payload.risk_level as string) || 'Low',
            phone: (payload.phone as string) || null,
            image_url: (payload.image_url as string) || (payload.image as string) || null,
            ward: (payload.ward as string) || null,
            assigned_asha_id: ashaId,
            assigned_doctor_id: (payload.assigned_doctor_id as string) || null,
            profile_id: (payload.profile_id as string) || null,
        };

        const { data: remoteData, error: remoteError } = await supabase
            .from('patients')
            .insert([dbPayload])
            .select()
            .maybeSingle();

        if (!remoteError && remoteData) {
            await markSynced('patients', recordId).catch(() => undefined);
            return { data: mapDbPatient(remoteData), error: null };
        }
    } catch {
        // offline
    }

    void flushSync();
    return { data: local, error: null };
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
    return writeThroughQueue({
        table: 'profiles',
        action: 'update',
        recordId: userId,
        payload: updates,
        conflictKey: `profiles:${userId}`,
        online: async () => {
            const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle();
            return { data, error };
        },
    });
}

export async function addDashboardTask(task: Omit<DashboardTask, 'id'>) {
    const payload: Record<string, unknown> = {
        title: task.title,
        subtitle: task.subtitle,
        priority: task.priority,
        icon: task.icon,
    };
    if (task.assignedTo) payload.assigned_to = task.assignedTo;

    const conflictKey = `dashboard_tasks:pending_${generateQueueId()}`;
    return writeThroughQueue({
        table: 'dashboard_tasks',
        action: 'insert',
        payload,
        conflictKey,
        online: async () => {
            const { data, error } = await supabase.from('dashboard_tasks').insert([payload]).select().single();
            return { data, error };
        },
    });
}

export async function addWeeklyAlert(alert: Omit<WeeklyAlert, 'id'>) {
    const conflictKey = `weekly_alerts:pending_${generateQueueId()}`;
    return writeThroughQueue({
        table: 'weekly_alerts',
        action: 'insert',
        payload: alert as Record<string, unknown>,
        conflictKey,
        online: async () => {
            const { data, error } = await supabase.from('weekly_alerts').insert([alert]).select().single();
            return { data, error };
        },
    });
}

// --- Appointments ---

function mapAppointment(row: any): AppointmentRecord {
    const risk = row.patients?.risk_level;
    const score =
        row.patients?.urgency_score != null
            ? Number(row.patients.urgency_score)
            : risk === 'High' ? 80 : risk === 'Medium' ? 50 : 20;

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        appointmentTime: row.appointment_time,
        status: row.status,
        duration: row.duration ?? 30,
        patientName: row.patients?.name,
        doctorName: row.profiles?.name,
        patientRiskLevel: risk,
        patientUrgencyScore: score,
    };
}

export async function getDoctorAppointments(doctorId: string): Promise<AppointmentRecord[]> {
    return fetchWithCache<AppointmentRecord>(`appointments_doctor_${doctorId}`, async () => {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patients:patient_id (name, risk_level),
                profiles:doctor_id (name)
            `)
            .eq('doctor_id', doctorId)
            .order('appointment_time', { ascending: true });

        return {
            data: (data ?? []).map(mapAppointment),
            error,
        };
    });
}

export async function getPatientAppointments(profileId: string): Promise<AppointmentRecord[]> {
    const { data: patientRow } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

    if (!patientRow?.id) return [];

    return fetchWithCache<AppointmentRecord>(`appointments_patient_${profileId}`, async () => {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patients:patient_id (name, risk_level),
                profiles:doctor_id (name)
            `)
            .eq('patient_id', patientRow.id)
            .order('appointment_time', { ascending: true });

        return {
            data: (data ?? []).map(mapAppointment),
            error,
        };
    });
}

// --- Patient health data ---

export async function getPatientVitals(profileId: string): Promise<PatientVital | null> {
    const { data, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('profile_id', profileId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    return {
        heartRate: data.heart_rate ?? undefined,
        bloodPressure: data.blood_pressure ?? undefined,
        bloodSugar: data.blood_sugar ?? undefined,
        temperature: data.temperature ? Number(data.temperature) : undefined,
        recordedAt: data.recorded_at,
    };
}

export async function getPatientMedications(profileId: string): Promise<PatientMedication[]> {
    return fetchWithCache<PatientMedication>(`medications_${profileId}`, async () => {
        const { data, error } = await supabase
            .from('patient_medications')
            .select('*')
            .eq('profile_id', profileId)
            .eq('active', true)
            .order('created_at', { ascending: true });

        return {
            data: (data ?? []).map((med) => ({
                id: med.id,
                name: med.name,
                schedule: med.schedule ?? '',
                takenToday: med.taken_today ?? false,
            })),
            error,
        };
    });
}

export async function getPatientDisplayName(profileId: string): Promise<string> {
    const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', profileId)
        .maybeSingle();

    return data?.name ?? 'Patient';
}

// --- Campaigns ---

export async function getCampaigns(): Promise<CampaignRecord[]> {
    const localRows = await listLocal('campaigns');
    if (localRows.length > 0) {
        void flushSync();
        return localRows.map((camp) => ({
            id: camp.id,
            title: String(camp.title ?? ''),
            description: camp.description as string | undefined,
            location: (camp.ward as string) ?? undefined,
            date: (camp.start_date as string) ?? (camp.campaign_date as string) ?? undefined,
            campaignDate: (camp.start_date as string) ?? (camp.campaign_date as string) ?? undefined,
            status: String(camp.status ?? 'Planning'),
            targetAudience: camp.target_audience as string | undefined,
            participantsCount: Number(camp.participants_count ?? 0),
            targetCount: Number(camp.target_count ?? 0),
            progress: camp.target_count
                ? Math.round((Number(camp.participants_count ?? 0) / Number(camp.target_count)) * 100)
                : 0,
        }));
    }

    return fetchWithCache<CampaignRecord>('campaigns', async () => {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .order('campaign_date', { ascending: true });

        return {
            data: (data ?? []).map((camp) => ({
                id: camp.id,
                title: camp.title,
                description: camp.description,
                location: camp.location ?? camp.ward,
                date: camp.campaign_date,
                campaignDate: camp.campaign_date,
                status: camp.status,
                targetAudience: camp.target_audience,
                participantsCount: camp.participants_count ?? 0,
                targetCount: camp.target_count ?? 0,
                progress: camp.target_count
                    ? Math.round(((camp.participants_count ?? 0) / camp.target_count) * 100)
                    : 0,
            })),
            error,
        };
    });
}

/** Health tips derived from Active community campaigns (falls back to empty). */
export async function getActiveCampaignTips(limit = 5): Promise<string[]> {
    const campaigns = await getCampaigns();
    return campaigns
        .filter((c) => String(c.status).toLowerCase() === 'active')
        .map((c) => {
            const body = (c.description || '').trim();
            return body ? `${c.title}: ${body}` : c.title;
        })
        .filter(Boolean)
        .slice(0, limit);
}

// --- Doctors & appointment booking ---

export type DoctorProfile = {
    id: string;
    name: string;
    ward?: string;
};

export async function getDoctors(): Promise<DoctorProfile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, ward')
        .eq('role', 'doctor')
        .order('name', { ascending: true });

    if (error) {
        console.warn('Failed to load doctors:', error);
        return [];
    }
    return data ?? [];
}

export async function getPatientIdForProfile(profileId: string): Promise<string | null> {
    const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();
    return data?.id ?? null;
}

export async function getPatientAbhaForProfile(
    profileId: string
): Promise<{ abhaId: string | null; verified: boolean }> {
    const local = await getPatientAbhaLocal(profileId);
    if (local.abhaId) return local;

    const { data } = await supabase
        .from('patients')
        .select('abha_id, abha_verified')
        .eq('profile_id', profileId)
        .maybeSingle();
    return {
        abhaId: data?.abha_id ?? null,
        verified: Boolean(data?.abha_verified),
    };
}

export async function bookAppointment(params: {
    patientProfileId: string;
    doctorId: string;
    title: string;
    description?: string;
    appointmentTime: string;
}): Promise<{ data: unknown; error: unknown }> {
    let patientId = await getPatientIdForProfile(params.patientProfileId);

    if (!patientId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', params.patientProfileId)
            .maybeSingle();

        const newPatientId = newRecordId();
        const patientPayload = {
            id: newPatientId,
            name: profile?.name ?? 'Patient',
            age: 1,
            gender: 'Not Specified',
            condition: 'General',
            status: 'Stable',
            risk_level: 'Low',
            profile_id: params.patientProfileId,
            assigned_doctor_id: params.doctorId,
        };

        const patientResult = await writeThroughQueue({
            table: 'patients',
            action: 'insert',
            payload: patientPayload,
            conflictKey: `patients:${newPatientId}`,
            online: async () => {
                const { data, error } = await supabase.from('patients').insert(patientPayload).select('id').single();
                return { data, error };
            },
        });

        patientId =
            (patientResult.data as { id?: string } | null)?.id ?? newPatientId;
    }

    const apptId = newRecordId();
    const apptPayload = {
        id: apptId,
        patient_id: patientId,
        doctor_id: params.doctorId,
        title: params.title,
        description: params.description ?? null,
        appointment_time: params.appointmentTime,
        status: 'Scheduled',
        duration: 30,
    };

    let remoteData: unknown = null;
    try {
        const { data, error } = await supabase.from('appointments').insert([apptPayload]).select().maybeSingle();
        if (!error && data) {
            remoteData = data;
        }
    } catch {
        // offline
    }

    await writeLocalFirst('appointments', apptPayload).catch(() => undefined);
    return { data: remoteData || apptPayload, error: null };
}

export async function updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentRecord['status']
) {
    return writeThroughQueue({
        table: 'appointments',
        action: 'update',
        recordId: appointmentId,
        payload: { status },
        conflictKey: `appointments:${appointmentId}`,
        online: async () => {
            const { data, error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', appointmentId)
                .select()
                .single();
            return { data, error };
        },
    });
}

// --- Medical records ---

export type MedicalRecord = {
    id: string;
    patientId: string;
    doctorId: string;
    diagnosis: string;
    prescription?: string;
    notes?: string;
    vitals?: Record<string, unknown>;
    createdAt: string;
    patientName?: string;
};

export async function getMedicalRecordsForPatient(patientId: string): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
        .from('medical_records')
        .select(`*, patients:patient_id (name)`)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Failed to load medical records:', error);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        diagnosis: row.diagnosis,
        prescription: row.prescription,
        notes: row.notes,
        vitals: row.vitals,
        createdAt: row.created_at,
        patientName: row.patients?.name,
    }));
}

export async function getMedicalRecordsForDoctor(doctorId: string): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
        .from('medical_records')
        .select(`*, patients:patient_id (name)`)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.warn('Failed to load medical records:', error);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        diagnosis: row.diagnosis,
        prescription: row.prescription,
        notes: row.notes,
        vitals: row.vitals,
        createdAt: row.created_at,
        patientName: row.patients?.name,
    }));
}

export async function addMedicalRecord(record: {
    patientId: string;
    doctorId: string;
    diagnosis: string;
    prescription?: string;
    notes?: string;
    vitals?: Record<string, unknown>;
    erxJson?: string | null;
}) {
    const attachments = record.erxJson
        ? [{ type: 'abdm_erx', format: 'json', data: record.erxJson, created_at: new Date().toISOString() }]
        : [];

    const remotePayload = {
        patient_id: record.patientId,
        doctor_id: record.doctorId,
        diagnosis: record.diagnosis,
        prescription: record.prescription,
        notes: record.notes,
        vitals: record.vitals ?? {},
        attachments,
    };

    const result = await withAudit(
        {
            action: 'create',
            resourceType: 'medical_record',
            metadata: { patientId: record.patientId, hasErx: Boolean(record.erxJson) },
        },
        () =>
            writeThroughQueue({
                table: 'medical_records',
                action: 'insert',
                payload: {
                    ...remotePayload,
                    attachments_json: JSON.stringify(attachments),
                    erx_json: record.erxJson ?? null,
                    vitals_json: JSON.stringify(record.vitals ?? {}),
                },
                conflictKey: `medical_records:pending_${generateQueueId()}`,
                online: async () => {
                    const { data, error } = await supabase
                        .from('medical_records')
                        .insert(remotePayload)
                        .select()
                        .single();
                    return { data, error };
                },
            })
    );

    if (record.vitals && Object.keys(record.vitals).length > 0) {
        await addPatientVitals({
            patientId: record.patientId,
            recordedBy: record.doctorId,
            vitals: {
                heartRate: record.vitals.heart_rate != null ? Number(record.vitals.heart_rate) : undefined,
                bloodPressure: record.vitals.blood_pressure as string | undefined,
                bloodSugar: record.vitals.blood_sugar != null ? Number(record.vitals.blood_sugar) : undefined,
                temperature: record.vitals.temperature != null ? Number(record.vitals.temperature) : undefined,
                respiratoryRate:
                    record.vitals.respiratory_rate != null ? Number(record.vitals.respiratory_rate) : undefined,
                spo2: record.vitals.spo2 != null ? Number(record.vitals.spo2) : undefined,
            },
        });
    }

    return result;
}

export async function createCampaign(campaign: {
    title: string;
    description?: string;
    location?: string;
    campaignDate?: string;
    targetAudience?: string;
    targetCount?: number;
    createdBy: string;
    ward?: string;
}) {
    const payload = {
        title: campaign.title,
        description: campaign.description,
        location: campaign.location,
        campaign_date: campaign.campaignDate,
        target_audience: campaign.targetAudience,
        target_count: campaign.targetCount ?? 0,
        created_by: campaign.createdBy,
        ward: campaign.ward,
        status: 'Planned',
    };

    return writeThroughQueue({
        table: 'campaigns',
        action: 'insert',
        payload,
        conflictKey: `campaigns:pending_${generateQueueId()}`,
        online: async () => {
            const { data, error } = await supabase.from('campaigns').insert(payload).select().single();
            return { data, error };
        },
    });
}

// --- Vaccinations (Phase 4) ---

function mapVaccination(row: Record<string, unknown>): VaccinationRecord {
    const dueDate = row.due_date as string;
    const due = dueDate ? new Date(dueDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dueLabel = dueDate ?? 'TBD';
    if (due && !Number.isNaN(due.getTime())) {
        const dueDay = new Date(due);
        dueDay.setHours(0, 0, 0, 0);
        const diff = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) dueLabel = `Overdue (${Math.abs(diff)} Days)`;
        else if (diff === 0) dueLabel = 'Today';
        else if (diff === 1) dueLabel = 'Tomorrow';
        else dueLabel = due.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return {
        id: String(row.id),
        patientId: row.patient_id ? String(row.patient_id) : undefined,
        childName: String(row.child_name ?? 'Child'),
        ageLabel: String(row.age_label ?? ''),
        vaccineName: String(row.vaccine_name ?? ''),
        dueDate: dueLabel,
        status: (row.status as 'due' | 'completed') ?? 'due',
        administeredAt: row.administered_at as string | undefined,
    };
}

export async function getVaccinations(caregiverId?: string): Promise<VaccinationRecord[]> {
    const cacheKey = caregiverId ? `vaccinations_${caregiverId}` : 'vaccinations_all';

    return fetchWithCache<VaccinationRecord>(cacheKey, async () => {
        let query = supabase
            .from('vaccinations')
            .select('*')
            .order('due_date', { ascending: true });

        if (caregiverId) {
            query = query.eq('assigned_asha_id', caregiverId);
        }

        const { data, error } = await query;
        return {
            data: (data ?? []).map((row) => mapVaccination(row)),
            error,
        };
    });
}

export async function markVaccinationComplete(
    vaccinationId: string,
    administeredBy: string
): Promise<{ error: unknown }> {
    const payload = {
        status: 'completed',
        administered_at: new Date().toISOString(),
        administered_by: administeredBy,
    };

    const result = await writeThroughQueue({
        table: 'vaccinations',
        action: 'update',
        recordId: vaccinationId,
        payload,
        conflictKey: `vaccinations:${vaccinationId}`,
        online: async () => {
            const { data, error } = await supabase
                .from('vaccinations')
                .update(payload)
                .eq('id', vaccinationId)
                .select()
                .maybeSingle();
            return { data, error };
        },
    });
    return { error: result.error };
}

export async function addVaccination(record: {
    childName: string;
    ageLabel: string;
    vaccineName: string;
    dueDate: string;
    patientId?: string;
    assignedAshaId?: string;
    ward?: string;
}) {
    const payload = {
        child_name: record.childName,
        age_label: record.ageLabel,
        vaccine_name: record.vaccineName,
        due_date: record.dueDate,
        patient_id: record.patientId ?? null,
        assigned_asha_id: record.assignedAshaId ?? null,
        ward: record.ward ?? null,
        status: 'due',
    };

    return writeThroughQueue({
        table: 'vaccinations',
        action: 'insert',
        payload,
        conflictKey: `vaccinations:pending_${generateQueueId()}`,
        online: async () => {
            const { data, error } = await supabase.from('vaccinations').insert(payload).select().single();
            return { data, error };
        },
    });
}

export {
  createReferral,
  updateReferralStatus,
  getReferralsForDoctor,
  getReferralsForPatient,
  getVitalsHistoryForPatient,
  addPatientVitals,
  persistPatientUrgency,
} from './referralsApi';

export {
  getMedicationRemindersForPatient,
  getMedicationDosesForProfile,
  markMedicationDoseTaken,
  createMedicationReminder,
} from './medicationRemindersApi';

export async function logVideoCallSession(params: {
    appointmentId?: string;
    channelName: string;
    hostId: string;
    participantId?: string;
    status?: 'Scheduled' | 'Active' | 'Completed' | 'Failed';
}) {
    const payload = {
        appointment_id: params.appointmentId ?? null,
        channel_name: params.channelName,
        host_id: params.hostId,
        participant_id: params.participantId ?? null,
        status: params.status ?? 'Active',
        start_time: new Date().toISOString(),
    };

    return writeThroughQueue({
        table: 'video_calls',
        action: 'insert',
        payload,
        conflictKey: `video_calls:pending_${generateQueueId()}`,
        online: async () => {
            const { data, error } = await supabase.from('video_calls').insert(payload).select().single();
            return { data, error };
        },
    });
}
