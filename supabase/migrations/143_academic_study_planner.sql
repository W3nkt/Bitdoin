-- My Scores — study planner and learning goals (P3-PLAN #54: PLAN-001..004,
-- PLAN-006; PRD §14.8, §19.7).
--
-- Goals: a target for a subject by a month, with a baseline (mean of the
-- last 3 scores) and a feasibility label that guides but never blocks:
--   required gain per month = (target − baseline) / months left, on a 0–10
--   scale (other scales scaled by (max − min) / 10):
--   target ≤ baseline Maintain; ≤ 0.25 Steady; ≤ 0.5 Stretch; > 0.5 Ambitious
--   (with a suggested halfway milestone).
-- Plan: study days (at least one rest day) and minutes per day. Each week
-- (Monday, Vientiane) gets up to 5 tasks drawn from the next-action engine
-- (diagnostics first), topped up with self-study for goal subjects; no
-- session is longer than 30 minutes and no day goes over the commitment.
-- A missed task moves to the next study day once, then asks "skip or keep".
-- No streaks, no penalties. Pausing stops new tasks until the date.
-- Free: one goal; Premium (planner_full): unlimited goals and weekly plans.
-- XP from tasks (PLAN-005) waits for the owner's decision (OD-09).

insert into public.academic_settings (key, value, description) values
  ('planner_rules', '{"minutes_options": [10, 15, 20, 30, 45], "max_session_minutes": 30, "max_tasks": 5, "max_pause_days": 90, "free_goals": 1}',
   'P3-PLAN: commitment options, session length, tasks per week, longest pause and goals on Free.')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_learning_goals (
  id                   uuid primary key default gen_random_uuid(),
  student_profile_id   uuid not null references public.academic_student_profiles(id) on delete cascade,
  enrolment_id         uuid not null references public.academic_enrolments(id) on delete cascade,
  subject_enrolment_id uuid not null references public.academic_subject_enrolments(id) on delete cascade,
  baseline             numeric(6,2) not null,
  target               numeric(6,2) not null,
  target_period_id     uuid not null references public.academic_reporting_periods(id),
  months_remaining     smallint not null check (months_remaining >= 1),
  required_gain        numeric(6,3) not null,
  feasibility          text not null check (feasibility in ('maintain', 'steady', 'stretch', 'ambitious')),
  milestone_value      numeric(6,2),
  milestone_period_id  uuid references public.academic_reporting_periods(id),
  status               text not null default 'active' check (status in ('active', 'archived')),
  version              integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists academic_learning_goals_one_active on public.academic_learning_goals (subject_enrolment_id) where status = 'active';
create index if not exists academic_learning_goals_profile_idx on public.academic_learning_goals (student_profile_id, status);

create table if not exists public.academic_study_plans (
  student_profile_id uuid primary key references public.academic_student_profiles(id) on delete cascade,
  days               smallint[] not null check (cardinality(days) between 1 and 6 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  minutes_per_day    smallint not null,
  paused_until       date,
  starts_on          date not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.academic_study_tasks (
  id                   uuid primary key default gen_random_uuid(),
  student_profile_id   uuid not null references public.academic_student_profiles(id) on delete cascade,
  week_start           date not null,
  scheduled_date       date not null,
  first_date           date not null,
  kind                 text not null check (kind in ('diagnostic', 'practice_set', 'academy_lesson', 'academy_challenge', 'self_study')),
  item_key             text,
  content_item_id      uuid references public.academic_content_items(id) on delete set null,
  diagnostic_id        uuid,
  route                text,
  title_lo             text,
  title_en             text,
  subject_lo           text,
  subject_en           text,
  subject_enrolment_id uuid references public.academic_subject_enrolments(id) on delete set null,
  est_minutes          smallint not null check (est_minutes between 1 and 30),
  state                text not null default 'scheduled' check (state in ('scheduled', 'done', 'skipped')),
  moved_count          smallint not null default 0,
  needs_decision       boolean not null default false,
  done_by              text check (done_by in ('student', 'activity')),
  completed_at         timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists academic_study_tasks_week_idx on public.academic_study_tasks (student_profile_id, week_start, scheduled_date);

do $$
declare
  t text;
begin
  foreach t in array array['academic_learning_goals', 'academic_study_plans', 'academic_study_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_planner_rule(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.academic_setting('planner_rules'), '{}'::jsonb)->p_key;
$$;

create or replace function public.academic_week_start(p_day date)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_day - (extract(isodow from p_day)::integer - 1);
$$;

-- PRD §14.8: the mean of the last 3 scores (or fewer) in the subject.
create or replace function public.academic_goal_baseline(p_subject_enrolment_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(v), 2) from (
    select l.raw_value as v
    from public.academic_score_lines l
    join public.academic_score_entries e on e.id = l.score_entry_id and e.state = 'submitted'
    join public.academic_reporting_periods p on p.id = e.reporting_period_id
    where l.subject_enrolment_id = p_subject_enrolment_id and l.is_current and l.status = 'scored' and l.raw_value is not null
    order by p.start_date desc
    limit 3
  ) last3;
$$;

-- PRD §19.7. Scale is academic_scale_json; months >= 1.
create or replace function public.academic_goal_feasibility(p_baseline numeric, p_target numeric, p_months integer, p_scale jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_factor numeric := greatest(((p_scale->>'max')::numeric - (p_scale->>'min')::numeric) / 10, 0.0001);
  v_step numeric := nullif((p_scale->>'step')::numeric, 0);
  v_gain numeric := (p_target - p_baseline) / p_months;
  v_scaled numeric := v_gain / v_factor;
  v_label text;
  v_half integer := ceil(p_months / 2.0);
  v_milestone numeric;
begin
  v_label := case when p_target <= p_baseline then 'maintain' when v_scaled <= 0.25 then 'steady' when v_scaled <= 0.5 then 'stretch' else 'ambitious' end;
  if v_label = 'ambitious' then
    v_milestone := p_baseline + 0.5 * v_factor * v_half;
    if v_step is not null then
      v_milestone := (p_scale->>'min')::numeric + floor((v_milestone - (p_scale->>'min')::numeric) / v_step) * v_step;
    end if;
    v_milestone := least(v_milestone, p_target);
  end if;
  return jsonb_build_object('required_gain', round(v_gain, 3), 'feasibility', v_label,
    'milestone_value', v_milestone, 'milestone_months', case when v_milestone is not null then v_half end);
end;
$$;

-- The student's active school year, or null.
create or replace function public.academic_planner_enrolment(p_profile_id uuid)
returns public.academic_enrolments
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.academic_enrolments where student_profile_id = p_profile_id and state = 'active' order by created_at desc limit 1;
$$;

-- Checks a goal and works out baseline, months and feasibility (PLAN-001).
create or replace function public.academic_evaluate_goal(p_profile public.academic_student_profiles, p_subject_enrolment_id uuid, p_target numeric, p_target_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enrolment public.academic_enrolments := public.academic_planner_enrolment(p_profile.id);
  v_scale jsonb;
  v_period public.academic_reporting_periods;
  v_current smallint;
  v_months integer;
  v_baseline numeric;
  v_step numeric;
  v_feasibility jsonb;
  v_milestone_period uuid;
begin
  if v_enrolment.id is null or not exists (select 1 from public.academic_subject_enrolments where id = p_subject_enrolment_id and enrolment_id = v_enrolment.id) then
    return jsonb_build_object('deny', true);
  end if;
  v_scale := public.academic_scale_json(v_enrolment.grading_scale_version_id);
  if v_scale->>'family' <> 'numeric_linear' then
    perform public.academic_invalid('subject_enrolment_id', 'Goals need a numeric grading scale');
  end if;
  v_step := nullif((v_scale->>'step')::numeric, 0);
  if p_target is null or p_target < (v_scale->>'min')::numeric or p_target > (v_scale->>'max')::numeric
     or (v_step is not null and mod(p_target - (v_scale->>'min')::numeric, v_step) <> 0) then
    perform public.academic_invalid('target', 'The target must be on the grading scale');
  end if;
  select * into v_period from public.academic_reporting_periods
  where id = p_target_period_id and calendar_template_id = v_enrolment.calendar_template_id and period_type = 'monthly';
  v_current := public.academic_current_period_seq(v_enrolment.calendar_template_id);
  v_months := v_period.sequence - v_current;
  if v_period.id is null or v_months < 1 then
    perform public.academic_invalid('target_period_id', 'Choose a month after this one');
  end if;
  v_baseline := public.academic_goal_baseline(p_subject_enrolment_id);
  if v_baseline is null then
    perform public.academic_invalid('subject_enrolment_id', 'Enter at least one score for this subject first');
  end if;
  v_feasibility := public.academic_goal_feasibility(v_baseline, p_target, v_months, v_scale);
  if v_feasibility->>'milestone_months' is not null then
    select id into v_milestone_period from public.academic_reporting_periods
    where calendar_template_id = v_enrolment.calendar_template_id and period_type = 'monthly'
      and sequence = v_current + (v_feasibility->>'milestone_months')::integer;
  end if;
  return jsonb_build_object(
    'enrolment_id', v_enrolment.id, 'subject_enrolment_id', p_subject_enrolment_id, 'baseline', v_baseline, 'target', p_target,
    'target_period_id', v_period.id, 'months_remaining', v_months, 'scale', v_scale,
    'milestone_period_id', v_milestone_period
  ) || v_feasibility;
end;
$$;

create or replace function public.academic_goal_json(p_goal public.academic_learning_goals)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_goal.id, 'subject_enrolment_id', p_goal.subject_enrolment_id,
    'subject_lo', coalesce(se.custom_name, s.name_lo), 'subject_en', coalesce(se.custom_name, s.name_en),
    'baseline', p_goal.baseline, 'target', p_goal.target, 'months_remaining', p_goal.months_remaining,
    'required_gain', p_goal.required_gain, 'feasibility', p_goal.feasibility,
    'target_period', jsonb_build_object('id', tp.id, 'label_lo', tp.label_lo, 'label_en', tp.label_en),
    'milestone', case when p_goal.milestone_value is not null then jsonb_build_object('value', p_goal.milestone_value,
      'period', jsonb_build_object('id', mp.id, 'label_lo', mp.label_lo, 'label_en', mp.label_en)) end,
    'latest', public.academic_goal_baseline(p_goal.subject_enrolment_id),
    'status', p_goal.status, 'version', p_goal.version, 'created_at', p_goal.created_at
  )
  from public.academic_subject_enrolments se
  left join public.academic_subjects s on s.id = se.subject_id
  join public.academic_reporting_periods tp on tp.id = p_goal.target_period_id
  left join public.academic_reporting_periods mp on mp.id = p_goal.milestone_period_id
  where se.id = p_goal.subject_enrolment_id;
$$;

create or replace function public.academic_task_json(p_task public.academic_study_tasks)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_task.id, 'date', p_task.scheduled_date, 'first_date', p_task.first_date, 'kind', p_task.kind,
    'title_lo', p_task.title_lo, 'title_en', p_task.title_en, 'subject_lo', p_task.subject_lo, 'subject_en', p_task.subject_en,
    'route', p_task.route, 'est_minutes', p_task.est_minutes, 'state', p_task.state, 'moved', p_task.moved_count > 0,
    'needs_decision', p_task.needs_decision, 'done_by', p_task.done_by
  );
$$;

-- A task counts as done when its activity was finished after it was planned
-- (LEARN-007: quiz, practice set, Academy lesson or challenge).
create or replace function public.academic_task_activity_done(p_profile public.academic_student_profiles, p_task public.academic_study_tasks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_task.kind
    when 'diagnostic' then exists (
      select 1 from public.academic_quiz_attempts a
      where a.student_profile_id = p_profile.id and a.status = 'completed' and a.completed_at >= p_task.created_at
        and public.academic_diagnostic_family(a.diagnostic_id) = public.academic_diagnostic_family(p_task.diagnostic_id))
    when 'practice_set' then exists (
      select 1 from public.academic_practice_attempts a join public.academic_content_items c on c.id = p_task.content_item_id
      where a.student_profile_id = p_profile.id and a.status = 'completed' and a.completed_at >= p_task.created_at and a.topic_id = any (c.topic_ids))
    when 'academy_lesson' then exists (
      select 1 from public.premium_lesson_progress lp join public.academic_content_items c on c.id = p_task.content_item_id
      where lp.user_id = p_profile.user_id and lp.lesson_id = c.external_id and lp.completed_at >= p_task.created_at)
    when 'academy_challenge' then exists (
      select 1 from public.premium_weekly_challenge_progress cp join public.academic_content_items c on c.id = p_task.content_item_id
      where cp.user_id = p_profile.user_id and cp.challenge_id = c.external_id and cp.completed_at >= p_task.created_at)
    else false
  end;
$$;

-- The next study day on or after p_from, outside a pause.
create or replace function public.academic_next_study_day(p_plan public.academic_study_plans, p_from date)
returns date
language sql
stable
set search_path = ''
as $$
  select min(d)::date from generate_series(greatest(p_from, coalesce(p_plan.paused_until, p_from)), greatest(p_from, coalesce(p_plan.paused_until, p_from)) + 13, interval '1 day') as g(d)
  where extract(isodow from d)::smallint = any (p_plan.days);
$$;

-- PLAN-003: schedules the rest of p_from's week (Mon–Sun, Vientiane).
create or replace function public.academic_generate_week(p_profile public.academic_student_profiles, p_from date)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_plan public.academic_study_plans;
  v_week date := public.academic_week_start(p_from);
  v_days date[];
  v_sessions integer;
  v_session integer;
  v_slots integer;
  v_cands jsonb := '[]'::jsonb;
  v_fillers jsonb := '[]'::jsonb;
  v_pick jsonb;
  v_index integer;
  v_last text;
  v_count integer := 0;
  v_filler_turn integer := 0;
  v_day date;
  v_i integer;
begin
  select * into v_plan from public.academic_study_plans where student_profile_id = p_profile.id;
  if v_plan.student_profile_id is null then
    return 0;
  end if;
  select array_agg(d::date order by d) into v_days
  from generate_series(greatest(p_from, v_plan.starts_on), v_week + 6, interval '1 day') as g(d)
  where extract(isodow from d)::smallint = any (v_plan.days) and (v_plan.paused_until is null or d >= v_plan.paused_until);
  if v_days is null then
    return 0;
  end if;
  -- ≤ 30 min a session and never more than the daily commitment.
  v_sessions := case when v_plan.minutes_per_day > (public.academic_planner_rule('max_session_minutes'))::integer then 2 else 1 end;
  v_session := least((public.academic_planner_rule('max_session_minutes'))::integer, v_plan.minutes_per_day / v_sessions);
  v_slots := least((public.academic_planner_rule('max_tasks'))::integer
                   - (select count(*)::integer from public.academic_study_tasks where student_profile_id = p_profile.id and week_start = v_week),
                   cardinality(v_days) * v_sessions);
  if v_slots <= 0 then
    return 0;
  end if;

  -- Next actions (diagnostics first, PRD §14.8), not already planned this week.
  select coalesce(jsonb_agg(i order by (i->>'kind') <> 'diagnostic', ord), '[]'::jsonb) into v_cands
  from jsonb_array_elements(public.academic_build_recommendations(p_profile)->'items') with ordinality as x(i, ord)
  where i->>'kind' in ('diagnostic', 'practice_set', 'academy_lesson', 'academy_challenge')
    and not exists (select 1 from public.academic_study_tasks t where t.student_profile_id = p_profile.id and t.week_start = v_week and t.item_key = i->>'key');
  -- Self-study for goal subjects fills the rest.
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'self_study', 'subject_enrolment_id', se.id,
           'subject_lo', coalesce(se.custom_name, s.name_lo), 'subject_en', coalesce(se.custom_name, s.name_en)) order by g.created_at), '[]'::jsonb)
  into v_fillers
  from public.academic_learning_goals g
  join public.academic_subject_enrolments se on se.id = g.subject_enrolment_id
  left join public.academic_subjects s on s.id = se.subject_id
  where g.student_profile_id = p_profile.id and g.status = 'active';

  for v_i in 0 .. v_slots - 1 loop
    v_day := v_days[(v_i / v_sessions) + 1];
    exit when v_day is null;
    v_pick := null;
    -- Alternate subjects when there is a choice.
    if jsonb_array_length(v_cands) > 0 then
      select ord - 1 into v_index from jsonb_array_elements(v_cands) with ordinality as x(c, ord)
      where coalesce(c->'reason'->>'subject_en', '') is distinct from v_last order by ord limit 1;
      v_index := coalesce(v_index, 0);
      v_pick := v_cands->v_index;
      v_cands := v_cands - v_index;
    elsif jsonb_array_length(v_fillers) > 0 then
      v_pick := v_fillers->(v_filler_turn % jsonb_array_length(v_fillers));
      v_filler_turn := v_filler_turn + 1;
    end if;
    exit when v_pick is null;
    insert into public.academic_study_tasks (student_profile_id, week_start, scheduled_date, first_date, kind, item_key, content_item_id, diagnostic_id,
      route, title_lo, title_en, subject_lo, subject_en, subject_enrolment_id, est_minutes)
    values (p_profile.id, v_week, v_day, v_day, v_pick->>'kind', v_pick->>'key', (v_pick->>'content_item_id')::uuid,
      case when v_pick->>'kind' = 'diagnostic' then nullif(split_part(v_pick->>'key', ':', 2), '')::uuid end,
      v_pick->>'route', v_pick->>'title_lo', v_pick->>'title_en',
      coalesce(v_pick->>'subject_lo', v_pick->'reason'->>'subject_lo'), coalesce(v_pick->>'subject_en', v_pick->'reason'->>'subject_en'),
      (v_pick->>'subject_enrolment_id')::uuid,
      greatest(1, least(v_session, coalesce((v_pick->>'est_minutes')::integer, v_session))));
    v_last := coalesce(v_pick->'reason'->>'subject_en', v_pick->>'subject_en');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Done-by-activity, missed tasks moved once then "skip or keep" (PLAN-004),
-- and this week's tasks when the week has none yet.
create or replace function public.academic_planner_tick(p_profile public.academic_student_profiles)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_plan public.academic_study_plans;
  v_today date := public.academic_today();
  v_task public.academic_study_tasks;
begin
  select * into v_plan from public.academic_study_plans where student_profile_id = p_profile.id;
  if v_plan.student_profile_id is null then
    return;
  end if;
  for v_task in select * from public.academic_study_tasks where student_profile_id = p_profile.id and state = 'scheduled' and kind <> 'self_study' loop
    if public.academic_task_activity_done(p_profile, v_task) then
      update public.academic_study_tasks set state = 'done', done_by = 'activity', completed_at = now(), needs_decision = false where id = v_task.id;
    end if;
  end loop;
  update public.academic_study_tasks t
  set scheduled_date = coalesce(public.academic_next_study_day(v_plan, v_today), v_today), moved_count = 1
  where t.student_profile_id = p_profile.id and t.state = 'scheduled' and t.scheduled_date < v_today and t.moved_count = 0;
  update public.academic_study_tasks t set needs_decision = true
  where t.student_profile_id = p_profile.id and t.state = 'scheduled' and t.scheduled_date < v_today and t.moved_count >= 1 and not t.needs_decision;
  -- A new week (or the end of a pause) with nothing planned yet.
  if (v_plan.paused_until is null or v_plan.paused_until <= v_today)
     and not exists (select 1 from public.academic_study_tasks where student_profile_id = p_profile.id and week_start = public.academic_week_start(v_today)) then
    perform public.academic_generate_week(p_profile, v_today);
  end if;
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- The planner screen (S13): goals, plan, this week, last week's review, and a
-- suggested goal when there is none. Moves missed tasks and plans the week.
create or replace function public.academic_get_planner()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_enrolment public.academic_enrolments := public.academic_planner_enrolment(v_profile.id);
  v_full boolean := public.academic_has_feature(v_profile.user_id, 'planner_full');
  v_plan public.academic_study_plans;
  v_today date := public.academic_today();
  v_week date := public.academic_week_start(public.academic_today());
  v_scale jsonb;
  v_current smallint;
  v_attention record;
  v_step numeric;
  v_suggestion jsonb;
begin
  if v_enrolment.id is null then
    perform public.academic_raise('NO_ACTIVE_ENROLMENT', 409, 'There is no school year yet');
  end if;
  if v_full and v_profile.status = 'active' then
    perform public.academic_planner_tick(v_profile);
  end if;
  select * into v_plan from public.academic_study_plans where student_profile_id = v_profile.id;
  v_scale := public.academic_scale_json(v_enrolment.grading_scale_version_id);
  v_current := public.academic_current_period_seq(v_enrolment.calendar_template_id);

  -- S13 empty state: the subject most below the student's own average, one
  -- point (0–10 scale) above its baseline, on the scale's steps.
  if v_scale->>'family' = 'numeric_linear'
     and not exists (select 1 from public.academic_learning_goals where student_profile_id = v_profile.id and status = 'active') then
    select se.id, coalesce(se.custom_name, s.name_lo) as name_lo, coalesce(se.custom_name, s.name_en) as name_en, public.academic_goal_baseline(se.id) as baseline
    into v_attention
    from jsonb_array_elements(coalesce((select outputs->'subjects' from public.academic_analysis_snapshots where id = public.academic_build_snapshot(v_enrolment.id)), '[]'::jsonb)) x
    join public.academic_subject_enrolments se on se.id = (x->>'subject_enrolment_id')::uuid
    left join public.academic_subjects s on s.id = se.subject_id
    where x->'label'->>'value' = 'relatively_lower' and public.academic_goal_baseline(se.id) is not null
    order by (x->'label'->>'mean_deviation')::numeric nulls last
    limit 1;
    if v_attention.id is not null then
      v_step := coalesce(nullif((v_scale->>'step')::numeric, 0), 0.01);
      v_suggestion := jsonb_build_object('subject_enrolment_id', v_attention.id, 'name_lo', v_attention.name_lo, 'name_en', v_attention.name_en,
        'baseline', v_attention.baseline,
        'target', least((v_scale->>'max')::numeric, (v_scale->>'min')::numeric
          + floor((v_attention.baseline + ((v_scale->>'max')::numeric - (v_scale->>'min')::numeric) / 10 - (v_scale->>'min')::numeric) / v_step) * v_step));
    end if;
  end if;

  return jsonb_build_object(
    'entitled', v_full,
    'free_goals', (public.academic_planner_rule('free_goals'))::integer,
    'minutes_options', public.academic_planner_rule('minutes_options'),
    'today', v_today,
    'scale', v_scale,
    'goals', coalesce((select jsonb_agg(public.academic_goal_json(g) order by g.created_at) from public.academic_learning_goals g
                       where g.student_profile_id = v_profile.id and g.status = 'active'), '[]'::jsonb),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('subject_enrolment_id', se.id, 'name_lo', coalesce(se.custom_name, s.name_lo), 'name_en', coalesce(se.custom_name, s.name_en),
        'baseline', public.academic_goal_baseline(se.id)) order by se.display_order, s.code)
      from public.academic_subject_enrolments se left join public.academic_subjects s on s.id = se.subject_id
      where se.enrolment_id = v_enrolment.id and (se.end_period_seq is null or se.end_period_seq >= v_current)
    ), '[]'::jsonb),
    'periods', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'label_lo', p.label_lo, 'label_en', p.label_en, 'months', p.sequence - v_current) order by p.sequence)
      from public.academic_reporting_periods p
      where p.calendar_template_id = v_enrolment.calendar_template_id and p.period_type = 'monthly' and p.sequence > v_current
    ), '[]'::jsonb),
    'plan', case when v_plan.student_profile_id is not null then jsonb_build_object(
      'days', to_jsonb(v_plan.days), 'minutes_per_day', v_plan.minutes_per_day,
      'paused_until', case when v_plan.paused_until > v_today then v_plan.paused_until end, 'starts_on', v_plan.starts_on) end,
    'week', case when v_plan.student_profile_id is not null and v_full then jsonb_build_object(
      'week_start', v_week,
      'tasks', coalesce((select jsonb_agg(public.academic_task_json(t) order by t.scheduled_date, t.created_at) from public.academic_study_tasks t
                         where t.student_profile_id = v_profile.id and (t.week_start = v_week or (t.state = 'scheduled' and t.scheduled_date >= v_week))), '[]'::jsonb),
      'decisions', coalesce((select jsonb_agg(public.academic_task_json(t) order by t.scheduled_date) from public.academic_study_tasks t
                             where t.student_profile_id = v_profile.id and t.needs_decision and t.state = 'scheduled'), '[]'::jsonb)) end,
    'review', case when v_full then (
      select jsonb_build_object('week_start', v_week - 7, 'planned', count(*), 'done', count(*) filter (where state = 'done'),
        'minutes', coalesce(sum(est_minutes) filter (where state = 'done'), 0),
        'topics', coalesce(jsonb_agg(distinct jsonb_build_object('lo', title_lo, 'en', title_en)) filter (where state = 'done' and kind <> 'self_study'), '[]'::jsonb))
      from public.academic_study_tasks where student_profile_id = v_profile.id and week_start = v_week - 7
      having count(*) > 0) end,
    'suggestion', v_suggestion
  );
