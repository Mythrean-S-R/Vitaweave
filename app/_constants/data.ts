import type { RiskLevel } from './theme';
export type { RiskLevel };

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientStatus = 'Active' | 'Critical' | 'Stable';

export type Patient = {
    id: string;
    name: string;
    age: number;
    condition: string;
    lastVisit: string;
    status: PatientStatus;
    riskLevel: RiskLevel;
    phone: string;
    image: string;
    followUpDue: string;   // e.g. "Overdue: 8 days" | "Due in 3 days"
    followUpUrgent: boolean;
    urgencyScore?: number;
    ward?: string;
};

export type CommunityAlert = {
    id: number;
    severity: RiskLevel | 'Critical';
    title: string;
    description: string;
    date: string;
    icon: string;
};

export type PharmacyTrend = {
    id: number;
    medicine: string;
    count: number;
    maxCount: number;
    trend: 'up' | 'down' | 'stable';
};

export type SymptomReport = {
    id: number;
    symptom: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    ward: string;
};

export type WeeklyTrend = {
    label: string;
    value: number;
    maxValue: number;
};

export type AIInsight = {
    id: number;
    icon: string;
    title: string;
    description: string;
    severity: RiskLevel | 'info';
    action: string;
};

export type TaskPriority = 'urgent' | 'today' | 'routine';

export type DashboardTask = {
    id: number;
    title: string;
    subtitle: string;
    priority: TaskPriority;
    icon: string;
    assignedTo?: string;
};

export type VaccinationRecord = {
    id: string;
    patientId?: string;
    childName: string;
    ageLabel: string;
    vaccineName: string;
    dueDate: string;
    status: 'due' | 'completed';
    administeredAt?: string;
};

export type WeeklyAlert = {
    id: number;
    title: string;
    description: string;
    time: string;
    severity: RiskLevel;
};

export type AppointmentRecord = {
    id: string;
    title: string;
    description?: string;
    appointmentTime: string;
    status: 'Scheduled' | 'Active' | 'Completed' | 'Cancelled' | 'No-Show';
    duration: number;
    patientName?: string;
    doctorName?: string;
    patientRiskLevel?: string;
    patientUrgencyScore?: number;
};

export type ReferralRecord = {
    id: string;
    patientId: string;
    patientName?: string;
    referredBy: string;
    referredToType:
      | 'asha_escalate'
      | 'phc'
      | 'chc'
      | 'district_hospital'
      | 'hospital'
      | 'telemedicine'
      | 'specialist';
    referredToName?: string;
    reason: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'declined';
    createdAt: string;
    acknowledgedAt?: string;
    completedAt?: string;
    outcomeNotes?: string;
};

export type CampaignRecord = {
    id: string | number;
    title: string;
    description?: string;
    location?: string;
    date?: string;
    campaignDate?: string;
    status: string;
    targetAudience?: string;
    participantsCount?: number;
    targetCount?: number;
    progress?: number;
};

export type PatientVital = {
    heartRate?: number;
    bloodPressure?: string;
    bloodSugar?: number;
    temperature?: number;
    recordedAt?: string;
};

export type PatientMedication = {
    id: number;
    name: string;
    schedule: string;
    takenToday: boolean;
};

export type MedicationReminder = {
    id: string;
    patientId: string;
    medicationName: string;
    dosage?: string;
    scheduleTimes: string[];
    startDate: string;
    endDate?: string;
    active: boolean;
};

export type MedicationReminderDose = {
    reminderId: string;
    medicationName: string;
    dosage?: string;
    timeLabel: string;
    timeKey: string;
    takenToday: boolean;
};

// ─── Patients ─────────────────────────────────────────────────────────────────

