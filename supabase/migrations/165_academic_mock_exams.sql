-- My Scores — timed mock exams and practice sets (P5-EXAM #56, piece 2:
-- EXAM-001, EXAM-002; owner decision MOCK-EXAMS, 2026-10-27).
--
-- An attempt is built from a published exam blueprint (migration 164): for
-- each session, up to mock_rules.items_per_subject approved quiz-bank items
-- (QUIZ-005: licensed, second-reviewer approved) per subject, from Grades
-- 10–12 topics. It is offered only when every subject has at least
-- min_items_per_subject approved items. A blueprint for the intake the current
-- Grade 12 sits for makes a "mock" attempt; any other blueprint a "practice"
-- attempt (EXAM-001).
--
-- Sessions are timed on the server: a session starts when the student taps
-- Start, ends at start + minutes (+ grace_seconds for slow connections);
-- answers after that are refused and the session closes on the next request.
-- Results per subject and per topic (QUIZ-002 bands, at least 3 items per
-- topic) are kept with the attempt as their own evidence stream: never merged
-- with school scores or quizzes (EXAM-002, OD-14).
--
-- Access (MOCK-EXAMS): practice sets are free; mock exams need the
-- 'mock_exams' feature (Academy Premium), except 3 free per school year.

insert into public.academic_settings (key, value, description) values
  ('mock_rules', '{"items_per_subject": 10, "min_items_per_subject": 5, "grace_seconds": 30, "free_mocks_per_year": 3}',
   'EXAM-001: items per subject in a mock, the minimum to offer it, the timer grace and free mock exams per school year.')
on conflict (key) do nothing;

update public.academic_settings
set value = jsonb_set(value, '{mock_exams}', '{"free": false, "premium": true}')
where key = 'entitlement_features';

create table if not exists public.academic_mock_attempts (
  id                  uuid primary key default gen_random_uuid(),
  student_profile_id  uuid not null references public.academic_student_profiles(id) on delete cascade,
  academic_year_id    uuid references public.academic_years(id),
  blueprint_slug      text not null,
  kind                text not null check (kind in ('mock', 'practice')),
  blueprint           jsonb not null,
  -- [{ label_en, label_lo, minutes, subjects, items: [uuid], started_at, ends_at, finished_at }]
  sessions            jsonb not null,
  session_index       integer not null default 0,
  status              text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  result              jsonb,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz
);
create unique index if not exists academic_mock_attempts_one_open on public.academic_mock_attempts (student_profile_id) where status = 'in_progress';
create index if not exists academic_mock_attempts_profile_idx on public.academic_mock_attempts (student_profile_id, started_at desc);
alter table public.academic_mock_attempts enable row level security;
revoke all on public.academic_mock_attempts from anon, authenticated;

create table if not exists public.academic_mock_answers (
  attempt_id   uuid not null references public.academic_mock_attempts(id) on delete cascade,
  item_id      uuid not null references public.academic_quiz_items(id),
  session_no   integer not null,
  chosen_key   char(1) not null,
  is_correct   boolean not null,
  answered_at  timestamptz not null default now(),
  primary key (attempt_id, item_id)
);
alter table public.academic_mock_answers enable row level security;
revoke all on public.academic_mock_answers from anon, authenticated;

create or replace function public.academic_mock_rule(p_key text)
returns integer
language sql
stable
set search_path = ''
as $$
  select (public.academic_setting('mock_rules')->>p_key)::integer;
$$;

