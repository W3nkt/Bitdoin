-- My Scores — diagnostic quizzes (P2-ANL, #49: QUIZ-001..003, ANALYSIS-005, F11).
--
-- A diagnostic is an ordered set of approved items for one subject and grade
-- (migration 131), published by an admin. Publishing needs 10–15 items, all
-- servable, at least 3 per topic (setting diagnostic_rules; provisional
-- decision QUIZ-RULES in the register). Publishing a new one retires the old.
--
-- Students (only while insights_enabled is on):
--   academic_get_quiz_offer(subject_enrolment)  the CTA on a subject page: a
--       published diagnostic for that subject and the student's grade, or null
--   academic_start_quiz(diagnostic)  starts, or resumes an attempt within 7 days;
--       items one by one, never with the answer
--   academic_answer_quiz_item / academic_finish_quiz  progress saved per answer
--   academic_get_quiz_result(attempt)  per topic: correct/total and a band
--       (Secure >= 80%, Developing 50–79%, Needs practice < 50%; fewer than 3
--       items: not_enough), then every item with the right answer and its
--       explanation (AI-drafted ones flagged for a label)
--   academic_export_my_quizzes()  quiz part of "Download my data"
-- Attempts belong to the profile: deleted with it, and with the 'scores' scope.
--
-- Retakes (QUIZ-004): a diagnostic can be a parallel form of a main one (same
-- topics with the same number of items each, no shared items). A main form
-- and its published parallel forms are a family. After finishing, the next
-- attempt in the family opens retake_days later and uses a form the student
-- has not finished yet (else the one finished longest ago); its results show
-- the change per topic against the previous attempt. Conflicting evidence
-- (ANALYSIS-007): the offer says when the last result was >= 80% in every
-- tested topic, so a subject labelled lower can show both views.

insert into public.academic_settings (key, value, description) values
  ('diagnostic_rules', '{"min_items": 10, "max_items": 15, "min_per_topic": 3, "resume_days": 7, "retake_days": 7}',
   'QUIZ-001/002/004: items per diagnostic, items per topic for a band, days an unfinished quiz can be resumed, days before a retake.')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_diagnostics (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references public.academic_subjects(id),
  grade_id     uuid not null references public.academic_grades(id),
  -- QUIZ-004: the main form this one is a parallel form of.
  parallel_of  uuid references public.academic_diagnostics(id),
  title_lo     varchar(120) not null check (length(btrim(title_lo)) > 0),
  title_en     varchar(120) not null check (length(btrim(title_en)) > 0),
  status       text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version      integer not null default 1,
  created_by   uuid references public.users(id) on delete set null,
  published_by uuid references public.users(id) on delete set null,
  published_at timestamptz,
  retired_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (parallel_of is distinct from id)
);
-- One published main form per subject and grade; any number of parallel forms.
create unique index if not exists academic_diagnostics_one_published on public.academic_diagnostics (subject_id, grade_id) where status = 'published' and parallel_of is null;

create table if not exists public.academic_diagnostic_items (
  diagnostic_id uuid not null references public.academic_diagnostics(id) on delete cascade,
  item_id       uuid not null references public.academic_quiz_items(id),
  position      smallint not null check (position > 0),
  primary key (diagnostic_id, item_id),
  unique (diagnostic_id, position)
);

create table if not exists public.academic_quiz_attempts (
  id                 uuid primary key default gen_random_uuid(),
  diagnostic_id      uuid not null references public.academic_diagnostics(id),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  item_ids           uuid[] not null check (cardinality(item_ids) > 0),
  status             text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),
  started_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  completed_at       timestamptz,
  results            jsonb
);
create index if not exists academic_quiz_attempts_profile_idx on public.academic_quiz_attempts (student_profile_id, diagnostic_id, started_at desc);
create unique index if not exists academic_quiz_attempts_one_open on public.academic_quiz_attempts (student_profile_id, diagnostic_id) where status = 'in_progress';

create table if not exists public.academic_quiz_answers (
  attempt_id  uuid not null references public.academic_quiz_attempts(id) on delete cascade,
  item_id     uuid not null references public.academic_quiz_items(id),
  chosen_key  char(1) not null check (chosen_key between 'A' and 'F'),
  is_correct  boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, item_id)
);

do $$
declare
  t text;
