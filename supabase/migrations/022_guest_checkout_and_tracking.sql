-- Guest checkout and order tracking.
--
-- Public callers never receive direct table access. They can only:
--   1. create an order through create_checkout_order()
--   2. retrieve one order when order code + phone match
--   3. rotate a scoped receipt-upload token
--   4. attach a receipt URL that belongs to that scoped token

create extension if not exists "pgcrypto";

alter table public.orders
  alter column customer_id drop not null,
  add column if not exists guest_access_token_hash text;

alter table public.payments
  alter column user_id drop not null;

create index if not exists orders_guest_lookup_idx
  on public.orders (upper(order_number), customer_phone);

create or replace function public.normalize_order_phone(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g');
$$;

create or replace function public.hash_guest_token(value text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(value, ''), 'sha256'), 'hex');
$$;

create or replace function public.guest_receipt_path_allowed(
  p_order_id text,
  p_access_token text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.orders
    where id::text = p_order_id
      and guest_access_token_hash = public.hash_guest_token(p_access_token)
  );
$$;

create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_notes text,
  p_currency text,
  p_payment_method public.payment_method,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_payment public.payments;
  v_order_number text;
  v_access_token text;
  v_total numeric(12,2);
  v_requested_count int;
  v_priced_count int;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'A valid customer name is required';
  end if;
  if length(public.normalize_order_phone(p_customer_phone)) < 8 then
    raise exception 'A valid phone number is required';
  end if;
  if length(trim(coalesce(p_delivery_address, ''))) < 10 then
    raise exception 'A valid delivery address is required';
  end if;
  if p_currency not in ('LAK', 'USD') then
    raise exception 'Unsupported currency';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart is empty';
  end if;

  v_requested_count := jsonb_array_length(p_items);

  select count(*), sum(bp.final_price * requested.quantity)
    into v_priced_count, v_total
  from jsonb_to_recordset(p_items) as requested(
    book_id uuid,
    bookstore_id uuid,
    quantity int
  )
  join public.book_prices bp
    on bp.book_id = requested.book_id
   and bp.bookstore_id = requested.bookstore_id
  join public.books b on b.id = bp.book_id and b.is_active
  join public.bookstores bs on bs.id = bp.bookstore_id and bs.is_active
  where requested.quantity between 1 and 99
    and bp.availability <> 'OUT_OF_STOCK';

  if v_priced_count <> v_requested_count or v_total is null or v_total <= 0 then
    raise exception 'One or more cart items are unavailable';
  end if;

  v_order_number := 'PB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  v_access_token := encode(gen_random_bytes(24), 'hex');

  insert into public.orders (
    order_number,
    customer_id,
    status,
    payment_status,
    subtotal_amount,
    total_amount,
    currency,
    customer_name,
    customer_phone,
    delivery_address,
    notes,
    guest_access_token_hash
  )
  values (
    v_order_number,
    auth.uid(),
    case when p_payment_method = 'CASH_ON_DELIVERY' then 'PROCESSING'::public.order_status else 'PENDING_PAYMENT'::public.order_status end,
    'PENDING',
    v_total,
    v_total,
    p_currency,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_delivery_address),
    nullif(trim(coalesce(p_notes, '')), ''),
    public.hash_guest_token(v_access_token)
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    book_id,
    bookstore_id,
    quantity,
    bookstore_price,
    margin_percent,
    final_price,
    fulfillment_status
  )
  select
    v_order.id,
    requested.book_id,
    requested.bookstore_id,
    requested.quantity,
    bp.bookstore_price,
    bp.margin_percent,
    bp.final_price,
    'PROCESSING'
  from jsonb_to_recordset(p_items) as requested(
    book_id uuid,
    bookstore_id uuid,
    quantity int
  )
  join public.book_prices bp
    on bp.book_id = requested.book_id
   and bp.bookstore_id = requested.bookstore_id;

  insert into public.payments (
    order_id,
    user_id,
    method,
    amount,
    currency,
    verification_status
  )
  values (
    v_order.id,
    auth.uid(),
    p_payment_method,
    v_total,
    p_currency,
    'PENDING'
  )
  returning * into v_payment;

  return jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'customer_phone', v_order.customer_phone,
    'access_token', v_access_token,
    'payment_id', v_payment.id
  );
end;
$$;

