-- My Scores: staged launch after the pilot (REL-002 #47; decision ROLLOUT).
--
-- Once the pilot gate is off, Schooling opens to a share of accounts in
-- steps of 10%, 50% and 100%. The share is chosen by a fixed hash of the
-- account id, so an account in at 10% stays in at 50% and 100%. Outside the
-- share a new student sees "Opening soon"; a pilot code still lets them in.
-- Rolling back only stops new set-ups: students who already set up keep
-- access (my_scores_enabled stops everyone). Moving up shows the step's
-- criteria; an admin may move on with one unmet only by confirming it.
-- Default 100%, so applying this migration changes nothing.
--
--   academic_rollout_bucket(uuid)          0-99 per account (server only)
--   academic_rollout_open(uuid)            may this account set up without a code?
--   academic_rollout_criteria()            the checks for the next step (server only)
--   academic_rollout_status()              student: {open}
--   academic_create_profile(jsonb)         + ROLLOUT_NOT_OPEN outside the share
--   academic_admin_list_pilot()            + rollout {percent, since, criteria, history}
--   academic_admin_set_pilot_mode          + switching the gate off restarts the step clock
--   academic_admin_set_rollout(int, text, boolean)  ADMIN: 10 | 50 | 100, with a reason

insert into public.academic_settings (key, value, description) values
  ('rollout', '{"percent": 100, "since": null}',
   'REL-002: share of accounts (10, 50 or 100) that can set up Schooling without a pilot code once the pilot gate is off; since = when the step began.')
on conflict (key) do nothing;

-- ─── Who is in ───────────────────────────────────────────────────────────────

create or replace function public.academic_rollout_bucket(p_user uuid)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (('x' || lpad(substr(md5('academic-rollout:' || p_user::text), 1, 8), 16, '0'))::bit(64)::bigint % 100)::integer;
$$;

create or replace function public.academic_rollout_open(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.academic_setting('rollout')->>'percent')::integer, 100) >= 100
      or public.academic_rollout_bucket(p_user) < coalesce((public.academic_setting('rollout')->>'percent')::integer, 100);
$$;

create or replace function public.academic_rollout_status()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object('open', public.academic_rollout_open(v_user));
end;
$$;

-- ─── Criteria for the next step ──────────────────────────────────────────────

-- met: true | false | null (not enough data, which does not block).
create or replace function public.academic_rollout_criteria()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := nullif(public.academic_setting('rollout')->>'since', '')::timestamptz;
  v_targets jsonb := coalesce(public.academic_setting('slo_targets'), '{}'::jsonb);
  v_min integer := coalesce((v_targets->>'min_calls')::integer, 20);
  v_window jsonb := public.academic_slo_window(greatest(coalesce(v_since, now() - interval '30 days'), now() - interval '30 days'), now());
  v_days integer := floor(extract(epoch from now() - v_since) / 86400);
  v_alerts integer := (select count(*) from public.academic_alerts where status = 'open');
  v_reports integer := (select count(*) from public.academic_problem_reports where priority = 'priority' and status <> 'resolved');
  v_target numeric;
begin
  return jsonb_build_array(
    jsonb_build_object('key', 'days', 'value', v_days, 'target', 7, 'met', case when v_since is null then null else v_days >= 7 end),
    jsonb_build_object('key', 'availability', 'value', v_window->'availability', 'target', v_targets->'availability',
      'met', case when (v_window->>'calls')::integer < v_min or v_window->'availability' = 'null'::jsonb then null
                  else (v_window->>'availability')::numeric >= (v_targets->>'availability')::numeric end),
    jsonb_build_object('key', 'read_p95_ms', 'value', v_window->'read_p95_ms', 'target', v_targets->'read_p95_ms',
      'met', case when v_window->'read_p95_ms' = 'null'::jsonb then null
                  else (v_window->>'read_p95_ms')::numeric <= (v_targets->>'read_p95_ms')::numeric end),
    jsonb_build_object('key', 'write_p95_ms', 'value', v_window->'write_p95_ms', 'target', v_targets->'write_p95_ms',
      'met', case when v_window->'write_p95_ms' = 'null'::jsonb then null
                  else (v_window->>'write_p95_ms')::numeric <= (v_targets->>'write_p95_ms')::numeric end),
    jsonb_build_object('key', 'dashboard_p75_ms', 'value', v_window->'dashboard_p75_ms', 'target', v_targets->'dashboard_p75_ms',
      'met', case when (v_window->>'dashboard_loads')::integer < v_min or v_window->'dashboard_p75_ms' = 'null'::jsonb then null
                  else (v_window->>'dashboard_p75_ms')::numeric <= (v_targets->>'dashboard_p75_ms')::numeric end),
    jsonb_build_object('key', 'open_alerts', 'value', v_alerts, 'target', 0, 'met', v_alerts = 0),
    jsonb_build_object('key', 'priority_reports', 'value', v_reports, 'target', 0, 'met', v_reports = 0)
  );
