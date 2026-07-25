-- Sanity checks for the reading-summary backfill in 057/058. Fails loudly if
-- the auto-generation or curated content did not land as expected.

do $$
declare
  v_active_books integer;
  v_linked_lessons integer;
  v_published integer;
  v_bad_sections integer;
begin
  select count(*) into v_active_books from public.books where is_active = true;
  select count(*) into v_linked_lessons from public.premium_lessons where lesson_type = 'READING_SUMMARY' and book_id is not null;
  select count(*) into v_published from public.premium_lessons where lesson_type = 'READING_SUMMARY' and status = 'PUBLISHED';

  raise notice 'active books: %, linked reading-summary lessons: %, published: %', v_active_books, v_linked_lessons, v_published;

  if v_linked_lessons < v_active_books then
    raise exception 'expected every active book to have a linked reading-summary lesson (% books, % linked lessons)', v_active_books, v_linked_lessons;
  end if;

  if v_published < 14 then
    raise exception 'expected at least 14 published reading-summary lessons, found %', v_published;
  end if;

  select count(*) into v_bad_sections
  from public.premium_lessons
  where lesson_type = 'READING_SUMMARY' and status = 'PUBLISHED'
    and (jsonb_array_length(content_en) < 3 or jsonb_array_length(content_lo) < 3);

  if v_bad_sections > 0 then
    raise exception '% published reading-summary lessons have fewer than 3 sections', v_bad_sections;
  end if;

  raise notice 'reading-summary backfill verified: all active books linked, % lessons published with full content', v_published;
end $$;
