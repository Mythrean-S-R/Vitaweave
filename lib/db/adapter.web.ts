import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { watermelonSchema, LOCAL_DB_NAME } from './watermelonSchema';
import { migrations } from './migrations';

export function createDatabaseAdapter() {
  return new LokiJSAdapter({
    schema: watermelonSchema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    dbName: LOCAL_DB_NAME,
  });
}
