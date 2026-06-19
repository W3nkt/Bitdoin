import { supabase } from './supabase'

interface AuditParams {
  entity: string
  entityId?: string
  action: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}

/**
 * Writes a single audit log entry. Errors are swallowed so a logging failure
 * never blocks the main operation. Call with `await` after the DB write
 * succeeds so the log is only written on success.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user.id) return
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      action: params.action,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
    })
  } catch {
    // Audit failures must never break the main operation
  }
}
