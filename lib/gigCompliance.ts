import { supabase } from './supabase';
import { writeThroughQueue } from './syncEngine';

export type AshaComplianceLog = {
  id: string;
  ashaId: string;
  logDate: string;
  visitsCompleted: number;
  hoursLogged: number;
  tasksCompleted: number;
  notes?: string;
};

function mapRow(row: Record<string, unknown>): AshaComplianceLog {
  return {
    id: String(row.id),
    ashaId: String(row.asha_id),
    logDate: String(row.log_date),
    visitsCompleted: Number(row.visits_completed ?? 0),
    hoursLogged: Number(row.hours_logged ?? 0),
    tasksCompleted: Number(row.tasks_completed ?? 0),
    notes: row.notes as string | undefined,
  };
}

export async function upsertAshaComplianceLog(input: {
  ashaId: string;
  visitsCompleted?: number;
  hoursLogged?: number;
  tasksCompleted?: number;
  notes?: string;
  logDate?: string;
}): Promise<{ error: unknown }> {
  const logDate = input.logDate ?? new Date().toISOString().slice(0, 10);
  const payload = {
    asha_id: input.ashaId,
    log_date: logDate,
    visits_completed: input.visitsCompleted ?? 0,
    hours_logged: input.hoursLogged ?? 0,
    tasks_completed: input.tasksCompleted ?? 0,
    notes: input.notes ?? null,
  };

  const result = await writeThroughQueue({
    table: 'asha_compliance_logs',
    action: 'insert',
    payload,
    conflictKey: `asha_compliance:${input.ashaId}:${logDate}`,
    online: async () => {
      const { data, error } = await supabase
        .from('asha_compliance_logs')
        .upsert(payload, { onConflict: 'asha_id,log_date' })
        .select()
        .single();
      return { data, error };
    },
  });
  return { error: result.error };
}

export async function getAshaComplianceLogs(ashaId: string, limit = 14): Promise<AshaComplianceLog[]> {
  const { data, error } = await supabase
    .from('asha_compliance_logs')
    .select('*')
    .eq('asha_id', ashaId)
    .order('log_date', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => mapRow(r));
}
