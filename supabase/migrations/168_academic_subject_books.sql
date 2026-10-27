-- My Scores — "Books that may help" (P5-EXAM #56, piece 4: LEARN-006; owner
-- decision MOCK-EXAMS, 2026-10-27).
--
-- A Bookstore title becomes a fourth kind of catalogue content ('book'),
-- tagged by an admin in the Content tab like the other kinds (LEARN-004:
-- subjects, grade band, topics, difficulty, language). A subject page shows at
-- most 2 published, tagged titles for that subject and the student's grade
-- that are active and in stock at one or more bookstores, with their language,
-- the price range from the existing price-comparison data (book_prices) and a
-- link to /bookstore/books/{id}. The section is labelled optional. Books are
-- never part of next actions or guardian reports. The adapter reads the
-- Bookstore tables read-only (OD-05). Content language may now be Thai, as
-- Bookstore titles can be.

alter table public.academic_content_items drop constraint if exists academic_content_items_kind_check;
alter table public.academic_content_items add constraint academic_content_items_kind_check check (kind in ('academy_lesson', 'academy_challenge', 'practice_set', 'book'));
alter table public.academic_content_items drop constraint if exists academic_content_items_language_check;
alter table public.academic_content_items add constraint academic_content_items_language_check check (language in ('lo', 'en', 'th'));

-- Unchanged from 135 apart from books.
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
  -- LEARN-006 (migration 168): a Bookstore title, available while active and in stock somewhere.
  elsif p_kind = 'book' then
    select jsonb_build_object('title_lo', b.title, 'title_en', b.title, 'author', b.author, 'book_language', b.language, 'cover_image_url', b.cover_image_url,
      'available', b.is_active and exists (select 1 from public.book_prices p where p.book_id = b.id and p.availability::text = 'AVAILABLE'),
      'price_min', (select min(p.final_price) from public.book_prices p where p.book_id = b.id and p.availability::text = 'AVAILABLE'),
      'price_max', (select max(p.final_price) from public.book_prices p where p.book_id = b.id and p.availability::text = 'AVAILABLE'),
      'route', '/bookstore/books/' || b.id, 'membership', false)
    into v from public.books b where b.id = p_id;
  end if;
  return v;
end;
$$;

-- Unchanged from 135 apart from books.
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
  elsif p_kind = 'book' then
    return coalesce((select jsonb_agg(r order by r->>'tagged', r->>'title_en') from (
      select jsonb_build_object('id', b.id, 'title_en', b.title, 'title_lo', b.title, 'detail', coalesce(b.author, '—') || ' · ' || coalesce(b.language, '—'),
        'available', b.is_active and exists (select 1 from public.book_prices p where p.book_id = b.id and p.availability::text = 'AVAILABLE'),
        'tagged', exists (select 1 from public.academic_content_items c where c.kind = p_kind and c.external_id = b.id)) as r
      from public.books b
      where lower(b.title) like v_like or lower(coalesce(b.author, '')) like v_like or lower(coalesce(b.isbn, '')) like v_like
      order by b.title limit 30) x), '[]'::jsonb);
  end if;
  perform public.academic_invalid('kind', 'Choose a content type');
end;
$$;

-- Unchanged from 135 apart from books.
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
  if v_kind is null or v_kind not in ('academy_lesson', 'academy_challenge', 'practice_set', 'book') then
    perform public.academic_invalid('kind', 'Choose a content type');
  end if;
  if v_external is null or public.academic_external_content(v_kind, v_external) is null then
    perform public.academic_invalid('external_id', 'Choose an existing lesson, challenge, topic or book');
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

-- LEARN-006: up to 2 books for one of the caller's subjects.
create or replace function public.academic_subject_books(p_subject_enrolment_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_subject public.academic_subject_enrolments;
  v_grade smallint;
begin
  select se.* into v_subject from public.academic_subject_enrolments se
  join public.academic_enrolments e on e.id = se.enrolment_id
  where se.id = p_subject_enrolment_id and e.student_profile_id = v_profile.id;
  if v_subject.id is null then
    return public.academic_deny('subject_enrolment', p_subject_enrolment_id);
  end if;
  select g.ordinal into v_grade from public.academic_enrolments e join public.academic_grades g on g.id = e.grade_id where e.id = v_subject.enrolment_id;
  return coalesce((
    select jsonb_agg(jsonb_build_object('book_id', x.external_id, 'title', x.ext->>'title_en', 'author', x.ext->>'author', 'language', x.ext->>'book_language',
        'cover_image_url', x.ext->>'cover_image_url', 'price_min', (x.ext->>'price_min')::numeric, 'price_max', (x.ext->>'price_max')::numeric, 'route', x.ext->>'route')
      order by x.ord)
    from (
      select c.external_id, public.academic_external_content('book', c.external_id) as ext,
             row_number() over (order by c.quality_score desc nulls last, c.published_at desc) as ord
      from public.academic_content_items c
      where c.kind = 'book' and c.status = 'published' and v_subject.subject_id = any (c.subject_ids)
        and v_grade between c.grade_min and c.grade_max
        and coalesce((public.academic_external_content('book', c.external_id)->>'available')::boolean, false)
    ) x where x.ord <= 2), '[]'::jsonb);
end;
$$;

revoke all on function public.academic_external_content(text, uuid) from public, anon, authenticated;
revoke all on function public.academic_subject_books(uuid) from public, anon;
grant execute on function public.academic_subject_books(uuid) to authenticated;
