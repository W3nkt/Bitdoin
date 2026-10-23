-- My Scores — admin configuration and support API (BE-005, #25).
--
-- Roles (OD-01b): ADMIN manages configuration; OPERATIONS is the support
-- agent. Every academic admin or support action needs an MFA-verified
-- session (aal2, TOTP; OD-13) while admin_mfa_required is on.
--
--   Config (ADMIN-002..004)
--     direct table writes through RLS (ADMIN + MFA), plus:
--     academic_admin_create_scale_version(scale, fields)   new draft version
--     academic_admin_approve_scale_version(version)        draft -> approved
--     academic_admin_merge_schools(from, into, reason)     re-point + alias
--     academic_admin_resolve_school_task(task, ...)        unverified schools
--     academic_admin_create_school_calendar(school, year,  copy-on-override
--       overrides)
--   Roles (ADMIN-001)
--     academic_admin_set_user_role(user, role, reason)
--   Support (ADMIN-005)
--     academic_support_lookup(user_ref)                    no scores
--     academic_support_break_glass(profile, reason)        30-minute window
--     academic_support_view_scores(profile)                inside the window
-- Everything here is audited; reasons are required for exceptional access.

-- ─── Settings ────────────────────────────────────────────────────────────────

insert into public.academic_settings (key, value, description) values
  ('admin_mfa_required', 'true', 'Academic admin/support actions need an aal2 (TOTP) session (OD-13).'),
  ('scale_four_eyes_required', 'false', 'Scale versions must be approved by a different admin (OD-13a).'),
  ('break_glass_minutes', '30', 'How long a break-glass score view stays open (ADMIN-005).')
on conflict (key) do nothing;

-- ─── Session checks ──────────────────────────────────────────────────────────

create or replace function public.academic_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.academic_setting('admin_mfa_required') = 'false'::jsonb, false)
      or coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;

create or replace function public.academic_admin_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_is_admin() and public.academic_mfa_ok();
$$;

-- Raises unless the caller holds one of the roles with a verified session.
create or replace function public.academic_require_staff(p_roles text[])
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  if not coalesce(public.get_user_role()::text = any (p_roles), false) then
    perform public.academic_raise('FORBIDDEN_ROLE', 403, 'Your role cannot do this');
  end if;
  if not public.academic_mfa_ok() then
    perform public.academic_raise('MFA_REQUIRED', 403, 'Verify with your authenticator app first');
  end if;
  return v_user;
end;
$$;

-- ─── Policies now require MFA for admin writes and reads ─────────────────────

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
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select public.academic_admin_session()))
         with check ((select public.academic_admin_session()))',
      t || '_admin_write', t
    );
  end loop;
end;
$$;

drop policy if exists academic_grading_scale_versions_read on public.academic_grading_scale_versions;
create policy academic_grading_scale_versions_read on public.academic_grading_scale_versions
  for select to authenticated
  using (status <> 'draft' or (select public.academic_admin_session()));

drop policy if exists academic_audit_events_admin_read on public.academic_audit_events;
create policy academic_audit_events_admin_read on public.academic_audit_events
  for select to authenticated
  using (
    (select public.academic_mfa_ok())
    and (
      (select public.academic_is_admin())
      or (actor_user_id = (select auth.uid()) and (select public.get_user_role()) = 'OPERATIONS')
    )
  );

drop policy if exists academic_review_tasks_admin on public.academic_review_tasks;
create policy academic_review_tasks_admin on public.academic_review_tasks
  for all to authenticated
  using ((select public.academic_admin_session()))
  with check ((select public.academic_admin_session()));

drop policy if exists academic_analysis_configs_admin_insert on public.academic_analysis_configs;
create policy academic_analysis_configs_admin_insert on public.academic_analysis_configs
  for insert to authenticated with check ((select public.academic_admin_session()));

-- ─── Data hygiene ────────────────────────────────────────────────────────────

