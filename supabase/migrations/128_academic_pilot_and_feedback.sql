-- My Scores: closed pilot and student ratings (REL-001, #46; PRD §36.3/§36.4).
--
-- Pilot: each pilot school or community gets a cohort with a short invite
-- code. While the setting 'pilot_mode' is on, setting up Schooling needs a
-- valid code; students who already have a profile are unaffected. The
-- profile records its cohort, so metrics can be read per cohort. Off by
-- default: create the cohorts first, then switch it on (admin Pilot tab).
--
-- Ratings: 'feedback_submitted' (question usefulness | entry_ease, rating
-- 1-5) joins the usage events; the Metrics tab reads it with the other
-- pilot go/no-go inputs. Like every usage event it is kept only while the
-- student's statistics are on.
--
--   academic_pilot_cohorts             code, name, optional school and cap
--   academic_check_pilot_code(text)    student: is this code valid? (cohort name)
--   academic_create_profile(jsonb)     + pilot_code
--   academic_admin_list_pilot()        ADMIN: mode and cohorts with counts
--   academic_admin_save_pilot_cohort   ADMIN: create (code generated) or update
--   academic_admin_set_pilot_mode      ADMIN: switch the gate, with a reason
--   academic_admin_usage_metrics(uuid) + cohort filter, ratings, pilot block

insert into public.academic_settings (key, value, description) values
  ('pilot_mode', 'false', 'REL-001: when true, setting up Schooling needs a pilot invite code.')
on conflict (key) do nothing;

create table if not exists public.academic_pilot_cohorts (
  id           uuid primary key default gen_random_uuid(),
  code         varchar(6) not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name         varchar(80) not null check (length(btrim(name)) > 0),
  school_id    uuid references public.academic_schools(id),
  max_students integer check (max_students is null or max_students between 1 and 10000),
  active       boolean not null default true,
  version      integer not null default 1,
  created_by   uuid references public.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.academic_pilot_cohorts enable row level security;
revoke all on public.academic_pilot_cohorts from anon, authenticated;

create or replace trigger academic_pilot_cohorts_touch
  before update on public.academic_pilot_cohorts
  for each row execute function public.academic_touch_row();

alter table public.academic_student_profiles
  add column if not exists pilot_cohort_id uuid references public.academic_pilot_cohorts(id) on delete set null;
create index if not exists academic_student_profiles_pilot_idx on public.academic_student_profiles (pilot_cohort_id) where pilot_cohort_id is not null;

-- ─── Codes ───────────────────────────────────────────────────────────────────

-- "ab3-k9q " -> "AB3K9Q". No 0/O/1/I in codes, so they read aloud cleanly.
create or replace function public.academic_pilot_code_normalise(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

-- The active cohort for a code, locked for the capacity check, or an error.
create or replace function public.academic_pilot_cohort_for(p_code text)
returns public.academic_pilot_cohorts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := public.academic_pilot_code_normalise(p_code);
  v_cohort public.academic_pilot_cohorts;
begin
  if v_code = '' then
    perform public.academic_raise('PILOT_CODE_REQUIRED', 403, 'Schooling is in a pilot: enter the code from your school',
      jsonb_build_object('field', 'pilot_code'));
  end if;
  select * into v_cohort from public.academic_pilot_cohorts where code = v_code and active for update;
  if v_cohort.id is null then
    perform public.academic_raise('PILOT_CODE_INVALID', 422, 'This pilot code is not valid', jsonb_build_object('field', 'pilot_code'));
  end if;
  if v_cohort.max_students is not null
     and (select count(*) from public.academic_student_profiles where pilot_cohort_id = v_cohort.id) >= v_cohort.max_students then
    perform public.academic_raise('PILOT_FULL', 409, 'This pilot group is full', jsonb_build_object('field', 'pilot_code'));
  end if;
  return v_cohort;
end;
$$;

create or replace function public.academic_check_pilot_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_cohort public.academic_pilot_cohorts := public.academic_pilot_cohort_for(p_code);
begin
  return jsonb_build_object('code', v_cohort.code, 'name', v_cohort.name);
end;
$$;

-- ─── Onboarding: unchanged from 113 apart from the pilot block ──────────────

create or replace function public.academic_create_profile(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_profile public.academic_student_profiles;
  v_fields jsonb;
  v_grade public.academic_grades;
  v_school jsonb;
  v_year uuid := public.academic_active_year_id();
  v_enrolment uuid;
  v_cohort public.academic_pilot_cohorts;
begin
  if not public.academic_module_enabled() then
    perform public.academic_raise('MODULE_DISABLED', 403, 'My Scores is not available yet');
  end if;

  -- Serialise concurrent onboarding for the same user.
  perform 1 from public.users where id = v_user for update;
  select * into v_profile from public.academic_student_profiles where user_id = v_user;
  if v_profile.id is not null then
    return jsonb_build_object('created', false, 'profile_id', v_profile.id,
      'enrolment_id', (select id from public.academic_enrolments where student_profile_id = v_profile.id and state = 'active'));
  end if;

  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    perform public.academic_invalid('input', 'Profile details are required');
  end if;
  -- Nothing is stored before the privacy notice is accepted (PRIV-001).
  if nullif(p_input->>'notice_version', '') is null then
    perform public.academic_raise('CONSENT_REQUIRED', 403, 'Accept the privacy notice to continue',
      jsonb_build_object('purpose', 'module_processing'));
  end if;
  if v_year is null then
    perform public.academic_raise('CALENDAR_NOT_CONFIGURED', 409, 'The school year is not set up yet');
  end if;

  -- REL-001: a code is required in pilot mode; outside it, a code still tags the cohort.
  if coalesce((public.academic_setting('pilot_mode') #>> '{}')::boolean, false)
     or public.academic_pilot_code_normalise(p_input->>'pilot_code') <> '' then
    v_cohort := public.academic_pilot_cohort_for(p_input->>'pilot_code');
  end if;

  v_fields := public.academic_clean_profile_fields(p_input, true);
  v_grade := public.academic_check_grade(p_input->>'grade_id');
  v_school := public.academic_resolve_school(p_input);

  insert into public.academic_student_profiles (
    user_id, display_name, age_band, consent_state, province_code, district_code, goals, interest_subject_codes, pilot_cohort_id
  ) values (
    v_user,
    v_fields->>'display_name',
    v_fields->>'age_band',
    'active',
    v_fields->>'province_code',
    v_fields->>'district_code',
    nullif(v_fields->'goals', 'null'::jsonb),
    case when jsonb_typeof(v_fields->'interest_subject_codes') = 'array'
      then array(select jsonb_array_elements_text(v_fields->'interest_subject_codes')) end,
    v_cohort.id
  )
  returning * into v_profile;

  perform public.academic_record_consent(v_profile.id, 'module_processing', p_input->>'notice_version');

  v_enrolment := public.academic_open_enrolment(
    v_profile, v_year, v_grade.id, v_school, 1::smallint, false,
    coalesce(p_input->'subjects', public.academic_default_subject_items(v_grade.id))
  );

  perform public.academic_audit('profile.create', 'student_profile', v_profile.id, v_profile.id);
  return jsonb_build_object('created', true, 'profile_id', v_profile.id, 'enrolment_id', v_enrolment);
end;
$$;

-- ─── Admin ───────────────────────────────────────────────────────────────────

create or replace function public.academic_admin_list_pilot()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  return jsonb_build_object(
    'pilot_mode', coalesce((public.academic_setting('pilot_mode') #>> '{}')::boolean, false),
    'cohorts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'code', c.code, 'name', c.name, 'school_id', c.school_id,
        'school_name', s.name_lo, 'max_students', c.max_students, 'active', c.active, 'created_at', c.created_at,
        'students', (select count(*) from public.academic_student_profiles p where p.pilot_cohort_id = c.id)
      ) order by c.created_at)
      from public.academic_pilot_cohorts c left join public.academic_schools s on s.id = c.school_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Input: id? (update), name, school_id?, max_students?, active?
create or replace function public.academic_admin_save_pilot_cohort(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
  v_name text := btrim(coalesce(p_input->>'name', ''));
  v_school uuid;
  v_max integer;
begin
  if jsonb_typeof(p_input) is distinct from 'object' then
    perform public.academic_invalid('input', 'Cohort details are required');
  end if;
  if length(v_name) = 0 or length(v_name) > 80 then
    perform public.academic_invalid('name', 'Name the cohort (up to 80 characters)');
  end if;
  if nullif(p_input->>'school_id', '') is not null then
    select id into v_school from public.academic_schools where id = (p_input->>'school_id')::uuid;
    if v_school is null then perform public.academic_invalid('school_id', 'Unknown school'); end if;
  end if;
  if p_input ? 'max_students' and jsonb_typeof(p_input->'max_students') <> 'null' then
    if jsonb_typeof(p_input->'max_students') <> 'number' or (p_input->>'max_students')::numeric not between 1 and 10000 then
      perform public.academic_invalid('max_students', 'Between 1 and 10,000, or empty for no limit');
    end if;
    v_max := (p_input->>'max_students')::integer;
  end if;

  if nullif(p_input->>'id', '') is null then
    loop
      v_code := (select string_agg(substr(v_alphabet, 1 + floor(random() * 32)::integer, 1), '') from generate_series(1, 6));
      exit when not exists (select 1 from public.academic_pilot_cohorts where code = v_code);
    end loop;
    insert into public.academic_pilot_cohorts (code, name, school_id, max_students, active, created_by)
    values (v_code, v_name, v_school, v_max, coalesce((p_input->>'active')::boolean, true), v_admin)
    returning id into v_id;
    perform public.academic_audit('pilot.cohort_create', 'pilot_cohort', v_id);
  else
    update public.academic_pilot_cohorts
    set name = v_name, school_id = v_school, max_students = v_max,
        active = coalesce((p_input->>'active')::boolean, active)
    where id = (p_input->>'id')::uuid
    returning id into v_id;
    if v_id is null then perform public.academic_raise('NOT_FOUND', 404, 'Cohort not found'); end if;
    perform public.academic_audit('pilot.cohort_update', 'pilot_cohort', v_id);
  end if;
  return public.academic_admin_list_pilot();
end;
$$;

create or replace function public.academic_admin_set_pilot_mode(p_enabled boolean, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  if p_enabled is null then perform public.academic_invalid('enabled', 'On or off'); end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    perform public.academic_invalid('reason', 'Give a reason (5 characters or more)');
  end if;
  if p_enabled and not exists (select 1 from public.academic_pilot_cohorts where active) then
    perform public.academic_raise('PILOT_NO_COHORTS', 409, 'Create an active cohort before switching the pilot gate on');
  end if;
  update public.academic_settings set value = to_jsonb(p_enabled) where key = 'pilot_mode';
  perform public.academic_audit('pilot.mode', 'setting', null, null, 'success',
    left(case when p_enabled then 'on: ' else 'off: ' end || btrim(p_reason), 200));
  return public.academic_admin_list_pilot();
end;
$$;

-- ─── Ratings: catalogue as in 124 plus feedback_submitted ───────────────────

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
    "deletion_cancelled":        {"props": {}},
    "feedback_submitted":        {"props": {"question": ["usefulness", "entry_ease"], "rating": ["1", "2", "3", "4", "5"]}}
  }'::jsonb;
$$;

-- ─── Metrics: 125 plus a cohort filter, ratings and the pilot block ─────────
-- With a cohort, anonymous set-up events cannot be attributed, so
-- onboarding starts and completion are left out (null).

drop function if exists public.academic_admin_usage_metrics();
create or replace function public.academic_admin_usage_metrics(p_cohort uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_now timestamp := now() at time zone 'Asia/Vientiane';
  v_this_week timestamp := date_trunc('week', now() at time zone 'Asia/Vientiane');
  v_this_month timestamp := date_trunc('month', now() at time zone 'Asia/Vientiane');
  v_result jsonb;
begin
  if p_cohort is not null and not exists (select 1 from public.academic_pilot_cohorts where id = p_cohort) then
    perform public.academic_raise('NOT_FOUND', 404, 'Cohort not found');
  end if;

  with cohort as (
    select public.academic_usage_pseudonym(sp.user_id) as pseudonym, sp.id as profile_id
    from public.academic_student_profiles sp where sp.pilot_cohort_id = p_cohort
  ),
  ev as (
    select name, pseudonym, props, grade_code, occurred_at at time zone 'Asia/Vientiane' as at
    from public.academic_usage_events
    where occurred_at > now() - interval '13 months'
      and (p_cohort is null or pseudonym in (select c.pseudonym from cohort c))
  ),
  created as (
    select pseudonym, min(at) as at, (array_agg(props->>'source' order by at))[1] as source
    from ev where name = 'profile_created' and pseudonym is not null group by pseudonym
  ),
  submissions as (
    select pseudonym, at, grade_code, (props->>'duration_ms')::numeric as duration_ms, (props->>'first')::boolean as first
    from ev where name = 'score_entry_submitted' and pseudonym is not null
  ),
  first_submission as (
    select pseudonym, min(at) as at from submissions group by pseudonym
  ),
  ratings as (
    select distinct on (pseudonym, props->>'question') pseudonym, props->>'question' as question, (props->>'rating')::integer as rating
    from ev where name = 'feedback_submitted' and pseudonym is not null and at >= v_now - interval '90 days'
    order by pseudonym, props->>'question', at desc
  ),
  weeks as (
    select generate_series(v_this_week - interval '11 weeks', v_this_week, interval '1 week') as w
  ),
  months as (
    select generate_series(v_this_month - interval '5 months', v_this_month, interval '1 month') as m
  ),
  week_rows as (
    select w,
      (select count(*) from ev where name = 'profile_created' and at >= w and at < w + interval '1 week') as profiles,
      (select count(*) from ev where name = 'onboarding_started' and at >= w and at < w + interval '1 week') as started,
      (select count(*) from ev where name = 'onboarding_completed' and at >= w and at < w + interval '1 week') as completed,
      (select count(*) from created c where c.at >= w and c.at < w + interval '1 week') as cohort_n,
      (select count(*) from created c join first_submission f on f.pseudonym = c.pseudonym
        where c.at >= w and c.at < w + interval '1 week' and f.at <= c.at + interval '7 days') as entered
    from weeks
  ),
  month_rows as (
    select m,
      (select count(distinct pseudonym) from submissions s where s.at >= m and s.at < m + interval '1 month') as recording,
      (select count(distinct pseudonym) from ev where name = 'module_session_started' and pseudonym is not null
        and at >= m and at < m + interval '1 month') as active,
      (select count(*) from (select pseudonym from ev where name = 'dashboard_viewed' and pseudonym is not null
        and at >= m and at < m + interval '1 month' group by pseudonym having count(*) >= 2) d) as dashboard_twice,
      (select count(*) from first_submission f where f.at >= m - interval '1 month' and f.at < m) as second_base,
      (select count(*) from first_submission f where f.at >= m - interval '1 month' and f.at < m
        and exists (select 1 from submissions s where s.pseudonym = f.pseudonym and s.at >= m and s.at < m + interval '1 month')) as second_returned,
      (select count(*) from submissions s where s.at >= m and s.at < m + interval '1 month' and s.duration_ms is not null) as timed,
      (select percentile_cont(0.5) within group (order by s.duration_ms) from submissions s
        where s.at >= m and s.at < m + interval '1 month' and s.duration_ms is not null) as duration_p50
    from months
  ),
  expected as (
    select date_trunc('month', p.end_date::timestamp) as m, e.id as enrolment_id, p.id as period_id
    from public.academic_enrolments e
    join public.academic_reporting_periods p on p.calendar_template_id = e.calendar_template_id and p.period_type = 'monthly'
    where p.sequence >= e.start_period_seq and (e.end_period_seq is null or p.sequence <= e.end_period_seq)
      and p.end_date < v_now::date
      and p.end_date >= (v_this_month - interval '5 months')::date
      and e.created_at::date <= p.end_date
      and (p_cohort is null or e.student_profile_id in (select c.profile_id from cohort c))
      and exists (select 1 from public.academic_consent_records c
                  where c.student_profile_id = e.student_profile_id and c.purpose = 'usage_statistics' and c.withdrawn_at is null)
  ),
  completion as (
    select x.m, count(*) as expected_n,
      count(*) filter (where exists (select 1 from public.academic_score_entries s
        where s.enrolment_id = x.enrolment_id and s.reporting_period_id = x.period_id and s.state = 'submitted')) as submitted_n
    from expected x group by x.m
  ),
  cohort_rows as (
    select m,
      (select count(*) from created c where c.at >= m and c.at < m + interval '1 month') as size,
      m + interval '2 months' <= v_this_month as m1_due,
      m + interval '4 months' <= v_this_month as m3_due,
      (select count(*) from created c where c.at >= m and c.at < m + interval '1 month'
        and exists (select 1 from ev where ev.pseudonym = c.pseudonym and ev.at >= m + interval '1 month' and ev.at < m + interval '2 months')) as m1,
      (select count(*) from created c where c.at >= m and c.at < m + interval '1 month'
        and exists (select 1 from ev where ev.pseudonym = c.pseudonym and ev.at >= m + interval '3 months' and ev.at < m + interval '4 months')) as m3
    from months
  ),
  -- §36.4 go/no-go inputs.
  pilot as (
    select
      (select count(*) from created c where c.at >= v_now - interval '60 days' and c.at <= v_now - interval '7 days') as fe_cohort,
      (select count(*) from created c join first_submission f on f.pseudonym = c.pseudonym
        where c.at >= v_now - interval '60 days' and c.at <= v_now - interval '7 days' and f.at <= c.at + interval '7 days') as fe_entered,
      (select second_base from month_rows where m = v_this_month - interval '1 month') as sm_base,
      (select second_returned from month_rows where m = v_this_month - interval '1 month') as sm_returned,
      (select count(*) from submissions s where s.at >= v_now - interval '30 days' and s.first is false and s.duration_ms is not null) as returning_n,
      (select percentile_cont(0.5) within group (order by s.duration_ms) from submissions s
        where s.at >= v_now - interval '30 days' and s.first is false and s.duration_ms is not null) as returning_p50
  )
  select jsonb_build_object(
    'generated_at', now(),
    'timezone', 'Asia/Vientiane',
    'min_group', 20,
    'cohort_id', p_cohort,
    'tracking_since', (select min(occurred_at) from public.academic_usage_events),
    'statistics', jsonb_build_object(
      'on', public.academic_metric_count((select count(distinct c.student_profile_id) from public.academic_consent_records c
        where c.purpose = 'usage_statistics' and c.withdrawn_at is null
          and (p_cohort is null or c.student_profile_id in (select ch.profile_id from cohort ch)))),
      'off', public.academic_metric_count((select count(*) from public.academic_student_profiles sp
        where (p_cohort is null or sp.pilot_cohort_id = p_cohort) and not exists (
          select 1 from public.academic_consent_records c where c.student_profile_id = sp.id and c.purpose = 'usage_statistics' and c.withdrawn_at is null)))
    ),
    'weeks', (select jsonb_agg(jsonb_build_object(
        'week_start', w::date,
        'profiles_created', public.academic_metric_count(profiles),
        'onboarding_started', case when p_cohort is null then public.academic_metric_count(started) end,
        'onboarding_completed', public.academic_metric_count(completed),
        'onboarding_rate', case when p_cohort is null then public.academic_metric_rate(completed, started) end,
        'first_entry_cohort', public.academic_metric_count(cohort_n),
        'first_entry_rate', public.academic_metric_rate(entered, cohort_n),
        'first_entry_final', w + interval '14 days' <= v_now
      ) order by w) from week_rows),
    'months', (select jsonb_agg(jsonb_build_object(
        'month', to_char(mr.m, 'YYYY-MM'),
        'recording_students', public.academic_metric_count(recording),
        'active_students', public.academic_metric_count(active),
        'dashboard_twice_rate', public.academic_metric_rate(dashboard_twice, active),
        'second_month_base', public.academic_metric_count(second_base),
        'second_month_rate', public.academic_metric_rate(second_returned, second_base),
        'entry_duration_p50_ms', case when timed >= 20 then round(duration_p50) end,
        'period_expected', public.academic_metric_count(coalesce(cp.expected_n, 0)),
        'period_completion_rate', public.academic_metric_rate(coalesce(cp.submitted_n, 0), coalesce(cp.expected_n, 0)),
        'complete', mr.m < v_this_month
      ) order by mr.m) from month_rows mr left join completion cp on cp.m = mr.m),
    'cohorts', (select jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'YYYY-MM'),
        'size', public.academic_metric_count(size),
        'm1_rate', case when m1_due then public.academic_metric_rate(m1, size) end,
        'm3_rate', case when m3_due then public.academic_metric_rate(m3, size) end,
        'm1_due', m1_due, 'm3_due', m3_due
      ) order by m) from cohort_rows),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object(
        'source', source, 'profiles', public.academic_metric_count(n), 'share', public.academic_metric_rate(n, total)
      ) order by n desc), '[]'::jsonb)
      from (select source, count(*) as n, (sum(count(*)) over ())::bigint as total
            from created where at >= v_now - interval '90 days' group by source) s),
    'grades', (select coalesce(jsonb_agg(jsonb_build_object(
        'grade_code', grade_code, 'recording_students', public.academic_metric_count(n)
      ) order by grade_code), '[]'::jsonb)
      from (select grade_code, count(distinct pseudonym) as n from submissions
            where at >= v_this_month and grade_code is not null group by grade_code) g),
    'ratings', (select jsonb_object_agg(q.question, jsonb_build_object(
        'respondents', public.academic_metric_count(coalesce(r.n, 0)),
        'share_4_or_5', public.academic_metric_rate(coalesce(r.high, 0), coalesce(r.n, 0))
      ))
      from (values ('usefulness'), ('entry_ease')) as q(question)
      left join (select question, count(*) as n, count(*) filter (where rating >= 4) as high from ratings group by question) r on r.question = q.question),
    'pilot', (select jsonb_build_object(
        'first_entry_rate', public.academic_metric_rate(fe_entered, fe_cohort),
        'first_entry_cohort', public.academic_metric_count(fe_cohort),
        'second_month_rate', public.academic_metric_rate(coalesce(sm_returned, 0), coalesce(sm_base, 0)),
        'second_month_base', public.academic_metric_count(coalesce(sm_base, 0)),
        'returning_entry_p50_ms', case when returning_n >= 20 then round(returning_p50) end,
        'returning_entries', public.academic_metric_count(returning_n),
        'usefulness_rate', (select public.academic_metric_rate(count(*) filter (where rating >= 4), count(*)) from ratings where question = 'usefulness'),
        'usefulness_respondents', (select public.academic_metric_count(count(*)) from ratings where question = 'usefulness')
      ) from pilot)
  ) into v_result;
  return v_result;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_pilot_code_normalise(text) from public, anon, authenticated;
revoke all on function public.academic_pilot_cohort_for(text) from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array['academic_check_pilot_code(text)', 'academic_admin_list_pilot()', 'academic_admin_save_pilot_cohort(jsonb)',
                           'academic_admin_set_pilot_mode(boolean,text)', 'academic_admin_usage_metrics(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
