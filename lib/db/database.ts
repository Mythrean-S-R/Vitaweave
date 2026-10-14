/**
 * Local-first WatermelonDB bootstrap (plan 2B).
 * Native: SQLiteAdapter | Web/tests: LokiJSAdapter
 */
import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { createDatabaseAdapter } from './adapter';
import { LOCAL_DB_NAME } from './watermelonSchema';
import { modelClasses } from './models';
import { logger } from '../logger';

let databasePromise: Promise<Database> | null = null;

async function openDatabase(): Promise<Database> {
  const adapter = createDatabaseAdapter();
  const database = new Database({
    adapter,
    modelClasses,
  });
  logger.info('WatermelonDB ready', { platform: Platform.OS, db: LOCAL_DB_NAME });
  return database;
}

export async function getWatermelonDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch(async (error) => {
      logger.warn('WatermelonDB open failed, retrying with LokiJS', error);
      return new Database({
        adapter: createDatabaseAdapter(),
        modelClasses,
      });
    });
  }
  return databasePromise;
}

/** @deprecated Prefer getWatermelonDatabase - kept for call-site compatibility during migration */
export async function getDatabase(): Promise<Database> {
  return getWatermelonDatabase();
}

export async function resetLocalDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    try {
      const db = await databasePromise;
      await db.write(async () => {
        await db.unsafeResetDatabase();
      });
    } catch {
      // ignore
    }
  }
  databasePromise = null;
}

export function newLocalId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // ignore
    }
  }
  // RFC4122 version 4 compliant UUID fallback for React Native / Hermes
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}
