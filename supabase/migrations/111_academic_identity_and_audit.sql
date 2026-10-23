-- My Scores — identity adapter (BE-001, #19) and audit logging (BE-007, #22).
--
-- Identity: the module has no login or user store of its own. Every RPC
-- resolves the caller from the Supabase session (auth.uid() = users.id) and
-- never accepts a student or profile ID as proof of who the caller is
-- ("me routing", PRD §27.1).
--
-- Error contract (PRD §27.3) over PostgREST: RPCs raise SQLSTATE PT<status>
-- so PostgREST answers with that HTTP status. The message is the error code
-- (e.g. SCORE_DUPLICATE), detail is a developer-facing sentence and hint
-- holds JSON details. The client maps these in src/lib/academic/errors.ts.
--
-- Denied object access is the exception. An error rolls back the whole
-- transaction, which would also erase the access_denied audit event, so
-- denials return {"error": {"code": "NOT_FOUND", "status": 404}} as data and
-- the client treats that as a 404.
--
-- Audit: append-only academic_audit_events, written only by SECURITY DEFINER
-- code. Clients cannot call the writer. IP and user agent are stored as
-- salted SHA-256 hashes, and events never contain score values or names.

-- ─── Private settings (no client access at all) ──────────────────────────────

create table if not exists public.academic_private_settings (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);

alter table public.academic_private_settings enable row level security;
revoke all on public.academic_private_settings from anon, authenticated;

insert into public.academic_private_settings (key, value) values
  ('audit_hash_salt', encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'hex'))
on conflict (key) do nothing;

-- ─── Errors ──────────────────────────────────────────────────────────────────

