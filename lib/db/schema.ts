/**
 * Local-first sync collection map (WatermelonDB + Supabase).
 * Table column definitions live in `tableDefs.ts` / `watermelonSchema.ts`.
 */

export { LOCAL_DB_NAME, LOCAL_DB_VERSION } from './watermelonSchema';
export { TABLE_DEFS } from './tableDefs';

/** @deprecated Raw SQL bootstrap retained for reference only - runtime uses WatermelonDB */
export const CREATE_TABLES_SQL = '-- migrated to WatermelonDB schema (lib/db/watermelonSchema.ts)';

export const SYNC_COLLECTIONS = [
  'patients',
  'referrals',
  'vaccinations',
  'medical_records',
  'patient_vitals',
  'symptom_reports',
  'community_alerts',
  'dashboard_tasks',
  'appointments',
  'campaigns',
  'pregnancies',
  'anc_visits',
  'pnc_visits',
  'consent_records',
  'data_rights_requests',
  'audit_log_local',
  'profiles_local',
] as const;

export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

/** Maps local table → remote Supabase table name */
export const REMOTE_TABLE_MAP: Record<SyncCollection, string> = {
  patients: 'patients',
  referrals: 'referrals',
  vaccinations: 'vaccinations',
  medical_records: 'medical_records',
  patient_vitals: 'patient_vitals',
  symptom_reports: 'symptom_reports',
  community_alerts: 'community_alerts',
  dashboard_tasks: 'dashboard_tasks',
  appointments: 'appointments',
  campaigns: 'campaigns',
  pregnancies: 'pregnancies',
  anc_visits: 'anc_visits',
  pnc_visits: 'pnc_visits',
  consent_records: 'consent_records',
  data_rights_requests: 'data_rights_requests',
  audit_log_local: 'audit_log',
  profiles_local: 'profiles',
};