end;
$$;

-- ─── Onboarding: as in 128 apart from the rollout check ─────────────────────

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
  -- REL-002: outside the open share, only a pilot code lets a new student in.
  elsif not public.academic_rollout_open(v_user) then
    perform public.academic_raise('ROLLOUT_NOT_OPEN', 403, 'Schooling is opening to more students soon',
      jsonb_build_object('field', 'pilot_code'));
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
  v_rollout jsonb := coalesce(public.academic_setting('rollout'), '{"percent": 100, "since": null}'::jsonb);
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
    ), '[]'::jsonb),
    'rollout', jsonb_build_object(
      'percent', coalesce((v_rollout->>'percent')::integer, 100),
      'since', v_rollout->'since',
      'new_students', case when nullif(v_rollout->>'since', '') is null then null else
        (select count(*) from public.academic_student_profiles where created_at >= (v_rollout->>'since')::timestamptz) end,
      'criteria', public.academic_rollout_criteria(),
      'history', coalesce((
        select jsonb_agg(jsonb_build_object('at', e.occurred_at, 'reason', e.reason) order by e.occurred_at desc)
        from (select occurred_at, reason from public.academic_audit_events
              where action = 'rollout.change' order by occurred_at desc limit 10) e
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- As in 128; switching the gate off also restarts the step clock, since a
-- step only counts while new students can actually reach it.
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
  if not p_enabled then
    update public.academic_settings set value = jsonb_set(value, '{since}', to_jsonb(now()))
    where key = 'rollout' and coalesce((value->>'percent')::integer, 100) < 100;
  end if;
  perform public.academic_audit('pilot.mode', 'setting', null, null, 'success',
    left(case when p_enabled then 'on: ' else 'off: ' end || btrim(p_reason), 200));
  return public.academic_admin_list_pilot();
end;
$$;

create or replace function public.academic_admin_set_rollout(p_percent integer, p_reason text, p_confirm_unmet boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_current integer;
  v_unmet text[];
begin
  if p_percent is null or p_percent not in (10, 50, 100) then
    perform public.academic_invalid('percent', 'Choose 10, 50 or 100');
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then
    perform public.academic_invalid('reason', 'Give a reason (5 characters or more)');
  end if;
  select coalesce((value->>'percent')::integer, 100) into v_current
  from public.academic_settings where key = 'rollout' for update;
  if p_percent = v_current then
    perform public.academic_invalid('percent', 'Schooling is already at this step');
  end if;
  -- Moving up: every criterion met or without enough data, or confirmed.
  if p_percent > v_current then
    select array_agg(c->>'key') into v_unmet
    from jsonb_array_elements(public.academic_rollout_criteria()) c
    where c->'met' = 'false'::jsonb;
    if v_unmet is not null and not coalesce(p_confirm_unmet, false) then
      perform public.academic_raise('ROLLOUT_CRITERIA_UNMET', 409, 'Some criteria for the next step are not met',
        jsonb_build_object('unmet', to_jsonb(v_unmet)));
    end if;
  end if;
  update public.academic_settings set value = jsonb_build_object('percent', p_percent, 'since', now()) where key = 'rollout';
  perform public.academic_audit('rollout.change', 'setting', null, null, 'success',
    left(format('%s%% to %s%%', v_current, p_percent)
      || case when v_unmet is not null then ' (not met: ' || array_to_string(v_unmet, ', ') || ')' else '' end
      || ': ' || btrim(p_reason), 200));
  return public.academic_admin_list_pilot();
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['academic_rollout_bucket(uuid)', 'academic_rollout_open(uuid)', 'academic_rollout_criteria()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['academic_rollout_status()', 'academic_admin_set_rollout(integer, text, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
