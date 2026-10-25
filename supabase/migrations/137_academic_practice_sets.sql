-- My Scores — practice sets (P2-REC #50: REC-PRACTICE, R3/R4).
--
-- A practice set is up to 5 approved items of one topic (servable, QUIZ-005),
-- offered while a published practice_set catalogue entry covers the topic and
-- the student's grade. Untimed; each answer is final and returns the correct
-- answer and its explanation at once. Unfinished sets resume (7 days); items
-- the student has practised least come first. Finishing marks the matching
-- next action done for 14 days and counts towards the R5 re-test (migration 136).
-- Practice belongs to the profile: exported with quizzes, deleted with the
-- 'scores' scope and the profile. Only while insights_enabled is on.

create table if not exists public.academic_practice_attempts (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  topic_id           uuid not null references public.academic_quiz_topics(id) on delete cascade,
  item_ids           uuid[] not null check (cardinality(item_ids) between 1 and 5),
  status             text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),
  started_at         timestamptz not null default now(),
  expires_at         timestamptz not null default now() + interval '7 days',
  completed_at       timestamptz,
  correct            integer
);
create index if not exists academic_practice_attempts_profile_idx on public.academic_practice_attempts (student_profile_id, topic_id, started_at desc);
create unique index if not exists academic_practice_attempts_one_open on public.academic_practice_attempts (student_profile_id, topic_id) where status = 'in_progress';

create table if not exists public.academic_practice_answers (
  attempt_id  uuid not null references public.academic_practice_attempts(id) on delete cascade,
  item_id     uuid not null references public.academic_quiz_items(id),
  chosen_key  char(1) not null check (chosen_key between 'A' and 'F'),
  is_correct  boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, item_id)
);

alter table public.academic_practice_attempts enable row level security;
alter table public.academic_practice_answers enable row level security;
revoke all on public.academic_practice_attempts from anon, authenticated;
revoke all on public.academic_practice_answers from anon, authenticated;

-- An answered item's feedback: correctness, the answer and its explanation.
create or replace function public.academic_practice_feedback(p_item public.academic_quiz_items, p_chosen text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('chosen_key', p_chosen, 'is_correct', p_chosen = p_item.correct_key, 'correct_key', p_item.correct_key,
    'explanation_lo', p_item.explanation_lo, 'explanation_en', p_item.explanation_en, 'explanation_origin', p_item.explanation_origin);
$$;

create or replace function public.academic_practice_view(p_attempt public.academic_practice_attempts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id, 'status', p_attempt.status, 'correct', p_attempt.correct,
    'topic', (select jsonb_build_object('id', t.id, 'name_lo', t.name_lo, 'name_en', t.name_en) from public.academic_quiz_topics t where t.id = p_attempt.topic_id),
    'items', (
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'position', x.ord, 'stem_lo', i.stem_lo, 'stem_en', i.stem_en,
        'options', (select jsonb_agg(jsonb_build_object('key', o->>'key', 'text_lo', o->>'text_lo', 'text_en', o->>'text_en') order by k)
                    from jsonb_array_elements(i.options) with ordinality as y(o, k)),
        'feedback', case when ans.item_id is not null then public.academic_practice_feedback(i, ans.chosen_key) end
      ) order by x.ord)
      from unnest(p_attempt.item_ids) with ordinality as x(item_id, ord)
      join public.academic_quiz_items i on i.id = x.item_id
      left join public.academic_practice_answers ans on ans.attempt_id = p_attempt.id and ans.item_id = i.id
    )
  );
$$;

create or replace function public.academic_own_practice(p_attempt_id uuid, p_for_write boolean)
returns public.academic_practice_attempts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(p_for_write);
  v_attempt public.academic_practice_attempts;
begin
  select * into v_attempt from public.academic_practice_attempts where id = p_attempt_id and student_profile_id = v_profile.id;
  if v_attempt.id is not null and v_attempt.status = 'in_progress' and v_attempt.expires_at < now() then
    update public.academic_practice_attempts set status = 'expired' where id = v_attempt.id returning * into v_attempt;
  end if;
  return v_attempt;
end;
$$;

