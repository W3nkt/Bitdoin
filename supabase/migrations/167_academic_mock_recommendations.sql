-- My Scores — mock exam results feed the next actions (P5-EXAM #56, piece 3:
-- EXAM-003).
--
-- Unchanged from 138 apart from one block: the topics of the student's latest
-- finished mock exam or practice set (last 60 days) go through the same rules
-- as quiz topics (QUIZ-002 bands): Needs practice -> R3 (up to two foundation
-- items, or a content-gap card), Developing -> R4 (one core practice set). The
-- reason says it came from the mock exam (codes R3_mock / R4_mock); ranking,
-- caps, feedback windows and repetition limits are the existing ones. Results
-- stay a separate evidence stream: only the topic bands are used, never
-- combined with school scores (EXAM-002).

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
  v_mock public.academic_mock_attempts;
  v_mock_subject record;
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

  -- EXAM-003 (migration 167): topics from the latest finished mock exam or
  -- practice set (last 60 days) go through the same R3 / R4 rules as quiz
  -- topics (QUIZ-002 bands), with the mock exam named in the reason.
  select * into v_mock from public.academic_mock_attempts
  where student_profile_id = p_profile.id and status = 'finished' and finished_at > now() - interval '60 days'
  order by finished_at desc limit 1;
  if v_mock.id is not null then
    for v_topic in select value from jsonb_array_elements(coalesce(v_mock.result->'topics', '[]'::jsonb)) loop
      select s.id, s.code, s.name_lo, s.name_en into v_mock_subject from public.academic_subjects s where s.code = v_topic->>'subject';
      v_bonus := case when v_mock_subject.code = any (coalesce(p_profile.interest_subject_codes, '{}')) then 10 else 0 end;
      v_reason := jsonb_build_object('subject_lo', v_mock_subject.name_lo, 'subject_en', v_mock_subject.name_en, 'source', 'mock_exam');
      if v_topic->>'band' = 'needs_practice' then
        v_rank := 0;
        for v_content in select * from public.academic_recommendable_content(array['practice_set', 'academy_lesson'], (v_topic->>'topic_id')::uuid, null, v_grade, 1::smallint, null, v_member, p_profile.user_id) limit 2 loop
          v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', (v_content.item).kind || ':' || (v_content.item).id, 'rule_id', 'R3', 'kind', (v_content.item).kind,
            'content_item_id', (v_content.item).id, 'priority', 80 - 5 * v_rank + v_bonus,
            'quality', (v_content.item).quality_score, 'published_at', (v_content.item).published_at,
            'title_lo', v_content.external->>'title_lo', 'title_en', v_content.external->>'title_en', 'est_minutes', (v_content.item).est_minutes,
            'route', v_content.external->>'route',
            'reason', v_reason || jsonb_build_object('code', 'R3_mock', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en', 'band', 'needs_practice', 'date', v_mock.finished_at)));
          v_rank := v_rank + 1;
        end loop;
        if v_rank = 0 then
          v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('rule_id', 'R3', 'subject_id', v_mock_subject.id, 'topic_id', v_topic->>'topic_id'));
          v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'gap:' || (v_topic->>'topic_id'), 'rule_id', 'R3', 'kind', 'gap', 'priority', 80 + v_bonus,
            'title_lo', v_topic->>'name_lo', 'title_en', v_topic->>'name_en', 'est_minutes', null, 'route', null,
            'reason', v_reason || jsonb_build_object('code', 'gap', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en')));
        end if;
      elsif v_topic->>'band' = 'developing' then
        select * into v_content from public.academic_recommendable_content(array['practice_set'], (v_topic->>'topic_id')::uuid, null, v_grade, null, 2::smallint, v_member, p_profile.user_id) limit 1;
        if (v_content.item).id is not null then
          v_cands := v_cands || jsonb_build_array(jsonb_build_object('key', 'practice_set:' || (v_content.item).id, 'rule_id', 'R4', 'kind', 'practice_set',
            'content_item_id', (v_content.item).id, 'priority', 60 + v_bonus, 'quality', (v_content.item).quality_score, 'published_at', (v_content.item).published_at,
            'title_lo', v_content.external->>'title_lo', 'title_en', v_content.external->>'title_en', 'est_minutes', (v_content.item).est_minutes,
            'route', v_content.external->>'route',
            'reason', v_reason || jsonb_build_object('code', 'R4_mock', 'topic_lo', v_topic->>'name_lo', 'topic_en', v_topic->>'name_en', 'band', 'developing', 'date', v_mock.finished_at)));
        else
          v_gaps := v_gaps || jsonb_build_array(jsonb_build_object('rule_id', 'R4', 'subject_id', v_mock_subject.id, 'topic_id', v_topic->>'topic_id'));
        end if;
        v_content := null;
      end if;
    end loop;
  end if;

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

revoke all on function public.academic_build_recommendations(public.academic_student_profiles) from public, anon, authenticated;
