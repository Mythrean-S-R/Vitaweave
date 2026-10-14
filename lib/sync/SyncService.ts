import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { SYNC_COLLECTIONS, REMOTE_TABLE_MAP, type SyncCollection } from '../db/schema';
import { countDirtyAll, listDirty, listLocal, markSynced, upsertLocal, newLocalId, type LocalRow } from '../repositories/base';
import { decryptField, encryptField } from '../db/fieldEncryption';
import { migrateLegacyAsyncStorageQueue } from './legacyQueueMigration';

type SyncListener = (pendingCount: number) => void;
const listeners = new Set<SyncListener>();

const SENSITIVE_LOCAL_TO_REMOTE: Record<string, string> = {
  phone_enc: 'phone',
  abha_id_enc: 'abha_id',
  notes_enc: 'notes',
  prescription_enc: 'prescription',
  outcome_notes_enc: 'outcome_notes',
  findings_enc: 'findings',
};

const SENSITIVE_REMOTE_TO_LOCAL: Record<string, string> = {
  phone: 'phone_enc',
  abha_id: 'abha_id_enc',
  notes: 'notes_enc',
  prescription: 'prescription_enc',
  outcome_notes: 'outcome_notes_enc',
  findings: 'findings_enc',
};

function getRowTimestamp(row: Record<string, unknown>): number {
  const timestamp = row.updated_at || row.created_at;
  return timestamp ? Date.parse(String(timestamp)) : 0;
}

export function mergeRemoteWithLocal(
  remote: Record<string, unknown>,
  local: Record<string, unknown>,
  localTimestamp: number
): Record<string, unknown> {
  const merged = { ...remote };
  const remoteTimestamp = getRowTimestamp(remote);
  for (const key of Object.keys(local)) {
    if (['local_dirty', 'sync_status'].includes(key)) continue;
    const localValue = local[key];
    if (remoteTimestamp > localTimestamp && remote[key] !== undefined && remote[key] !== localValue) {
      continue;
    }
    merged[key] = localValue;
  }
  merged.updated_at = new Date(Math.max(remoteTimestamp, localTimestamp)).toISOString();
  return merged;
}

async function emitPending() {
  const count = await countDirtyAll([...SYNC_COLLECTIONS]);
  listeners.forEach((l) => l(count));
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  void emitPending();
  return () => listeners.delete(listener);
}

export async function getPendingSyncCount(): Promise<number> {
  return countDirtyAll([...SYNC_COLLECTIONS]);
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}

async function localRowToRemotePayload(
  collection: SyncCollection,
  row: LocalRow
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...row };
  delete payload.local_dirty;
  delete payload.sync_status;

  for (const [localKey, remoteKey] of Object.entries(SENSITIVE_LOCAL_TO_REMOTE)) {
    if (localKey in payload) {
      const decrypted = await decryptField(payload[localKey] as string | null);
      payload[remoteKey] = decrypted;
      delete payload[localKey];
    }
  }

  // audit_log_local → audit_log column names
  if (collection === 'audit_log_local') {
    if (payload.metadata_json != null) {
      try {
        payload.metadata =
          typeof payload.metadata_json === 'string'
            ? JSON.parse(payload.metadata_json as string)
            : payload.metadata_json;
      } catch {
        payload.metadata = {};
      }
      delete payload.metadata_json;
    }
  }

  if (collection === 'medical_records') {
    if (payload.attachments_json != null && payload.attachments == null) {
      try {
        payload.attachments =
          typeof payload.attachments_json === 'string'
            ? JSON.parse(payload.attachments_json as string)
            : payload.attachments_json;
      } catch {
        payload.attachments = [];
      }
    }
    delete payload.attachments_json;
    if (payload.vitals_json != null && payload.vitals == null) {
      try {
        payload.vitals =
          typeof payload.vitals_json === 'string'
            ? JSON.parse(payload.vitals_json as string)
            : payload.vitals_json;
      } catch {
        payload.vitals = {};
      }
    }
    delete payload.vitals_json;
    if (payload.erx_json && (!payload.attachments || (Array.isArray(payload.attachments) && payload.attachments.length === 0))) {
      payload.attachments = [{ type: 'abdm_erx', format: 'json', data: payload.erx_json }];
    }
    // remote schema has no erx_json column
    delete payload.erx_json;
  }

  if (collection === 'profiles_local') {
    // remote table is profiles
  }

  if (collection === 'dashboard_tasks') {
    delete payload.updated_at;
  }

  // Strip null deleted_at for insert friendliness
  if (!payload.deleted_at) delete payload.deleted_at;

  return payload;
}

