-- Shorten guest order codes from PB-XXXXXXXXXXXX (12 chars) to BD-XXXX (4
-- chars) so customers can type them by hand when tracking an order or
-- uploading payment proof, instead of copy/pasting a long code.
--
-- The 4-char body is drawn from a 31-symbol alphabet that drops visually
-- ambiguous characters (0/O, 1/I, L) to cut typos. That leaves 31^4 =
-- 923,521 possible codes, so generation loops until it finds one that isn't
-- already in use rather than assuming a single random draw is unique.

create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_charset text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
begin
  loop
    select 'BD-' || string_agg(substr(v_charset, (floor(random() * length(v_charset)) + 1)::int, 1), '')
      into v_code
    from generate_series(1, 4);

    exit when not exists (select 1 from public.orders where order_number = v_code);
  end loop;

  return v_code;
end;
$$;

revoke all on function public.generate_order_number() from public;

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
  v_attempt int;
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

  v_access_token := encode(extensions.gen_random_bytes(24), 'hex');

  -- generate_order_number() already checks for an existing row before
  -- returning, but a second checkout could still win the race between that
  -- check and this insert. Retry with a fresh code a few times before
  -- giving up, rather than surfacing the race to the customer.
  for v_attempt in 1..5 loop
    v_order_number := public.generate_order_number();

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

      exit;
    exception when unique_violation then
      if p_idempotency_key is not null then
        select * into v_order from public.orders where idempotency_key = p_idempotency_key;
        if found then
          return public.reissue_guest_order_access(v_order);
        end if;
      end if;
      if v_attempt = 5 then
        raise;
      end if;
    end;
  end loop;

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
