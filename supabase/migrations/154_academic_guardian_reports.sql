-- My Scores — monthly guardian reports, the correction window and link limits
-- (P3-PAR #52, piece 3a: PARENT-006; PRD §14.9.3–14.9.4).
--
-- Guardians see a month only after the student's 3-day correction window:
-- submitted more than 3 days ago and not corrected in the last 3 days. Drafts
-- are never shown. A student has at most 4 guardians; a guardian at most 6
-- children.
--
-- Once a month's window has passed, a daily job writes the guardian a report
-- for it, frozen at that moment, in seven sections (PRD §14.9.3): reporting
-- period; subjects recorded (missing listed without blame); score changes
-- ("about the same" for small ones); relatively stronger subjects with
-- reasons; areas that need support with reasons and confidence ("needs
-- attention", never "weak"); learning activities completed; and two or three
-- supportive next steps for the family. Reports need Academy Premium
-- ('parent_reports') on the guardian's or the child's account, and the child
-- sharing scores. They are read in the app while the link is active; e-mail
-- delivery (NOTIF-002) comes next.

update public.academic_settings
set value = value || '{"max_guardians": 4, "max_children": 6, "correction_days": 3, "report_max_age_days": 45}'::jsonb
where key = 'guardian_rules' and not value ? 'correction_days';

alter table public.academic_notifications drop constraint if exists academic_notifications_category_check;
alter table public.academic_notifications add constraint academic_notifications_category_check check (category in ('score_reminder', 'guardian_link', 'guardian_report'));

-- ─── The correction window ───────────────────────────────────────────────────

-- Periods of an enrolment a guardian may see now.
create or replace function public.academic_guardian_visible_periods(p_enrolment_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(e.reporting_period_id), '{}')
  from public.academic_score_entries e
  where e.enrolment_id = p_enrolment_id and e.state = 'submitted'
    and e.submitted_at <= now() - make_interval(days => coalesce((public.academic_guardian_rule('correction_days'))::integer, 3))
    and not exists (
      select 1 from public.academic_score_revisions r join public.academic_score_lines l on l.id = r.score_line_id
      where l.score_entry_id = e.id
        and r.created_at > now() - make_interval(days => coalesce((public.academic_guardian_rule('correction_days'))::integer, 3)));
$$;

-- The scores section for a guardian: only visible months; per subject the
-- latest, change and average from those months; labels and trends only when
-- every recorded month is visible (otherwise they could reflect hidden ones).
create or replace function public.academic_guardian_scores(p_enrolment public.academic_enrolments, p_snapshot public.academic_analysis_snapshots)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (select public.academic_guardian_visible_periods(p_enrolment.id) as ids),
  all_visible as (
    select not exists (select 1 from jsonb_array_elements(coalesce(p_snapshot.outputs->'periods', '[]'::jsonb)) p, visible v
                       where coalesce((p->>'recorded')::integer, 0) > 0 and not ((p->>'period_id')::uuid = any(v.ids))) as ok
  )
  select jsonb_build_object(
    'scale', public.academic_scale_json(p_enrolment.grading_scale_version_id) - 'id' - 'code' - 'version' - 'levels',
    'hidden_recent', not (select ok from all_visible),
    'months', coalesce((select jsonb_agg(jsonb_build_object('period_id', p->>'period_id', 'label_en', p->>'label_en', 'label_lo', p->>'label_lo', 'average', p->'mean',
        'change', p->'change'->'value', 'recorded', p->'recorded') order by (p->>'sequence')::integer)
      from jsonb_array_elements(coalesce(p_snapshot.outputs->'periods', '[]'::jsonb)) p, visible v
      where (p->>'period_id')::uuid = any(v.ids)), '[]'::jsonb),
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'code', s->>'code',
        'latest', pts.vals[array_length(pts.vals, 1)], 'previous', pts.vals[array_length(pts.vals, 1) - 1],
        'change', case when array_length(pts.vals, 1) >= 2 then round(pts.vals[array_length(pts.vals, 1)] - pts.vals[array_length(pts.vals, 1) - 1], 2) end,
        'average', (select round(avg(x), 2) from unnest(pts.vals) x),
        'number_of_scores', coalesce(array_length(pts.vals, 1), 0),
        'label', case when (select ok from all_visible) then s->'label'->>'value' end,
        'label_reason', case when (select ok from all_visible) then jsonb_build_object('n', s->'label'->'n', 'above', s->'label'->'periods_above', 'below', s->'label'->'periods_below', 'confidence', s->'label'->'confidence') end,
        'trend', case when (select ok from all_visible) then s->'trend'->>'value' end)
        order by (s->>'display_order')::integer, s->>'name_en')
      from jsonb_array_elements(coalesce(p_snapshot.outputs->'subjects', '[]'::jsonb)) s
      cross join lateral (
        select array(select (pt->>'value')::numeric from jsonb_array_elements(coalesce(s->'series', '[]'::jsonb)) pt, visible v
                     where pt->>'status' = 'scored' and (pt->>'period_id')::uuid = any(v.ids) order by (pt->>'sequence')::integer) as vals
      ) pts
      where coalesce((s->>'active')::boolean, true)), '[]'::jsonb)
  );
