import { logAuditEvent, type AuditAction } from './auditLog';

export async function withAudit<T>(
  meta: {
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  await logAuditEvent(meta).catch(() => undefined);
  return result;
}
