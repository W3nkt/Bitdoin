-- My Scores — weekly next actions (P2-REC #50: LEARN-001..003, PRD §14.6.2).
--
-- Deterministic rules over the student's own data (insights_enabled only):
--   R1 Missing data  a monthly period ended > 7 days ago without scores   "Enter scores"     max 1  100
--   R2 Diagnose      subject relatively lower or declining (>= medium      diagnostic          max 1   90
--                    confidence), diagnostic published, none finished in 60 days
--   R3 Practise      topic band Needs practice in the latest quiz          practice set or     max 2   80 - 5 x rank
--                                                                          Academy lesson, difficulty 1
--   R4 Consolidate   topic band Developing                                 practice set, diff 2 max 1  60
--   R5 Re-test       last quiz finished >= 14 days ago or every Needs-     next diagnostic     max 1   70
--                    practice topic practised (137), a topic below Secure,
--                    retake open (QUIZ-004)
--   R7 Stretch       subject relatively stronger and improving             challenge or lesson max 1   40
--                                                                          of difficulty 3
-- R6 (routines) waits for the study planner (#54); R8 (books) for Phase 5.
-- +10 when the subject is one of the student's interests. Order: priority,
-- then content quality, then most recently published, then a stable key.
-- Top 3 (LEARN-001). Content must be published in the catalogue and available
-- now (LEARN-003); Academy items only for students with an Academy
-- subscription (REC-ACCESS); completed Academy lessons and challenges are
-- skipped. When R3 finds nothing, a "no practice for this topic yet" card is
-- shown; R3, R4 and R7 gaps are logged for the content team.
-- Every shown action is logged once a day with its rule (impressions, for
-- LEARN-005 repetition control and the §14.6.5 funnel).

-- ─── Logs ────────────────────────────────────────────────────────────────────

create table if not exists public.academic_recommendation_impressions (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  item_key           text not null check (length(item_key) <= 120),
  rule_id            text not null check (rule_id ~ '^R[1-8]$'),
  kind               text not null,
  content_item_id    uuid references public.academic_content_items(id) on delete set null,
  shown_on           date not null,
  shown_at           timestamptz not null default now(),
  unique (student_profile_id, item_key, shown_on)
);
create index if not exists academic_recommendation_impressions_recent_idx on public.academic_recommendation_impressions (student_profile_id, shown_on desc);

create table if not exists public.academic_content_gap_events (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  rule_id            text not null check (rule_id in ('R3', 'R4', 'R7')),
  subject_id         uuid references public.academic_subjects(id),
  topic_id           uuid references public.academic_quiz_topics(id) on delete cascade,
  grade_id           uuid references public.academic_grades(id),
  logged_on          date not null,
  unique nulls not distinct (student_profile_id, rule_id, subject_id, topic_id, logged_on)
);

alter table public.academic_recommendation_impressions enable row level security;
alter table public.academic_content_gap_events enable row level security;
revoke all on public.academic_recommendation_impressions from anon, authenticated;
revoke all on public.academic_content_gap_events from anon, authenticated;

-- ─── Engine ──────────────────────────────────────────────────────────────────

-- Published, available catalogue entries for a topic or subject, best first.
create or replace function public.academic_recommendable_content(
  p_kinds text[], p_topic_id uuid, p_subject_id uuid, p_grade smallint, p_difficulty_max smallint, p_difficulty_exact smallint,
  p_member boolean, p_user_id uuid)
returns table (item public.academic_content_items, external jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c, x.ext
  from public.academic_content_items c
  cross join lateral (select public.academic_external_content(c.kind, c.external_id) as ext) x
  where c.status = 'published' and c.kind = any (p_kinds)
    and (p_topic_id is null or p_topic_id = any (c.topic_ids))
    and (p_subject_id is null or p_subject_id = any (c.subject_ids))
    and p_grade between c.grade_min and c.grade_max
    and (p_difficulty_max is null or c.difficulty <= p_difficulty_max)
    and (p_difficulty_exact is null or c.difficulty = p_difficulty_exact)
    and coalesce((x.ext->>'available')::boolean, false)
    and (p_member or not coalesce((x.ext->>'membership')::boolean, true))
    and not (c.kind = 'academy_lesson' and exists (select 1 from public.premium_lesson_progress lp where lp.user_id = p_user_id and lp.lesson_id = c.external_id and lp.completed_at is not null))
    and not (c.kind = 'academy_challenge' and exists (select 1 from public.premium_weekly_challenge_progress cp where cp.user_id = p_user_id and cp.challenge_id = c.external_id and cp.completed_at is not null))
  order by c.quality_score desc nulls last, c.published_at desc nulls last, c.id;
$$;

-- R5's other trigger: practice finished for every Needs-practice topic of a
-- quiz since it was taken. Practice sets arrive in migration 137, which
-- replaces this.
create or replace function public.academic_practised_all(p_profile_id uuid, p_attempt public.academic_quiz_attempts)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

-- All candidates and gaps for the caller's active school year; no logging.
-- Must run inside a student's request (it reuses academic_get_quiz_offer).
create or replace function public.academic_build_recommendations(p_profile public.academic_student_profiles)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_enrolment public.academic_enrolments;
  v_grade smallint;
  v_member boolean;
  v_cands jsonb := '[]'::jsonb;
  v_gaps jsonb := '[]'::jsonb;
  v_period record;
  v_snapshot jsonb;
  v_subject record;
  v_offer jsonb;
  v_last public.academic_quiz_attempts;
  v_topic jsonb;
  v_content record;
  v_rank integer;
  v_bonus integer;
  v_items jsonb := '[]'::jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_cand jsonb;
  v_reason jsonb;
  v_conf_ok boolean;
begin
  select * into v_enrolment from public.academic_enrolments where student_profile_id = p_profile.id and state = 'active' order by created_at desc limit 1;
  if v_enrolment.id is null or public.academic_setting('insights_enabled') is distinct from 'true'::jsonb then
    return jsonb_build_object('items', '[]'::jsonb, 'gaps', '[]'::jsonb);
  end if;
  select ordinal into v_grade from public.academic_grades where id = v_enrolment.grade_id;
  v_member := public.has_active_premium_subscription(p_profile.user_id);

  -- R1: the oldest monthly period that ended more than 7 days ago without submitted scores.
  select p.id, p.label_lo, p.label_en into v_period
  from public.academic_reporting_periods p
  where p.calendar_template_id = v_enrolment.calendar_template_id and p.period_type = 'monthly'
    and public.academic_period_month_seq(p) >= v_enrolment.start_period_seq
    and (v_enrolment.end_period_seq is null or public.academic_period_month_seq(p) <= v_enrolment.end_period_seq)
    and p.end_date < public.academic_today() - 7
    and not exists (select 1 from public.academic_score_entries e where e.enrolment_id = v_enrolment.id and e.reporting_period_id = p.id and e.state = 'submitted')
  order by p.start_date limit 1;
  if v_period.id is not null then
    v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'R1:' || v_period.id, 'rule_id', 'R1', 'kind', 'enter_scores', 'priority', 100,
      'title_lo', v_period.label_lo, 'title_en', v_period.label_en, 'est_minutes', 2, 'route', '/academy/scores/entry',
      'reason', jsonb_build_object('code', 'R1', 'period_lo', v_period.label_lo, 'period_en', v_period.label_en)));
  end if;

  v_snapshot := (select outputs from public.academic_analysis_snapshots where id = public.academic_build_snapshot(v_enrolment.id));

  for v_subject in
    select se.id as subject_enrolment_id, se.subject_id, s.code, coalesce(se.custom_name, s.name_lo) as name_lo, coalesce(se.custom_name, s.name_en) as name_en,
           x->'label' as label, x->'trend' as trend
    from jsonb_array_elements(coalesce(v_snapshot->'subjects', '[]'::jsonb)) as x
    join public.academic_subject_enrolments se on se.id = (x->>'subject_enrolment_id')::uuid
    join public.academic_subjects s on s.id = se.subject_id
    where (x->>'active')::boolean
    order by s.code
  loop
    v_bonus := case when v_subject.code = any (coalesce(p_profile.interest_subject_codes, '{}')) then 10 else 0 end;
    v_reason := jsonb_build_object('subject_lo', v_subject.name_lo, 'subject_en', v_subject.name_en);
    v_offer := public.academic_get_quiz_offer(v_subject.subject_enrolment_id);
    select a.* into v_last from public.academic_quiz_attempts a
    where a.student_profile_id = p_profile.id and a.status = 'completed' and v_offer->'diagnostic' is not null
      and public.academic_diagnostic_family(a.diagnostic_id) = (v_offer->'diagnostic'->>'id')::uuid
    order by a.completed_at desc limit 1;

    -- R2: a subject needing attention with a diagnostic not taken in 60 days.
    v_conf_ok := (v_subject.label->>'value' = 'relatively_lower' and v_subject.label->>'confidence' in ('high', 'medium'))
              or (v_subject.trend->>'value' = 'declining' and v_subject.trend->>'confidence' in ('high', 'medium'));
    if v_conf_ok and v_offer->>'start_id' is not null and (v_last.id is null or v_last.completed_at < now() - interval '60 days') then
      v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'R2:' || (v_offer->>'start_id'), 'rule_id', 'R2', 'kind', 'diagnostic', 'priority', 90 + v_bonus,
        'title_lo', v_offer->'diagnostic'->>'title_lo', 'title_en', v_offer->'diagnostic'->>'title_en', 'est_minutes', 10,
        'route', '/academy/scores/quiz/' || (v_offer->>'start_id'),
        'reason', v_reason || jsonb_build_object('code', 'R2', 'label', v_subject.label->>'value', 'trend', v_subject.trend->>'value')));
    end if;

    if v_last.id is not null then
      -- R5: re-test 14 days after the last quiz (or once every Needs-practice
      -- topic was practised) while a topic is below Secure.
      if (v_last.completed_at <= now() - interval '14 days' or public.academic_practised_all(p_profile.id, v_last)) and v_offer->>'start_id' is not null
         and exists (select 1 from jsonb_array_elements(v_last.results) r where r->>'band' <> 'secure') then
        v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'R5:' || (v_offer->>'start_id'), 'rule_id', 'R5', 'kind', 'diagnostic', 'priority', 70 + v_bonus,
          'title_lo', v_offer->'diagnostic'->>'title_lo', 'title_en', v_offer->'diagnostic'->>'title_en', 'est_minutes', 10,
          'route', '/academy/scores/quiz/' || (v_offer->>'start_id'),
          'reason', v_reason || jsonb_build_object('code', 'R5', 'date', v_last.completed_at)));
      end if;

      for v_topic in select value from jsonb_array_elements(v_last.results) loop
        if v_topic->>'band' = 'needs_practice' then
          -- R3: up to two foundation items for the topic.
          v_rank := 0;
          for v_content in select * from public.academic_recommendable_content(array['practice_set', 'academy_lesson'], (v_topic->>'topic_id')::uuid, null, v_grade, 1::smallint, null, v_member, p_profile.user_id) limit 2 loop
            v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', (v_content.item).kind || ':' || (v_content.item).id, 'rule_id', 'R3', 'kind', (v_content.item).kind,
              'content_item_id', (v_content.item).id, 'priority', 80 - 5 * v_rank + v_bonus,
              'quality', (v_content.item).quality_score, 'published_at', (v_content.item).published_at,
              'title_lo', v_content.external->>'title_lo', 'title_en', v_content.external->>'title_en', 'est_minutes', (v_content.item).est_minutes,
              'route', v_content.external->>'route',
              'reason', v_reason || jsonb_build_object('code', 'R3', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en', 'band', 'needs_practice', 'date', v_last.completed_at)));
            v_rank := v_rank + 1;
          end loop;
          if v_rank = 0 then
            v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('rule_id', 'R3', 'subject_id', v_subject.subject_id, 'topic_id', v_topic->>'topic_id'));
            v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'gap:' || (v_topic->>'topic_id'), 'rule_id', 'R3', 'kind', 'gap', 'priority', 80 + v_bonus,
              'title_lo', v_topic->>'name_lo', 'title_en', v_topic->>'name_en', 'est_minutes', null, 'route', null,
              'reason', v_reason || jsonb_build_object('code', 'gap', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en')));
          end if;
        elsif v_topic->>'band' = 'developing' then
          -- R4: one practice set at the same (core) difficulty.
          select * into v_content from public.academic_recommendable_content(array['practice_set'], (v_topic->>'topic_id')::uuid, null, v_grade, null, 2::smallint, v_member, p_profile.user_id) limit 1;
          if (v_content.item).id is not null then
            v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'practice_set:' || (v_content.item).id, 'rule_id', 'R4', 'kind', 'practice_set',
              'content_item_id', (v_content.item).id, 'priority', 60 + v_bonus, 'quality', (v_content.item).quality_score, 'published_at', (v_content.item).published_at,
              'title_lo', v_content.external->>'title_lo', 'title_en', v_content.external->>'title_en', 'est_minutes', (v_content.item).est_minutes,
              'route', v_content.external->>'route',
              'reason', v_reason || jsonb_build_object('code', 'R4', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en', 'band', 'developing', 'date', v_last.completed_at)));
          else
            v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('rule_id', 'R4', 'subject_id', v_subject.subject_id, 'topic_id', v_topic->>'topic_id'));
          end if;
          v_content := null;
        end if;
      end loop;
    end if;

    -- R7: stretch a stronger, improving subject.
    if v_subject.label->>'value' = 'relatively_stronger' and v_subject.trend->>'value' = 'improving' then
      select * into v_content from public.academic_recommendable_content(array['academy_challenge', 'academy_lesson'], null, v_subject.subject_id, v_grade, null, 3::smallint, v_member, p_profile.user_id) limit 1;
      if (v_content.item).id is not null then
        v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', (v_content.item).kind || ':' || (v_content.item).id, 'rule_id', 'R7', 'kind', (v_content.item).kind,
          'content_item_id', (v_content.item).id, 'priority', 40 + v_bonus, 'quality', (v_content.item).quality_score, 'published_at', (v_content.item).published_at,
          'title_lo', v_content.external->>'title_lo', 'title_en', v_content.external->>'title_en', 'est_minutes', (v_content.item).est_minutes,
          'route', v_content.external->>'route', 'reason', v_reason || jsonb_build_object('code', 'R7')));
      else
        v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('rule_id', 'R7', 'subject_id', v_subject.subject_id, 'topic_id', null));
      end if;
      v_content := null;
    end if;
  end loop;

  -- Rank, keep the best per key, cap per rule, top 3.
  for v_cand in
    select c from (
      select distinct on (c->>'key') c
      from jsonb_array_elements(v_cands) as c
      order by c->>'key', (c->>'priority')::integer desc
    ) d
    order by (c->>'priority')::integer desc, (c->>'quality')::integer desc nulls last, (c->>'published_at')::timestamptz desc nulls last, c->>'key'
  loop
    continue when coalesce((v_counts->>(v_cand->>'rule_id'))::integer, 0) >= case v_cand->>'rule_id' when 'R3' then 2 else 1 end;
    v_counts := v_counts || jsonb_build_object(v_cand->>'rule_id', coalesce((v_counts->>(v_cand->>'rule_id'))::integer, 0) + 1);
    v_items := v_items || jsonb_build_array(v_cand - 'quality' - 'published_at');
    exit when jsonb_array_length(v_items) = 3;
  end loop;

  return jsonb_build_object('items', v_items, 'gaps', v_gaps, 'grade_id', v_enrolment.grade_id);
