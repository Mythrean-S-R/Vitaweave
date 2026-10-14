import { supabase } from './supabase';
import { writeThroughQueue } from './syncEngine';
import { isDoseTakenToday, markDoseTakenToday, clearStaleDoseLogs } from './medicationDoseLog';
import { expandReminderDoses, scheduleMedicationNotifications } from './medicationScheduler';
import type { MedicationReminder, MedicationReminderDose } from '../app/_constants/data';

async function resolvePatientId(profileId: string): Promise<string | null> {
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  return data?.id ?? null;
}

function mapReminder(row: Record<string, unknown>): MedicationReminder {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    medicationName: String(row.medication_name),
    dosage: row.dosage as string | undefined,
    scheduleTimes: (row.schedule_times as string[]) ?? [],
    startDate: String(row.start_date),
    endDate: row.end_date as string | undefined,
    active: row.active !== false,
  };
}

export async function getMedicationRemindersForPatient(patientId: string): Promise<MedicationReminder[]> {
  const { data, error } = await supabase
    .from('medication_reminders')
    .select('*')
    .eq('patient_id', patientId)
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('getMedicationRemindersForPatient:', error);
    return [];
  }
  return (data ?? []).map((r) => mapReminder(r));
}

export async function getMedicationDosesForProfile(profileId: string): Promise<MedicationReminderDose[]> {
  await clearStaleDoseLogs();

  const patientId = await resolvePatientId(profileId);
  if (!patientId) return [];

  const reminders = await getMedicationRemindersForPatient(patientId);
  if (!reminders.length) return [];

  const withTaken = await Promise.all(
    expandReminderDoses(reminders, () => false).map(async (dose) => ({
      ...dose,
      takenToday: await isDoseTakenToday(dose.reminderId, dose.timeKey),
    }))
  );

  await scheduleMedicationNotifications(withTaken);
  return withTaken;
}

export async function markMedicationDoseTaken(
  reminderId: string,
  timeKey: string
): Promise<{ error: unknown }> {
  try {
    await markDoseTakenToday(reminderId, timeKey);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function createMedicationReminder(input: {
  patientId: string;
  medicationName: string;
  dosage?: string;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string;
}): Promise<{ data: MedicationReminder | null; error: unknown }> {
  const payload = {
    patient_id: input.patientId,
    medication_name: input.medicationName,
    dosage: input.dosage ?? null,
    schedule_times: input.scheduleTimes,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    active: true,
  };

  return writeThroughQueue({
    table: 'medication_reminders',
    action: 'insert',
    payload,
    conflictKey: `medication_reminders:pending_${Date.now()}`,
    online: async () => {
      const { data, error } = await supabase.from('medication_reminders').insert(payload).select().single();
      return { data: data ? mapReminder(data) : null, error };
    },
  });
}
