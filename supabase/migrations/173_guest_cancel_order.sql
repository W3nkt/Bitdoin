-- Let a buyer cancel their own order from the tracking page while it is still waiting for payment.
--
-- Proof of ownership is the same as for viewing the order: the order number plus the phone number it was
-- placed with (track_order). An order can be cancelled only while nothing has been paid or sent for review:
-- status PENDING_PAYMENT and its payment PENDING (or REJECTED, a receipt that was turned down). After that
-- money may have moved, so cancelling and refunding stays with staff.
--
-- It is the same change the admin makes (orders.status = 'CANCELLED') plus an audit entry. A BCEL One QR
-- that is still open for the order is marked EXPIRED. PhaJay cannot withdraw a QR, so if the buyer pays it
-- anyway, phajay_settle() sees a cancelled order, applies nothing and flags the payment for a refund.
--
-- Returns { ok: true } (also when it was already cancelled, so a second tap is harmless) or
-- { ok: false, reason: 'not_found' | 'not_cancellable' }.

create or replace function public.cancel_guest_order(p_order_number text, p_customer_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_payment_id uuid;
  v_order public.orders;
  v_payment public.payments;
begin
  if length(public.normalize_order_phone(p_customer_phone)) < 8 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select o.id, (select p.id from public.payments p where p.order_id = o.id order by p.created_at limit 1)
    into v_order_id, v_payment_id
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and public.normalize_order_phone(o.customer_phone) = public.normalize_order_phone(p_customer_phone)
  limit 1;
  if v_order_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Lock in the order phajay_settle() uses (QR, then payment, then order), so a payment arriving at the
  -- same moment either finishes first (the order is then too far along to cancel) or sees it cancelled.
  if v_payment_id is not null then
    perform 1 from public.phajay_transactions where kind = 'shop_order' and subject_id = v_payment_id for update;
    select * into v_payment from public.payments where id = v_payment_id for update;
  end if;
  select * into v_order from public.orders where id = v_order_id for update;

  if v_order.status = 'CANCELLED' then
    return jsonb_build_object('ok', true);
  end if;
  if v_order.status <> 'PENDING_PAYMENT'
     or coalesce(v_payment.verification_status::text, 'PENDING') not in ('PENDING', 'REJECTED') then
    return jsonb_build_object('ok', false, 'reason', 'not_cancellable');
  end if;

  update public.orders set status = 'CANCELLED' where id = v_order.id;

  if v_payment_id is not null then
    update public.phajay_transactions set status = 'EXPIRED'
    where kind = 'shop_order' and subject_id = v_payment_id and status = 'WAITING';
  end if;

  insert into public.audit_logs (entity, entity_id, action, old_value, new_value)
  values (
    'order', v_order.id, 'ORDER_CANCELLED_BY_CUSTOMER',
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', 'CANCELLED', 'order_number', v_order.order_number)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancel_guest_order(text, text) from public;
grant execute on function public.cancel_guest_order(text, text) to anon, authenticated;
