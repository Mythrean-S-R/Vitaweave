import type { Patient, PatientStatus, RiskLevel } from '../app/_constants/data';

function formatFollowUpDue(dueDate?: string | null, urgent?: boolean): string {
  if (!dueDate) return urgent ? 'Follow-up overdue' : 'No follow-up scheduled';
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return dueDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue: ${Math.abs(diffDays)} days`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

function formatLastVisit(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const DEFAULT_PATIENT_AVATAR =
  'https://images.unsplash.com/photo-1537368910025-700350f59c05?q=80&w=200&auto=format&fit=crop';

export function getPatientAvatarUri(image?: string | null): string {
  return image?.trim() ? image.trim() : DEFAULT_PATIENT_AVATAR;
}

export function mapDbPatient(row: Record<string, unknown>): Patient {
  const status = (row.status as PatientStatus) ?? 'Stable';
  const riskLevel = (row.risk_level as RiskLevel) ?? 'Low';

  return {
    id: String(row.id),
    name: String(row.name ?? 'Unknown'),
    age: Number(row.age ?? 0),
    condition: String(row.condition ?? 'General'),
    lastVisit: formatLastVisit(row.last_visit as string | null),
    status,
    riskLevel,
    phone: String(row.phone ?? ''),
    image: getPatientAvatarUri(row.image_url as string | null),
    followUpDue: formatFollowUpDue(row.follow_up_due as string | null, Boolean(row.follow_up_urgent)),
    followUpUrgent: Boolean(row.follow_up_urgent),
    urgencyScore: Number(row.urgency_score ?? 0),
    ward: row.ward as string | undefined,
  };
}

export function mapPatientToDbInsert(
  patient: Partial<Patient> & { name: string; age: number; condition: string },
  extras?: Record<string, unknown>
) {
  return {
    name: patient.name,
    age: patient.age,
    condition: patient.condition,
    status: patient.status ?? 'Stable',
    risk_level: patient.riskLevel ?? 'Low',
    phone: patient.phone ?? null,
    image_url: patient.image ?? null,
    follow_up_urgent: patient.followUpUrgent ?? false,
    ...extras,
  };
}