alter table public.academic_grading_scale_versions
  add column if not exists created_by uuid references public.users(id) on delete set null default auth.uid();

create or replace function public.academic_normalise_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.alias_text := btrim(new.alias_text);
  new.alias_normalised := lower(new.alias_text);
  return new;
end;
$$;

create or replace trigger academic_subject_aliases_normalise
  before insert or update on public.academic_subject_aliases
  for each row execute function public.academic_normalise_alias();

-- Admin maintenance (school merges, resolving unverified schools) may
-- re-point closed enrolments to the right school; nothing else may change
-- them. The flag is transaction-local and only set by the RPCs below.
create or replace function public.academic_guard_closed_enrolment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_enrolment_id uuid;
begin
  if tg_table_name = 'academic_enrolments' then
    if old.state = 'closed' then
      if current_setting('academic.admin_maintenance', true) = 'on'
        and (to_jsonb(new) - array['school_id', 'school_free_text', 'school_verification', 'updated_at', 'version'])
          = (to_jsonb(old) - array['school_id', 'school_free_text', 'school_verification', 'updated_at', 'version']) then
        return new;
      end if;
      perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
    end if;
    return new;
  end if;

  if tg_table_name = 'academic_score_lines' then
    select enrolment_id into v_enrolment_id from public.academic_score_entries where id = new.score_entry_id;
  else
    v_enrolment_id := new.enrolment_id;
  end if;

  if exists (select 1 from public.academic_enrolments where id = v_enrolment_id and state = 'closed') then
    perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
  end if;
  return new;
end;
$$;

-- Role changes carry the reason given to academic_admin_set_user_role.
create or replace function public.academic_audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.academic_audit(
    'admin.role_change', 'user', new.id, null, 'success',
    concat_ws(': ', old.role::text || ' -> ' || new.role::text,
      nullif(current_setting('academic.audit_reason', true), ''))
  );
  return null;
end;
$$;

create or replace function public.academic_require_reason(p_reason text, p_min integer default 10)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if length(v_reason) < p_min or length(v_reason) > 200 then
    perform public.academic_invalid('reason', 'Give a reason of ' || p_min || '–200 characters');
  end if;
  return v_reason;
end;
$$;

-- ─── Scale versions (ADMIN-002) ──────────────────────────────────────────────

