/**
 * One-release migration: import pending AsyncStorage sync queue into local SQLite, then clear.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertLocal } from '../repositories/base';
import type { SyncCollection } from '../db/schema';
import { logger } from '../logger';

const LEGACY_KEY = '@vitaweave_sync_queue';
const MIGRATED_FLAG = '@vitaweave_sync_queue_migrated_v1';

type LegacyOp = {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  recordId?: string | number;
  payload: Record<string, unknown>;
  timestamp: number;
};

const TABLE_TO_COLLECTION: Record<string, SyncCollection> = {
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
};

let migrating = false;

export async function migrateLegacyAsyncStorageQueue(): Promise<void> {
  if (migrating) return;
  const done = await AsyncStorage.getItem(MIGRATED_FLAG);
  if (done === '1') return;

  migrating = true;
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (raw) {
      const queue = JSON.parse(raw) as LegacyOp[];
      for (const op of queue) {
        const collection = TABLE_TO_COLLECTION[op.table];
        if (!collection) continue;
        const id = String(op.recordId ?? op.payload.id ?? op.id);
        if (op.action === 'delete') {
          await upsertLocal(
            collection,
            {
              id,
              ...op.payload,
              deleted_at: new Date(op.timestamp).toISOString(),
              updated_at: new Date(op.timestamp).toISOString(),
            },
            { dirty: true }
          );
        } else {
          await upsertLocal(
            collection,
            {
              ...op.payload,
              id,
              updated_at: new Date(op.timestamp).toISOString(),
            },
            { dirty: true }
          );
        }
      }
      await AsyncStorage.removeItem(LEGACY_KEY);
      logger.info(`Migrated ${queue.length} legacy sync queue ops to local SQLite`);
    }
    await AsyncStorage.setItem(MIGRATED_FLAG, '1');
  } catch (error) {
    logger.warn('Legacy sync queue migration failed:', error);
  } finally {
    migrating = false;
  }
}
