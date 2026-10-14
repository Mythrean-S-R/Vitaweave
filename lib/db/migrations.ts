import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

/** Local DB migrations - keep in sync with watermelonSchema version. */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'consent_records',
          columns: [
            { name: 'is_minor', type: 'number', isOptional: true },
            { name: 'guardian_name', type: 'string', isOptional: true },
            { name: 'guardian_relationship', type: 'string', isOptional: true },
            { name: 'guardian_acknowledged', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