-- Approved, servable items for a subject in Grades 10–12.
create or replace function public.academic_mock_pool(p_subject_code text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id from public.academic_quiz_items i
  join public.academic_quiz_topics t on t.id = i.topic_id and t.active
  join public.academic_subjects s on s.id = t.subject_id and s.code = p_subject_code
  join public.academic_grades g on g.id = t.grade_id and g.level = 'upper_secondary'
  where i.status = 'approved';
$$;

-- What a blueprint can offer now: kind, and subjects without enough items.
create or replace function public.academic_mock_offer(p_blueprint jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind', case when p_blueprint->>'intake_year' = public.academic_exam_intake_year() then 'mock' else 'practice' end,
    'missing', coalesce((select jsonb_agg(distinct c) from jsonb_array_elements(p_blueprint->'sessions') x, jsonb_array_elements_text(x->'subjects') c
                         where (select count(*) from public.academic_mock_pool(c)) < public.academic_mock_rule('min_items_per_subject')), '[]'::jsonb));
$$;

create or replace function public.academic_mock_free_left(p_profile public.academic_student_profiles)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(public.academic_mock_rule('free_mocks_per_year') - (
    select count(*)::int from public.academic_mock_attempts a
    where a.student_profile_id = p_profile.id and a.kind = 'mock'
      and a.academic_year_id is not distinct from (select id from public.academic_years where status = 'active' order by start_date desc limit 1)), 0);
$$;

-- F11 / QUIZ-002 on the attempt's items: per subject and per topic.
create or replace function public.academic_mock_results(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select x.item_id::uuid as item_id, i.topic_id, t.name_en as topic_en, t.name_lo as topic_lo, t.display_order, t.code as topic_code,
           s.code as subject, s.name_en as subject_en, s.name_lo as subject_lo, coalesce(ans.is_correct, false) as correct
    from public.academic_mock_attempts a
    cross join lateral jsonb_array_elements(a.sessions) se
    cross join lateral jsonb_array_elements_text(se->'items') x(item_id)
    join public.academic_quiz_items i on i.id = x.item_id::uuid
    join public.academic_quiz_topics t on t.id = i.topic_id
    join public.academic_subjects s on s.id = t.subject_id
    left join public.academic_mock_answers ans on ans.attempt_id = a.id and ans.item_id = i.id
    where a.id = p_attempt_id
  )
  select jsonb_build_object(
    'correct', (select count(*) filter (where correct) from items), 'total', (select count(*) from items),
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('code', subject, 'name_en', subject_en, 'name_lo', subject_lo, 'correct', c, 'total', n) order by subject)
                          from (select subject, subject_en, subject_lo, count(*) filter (where correct) as c, count(*) as n from items group by 1, 2, 3) x), '[]'::jsonb),
    'topics', coalesce((select jsonb_agg(jsonb_build_object('topic_id', topic_id, 'subject', subject, 'name_en', topic_en, 'name_lo', topic_lo, 'correct', c, 'total', n,
                         'band', case when n < 3 then 'not_enough' when c * 10 >= n * 8 then 'secure' when c * 2 >= n then 'developing' else 'needs_practice' end)
                         order by subject, display_order, topic_code)
                        from (select topic_id, subject, topic_en, topic_lo, display_order, topic_code, count(*) filter (where correct) as c, count(*) as n from items group by 1, 2, 3, 4, 5, 6) x), '[]'::jsonb));
$$;

-- Close sessions whose time is up (and the attempt after the last one).
create or replace function public.academic_mock_tick(p_attempt public.academic_mock_attempts)
returns public.academic_mock_attempts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts := p_attempt;
  v_session jsonb;
  v_grace interval := make_interval(secs => public.academic_mock_rule('grace_seconds'));
begin
  if v_attempt.status <> 'in_progress' then
    return v_attempt;
  end if;
  v_session := v_attempt.sessions->v_attempt.session_index;
  if v_session->>'ends_at' is not null and (v_session->>'ends_at')::timestamptz + v_grace < now() then
    v_attempt := public.academic_mock_close_session(v_attempt);
  end if;
  return v_attempt;
end;
$$;

create or replace function public.academic_mock_close_session(p_attempt public.academic_mock_attempts)
returns public.academic_mock_attempts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts;
  v_last boolean := p_attempt.session_index >= jsonb_array_length(p_attempt.sessions) - 1;
begin
  update public.academic_mock_attempts
  set sessions = jsonb_set(sessions, array[session_index::text, 'finished_at'], to_jsonb(now())),
      session_index = case when v_last then session_index else session_index + 1 end,
      status = case when v_last then 'finished' else status end,
      finished_at = case when v_last then now() end
  where id = p_attempt.id
  returning * into v_attempt;
  if v_last then
    update public.academic_mock_attempts set result = public.academic_mock_results(id) where id = v_attempt.id returning * into v_attempt;
  end if;
  return v_attempt;
end;
$$;

