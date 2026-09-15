-- Make guest checkout idempotent so a slow network / refresh / repeated
-- "Confirm Order" tap cannot create multiple orders for the same attempt.
--
-- The client generates one UUID per checkout attempt (kept in localStorage
-- until the cart changes or the order succeeds) and passes it through as
-- p_idempotency_key. Retries with the same key return the original order
-- instead of inserting a new one.

alter table public.orders
  add column if not exists idempotency_key uuid;

create unique index if not exists orders_idempotency_key_idx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Adding a parameter changes the function's identity, so the old 7-arg
-- signature would otherwise stick around and create an ambiguous overload.
drop function if exists public.create_checkout_order(text, text, text, text, text, public.payment_method, jsonb);

-- Shared by the idempotent-retry paths below: rotates the guest access token
-- for an already-existing order and returns it in the same shape as a fresh
-- create_checkout_order call, without touching order_items/payments.
create or replace function public.reissue_guest_order_access(p_order public.orders)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_access_token text;
  v_payment_id uuid;
begin
  v_access_token := encode(extensions.gen_random_bytes(24), 'hex');

  update public.orders
  set guest_access_token_hash = public.hash_guest_token(v_access_token)
  where id = p_order.id;

  select id into v_payment_id
  from public.payments
  where order_id = p_order.id
  order by created_at
  limit 1;

  return jsonb_build_object(
    'order_id', p_order.id,
    'order_number', p_order.order_number,
    'customer_phone', p_order.customer_phone,
    'access_token', v_access_token,
    'payment_id', v_payment_id
  );
end;
$$;

revoke all on function public.reissue_guest_order_access(public.orders) from public;

create or replace function public.create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_notes text,
  p_currency text,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_idempotency_key uuid default null
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
  if p_idempotency_key is not null then
    select * into v_order from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return public.reissue_guest_order_access(v_order);
    end if;
  end if;

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
  v_access_token := encode(extensions.gen_random_bytes(24), 'hex');

  begin
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
      guest_access_token_hash,
      idempotency_key
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
      public.hash_guest_token(v_access_token),
      p_idempotency_key
    )
    returning * into v_order;
  exception when unique_violation then
    -- Two near-simultaneous retries of the same attempt raced past the lookup
    -- above; the other one won, so hand back its order instead of erroring.
    select * into v_order from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return public.reissue_guest_order_access(v_order);
    end if;
    raise;
  end;

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

revoke all on function public.create_checkout_order(text, text, text, text, text, public.payment_method, jsonb, uuid) from public;
grant execute on function public.create_checkout_order(text, text, text, text, text, public.payment_method, jsonb, uuid) to anon, authenticated;