-- New draft version, starting from the latest version's settings.
create or replace function public.academic_admin_create_scale_version(p_scale_id uuid, p_fields jsonb default '{}'::jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_base public.academic_grading_scale_versions;
  v_fields jsonb := coalesce(p_fields, '{}'::jsonb);
  v_id uuid;
begin
  if not exists (select 1 from public.academic_grading_scales where id = p_scale_id) then
    perform public.academic_invalid('scale_id', 'Unknown scale');
  end if;
  if exists (select 1 from jsonb_object_keys(v_fields) as k where k not in (
    'scale_family', 'min_value', 'max_value', 'step', 'decimals', 'pass_mark', 'normalisable', 'ordinal_levels'
  )) then
    perform public.academic_invalid('fields', 'Unknown scale field');
  end if;

  select * into v_base from public.academic_grading_scale_versions
  where grading_scale_id = p_scale_id order by version desc limit 1;

  begin
    insert into public.academic_grading_scale_versions (
      grading_scale_id, version, scale_family, min_value, max_value, step, decimals, pass_mark,
      normalisable, ordinal_levels, status, created_by
    ) values (
      p_scale_id,
      coalesce(v_base.version, 0) + 1,
      coalesce(v_fields->>'scale_family', v_base.scale_family, 'numeric_linear'),
      case when v_fields ? 'min_value' then (v_fields->>'min_value')::numeric else v_base.min_value end,
      case when v_fields ? 'max_value' then (v_fields->>'max_value')::numeric else v_base.max_value end,
      case when v_fields ? 'step' then (v_fields->>'step')::numeric else v_base.step end,
      coalesce((v_fields->>'decimals')::smallint, v_base.decimals, 0),
      case when v_fields ? 'pass_mark' then (v_fields->>'pass_mark')::numeric else v_base.pass_mark end,
      coalesce((v_fields->>'normalisable')::boolean, v_base.normalisable, false),
      case when v_fields ? 'ordinal_levels' then nullif(v_fields->'ordinal_levels', 'null'::jsonb) else v_base.ordinal_levels end,
      'draft',
      v_admin
    )
    returning id into v_id;
  exception when check_violation or invalid_text_representation then
    perform public.academic_invalid('fields', 'These scale settings are not valid');
  end;
  return v_id;
end;
$$;

create or replace function public.academic_admin_approve_scale_version(p_version_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_version public.academic_grading_scale_versions;
begin
  select * into v_version from public.academic_grading_scale_versions where id = p_version_id for update;
  if v_version.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'Unknown scale version');
  end if;
  if v_version.status <> 'draft' then
    perform public.academic_raise('ALREADY_APPROVED', 409, 'Only draft versions can be approved');
  end if;
  if public.academic_setting('scale_four_eyes_required') = 'true'::jsonb and v_version.created_by = v_admin then
    perform public.academic_raise('FOUR_EYES_REQUIRED', 403, 'Another admin must approve this version');
  end if;

  update public.academic_grading_scale_versions
  set status = 'approved', approved_by = v_admin, approved_at = now()
  where id = v_version.id;

  perform public.academic_audit('config.scale_approve', 'grading_scale_version', v_version.id);
  return jsonb_build_object('id', v_version.id, 'status', 'approved');
end;
$$;

-- ─── Schools (ADMIN-003) ─────────────────────────────────────────────────────

-- Merges a duplicate school into another: enrolments (open and closed),
-- aliases and calendars are re-pointed; the duplicate becomes an alias
-- (status merged) so old links still resolve.
create or replace function public.academic_admin_merge_schools(p_from_id uuid, p_into_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_reason text := public.academic_require_reason(p_reason, 5);
  v_enrolments integer;
begin
  if p_from_id = p_into_id then
    perform public.academic_invalid('into_id', 'Choose a different school');
  end if;
  if not exists (select 1 from public.academic_schools where id = p_from_id and status <> 'merged') then
    perform public.academic_invalid('from_id', 'Unknown school');
  end if;
  if not exists (select 1 from public.academic_schools where id = p_into_id and status = 'active') then
    perform public.academic_invalid('into_id', 'Merge into an active school');
  end if;

  perform set_config('academic.admin_maintenance', 'on', true);
  update public.academic_enrolments set school_id = p_into_id where school_id = p_from_id;
  get diagnostics v_enrolments = row_count;
  perform set_config('academic.admin_maintenance', '', true);

  -- Aliases: keep the target's own when both have the same alias.
  delete from public.academic_subject_aliases a
  where a.school_id = p_from_id
    and exists (select 1 from public.academic_subject_aliases b where b.school_id = p_into_id and b.alias_normalised = a.alias_normalised);
  update public.academic_subject_aliases set school_id = p_into_id where school_id = p_from_id;
  update public.academic_calendar_templates set school_id = p_into_id where school_id = p_from_id;
  update public.academic_schools set merged_into_id = p_into_id where merged_into_id = p_from_id;
  update public.academic_schools set status = 'merged', merged_into_id = p_into_id where id = p_from_id;

  perform public.academic_audit('config.school_merge', 'school', p_from_id, null, 'success',
    left('into ' || p_into_id || ': ' || v_reason, 200));
  return jsonb_build_object('from_id', p_from_id, 'into_id', p_into_id, 'enrolments_moved', v_enrolments);
end;
$$;

-- Closes an unverified-school review task: link the enrolment to a
-- catalogue school, or dismiss the task and keep the student's text.
create or replace function public.academic_admin_resolve_school_task(
  p_task_id uuid,
  p_school_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_task public.academic_review_tasks;
begin
  select * into v_task from public.academic_review_tasks where id = p_task_id and status = 'open' for update;
  if v_task.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'No open task with this id');
  end if;

  if p_school_id is not null then
    if not exists (select 1 from public.academic_schools where id = p_school_id and status = 'active') then
      perform public.academic_invalid('school_id', 'Choose an active school');
    end if;
    perform set_config('academic.admin_maintenance', 'on', true);
    update public.academic_enrolments
    set school_id = p_school_id, school_free_text = null, school_verification = 'verified'
    where id = v_task.enrolment_id;
    perform set_config('academic.admin_maintenance', '', true);
  end if;

  update public.academic_review_tasks
  set status = case when p_school_id is null then 'dismissed' else 'resolved' end,
      resolved_by = v_admin,
      resolved_at = now(),
      resolution = jsonb_strip_nulls(jsonb_build_object('school_id', p_school_id, 'note', left(nullif(btrim(p_note), ''), 200)))
  where id = v_task.id;

  return jsonb_build_object('task_id', v_task.id, 'status', case when p_school_id is null then 'dismissed' else 'resolved' end);
end;
$$;

-- ─── Calendars (ADMIN-004) ───────────────────────────────────────────────────

-- Creates a school calendar for a year by copying the province or national
-- one and applying overrides, so only the overridden periods differ.
-- Override items: {period_type, sequence, label_lo?, label_en?, term_no?,
-- start_date?, end_date?, remove?}. New enrolments at the school use it;
-- existing enrolments keep their calendar.
create or replace function public.academic_admin_create_school_calendar(
  p_school_id uuid,
  p_year_id uuid,
  p_overrides jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_school public.academic_schools;
  v_base uuid;
  v_id uuid;
  v_item jsonb;
begin
  select * into v_school from public.academic_schools where id = p_school_id and status = 'active';
  if v_school.id is null then
    perform public.academic_invalid('school_id', 'Choose an active school');
  end if;
  if exists (select 1 from public.academic_calendar_templates
             where academic_year_id = p_year_id and scope = 'school' and school_id = p_school_id and status = 'active') then
    perform public.academic_raise('CALENDAR_EXISTS', 409, 'This school already has a calendar for the year');
  end if;

  select c.id into v_base
  from public.academic_calendar_templates c
  where c.academic_year_id = p_year_id and c.status = 'active'
    and (c.scope = 'national' or (c.scope = 'province' and c.province_code = v_school.province_code))
  order by c.scope = 'province' desc, c.created_at
  limit 1;
  if v_base is null then
    perform public.academic_raise('CALENDAR_NOT_CONFIGURED', 409, 'Set up the national calendar for this year first');
  end if;

  insert into public.academic_calendar_templates (name, academic_year_id, scope, school_id)
  values (left(v_school.name_lo, 100) || ' ' || (select code from public.academic_years where id = p_year_id), p_year_id, 'school', p_school_id)
  returning id into v_id;

  insert into public.academic_reporting_periods (calendar_template_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date)
  select v_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date
  from public.academic_reporting_periods where calendar_template_id = v_base;

  begin
    for v_item in select value from jsonb_array_elements(coalesce(p_overrides, '[]'::jsonb)) loop
      if coalesce((v_item->>'remove')::boolean, false) then
        delete from public.academic_reporting_periods
        where calendar_template_id = v_id and period_type = v_item->>'period_type' and sequence = (v_item->>'sequence')::smallint;
        continue;
      end if;
      -- Existing period: change only the given fields. New period: all required.
      update public.academic_reporting_periods set
        term_no = coalesce((v_item->>'term_no')::smallint, term_no),
        label_lo = coalesce(v_item->>'label_lo', label_lo),
        label_en = coalesce(v_item->>'label_en', label_en),
        start_date = coalesce((v_item->>'start_date')::date, start_date),
        end_date = coalesce((v_item->>'end_date')::date, end_date)
      where calendar_template_id = v_id and period_type = v_item->>'period_type'
        and sequence = (v_item->>'sequence')::smallint;
      if not found then
        insert into public.academic_reporting_periods (calendar_template_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date)
        values (v_id, v_item->>'period_type', (v_item->>'term_no')::smallint, (v_item->>'sequence')::smallint,
                v_item->>'label_lo', v_item->>'label_en', (v_item->>'start_date')::date, (v_item->>'end_date')::date);
      end if;
    end loop;
  exception when not_null_violation or check_violation or invalid_text_representation or invalid_datetime_format then
    perform public.academic_invalid('overrides', 'Each period needs a type, sequence, labels and valid dates');
  end;

  return v_id;
end;
$$;

-- ─── Roles (ADMIN-001) ───────────────────────────────────────────────────────

create or replace function public.academic_admin_set_user_role(p_user_id uuid, p_role text, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_reason text := public.academic_require_reason(p_reason, 5);
  v_old text;
begin
  if p_role is null or p_role not in ('CUSTOMER', 'ADMIN', 'OPERATIONS', 'FINANCE') then
    perform public.academic_invalid('role', 'Unknown role');
  end if;
  select role::text into v_old from public.users where id = p_user_id for update;
  if v_old is null then
    perform public.academic_raise('NOT_FOUND', 404, 'Unknown user');
  end if;
  if v_old = 'ADMIN' and p_role <> 'ADMIN'
    and (select count(*) from public.users where role = 'ADMIN') <= 1 then
    perform public.academic_raise('LAST_ADMIN', 409, 'Keep at least one admin');
  end if;

  perform set_config('academic.audit_reason', v_reason, true);
  update public.users set role = p_role::public.user_role where id = p_user_id and role::text <> p_role;
  perform set_config('academic.audit_reason', '', true);

  return jsonb_build_object('user_id', p_user_id, 'old_role', v_old, 'role', p_role);
end;
$$;

-- ─── Support (ADMIN-005) ─────────────────────────────────────────────────────

create table if not exists public.academic_break_glass_sessions (
  id                 uuid primary key default gen_random_uuid(),
  actor_user_id      uuid not null references public.users(id) on delete cascade,
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  reason             varchar(200) not null,
  started_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  check (expires_at > started_at)
);

create index if not exists academic_break_glass_sessions_actor_idx
  on public.academic_break_glass_sessions (actor_user_id, student_profile_id, expires_at);

alter table public.academic_break_glass_sessions enable row level security;
revoke all on public.academic_break_glass_sessions from anon, authenticated;

-- Looks a student up by Bitdoin user ID or member code. Shows account
-- state only; scores need break-glass.
create or replace function public.academic_support_lookup(p_user_ref text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
  v_ref text := upper(btrim(coalesce(p_user_ref, '')));
  v_user public.users;
  v_profile public.academic_student_profiles;
begin
  if v_ref ~ '^[0-9A-F-]{36}$' then
    select * into v_user from public.users where id = lower(v_ref)::uuid;
  elsif v_ref <> '' then
    select * into v_user from public.users where member_code = regexp_replace(v_ref, '^BA-[A-Z]{3}-', '');
  end if;
  if v_user.id is not null then
    select * into v_profile from public.academic_student_profiles where user_id = v_user.id;
  end if;

  if v_profile.id is null then
    perform public.academic_audit('support.lookup', 'user', v_user.id, null, 'denied', 'no profile');
    return jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'status', 404));
  end if;

  perform public.academic_audit('support.lookup', 'student_profile', v_profile.id, v_profile.id);
  return jsonb_build_object(
    'user', jsonb_build_object('id', v_user.id, 'member_code', v_user.member_code, 'role', v_user.role),
    'profile', jsonb_build_object(
      'id', v_profile.id, 'status', v_profile.status, 'consent_state', v_profile.consent_state,
      'age_band', v_profile.age_band, 'deletion_requested_at', v_profile.deletion_requested_at,
      'deletion_scope', v_profile.deletion_scope, 'created_at', v_profile.created_at
    ),
    'enrolments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'academic_year', y.code, 'grade', g.code, 'state', e.state, 'closed_reason', e.closed_reason,
        'school_verification', e.school_verification,
        'submitted_periods', (select count(*) from public.academic_score_entries se where se.enrolment_id = e.id and se.state = 'submitted'),
        'draft_periods', (select count(*) from public.academic_score_entries se where se.enrolment_id = e.id and se.state = 'draft')
      ) order by y.start_date desc)
      from public.academic_enrolments e
      join public.academic_years y on y.id = e.academic_year_id
      join public.academic_grades g on g.id = e.grade_id
      where e.student_profile_id = v_profile.id
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object('purpose', c.purpose, 'notice_version', c.notice_version,
        'granted_at', c.granted_at, 'withdrawn_at', c.withdrawn_at) order by c.granted_at desc)
      from public.academic_consent_records c where c.student_profile_id = v_profile.id
    ), '[]'::jsonb),
    'guardian_links', '[]'::jsonb
  );
