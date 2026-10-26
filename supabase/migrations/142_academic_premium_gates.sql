-- My Scores — premium feature gates (P3-BIL #51, PRD §30.3, BILLING-006).
--
-- The module asks the entitlement service (migration 141) before giving
-- premium detail. Nothing changes while 'entitlements_enforced' is false
-- (every feature open). Once on, without Premium:
--   advanced_analysis     dashboard labels and trends keep their verdict and
--                         rule, not evidence counts or confidence; This week
--                         shows the top action only (top 1 vs top 3)
--   diagnostic_unlimited  one diagnostic check per subject each term
-- Recorded scores, history, charts and earlier quiz results always stay
-- readable (BILLING-006). The functions below are migrations 130, 132 and 136
-- with the gates added.

-- The first day of the student's current term (from the school calendar), or
-- 120 days ago when the calendar has no terms.
create or replace function public.academic_term_start(p_enrolment_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select min(p2.start_date)
    from public.academic_enrolments e
    join public.academic_reporting_periods p on p.calendar_template_id = e.calendar_template_id
    join public.academic_reporting_periods p2 on p2.calendar_template_id = p.calendar_template_id and p2.term_no = p.term_no
    where e.id = p_enrolment_id and p.term_no is not null and public.academic_today() between p.start_date and p.end_date
  ), public.academic_today() - 120);
$$;