$$;

-- Supportive suggestions from a scores section (PARENT-005, §14.9.3 section 7).
create or replace function public.academic_guardian_suggestions(p_scores jsonb, p_limit integer default 3)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(v order by o), '[]'::jsonb) from (
    select o, v from (
      select 1 as o, jsonb_build_object('kind', 'ask_hardest', 'subject_en', s->>'name_en', 'subject_lo', s->>'name_lo') as v
      from jsonb_array_elements(coalesce(p_scores->'subjects', '[]'::jsonb)) s where s->>'label' = 'relatively_lower'
      union all
      select 2, jsonb_build_object('kind', 'notice_progress', 'subject_en', s->>'name_en', 'subject_lo', s->>'name_lo')
      from jsonb_array_elements(coalesce(p_scores->'subjects', '[]'::jsonb)) s where s->>'trend' = 'improving'
      union all
      select 3, jsonb_build_object('kind', 'check_in')
      where (select (m->>'change')::numeric from jsonb_array_elements(coalesce(p_scores->'months', '[]'::jsonb)) with ordinality t(m, i) order by i desc limit 1) < 0
      union all
      select 4, jsonb_build_object('kind', 'start_together') where jsonb_array_length(coalesce(p_scores->'months', '[]'::jsonb)) = 0
      union all
      select 5, jsonb_build_object('kind', 'ask_support')
    ) x order by o limit p_limit
  ) y;
$$;

