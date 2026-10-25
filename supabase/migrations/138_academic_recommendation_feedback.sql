-- My Scores — feedback on next actions and repetition control (P2-REC #50: LEARN-005).
--
-- A student can mark a shown action:
--   done         hidden for 30 days
--   not_now      hidden for 14 days
--   not_helpful  that item hidden for 180 days (and recorded for the content team)
-- Repetition: an action is shown on at most 3 days in any 30 (impressions are
-- logged once a day, migration 136); one already shown today stays for the day.
-- "Enter scores" (R1) is exempt from repetition so a missing month never hides,
-- and gap cards are never logged or hidden. Hidden actions make room for the
-- next ranked candidates, so up to 3 are still shown when they exist.
-- Feedback belongs to the profile: exported with "Download my data" and
-- deleted with the profile.

create table if not exists public.academic_recommendation_feedback (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  item_key           text not null check (length(item_key) <= 120),
  rule_id            text not null,
  kind               text not null,
  content_item_id    uuid references public.academic_content_items(id) on delete set null,
  response           text not null check (response in ('done', 'not_now', 'not_helpful')),
  created_at         timestamptz not null default now()
);
create index if not exists academic_recommendation_feedback_profile_idx on public.academic_recommendation_feedback (student_profile_id, item_key, created_at desc);
alter table public.academic_recommendation_feedback enable row level security;
revoke all on public.academic_recommendation_feedback from anon, authenticated;

-- True when an action must not be shown now (LEARN-005).
create or replace function public.academic_recommendation_hidden(p_profile_id uuid, p_key text, p_rule text, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_kind <> 'gap' and (
    exists (
      select 1 from public.academic_recommendation_feedback f
      where f.student_profile_id = p_profile_id and f.item_key = p_key
        and f.created_at > now() - case f.response when 'done' then interval '30 days' when 'not_now' then interval '14 days' else interval '180 days' end
    )
    or (p_rule <> 'R1'
        and not exists (select 1 from public.academic_recommendation_impressions i
                        where i.student_profile_id = p_profile_id and i.item_key = p_key and i.shown_on = public.academic_today())
        and (select count(*) from public.academic_recommendation_impressions i
             where i.student_profile_id = p_profile_id and i.item_key = p_key and i.shown_on > public.academic_today() - 30) >= 3)
  );
$$;

-- As in migration 136, with hidden actions skipped while ranking.
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
    continue when public.academic_recommendation_hidden(p_profile.id, v_cand->>'key', v_cand->>'rule_id', v_cand->>'kind');
    continue when coalesce((v_counts->>(v_cand->>'rule_id'))::integer, 0) >= case v_cand->>'rule_id' when 'R3' then 2 else 1 end;
    v_counts := v_counts || jsonb_build_object(v_cand->>'rule_id', coalesce((v_counts->>(v_cand->>'rule_id'))::integer, 0) + 1);
    v_items := v_items || jsonb_build_array(v_cand - 'quality' - 'published_at');
    exit when jsonb_array_length(v_items) = 3;
  end loop;

  return jsonb_build_object('items', v_items, 'gaps', v_gaps, 'grade_id', v_enrolment.grade_id);
end;
$$;

-- LEARN-005: done / not now / not helpful for an action the caller was shown
-- in the last 30 days (keys from their own impressions only).
create or replace function public.academic_recommendation_feedback(p_item_key text, p_response text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_shown public.academic_recommendation_impressions;
begin
  if p_response is null or p_response not in ('done', 'not_now', 'not_helpful') then
    perform public.academic_invalid('response', 'Choose done, not now or not helpful');
  end if;
  select * into v_shown from public.academic_recommendation_impressions
  where student_profile_id = v_profile.id and item_key = p_item_key and shown_on > public.academic_today() - 30
  order by shown_on desc limit 1;
  if v_shown.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'This suggestion was not shown to you');
  end if;
  insert into public.academic_recommendation_feedback (student_profile_id, item_key, rule_id, kind, content_item_id, response)
  values (v_profile.id, v_shown.item_key, v_shown.rule_id, v_shown.kind, v_shown.content_item_id, p_response);
  return jsonb_build_object('item_key', v_shown.item_key, 'response', p_response);
end;
$$;

-- PRIV-004: next actions shown to the caller and their feedback.
create or replace function public.academic_export_my_recommendations()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return jsonb_build_object(
    'shown', coalesce((select jsonb_agg(jsonb_build_object('item', i.item_key, 'rule', i.rule_id, 'kind', i.kind, 'shown_on', i.shown_on) order by i.shown_on, i.item_key)
      from public.academic_recommendation_impressions i where i.student_profile_id = v_profile.id), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(jsonb_build_object('item', f.item_key, 'rule', f.rule_id, 'kind', f.kind, 'response', f.response, 'at', f.created_at) order by f.created_at)
      from public.academic_recommendation_feedback f where f.student_profile_id = v_profile.id), '[]'::jsonb)
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_recommendation_hidden(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.academic_build_recommendations(public.academic_student_profiles) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['academic_recommendation_feedback(text,text)', 'academic_export_my_recommendations()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