end;
$$;

create or replace function public.academic_preview_goal(p_subject_enrolment_id uuid, p_target numeric, p_target_period_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_eval jsonb := public.academic_evaluate_goal(v_profile, p_subject_enrolment_id, p_target, p_target_period_id);
begin
  if v_eval ? 'deny' then
    return public.academic_deny('subject_enrolment', p_subject_enrolment_id);
  end if;
  return v_eval - 'scale' - 'enrolment_id';
end;
$$;

-- p_input: {id?, subject_enrolment_id, target, target_period_id}. A new goal
-- beyond the Free limit needs planner_full.
create or replace function public.academic_save_goal(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_id uuid := nullif(p_input->>'id', '')::uuid;
  v_goal public.academic_learning_goals;
  v_subject uuid := nullif(p_input->>'subject_enrolment_id', '')::uuid;
  v_eval jsonb;
begin
  if v_id is not null then
    select * into v_goal from public.academic_learning_goals where id = v_id and student_profile_id = v_profile.id and status = 'active';
    if v_goal.id is null then
      return public.academic_deny('learning_goal', v_id);
    end if;
    v_subject := v_goal.subject_enrolment_id;
  end if;
  v_eval := public.academic_evaluate_goal(v_profile, v_subject, nullif(p_input->>'target', '')::numeric, nullif(p_input->>'target_period_id', '')::uuid);
  if v_eval ? 'deny' then
    return public.academic_deny('subject_enrolment', v_subject);
  end if;

  if v_goal.id is null then
    if exists (select 1 from public.academic_learning_goals where subject_enrolment_id = v_subject and status = 'active') then
      perform public.academic_invalid('subject_enrolment_id', 'This subject already has a goal');
    end if;
    if (select count(*) from public.academic_learning_goals where student_profile_id = v_profile.id and status = 'active') >= (public.academic_planner_rule('free_goals'))::integer
       and not public.academic_has_feature(v_profile.user_id, 'planner_full') then
      perform public.academic_raise('ENTITLEMENT_REQUIRED', 403, 'More goals need Academy Premium',
        jsonb_build_object('feature', 'planner_full', 'upgrade', 'academy_premium'));
    end if;
    insert into public.academic_learning_goals (student_profile_id, enrolment_id, subject_enrolment_id, baseline, target, target_period_id, months_remaining,
      required_gain, feasibility, milestone_value, milestone_period_id)
    values (v_profile.id, (v_eval->>'enrolment_id')::uuid, v_subject, (v_eval->>'baseline')::numeric, (v_eval->>'target')::numeric, (v_eval->>'target_period_id')::uuid,
      (v_eval->>'months_remaining')::smallint, (v_eval->>'required_gain')::numeric, v_eval->>'feasibility', (v_eval->>'milestone_value')::numeric,
      (v_eval->>'milestone_period_id')::uuid)
    returning * into v_goal;
  else
    -- Edits keep the original baseline (the starting point the goal was set from).
    v_eval := v_eval || public.academic_goal_feasibility(v_goal.baseline, (v_eval->>'target')::numeric, (v_eval->>'months_remaining')::integer, v_eval->'scale');
    update public.academic_learning_goals
    set target = (v_eval->>'target')::numeric, target_period_id = (v_eval->>'target_period_id')::uuid, months_remaining = (v_eval->>'months_remaining')::smallint,
        required_gain = (v_eval->>'required_gain')::numeric, feasibility = v_eval->>'feasibility', milestone_value = (v_eval->>'milestone_value')::numeric,
        milestone_period_id = case when v_eval->>'milestone_value' is null then null else (v_eval->>'milestone_period_id')::uuid end,
        version = version + 1, updated_at = now()
    where id = v_goal.id returning * into v_goal;
  end if;
  return public.academic_goal_json(v_goal);
end;
$$;

create or replace function public.academic_archive_goal(p_goal_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_goal public.academic_learning_goals;
begin
  update public.academic_learning_goals set status = 'archived', updated_at = now()
  where id = p_goal_id and student_profile_id = v_profile.id and status = 'active' returning * into v_goal;
  if v_goal.id is null then
    return public.academic_deny('learning_goal', p_goal_id);
  end if;
  return public.academic_goal_json(v_goal);
end;
$$;

-- PLAN-002/006: study days (1–6, ISO Mon = 1) and minutes a day. A change
-- applies from tomorrow: tasks not started after today are planned again.
create or replace function public.academic_save_plan(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_days smallint[];
  v_minutes smallint := nullif(p_input->>'minutes_per_day', '')::smallint;
  v_today date := public.academic_today();
  v_existing boolean;
begin
  perform public.academic_require_feature(v_profile.user_id, 'planner_full');
  select array_agg(distinct d::smallint order by d::smallint) into v_days from jsonb_array_elements_text(coalesce(p_input->'days', '[]'::jsonb)) as x(d);
  if v_days is null or cardinality(v_days) not between 1 and 6 or not (v_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]) then
    perform public.academic_invalid('days', 'Choose 1 to 6 study days; keep at least one rest day');
  end if;
  if v_minutes is null or not (public.academic_planner_rule('minutes_options') @> to_jsonb(v_minutes)) then
    perform public.academic_invalid('minutes_per_day', 'Choose one of the minute options');
  end if;
  v_existing := exists (select 1 from public.academic_study_plans where student_profile_id = v_profile.id);
  insert into public.academic_study_plans (student_profile_id, days, minutes_per_day, starts_on)
  values (v_profile.id, v_days, v_minutes, v_today)
  on conflict (student_profile_id) do update set days = excluded.days, minutes_per_day = excluded.minutes_per_day, updated_at = now();
  if v_existing then
    delete from public.academic_study_tasks
    where student_profile_id = v_profile.id and state = 'scheduled' and scheduled_date > v_today and moved_count = 0
      and week_start = public.academic_week_start(v_today);
    perform public.academic_generate_week(v_profile, v_today + 1);
  end if;
  return public.academic_get_planner();
end;
$$;

-- PLAN-006: no tasks until p_until (at most 90 days ahead); null resumes.
create or replace function public.academic_pause_plan(p_until date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_today date := public.academic_today();
begin
  if not exists (select 1 from public.academic_study_plans where student_profile_id = v_profile.id) then
    perform public.academic_raise('NOT_FOUND', 404, 'There is no plan to pause');
  end if;
  if p_until is not null and (p_until <= v_today or p_until > v_today + (public.academic_planner_rule('max_pause_days'))::integer) then
    perform public.academic_invalid('paused_until', 'Choose a date within the next 90 days');
  end if;
  update public.academic_study_plans set paused_until = p_until, updated_at = now() where student_profile_id = v_profile.id;
  if p_until is not null then
    delete from public.academic_study_tasks
    where student_profile_id = v_profile.id and state = 'scheduled' and scheduled_date >= v_today and scheduled_date < p_until;
  else
    perform public.academic_generate_week(v_profile, v_today);
  end if;
  return public.academic_get_planner();
end;
$$;

-- PLAN-004: done, undo, skip, or keep a task that was missed twice.
create or replace function public.academic_update_task(p_task_id uuid, p_action text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_task public.academic_study_tasks;
  v_plan public.academic_study_plans;
begin
  select * into v_task from public.academic_study_tasks where id = p_task_id and student_profile_id = v_profile.id;
  if v_task.id is null then
    return public.academic_deny('study_task', p_task_id);
  end if;
  if p_action = 'done' then
    update public.academic_study_tasks set state = 'done', done_by = 'student', completed_at = now(), needs_decision = false where id = v_task.id;
  elsif p_action = 'undo' then
    update public.academic_study_tasks set state = 'scheduled', done_by = null, completed_at = null where id = v_task.id;
  elsif p_action = 'skip' then
    update public.academic_study_tasks set state = 'skipped', needs_decision = false where id = v_task.id;
  elsif p_action = 'keep' and v_task.needs_decision then
    select * into v_plan from public.academic_study_plans where student_profile_id = v_profile.id;
    update public.academic_study_tasks
    set scheduled_date = coalesce(public.academic_next_study_day(v_plan, public.academic_today()), public.academic_today()),
        moved_count = moved_count + 1, needs_decision = false
    where id = v_task.id;
  else
    perform public.academic_invalid('action', 'Unknown action');
  end if;
  return public.academic_task_json((select t from public.academic_study_tasks t where t.id = v_task.id));
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_planner_rule(text)', 'academic_goal_baseline(uuid)', 'academic_goal_feasibility(numeric,numeric,integer,jsonb)',
    'academic_planner_enrolment(uuid)', 'academic_evaluate_goal(public.academic_student_profiles,uuid,numeric,uuid)',
    'academic_goal_json(public.academic_learning_goals)', 'academic_task_json(public.academic_study_tasks)',
    'academic_task_activity_done(public.academic_student_profiles,public.academic_study_tasks)',
    'academic_next_study_day(public.academic_study_plans,date)', 'academic_generate_week(public.academic_student_profiles,date)',
    'academic_planner_tick(public.academic_student_profiles)', 'academic_week_start(date)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_get_planner()', 'academic_preview_goal(uuid,numeric,uuid)', 'academic_save_goal(jsonb)', 'academic_archive_goal(uuid)',
    'academic_save_plan(jsonb)', 'academic_pause_plan(date)', 'academic_update_task(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
