-- Read-only. Finds pre-existing orders that are likely repeat "resubmit
-- checkout because it looked like it failed" attempts from before the
-- idempotency-key fix in migration 089_checkout_idempotency_key.sql.
--
-- A group is flagged when the same phone + delivery address + total placed
-- more than one order within a short window, and every order in the group
-- is still stuck at PENDING_PAYMENT with no verified/reviewed payment —
-- i.e. nobody ever actually paid any of them, which is the signature of a
-- duplicate click rather than two genuine separate purchases.
--
-- This script only SELECTs. Review each group yourself before cancelling
-- anything — a legitimate customer can place two identical orders on
-- purpose (e.g. gifting two copies to different context on the same day).
-- The commented UPDATE at the bottom is a starting point, not a default
-- action: run it manually, order group by group, after you've checked it.

with candidate as (
  select
    o.id,
    o.order_number,
    o.created_at,
    o.status,
    o.payment_status,
    o.total_amount,
    o.currency,
    public.normalize_order_phone(o.customer_phone) as phone_key,
    o.delivery_address,
    lag(o.created_at) over w as prev_created_at,
    lead(o.created_at) over w as next_created_at
  from public.orders o
  where o.status = 'PENDING_PAYMENT'
    and o.payment_status = 'PENDING'
  window w as (
    partition by public.normalize_order_phone(o.customer_phone), o.delivery_address, o.total_amount
    order by o.created_at
  )
),
grouped as (
  select
    *,
    count(*) over (partition by phone_key, delivery_address, total_amount) as group_size
  from candidate
)
select
  phone_key,
  delivery_address,
  total_amount,
  currency,
  group_size,
  order_number,
  status,
  payment_status,
  created_at,
  case
    when prev_created_at is not null and created_at - prev_created_at < interval '2 hours' then true
    when next_created_at is not null and next_created_at - created_at < interval '2 hours' then true
    else false
  end as within_resubmit_window
from grouped
where group_size > 1
order by phone_key, delivery_address, total_amount, created_at;

-- After reviewing a group above and confirming only the earliest order in it
-- was ever meant to be real, cancel the rest one order_number at a time:
--
-- update public.orders
-- set status = 'CANCELLED'
-- where order_number = '<duplicate order_number here>'
--   and status = 'PENDING_PAYMENT';
