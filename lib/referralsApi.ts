import { supabase } from './supabase';
import { writeThroughQueue } from './syncEngine';
import type { ReferralRecord } from '../app/_constants/data';
import type { RiskLevel } from '../app/_constants/data';
import type { VitalReading } from './urgencyScoring';
import { withAudit } from './withAudit';

function mapReferral(row: Record<string, unknown>): ReferralRecord {
  const patients = row.patients as { name?: string } | null;
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: patients?.name,
    referredBy: String(row.referred_by),
    referredToType: row.referred_to_type as ReferralRecord['referredToType'],
    referredToName: row.referred_to_name as string | undefined,
    reason: String(row.reason),
    urgency: row.urgency as ReferralRecord['urgency'],
    status: row.status as ReferralRecord['status'],
    createdAt: String(row.created_at),
    acknowledgedAt: row.acknowledged_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    outcomeNotes: row.outcome_notes as string | undefined,
  };
}

export async function createReferral(input: {
  patientId: string;
  referredBy: string;
  referredToType: ReferralRecord['referredToType'];
  referredToName?: string;
  reason: string;
  urgency: ReferralRecord['urgency'];
}): Promise<{ data: ReferralRecord | null; error: unknown }> {
  const payload = {
    patient_id: input.patientId,
    referred_by: input.referredBy,
    referred_to_type: input.referredToType,
    referred_to_name: input.referredToName ?? null,
    reason: input.reason,
    urgency: input.urgency,
    status: 'pending',
  };

  return withAudit(
    {
      action: 'create',
      resourceType: 'referral',
      metadata: { referredToType: input.referredToType, urgency: input.urgency },
    },
    () =>
      writeThroughQueue({
        table: 'referrals',
        action: 'insert',
        payload,
        conflictKey: `referrals:pending_${Date.now()}`,
        online: async () => {
          const { data, error } = await supabase
            .from('referrals')
            .insert(payload)
            .select('*, patients:patient_id(name)')
            .single();
          return { data: data ? mapReferral(data) : null, error };
        },
      })
  );
}

export async function updateReferralStatus(
  referralId: string,
  status: ReferralRecord['status'],
  outcomeNotes?: string
): Promise<{ error: unknown }> {
  const updates: Record<string, unknown> = { status };
  if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
    if (!outcomeNotes?.trim()) {
      return { error: new Error('Outcome notes required to complete referral') };
    }
    updates.outcome_notes = outcomeNotes;
  }

  const result = await writeThroughQueue({
    table: 'referrals',
    action: 'update',
    recordId: referralId,
    payload: updates,
    conflictKey: `referrals:${referralId}`,
    online: async () => {
      const { error } = await supabase.from('referrals').update(updates).eq('id', referralId);
      return { data: null, error };
    },
  });
  return { error: result.error };
}

export async function getReferralsForDoctor(): Promise<ReferralRecord[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, patients:patient_id(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getReferralsForDoctor:', error);
    return [];
  }
  return (data ?? []).map((r) => mapReferral(r));
}

export async function getReferralsForPatient(patientId: string): Promise<ReferralRecord[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, patients:patient_id(name)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map((r) => mapReferral(r));
}

export async function getVitalsHistoryForPatient(patientId: string, limit = 3): Promise<VitalReading[]> {
  const { data: patient } = await supabase
    .from('patients')
    .select('profile_id')
    .eq('id', patientId)
    .maybeSingle();

  const readings: VitalReading[] = [];

  const { data: byPatient } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  const { data: byProfile } = patient?.profile_id
    ? await supabase
        .from('patient_vitals')
        .select('*')
        .eq('profile_id', patient.profile_id)
        .order('recorded_at', { ascending: false })
        .limit(limit)
    : { data: [] };

  const rows = [...(byPatient ?? []), ...(byProfile ?? [])].slice(0, limit);

  for (const row of rows) {
    readings.push({
      heartRate: row.heart_rate ?? undefined,
      bloodPressure: row.blood_pressure ?? undefined,
      bloodSugar: row.blood_sugar != null ? Number(row.blood_sugar) : undefined,
      temperature: row.temperature != null ? Number(row.temperature) : undefined,
      recordedAt: row.recorded_at,
    });
  }

  if (!readings.length) {
    const { data: records } = await supabase
      .from('medical_records')
      .select('vitals, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const rec of records ?? []) {
      const v = rec.vitals as Record<string, unknown> | null;
      if (!v) continue;
      readings.push({
        heartRate: v.heart_rate != null ? Number(v.heart_rate) : undefined,
        bloodPressure: v.blood_pressure as string | undefined,
        bloodSugar: v.blood_sugar != null ? Number(v.blood_sugar) : undefined,
        temperature: v.temperature != null ? Number(v.temperature) : undefined,
        recordedAt: rec.created_at,
      });
    }
  }

  return readings;
}

export async function addPatientVitals(input: {
  patientId: string;
  profileId?: string;
  recordedBy: string;
  vitals: VitalReading;
}): Promise<{ error: unknown }> {
  const payload = {
    patient_id: input.patientId,
    profile_id: input.profileId ?? null,
    heart_rate: input.vitals.heartRate ?? null,
    blood_pressure: input.vitals.bloodPressure ?? null,
    blood_sugar: input.vitals.bloodSugar ?? null,
    temperature: input.vitals.temperature ?? null,
    respiratory_rate: input.vitals.respiratoryRate ?? null,
    spo2: input.vitals.spo2 ?? null,
    recorded_by: input.recordedBy,
    recorded_at: new Date().toISOString(),
  };

  const result = await writeThroughQueue({
    table: 'patient_vitals',
    action: 'insert',
    payload,
    conflictKey: `patient_vitals:${input.patientId}:${Date.now()}`,
    online: async () => {
      const { error } = await supabase.from('patient_vitals').insert(payload);
      return { data: null, error };
    },
  });
  return { error: result.error };
}

export async function persistPatientUrgency(
  patientId: string,
  score: number,
  riskLevel: RiskLevel
): Promise<{ error: unknown }> {
  const payload = {
    urgency_score: score,
    urgency_score_updated_at: new Date().toISOString(),
    risk_level: riskLevel,
    updated_at: new Date().toISOString(),
  };

  const result = await writeThroughQueue({
    table: 'patients',
    action: 'update',
    recordId: patientId,
    payload,
    conflictKey: `patients:urgency:${patientId}`,
    online: async () => {
      const { error } = await supabase.from('patients').update(payload).eq('id', patientId);
      return { data: null, error };
    },
  });
  return { error: result.error };
}
