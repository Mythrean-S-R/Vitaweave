import {
  getPatientsForCaregiver,
  getDoctorAppointments,
  getPatientAppointments,
  getCampaigns,
  getDashboardTasks,
  getWeeklyAlerts,
  getPatientVitals,
  getPatientMedications,
  getMedicalRecordsForPatient,
  getPatientIdForProfile,
  getVaccinations,
} from './api';

export type AshaProfileStats = {
  patientCount: number;
  pendingTasks: number;
  dueVaccinations: number;
  activeAlerts: number;
};

export type DoctorProfileStats = {
  totalAppointments: number;
  todayAppointments: number;
  patientCount: number;
  campaignCount: number;
};

export type PatientProfileStats = {
  upcomingAppointments: number;
  medicationCount: number;
  hasVitals: boolean;
  recordCount: number;
};

export async function getAshaProfileStats(userId: string): Promise<AshaProfileStats> {
  const [patients, tasks, alerts, vaccinations] = await Promise.all([
    getPatientsForCaregiver(userId, 'asha'),
    getDashboardTasks(),
    getWeeklyAlerts(),
    getVaccinations(userId),
  ]);

  return {
    patientCount: patients.length,
    pendingTasks: tasks.filter((t) => t.priority !== 'routine').length,
    dueVaccinations: vaccinations.filter((v) => v.status === 'due').length,
    activeAlerts: alerts.length,
  };
}

export async function getDoctorProfileStats(userId: string): Promise<DoctorProfileStats> {
  const [appointments, patients, campaigns] = await Promise.all([
    getDoctorAppointments(userId),
    getPatientsForCaregiver(userId, 'doctor'),
    getCampaigns(),
  ]);

  const today = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (a) => new Date(a.appointmentTime).toDateString() === today
  ).length;

  return {
    totalAppointments: appointments.length,
    todayAppointments,
    patientCount: patients.length,
    campaignCount: campaigns.length,
  };
}

export async function getPatientProfileStats(profileId: string): Promise<PatientProfileStats> {
  const [appointments, vitals, medications, patientId] = await Promise.all([
    getPatientAppointments(profileId),
    getPatientVitals(profileId),
    getPatientMedications(profileId),
    getPatientIdForProfile(profileId),
  ]);

  let recordCount = 0;
  if (patientId) {
    const records = await getMedicalRecordsForPatient(patientId);
    recordCount = records.length;
  }

  return {
    upcomingAppointments: appointments.filter((a) => a.status === 'Scheduled').length,
    medicationCount: medications.length,
    hasVitals: Boolean(vitals),
    recordCount,
  };
}