end;
$$;

create or replace function public.academic_support_break_glass(p_student_profile_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
  v_reason text := public.academic_require_reason(p_reason, 10);
  v_minutes integer := coalesce((public.academic_setting('break_glass_minutes') #>> '{}')::integer, 30);
  v_session public.academic_break_glass_sessions;
begin
  if not exists (select 1 from public.academic_student_profiles where id = p_student_profile_id) then
    perform public.academic_audit('support.break_glass', 'student_profile', p_student_profile_id, null, 'denied', 'unknown profile');
    return jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'status', 404));
  end if;

  insert into public.academic_break_glass_sessions (actor_user_id, student_profile_id, reason, expires_at)
  values (v_staff, p_student_profile_id, v_reason, now() + make_interval(mins => v_minutes))
  returning * into v_session;

  perform public.academic_audit('support.break_glass', 'student_profile', p_student_profile_id, p_student_profile_id,
    'success', v_reason);
  return jsonb_build_object('session_id', v_session.id, 'expires_at', v_session.expires_at);
end;
$$;

create or replace function public.academic_support_view_scores(p_student_profile_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
  v_session public.academic_break_glass_sessions;
begin
  select * into v_session from public.academic_break_glass_sessions
  where actor_user_id = v_staff and student_profile_id = p_student_profile_id and expires_at > now()
  order by expires_at desc limit 1;

  if v_session.id is null then
    perform public.academic_audit('support.view_scores', 'student_profile', p_student_profile_id, p_student_profile_id,
      'denied', 'no active break-glass session');
    return jsonb_build_object('error', jsonb_build_object('code', 'BREAK_GLASS_REQUIRED', 'status', 403));
  end if;

  perform public.academic_audit('support.view_scores', 'student_profile', p_student_profile_id, p_student_profile_id);
  return jsonb_build_object('expires_at', v_session.expires_at)
    || public.academic_history_json(p_student_profile_id);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_mfa_ok() from public, anon;
grant execute on function public.academic_mfa_ok() to authenticated;
revoke all on function public.academic_admin_session() from public, anon;
grant execute on function public.academic_admin_session() to authenticated;
revoke all on function public.academic_require_staff(text[]) from public, anon, authenticated;
revoke all on function public.academic_normalise_alias() from public, anon, authenticated;
revoke all on function public.academic_require_reason(text, integer) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_admin_create_scale_version(uuid, jsonb)',
    'academic_admin_approve_scale_version(uuid)',
    'academic_admin_merge_schools(uuid, uuid, text)',
    'academic_admin_resolve_school_task(uuid, uuid, text)',
    'academic_admin_create_school_calendar(uuid, uuid, jsonb)',
    'academic_admin_set_user_role(uuid, text, text)',
    'academic_support_lookup(text)',
    'academic_support_break_glass(uuid, text)',
    'academic_support_view_scores(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
