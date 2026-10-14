import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { watermelonSchema, LOCAL_DB_NAME } from './watermelonSchema';
import { migrations } from './migrations';
import { logger } from '../logger';

function isExpoGo(): boolean {
  if (__DEV__) return true;
  try {
    if (isRunningInExpoGo()) return true;
  } catch {}
  if (Constants.appOwnership === 'expo') return true;
  // @ts-ignore
  if (Constants.executionEnvironment === 'storeClient') return true;
  if ((Constants as any)?.expoGoConfig != null) return true;
  return false;
}

function createLokiFallback() {
  return new LokiJSAdapter({
    schema: watermelonSchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: LOCAL_DB_NAME,
  });
}

export function createDatabaseAdapter() {
  if (isExpoGo()) {
    return createLokiFallback();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
    return new SQLiteAdapter({
      schema: watermelonSchema,
      migrations,
      dbName: LOCAL_DB_NAME,
      jsi: false,
      onSetUpError: (error: any) => {
        logger.error('WatermelonDB SQLite setup failed', error);
      },
    });
  } catch (error) {
    logger.warn('SQLiteAdapter unavailable, falling back to LokiJS', error);
    return createLokiFallback();
  }
}
