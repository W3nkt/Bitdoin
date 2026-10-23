-- My Scores — rate limiting and anomaly alerts (BE-008, #26).
--
-- PRIV-007: every module endpoint is rate-limited server-side. Student
-- records are read only through RPCs (OD-01c), so the database can count
-- each call: every RPC charges the caller's "read" bucket, and writes also
-- charge "write". Over the limit -> 429 RATE_LIMITED with retry_after.
-- Direct SELECT on student tables is revoked; RLS stays as a backstop.
--
-- Anomaly alerts: a user touching more than 3 other students' profiles in
-- 24 h, or a burst of denied accesses, opens an academic_alerts row for
-- admins (OPS-002 routes alerts onward).

-- ─── RPC-only reads for student data (OD-01c) ────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_student_profiles', 'academic_enrolments', 'academic_subject_enrolments',
    'academic_score_entries', 'academic_score_lines', 'academic_score_revisions',
    'academic_consent_records', 'academic_analysis_snapshots'
  ] loop
    execute format('revoke select on public.%I from authenticated', t);
  end loop;
end;
$$;

-- ─── Settings ────────────────────────────────────────────────────────────────

insert into public.academic_settings (key, value, description) values
  ('rate_limits', '{"read": {"limit": 120, "seconds": 60}, "write": {"limit": 30, "seconds": 60}}',
   'Per-user request limits for My Scores RPCs (PRIV-007).'),
  ('anomaly_profile_threshold', '3', 'Alert when a user accesses more than this many other student profiles in 24 h.'),
  ('anomaly_denied_threshold', '20', 'Alert when a user is denied access more than this many times in 1 h.')
on conflict (key) do nothing;

-- ─── Counters ────────────────────────────────────────────────────────────────

create table if not exists public.academic_rate_counters (
  user_id      uuid not null,
  bucket       varchar(16) not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, bucket, window_start)
);

alter table public.academic_rate_counters enable row level security;
revoke all on public.academic_rate_counters from anon, authenticated;

create or replace function public.academic_rate_limit(p_bucket text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_rule jsonb := public.academic_setting('rate_limits')->p_bucket;
  v_limit integer := coalesce((v_rule->>'limit')::integer, 0);
  v_seconds integer := greatest(coalesce((v_rule->>'seconds')::integer, 60), 1);
  v_window timestamptz;
  v_count integer;
begin
  if v_user is null or v_limit <= 0 then
    return;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);

  insert into public.academic_rate_counters (user_id, bucket, window_start, count)
  values (v_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start) do update set count = public.academic_rate_counters.count + 1
  returning count into v_count;

  if v_count > v_limit then
    perform public.academic_raise('RATE_LIMITED', 429, 'Too many requests; try again shortly',
      jsonb_build_object('bucket', p_bucket, 'limit', v_limit,
        'retry_after', ceil(extract(epoch from (v_window + make_interval(secs => v_seconds) - now())))::integer));
  end if;
end;
$$;

-- Every RPC resolves its caller here, so every RPC is counted.
create or replace function public.academic_require_user()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null or not exists (select 1 from public.users where id = v_user) then
    perform public.academic_raise('UNAUTHENTICATED', 401, 'A signed-in Bitdoin session is required');
  end if;
  perform public.academic_rate_limit('read');
  return v_user;
end;
$$;

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
    perform public.academic_rate_limit('write');
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

-- Privacy writes (consent, deletion) and onboarding count as writes too.
create or replace function public.academic_own_profile(p_lock boolean default false)
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
  if p_lock then
    perform public.academic_rate_limit('write');
    select * into v_profile from public.academic_student_profiles where user_id = v_user for update;
  else
    select * into v_profile from public.academic_student_profiles where user_id = v_user;
  end if;
  if v_profile.id is null then
    perform public.academic_raise('PROFILE_REQUIRED', 404, 'No My Scores profile exists for this account');
  end if;
  return v_profile;
end;
$$;

-- These now write (rate counters), so they cannot stay STABLE.
alter function public.academic_get_session() volatile;
alter function public.academic_search_schools(text, text, integer) volatile;
alter function public.academic_require_staff(text[]) volatile;

