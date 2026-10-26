-- My Scores — study tasks earn Academy XP, opt-in and non-punitive
-- (P3-PLAN #54: PLAN-005; owner decision OD-09, 2026-10-26).
--
-- A student who switches it on gets 10 XP the first time each planner task
-- is done (by them or by finishing its quiz, practice set or Academy item).
-- XP is written to the Academy's learning activity attempts (activity
-- 'study_task'), so it shows in the Academy dashboard, leaderboard and
-- weekly tracker like Play & Learn XP. Nothing is ever taken back: undoing
-- a task, missing a day or switching XP off keeps what was earned. Academy
-- streaks are not touched.

alter table public.premium_learning_activity_attempts drop constraint if exists premium_learning_activity_attempts_activity_type_check;
alter table public.premium_learning_activity_attempts add constraint premium_learning_activity_attempts_activity_type_check
  check (activity_type in ('brain_sprint', 'word_match', 'ai_roleplay', 'study_task'));

alter table public.academic_study_plans add column if not exists xp_opt_in boolean not null default false;
alter table public.academic_study_tasks add column if not exists xp_awarded smallint not null default 0;

update public.academic_settings set value = value || '{"xp_per_task": 10}'::jsonb where key = 'planner_rules' and not (value ? 'xp_per_task');

-- The first time a task becomes done, with XP switched on: one award.
create or replace function public.academic_study_task_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_xp integer := coalesce((public.academic_planner_rule('xp_per_task'))::integer, 10);
begin
  if new.state = 'done' and old.state <> 'done' and old.xp_awarded = 0
     and exists (select 1 from public.academic_study_plans where student_profile_id = new.student_profile_id and xp_opt_in) then
    select user_id into v_user from public.academic_student_profiles where id = new.student_profile_id;
    insert into public.premium_learning_activity_attempts (user_id, activity_type, score, total, xp_earned, metadata, activity_date)
    values (v_user, 'study_task', 1, 1, least(v_xp, 20), jsonb_build_object('task_id', new.id, 'kind', new.kind, 'source', 'schooling'),
            timezone('Asia/Vientiane', now())::date);
    new.xp_awarded := least(v_xp, 20);
  end if;
  return new;
end;
$$;

drop trigger if exists academic_study_task_xp on public.academic_study_tasks;
create trigger academic_study_task_xp
before update of state on public.academic_study_tasks
for each row execute function public.academic_study_task_xp();

-- PLAN-005: the student's choice; on or off at any time.
create or replace function public.academic_set_planner_xp(p_on boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
begin
  update public.academic_study_plans set xp_opt_in = coalesce(p_on, false), updated_at = now() where student_profile_id = v_profile.id;
  if not found then
    perform public.academic_raise('NOT_FOUND', 404, 'Start a plan first');
  end if;
  return public.academic_get_planner();
end;
$$;

-- Task and plan JSON carry XP (migration 143 with xp_awarded and xp_opt_in).
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
    'needs_decision', p_task.needs_decision, 'done_by', p_task.done_by, 'xp', p_task.xp_awarded
  );
$$;

-- The planner view with the XP choice (migration 143, plus xp_opt_in and xp_per_task).
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
      'xp_opt_in', v_plan.xp_opt_in, 'xp_per_task', (public.academic_planner_rule('xp_per_task'))::integer,
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

revoke all on function public.academic_study_task_xp() from public, anon, authenticated;
revoke all on function public.academic_set_planner_xp(boolean) from public, anon;
grant execute on function public.academic_set_planner_xp(boolean) to authenticated;