export const ALL_PATIENTS: Patient[] = [
    {
        id: '1',
        name: 'Priya Sharma',
        age: 28,
        condition: 'Prenatal Care',
        lastVisit: '15 Feb 2026',
        status: 'Active',
        riskLevel: 'Medium',
        phone: '+91 98765 43210',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Due in 3 days',
        followUpUrgent: false,
    },
    {
        id: '2',
        name: 'Rajesh Kumar',
        age: 45,
        condition: 'Diabetes Management',
        lastVisit: '10 Feb 2026',
        status: 'Stable',
        riskLevel: 'Medium',
        phone: '+91 87654 32109',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Overdue: 8 days',
        followUpUrgent: true,
    },
    {
        id: '3',
        name: 'Meera Patel',
        age: 32,
        condition: 'Postnatal Care',
        lastVisit: '18 Feb 2026',
        status: 'Active',
        riskLevel: 'Low',
        phone: '+91 76543 21098',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Due in 7 days',
        followUpUrgent: false,
    },
    {
        id: '4',
        name: 'Sunita Verma',
        age: 55,
        condition: 'Hypertension',
        lastVisit: '12 Feb 2026',
        status: 'Critical',
        riskLevel: 'High',
        phone: '+91 65432 10987',
        image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Overdue: 6 days',
        followUpUrgent: true,
    },
    {
        id: '5',
        name: 'Arjun Singh',
        age: 8,
        condition: 'Child Vaccination',
        lastVisit: '5 Feb 2026',
        status: 'Active',
        riskLevel: 'Low',
        phone: '+91 54321 09876',
        image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Due in 14 days',
        followUpUrgent: false,
    },
    {
        id: '6',
        name: 'Kavita Nair',
        age: 38,
        condition: 'Anaemia Treatment',
        lastVisit: '17 Feb 2026',
        status: 'Stable',
        riskLevel: 'Medium',
        phone: '+91 43210 98765',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop',
        followUpDue: 'Due in 5 days',
        followUpUrgent: false,
    },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const DASHBOARD_TASKS: DashboardTask[] = [
    {
        id: 1,
        title: '5 patient visits scheduled',
        subtitle: 'Next: Priya Sharma at 10:00 AM',
        priority: 'urgent',
        icon: 'calendar',
    },
    {
        id: 2,
        title: '2 health campaigns active',
        subtitle: 'Maternal Health Drive · Vaccination Camp',
        priority: 'today',
        icon: 'activity',
    },
    {
        id: 3,
        title: '3 follow-ups pending',
        subtitle: 'Post-natal care check-ins',
        priority: 'today',
        icon: 'heart',
    },
];

export const WEEKLY_ALERTS: WeeklyAlert[] = [
    {
        id: 1,
        title: 'Fever Spike Detected',
        description: '7 new fever reports in Ward 3 this week - monitor closely.',
        time: '2 hours ago',
        severity: 'High',
    },
    {
        id: 2,
        title: 'Vaccination Due',
        description: '12 children due for DPT booster in your area by Mar 5.',
        time: 'Today',
        severity: 'Medium',
    },
    {
        id: 3,
        title: 'ANC Check Reminder',
        description: '3 pregnant patients missed their 6-month ANC appointment.',
        time: 'Yesterday',
        severity: 'Medium',
    },
];

export const COMMUNITY_RISK_LEVEL: RiskLevel = 'Medium';

// ─── Community Signals ────────────────────────────────────────────────────────

export const PHARMACY_TRENDS: PharmacyTrend[] = [
    { id: 1, medicine: 'Paracetamol 500mg', count: 142, maxCount: 200, trend: 'up' },
    { id: 2, medicine: 'ORS Sachets', count: 98, maxCount: 200, trend: 'up' },
    { id: 3, medicine: 'Metformin 500mg', count: 76, maxCount: 200, trend: 'stable' },
    { id: 4, medicine: 'Iron-Folic Acid', count: 65, maxCount: 200, trend: 'up' },
    { id: 5, medicine: 'Amoxicillin 250mg', count: 54, maxCount: 200, trend: 'down' },
];

export const SYMPTOM_REPORTS: SymptomReport[] = [
    { id: 1, symptom: 'Fever', count: 34, trend: 'up', ward: 'Ward 3, 5' },
    { id: 2, symptom: 'Diarrhoea', count: 21, trend: 'up', ward: 'Ward 2' },
    { id: 3, symptom: 'Cough/Cold', count: 18, trend: 'stable', ward: 'Ward 1, 4' },
    { id: 4, symptom: 'Anaemia', count: 12, trend: 'down', ward: 'Ward 3' },
    { id: 5, symptom: 'Hypertension', count: 9, trend: 'stable', ward: 'Ward 5' },
];

export const COMMUNITY_ALERTS: CommunityAlert[] = [
    {
        id: 1,
        severity: 'High',
        title: 'Fever Cluster - Ward 3',
        description: '7 fever cases reported within 500m radius. Possible outbreak. Escalate to PHC.',
        date: '18 Feb 2026',
        icon: '🌡️',
    },
    {
        id: 2,
        severity: 'Medium',
        title: 'Diarrhoea Uptick - Ward 2',
        description: 'ORS demand up 60%. Check water source quality in Sector B.',
        date: '17 Feb 2026',
        icon: '💧',
    },
    {
        id: 3,
        severity: 'Low',
        title: 'Vaccination Coverage Gap',
        description: '23% of children under 2 in Ward 4 are unvaccinated. Schedule camp.',
        date: '15 Feb 2026',
        icon: '💉',
    },
];

export const WEEKLY_TRENDS: WeeklyTrend[] = [
    { label: 'Mon', value: 12, maxValue: 40 },
    { label: 'Tue', value: 18, maxValue: 40 },
    { label: 'Wed', value: 24, maxValue: 40 },
    { label: 'Thu', value: 31, maxValue: 40 },
    { label: 'Fri', value: 28, maxValue: 40 },
    { label: 'Sat', value: 22, maxValue: 40 },
    { label: 'Sun', value: 15, maxValue: 40 },
];

// ─── AI Insights ──────────────────────────────────────────────────────────────

export const AI_INSIGHTS: AIInsight[] = [
    {
        id: 1,
        icon: '🌡️',
        title: 'Fever cases rising in Ward 3',
        description: '7 fever reports this week - 40% above weekly average. Consider escalating to PHC.',
        severity: 'High',
        action: 'View Ward Map',
    },
    {
        id: 2,
        icon: '🤰',
        title: '3 pregnant patients need ANC check',
        description: 'Priya Sharma, Rekha Devi, and Anita Rao missed their 6-month appointment.',
        severity: 'Medium',
        action: 'View Patients',
    },
    {
        id: 3,
        icon: '💊',
        title: 'Paracetamol demand up 40%',
        description: 'Local pharmacy reports high demand - correlates with fever cluster in Ward 3.',
        severity: 'Medium',
        action: 'View Signals',
    },
    {
        id: 4,
        icon: '📅',
        title: 'Vaccination camp due in 5 days',
        description: 'DPT booster camp scheduled for Mar 5. 12 children registered. Confirm venue.',
        severity: 'Low',
        action: 'View Schedule',
    },
];

export default function DataRoute() {
  return null;
}
