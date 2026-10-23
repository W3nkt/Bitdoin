-- My Scores — row-level access policies (DB-002, #17).
--
-- Who can see what (PRD §28, OD-01b):
--   Student (any signed-in user)  reads only their own profile, enrolments,
--                                 subjects, scores, revisions and consents,
--                                 and only while the module is enabled.
--   Guardian                      nothing in Phase 1. academic_guardian_can_read()
--                                 is the single switch Phase 3 will implement.
--   ADMIN                         full access to configuration; reads the audit
--                                 log. No standing access to student records:
--                                 support and break-glass lookups go through
--                                 audited RPCs (BE-005).
--   OPERATIONS                    reads its own audit actions.
--   anon                          nothing.
--   service_role                  bypasses RLS (export, deletion, jobs).
--
-- Students never write tables directly. Every write goes through
-- SECURITY DEFINER RPCs that check consent, the feature flag and ownership,
-- and that return 404-style errors for records the caller does not own (AUTH-002).

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.get_user_role() = 'ADMIN', false);
$$;

-- Kill switch (academic_settings.my_scores_enabled). Admins can always use
-- the module so it can be tried in production before launch.
create or replace function public.academic_module_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select value = 'true'::jsonb from public.academic_settings where key = 'my_scores_enabled'),
    false
  ) or public.academic_is_admin();
$$;

create or replace function public.academic_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.academic_student_profiles where user_id = (select auth.uid());
$$;

-- Phase 3 (P3-PAR) replaces this with: active link, scope granted, not
-- suspended, student consent in place. Until then guardians see nothing.
create or replace function public.academic_guardian_can_read(p_student_profile_id uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function public.academic_can_read_profile(p_student_profile_id uuid, p_scope text default 'scores')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_student_profile_id is not null
    and public.academic_module_enabled()
    and (
      p_student_profile_id = public.academic_current_profile_id()
      or public.academic_guardian_can_read(p_student_profile_id, p_scope)
    );
$$;

create or replace function public.academic_can_read_enrolment(p_enrolment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_can_read_profile(
    (select student_profile_id from public.academic_enrolments where id = p_enrolment_id)
  );
$$;

create or replace function public.academic_can_read_score_entry(p_score_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_can_read_enrolment(
    (select enrolment_id from public.academic_score_entries where id = p_score_entry_id)
  );
$$;

create or replace function public.academic_can_read_score_line(p_score_line_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_can_read_score_entry(
    (select score_entry_id from public.academic_score_lines where id = p_score_line_id)
  );
$$;

revoke all on function public.academic_is_admin() from public, anon;
revoke all on function public.academic_module_enabled() from public, anon;
revoke all on function public.academic_current_profile_id() from public, anon;
revoke all on function public.academic_guardian_can_read(uuid, text) from public, anon, authenticated;
revoke all on function public.academic_can_read_profile(uuid, text) from public, anon;
revoke all on function public.academic_can_read_enrolment(uuid) from public, anon;
revoke all on function public.academic_can_read_score_entry(uuid) from public, anon;
revoke all on function public.academic_can_read_score_line(uuid) from public, anon;
grant execute on function public.academic_is_admin() to authenticated;
grant execute on function public.academic_module_enabled() to authenticated;
grant execute on function public.academic_current_profile_id() to authenticated;
grant execute on function public.academic_can_read_profile(uuid, text) to authenticated;
grant execute on function public.academic_can_read_enrolment(uuid) to authenticated;
grant execute on function public.academic_can_read_score_entry(uuid) to authenticated;
grant execute on function public.academic_can_read_score_line(uuid) to authenticated;

-- ─── Configuration: every signed-in user reads, ADMIN manages ────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_settings', 'academic_education_structures', 'academic_grades',
    'academic_years', 'academic_grading_scales', 'academic_grading_scale_versions',
    'academic_schools', 'academic_calendar_templates', 'academic_reporting_periods',
    'academic_subjects', 'academic_subject_aliases'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_read', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.academic_is_admin()))
         with check ((select public.academic_is_admin()))',
      t || '_admin_write', t
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- Draft scale versions are an admin workspace; students only see approved
-- and retired versions (retired ones still describe old scores).
drop policy if exists academic_grading_scale_versions_read on public.academic_grading_scale_versions;
create policy academic_grading_scale_versions_read on public.academic_grading_scale_versions
  for select to authenticated
  using (status <> 'draft' or (select public.academic_is_admin()));

-- ─── Student records: owner reads; writes only through RPCs ──────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_student_profiles', 'academic_enrolments', 'academic_subject_enrolments',
    'academic_score_entries', 'academic_score_lines', 'academic_score_revisions',
    'academic_consent_records'
  ] loop
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_read', t);
  end loop;
end;
$$;

create policy academic_student_profiles_owner_read on public.academic_student_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.academic_module_enabled()));

create policy academic_enrolments_owner_read on public.academic_enrolments
  for select to authenticated
  using (public.academic_can_read_profile(student_profile_id));

create policy academic_subject_enrolments_owner_read on public.academic_subject_enrolments
  for select to authenticated
  using (public.academic_can_read_enrolment(enrolment_id));

create policy academic_score_entries_owner_read on public.academic_score_entries
  for select to authenticated
  using (public.academic_can_read_enrolment(enrolment_id));

create policy academic_score_lines_owner_read on public.academic_score_lines
  for select to authenticated
  using (public.academic_can_read_score_entry(score_entry_id));

create policy academic_score_revisions_owner_read on public.academic_score_revisions
  for select to authenticated
  using (public.academic_can_read_score_line(score_line_id));

-- Consent history is the student's own record only; guardians never read it.
-- It stays readable when the module is switched off, so a student can always
-- review or withdraw consent.
create policy academic_consent_records_owner_read on public.academic_consent_records
  for select to authenticated
  using (
    student_profile_id is not null
    and student_profile_id = (select public.academic_current_profile_id())
  );

-- ─── Audit log: ADMIN reads all, OPERATIONS its own actions ──────────────────

revoke all on public.academic_audit_events from authenticated;
grant select on public.academic_audit_events to authenticated;

drop policy if exists academic_audit_events_admin_read on public.academic_audit_events;
create policy academic_audit_events_admin_read on public.academic_audit_events
  for select to authenticated
  using (
    (select public.academic_is_admin())
    or (
      actor_user_id = (select auth.uid())
      and (select public.get_user_role()) = 'OPERATIONS'
    )
  );
