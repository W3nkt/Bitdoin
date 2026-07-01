-- Bookstore self-service price submission.
--
-- Flow: admin adds books with is_active = false (pending), generates a
-- reusable per-bookstore link, the bookstore opens it with no login and
-- submits a price for each pending book, then admin publishes (is_active =
-- true) any book that has at least one submitted price.
--
-- Public callers never receive direct table access — only through the two
-- SECURITY DEFINER functions below, gated by a hashed token on `bookstores`
-- (same pattern as guest checkout's `guest_access_token_hash`).

alter table public.bookstores
  add column if not exists price_submission_token_hash text unique;

create or replace function public.generate_bookstore_price_link(p_bookstore_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text;
begin
  if public.get_user_role() not in ('ADMIN', 'OPERATIONS') then
    raise exception 'Not authorized';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  update public.bookstores
  set price_submission_token_hash = public.hash_guest_token(v_token)
  where id = p_bookstore_id;

  if not found then
    raise exception 'Bookstore not found';
  end if;

  return v_token;
end;
$$;

create or replace function public.get_bookstore_pending_books(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bookstore public.bookstores;
begin
  select *
    into v_bookstore
  from public.bookstores
  where price_submission_token_hash = public.hash_guest_token(p_token)
    and is_active = true
  limit 1;

  if v_bookstore.id is null then
    raise exception 'This link is invalid or no longer active';
  end if;

  return jsonb_build_object(
    'bookstore', jsonb_build_object('id', v_bookstore.id, 'name', v_bookstore.name),
    'books', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'title', b.title,
        'author', b.author,
        'publisher', b.publisher,
        'cover_image_url', b.cover_image_url,
        'submitted_price', bp.bookstore_price
      ) order by b.created_at desc)
      from public.books b
      left join public.book_prices bp
        on bp.book_id = b.id and bp.bookstore_id = v_bookstore.id
      where b.is_active = false
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_bookstore_price(
  p_token text,
  p_book_id uuid,
  p_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bookstore_id uuid;
  v_category_id uuid;
  v_margin numeric(5,2);
  v_final numeric(12,2);
begin
  select id into v_bookstore_id
  from public.bookstores
  where price_submission_token_hash = public.hash_guest_token(p_token)
    and is_active = true
  limit 1;

  if v_bookstore_id is null then
    raise exception 'This link is invalid or no longer active';
  end if;

  if p_price is null or p_price <= 0 then
    raise exception 'Enter a valid price';
  end if;

  select category_id into v_category_id from public.books where id = p_book_id;
  if not found then
    raise exception 'Book not found';
  end if;

  select margin_percent into v_margin
  from public.margin_rules
  where is_active
    and (bookstore_id is null or bookstore_id = v_bookstore_id)
    and (category_id is null or category_id = v_category_id)
    and (min_price is null or p_price >= min_price)
    and (max_price is null or p_price <= max_price)
  order by priority asc
  limit 1;

  v_margin := coalesce(v_margin, 5.0);

  insert into public.book_prices (book_id, bookstore_id, bookstore_price, margin_percent, availability, last_checked_at)
  values (p_book_id, v_bookstore_id, p_price, v_margin, 'AVAILABLE', now())
  on conflict (book_id, bookstore_id) do update set
    bookstore_price = excluded.bookstore_price,
    margin_percent = excluded.margin_percent,
    availability = 'AVAILABLE',
    last_checked_at = now()
  returning final_price into v_final;

  return jsonb_build_object('final_price', v_final);
end;
$$;

revoke all on function public.generate_bookstore_price_link(uuid) from public;
revoke all on function public.get_bookstore_pending_books(text) from public;
revoke all on function public.submit_bookstore_price(text, uuid, numeric) from public;

grant execute on function public.generate_bookstore_price_link(uuid) to authenticated;
grant execute on function public.get_bookstore_pending_books(text) to anon, authenticated;
grant execute on function public.submit_bookstore_price(text, uuid, numeric) to anon, authenticated;
