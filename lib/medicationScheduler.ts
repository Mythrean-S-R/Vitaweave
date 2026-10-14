import { scheduleLocalNotification } from './notifications';
import type { MedicationReminderDose } from '../app/_constants/data';

function secondsUntilTime(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) return null;
  return Math.round((target.getTime() - now.getTime()) / 1000);
}

function formatTimeLabel(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const h = Number(match[1]);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

export function expandReminderDoses(
  reminders: {
    id: string;
    medicationName: string;
    dosage?: string;
    scheduleTimes: string[];
  }[],
  takenLookup: (reminderId: string, timeSlot: string) => boolean
): MedicationReminderDose[] {
  const doses: MedicationReminderDose[] = [];
  for (const r of reminders) {
    for (const time of r.scheduleTimes) {
      doses.push({
        reminderId: r.id,
        medicationName: r.medicationName,
        dosage: r.dosage,
        timeLabel: formatTimeLabel(time),
        timeKey: time,
        takenToday: takenLookup(r.id, time),
      });
    }
  }
  return doses.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}

export async function scheduleMedicationNotifications(doses: MedicationReminderDose[]): Promise<void> {
  for (const dose of doses) {
    if (dose.takenToday) continue;
    const seconds = secondsUntilTime(dose.timeKey);
    if (!seconds || seconds < 60) continue;

    await scheduleLocalNotification({
      title: 'Medication reminder',
      body: `Take ${dose.medicationName}${dose.dosage ? ` - ${dose.dosage}` : ''} at ${dose.timeLabel}`,
      data: { type: 'medication', reminderId: dose.reminderId, timeKey: dose.timeKey },
      secondsFromNow: seconds,
    });
  }
}
