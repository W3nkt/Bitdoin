-- When an order is cancelled, its payment is no longer waiting for anything: mark it REJECTED (reason
-- "Order cancelled") so it leaves the admin's Needs Review queue and the pending-payment counts. This happens
-- by itself whoever cancels: the admin changing the status, or the buyer's Cancel button (migration 173).
-- Payments that are VERIFIED or REFUNDED are left alone: money moved, so staff decide what to do.
--
-- The orders.payment_status column that mirrors the payment follows it.

create or replace function public.mark_cancelled_order_payment_status()
returns trigger
language plpgsql
as $$
begin
  if new.payment_status in ('PENDING', 'REQUIRES_REVIEW') then
    new.payment_status := 'REJECTED';
  end if;
  return new;
end;
$$;

create or replace function public.reject_payments_of_cancelled_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.payments
  set verification_status = 'REJECTED', rejection_reason = 'Order cancelled', reviewed_at = now()
  where order_id = new.id and verification_status in ('PENDING', 'REQUIRES_REVIEW');
  return null;
end;
$$;

drop trigger if exists orders_cancelled_mirror_payment_status on public.orders;
create trigger orders_cancelled_mirror_payment_status
  before update of status on public.orders
  for each row
  when (new.status = 'CANCELLED' and old.status is distinct from new.status)
  execute function public.mark_cancelled_order_payment_status();

drop trigger if exists orders_cancelled_reject_payments on public.orders;
create trigger orders_cancelled_reject_payments
  after update of status on public.orders
  for each row
  when (new.status = 'CANCELLED' and old.status is distinct from new.status)
  execute function public.reject_payments_of_cancelled_order();

-- The guard from migration 043, unchanged except for one allowance at the top of the customer branch: a
-- customer's own payment may become REJECTED when its order is already CANCELLED and nothing else about it
-- changes but its status, reason and review time. Without this, a signed-in buyer cancelling their own order
-- would be refused by the trigger above. Only staff and the buyer's cancel function can cancel an order, and
-- anything else a customer tries on a payment is still refused.
create or replace function public.prevent_unsafe_payment_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'service_role' or coalesce(public.get_user_role()::text, '') in ('ADMIN', 'FINANCE') then
    return new;
  end if;

  if old.user_id = (select auth.uid()) then
    if new.verification_status = 'REJECTED'
      and old.verification_status in ('PENDING', 'REQUIRES_REVIEW')
      and exists (select 1 from public.orders o where o.id = old.order_id and o.status = 'CANCELLED')
      and (to_jsonb(new) - 'verification_status' - 'rejection_reason' - 'reviewed_at')
        = (to_jsonb(old) - 'verification_status' - 'rejection_reason' - 'reviewed_at') then
      return new;
    end if;

    if new.id is distinct from old.id
      or new.order_id is distinct from old.order_id
      or new.user_id is distinct from old.user_id
      or new.method is distinct from old.method
      or new.amount is distinct from old.amount
      or new.currency is distinct from old.currency
      or new.transaction_reference is distinct from old.transaction_reference
      or new.bank_name is distinct from old.bank_name
      or new.sender_name is distinct from old.sender_name
      or new.transferred_at is distinct from old.transferred_at
      or new.ai_confidence_score is distinct from old.ai_confidence_score
      or new.ai_extracted_data is distinct from old.ai_extracted_data
      or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason
      or new.created_at is distinct from old.created_at then
      raise exception 'Customers can only submit receipt proof for their own payment';
    end if;

    if new.verification_status not in ('PENDING', 'REQUIRES_REVIEW') then
      raise exception 'Customers cannot verify or reject payments';
    end if;
  end if;

  return new;
end;
$$;

-- Orders cancelled before this migration: bring their payments in line the same way.
update public.payments p
set verification_status = 'REJECTED', rejection_reason = 'Order cancelled', reviewed_at = coalesce(p.reviewed_at, now())
from public.orders o
where o.id = p.order_id and o.status = 'CANCELLED' and p.verification_status in ('PENDING', 'REQUIRES_REVIEW');

update public.orders
set payment_status = 'REJECTED'
where status = 'CANCELLED' and payment_status in ('PENDING', 'REQUIRES_REVIEW');
