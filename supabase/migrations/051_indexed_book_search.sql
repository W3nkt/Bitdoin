-- Indexed catalog search shared by the storefront and AI search.
create extension if not exists pg_trgm with schema extensions;

-- Replace the title-only index with one that supports the complete search
-- expression used by search_books. Trigrams work for Lao text and partial
-- matches without relying on language-specific tokenization.
drop index if exists public.books_title_trgm;

create index if not exists books_search_text_trgm_idx
  on public.books using gin (
    lower(
      coalesce(title, '') || ' ' ||
      coalesce(author, '') || ' ' ||
      coalesce(description, '')
    ) gin_trgm_ops
  )
  where is_active = true;

create index if not exists books_active_created_idx
  on public.books (created_at desc, id)
  where is_active = true;

create index if not exists books_active_title_idx
  on public.books (title, id)
  where is_active = true;

create index if not exists books_active_category_created_idx
  on public.books (category_id, created_at desc, id)
  where is_active = true;

create index if not exists books_active_language_created_idx
  on public.books (language, created_at desc, id)
  where is_active = true;

create or replace function public.search_books(
  p_query text default null,
  p_category_id uuid default null,
  p_language text default null,
  p_isbn text default null,
  p_sort text default 'newest',
  p_offset integer default 0,
  p_limit integer default 18
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_query text := nullif(trim(p_query), '');
  v_pattern text;
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 18), 1), 50);
  v_result jsonb;
begin
  if p_sort not in ('newest', 'title') then
    raise exception 'Invalid book sort';
  end if;

  if v_query is not null then
    -- Treat %, _ and \ as text rather than allowing callers to inject
    -- additional LIKE wildcards.
    v_pattern := '%' ||
      replace(
        replace(
          replace(lower(left(v_query, 120)), E'\\', E'\\\\'),
          '%', E'\\%'
        ),
        '_', E'\\_'
      ) ||
      '%';
  end if;

  with matched as materialized (
    select b.id, b.title, b.created_at
    from public.books b
    where b.is_active = true
      and (p_category_id is null or b.category_id = p_category_id)
      and (nullif(trim(p_language), '') is null or b.language = trim(p_language))
      and (nullif(trim(p_isbn), '') is null or b.isbn = trim(p_isbn))
      and (
        v_query is null
        or b.isbn = v_query
        or lower(
          coalesce(b.title, '') || ' ' ||
          coalesce(b.author, '') || ' ' ||
          coalesce(b.description, '')
        ) ilike v_pattern escape E'\\'
      )
  ),
  page as (
    select m.id
    from matched m
    order by
      case when p_sort = 'title' then m.title end asc,
      case when p_sort = 'newest' then m.created_at end desc,
      m.id
    offset v_offset
    limit v_limit
  ),
  books_json as (
    select coalesce(
      jsonb_agg(
        to_jsonb(b) ||
        jsonb_build_object(
          'category', case
            when c.id is null then null
            else to_jsonb(c)
          end,
          'prices', coalesce(prices.items, '[]'::jsonb)
        )
        order by
          case when p_sort = 'title' then b.title end asc,
          case when p_sort = 'newest' then b.created_at end desc,
          b.id
      ),
      '[]'::jsonb
    ) as items
    from page p
    join public.books b on b.id = p.id
    left join public.categories c on c.id = b.category_id
    left join lateral (
      select jsonb_agg(
        to_jsonb(bp) ||
        jsonb_build_object(
          'bookstore', jsonb_build_object('name', bs.name)
        )
        order by bp.final_price, bp.id
      ) as items
      from public.book_prices bp
      join public.bookstores bs on bs.id = bp.bookstore_id
      where bp.book_id = b.id
    ) prices on true
  )
  select jsonb_build_object(
    'books', books_json.items,
    'count', (select count(*) from matched)
  )
  into v_result
  from books_json;

  return coalesce(v_result, jsonb_build_object('books', '[]'::jsonb, 'count', 0));
end;
$$;

revoke all on function public.search_books(text, uuid, text, text, text, integer, integer) from public;
grant execute on function public.search_books(text, uuid, text, text, text, integer, integer)
  to anon, authenticated, service_role;
