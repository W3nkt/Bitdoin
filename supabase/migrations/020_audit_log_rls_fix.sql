-- Fix audit_logs RLS: replace monolithic admin-only policy with separate
-- insert + select policies so OPERATIONS and FINANCE staff can write logs
-- while only ADMIN can read them.

drop policy if exists "audit_logs_admin" on public.audit_logs;

-- Any staff role can insert their own audit events
create policy "audit_logs_staff_insert" on public.audit_logs
  for insert with check (
    user_id = auth.uid()
    and get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );

-- Only ADMIN can read audit logs
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (get_user_role() = 'ADMIN');

-- Only ADMIN can delete audit log entries
create policy "audit_logs_admin_delete" on public.audit_logs
  for delete using (get_user_role() = 'ADMIN');

-- Index for time-ordered queries (most common access pattern)
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
