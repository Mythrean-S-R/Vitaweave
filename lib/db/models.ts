/**
 * WatermelonDB model classes - one per sync collection.
 * Field accessors are optional; repositories read/write via `_raw` / `_setRaw`.
 */
import { Model } from '@nozbe/watermelondb';
import { SYNC_COLLECTIONS, type SyncCollection } from './schema';

type ModelClass = typeof Model;

function buildModel(tableName: string): ModelClass {
  class SyncModel extends Model {
    static table = tableName;
  }
  Object.defineProperty(SyncModel, 'name', { value: `${tableName}Model` });
  return SyncModel;
}

export const modelClasses: ModelClass[] = SYNC_COLLECTIONS.map((name) => buildModel(name));

export const modelClassByTable: Record<SyncCollection, ModelClass> = SYNC_COLLECTIONS.reduce(
  (acc, name, i) => {
    acc[name] = modelClasses[i];
    return acc;
  },
  {} as Record<SyncCollection, ModelClass>
);