-- Unchanged from 153 apart from the correction window and 'reports'.
create or replace function public.academic_guardian_child(p_link_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_link public.academic_guardian_links;
  v_profile public.academic_student_profiles;
  v_enrolment public.academic_enrolments;
  v_snapshot public.academic_analysis_snapshots;
  v_scores jsonb;
  v_week date := date_trunc('week', public.academic_today())::date;
begin
  select l.* into v_link from public.academic_guardian_links l
  join public.academic_student_profiles p on p.id = l.student_profile_id
  where l.id = p_link_id and l.guardian_user_id = v_user and l.status = 'active' and p.consent_state = 'active';
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  select * into v_profile from public.academic_student_profiles where id = v_link.student_profile_id;
  v_enrolment := public.academic_planner_enrolment(v_profile.id);

  if (v_link.scopes->>'scores')::boolean and v_enrolment.id is not null then
    select * into v_snapshot from public.academic_analysis_snapshots where id = public.academic_build_snapshot(v_enrolment.id);
    v_scores := public.academic_guardian_scores(v_enrolment, v_snapshot);
  end if;

  perform public.academic_audit('guardian.view', 'guardian_link', v_link.id, v_profile.id, 'success', left((select string_agg(k, ',') from jsonb_each_text(v_link.scopes) j(k, v) where v = 'true'), 200));
  return jsonb_build_object(
    'link_id', v_link.id, 'name', v_profile.display_name, 'relationship', v_link.relationship, 'scopes', v_link.scopes,
    'grade_en', (select label_en from public.academic_grades where id = v_enrolment.grade_id),
    'grade_lo', (select label_lo from public.academic_grades where id = v_enrolment.grade_id),
    'school_year', (select code from public.academic_years where id = v_enrolment.academic_year_id),
    'scores', v_scores,
    'suggestions', case when v_scores is null then '[]'::jsonb else public.academic_guardian_suggestions(v_scores) end,
    'plan', case when (v_link.scopes->>'plan')::boolean then jsonb_build_object(
      'goals', coalesce((select jsonb_agg(public.academic_goal_json(g) - 'id' - 'subject_enrolment_id' - 'version' order by g.created_at)
                         from public.academic_learning_goals g where g.student_profile_id = v_profile.id and g.status = 'active'), '[]'::jsonb),
      'week', (select jsonb_build_object('done', count(*) filter (where t.state = 'done'), 'total', count(*))
               from public.academic_study_tasks t where t.student_profile_id = v_profile.id and t.week_start = v_week),
      'has_plan', exists (select 1 from public.academic_study_plans where student_profile_id = v_profile.id)) end,
    'careers', case when (v_link.scopes->>'careers')::boolean then jsonb_build_object(
      'interests', (select a.area_scores->'areas' from public.academic_career_assessments a where a.student_profile_id = v_profile.id and a.status = 'completed' order by a.completed_at desc limit 1),
      'saved', coalesce((select jsonb_agg(jsonb_build_object('title_en', c.published->>'title_en', 'title_lo', c.published->>'title_lo') order by l.created_at)
                         from public.academic_career_shortlist l join public.academic_career_content c on c.kind = 'career' and c.slug = l.career_slug and c.published is not null
                         where l.student_profile_id = v_profile.id), '[]'::jsonb)) end,
    'goals_text', case when (v_link.scopes->>'goals_text')::boolean then v_profile.goals end,
    'reports_entitled', public.academic_guardian_reports_entitled(v_link),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'label_en', r.content->'period'->>'label_en', 'label_lo', r.content->'period'->>'label_lo',
        'generated_at', r.generated_at, 'read', r.read_at is not null) order by r.generated_at desc)
      from public.academic_guardian_reports r where r.link_id = v_link.id), '[]'::jsonb)
  );
end;
$$;

-- ─── Link limits (§14.9.4) ───────────────────────────────────────────────────

create or replace function public.academic_guardian_link_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.academic_guardian_links where student_profile_id = new.student_profile_id and status <> 'removed')
     >= coalesce((public.academic_guardian_rule('max_guardians'))::integer, 4) then
    perform public.academic_raise('GUARDIAN_LIMIT_STUDENT', 409, 'This student already has 4 parents or guardians linked');
  end if;
  if (select count(*) from public.academic_guardian_links where guardian_user_id = new.guardian_user_id and status <> 'removed')
     >= coalesce((public.academic_guardian_rule('max_children'))::integer, 6) then
    perform public.academic_raise('GUARDIAN_LIMIT_CHILDREN', 409, 'You can follow at most 6 children');
  end if;
  return new;
end;
$$;

drop trigger if exists academic_guardian_link_limits on public.academic_guardian_links;
create trigger academic_guardian_link_limits before insert on public.academic_guardian_links
for each row execute function public.academic_guardian_link_limits();

-- ─── Reports (PARENT-006) ────────────────────────────────────────────────────

create table if not exists public.academic_guardian_reports (
  id                 uuid primary key default gen_random_uuid(),
  link_id            uuid not null references public.academic_guardian_links(id) on delete cascade,
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  reporting_period_id uuid not null references public.academic_reporting_periods(id) on delete cascade,
  content            jsonb not null,
  generated_at       timestamptz not null default now(),
  read_at            timestamptz,
  unique (link_id, reporting_period_id)
);
create index if not exists academic_guardian_reports_link_idx on public.academic_guardian_reports (link_id, generated_at desc);
alter table public.academic_guardian_reports enable row level security;
revoke all on public.academic_guardian_reports from anon, authenticated;

