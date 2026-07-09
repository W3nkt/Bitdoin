-- Rank bookstore Featured Books by completed sales, admin star, then recency.

alter table public.books
  add column if not exists is_featured boolean not null default false;

create index if not exists books_featured_created_idx
  on public.books (is_featured desc, created_at desc)
  where is_active = true;

create or replace function public.get_featured_book_ranking(p_limit integer default 12)
returns table (
  book_id uuid,
  sold_quantity bigint,
  is_featured boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    b.id as book_id,
    coalesce(
      sum(oi.quantity) filter (
        where o.status in ('DELIVERED', 'COMPLETED')
      ),
      0
    )::bigint as sold_quantity,
    b.is_featured
  from public.books b
  left join public.order_items oi on oi.book_id = b.id
  left join public.orders o on o.id = oi.order_id
  where b.is_active = true
  group by b.id, b.is_featured, b.created_at
  order by
    sold_quantity desc,
    b.is_featured desc,
    b.created_at desc,
    b.id
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_featured_book_ranking(integer) from public;
grant execute on function public.get_featured_book_ranking(integer) to anon, authenticated;
