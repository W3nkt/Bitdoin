-- Catalog quick links: Best Seller (ranked by completed sales) and
-- Editor Picks (admin-starred books only).

-- Order rows are protected by RLS, so storefront visitors cannot aggregate
-- them directly. Expose only per-book sold totals, using the same
-- "completed sale" rule as get_featured_book_ranking.
create or replace function public.book_sold_quantities()
returns table (
  book_id uuid,
  sold_quantity bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select oi.book_id, sum(oi.quantity)::bigint as sold_quantity
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status in ('DELIVERED', 'COMPLETED')
  group by oi.book_id;
$$;

revoke all on function public.book_sold_quantities() from public;
grant execute on function public.book_sold_quantities() to anon, authenticated, service_role;

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
  -- 'best'     : most sold first, then starred, then newest
  -- 'featured' : only admin-starred books (Editor Picks), newest first
  if p_sort not in ('newest', 'title', 'best', 'featured') then
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
    select b.id, b.title, b.created_at, b.is_featured
    from public.books b
    where b.is_active = true
      and (p_sort <> 'featured' or b.is_featured = true)
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
  ranked as (
    select
      m.id,
      row_number() over (
        order by
          case when p_sort = 'best' then coalesce(s.sold_quantity, 0) end desc,
          case when p_sort = 'best' then m.is_featured end desc,
          case when p_sort = 'title' then m.title end asc,
          m.created_at desc,
          m.id
      ) as position
    from matched m
    left join public.book_sold_quantities() s
      on p_sort = 'best' and s.book_id = m.id
  ),
  page as (
    select r.id, r.position
    from ranked r
    order by r.position
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
        order by p.position
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
