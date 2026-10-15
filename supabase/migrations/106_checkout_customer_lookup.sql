-- Normalize only supported Lao mobile formats. Invalid/foreign numbers must
-- never match a customer merely because their last eight digits are the same.
create or replace function public.checkout_phone_key(value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case when digits ~ '^(020|20|85620|0085620)?[1-9][0-9]{7}$'
    then right(digits, 8) else null end
  from (select public.normalize_order_phone(value) as digits) normalized;
$$;

create index if not exists orders_checkout_phone_idx
  on public.orders (public.checkout_phone_key(customer_phone), created_at desc, id desc);

-- The rate-limited Edge Function is the only public entry point. Return just
-- checkout contact/delivery fields; never order IDs, tokens or payment data.
create or replace function public.lookup_checkout_customer(p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'customer_name', customer_name,
    'delivery_address', delivery_address
  )
  from public.orders
  where public.checkout_phone_key(customer_phone) = public.checkout_phone_key(p_phone)
    and status <> 'CANCELLED'
  order by created_at desc, id desc
  limit 1;
$$;

revoke all on function public.lookup_checkout_customer(text) from public, anon, authenticated;
grant execute on function public.lookup_checkout_customer(text) to service_role;
