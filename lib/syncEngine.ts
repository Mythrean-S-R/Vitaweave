/**
 * Compatibility shim: legacy AsyncStorage syncEngine now delegates to local-first SyncService.
 */
export {
  getPendingSyncCount,
  subscribeSyncStatus,
  flushSync as syncQueue,
  writeLocalFirst,
  initializeLocalSync,
  mergeRemoteWithLocal,
  isOnline,
} from './sync/SyncService';

import { writeLocalFirst } from './sync/SyncService';
import { nowIso } from './repositories/base';
import type { SyncCollection } from './db/schema';

const TABLE_MAP: Record<string, SyncCollection> = {
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
  audit_log: 'audit_log_local',
  profiles: 'profiles_local',
  scoring_audit: 'audit_log_local',
  asha_compliance_logs: 'dashboard_tasks',
  push_tokens: 'profiles_local',
  weekly_alerts: 'community_alerts',
  medication_reminders: 'medical_records',
  video_calls: 'appointments',
};

export type SyncAction = 'insert' | 'update' | 'delete';

/**
 * Backward-compatible writeThroughQueue used across the codebase.
 * Writes local-first then triggers sync when online.
 */
export async function writeThroughQueue<T>(params: {
  table: string;
  action: SyncAction;
  recordId?: string | number;
  payload: Record<string, unknown>;
  conflictKey: string;
  online: () => Promise<{ data: T | null; error: unknown }>;
}): Promise<{ data: T | null; error: unknown }> {
  const collection = TABLE_MAP[params.table] ?? ('patients' as SyncCollection);
  const id = String(params.recordId ?? params.payload.id ?? `${Date.now()}`);

  try {
    if (params.action === 'delete') {
      await writeLocalFirst(collection, {
        id,
        ...params.payload,
        deleted_at: nowIso(),
        updated_at: nowIso(),
      });
    } else {
      await writeLocalFirst(collection, {
        ...params.payload,
        id,
        updated_at: params.payload.updated_at ?? nowIso(),
      });
    }

    // Still attempt online path for immediate remote consistency when available
    try {
      const result = await params.online();
      return result;
    } catch (error) {
      return { data: null, error };
    }
  } catch (error) {
    return { data: null, error };
  }
}

export async function queueTableUpdate(
  table: string,
  recordId: number | string,
  payload: Record<string, unknown>
) {
  return writeThroughQueue({
    table,
    action: 'update',
    recordId,
    payload,
    conflictKey: `${table}:${recordId}`,
    online: async () => ({ data: null, error: null }),
  });
}

export const SYNC_TABLES = Object.keys(TABLE_MAP);