-- Starts (or resumes) practice for a topic.
create or replace function public.academic_start_practice(p_topic_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_grade smallint;
  v_attempt public.academic_practice_attempts;
  v_items uuid[];
begin
  select g.ordinal into v_grade from public.academic_enrolments e join public.academic_grades g on g.id = e.grade_id
  where e.student_profile_id = v_profile.id and e.state = 'active' order by e.created_at desc limit 1;
  if public.academic_setting('insights_enabled') is distinct from 'true'::jsonb or v_grade is null
     or not exists (
       select 1 from public.academic_content_items c
       where c.kind = 'practice_set' and c.external_id = p_topic_id and c.status = 'published' and v_grade between c.grade_min and c.grade_max
         and coalesce((public.academic_external_content('practice_set', p_topic_id)->>'available')::boolean, false)
     ) then
    perform public.academic_raise('PRACTICE_UNAVAILABLE', 404, 'This practice is not available');
  end if;

  update public.academic_practice_attempts set status = 'expired'
  where student_profile_id = v_profile.id and topic_id = p_topic_id and status = 'in_progress' and expires_at < now();
  select * into v_attempt from public.academic_practice_attempts where student_profile_id = v_profile.id and topic_id = p_topic_id and status = 'in_progress';
  if v_attempt.id is null then
    select array_agg(id order by seen, id) into v_items from (
      select i.id, (select count(*) from public.academic_practice_answers pa join public.academic_practice_attempts pt on pt.id = pa.attempt_id
                    where pa.item_id = i.id and pt.student_profile_id = v_profile.id) as seen
      from public.academic_quiz_items i
      where i.topic_id = p_topic_id and public.academic_quiz_item_servable(i.id)
      order by seen, i.id limit 5
    ) s;
    insert into public.academic_practice_attempts (student_profile_id, topic_id, item_ids)
    values (v_profile.id, p_topic_id, v_items) returning * into v_attempt;
  end if;
  return public.academic_practice_view(v_attempt);
end;
$$;

-- Saves one answer (final) and returns the feedback.
create or replace function public.academic_answer_practice_item(p_attempt_id uuid, p_item_id uuid, p_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_practice_attempts := public.academic_own_practice(p_attempt_id, true);
  v_item public.academic_quiz_items;
  v_existing text;
begin
  if v_attempt.id is null then
    return public.academic_deny('practice_attempt', p_attempt_id);
  end if;
  if v_attempt.status <> 'in_progress' then
    perform public.academic_raise('PRACTICE_CLOSED', 409, 'This practice is ' || v_attempt.status);
  end if;
  if not p_item_id = any (v_attempt.item_ids) then
    perform public.academic_invalid('item_id', 'This question is not part of the practice');
  end if;
  select * into v_item from public.academic_quiz_items where id = p_item_id;
  select chosen_key into v_existing from public.academic_practice_answers where attempt_id = v_attempt.id and item_id = p_item_id;
  if v_existing is not null then
    return public.academic_practice_feedback(v_item, v_existing);
  end if;
  if not exists (select 1 from jsonb_array_elements(v_item.options) o where o->>'key' = p_key) then
    perform public.academic_invalid('key', 'Choose one of the answers');
  end if;
  insert into public.academic_practice_answers (attempt_id, item_id, chosen_key, is_correct)
  values (v_attempt.id, p_item_id, p_key, p_key = v_item.correct_key);
  return public.academic_practice_feedback(v_item, p_key);
end;
$$;

create or replace function public.academic_finish_practice(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_practice_attempts := public.academic_own_practice(p_attempt_id, true);
begin
  if v_attempt.id is null then
    return public.academic_deny('practice_attempt', p_attempt_id);
  end if;
  if v_attempt.status = 'in_progress' then
    if (select count(*) from public.academic_practice_answers where attempt_id = v_attempt.id) < cardinality(v_attempt.item_ids) then
      perform public.academic_raise('PRACTICE_UNANSWERED', 409, 'Answer every question first');
    end if;
    update public.academic_practice_attempts
    set status = 'completed', completed_at = now(),
        correct = (select count(*) from public.academic_practice_answers where attempt_id = v_attempt.id and is_correct)
    where id = v_attempt.id returning * into v_attempt;
  elsif v_attempt.status <> 'completed' then
    perform public.academic_raise('PRACTICE_CLOSED', 409, 'This practice is ' || v_attempt.status);
  end if;
  return jsonb_build_object('attempt_id', v_attempt.id, 'correct', v_attempt.correct, 'total', cardinality(v_attempt.item_ids));
end;
$$;

-- ─── Recommendations (migration 136) ─────────────────────────────────────────

-- R5: every Needs-practice topic of the quiz practised since it was taken.
create or replace function public.academic_practised_all(p_profile_id uuid, p_attempt public.academic_quiz_attempts)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from jsonb_array_elements(p_attempt.results) r where r->>'band' = 'needs_practice')
    and not exists (
      select 1 from jsonb_array_elements(p_attempt.results) r
      where r->>'band' = 'needs_practice' and not exists (
        select 1 from public.academic_practice_attempts p
        where p.student_profile_id = p_profile_id and p.topic_id = (r->>'topic_id')::uuid
          and p.status = 'completed' and p.completed_at > p_attempt.completed_at
      )
    );
$$;

-- As in migration 136, and a practice set finished in the last 14 days is done.
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
    and not (c.kind = 'practice_set' and exists (
      select 1 from public.academic_practice_attempts pa join public.academic_student_profiles sp on sp.id = pa.student_profile_id
      where sp.user_id = p_user_id and pa.topic_id = c.external_id and pa.status = 'completed' and pa.completed_at > now() - interval '14 days'))
  order by c.quality_score desc nulls last, c.published_at desc nulls last, c.id;
$$;

-- ─── Export and deletion ─────────────────────────────────────────────────────

-- As in migration 132, plus practice sets (PRIV-004).
create or replace function public.academic_export_my_quizzes()
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
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id', a.id, 'quiz', d.title_en, 'status', a.status, 'started_at', a.started_at, 'completed_at', a.completed_at,
        'topics', a.results,
        'answers', (
          select coalesce(jsonb_agg(jsonb_build_object('position', x.ord, 'question', i.stem_lo, 'chosen', ans.chosen_key,
            'correct', case when a.status = 'completed' then i.correct_key end) order by x.ord), '[]'::jsonb)
          from unnest(a.item_ids) with ordinality as x(item_id, ord)
          join public.academic_quiz_items i on i.id = x.item_id
          left join public.academic_quiz_answers ans on ans.attempt_id = a.id and ans.item_id = i.id
        )
      ) order by a.started_at)
      from public.academic_quiz_attempts a join public.academic_diagnostics d on d.id = a.diagnostic_id
      where a.student_profile_id = v_profile.id
    ), '[]'::jsonb),
    'practice', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attempt_id', p.id, 'topic', t.name_en, 'status', p.status, 'started_at', p.started_at, 'completed_at', p.completed_at, 'correct', p.correct,
        'answers', (
          select coalesce(jsonb_agg(jsonb_build_object('position', x.ord, 'question', i.stem_lo, 'chosen', ans.chosen_key, 'correct', i.correct_key) order by x.ord), '[]'::jsonb)
          from unnest(p.item_ids) with ordinality as x(item_id, ord)
          join public.academic_quiz_items i on i.id = x.item_id
          join public.academic_practice_answers ans on ans.attempt_id = p.id and ans.item_id = i.id
        )
      ) order by p.started_at)
      from public.academic_practice_attempts p join public.academic_quiz_topics t on t.id = p.topic_id
      where p.student_profile_id = v_profile.id
    ), '[]'::jsonb)
  );
