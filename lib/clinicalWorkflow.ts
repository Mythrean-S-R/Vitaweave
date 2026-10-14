import { calculateUrgencyScore, prioritizePatients } from './logic';
import { addDashboardTask } from './api';
import { recalculateAndPersistUrgency } from './urgencyWorkflow';
import type { Patient } from '../app/_constants/data';
import { getStoredUserId } from './authGuard';
import { logger } from './logger';

/**
 * Re-score patients using NEWS2 + maternal rules, persist urgency_score + risk_level.
 */
export async function runPatientTriage(patients: Patient[]): Promise<Patient[]> {
  const scored = await Promise.all(
    patients.map((p) => recalculateAndPersistUrgency(p).catch(() => p))
  );

  return prioritizePatients(scored);
}

export async function queueFollowUpTaskAfterVisit(patient: Patient, reason: string): Promise<void> {
  const score = patient.urgencyScore ?? calculateUrgencyScore(patient).score;
  if (score < 50 && !patient.followUpUrgent) return;

  const ashaId = await getStoredUserId();
  await addDashboardTask({
    title: `Follow up: ${patient.name}`,
    subtitle: reason,
    priority: score >= 80 ? 'urgent' : score >= 50 ? 'today' : 'routine',
    icon: 'activity',
    assignedTo: ashaId ?? undefined,
  });
}