end;
$$;

-- LEARN-001: up to 3 next actions for this week. Logs what is shown (once a
-- day per action) and content gaps (once a day per topic).
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
begin
  insert into public.academic_recommendation_impressions (student_profile_id, item_key, rule_id, kind, content_item_id, shown_on)
  select v_profile.id, i->>'key', i->>'rule_id', i->>'kind', (i->>'content_item_id')::uuid, v_today
  from jsonb_array_elements(v_result->'items') as i
  where i->>'kind' <> 'gap'
  on conflict (student_profile_id, item_key, shown_on) do nothing;

  insert into public.academic_content_gap_events (student_profile_id, rule_id, subject_id, topic_id, grade_id, logged_on)
  select v_profile.id, g->>'rule_id', (g->>'subject_id')::uuid, (g->>'topic_id')::uuid, (v_result->>'grade_id')::uuid, v_today
  from jsonb_array_elements(v_result->'gaps') as g
  on conflict do nothing;

  return jsonb_build_object('items', v_result->'items');
end;
$$;

-- For the content team (LEARN-003): topics students needed with nothing to
-- recommend, last 30 days, as student counts (no names).
create or replace function public.academic_admin_content_gaps()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'rule_id', g.rule_id, 'subject_code', s.code, 'grade_code', gr.code, 'topic_id', g.topic_id, 'topic_name', t.name_en,
      'students', g.students, 'last_seen', g.last_seen
    ) order by g.students desc, s.code, t.name_en)
    from (
      select rule_id, subject_id, topic_id, grade_id, count(distinct student_profile_id) as students, max(logged_on) as last_seen
      from public.academic_content_gap_events
      where logged_on >= public.academic_today() - 30
      group by rule_id, subject_id, topic_id, grade_id
    ) g
    left join public.academic_subjects s on s.id = g.subject_id
    left join public.academic_grades gr on gr.id = g.grade_id
    left join public.academic_quiz_topics t on t.id = g.topic_id
  ), '[]'::jsonb);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_recommendable_content(text[], uuid, uuid, smallint, smallint, smallint, boolean, uuid) from public, anon, authenticated;
revoke all on function public.academic_build_recommendations(public.academic_student_profiles) from public, anon, authenticated;
revoke all on function public.academic_practised_all(uuid, public.academic_quiz_attempts) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['academic_get_recommendations()', 'academic_admin_content_gaps()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