begin
  foreach t in array array['academic_diagnostics', 'academic_diagnostic_items', 'academic_quiz_attempts', 'academic_quiz_answers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

create or replace trigger academic_diagnostics_touch
  before update on public.academic_diagnostics
  for each row execute function public.academic_touch_row();

-- ─── Rules and results ───────────────────────────────────────────────────────

create or replace function public.academic_diagnostic_rule(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.academic_setting('diagnostic_rules')->>p_key)::integer,
    case p_key when 'min_items' then 10 when 'max_items' then 15 when 'min_per_topic' then 3 else 7 end);
$$;

-- Items per topic of a diagnostic, as { topic_id: count } (its blueprint).
create or replace function public.academic_diagnostic_blueprint(p_diagnostic_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(topic_id, n), '{}'::jsonb)
  from (
    select i.topic_id, count(*) as n
    from public.academic_diagnostic_items di join public.academic_quiz_items i on i.id = di.item_id
    where di.diagnostic_id = p_diagnostic_id
    group by i.topic_id
  ) b;
$$;

-- The main form of a diagnostic's family (itself for a main form).
create or replace function public.academic_diagnostic_family(p_diagnostic_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(parallel_of, id) from public.academic_diagnostics where id = p_diagnostic_id;
$$;

-- >= 80% in every tested topic (ANALYSIS-007), from stored topic results.
create or replace function public.academic_quiz_results_strong(p_results jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_array_length(coalesce(p_results, '[]'::jsonb)) > 0
    and not exists (select 1 from jsonb_array_elements(p_results) r where (r->>'correct')::integer * 10 < (r->>'total')::integer * 8);
$$;

-- What stops a diagnostic being published, as field -> message.
create or replace function public.academic_diagnostic_problems(p_diagnostic_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_diag public.academic_diagnostics;
  v_count integer;
  v_problems jsonb := '{}'::jsonb;
begin
  select * into v_diag from public.academic_diagnostics where id = p_diagnostic_id;
  select count(*) into v_count from public.academic_diagnostic_items where diagnostic_id = p_diagnostic_id;
  if v_count not between public.academic_diagnostic_rule('min_items') and public.academic_diagnostic_rule('max_items') then
    v_problems := v_problems || jsonb_build_object('items', format('Use %s to %s items', public.academic_diagnostic_rule('min_items'), public.academic_diagnostic_rule('max_items')));
  end if;
  if exists (select 1 from public.academic_diagnostic_items di where di.diagnostic_id = p_diagnostic_id and not public.academic_quiz_item_servable(di.item_id)) then
    v_problems := v_problems || '{"approved": "Every item must be approved and in an active topic"}';
  end if;
  if exists (
    select 1 from public.academic_diagnostic_items di
    join public.academic_quiz_items i on i.id = di.item_id
    join public.academic_quiz_topics t on t.id = i.topic_id
    where di.diagnostic_id = p_diagnostic_id and (t.subject_id <> v_diag.subject_id or t.grade_id <> v_diag.grade_id)
  ) then
    v_problems := v_problems || '{"subject": "Every item must be from this subject and grade"}';
  end if;
  if exists (
    select 1 from public.academic_diagnostic_items di
    join public.academic_quiz_items i on i.id = di.item_id
    where di.diagnostic_id = p_diagnostic_id
    group by i.topic_id having count(*) < public.academic_diagnostic_rule('min_per_topic')
  ) then
    v_problems := v_problems || jsonb_build_object('topics', format('Give every topic at least %s items', public.academic_diagnostic_rule('min_per_topic')));
  end if;
  -- QUIZ-004: a parallel form follows its main form's blueprint with other items.
  if v_diag.parallel_of is not null then
    if not exists (select 1 from public.academic_diagnostics m where m.id = v_diag.parallel_of and m.status = 'published') then
      v_problems := v_problems || '{"parallel": "Publish the main diagnostic first"}';
    elsif public.academic_diagnostic_blueprint(v_diag.id) <> public.academic_diagnostic_blueprint(v_diag.parallel_of) then
      v_problems := v_problems || '{"parallel": "Use the same topics with the same number of items as the main diagnostic"}';
    end if;
    if exists (
      select 1 from public.academic_diagnostic_items mine
      join public.academic_diagnostic_items other on other.item_id = mine.item_id and other.diagnostic_id <> mine.diagnostic_id
      join public.academic_diagnostics d on d.id = other.diagnostic_id
      where mine.diagnostic_id = v_diag.id and d.status <> 'retired' and (d.id = v_diag.parallel_of or d.parallel_of = v_diag.parallel_of)
    ) then
      v_problems := v_problems || '{"overlap": "A parallel form needs different items from the other forms"}';
    end if;
  end if;
  return v_problems;
end;
$$;

-- F11 and QUIZ-002: per topic, correct / items and a mastery band.
create or replace function public.academic_quiz_topic_results(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'topic_id', r.topic_id, 'name_lo', r.name_lo, 'name_en', r.name_en, 'correct', r.correct, 'total', r.total,
    'band', case
      when r.total < public.academic_diagnostic_rule('min_per_topic') then 'not_enough'
      when r.correct * 10 >= r.total * 8 then 'secure'
      when r.correct * 2 >= r.total then 'developing'
      else 'needs_practice'
    end
  ) order by r.display_order, r.code), '[]'::jsonb)
  from (
    select t.id as topic_id, t.name_lo, t.name_en, t.display_order, t.code,
      count(*)::integer as total, (count(*) filter (where ans.is_correct))::integer as correct
    from public.academic_quiz_attempts a
    cross join lateral unnest(a.item_ids) as x(item_id)
    join public.academic_quiz_items i on i.id = x.item_id
    join public.academic_quiz_topics t on t.id = i.topic_id
    left join public.academic_quiz_answers ans on ans.attempt_id = a.id and ans.item_id = i.id
    where a.id = p_attempt_id
    group by t.id
  ) r;
$$;

-- ─── Student views ───────────────────────────────────────────────────────────

-- The attempt as the student sees it while answering: no correct answers.
create or replace function public.academic_quiz_attempt_view(p_attempt public.academic_quiz_attempts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id,
    'status', p_attempt.status,
    'expires_at', p_attempt.expires_at,
    'diagnostic', (select jsonb_build_object('id', d.id, 'title_lo', d.title_lo, 'title_en', d.title_en) from public.academic_diagnostics d where d.id = p_attempt.diagnostic_id),
    'items', (
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'position', x.ord, 'topic', jsonb_build_object('name_lo', t.name_lo, 'name_en', t.name_en),
        'stem_lo', i.stem_lo, 'stem_en', i.stem_en,
        'options', (select jsonb_agg(jsonb_build_object('key', o->>'key', 'text_lo', o->>'text_lo', 'text_en', o->>'text_en') order by k)
                    from jsonb_array_elements(i.options) with ordinality as y(o, k))
      ) order by x.ord)
      from unnest(p_attempt.item_ids) with ordinality as x(item_id, ord)
      join public.academic_quiz_items i on i.id = x.item_id
      join public.academic_quiz_topics t on t.id = i.topic_id
    ),
    'answers', coalesce((select jsonb_object_agg(item_id, chosen_key) from public.academic_quiz_answers where attempt_id = p_attempt.id), '{}'::jsonb)
  );
