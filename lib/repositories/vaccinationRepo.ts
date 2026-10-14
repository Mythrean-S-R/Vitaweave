import { writeLocalFirst } from '../sync/SyncService';
import { newLocalId, nowIso, listLocal } from './base';
import { generateUipSchedule } from '../immunization/uipCalendar';
import type { VaccinationRecord } from '../../app/_constants/data';

export async function scheduleUipForChild(input: {
  patientId: string;
  childName: string;
  dateOfBirth: string;
  assignedAshaId?: string;
}): Promise<VaccinationRecord[]> {
  const doses = generateUipSchedule(input.dateOfBirth);
  const created: VaccinationRecord[] = [];

  for (const dose of doses) {
    const id = newLocalId();
    await writeLocalFirst('vaccinations', {
      id,
      patient_id: input.patientId,
      assigned_asha_id: input.assignedAshaId ?? null,
      child_name: input.childName,
      age_label: dose.ageLabel,
      vaccine_name: dose.vaccineName,
      due_date: dose.dueDate,
      status: 'due',
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    created.push({
      id,
      patientId: input.patientId,
      childName: input.childName,
      ageLabel: dose.ageLabel,
      vaccineName: dose.vaccineName,
      dueDate: dose.dueDate,
      status: 'due',
    });
  }
  return created;
}

export async function listVaccinationsLocal(ashaId?: string): Promise<VaccinationRecord[]> {
  const rows = ashaId
    ? await listLocal('vaccinations', [{ column: 'assigned_asha_id', value: ashaId }])
    : await listLocal('vaccinations');
  return rows.map((r) => ({
    id: String(r.id),
    patientId: r.patient_id as string | undefined,
    childName: String(r.child_name ?? ''),
    ageLabel: String(r.age_label ?? ''),
    vaccineName: String(r.vaccine_name ?? ''),
    dueDate: String(r.due_date ?? ''),
    status: (r.status as 'due' | 'completed') ?? 'due',
    administeredAt: r.administered_at as string | undefined,
  }));
}

export async function markVaccinationLocal(
  id: string,
  administeredBy: string
): Promise<void> {
  const rows = await listLocal('vaccinations');
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  await writeLocalFirst('vaccinations', {
    ...row,
    status: 'completed',
    administered_at: nowIso(),
    administered_by: administeredBy,
    updated_at: nowIso(),
  });
}
