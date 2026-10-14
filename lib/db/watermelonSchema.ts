import { appSchema, tableSchema, type ColumnSchema, type TableSchema } from '@nozbe/watermelondb';
import { TABLE_DEFS, type ColDef } from './tableDefs';

function toColumns(defs: ColDef[]): ColumnSchema[] {
  return defs.map((d) => ({
    name: d.name,
    type: d.type,
    isOptional: d.isOptional,
    isIndexed: d.isIndexed,
  }));
}

function toTable(name: string, defs: ColDef[]): TableSchema {
  return tableSchema({
    name,
    columns: toColumns(defs),
  });
}

export const watermelonSchema = appSchema({
  version: 2,
  tables: Object.entries(TABLE_DEFS).map(([name, defs]) => toTable(name, defs)),
});

export const LOCAL_DB_NAME = 'vitaweave_watermelon';
export const LOCAL_DB_VERSION = 2;