-- True when the student lacks diagnostic_unlimited and already finished this
-- subject's check (any form) this term.
create or replace function public.academic_diagnostic_locked(p_profile public.academic_student_profiles, p_diagnostic_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_family uuid := public.academic_diagnostic_family(p_diagnostic_id);
  v_since date;
begin
  if public.academic_has_feature(p_profile.user_id, 'diagnostic_unlimited') then
    return false;
  end if;
  select public.academic_term_start(e.id) into v_since from public.academic_enrolments e
  where e.student_profile_id = p_profile.id and e.state = 'active' order by e.created_at desc limit 1;
  return exists (
    select 1 from public.academic_quiz_attempts a
    where a.student_profile_id = p_profile.id and a.status = 'completed'
      and public.academic_diagnostic_family(a.diagnostic_id) = v_family
      and (a.completed_at at time zone 'Asia/Vientiane')::date >= coalesce(v_since, public.academic_today() - 120)
  );
end;
$$;

create or replace function public.academic_get_dashboard(p_enrolment_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_enrolment public.academic_enrolments;
  v_snapshot public.academic_analysis_snapshots;
  v_snapshot_id uuid;
  v_outputs jsonb;
  v_detail boolean;
begin
  if p_enrolment_id is not null then
    select * into v_enrolment from public.academic_enrolments
    where id = p_enrolment_id and student_profile_id = v_profile.id;
    if v_enrolment.id is null then
      return public.academic_deny('enrolment', p_enrolment_id);
    end if;
  else
    select * into v_enrolment from public.academic_enrolments
    where student_profile_id = v_profile.id
    order by state = 'active' desc, created_at desc
    limit 1;
    if v_enrolment.id is null then
      perform public.academic_raise('NO_ACTIVE_ENROLMENT', 409, 'There is no school year yet');
    end if;
  end if;

  -- Build first: a snapshot inserted inside the same statement that reads
  -- the table would not be visible to that statement.
  v_snapshot_id := public.academic_build_snapshot(v_enrolment.id);
  select * into v_snapshot from public.academic_analysis_snapshots where id = v_snapshot_id;

  v_outputs := v_snapshot.outputs;
  if public.academic_setting('insights_enabled') is distinct from 'true'::jsonb then
    v_outputs := jsonb_set(v_outputs, '{subjects}', (
      select coalesce(jsonb_agg(s.subject - 'label' - 'trend' order by s.ord), '[]'::jsonb)
      from jsonb_array_elements(v_outputs->'subjects') with ordinality as s(subject, ord)
    ));
  end if;

  -- advanced_analysis: without it a label or trend keeps its verdict and rule,
  -- not the evidence counts or confidence (PRD §30.3 "summary").
  v_detail := public.academic_has_feature(v_profile.user_id, 'advanced_analysis');
  if not v_detail then
    v_outputs := jsonb_set(v_outputs, '{subjects}', (
      select coalesce(jsonb_agg(case when jsonb_typeof(s.subject->'label') = 'object' or jsonb_typeof(s.subject->'trend') = 'object' then s.subject
          || jsonb_build_object(
               'label', case when jsonb_typeof(s.subject->'label') = 'object'
                             then (s.subject->'label') - 'confidence' - 'n' - 'mean_deviation' - 'periods_above' - 'periods_below' else s.subject->'label' end,
               'trend', case when jsonb_typeof(s.subject->'trend') = 'object'
                             then (s.subject->'trend') - 'confidence' - 'n' - 'slope' - 'p' - 'sd' else s.subject->'trend' end)
        else s.subject end order by s.ord), '[]'::jsonb)
      from jsonb_array_elements(v_outputs->'subjects') with ordinality as s(subject, ord)
    ));
  end if;

  return jsonb_build_object(
    'snapshot_id', v_snapshot.id,
    'snapshot_created_at', v_snapshot.created_at,
    'enrolment', (
      select jsonb_build_object(
        'id', e.id, 'academic_year', y.code, 'state', e.state, 'read_only', e.state = 'closed',
        'grade', jsonb_build_object('code', g.code, 'label_lo', g.label_lo, 'label_en', g.label_en),
        'school', jsonb_build_object('name_lo', coalesce(sc.name_lo, e.school_free_text),
          'name_en', coalesce(sc.name_en, sc.name_lo, e.school_free_text), 'verification', e.school_verification),
        'closed_reason', e.closed_reason,
        'start_period_seq', e.start_period_seq,
        'end_period_seq', e.end_period_seq
      )
      from public.academic_enrolments e
      join public.academic_years y on y.id = e.academic_year_id
      join public.academic_grades g on g.id = e.grade_id
      left join public.academic_schools sc on sc.id = e.school_id
      where e.id = v_enrolment.id
    )
  ) || v_outputs || jsonb_build_object('detail_locked', not v_detail);
end;
$$;

create or replace function public.academic_get_quiz_offer(p_subject_enrolment_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_subject record;
  v_main public.academic_diagnostics;
  v_open public.academic_quiz_attempts;
  v_last public.academic_quiz_attempts;
  v_start uuid;
  v_retake_from timestamptz;
  v_locked boolean := false;
  v_none constant jsonb := '{"diagnostic": null, "start_id": null, "retake_from": null, "attempt": null, "last_result": null}';
begin
  select se.subject_id, e.grade_id into v_subject
  from public.academic_subject_enrolments se
  join public.academic_enrolments e on e.id = se.enrolment_id
  where se.id = p_subject_enrolment_id and e.student_profile_id = v_profile.id;
  if not found then
    return public.academic_deny('subject_enrolment', p_subject_enrolment_id);
  end if;
  if public.academic_setting('insights_enabled') is distinct from 'true'::jsonb or v_subject.subject_id is null then
    return v_none;
  end if;
  select * into v_main from public.academic_diagnostics
  where subject_id = v_subject.subject_id and grade_id = v_subject.grade_id and status = 'published' and parallel_of is null;
  if v_main.id is null then
    return v_none;
  end if;

  -- The family: the main form and its published parallel forms.
  select a.* into v_open from public.academic_quiz_attempts a join public.academic_diagnostics f on f.id = a.diagnostic_id
  where a.student_profile_id = v_profile.id and (f.id = v_main.id or f.parallel_of = v_main.id)
    and a.status = 'in_progress' and a.expires_at >= now()
  order by a.started_at desc limit 1;
  select a.* into v_last from public.academic_quiz_attempts a join public.academic_diagnostics f on f.id = a.diagnostic_id
  where a.student_profile_id = v_profile.id and (f.id = v_main.id or f.parallel_of = v_main.id) and a.status = 'completed'
  order by a.completed_at desc limit 1;

  if v_open.id is not null then
    v_start := v_open.diagnostic_id;
  elsif v_last.id is not null and v_last.completed_at > now() - make_interval(days => public.academic_diagnostic_rule('retake_days')) then
    v_retake_from := v_last.completed_at + make_interval(days => public.academic_diagnostic_rule('retake_days'));
  else
    -- QUIZ-004: a form not finished yet (main first), else the one finished longest ago.
    select f.id into v_start
    from public.academic_diagnostics f
    left join lateral (
      select max(a.completed_at) as done from public.academic_quiz_attempts a
      where a.diagnostic_id = f.id and a.student_profile_id = v_profile.id and a.status = 'completed'
    ) c on true
    where f.status = 'published' and (f.id = v_main.id or f.parallel_of = v_main.id)
    order by c.done asc nulls first, f.parallel_of is not null, f.published_at
    limit 1;
  end if;

  -- diagnostic_unlimited: without it, one check per subject each term.
  if v_open.id is null and public.academic_diagnostic_locked(v_profile, v_main.id) then
    v_locked := true;
    v_start := null;
    v_retake_from := null;
  end if;

  return jsonb_build_object(
    'locked', case when v_locked then 'diagnostic_unlimited' end,
    'diagnostic', jsonb_build_object('id', v_main.id, 'title_lo', v_main.title_lo, 'title_en', v_main.title_en,
      'items', (select count(*) from public.academic_diagnostic_items where diagnostic_id = v_main.id)),
    'start_id', v_start,
    'retake_from', v_retake_from,
    'attempt', case when v_open.id is not null then jsonb_build_object(
      'id', v_open.id, 'answered', (select count(*) from public.academic_quiz_answers where attempt_id = v_open.id),
      'total', cardinality(v_open.item_ids), 'expires_at', v_open.expires_at) end,
    'last_result', case when v_last.id is not null then jsonb_build_object(
      'id', v_last.id, 'completed_at', v_last.completed_at, 'strong', public.academic_quiz_results_strong(v_last.results)) end
  );
end;
$$;

create or replace function public.academic_start_quiz(p_diagnostic_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_diag public.academic_diagnostics;
  v_attempt public.academic_quiz_attempts;
  v_items uuid[];
  v_last_done timestamptz;
begin
  select * into v_diag from public.academic_diagnostics where id = p_diagnostic_id and status = 'published';
  if public.academic_setting('insights_enabled') is distinct from 'true'::jsonb or v_diag.id is null
     or not exists (
       select 1 from public.academic_enrolments e
       join public.academic_subject_enrolments se on se.enrolment_id = e.id
       where e.student_profile_id = v_profile.id and e.state = 'active' and e.grade_id = v_diag.grade_id and se.subject_id = v_diag.subject_id
     ) then
    perform public.academic_raise('QUIZ_UNAVAILABLE', 404, 'This quiz is not available');
  end if;

  update public.academic_quiz_attempts set status = 'expired'
  where student_profile_id = v_profile.id and diagnostic_id = v_diag.id and status = 'in_progress' and expires_at < now();
  select * into v_attempt from public.academic_quiz_attempts
  where student_profile_id = v_profile.id and diagnostic_id = v_diag.id and status = 'in_progress';

  if v_attempt.id is null then
    -- QUIZ-004: the next attempt in the family waits retake_days after the last one finished.
    select max(a.completed_at) into v_last_done from public.academic_quiz_attempts a
    where a.student_profile_id = v_profile.id and a.status = 'completed'
      and public.academic_diagnostic_family(a.diagnostic_id) = public.academic_diagnostic_family(v_diag.id);
    if v_last_done > now() - make_interval(days => public.academic_diagnostic_rule('retake_days')) then
      perform public.academic_raise('QUIZ_TOO_SOON', 409, 'You can try this quiz again later',
        jsonb_build_object('available_at', v_last_done + make_interval(days => public.academic_diagnostic_rule('retake_days'))));
    end if;
    if public.academic_diagnostic_locked(v_profile, v_diag.id) then
      perform public.academic_raise('ENTITLEMENT_REQUIRED', 403, 'One check per subject each term on Free',
        jsonb_build_object('feature', 'diagnostic_unlimited', 'upgrade', 'academy_premium'));
    end if;
    -- QUIZ-005: only items that are still servable now.
    select array_agg(di.item_id order by di.position) into v_items
    from public.academic_diagnostic_items di
    where di.diagnostic_id = v_diag.id and public.academic_quiz_item_servable(di.item_id);
    if coalesce(cardinality(v_items), 0) < public.academic_diagnostic_rule('min_items') then
      perform public.academic_raise('QUIZ_UNAVAILABLE', 404, 'This quiz is not available');
    end if;
    insert into public.academic_quiz_attempts (diagnostic_id, student_profile_id, item_ids, expires_at)
    values (v_diag.id, v_profile.id, v_items, now() + make_interval(days => public.academic_diagnostic_rule('resume_days')))
    returning * into v_attempt;
  end if;
  return public.academic_quiz_attempt_view(v_attempt);
end;
$$;

create or replace function public.academic_get_recommendations()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_result jsonb := public.academic_build_recommendations(v_profile);
  v_today date := public.academic_today();
  v_items jsonb;
begin
  -- advanced_analysis: without it, the top action only (PRD §30.3: top 1 vs top 3).
  v_items := case when public.academic_has_feature(v_profile.user_id, 'advanced_analysis') then v_result->'items'
    else (select coalesce(jsonb_agg(i order by ord), '[]'::jsonb) from jsonb_array_elements(v_result->'items') with ordinality as x(i, ord) where ord <= 1) end;

  insert into public.academic_recommendation_impressions (student_profile_id, item_key, rule_id, kind, content_item_id, shown_on)
  select v_profile.id, i->>'key', i->>'rule_id', i->>'kind', (i->>'content_item_id')::uuid, v_today
  from jsonb_array_elements(v_items) as i
  where i->>'kind' <> 'gap'
  on conflict (student_profile_id, item_key, shown_on) do nothing;

  insert into public.academic_content_gap_events (student_profile_id, rule_id, subject_id, topic_id, grade_id, logged_on)
  select v_profile.id, g->>'rule_id', (g->>'subject_id')::uuid, (g->>'topic_id')::uuid, (v_result->>'grade_id')::uuid, v_today
  from jsonb_array_elements(v_result->'gaps') as g
  on conflict do nothing;

  return jsonb_build_object('items', v_items, 'more_locked', jsonb_array_length(v_result->'items') - jsonb_array_length(v_items));
end;
$$;

revoke all on function public.academic_term_start(uuid) from public, anon, authenticated;
revoke all on function public.academic_diagnostic_locked(public.academic_student_profiles, uuid) from public, anon, authenticated;