-- The attempt as the student sees it: no correct answers until finished.
create or replace function public.academic_mock_view(p_attempt public.academic_mock_attempts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id, 'kind', p_attempt.kind, 'status', p_attempt.status, 'blueprint_slug', p_attempt.blueprint_slug,
    'name_en', p_attempt.blueprint->>'name_en', 'name_lo', p_attempt.blueprint->>'name_lo', 'intake_year', p_attempt.blueprint->>'intake_year',
    'session_index', p_attempt.session_index, 'now', now(), 'grace_seconds', public.academic_mock_rule('grace_seconds'),
    'started_at', p_attempt.started_at, 'finished_at', p_attempt.finished_at,
    'sessions', (select jsonb_agg(jsonb_build_object(
        'label_en', s->>'label_en', 'label_lo', s->>'label_lo', 'minutes', (s->>'minutes')::int, 'subjects', s->'subjects',
        'started_at', s->'started_at', 'ends_at', s->'ends_at', 'finished_at', s->'finished_at', 'item_count', jsonb_array_length(s->'items'),
        -- Items of the current, started session only (and none of a finished attempt here: see result).
        'items', case when n - 1 = p_attempt.session_index and p_attempt.status = 'in_progress' and s->>'started_at' is not null then (
          select jsonb_agg(jsonb_build_object(
            'id', i.id, 'position', x.ord, 'subject', sub.code, 'topic', jsonb_build_object('name_lo', t.name_lo, 'name_en', t.name_en),
            'stem_lo', i.stem_lo, 'stem_en', i.stem_en,
            'options', (select jsonb_agg(jsonb_build_object('key', o->>'key', 'text_lo', o->>'text_lo', 'text_en', o->>'text_en') order by k)
                        from jsonb_array_elements(i.options) with ordinality as y(o, k)),
            'chosen_key', (select ans.chosen_key from public.academic_mock_answers ans where ans.attempt_id = p_attempt.id and ans.item_id = i.id)
          ) order by x.ord)
          from jsonb_array_elements_text(s->'items') with ordinality as x(item_id, ord)
          join public.academic_quiz_items i on i.id = x.item_id::uuid
          join public.academic_quiz_topics t on t.id = i.topic_id
          join public.academic_subjects sub on sub.id = t.subject_id) end
      ) order by n) from jsonb_array_elements(p_attempt.sessions) with ordinality as z(s, n)),
    'result', p_attempt.result,
    'review', case when p_attempt.status = 'finished' then (
      select jsonb_agg(jsonb_build_object(
        'session', se.n, 'position', x.ord, 'subject', sub.code, 'topic', jsonb_build_object('name_lo', t.name_lo, 'name_en', t.name_en),
        'stem_lo', i.stem_lo, 'stem_en', i.stem_en, 'options', i.options,
        'chosen_key', ans.chosen_key, 'correct_key', i.correct_key, 'is_correct', coalesce(ans.is_correct, false),
        'explanation_lo', i.explanation_lo, 'explanation_en', i.explanation_en, 'explanation_origin', i.explanation_origin
      ) order by se.n, x.ord)
      from jsonb_array_elements(p_attempt.sessions) with ordinality as se(s, n)
      cross join lateral jsonb_array_elements_text(se.s->'items') with ordinality as x(item_id, ord)
      join public.academic_quiz_items i on i.id = x.item_id::uuid
      join public.academic_quiz_topics t on t.id = i.topic_id
      join public.academic_subjects sub on sub.id = t.subject_id
      left join public.academic_mock_answers ans on ans.attempt_id = p_attempt.id and ans.item_id = i.id) end);
$$;

create or replace function public.academic_own_mock(p_attempt_id uuid, p_for_write boolean)
returns public.academic_mock_attempts
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(p_for_write);
  v_attempt public.academic_mock_attempts;
begin
  select * into v_attempt from public.academic_mock_attempts where id = p_attempt_id and student_profile_id = v_profile.id;
  if v_attempt.id is not null then
    v_attempt := public.academic_mock_tick(v_attempt);
  end if;
  return v_attempt;
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- The exams page: what can be taken, the free allowance, the open attempt and past results.
create or replace function public.academic_mock_exams()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_entitled boolean := public.academic_has_feature(v_profile.user_id, 'mock_exams');
begin
  return jsonb_build_object(
    'entitled', v_entitled,
    'free_left', public.academic_mock_free_left(v_profile),
    'intake_year', public.academic_exam_intake_year(),
    'rules', jsonb_build_object('items_per_subject', public.academic_mock_rule('items_per_subject'), 'min_items_per_subject', public.academic_mock_rule('min_items_per_subject')),
    'blueprints', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'name_en', c.published->>'name_en', 'name_lo', c.published->>'name_lo', 'group', c.published->>'group',
          'intake_year', c.published->>'intake_year', 'sessions', c.published->'sessions') || public.academic_mock_offer(c.published)
        order by c.published->>'intake_year' desc, c.published->>'group')
      from public.academic_career_content c where c.kind = 'exam_blueprint' and c.status <> 'archived' and c.published is not null), '[]'::jsonb),
    'open', (select jsonb_build_object('attempt_id', a.id, 'name_en', a.blueprint->>'name_en', 'name_lo', a.blueprint->>'name_lo', 'kind', a.kind)
             from public.academic_mock_attempts a where a.student_profile_id = v_profile.id and a.status = 'in_progress'),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('attempt_id', a.id, 'kind', a.kind, 'name_en', a.blueprint->>'name_en', 'name_lo', a.blueprint->>'name_lo',
          'finished_at', a.finished_at, 'correct', a.result->'correct', 'total', a.result->'total') order by a.finished_at desc)
      from public.academic_mock_attempts a where a.student_profile_id = v_profile.id and a.status = 'finished'), '[]'::jsonb));