create or replace function public.academic_guardian_reports_entitled(p_link public.academic_guardian_links)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_has_feature(p_link.guardian_user_id, 'parent_reports')
      or public.academic_has_feature((select user_id from public.academic_student_profiles where id = p_link.student_profile_id), 'parent_reports');
$$;

-- The seven sections for one month (PRD §14.9.3), frozen into the report row.
create or replace function public.academic_guardian_report_content(p_link public.academic_guardian_links, p_enrolment public.academic_enrolments, p_period_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_snapshot public.academic_analysis_snapshots;
  v_scores jsonb;
  v_period jsonb;
  v_meta public.academic_reporting_periods;
  v_entry public.academic_score_entries;
  v_small numeric;
begin
  select * into v_snapshot from public.academic_analysis_snapshots where id = public.academic_build_snapshot(p_enrolment.id);
  v_scores := public.academic_guardian_scores(p_enrolment, v_snapshot);
  select p into v_period from jsonb_array_elements(v_snapshot.outputs->'periods') p where p->>'period_id' = p_period_id::text;
  select * into v_meta from public.academic_reporting_periods where id = p_period_id;
  select * into v_entry from public.academic_score_entries where enrolment_id = p_enrolment.id and reporting_period_id = p_period_id;
  -- "About the same": a change under 2.5% of the scale.
  v_small := coalesce(((v_scores->'scale'->>'max')::numeric - (v_scores->'scale'->>'min')::numeric) * 0.025, 0.25);

  return jsonb_build_object(
    'student_name', (select display_name from public.academic_student_profiles where id = p_link.student_profile_id),
    'period', jsonb_build_object('label_en', v_meta.label_en, 'label_lo', v_meta.label_lo,
      'school_year', (select code from public.academic_years where id = p_enrolment.academic_year_id),
      'generated_at', now(), 'data_as_of', greatest(v_entry.submitted_at, (select max(r.created_at) from public.academic_score_revisions r
        join public.academic_score_lines l on l.id = r.score_line_id where l.score_entry_id = v_entry.id))),
    'recorded', jsonb_build_object('recorded', v_period->'recorded', 'active', v_period->'active',
      'missing', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo'))
        from jsonb_array_elements(v_snapshot.outputs->'subjects') s
        cross join lateral (select pt from jsonb_array_elements(coalesce(s->'series', '[]'::jsonb)) pt where pt->>'period_id' = p_period_id::text) x
        where coalesce((s->>'active')::boolean, true) and x.pt->>'status' <> 'scored'), '[]'::jsonb)),
    'changes', jsonb_build_object('mean_change', v_period->'change'->'value',
      'subjects', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'latest', s->'latest', 'previous', s->'previous',
          'direction', case when s->>'change' is null then null when abs((s->>'change')::numeric) < v_small then 'same'
                            when (s->>'change')::numeric > 0 then 'up' else 'down' end))
        from jsonb_array_elements(v_scores->'subjects') s where s->>'latest' is not null), '[]'::jsonb)),
    'stronger', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'reason', s->'label_reason'))
      from jsonb_array_elements(v_scores->'subjects') s where s->>'label' = 'relatively_stronger'), '[]'::jsonb),
    'needs_attention', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'reason', s->'label_reason'))
      from jsonb_array_elements(v_scores->'subjects') s where s->>'label' = 'relatively_lower'), '[]'::jsonb),
    'activities', jsonb_build_object(
      'quizzes', (select count(*) from public.academic_quiz_attempts q where q.student_profile_id = p_link.student_profile_id and q.completed_at::date between v_meta.start_date and v_meta.end_date),
      'practice', (select count(*) from public.academic_practice_attempts q where q.student_profile_id = p_link.student_profile_id and q.completed_at::date between v_meta.start_date and v_meta.end_date),
      'plan_tasks', case when (p_link.scopes->>'plan')::boolean then (select count(*) from public.academic_study_tasks t
                      where t.student_profile_id = p_link.student_profile_id and t.state = 'done' and t.completed_at::date between v_meta.start_date and v_meta.end_date) end),
    'next_steps', public.academic_guardian_suggestions(v_scores, 3)
  );