create or replace function public.track_order(
  p_order_number text,
  p_customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
begin
  select *
    into v_order
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(customer_phone) = public.normalize_order_phone(p_customer_phone)
  limit 1;

  if v_order.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'customer_id', v_order.customer_id,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'subtotal_amount', v_order.subtotal_amount,
    'total_amount', v_order.total_amount,
    'currency', v_order.currency,
    'delivery_fee_note', v_order.delivery_fee_note,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'delivery_address', v_order.delivery_address,
    'notes', v_order.notes,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'book_id', oi.book_id,
        'bookstore_id', oi.bookstore_id,
        'quantity', oi.quantity,
        'final_price', oi.final_price,
        'fulfillment_status', oi.fulfillment_status,
        'created_at', oi.created_at,
        'book', jsonb_build_object(
          'id', b.id,
          'title', b.title,
          'cover_image_url', b.cover_image_url
        ),
        'bookstore', jsonb_build_object(
          'id', bs.id,
          'name', bs.name
        )
      ) order by oi.created_at)
      from public.order_items oi
      join public.books b on b.id = oi.book_id
      join public.bookstores bs on bs.id = oi.bookstore_id
      where oi.order_id = v_order.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'order_id', p.order_id,
        'method', p.method,
        'amount', p.amount,
        'currency', p.currency,
        'receipt_image_url', p.receipt_image_url,
        'verification_status', p.verification_status,
        'transaction_reference', p.transaction_reference,
        'bank_name', p.bank_name,
        'sender_name', p.sender_name,
        'transferred_at', p.transferred_at,
        'reviewed_at', p.reviewed_at,
        'rejection_reason', p.rejection_reason,
        'created_at', p.created_at
      ) order by p.created_at)
      from public.payments p
      where p.order_id = v_order.id
    ), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'order_id', d.order_id,
        'courier', d.courier,
        'tracking_number', d.tracking_number,
        'status', d.status,
        'shipped_at', d.shipped_at,
        'delivered_at', d.delivered_at,
        'estimated_delivery_at', d.estimated_delivery_at,
        'notes', d.notes,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      ) order by d.created_at desc)
      from public.deliveries d
      where d.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.issue_guest_receipt_token(
  p_order_number text,
  p_customer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_access_token text;
begin
  select id
    into v_order_id
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(customer_phone) = public.normalize_order_phone(p_customer_phone)
  limit 1;

  if v_order_id is null then
    raise exception 'Order not found';
  end if;

  v_access_token := encode(gen_random_bytes(24), 'hex');

  update public.orders
  set guest_access_token_hash = public.hash_guest_token(v_access_token)
  where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'access_token', v_access_token
  );
end;
$$;

create or replace function public.submit_guest_receipt(
  p_order_number text,
  p_customer_phone text,
  p_access_token text,
  p_receipt_path text,
  p_receipt_url text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
begin
  select id
    into v_order_id
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(customer_phone) = public.normalize_order_phone(p_customer_phone)
    and guest_access_token_hash = public.hash_guest_token(p_access_token)
  limit 1;

  if v_order_id is null then
    raise exception 'Order not found or access token expired';
  end if;

  if p_receipt_path <> ('guest/' || v_order_id::text || '/' || p_access_token || '/' || split_part(p_receipt_path, '/', 4)) then
    raise exception 'Invalid receipt path';
  end if;

  if p_receipt_url not like ('%/storage/v1/object/public/receipts/' || p_receipt_path) then
    raise exception 'Invalid receipt URL';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'receipts'
      and name = p_receipt_path
  ) then
    raise exception 'Receipt upload was not found';
  end if;

  select id into v_payment_id
  from public.payments
  where order_id = v_order_id
    and method <> 'CASH_ON_DELIVERY'
  order by created_at
  limit 1;

  if v_payment_id is null then
    raise exception 'This order does not require a payment receipt';
  end if;

  update public.payments
  set receipt_image_url = p_receipt_url,
      verification_status = 'REQUIRES_REVIEW'
  where id = v_payment_id;

  update public.orders
  set payment_status = 'REQUIRES_REVIEW',
      status = 'PAYMENT_REVIEW'
  where id = v_order_id;

  return true;
end;
$$;

revoke all on function public.create_checkout_order(text, text, text, text, text, public.payment_method, jsonb) from public;
revoke all on function public.track_order(text, text) from public;
revoke all on function public.issue_guest_receipt_token(text, text) from public;
revoke all on function public.submit_guest_receipt(text, text, text, text, text) from public;
revoke all on function public.guest_receipt_path_allowed(text, text) from public;

grant execute on function public.create_checkout_order(text, text, text, text, text, public.payment_method, jsonb) to anon, authenticated;
grant execute on function public.track_order(text, text) to anon, authenticated;
grant execute on function public.issue_guest_receipt_token(text, text) to anon, authenticated;
grant execute on function public.submit_guest_receipt(text, text, text, text, text) to anon, authenticated;
grant execute on function public.guest_receipt_path_allowed(text, text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts_guest_insert" on storage.objects;
create policy "receipts_guest_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'guest'
    and public.guest_receipt_path_allowed(
      (storage.foldername(name))[2],
      (storage.foldername(name))[3]
    )
  );

drop policy if exists "receipts_customer_insert" on storage.objects;
create policy "receipts_customer_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and exists (
      select 1
      from public.orders o
      where o.id::text = (storage.foldername(name))[2]
        and o.customer_id = auth.uid()
    )
  );

drop policy if exists "receipts_guest_read" on storage.objects;
create policy "receipts_guest_read"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'guest'
    and public.guest_receipt_path_allowed(
      (storage.foldername(name))[2],
      (storage.foldername(name))[3]
    )
  );

drop policy if exists "receipts_customer_read" on storage.objects;
create policy "receipts_customer_read"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and exists (
      select 1
      from public.orders o
      where o.id::text = (storage.foldername(name))[2]
        and o.customer_id = auth.uid()
    )
  );

drop policy if exists "receipts_staff_read" on storage.objects;
create policy "receipts_staff_read"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );
