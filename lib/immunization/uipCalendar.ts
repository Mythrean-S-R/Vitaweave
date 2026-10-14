/**
 * India Universal Immunization Programme (UIP) schedule.
 * Ages in days from date of birth.
 */
export type UipDose = {
  vaccineName: string;
  ageLabel: string;
  dueDaysFromBirth: number;
};

export const UIP_SCHEDULE: UipDose[] = [
  { vaccineName: 'BCG', ageLabel: 'Birth', dueDaysFromBirth: 0 },
  { vaccineName: 'OPV-0', ageLabel: 'Birth', dueDaysFromBirth: 0 },
  { vaccineName: 'Hepatitis B-0', ageLabel: 'Birth', dueDaysFromBirth: 0 },
  { vaccineName: 'OPV-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  { vaccineName: 'Pentavalent-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  { vaccineName: 'Rotavirus-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  { vaccineName: 'PCV-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  { vaccineName: 'IPV-1', ageLabel: '6 Weeks', dueDaysFromBirth: 42 },
  { vaccineName: 'OPV-2', ageLabel: '10 Weeks', dueDaysFromBirth: 70 },
  { vaccineName: 'Pentavalent-2', ageLabel: '10 Weeks', dueDaysFromBirth: 70 },
  { vaccineName: 'Rotavirus-2', ageLabel: '10 Weeks', dueDaysFromBirth: 70 },
  { vaccineName: 'OPV-3', ageLabel: '14 Weeks', dueDaysFromBirth: 98 },
  { vaccineName: 'Pentavalent-3', ageLabel: '14 Weeks', dueDaysFromBirth: 98 },
  { vaccineName: 'Rotavirus-3', ageLabel: '14 Weeks', dueDaysFromBirth: 98 },
  { vaccineName: 'PCV-2', ageLabel: '14 Weeks', dueDaysFromBirth: 98 },
  { vaccineName: 'IPV-2', ageLabel: '14 Weeks', dueDaysFromBirth: 98 },
  { vaccineName: 'MR-1', ageLabel: '9 Months', dueDaysFromBirth: 274 },
  { vaccineName: 'JE-1', ageLabel: '9 Months', dueDaysFromBirth: 274 },
  { vaccineName: 'PCV-Booster', ageLabel: '9 Months', dueDaysFromBirth: 274 },
  { vaccineName: 'MR-2', ageLabel: '16-24 Months', dueDaysFromBirth: 548 },
  { vaccineName: 'JE-2', ageLabel: '16-24 Months', dueDaysFromBirth: 548 },
  { vaccineName: 'DPT-Booster-1', ageLabel: '16-24 Months', dueDaysFromBirth: 548 },
  { vaccineName: 'OPV-Booster', ageLabel: '16-24 Months', dueDaysFromBirth: 548 },
  { vaccineName: 'DPT-Booster-2', ageLabel: '5-6 Years', dueDaysFromBirth: 1825 },
  { vaccineName: 'Td', ageLabel: '10 Years', dueDaysFromBirth: 3650 },
  { vaccineName: 'Td', ageLabel: '16 Years', dueDaysFromBirth: 5840 },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type GeneratedVaccination = {
  vaccineName: string;
  ageLabel: string;
  dueDate: string;
  status: 'due' | 'completed';
};

export function generateUipSchedule(dateOfBirth: string, asOf = new Date()): GeneratedVaccination[] {
  const today = asOf.toISOString().slice(0, 10);
  return UIP_SCHEDULE.map((dose) => {
    const dueDate = addDays(dateOfBirth, dose.dueDaysFromBirth);
    return {
      vaccineName: dose.vaccineName,
      ageLabel: dose.ageLabel,
      dueDate,
      status: dueDate < today ? 'due' : 'due',
    };
  });
}

export function formatVaccinationReport(
  childName: string,
  records: { vaccineName: string; dueDate: string; status: string; administeredAt?: string }[]
): string {
  const lines = [
    'VitaWeave - Immunization Report (UIP)',
    `Child: ${childName}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '----------------------------------------',
    ...records.map(
      (r) =>
        `${r.status === 'completed' ? '[x]' : '[ ]'} ${r.vaccineName} | due ${r.dueDate}${
          r.administeredAt ? ` | given ${r.administeredAt.slice(0, 10)}` : ''
        }`
    ),
  ];
  return lines.join('\n');
}