$$;

-- The finished attempt: topic results, then every item with the answer and explanation.
create or replace function public.academic_quiz_result_view(p_attempt public.academic_quiz_attempts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id,
    'completed_at', p_attempt.completed_at,
    'diagnostic', (select jsonb_build_object('id', d.id, 'title_lo', d.title_lo, 'title_en', d.title_en) from public.academic_diagnostics d where d.id = p_attempt.diagnostic_id),
    'topics', p_attempt.results,
    -- QUIZ-004: the student's previous finished attempt in the same family.
    'previous', (
      select jsonb_build_object('attempt_id', a.id, 'completed_at', a.completed_at, 'topics', a.results)
      from public.academic_quiz_attempts a
      where a.student_profile_id = p_attempt.student_profile_id and a.status = 'completed' and a.id <> p_attempt.id
        and a.completed_at < coalesce(p_attempt.completed_at, now())
        and public.academic_diagnostic_family(a.diagnostic_id) = public.academic_diagnostic_family(p_attempt.diagnostic_id)
      order by a.completed_at desc limit 1
    ),
    'items', (
      select jsonb_agg(jsonb_build_object(
        'position', x.ord, 'topic', jsonb_build_object('name_lo', t.name_lo, 'name_en', t.name_en),
        'stem_lo', i.stem_lo, 'stem_en', i.stem_en, 'options', i.options,
        'chosen_key', ans.chosen_key, 'correct_key', i.correct_key, 'is_correct', coalesce(ans.is_correct, false),
        'explanation_lo', i.explanation_lo, 'explanation_en', i.explanation_en, 'explanation_origin', i.explanation_origin
      ) order by x.ord)
      from unnest(p_attempt.item_ids) with ordinality as x(item_id, ord)
      join public.academic_quiz_items i on i.id = x.item_id
      join public.academic_quiz_topics t on t.id = i.topic_id
      left join public.academic_quiz_answers ans on ans.attempt_id = p_attempt.id and ans.item_id = i.id
    )
  );