-- ─── Anomaly alerts ──────────────────────────────────────────────────────────

create table if not exists public.academic_alerts (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('multi_profile_access', 'access_denied_burst')),
  actor_user_id uuid,
  details       jsonb not null default '{}'::jsonb,
  status        text not null default 'open' check (status in ('open', 'acknowledged')),
  acknowledged_by uuid references public.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists academic_alerts_open_idx on public.academic_alerts (status, created_at desc);
create index if not exists academic_alerts_actor_idx on public.academic_alerts (actor_user_id, kind, created_at desc);

alter table public.academic_alerts enable row level security;
revoke all on public.academic_alerts from anon, authenticated;
grant select, update on public.academic_alerts to authenticated;
drop policy if exists academic_alerts_admin on public.academic_alerts;
create policy academic_alerts_admin on public.academic_alerts
  for all to authenticated
  using ((select public.academic_admin_session()))
  with check ((select public.academic_admin_session()));

-- Watches audit events as they are written. One open alert per actor and
-- kind per day, so an ongoing pattern does not flood the inbox.
create or replace function public.academic_detect_anomalies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_own uuid;
  v_profiles integer;
  v_denied integer;
  v_profile_limit integer := coalesce((public.academic_setting('anomaly_profile_threshold') #>> '{}')::integer, 3);
  v_denied_limit integer := coalesce((public.academic_setting('anomaly_denied_threshold') #>> '{}')::integer, 20);
begin
  if new.actor_user_id is null then
    return null;
  end if;

  if new.student_profile_id is not null then
    select id into v_own from public.academic_student_profiles where user_id = new.actor_user_id;
    if new.student_profile_id is distinct from v_own then
      select count(distinct student_profile_id) into v_profiles
      from public.academic_audit_events
      where actor_user_id = new.actor_user_id
        and occurred_at > now() - interval '24 hours'
        and student_profile_id is not null
        and student_profile_id is distinct from v_own;
      if v_profiles > v_profile_limit and not exists (
        select 1 from public.academic_alerts
        where actor_user_id = new.actor_user_id and kind = 'multi_profile_access'
          and created_at > now() - interval '24 hours'
      ) then
        insert into public.academic_alerts (kind, actor_user_id, details)
        values ('multi_profile_access', new.actor_user_id,
          jsonb_build_object('profiles_24h', v_profiles, 'threshold', v_profile_limit, 'actor_role', new.actor_role));
      end if;
    end if;
  end if;

  if new.outcome = 'denied' then
    select count(*) into v_denied
    from public.academic_audit_events
    where actor_user_id = new.actor_user_id and outcome = 'denied' and occurred_at > now() - interval '1 hour';
    if v_denied > v_denied_limit and not exists (
      select 1 from public.academic_alerts
      where actor_user_id = new.actor_user_id and kind = 'access_denied_burst'
        and created_at > now() - interval '24 hours'
    ) then
      insert into public.academic_alerts (kind, actor_user_id, details)
      values ('access_denied_burst', new.actor_user_id,
        jsonb_build_object('denied_1h', v_denied, 'threshold', v_denied_limit, 'actor_role', new.actor_role));
    end if;
  end if;
  return null;
end;
$$;

create or replace trigger academic_audit_events_anomalies
  after insert on public.academic_audit_events
  for each row execute function public.academic_detect_anomalies();

-- ─── Housekeeping ────────────────────────────────────────────────────────────

create or replace function public.academic_cleanup_rate_counters()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.academic_rate_counters where window_start < now() - interval '1 day' returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.academic_rate_limit(text) from public, anon, authenticated;
revoke all on function public.academic_require_user() from public, anon, authenticated;
revoke all on function public.academic_require_profile(boolean) from public, anon, authenticated;
revoke all on function public.academic_own_profile(boolean) from public, anon, authenticated;
revoke all on function public.academic_detect_anomalies() from public, anon, authenticated;
revoke all on function public.academic_cleanup_rate_counters() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-cleanup-rate-counters';
select cron.schedule(
  'academic-cleanup-rate-counters',
  '7 * * * *',
  $$select public.academic_cleanup_rate_counters();$$
);
