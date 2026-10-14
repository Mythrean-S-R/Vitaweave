import { supabase } from './supabase';

export type DistrictMetric = {
  id: string;
  district: string;
  metricDate: string;
  activeAshaCount: number;
  patientsRegistered: number;
  highRiskOpen: number;
  referralsPending: number;
  avgReferralCompletionHours?: number;
};

export type AdminSummary = {
  totalPatients: number;
  highRiskPatients: number;
  pendingReferrals: number;
  activeAshaWorkers: number;
  todayAuditEvents: number;
};

export type AuditLogEntry = {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  createdAt: string;
};

export type ScoringAuditEntry = {
  id: string;
  patientId: string;
  score: number;
  riskLevel?: string;
  source: string;
  createdAt: string;
};

export async function getDistrictMetrics(limit = 30): Promise<DistrictMetric[]> {
  const { data, error } = await supabase
    .from('district_metrics')
    .select('*')
    .order('metric_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('getDistrictMetrics:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    district: String(row.district),
    metricDate: String(row.metric_date),
    activeAshaCount: Number(row.active_asha_count ?? 0),
    patientsRegistered: Number(row.patients_registered ?? 0),
    highRiskOpen: Number(row.high_risk_open ?? 0),
    referralsPending: Number(row.referrals_pending ?? 0),
    avgReferralCompletionHours:
      row.avg_referral_completion_hours != null
        ? Number(row.avg_referral_completion_hours)
        : undefined,
  }));
}

export async function getAdminSummary(): Promise<AdminSummary> {
  const today = new Date().toISOString().slice(0, 10);

  const [patientsRes, referralsRes, ashaRes, auditRes] = await Promise.all([
    supabase.from('patients').select('id, risk_level', { count: 'exact' }),
    supabase.from('referrals').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'asha'),
    supabase
      .from('audit_log')
      .select('id', { count: 'exact' })
      .gte('created_at', `${today}T00:00:00`),
  ]);

  const patients = patientsRes.data ?? [];
  const highRisk = patients.filter(
    (p) => p.risk_level === 'High' || ((p as any).urgency_score ?? 0) >= 50
  ).length;

  return {
    totalPatients: patientsRes.count ?? patients.length,
    highRiskPatients: highRisk,
    pendingReferrals: referralsRes.count ?? 0,
    activeAshaWorkers: ashaRes.count ?? 0,
    todayAuditEvents: auditRes.count ?? 0,
  };
}

export async function getRecentAuditLogs(limit = 15): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row.id),
    actorId: String(row.actor_id),
    action: String(row.action),
    resourceType: String(row.resource_type),
    resourceId: row.resource_id as string | undefined,
    createdAt: String(row.created_at),
  }));
}

export async function getRecentScoringAudit(limit = 15): Promise<ScoringAuditEntry[]> {
  const { data, error } = await supabase
    .from('scoring_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((row) => ({
    id: String(row.id),
    patientId: String(row.patient_id),
    score: Number(row.score),
    riskLevel: row.risk_level as string | undefined,
    source: String(row.source),
    createdAt: String(row.created_at),
  }));
}
