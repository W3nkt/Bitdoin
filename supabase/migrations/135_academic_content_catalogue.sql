-- My Scores — content catalogue for recommendations (P2-REC #50: LEARN-004, OD-05).
--
-- The module's list of content it may recommend, with the metadata the rules
-- match on (PRD §14.6.3). Each entry points at one existing record:
--   academy_lesson     premium_lessons.id      available: PUBLISHED and published_at not in the future
--   academy_challenge  premium_weekly_challenges.id  available: active and running this week
--   practice_set       academic_quiz_topics.id available: topic active with >= 3 servable items
-- Academy items need an Academy subscription (REC-ACCESS); practice sets are
-- free (REC-PRACTICE). The adapter reads Academy tables read-only (OD-05); it
-- never writes them. Only status = published entries can be recommended, and
-- only while their record is available (LEARN-003).

create table if not exists public.academic_content_items (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('academy_lesson', 'academy_challenge', 'practice_set')),
  external_id    uuid not null,
  subject_ids    uuid[] not null check (cardinality(subject_ids) between 1 and 5),
  grade_min      smallint not null check (grade_min between 1 and 12),
  grade_max      smallint not null check (grade_max between 1 and 12),
  topic_ids      uuid[] not null check (cardinality(topic_ids) between 1 and 20),
  difficulty     smallint not null check (difficulty between 1 and 3),
  language       text not null check (language in ('lo', 'en')),
  est_minutes    smallint not null check (est_minutes between 1 and 240),
  objectives_lo  text[] not null default '{}',
  objectives_en  text[] not null default '{}',
  quality_score  smallint check (quality_score between 1 and 5),
  status         text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version        integer not null default 1,
  created_by     uuid references public.users(id) on delete set null,
  updated_by     uuid references public.users(id) on delete set null,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (grade_max >= grade_min),
  unique (kind, external_id)
);
create index if not exists academic_content_items_status_idx on public.academic_content_items (status);
alter table public.academic_content_items enable row level security;
revoke all on public.academic_content_items from anon, authenticated;

create or replace trigger academic_content_items_touch
  before update on public.academic_content_items
  for each row execute function public.academic_touch_row();

-- ─── Adapter (OD-05) ─────────────────────────────────────────────────────────

-- The record an entry points at: titles, whether it can be shown now, where it
-- opens and whether it needs an Academy subscription. Null if it does not exist.
create or replace function public.academic_external_content(p_kind text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if p_kind = 'academy_lesson' then
    select jsonb_build_object('title_lo', l.title_lo, 'title_en', l.title_en,
      'available', l.status = 'PUBLISHED' and (l.published_at is null or l.published_at <= now()),
      'route', '/academy/lesson/' || l.slug, 'membership', true)
    into v from public.premium_lessons l where l.id = p_id;
  elsif p_kind = 'academy_challenge' then
    select jsonb_build_object('title_lo', c.title_lo, 'title_en', c.title_en,
      'available', c.is_active and public.academic_today() between c.starts_on and c.ends_on,
      'route', '/academy/challenges', 'membership', true)
    into v from public.premium_weekly_challenges c where c.id = p_id;
  elsif p_kind = 'practice_set' then
    select jsonb_build_object('title_lo', t.name_lo, 'title_en', t.name_en,
      'available', t.active and (select count(*) from public.academic_quiz_items i where i.topic_id = t.id and i.status = 'approved') >= 3,
      'route', '/academy/scores/practice/' || t.id, 'membership', false)
    into v from public.academic_quiz_topics t where t.id = p_id;
  end if;
  return v;
end;
$$;

-- ─── Admin RPCs ──────────────────────────────────────────────────────────────

create or replace function public.academic_content_item_json(p_item public.academic_content_items)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(p_item) || jsonb_build_object(
    'external', public.academic_external_content(p_item.kind, p_item.external_id),
    'subject_codes', (select coalesce(jsonb_agg(s.code order by s.code), '[]'::jsonb) from public.academic_subjects s where s.id = any (p_item.subject_ids)),
    'topic_names', (select coalesce(jsonb_agg(t.name_en order by t.display_order, t.code), '[]'::jsonb) from public.academic_quiz_topics t where t.id = any (p_item.topic_ids))
  );
$$;

create or replace function public.academic_admin_list_content()
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
    select jsonb_agg(public.academic_content_item_json(c) order by c.status = 'retired', c.kind, c.created_at desc)
    from public.academic_content_items c
  ), '[]'::jsonb);