async function remoteRowToLocal(
  collection: SyncCollection,
  remote: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const row: Record<string, unknown> = { ...remote };

  for (const [remoteKey, localKey] of Object.entries(SENSITIVE_REMOTE_TO_LOCAL)) {
    if (remoteKey in row) {
      row[localKey] = await encryptField(row[remoteKey] as string | null);
      delete row[remoteKey];
    }
  }

  if (collection === 'audit_log_local' && row.metadata != null) {
    row.metadata_json = JSON.stringify(row.metadata);
    delete row.metadata;
  }

  if (collection === 'medical_records') {
    if (row.attachments != null) {
      row.attachments_json = JSON.stringify(row.attachments);
      const list = Array.isArray(row.attachments) ? (row.attachments as Array<{ type?: string; data?: string }>) : [];
      const erx = list.find((a) => a?.type === 'abdm_erx');
      if (erx?.data) row.erx_json = erx.data;
      delete row.attachments;
    }
    if (row.vitals != null) {
      row.vitals_json = JSON.stringify(row.vitals);
      delete row.vitals;
    }
  }

  row.local_dirty = 0;
  row.sync_status = 'synced';
  row.updated_at = row.updated_at ?? new Date().toISOString();
  return row;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function pushCollection(collection: SyncCollection): Promise<void> {
  const dirty = await listDirty(collection);
  const remoteTable = REMOTE_TABLE_MAP[collection];

  for (const row of dirty) {
    try {
      const payload = await localRowToRemotePayload(collection, row);

      if (row.deleted_at) {
        await supabase.from(remoteTable).delete().eq('id', row.id);
        await markSynced(collection, row.id);
        continue;
      }

      const isUuid = UUID_REGEX.test(String(row.id));
      if (!isUuid && ['patients', 'medical_records', 'appointments'].includes(collection)) {
        payload.id = newLocalId();
      }

      let remoteRow: Record<string, unknown> | null = null;
      if (isUuid) {
        const { data, error: fetchError } = await supabase
          .from(remoteTable)
          .select('*')
          .eq('id', row.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        remoteRow = data;
      }

      if (!remoteRow) {
        const { error } = await supabase.from(remoteTable).insert([payload]);
        if (error) throw error;
      } else {
        const merged = mergeRemoteWithLocal(remoteRow, payload, getRowTimestamp(row));
        // Don't send local-only keys
        delete (merged as Record<string, unknown>).local_dirty;
        delete (merged as Record<string, unknown>).sync_status;
        if (collection === 'dashboard_tasks') {
          delete (merged as Record<string, unknown>).updated_at;
        }
        const { error } = await supabase.from(remoteTable).upsert([merged], { onConflict: 'id' });
        if (error) throw error;
      }

      await markSynced(collection, row.id);
    } catch (error: any) {
      if (error?.code === 'PGRST205') {
        // Table does not exist in remote Supabase schema (e.g. audit_log)
        await markSynced(collection, row.id);
        continue;
      }
      if (error?.code === '42501') {
        // Row-level security prevented push (unauthenticated or unauthorized)
        logger.debug(`RLS prevented push for ${collection}/${row.id}`);
        continue;
      }
      logger.warn(`Sync push failed for ${collection}/${row.id}:`, error);
    }
  }
}

async function pullCollection(collection: SyncCollection): Promise<void> {
  const remoteTable = REMOTE_TABLE_MAP[collection];
  try {
    const { data, error } = await supabase.from(remoteTable).select('*').limit(500);
    if (error) throw error;
    if (!data?.length) return;

    const localDirty = new Set((await listDirty(collection)).map((r) => r.id));

    for (const remote of data) {
      const id = String((remote as { id: string }).id);
      if (localDirty.has(id)) {
        // Keep local dirty; merge will happen on push
        continue;
      }
      const localRow = await remoteRowToLocal(collection, remote as Record<string, unknown>);
      await upsertLocal(collection, localRow, { dirty: false });
    }
  } catch (error: any) {
    if (error?.code === 'PGRST205' || error?.code === '42501') {
      // Table does not exist in remote Supabase schema or RLS restricted
      return;
    }
    logger.warn(`Sync pull failed for ${collection}:`, error);
  }
}

let syncing = false;

export async function flushSync(): Promise<void> {
  if (syncing) return;
  if (!(await isOnline())) {
    await emitPending();
    return;
  }

  syncing = true;
  try {
    await migrateLegacyAsyncStorageQueue();
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const hasAuthSession = Boolean(sessionData?.session?.user);

    for (const collection of SYNC_COLLECTIONS) {
      if (!hasAuthSession) {
        // In local demo / offline mode without an auth session, keep writes in local DB
        continue;
      }
      await pushCollection(collection);
    }
    for (const collection of SYNC_COLLECTIONS) {
      await pullCollection(collection);
    }
  } finally {
    syncing = false;
    await emitPending();
  }
}

export async function initializeLocalSync(): Promise<void> {
  await migrateLegacyAsyncStorageQueue();
  await emitPending();

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushSync();
    }
  });

  if (await isOnline()) {
    await flushSync();
  }

  // Surveillance pass after local data is warm
  try {
    const { runOutbreakDetectionAndFlag } = await import('../surveillance/clusterDetector');
    await runOutbreakDetectionAndFlag();
  } catch {
    // non-fatal
  }
}

/** Queue-compatible write helper used by api facade */
export async function writeLocalFirst(
  collection: SyncCollection,
  row: Record<string, unknown>
): Promise<LocalRow> {
  const saved = await upsertLocal(collection, row, { dirty: true });
  await emitPending();
  if (await isOnline()) {
    void flushSync();
  }
  return saved;
}

export async function readLocalCollection(collection: SyncCollection): Promise<LocalRow[]> {
  return listLocal(collection);
}
