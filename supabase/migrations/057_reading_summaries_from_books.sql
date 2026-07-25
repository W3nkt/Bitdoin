-- Links Premium reading-summary lessons to their source bookstore book, and
-- auto-creates a draft reading-summary stub whenever a book is added to the
-- bookstore catalog, so admins can research and publish a real summary later.

alter table public.premium_lessons
  add column if not exists book_id uuid references public.books(id) on delete set null;

create unique index if not exists premium_lessons_book_id_key
  on public.premium_lessons (book_id) where book_id is not null;

create or replace function public.strip_html(input text, max_len integer default 600)
returns text
language sql
immutable
as $$
  select nullif(
    left(trim(regexp_replace(regexp_replace(coalesce(input, ''), '<[^>]+>', ' ', 'g'), '\s+', ' ', 'g')), max_len),
    ''
  );
$$;

create or replace function public.premium_reading_summary_slug(p_title text, p_book_id uuid)
returns text
language plpgsql
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(trim(coalesce(p_title, '')), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  if base = '' or base is null then
    base := 'book';
  end if;
  base := left(base, 56) || '-summary';
  candidate := base;
  while exists (
    select 1 from public.premium_lessons
    where slug = candidate and book_id is distinct from p_book_id
  ) loop
    n := n + 1;
    candidate := left(base, 56) || '-' || n;
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_reading_summary_for_book()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_slug text;
begin
  if new.is_active is distinct from true then
    return new;
  end if;
  if exists (select 1 from public.premium_lessons where book_id = new.id) then
    return new;
  end if;

  select id into v_category_id from public.premium_learning_categories where slug = 'reading-summaries';
  if v_category_id is null then
    return new;
  end if;

  v_slug := public.premium_reading_summary_slug(new.title, new.id);

  insert into public.premium_lessons (
    category_id, book_id, slug, title_en, title_lo, summary_en, summary_lo,
    content_en, content_lo, key_takeaways_en, key_takeaways_lo,
    estimated_minutes, lesson_type, status, sort_order
  ) values (
    v_category_id, new.id, v_slug,
    new.title || ': practical summary',
    new.title || ': ສະຫຼຸບນຳໃຊ້',
    coalesce(public.strip_html(new.description, 220), 'A practical summary is being prepared for this book.'),
    coalesce(public.strip_html(new.description, 220), 'ກໍາລັງກະກຽມສະຫຼຸບປຶ້ມນີ້.'),
    jsonb_build_array(jsonb_build_object(
      'heading', 'About this book',
      'body', coalesce(public.strip_html(new.description, 1200), 'Add a practical summary for ' || new.title || '.')
    )),
    jsonb_build_array(jsonb_build_object(
      'heading', 'ກ່ຽວກັບປຶ້ມນີ້',
      'body', coalesce(public.strip_html(new.description, 1200), 'ເພີ່ມສະຫຼຸບນຳໃຊ້ສຳລັບ ' || new.title || '.')
    )),
    '{}', '{}',
    8, 'READING_SUMMARY', 'DRAFT', 0
  );

  return new;
end;
$$;

drop trigger if exists premium_reading_summary_on_book_insert on public.books;
create trigger premium_reading_summary_on_book_insert
  after insert on public.books
  for each row execute function public.create_reading_summary_for_book();

-- Backfill: draft stubs for every active book that doesn't have one yet.
do $$
declare
  v_category_id uuid;
  book_row record;
  v_slug text;
begin
  select id into v_category_id from public.premium_learning_categories where slug = 'reading-summaries';
  if v_category_id is null then
    return;
  end if;

  for book_row in
    select b.* from public.books b
    where b.is_active = true
      and not exists (select 1 from public.premium_lessons pl where pl.book_id = b.id)
  loop
    v_slug := public.premium_reading_summary_slug(book_row.title, book_row.id);
    insert into public.premium_lessons (
      category_id, book_id, slug, title_en, title_lo, summary_en, summary_lo,
      content_en, content_lo, key_takeaways_en, key_takeaways_lo,
      estimated_minutes, lesson_type, status, sort_order
    ) values (
      v_category_id, book_row.id, v_slug,
      book_row.title || ': practical summary',
      book_row.title || ': ສະຫຼຸບນຳໃຊ້',
      coalesce(public.strip_html(book_row.description, 220), 'A practical summary is being prepared for this book.'),
      coalesce(public.strip_html(book_row.description, 220), 'ກໍາລັງກະກຽມສະຫຼຸບປຶ້ມນີ້.'),
      jsonb_build_array(jsonb_build_object(
        'heading', 'About this book',
        'body', coalesce(public.strip_html(book_row.description, 1200), 'Add a practical summary for ' || book_row.title || '.')
      )),
      jsonb_build_array(jsonb_build_object(
        'heading', 'ກ່ຽວກັບປຶ້ມນີ້',
        'body', coalesce(public.strip_html(book_row.description, 1200), 'ເພີ່ມສະຫຼຸບນຳໃຊ້ສຳລັບ ' || book_row.title || '.')
      )),
      '{}', '{}',
      8, 'READING_SUMMARY', 'DRAFT', 0
    );
  end loop;
end $$;