end;
$$;

create or replace function public.academic_start_mock(p_blueprint_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_blueprint public.academic_career_content;
  v_offer jsonb;
  v_open public.academic_mock_attempts;
  v_sessions jsonb;
  v_attempt public.academic_mock_attempts;
begin
  select * into v_open from public.academic_mock_attempts where student_profile_id = v_profile.id and status = 'in_progress';
  if v_open.id is not null then
    v_open := public.academic_mock_tick(v_open);
    if v_open.status = 'in_progress' then
      perform public.academic_raise('MOCK_IN_PROGRESS', 409, 'Finish the exam you started first', jsonb_build_object('attempt_id', v_open.id));
    end if;
  end if;
  select * into v_blueprint from public.academic_career_content
  where kind = 'exam_blueprint' and slug = p_blueprint_slug and status <> 'archived' and published is not null;
  if v_blueprint.id is null then
    perform public.academic_invalid('blueprint', 'No such exam');
  end if;
  v_offer := public.academic_mock_offer(v_blueprint.published);
  if jsonb_array_length(v_offer->'missing') > 0 then
    perform public.academic_raise('MOCK_NOT_READY', 409, 'Not enough questions yet for this exam', jsonb_build_object('missing', v_offer->'missing'));
  end if;
  if v_offer->>'kind' = 'mock' and not public.academic_has_feature(v_profile.user_id, 'mock_exams') and public.academic_mock_free_left(v_profile) = 0 then
    perform public.academic_raise('ENTITLEMENT_REQUIRED', 403, 'More mock exams come with Academy Premium', jsonb_build_object('feature', 'mock_exams'));
  end if;

  select jsonb_agg(s.value || jsonb_build_object('items', (
      select coalesce(jsonb_agg(item_id), '[]'::jsonb) from (
        select p.item_id from jsonb_array_elements_text(s.value->'subjects') sc(code)
        cross join lateral (
          select x as item_id from public.academic_mock_pool(sc.code) x order by random() limit public.academic_mock_rule('items_per_subject')) p
      ) q),
      'started_at', null, 'ends_at', null, 'finished_at', null) order by s.ordinality)
  into v_sessions
  from jsonb_array_elements(v_blueprint.published->'sessions') with ordinality s;

  insert into public.academic_mock_attempts (student_profile_id, academic_year_id, blueprint_slug, kind, blueprint, sessions)
  values (v_profile.id, (select id from public.academic_years where status = 'active' order by start_date desc limit 1), v_blueprint.slug, v_offer->>'kind',
          v_blueprint.published, v_sessions)
  returning * into v_attempt;
  perform public.academic_audit('mock.start', 'mock_attempt', v_attempt.id, v_profile.id, 'success', v_attempt.kind);
  return public.academic_mock_view(v_attempt);
end;
$$;

create or replace function public.academic_get_mock(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts := public.academic_own_mock(p_attempt_id, false);
begin
  if v_attempt.id is null then
    return public.academic_deny('mock_attempt', p_attempt_id);
  end if;
  return public.academic_mock_view(v_attempt);
end;
$$;

create or replace function public.academic_start_mock_session(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts := public.academic_own_mock(p_attempt_id, true);
  v_minutes integer;
begin
  if v_attempt.id is null then
    return public.academic_deny('mock_attempt', p_attempt_id);
  end if;
  if v_attempt.status = 'in_progress' and v_attempt.sessions->v_attempt.session_index->>'started_at' is null then
    v_minutes := (v_attempt.sessions->v_attempt.session_index->>'minutes')::int;
    update public.academic_mock_attempts
    set sessions = jsonb_set(jsonb_set(sessions, array[session_index::text, 'started_at'], to_jsonb(now())),
                             array[session_index::text, 'ends_at'], to_jsonb(now() + make_interval(mins => v_minutes)))
    where id = v_attempt.id
    returning * into v_attempt;
  end if;
  return public.academic_mock_view(v_attempt);
end;
$$;

create or replace function public.academic_answer_mock_item(p_attempt_id uuid, p_item_id uuid, p_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts := public.academic_own_mock(p_attempt_id, true);
  v_session jsonb;
  v_item public.academic_quiz_items;
begin
  if v_attempt.id is null then
    return public.academic_deny('mock_attempt', p_attempt_id);
  end if;
  v_session := v_attempt.sessions->v_attempt.session_index;
  if v_attempt.status <> 'in_progress' or v_session->>'started_at' is null then
    perform public.academic_raise('MOCK_SESSION_CLOSED', 409, 'This part of the exam is not open', jsonb_build_object('session_index', v_attempt.session_index, 'status', v_attempt.status));
  end if;
  if not exists (select 1 from jsonb_array_elements_text(v_session->'items') x where x = p_item_id::text) then
    perform public.academic_invalid('item_id', 'This question is not in the current part of the exam');
  end if;
  select * into v_item from public.academic_quiz_items where id = p_item_id;
  if not exists (select 1 from jsonb_array_elements(v_item.options) o where o->>'key' = p_key) then
    perform public.academic_invalid('key', 'Choose one of the answers');
  end if;
  insert into public.academic_mock_answers (attempt_id, item_id, session_no, chosen_key, is_correct)
  values (v_attempt.id, p_item_id, v_attempt.session_index + 1, p_key, p_key = v_item.correct_key)
  on conflict (attempt_id, item_id) do update set chosen_key = excluded.chosen_key, is_correct = excluded.is_correct, answered_at = now();
  return jsonb_build_object('answered', (select count(*) from public.academic_mock_answers where attempt_id = v_attempt.id and session_no = v_attempt.session_index + 1),
                            'total', jsonb_array_length(v_session->'items'));
end;
$$;

-- Hand in the current part (unanswered questions count as wrong); after the last part, the results.
create or replace function public.academic_finish_mock_session(p_attempt_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_attempt public.academic_mock_attempts := public.academic_own_mock(p_attempt_id, true);
begin
  if v_attempt.id is null then
    return public.academic_deny('mock_attempt', p_attempt_id);
  end if;
  if v_attempt.status = 'in_progress' and v_attempt.sessions->v_attempt.session_index->>'started_at' is not null then
    v_attempt := public.academic_mock_close_session(v_attempt);
    if v_attempt.status = 'finished' then
      perform public.academic_audit('mock.finish', 'mock_attempt', v_attempt.id, v_attempt.student_profile_id, 'success', v_attempt.kind);
    end if;
  end if;
  return public.academic_mock_view(v_attempt);
end;
$$;

-- PRIV-004: mock exams in "Download my data".
create or replace function public.academic_export_my_mocks()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('attempt_id', a.id, 'exam', a.blueprint->>'name_en', 'kind', a.kind, 'status', a.status,
      'started_at', a.started_at, 'finished_at', a.finished_at, 'result', a.result,
      'answers', (select coalesce(jsonb_agg(jsonb_build_object('session', ans.session_no, 'question', i.stem_lo, 'chosen', ans.chosen_key,
                    'correct', case when a.status = 'finished' then i.correct_key end) order by ans.session_no, ans.answered_at), '[]'::jsonb)
                  from public.academic_mock_answers ans join public.academic_quiz_items i on i.id = ans.item_id where ans.attempt_id = a.id)) order by a.started_at)
    from public.academic_mock_attempts a where a.student_profile_id = v_profile.id), '[]'::jsonb);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_mock_rule(text)', 'academic_mock_pool(text)', 'academic_mock_offer(jsonb)', 'academic_mock_free_left(public.academic_student_profiles)',
    'academic_mock_results(uuid)', 'academic_mock_tick(public.academic_mock_attempts)', 'academic_mock_close_session(public.academic_mock_attempts)',
    'academic_mock_view(public.academic_mock_attempts)', 'academic_own_mock(uuid,boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_mock_exams()', 'academic_start_mock(text)', 'academic_get_mock(uuid)', 'academic_start_mock_session(uuid)',
    'academic_answer_mock_item(uuid,uuid,text)', 'academic_finish_mock_session(uuid)', 'academic_export_my_mocks()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
