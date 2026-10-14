import { encryptField, decryptField } from '../db/fieldEncryption';
import { writeLocalFirst, readLocalCollection } from '../sync/SyncService';
import { getLocalById, listLocal, newLocalId, nowIso } from './base';
import type { Patient, RiskLevel } from '../../app/_constants/data';

export async function savePatientLocal(input: {
  id?: string;
  name: string;
  age: number;
  gender?: string;
  condition: string;
  status?: string;
  risk_level?: string;
  phone?: string;
  ward?: string;
  image_url?: string;
  assigned_asha_id?: string;
  assigned_doctor_id?: string;
  profile_id?: string;
  date_of_birth?: string;
  abha_id?: string;
  abha_verified?: boolean;
}): Promise<Patient> {
  const id = input.id ?? newLocalId();
  const row = await writeLocalFirst('patients', {
    id,
    name: input.name,
    age: input.age,
    gender: input.gender ?? 'Not Specified',
    condition: input.condition,
    status: input.status ?? 'Stable',
    risk_level: input.risk_level ?? 'Low',
    phone_enc: await encryptField(input.phone ?? null),
    ward: input.ward ?? null,
    image_url: input.image_url ?? null,
    assigned_asha_id: input.assigned_asha_id ?? null,
    assigned_doctor_id: input.assigned_doctor_id ?? null,
    profile_id: input.profile_id ?? null,
    date_of_birth: input.date_of_birth ?? null,
    abha_id_enc: await encryptField(input.abha_id ?? null),
    abha_verified: input.abha_verified ? 1 : 0,
    last_visit: nowIso(),
    follow_up_due: null,
    follow_up_urgent: 0,
    urgency_score: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  return mapPatientRow(row);
}

export async function updatePatientLocal(
  patientId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const existing = await getLocalById('patients', patientId);
  if (!existing) return;
  const next: Record<string, any> = { ...existing, ...updates, updated_at: nowIso() };
  if ('phone' in updates) {
    next.phone_enc = await encryptField(updates.phone as string);
    delete next.phone;
  }
  if ('abha_id' in updates) {
    next.abha_id_enc = await encryptField(updates.abha_id as string);
    delete next.abha_id;
  }
  if ('abha_verified' in updates) {
    next.abha_verified = updates.abha_verified ? 1 : 0;
  }
  await writeLocalFirst('patients', next);
}

export async function listPatientsLocal(): Promise<Patient[]> {
  const rows = await readLocalCollection('patients');
  const mapped = await Promise.all(rows.map(mapPatientRow));
  return mapped;
}

/** Local-first roster for ASHA/doctor assignment filters. */
export async function listPatientsForCaregiverLocal(
  userId: string,
  role: 'asha' | 'doctor'
): Promise<Patient[]> {
  const column = role === 'asha' ? 'assigned_asha_id' : 'assigned_doctor_id';
  const rows = await listLocal('patients', [{ column, value: userId }]);
  return Promise.all(rows.map(mapPatientRow));
}

export async function getPatientLocal(id: string): Promise<Patient | null> {
  const row = await getLocalById('patients', id);
  return row ? mapPatientRow(row) : null;
}

export async function getPatientAbhaLocal(
  profileId: string
): Promise<{ abhaId: string | null; verified: boolean }> {
  const rows = await listLocal('patients', [{ column: 'profile_id', value: profileId }]);
  const row = rows[0];
  if (!row) return { abhaId: null, verified: false };
  return {
    abhaId: await decryptField(row.abha_id_enc as string),
    verified: Boolean(row.abha_verified),
  };
}

export async function getPatientAbhaByPatientId(
  patientId: string
): Promise<{ abhaId: string | null; verified: boolean }> {
  const row = await getLocalById('patients', patientId);
  if (!row) return { abhaId: null, verified: false };
  return {
    abhaId: await decryptField(row.abha_id_enc as string),
    verified: Boolean(row.abha_verified),
  };
}

async function mapPatientRow(row: Record<string, unknown>): Promise<Patient> {
  const phone = (await decryptField(row.phone_enc as string)) ?? '';
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    age: Number(row.age ?? 0),
    condition: String(row.condition ?? ''),
    lastVisit: String(row.last_visit ?? ''),
    status: (row.status as Patient['status']) ?? 'Stable',
    riskLevel: (row.risk_level as RiskLevel) ?? 'Low',
    phone,
    image: String(row.image_url ?? ''),
    followUpDue: String(row.follow_up_due ?? ''),
    followUpUrgent: Boolean(row.follow_up_urgent),
    urgencyScore: row.urgency_score != null ? Number(row.urgency_score) : undefined,
    ward: row.ward as string | undefined,
  };
}
