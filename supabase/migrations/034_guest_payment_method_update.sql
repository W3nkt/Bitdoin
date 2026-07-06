-- Let a guest change the payment method on their own order before they upload
-- proof of payment (e.g. they picked the wrong option and want to go back).

create or replace function public.update_guest_payment_method(
  p_order_number text,
  p_customer_phone text,
  p_access_token text,
  p_payment_method public.payment_method
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
  if p_payment_method = 'CASH_ON_DELIVERY' then
    raise exception 'This payment method is not available';
  end if;

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

  select id
    into v_payment_id
  from public.payments
  where order_id = v_order_id
  order by created_at
  limit 1;

  if v_payment_id is null then
    raise exception 'Payment record not found';
  end if;

  update public.payments
  set method = p_payment_method
  where id = v_payment_id
    and verification_status = 'PENDING';

  if not found then
    raise exception 'This payment can no longer be changed';
  end if;

  return true;
end;
$$;

revoke all on function public.update_guest_payment_method(text, text, text, public.payment_method) from public;
grant execute on function public.update_guest_payment_method(text, text, text, public.payment_method) to anon, authenticated;
