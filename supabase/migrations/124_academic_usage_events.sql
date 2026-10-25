-- My Scores: usage events (ANL-001, #44; PRD §32.1/§32.3).
--
-- First-party analytics: events go to academic_usage_events through one RPC
-- that checks every event against the catalogue below. No scores, names or
-- free text are accepted: every property is a boolean, a bounded number or a
-- value from a fixed list. Students are identified only by a keyed hash of
-- the account id (salt in academic_private_settings), never the id itself.
--
-- Consent (decision register ANL-001): events are kept only while the
-- student's Schooling consent and the 'usage_statistics' purpose are active.
-- Agreeing to the notice grants 'usage_statistics' once (it is named in the
-- notice); students switch it off in My data. Before a profile exists, only
-- the landing and onboarding-step events are kept, with no identifier at all.
-- Deleting a profile deletes its events; everything is kept 24 months.
--
--   academic_event_catalogue()      event names, properties and allowed values
--   academic_track_events(jsonb)    batch of up to 50 events from the app
--   academic_usage_pseudonym(uuid)  keyed hash (server-side only)

-- ─── Store ───────────────────────────────────────────────────────────────────

create table if not exists public.academic_usage_events (
  id            uuid primary key default gen_random_uuid(), -- event_id from the app: retries are no-ops
  name          varchar(40) not null,
  occurred_at   timestamptz not null,
  received_at   timestamptz not null default now(),
  pseudonym     char(32),                     -- null for pre-profile events
  role          varchar(16) not null,
  locale        varchar(2) not null check (locale in ('lo', 'en')),
  platform      varchar(8) not null check (platform in ('android', 'ios', 'desktop', 'other')),
  app_version   varchar(20) not null,
  grade_code    varchar(16),
  province_code varchar(32),
  props         jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object')
);
create index if not exists academic_usage_events_name_idx on public.academic_usage_events (name, occurred_at);
create index if not exists academic_usage_events_pseudonym_idx on public.academic_usage_events (pseudonym, occurred_at) where pseudonym is not null;
create index if not exists academic_usage_events_occurred_idx on public.academic_usage_events (occurred_at);
alter table public.academic_usage_events enable row level security;
revoke all on public.academic_usage_events from anon, authenticated;

insert into public.academic_private_settings (key, value)
values ('usage_pseudonym_salt', md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text))
on conflict (key) do nothing;

-- ─── Consent purpose and notice ──────────────────────────────────────────────

alter table public.academic_consent_records drop constraint if exists academic_consent_records_purpose_check;
alter table public.academic_consent_records add constraint academic_consent_records_purpose_check check (purpose in (
  'module_processing', 'guardian_sharing', 'ocr_processing', 'ai_processing',
  'email', 'push', 'research_samples', 'keep_photos', 'usage_statistics'
));

update public.academic_settings
set value = value || '["usage_statistics"]'::jsonb
where key = 'consent_purposes_enabled' and not value ? 'usage_statistics';

-- The notice now mentions usage statistics; a new version is material, so
-- every student re-acknowledges it once (academic_get_session → 'consent').
update public.academic_settings set value = '"2026-10-25"' where key = 'consent_notice_version';