end;
$$;

-- As in migration 132, plus practice attempts for the 'scores' scope.
create or replace function public.academic_purge_due_deletions()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grace integer := coalesce((public.academic_setting('deletion_grace_days') #>> '{}')::integer, 14);
  v_profile public.academic_student_profiles;
  v_count integer := 0;
begin
  for v_profile in
    select * from public.academic_student_profiles
    where status = 'deletion_pending'
      and deletion_requested_at <= now() - make_interval(days => v_grace)
    for update skip locked
  loop
    if v_profile.deletion_scope = 'scores' then
      delete from public.academic_score_entries
      where enrolment_id in (select id from public.academic_enrolments where student_profile_id = v_profile.id);
      delete from public.academic_quiz_attempts where student_profile_id = v_profile.id;
      delete from public.academic_practice_attempts where student_profile_id = v_profile.id;
      update public.academic_student_profiles
      set status = case when consent_state = 'active' then 'active' else 'read_only' end,
          deletion_requested_at = null,
          deletion_scope = null
      where id = v_profile.id;
    else
      -- Cascades to enrolments, subjects, scores, revisions, quizzes and practice.
      -- Consent records keep their evidence with the profile link set to null.
      delete from public.academic_student_profiles where id = v_profile.id;
    end if;

    perform public.academic_audit('privacy.purge', 'student_profile', v_profile.id, v_profile.id, 'success', v_profile.deletion_scope);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_purge_due_deletions() from public, anon, authenticated;
grant execute on function public.academic_purge_due_deletions() to service_role;
revoke all on function public.academic_practice_feedback(public.academic_quiz_items, text) from public, anon, authenticated;
revoke all on function public.academic_practised_all(uuid, public.academic_quiz_attempts) from public, anon, authenticated;
revoke all on function public.academic_recommendable_content(text[], uuid, uuid, smallint, smallint, smallint, boolean, uuid) from public, anon, authenticated;
revoke all on function public.academic_practice_view(public.academic_practice_attempts) from public, anon, authenticated;
revoke all on function public.academic_own_practice(uuid, boolean) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['academic_start_practice(uuid)', 'academic_answer_practice_item(uuid,uuid,text)', 'academic_finish_practice(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