$$;

-- The caller's attempt, or null (the caller then denies with a 404).
create or replace function public.academic_own_attempt(p_attempt_id uuid, p_for_write boolean)
returns public.academic_quiz_attempts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(p_for_write);
  v_attempt public.academic_quiz_attempts;
begin
  select * into v_attempt from public.academic_quiz_attempts
  where id = p_attempt_id and student_profile_id = v_profile.id;
  if v_attempt.id is not null and v_attempt.status = 'in_progress' and v_attempt.expires_at < now() then
    update public.academic_quiz_attempts set status = 'expired' where id = v_attempt.id returning * into v_attempt;
  end if;
  return v_attempt;
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

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

  return jsonb_build_object(
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

create or replace function public.academic_answer_quiz_item(p_attempt_id uuid, p_item_id uuid, p_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_quiz_attempts := public.academic_own_attempt(p_attempt_id, true);
  v_item public.academic_quiz_items;
begin
  if v_attempt.id is null then
    return public.academic_deny('quiz_attempt', p_attempt_id);
  end if;
  if v_attempt.status <> 'in_progress' then
    perform public.academic_raise('QUIZ_CLOSED', 409, 'This quiz is ' || v_attempt.status, jsonb_build_object('status', v_attempt.status));
  end if;
  if not p_item_id = any (v_attempt.item_ids) then
    perform public.academic_invalid('item_id', 'This question is not part of the quiz');
  end if;
  select * into v_item from public.academic_quiz_items where id = p_item_id;
  if not exists (select 1 from jsonb_array_elements(v_item.options) o where o->>'key' = p_key) then
    perform public.academic_invalid('key', 'Choose one of the answers');
  end if;
  insert into public.academic_quiz_answers (attempt_id, item_id, chosen_key, is_correct)
  values (v_attempt.id, p_item_id, p_key, p_key = v_item.correct_key)
  on conflict (attempt_id, item_id) do update set chosen_key = excluded.chosen_key, is_correct = excluded.is_correct, answered_at = now();
  return jsonb_build_object('answered', (select count(*) from public.academic_quiz_answers where attempt_id = v_attempt.id), 'total', cardinality(v_attempt.item_ids));
end;
$$;

create or replace function public.academic_finish_quiz(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_quiz_attempts := public.academic_own_attempt(p_attempt_id, true);
  v_missing integer;
begin
  if v_attempt.id is null then
    return public.academic_deny('quiz_attempt', p_attempt_id);
  end if;
  if v_attempt.status = 'completed' then
    return public.academic_quiz_result_view(v_attempt);
  end if;
  if v_attempt.status <> 'in_progress' then
    perform public.academic_raise('QUIZ_CLOSED', 409, 'This quiz is ' || v_attempt.status, jsonb_build_object('status', v_attempt.status));
  end if;
  select cardinality(v_attempt.item_ids) - count(*) into v_missing from public.academic_quiz_answers where attempt_id = v_attempt.id;
  if v_missing > 0 then
    perform public.academic_raise('QUIZ_UNANSWERED', 409, 'Answer every question first', jsonb_build_object('missing', v_missing));
  end if;
  update public.academic_quiz_attempts
  set status = 'completed', completed_at = now(), results = public.academic_quiz_topic_results(v_attempt.id)
  where id = v_attempt.id
  returning * into v_attempt;
  return public.academic_quiz_result_view(v_attempt);
end;
$$;

create or replace function public.academic_get_quiz_result(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_quiz_attempts := public.academic_own_attempt(p_attempt_id, false);
begin
  if v_attempt.id is null then
    return public.academic_deny('quiz_attempt', p_attempt_id);
  end if;
  if v_attempt.status <> 'completed' then
    perform public.academic_raise('QUIZ_NOT_FINISHED', 409, 'Finish the quiz to see the results');
  end if;
  return public.academic_quiz_result_view(v_attempt);
end;
$$;

-- PRIV-004: the quiz part of "Download my data".
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
  return jsonb_build_object('attempts', coalesce((
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
  ), '[]'::jsonb));
end;
$$;

-- ─── Admin RPCs ──────────────────────────────────────────────────────────────

create or replace function public.academic_admin_list_diagnostics()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  return jsonb_build_object(
    'rules', public.academic_setting('diagnostic_rules'),
    'diagnostics', coalesce((
      select jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'subject_code', s.code, 'grade_code', g.code,
        'item_ids', coalesce((select jsonb_agg(di.item_id order by di.position) from public.academic_diagnostic_items di where di.diagnostic_id = d.id), '[]'::jsonb),
        'problems', public.academic_diagnostic_problems(d.id),
        'attempts', (select count(*) from public.academic_quiz_attempts a where a.diagnostic_id = d.id),
        'completed', (select count(*) from public.academic_quiz_attempts a where a.diagnostic_id = d.id and a.status = 'completed')
      ) order by d.status = 'retired', s.code, g.ordinal, d.created_at desc)
      from public.academic_diagnostics d
      join public.academic_subjects s on s.id = d.subject_id
      join public.academic_grades g on g.id = d.grade_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Input: id? (a draft), subject_id, grade_id, title_lo, title_en, item_ids (in
-- order), parallel_of? (a main form of the same subject and grade, QUIZ-004).
create or replace function public.academic_admin_save_diagnostic(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_diag public.academic_diagnostics;
  v_ids uuid[];
  v_parallel uuid := nullif(p_input->>'parallel_of', '')::uuid;
begin
  if jsonb_typeof(p_input) is distinct from 'object' or jsonb_typeof(p_input->'item_ids') is distinct from 'array' then
    perform public.academic_invalid('input', 'Diagnostic details and item_ids are required');
  end if;
  if v_parallel is not null and not exists (
    select 1 from public.academic_diagnostics m
    where m.id = v_parallel and m.parallel_of is null and m.status <> 'retired' and m.id is distinct from nullif(p_input->>'id', '')::uuid
      and m.subject_id = (p_input->>'subject_id')::uuid and m.grade_id = (p_input->>'grade_id')::uuid
  ) then
    perform public.academic_invalid('parallel_of', 'Choose a main diagnostic of the same subject and grade');
  end if;
  select array_agg(value::uuid order by ord) into v_ids from jsonb_array_elements_text(p_input->'item_ids') with ordinality as x(value, ord);
  if cardinality(v_ids) <> (select count(distinct v) from unnest(v_ids) v)
     or exists (select 1 from unnest(v_ids) v where not exists (select 1 from public.academic_quiz_items i where i.id = v)) then
    perform public.academic_invalid('item_ids', 'Each item once, and only items from the bank');
  end if;
  begin
    if nullif(p_input->>'id', '') is null then
      insert into public.academic_diagnostics (subject_id, grade_id, parallel_of, title_lo, title_en, created_by)
      values ((p_input->>'subject_id')::uuid, (p_input->>'grade_id')::uuid, v_parallel, btrim(p_input->>'title_lo'), btrim(p_input->>'title_en'), v_admin)
      returning * into v_diag;
    else
      select * into v_diag from public.academic_diagnostics where id = (p_input->>'id')::uuid for update;
      if v_diag.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Diagnostic not found'); end if;
      if v_diag.status <> 'draft' then
        perform public.academic_raise('DIAGNOSTIC_LOCKED', 409, 'Only drafts can be changed; create a new draft instead');
      end if;
      update public.academic_diagnostics
      set subject_id = (p_input->>'subject_id')::uuid, grade_id = (p_input->>'grade_id')::uuid, parallel_of = v_parallel,
          title_lo = btrim(p_input->>'title_lo'), title_en = btrim(p_input->>'title_en')
      where id = v_diag.id returning * into v_diag;
      delete from public.academic_diagnostic_items where diagnostic_id = v_diag.id;
    end if;
  exception when check_violation or not_null_violation or foreign_key_violation or invalid_text_representation then
    perform public.academic_invalid('diagnostic', 'Choose a subject and grade and give titles in Lao and English');
  end;
  insert into public.academic_diagnostic_items (diagnostic_id, item_id, position)
  select v_diag.id, v, ord::smallint from unnest(v_ids) with ordinality as x(v, ord);
  perform public.academic_audit('quiz.diagnostic_save', 'diagnostic', v_diag.id);
  return public.academic_admin_list_diagnostics();
end;
$$;

-- Actions: publish (draft -> published; a main form retires the subject and
-- grade's previous family, a parallel form joins its family), retire
-- (published -> retired with its parallel forms, note required).
create or replace function public.academic_admin_set_diagnostic_status(p_diagnostic_id uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_diag public.academic_diagnostics;
  v_problems jsonb;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_diag from public.academic_diagnostics where id = p_diagnostic_id for update;
  if v_diag.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Diagnostic not found'); end if;

  if p_action = 'publish' and v_diag.status = 'draft' then
    v_problems := public.academic_diagnostic_problems(v_diag.id);
    if v_problems <> '{}'::jsonb then
      perform public.academic_raise('DIAGNOSTIC_INCOMPLETE', 400, 'Fix the diagnostic before publishing', jsonb_build_object('problems', v_problems));
    end if;
    if v_diag.parallel_of is null then
      -- A new main form retires the previous family (main and parallel forms).
      update public.academic_diagnostics set status = 'retired', retired_at = now()
      where status = 'published' and (
        (subject_id = v_diag.subject_id and grade_id = v_diag.grade_id and parallel_of is null)
        or parallel_of in (select id from public.academic_diagnostics where subject_id = v_diag.subject_id and grade_id = v_diag.grade_id and parallel_of is null and id <> v_diag.id)
      );
    end if;
    update public.academic_diagnostics set status = 'published', published_by = v_admin, published_at = now() where id = v_diag.id;
  elsif p_action = 'retire' and v_diag.status = 'published' then
    if length(coalesce(v_note, '')) < 5 then
      perform public.academic_invalid('note', 'Say why (5 characters or more)');
    end if;
    -- Retiring a main form retires its parallel forms too.
    update public.academic_diagnostics set status = 'retired', retired_at = now()
    where status = 'published' and (id = v_diag.id or parallel_of = v_diag.id);
  else
    perform public.academic_raise('DIAGNOSTIC_BAD_TRANSITION', 409, 'This diagnostic cannot be ' || coalesce(p_action, '?') || ' from ' || v_diag.status);
  end if;
  perform public.academic_audit('quiz.diagnostic_' || p_action, 'diagnostic', v_diag.id, null, 'success', left(v_note, 200));
  return public.academic_admin_list_diagnostics();
end;
$$;

-- ─── Deletion: the 'scores' scope removes quiz attempts too ──────────────────

-- As in migration 112, plus quiz attempts for the 'scores' scope. Deleting the
-- whole profile cascades to attempts and answers.
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
      update public.academic_student_profiles
      set status = case when consent_state = 'active' then 'active' else 'read_only' end,
          deletion_requested_at = null,
          deletion_scope = null
      where id = v_profile.id;
    else
      -- Cascades to enrolments, subjects, scores, revisions and quiz attempts.
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

revoke all on function public.academic_diagnostic_rule(text) from public, anon, authenticated;
revoke all on function public.academic_diagnostic_blueprint(uuid) from public, anon, authenticated;
revoke all on function public.academic_diagnostic_family(uuid) from public, anon, authenticated;
revoke all on function public.academic_quiz_results_strong(jsonb) from public, anon, authenticated;
revoke all on function public.academic_diagnostic_problems(uuid) from public, anon, authenticated;
revoke all on function public.academic_quiz_topic_results(uuid) from public, anon, authenticated;
revoke all on function public.academic_quiz_attempt_view(public.academic_quiz_attempts) from public, anon, authenticated;
revoke all on function public.academic_quiz_result_view(public.academic_quiz_attempts) from public, anon, authenticated;
revoke all on function public.academic_own_attempt(uuid, boolean) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_get_quiz_offer(uuid)', 'academic_start_quiz(uuid)', 'academic_answer_quiz_item(uuid,uuid,text)',
    'academic_finish_quiz(uuid)', 'academic_get_quiz_result(uuid)', 'academic_export_my_quizzes()',
    'academic_admin_list_diagnostics()', 'academic_admin_save_diagnostic(jsonb)', 'academic_admin_set_diagnostic_status(uuid,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
