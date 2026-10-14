import { supabase } from './supabase';
import { getStoredUserId } from './authGuard';
import { writeThroughQueue } from './syncEngine';

export type AuditAction = 'read' | 'create' | 'update' | 'delete' | 'login' | 'export';

export async function logAuditEvent(input: {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const actorId = await getStoredUserId();
  if (!actorId) return;

  const payload = {
    actor_id: actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  };

  await writeThroughQueue({
    table: 'audit_log',
    action: 'insert',
    payload,
    conflictKey: `audit_log:${actorId}:${Date.now()}`,
    online: async () => {
      const { data, error } = await supabase.from('audit_log').insert(payload).select().single();
      return { data, error };
    },
  }).catch(() => undefined);
}