-- Unchanged from 112 apart from the last block.
create or replace function public.academic_record_consent(
  p_profile_id uuid,
  p_purpose text,
  p_notice_version text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_current text := public.academic_setting('consent_notice_version') #>> '{}';
  v_existing public.academic_consent_records;
  v_id uuid;
begin
  if not coalesce(public.academic_setting('consent_purposes_enabled') ? p_purpose, false) then
    perform public.academic_invalid('purpose', 'This consent purpose is not available');
  end if;
  if p_notice_version is distinct from v_current then
    perform public.academic_raise('NOTICE_OUTDATED', 409, 'Read and accept the current privacy notice',
      jsonb_build_object('notice_version', v_current));
  end if;

  select * into v_existing from public.academic_consent_records
  where student_profile_id = p_profile_id and purpose = p_purpose and withdrawn_at is null
  for update;

  if v_existing.id is not null and v_existing.notice_version = v_current then
    return v_existing.id;
  end if;
  if v_existing.id is not null then
    update public.academic_consent_records set withdrawn_at = now() where id = v_existing.id;
  end if;

  insert into public.academic_consent_records (
    student_profile_id, grantor_user_id, grantor_role, purpose, scope, notice_version, method
  ) values (
    p_profile_id, (select auth.uid()), 'student', p_purpose, '{}'::jsonb, v_current, 'in_app_checkbox'
  )
  returning id into v_id;

  perform public.academic_audit('consent.grant', 'consent_record', v_id, p_profile_id, 'success', p_purpose);

  -- Usage statistics are named in the notice: agreeing to it grants them the
  -- first time only. Once switched off, only the student turns them back on.
  if p_purpose = 'module_processing' and not exists (
    select 1 from public.academic_consent_records
    where student_profile_id = p_profile_id and purpose = 'usage_statistics'
  ) then
    perform public.academic_record_consent(p_profile_id, 'usage_statistics', v_current);
  end if;

  return v_id;
end;
$$;

-- ─── Catalogue (PRD §32.3, Phase 1) ──────────────────────────────────────────
--
-- props: name → 'bool' | 'count' (0–1000) | 'ms' (0–24 h) | 'period' (a
-- reporting period id, stored as year:type:sequence) | 'status_counts' (line
-- status → count) | an array of allowed values. 'anonymous': may be sent
-- before a profile exists (kept with no identifier). Properties marked
-- 'server' are filled in here and refused from the app.

create or replace function public.academic_event_catalogue()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{
    "module_session_started":    {"props": {}},
    "module_landing_viewed":     {"anonymous": true, "props": {"source": ["academy_menu", "profile_link", "reminder", "direct", "other"]}},
    "onboarding_started":        {"anonymous": true, "props": {}},
    "onboarding_step_completed": {"anonymous": true, "props": {"step": ["notice", "age", "details", "subjects", "goals"], "duration_ms": "ms"}},
    "onboarding_completed":      {"props": {"duration_ms": "ms", "school_listed": "bool"}},
    "profile_created":           {"props": {"source": ["academy_menu", "profile_link", "reminder", "direct", "other"], "age_band": "server"}},
    "enrolment_transitioned":    {"props": {"type": ["started", "promoted", "repeated", "transferred", "left"]}},
    "score_entry_started":       {"props": {"period": "period", "method": ["manual"]}},
    "score_draft_saved":         {"props": {"lines_filled": "count", "offline": "bool"}},
    "score_entry_submitted":     {"props": {"period": "period", "lines_scored": "count", "lines_status_counts": "status_counts", "duration_ms": "ms", "method": ["manual"], "first": "server"}},
    "score_line_edited":         {"props": {"reason_given": "bool"}},
    "dashboard_viewed":          {"props": {"has_trend": "bool"}},
    "chart_table_toggled":       {"props": {"chart_id": ["trend", "subjects", "subject_detail"]}},
    "history_viewed":            {"props": {}},
    "reminder_shown":            {"props": {"code": ["score_reminder.first", "score_reminder.second"]}},
    "reminder_clicked":          {"props": {"code": ["score_reminder.first", "score_reminder.second"]}},
    "export_requested":          {"props": {}},
    "deletion_requested":        {"props": {}},
    "deletion_cancelled":        {"props": {}}
  }'::jsonb;
$$;

create or replace function public.academic_usage_pseudonym(p_user uuid)
returns char(32)
language sql
stable
security definer
set search_path = ''
as $$
  select left(encode(sha256(convert_to(s.value || ':' || p_user::text, 'UTF8')), 'hex'), 32)
  from public.academic_private_settings s where s.key = 'usage_pseudonym_salt';
$$;

-- ─── Ingest ──────────────────────────────────────────────────────────────────

-- Accepts a batch from the app. Invalid events fail the whole batch (the app
-- is wrong, not the user); events without consent are dropped and counted.
-- Returns {accepted, duplicates, dropped, tracking}: tracking=false tells the
-- app to stop sending for this student until consent changes.
create or replace function public.academic_track_events(p_events jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_catalogue jsonb := public.academic_event_catalogue();
  v_profile public.academic_student_profiles;
  v_tracking boolean;
  v_pseudonym char(32);
  v_grade text;
  v_event jsonb;
  v_spec jsonb;
  v_name text;
  v_props jsonb;
  v_key text;
  v_value jsonb;
  v_type jsonb;
  v_out jsonb;
  v_when timestamptz;
  v_period text;
  v_identified boolean;
  v_accepted integer := 0;
  v_duplicates integer := 0;
  v_dropped integer := 0;
begin
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) > 50 then
    perform public.academic_invalid('events', 'Send up to 50 events');
  end if;

  select * into v_profile from public.academic_student_profiles where user_id = v_user;
  v_tracking := v_profile.id is not null
    and public.academic_module_enabled()
    and exists (select 1 from public.academic_consent_records c
                where c.student_profile_id = v_profile.id and c.purpose = 'module_processing' and c.withdrawn_at is null)
    and exists (select 1 from public.academic_consent_records c
                where c.student_profile_id = v_profile.id and c.purpose = 'usage_statistics' and c.withdrawn_at is null);
  if v_tracking then
    v_pseudonym := public.academic_usage_pseudonym(v_user);
    select g.code into v_grade
    from public.academic_enrolments e join public.academic_grades g on g.id = e.grade_id
    where e.student_profile_id = v_profile.id and e.state = 'active'
    limit 1;
  end if;

  for v_event in select value from jsonb_array_elements(p_events) loop
    -- Envelope.
    if jsonb_typeof(v_event) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_event) k where k not in ('event_id', 'name', 'occurred_at', 'locale', 'platform', 'app_version', 'props'))
       or coalesce(v_event->>'event_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(v_event->>'locale', '') not in ('lo', 'en')
       or coalesce(v_event->>'platform', '') not in ('android', 'ios', 'desktop', 'other')
       or coalesce(v_event->>'app_version', '') !~ '^[0-9A-Za-z._-]{1,20}$'
       or coalesce(v_event->>'occurred_at', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' then
      perform public.academic_invalid('events', 'Invalid event envelope');
    end if;
    v_name := v_event->>'name';
    v_spec := v_catalogue->v_name;
    if v_spec is null then
      perform public.academic_invalid('events', 'Unknown event');
    end if;
    v_props := coalesce(v_event->'props', '{}'::jsonb);
    if jsonb_typeof(v_props) <> 'object' then
      perform public.academic_invalid('events', 'Invalid properties');
    end if;

    -- Properties: only catalogued ones, each of its declared kind.
    v_out := '{}'::jsonb;
    v_period := null;
    for v_key, v_value in select key, value from jsonb_each(v_props) loop
      v_type := v_spec->'props'->v_key;
      if v_type is null or v_type = '"server"'::jsonb then
        perform public.academic_invalid('events', 'Unknown property');
      elsif jsonb_typeof(v_type) = 'array' then
        if jsonb_typeof(v_value) <> 'string' or not v_type @> jsonb_build_array(v_value) then
          perform public.academic_invalid('events', 'Value not allowed');
        end if;
      elsif v_type = '"bool"'::jsonb then
        if jsonb_typeof(v_value) <> 'boolean' then perform public.academic_invalid('events', 'Expected true or false'); end if;
      elsif v_type in ('"count"'::jsonb, '"ms"'::jsonb) then
        if jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
           or (v_value #>> '{}')::numeric < 0
           or (v_value #>> '{}')::numeric > (case when v_type = '"ms"'::jsonb then 86400000 else 1000 end) then
          perform public.academic_invalid('events', 'Number out of range');
        end if;
      elsif v_type = '"status_counts"'::jsonb then
        if jsonb_typeof(v_value) <> 'object' or exists (
          select 1 from jsonb_each(v_value) s
          where s.key not in ('scored', 'missing', 'not_applicable', 'exempt')
             or jsonb_typeof(s.value) <> 'number' or (s.value #>> '{}')::numeric not between 0 and 1000
             or (s.value #>> '{}')::numeric <> trunc((s.value #>> '{}')::numeric)) then
          perform public.academic_invalid('events', 'Invalid status counts');
        end if;
      elsif v_type = '"period"'::jsonb then
        if coalesce(v_value #>> '{}', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          perform public.academic_invalid('events', 'Invalid period');
        end if;
        select y.code || ':' || p.period_type || ':' || p.sequence into v_period
        from public.academic_reporting_periods p
        join public.academic_calendar_templates t on t.id = p.calendar_template_id
        join public.academic_years y on y.id = t.academic_year_id
        where p.id = (v_value #>> '{}')::uuid;
        if v_period is null then perform public.academic_invalid('events', 'Unknown period'); end if;
        v_value := to_jsonb(v_period);
      end if;
      v_out := v_out || jsonb_build_object(v_key, v_value);
    end loop;

    -- Consent: identified while tracking; anonymous only before a profile exists.
    v_identified := v_tracking;
    if not v_tracking and not (v_profile.id is null and coalesce((v_spec->>'anonymous')::boolean, false)) then
      v_dropped := v_dropped + 1;
      continue;
    end if;

    -- Server-filled properties.
    if v_identified and v_name = 'profile_created' then
      v_out := v_out || jsonb_build_object('age_band', v_profile.age_band);
    elsif v_identified and v_name = 'score_entry_submitted' then
      v_out := v_out || jsonb_build_object('first', (
        select count(*) <= 1 from public.academic_score_entries s
        join public.academic_enrolments e on e.id = s.enrolment_id
        where e.student_profile_id = v_profile.id and s.state = 'submitted'));
    end if;

    -- Device clocks drift: keep their time unless it is implausible.
    v_when := (v_event->>'occurred_at')::timestamptz;
    if v_when > now() + interval '5 minutes' or v_when < now() - interval '7 days' then
      v_when := now();
    end if;

    insert into public.academic_usage_events (id, name, occurred_at, pseudonym, role, locale, platform, app_version, grade_code, province_code, props)
    values ((v_event->>'event_id')::uuid, v_name, v_when,
      case when v_identified then v_pseudonym end, 'student',
      v_event->>'locale', v_event->>'platform', v_event->>'app_version',
      case when v_identified then v_grade end,
      case when v_identified then v_profile.province_code end,
      v_out)
    on conflict (id) do nothing;
    if found then v_accepted := v_accepted + 1; else v_duplicates := v_duplicates + 1; end if;
  end loop;

  return jsonb_build_object('accepted', v_accepted, 'duplicates', v_duplicates, 'dropped', v_dropped,
    'tracking', v_tracking or v_profile.id is null);
end;
$$;

-- ─── Deletion and retention ──────────────────────────────────────────────────

create or replace function public.academic_usage_events_forget_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academic_usage_events where pseudonym = public.academic_usage_pseudonym(old.user_id);
  return old;
end;
$$;

drop trigger if exists academic_student_profiles_forget_usage on public.academic_student_profiles;
create trigger academic_student_profiles_forget_usage
  after delete on public.academic_student_profiles
  for each row execute function public.academic_usage_events_forget_profile();

create or replace function public.academic_purge_usage_events()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with gone as (delete from public.academic_usage_events where occurred_at < now() - interval '24 months' returning 1)
  select count(*)::integer from gone;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_event_catalogue() from public, anon, authenticated;
revoke all on function public.academic_usage_pseudonym(uuid) from public, anon, authenticated;
revoke all on function public.academic_usage_events_forget_profile() from public, anon, authenticated;
revoke all on function public.academic_purge_usage_events() from public, anon, authenticated;
revoke all on function public.academic_track_events(jsonb) from public, anon;
grant execute on function public.academic_track_events(jsonb) to authenticated;

-- Hourly, so the health check's default 3-hour staleness rule fits.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-purge-usage-events';
select cron.schedule('academic-purge-usage-events', '25 * * * *', $$select public.academic_purge_usage_events();$$);
