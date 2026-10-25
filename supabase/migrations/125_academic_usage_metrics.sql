-- My Scores: MVP metrics (ANL-002, #45; PRD §32.2, §32.5).
--
-- academic_admin_usage_metrics() feeds the admin Metrics tab. Everything is
-- an aggregate over the usage events of migration 124, so students who
-- switched usage statistics off are not counted. Period completion also
-- reads enrolments and scores, but only for students whose statistics are on.
--
-- Small groups are hidden (§32.1): a count of 1–19 students is returned as
-- null, and a rate whose denominator is under 20 is null. Weeks and months
-- are in Asia/Vientiane time. Figures describe what students did; they are
-- not evidence that Schooling caused any change (§32.4).

create or replace function public.academic_metric_count(p_n bigint)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when p_n between 1 and 19 then null else p_n end;
$$;

create or replace function public.academic_metric_rate(p_numerator bigint, p_denominator bigint)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_denominator, 0) < 20 then null else round(p_numerator::numeric / p_denominator, 4) end;
$$;

create or replace function public.academic_admin_usage_metrics()
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
  with ev as (
    select name, pseudonym, props, grade_code, occurred_at at time zone 'Asia/Vientiane' as at
    from public.academic_usage_events
    where occurred_at > now() - interval '13 months'
  ),
  created as (
    select pseudonym, min(at) as at, (array_agg(props->>'source' order by at))[1] as source
    from ev where name = 'profile_created' and pseudonym is not null group by pseudonym
  ),
  submissions as (
    select pseudonym, at, grade_code, (props->>'duration_ms')::numeric as duration_ms
    from ev where name = 'score_entry_submitted' and pseudonym is not null
  ),
  first_submission as (
    select pseudonym, min(at) as at from submissions group by pseudonym
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
      (select count(*) from created c where c.at >= w and c.at < w + interval '1 week') as cohort,
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
  -- Period completion: monthly periods that ended in the month, for active
  -- enrolments of students with usage statistics on.
  expected as (
    select date_trunc('month', p.end_date::timestamp) as m, e.id as enrolment_id, p.id as period_id
    from public.academic_enrolments e
    join public.academic_reporting_periods p on p.calendar_template_id = e.calendar_template_id and p.period_type = 'monthly'
    where p.sequence >= e.start_period_seq and (e.end_period_seq is null or p.sequence <= e.end_period_seq)
      and p.end_date < v_now::date
      and p.end_date >= (v_this_month - interval '5 months')::date
      and e.created_at::date <= p.end_date
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
  )
  select jsonb_build_object(
    'generated_at', now(),
    'timezone', 'Asia/Vientiane',
    'min_group', 20,
    'tracking_since', (select min(occurred_at) from public.academic_usage_events),
    'statistics', jsonb_build_object(
      'on', public.academic_metric_count((select count(distinct student_profile_id) from public.academic_consent_records
        where purpose = 'usage_statistics' and withdrawn_at is null)),
      'off', public.academic_metric_count((select count(*) from public.academic_student_profiles sp where not exists (
        select 1 from public.academic_consent_records c where c.student_profile_id = sp.id and c.purpose = 'usage_statistics' and c.withdrawn_at is null)))
    ),
    'weeks', (select jsonb_agg(jsonb_build_object(
        'week_start', w::date,
        'profiles_created', public.academic_metric_count(profiles),
        'onboarding_started', public.academic_metric_count(started),
        'onboarding_completed', public.academic_metric_count(completed),
        'onboarding_rate', public.academic_metric_rate(completed, started),
        'first_entry_cohort', public.academic_metric_count(cohort),
        'first_entry_rate', public.academic_metric_rate(entered, cohort),
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
            where at >= v_this_month and grade_code is not null group by grade_code) g)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.academic_metric_count(bigint) from public, anon, authenticated;
revoke all on function public.academic_metric_rate(bigint, bigint) from public, anon, authenticated;
revoke all on function public.academic_admin_usage_metrics() from public, anon;
grant execute on function public.academic_admin_usage_metrics() to authenticated;