end;
$$;

-- Daily: one report per link for its newest month past the correction window.
create or replace function public.academic_guardian_generate_reports()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link public.academic_guardian_links;
  v_enrolment public.academic_enrolments;
  v_period uuid;
  v_report uuid;
  v_count integer := 0;
begin
  for v_link in
    select l.* from public.academic_guardian_links l join public.academic_student_profiles p on p.id = l.student_profile_id
    where l.status = 'active' and (l.scopes->>'scores')::boolean and p.consent_state = 'active' and p.status = 'active'
  loop
    continue when not public.academic_guardian_reports_entitled(v_link);
    v_enrolment := public.academic_planner_enrolment(v_link.student_profile_id);
    continue when v_enrolment.id is null;
    select e.reporting_period_id into v_period
    from public.academic_score_entries e join public.academic_reporting_periods rp on rp.id = e.reporting_period_id
    where e.enrolment_id = v_enrolment.id and e.reporting_period_id = any(public.academic_guardian_visible_periods(v_enrolment.id))
      and e.submitted_at > now() - make_interval(days => coalesce((public.academic_guardian_rule('report_max_age_days'))::integer, 45))
      and not exists (select 1 from public.academic_guardian_reports r where r.link_id = v_link.id and r.reporting_period_id = e.reporting_period_id)
    order by rp.sequence desc limit 1;
    continue when v_period is null;
    insert into public.academic_guardian_reports (link_id, student_profile_id, reporting_period_id, content)
    values (v_link.id, v_link.student_profile_id, v_period, public.academic_guardian_report_content(v_link, v_enrolment, v_period))
    on conflict (link_id, reporting_period_id) do nothing
    returning id into v_report;
    if v_report is not null then
      v_count := v_count + 1;
      insert into public.academic_notifications (user_id, category, code, payload, channel, state, dedupe_key, sent_at)
      values (v_link.guardian_user_id, 'guardian_report', 'guardian.report',
              jsonb_build_object('student', (select display_name from public.academic_student_profiles where id = v_link.student_profile_id), 'report_id', v_report, 'link_id', v_link.id),
              'in_app', 'sent', 'guardian-report:' || v_report, now())
      on conflict (dedupe_key) do nothing;
    end if;
  end loop;
  return v_count;
end;
$$;

-- The guardian opens a report while the link is active; no copies are kept for them after it ends.
create or replace function public.academic_guardian_report(p_report_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_report public.academic_guardian_reports;
begin
  select r.* into v_report from public.academic_guardian_reports r join public.academic_guardian_links l on l.id = r.link_id
  where r.id = p_report_id and l.guardian_user_id = v_user and l.status = 'active';
  if v_report.id is null then
    return public.academic_deny('guardian_report', p_report_id);
  end if;
  update public.academic_guardian_reports set read_at = coalesce(read_at, now()) where id = v_report.id;
  perform public.academic_audit('guardian.report_view', 'guardian_report', v_report.id, v_report.student_profile_id, 'success', null);
  return jsonb_build_object('id', v_report.id, 'link_id', v_report.link_id, 'generated_at', v_report.generated_at, 'content', v_report.content);
end;
$$;

-- ─── Grants and schedule ─────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_guardian_visible_periods(uuid)', 'academic_guardian_scores(public.academic_enrolments,public.academic_analysis_snapshots)',
    'academic_guardian_suggestions(jsonb,integer)', 'academic_guardian_link_limits()', 'academic_guardian_reports_entitled(public.academic_guardian_links)',
    'academic_guardian_report_content(public.academic_guardian_links,public.academic_enrolments,uuid)', 'academic_guardian_generate_reports()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['academic_guardian_child(uuid)', 'academic_guardian_report(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-guardian-reports';
select cron.schedule(
  'academic-guardian-reports',
  '10 23 * * *', -- 06:10 Asia/Vientiane
  $$select public.academic_guardian_generate_reports();$$
);