end;
$$;

-- Existing records that can be catalogued: Academy lessons and challenges by
-- title, or quiz topics for practice sets. Up to 30, untagged first.
create or replace function public.academic_admin_search_external_content(p_kind text, p_search text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_like text := '%' || lower(btrim(coalesce(p_search, ''))) || '%';
begin
  if p_kind = 'academy_lesson' then
    return coalesce((select jsonb_agg(r order by r->>'tagged', r->>'title_en') from (
      select jsonb_build_object('id', l.id, 'title_en', l.title_en, 'title_lo', l.title_lo, 'detail', l.status,
        'available', l.status = 'PUBLISHED' and (l.published_at is null or l.published_at <= now()),
        'tagged', exists (select 1 from public.academic_content_items c where c.kind = p_kind and c.external_id = l.id)) as r
      from public.premium_lessons l
      where lower(l.title_en) like v_like or lower(l.title_lo) like v_like or lower(l.slug) like v_like
      order by l.title_en limit 30) x), '[]'::jsonb);
  elsif p_kind = 'academy_challenge' then
    return coalesce((select jsonb_agg(r order by r->>'tagged', r->>'title_en') from (
      select jsonb_build_object('id', c.id, 'title_en', c.title_en, 'title_lo', c.title_lo, 'detail', c.starts_on || ' – ' || c.ends_on,
        'available', c.is_active and public.academic_today() between c.starts_on and c.ends_on,
        'tagged', exists (select 1 from public.academic_content_items i where i.kind = p_kind and i.external_id = c.id)) as r
      from public.premium_weekly_challenges c
      where lower(c.title_en) like v_like or lower(c.title_lo) like v_like or lower(c.slug) like v_like
      order by c.starts_on desc limit 30) x), '[]'::jsonb);
  elsif p_kind = 'practice_set' then
    return coalesce((select jsonb_agg(r order by r->>'tagged', r->>'title_en') from (
      select jsonb_build_object('id', t.id, 'title_en', t.name_en, 'title_lo', t.name_lo, 'detail', s.code || ' · ' || g.code,
        'available', t.active and (select count(*) from public.academic_quiz_items i where i.topic_id = t.id and i.status = 'approved') >= 3,
        'tagged', exists (select 1 from public.academic_content_items c where c.kind = p_kind and c.external_id = t.id)) as r
      from public.academic_quiz_topics t
      join public.academic_subjects s on s.id = t.subject_id
      join public.academic_grades g on g.id = t.grade_id
      where lower(t.name_en) like v_like or lower(t.name_lo) like v_like or lower(t.code) like v_like
      order by t.name_en limit 30) x), '[]'::jsonb);
  end if;
  perform public.academic_invalid('kind', 'Choose a content type');
end;
$$;

-- Input: id? (update), kind, external_id, subject_ids, grade_min, grade_max,
-- topic_ids, difficulty, language, est_minutes, objectives_lo?, objectives_en?,
-- quality_score?, status? (LEARN-004 required fields).
create or replace function public.academic_admin_save_content(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_kind text := p_input->>'kind';
  v_external uuid;
  v_subjects uuid[];
  v_topics uuid[];
  v_status text := coalesce(p_input->>'status', 'draft');
  v_item public.academic_content_items;
begin
  if jsonb_typeof(p_input) is distinct from 'object' then
    perform public.academic_invalid('input', 'Content details are required');
  end if;
  begin
    v_external := (p_input->>'external_id')::uuid;
    select array_agg(value::uuid) into v_subjects from jsonb_array_elements_text(coalesce(p_input->'subject_ids', '[]')) as x(value);
    select array_agg(value::uuid) into v_topics from jsonb_array_elements_text(coalesce(p_input->'topic_ids', '[]')) as x(value);
  exception when invalid_text_representation then
    perform public.academic_invalid('input', 'IDs must be valid');
  end;
  if v_kind is null or v_kind not in ('academy_lesson', 'academy_challenge', 'practice_set') then
    perform public.academic_invalid('kind', 'Choose a content type');
  end if;
  if v_external is null or public.academic_external_content(v_kind, v_external) is null then
    perform public.academic_invalid('external_id', 'Choose an existing lesson, challenge or topic');
  end if;
  if coalesce(cardinality(v_subjects), 0) = 0
     or exists (select 1 from unnest(v_subjects) s where not exists (select 1 from public.academic_subjects x where x.id = s)) then
    perform public.academic_invalid('subject_ids', 'Choose at least one subject');
  end if;
  if coalesce(cardinality(v_topics), 0) = 0
     or exists (select 1 from unnest(v_topics) t where not exists (
       select 1 from public.academic_quiz_topics x where x.id = t and x.subject_id = any (v_subjects))) then
    perform public.academic_invalid('topic_ids', 'Choose at least one topic of the chosen subjects');
  end if;
  if v_kind = 'practice_set' and not v_external = any (v_topics) then
    perform public.academic_invalid('topic_ids', 'A practice set is tagged with its own topic');
  end if;

  begin
    if nullif(p_input->>'id', '') is null then
      insert into public.academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language,
        est_minutes, objectives_lo, objectives_en, quality_score, status, created_by, updated_by, published_at)
      values (v_kind, v_external, v_subjects, (p_input->>'grade_min')::smallint, (p_input->>'grade_max')::smallint, v_topics,
        (p_input->>'difficulty')::smallint, p_input->>'language', (p_input->>'est_minutes')::smallint,
        coalesce(array(select jsonb_array_elements_text(p_input->'objectives_lo')), '{}'),
        coalesce(array(select jsonb_array_elements_text(p_input->'objectives_en')), '{}'),
        nullif(p_input->>'quality_score', '')::smallint, v_status, v_admin, v_admin,
        case when v_status = 'published' then now() end)
      returning * into v_item;
    else
      update public.academic_content_items set
        kind = v_kind, external_id = v_external, subject_ids = v_subjects,
        grade_min = (p_input->>'grade_min')::smallint, grade_max = (p_input->>'grade_max')::smallint, topic_ids = v_topics,
        difficulty = (p_input->>'difficulty')::smallint, language = p_input->>'language', est_minutes = (p_input->>'est_minutes')::smallint,
        objectives_lo = coalesce(array(select jsonb_array_elements_text(p_input->'objectives_lo')), '{}'),
        objectives_en = coalesce(array(select jsonb_array_elements_text(p_input->'objectives_en')), '{}'),
        quality_score = nullif(p_input->>'quality_score', '')::smallint, status = v_status, updated_by = v_admin,
        published_at = case when v_status = 'published' then coalesce(published_at, now()) end
      where id = (p_input->>'id')::uuid
      returning * into v_item;
      if v_item.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Content not found'); end if;
    end if;
  exception
    when unique_violation then perform public.academic_invalid('external_id', 'This item is already in the catalogue');
    when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
      perform public.academic_invalid('content', 'Give a grade band, difficulty 1–3, language and minutes (1–240)');
  end;
  perform public.academic_audit('content.save', 'content_item', v_item.id, null, 'success', v_status);
  return public.academic_content_item_json(v_item);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_external_content(text, uuid) from public, anon, authenticated;
revoke all on function public.academic_content_item_json(public.academic_content_items) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['academic_admin_list_content()', 'academic_admin_search_external_content(text,text)', 'academic_admin_save_content(jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
