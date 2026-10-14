import { Q } from '@nozbe/watermelondb';
import type { Model } from '@nozbe/watermelondb';
import { getWatermelonDatabase, newLocalId, nowIso } from '../db/database';
import type { SyncCollection } from '../db/schema';
import { TABLE_DEFS } from '../db/tableDefs';

export type LocalRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  local_dirty?: number;
  sync_status?: string;
  deleted_at?: string | null;
};

/** WatermelonDB stores created_at/updated_at as epoch ms numbers. */
function toWmTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function fromWmTimestamp(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && value) return value;
  return nowIso();
}

function modelToRow(model: Model): LocalRow {
  const raw: Record<string, any> = { ...(model as Model & { _raw: Record<string, unknown> })._raw };
  delete raw._status;
  delete raw._changed;
  const updated_at = 'updated_at' in raw ? fromWmTimestamp(raw.updated_at) : nowIso();
  if ('created_at' in raw) raw.created_at = fromWmTimestamp(raw.created_at);
  return {
    ...raw,
    id: model.id,
    updated_at,
  } as LocalRow;
}

function applyRawFields(model: Model, payload: Record<string, unknown>) {
  const record = model as Model & { _setRaw: (key: string, value: unknown) => void };
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'id') continue;
    if (key.startsWith('_')) continue;
    let next = value === undefined ? null : value;
    if ((key === 'updated_at' || key === 'created_at') && next != null) {
      next = toWmTimestamp(next);
    }
    try {
      record._setRaw(key, next);
    } catch {
      // Column may not exist on this table - ignore
    }
  }
}

function hasColumn(collection: SyncCollection, name: string): boolean {
  return (TABLE_DEFS[collection] ?? []).some((c) => c.name === name);
}

export async function upsertLocal(
  collection: SyncCollection,
  row: Record<string, unknown>,
  options?: { dirty?: boolean }
): Promise<LocalRow> {
  const database = await getWatermelonDatabase();
  const id = String(row.id ?? newLocalId());
  const updated_at = String(row.updated_at ?? nowIso());
  const dirty = options?.dirty !== false ? 1 : 0;
  const sync_status: string = dirty ? 'pending' : (typeof row.sync_status === 'string' ? row.sync_status : 'synced');

  const payload: LocalRow = {
    ...row,
    id,
    updated_at,
    local_dirty: dirty,
    sync_status,
    deleted_at: (row.deleted_at as string | null) ?? null,
  };

  if (hasColumn(collection, 'created_at') && payload.created_at == null) {
    payload.created_at = updated_at;
  }

  const col = database.get(collection);

  await database.write(async () => {
    let existing: Model | null = null;
    try {
      existing = await col.find(id);
    } catch {
      existing = null;
    }

    if (existing) {
      await existing.update((m) => applyRawFields(m, payload));
    } else {
      await col.create((m) => {
        const record = m as Model & { _raw: { id: string } };
        record._raw.id = id;
        applyRawFields(m, payload);
      });
    }
  });

  const saved = await col.find(id);
  return modelToRow(saved);
}

export async function getLocalById(
  collection: SyncCollection,
  id: string
): Promise<LocalRow | null> {
  const database = await getWatermelonDatabase();
  try {
    const model = await database.get(collection).find(id);
    const row = modelToRow(model);
    if (row.deleted_at) return null;
    return row;
  } catch {
    return null;
  }
}

export async function listLocal(
  collection: SyncCollection,
  where?: { column: string; value: unknown }[]
): Promise<LocalRow[]> {
  const database = await getWatermelonDatabase();
  const clauses = [];

  if (hasColumn(collection, 'deleted_at')) {
    clauses.push(Q.or(Q.where('deleted_at', null), Q.where('deleted_at', '')));
  }
  if (where?.length) {
    for (const w of where) {
      clauses.push(Q.where(w.column, w.value as string | number | boolean | null));
    }
  }

  const collectionRef = database.get(collection);
  const models = hasColumn(collection, 'updated_at')
    ? await collectionRef.query(...clauses, Q.sortBy('updated_at', Q.desc)).fetch()
    : await collectionRef.query(...clauses).fetch();

  return models.map(modelToRow).filter((r) => !r.deleted_at);
}

export async function listDirty(collection: SyncCollection): Promise<LocalRow[]> {
  const database = await getWatermelonDatabase();
  try {
    const models = await database
      .get(collection)
      .query(Q.where('local_dirty', 1))
      .fetch();
    return models.map(modelToRow);
  } catch {
    return [];
  }
}

export async function markSynced(collection: SyncCollection, id: string): Promise<void> {
  const database = await getWatermelonDatabase();
  try {
    const model = await database.get(collection).find(id);
    await database.write(async () => {
      await model.update((m) => {
        applyRawFields(m, { local_dirty: 0, sync_status: 'synced' });
      });
    });
  } catch {
    // missing row - ignore
  }
}

export async function softDeleteLocal(collection: SyncCollection, id: string): Promise<void> {
  const existing = await getLocalById(collection, id);
  if (!existing) return;
  await upsertLocal(
    collection,
    { ...existing, deleted_at: nowIso(), local_dirty: 1, sync_status: 'pending' },
    { dirty: true }
  );
}

export async function countDirtyAll(collections: SyncCollection[]): Promise<number> {
  let total = 0;
  for (const c of collections) {
    const rows = await listDirty(c);
    total += rows.length;
  }
  return total;
}

export { newLocalId, nowIso };