create or replace function public.academic_raise(
  p_code text,
  p_status integer,
  p_message text default null,
  p_details jsonb default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_status not between 400 and 599 then
    p_status := 500;
  end if;
  raise exception using
    errcode = 'PT' || p_status::text,
    message = p_code,
    detail = coalesce(p_message, p_code),
    hint = coalesce(p_details::text, '');
end;
$$;

-- ─── Request context ─────────────────────────────────────────────────────────

-- The role recorded on audit events for the current caller.
create or replace function public.academic_actor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then 'system'
    when public.get_user_role() = 'ADMIN' then 'admin'
    when public.get_user_role() in ('OPERATIONS', 'FINANCE') then 'support'
    else 'student'
  end;
$$;

-- Salted hash of a request header; PostgREST exposes headers as JSON in
-- request.headers. Returns null outside an API request.
create or replace function public.academic_request_hash(p_kind text)
returns char(64)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_headers jsonb;
  v_value text;
  v_salt text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  if v_headers is null then
    return null;
  end if;

  v_value := case p_kind
    when 'ip' then btrim(split_part(coalesce(
      v_headers->>'cf-connecting-ip', v_headers->>'x-forwarded-for', v_headers->>'x-real-ip'
    ), ',', 1))
    when 'user_agent' then v_headers->>'user-agent'
  end;
  if nullif(v_value, '') is null then
    return null;
  end if;

  select value into v_salt from public.academic_private_settings where key = 'audit_hash_salt';
  return encode(sha256(convert_to(coalesce(v_salt, '') || ':' || v_value, 'UTF8')), 'hex');
end;
$$;

-- ─── Audit writer ────────────────────────────────────────────────────────────

create or replace function public.academic_audit(
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_student_profile_id uuid default null,
  p_outcome text default 'success',
  p_reason text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.academic_audit_events (
    actor_user_id, actor_role, action, target_type, target_id, student_profile_id,
    ip_hash, user_agent_hash, outcome, reason
  ) values (
    (select auth.uid()), public.academic_actor_role(), left(p_action, 64), left(p_target_type, 48),
    p_target_id, p_student_profile_id,
    public.academic_request_hash('ip'), public.academic_request_hash('user_agent'),
    p_outcome, left(p_reason, 200)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Records a denied object access and returns the 404 envelope the RPC
-- should return. Same response whether the object is missing or belongs to
-- someone else, so IDs cannot be probed.
create or replace function public.academic_deny(p_target_type text, p_target_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.academic_audit(
    'access_denied', p_target_type, p_target_id,
    (select id from public.academic_student_profiles where user_id = (select auth.uid())),
    'denied'
  );
  return jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND', 'status', 404));
end;
$$;

-- ─── Identity adapter ────────────────────────────────────────────────────────

-- The signed-in Bitdoin user, or 401 UNAUTHENTICATED.
create or replace function public.academic_require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.users where id = v_user) then
    perform public.academic_raise('UNAUTHENTICATED', 401, 'A signed-in Bitdoin session is required');
  end if;
  return v_user;
end;
$$;

-- The caller's own student profile. For writes it is row-locked and must be
-- active with module-processing consent on file, so nothing is stored
-- without consent (PRIV-001/003).
create or replace function public.academic_require_profile(p_for_write boolean default false)
returns public.academic_student_profiles
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_profile public.academic_student_profiles;
begin
  if not public.academic_module_enabled() then
    perform public.academic_raise('MODULE_DISABLED', 403, 'My Scores is not available yet');
  end if;

  if p_for_write then
    select * into v_profile from public.academic_student_profiles where user_id = v_user for update;
  else
    select * into v_profile from public.academic_student_profiles where user_id = v_user;
  end if;

  if v_profile.id is null then
    perform public.academic_raise('PROFILE_REQUIRED', 404, 'Create a My Scores profile first');
  end if;

  if p_for_write then
    if v_profile.status <> 'active' then
      perform public.academic_raise('PROFILE_READ_ONLY', 409, 'This profile is ' || v_profile.status);
    end if;
    if not exists (
      select 1 from public.academic_consent_records
      where student_profile_id = v_profile.id and purpose = 'module_processing' and withdrawn_at is null
    ) then
      perform public.academic_raise('CONSENT_REQUIRED', 403, 'Module processing consent is required',
        jsonb_build_object('purpose', 'module_processing'));
    end if;
  end if;

  return v_profile;
end;
$$;

-- What the app needs on opening My Scores (AUTH-001): who the caller is,
-- whether the module is on, and which screen comes next.
--   next_step: unavailable | onboarding | consent | new_school_year | ready
create or replace function public.academic_get_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_enabled boolean := public.academic_module_enabled();
  v_notice text;
  v_user_row public.users;
  v_profile public.academic_student_profiles;
  v_consent public.academic_consent_records;
  v_enrolment public.academic_enrolments;
  v_active_year uuid;
  v_next text;
begin
  select * into v_user_row from public.users where id = v_user;
  select value #>> '{}' into v_notice from public.academic_settings where key = 'consent_notice_version';
  select id into v_active_year from public.academic_years where status = 'active';

  select * into v_profile from public.academic_student_profiles where user_id = v_user;
  if v_profile.id is not null then
    select * into v_consent from public.academic_consent_records
    where student_profile_id = v_profile.id and purpose = 'module_processing' and withdrawn_at is null;
    select * into v_enrolment from public.academic_enrolments
    where student_profile_id = v_profile.id and state = 'active';
  end if;

  v_next := case
    when not v_enabled then 'unavailable'
    when v_profile.id is null then 'onboarding'
    -- A changed notice version is treated as material: re-acknowledge (PRIV-001).
    when v_consent.id is null or v_consent.notice_version is distinct from v_notice then 'consent'
    when v_active_year is not null and (v_enrolment.id is null or v_enrolment.academic_year_id <> v_active_year) then 'new_school_year'
    else 'ready'
  end;

  return jsonb_build_object(
    'user', jsonb_build_object('id', v_user, 'role', v_user_row.role, 'language', v_user_row.language),
    'module_enabled', v_enabled,
    'notice_version', v_notice,
    'next_step', v_next,
    'profile', case when v_profile.id is null or not v_enabled then null else jsonb_build_object(
      'id', v_profile.id,
      'display_name', v_profile.display_name,
      'age_band', v_profile.age_band,
      'status', v_profile.status,
      'consent_state', v_profile.consent_state,
      'version', v_profile.version
    ) end,
    'active_enrolment_id', case when v_enabled then v_enrolment.id end,
    'consent', jsonb_build_object(
      'module_processing', v_consent.id is not null,
      'notice_version', v_consent.notice_version
    )
  );
end;
$$;

revoke all on function public.academic_raise(text, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.academic_actor_role() from public, anon, authenticated;
revoke all on function public.academic_request_hash(text) from public, anon, authenticated;
revoke all on function public.academic_audit(text, text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.academic_deny(text, uuid) from public, anon, authenticated;
revoke all on function public.academic_require_user() from public, anon, authenticated;
revoke all on function public.academic_require_profile(boolean) from public, anon, authenticated;
revoke all on function public.academic_get_session() from public, anon;
grant execute on function public.academic_get_session() to authenticated;

-- ─── Automatic audit of privileged writes ────────────────────────────────────

-- Configuration changes made through the API (admins) or by service-role
-- jobs. Migrations and seeds run with no API caller and are not logged.
create or replace function public.academic_audit_config_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_id uuid;
begin
  if (select auth.uid()) is null and coalesce(auth.role(), '') <> 'service_role' then
    return null;
  end if;

  begin
    v_id := (v_row->>'id')::uuid;
  exception when others then
    v_id := null;
  end;

  perform public.academic_audit(
    'config.' || lower(tg_op),
    regexp_replace(tg_table_name, '^academic_', ''),
    v_id,
    null,
    'success',
    case when v_id is null then v_row->>'key' end
  );
  return null;
end;
$$;

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
    execute format(
      'create or replace trigger %I after insert or update or delete on public.%I
         for each row execute function public.academic_audit_config_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- Role grants and removals on the core users table (PRD §28 "Admin role grants").
create or replace function public.academic_audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.academic_audit(
    'admin.role_change', 'user', new.id, null, 'success',
    old.role::text || ' -> ' || new.role::text
  );
  return null;
end;
$$;

create or replace trigger academic_audit_role_change
  after update of role on public.users
  for each row
  when (old.role is distinct from new.role)
  execute function public.academic_audit_role_change();

revoke all on function public.academic_audit_config_change() from public, anon, authenticated;
revoke all on function public.academic_audit_role_change() from public, anon, authenticated;
