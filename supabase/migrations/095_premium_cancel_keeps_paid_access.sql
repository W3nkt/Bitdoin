-- Cancelling a paid Academy membership keeps access until the paid period ends.
--
-- Before, the member page set status = 'CANCELLED' straight away, and every
-- access check requires status = 'ACTIVE' and ends_at > now(), so members
-- lost what they had paid for the moment they cancelled. Now a paid, still
-- running membership stays ACTIVE with cancelled_at set (it just won't be
-- renewed); access then stops at ends_at like any other expiry. Free plans
-- (no ends_at) and unpaid/unapproved requests are still cancelled at once.

create or replace function public.cancel_premium_subscription(p_subscription_id uuid)
returns table (status text, ends_at timestamptz, cancelled_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_subscription public.premium_subscriptions;
  v_now timestamptz := now();
begin
  select *
  into v_subscription
  from public.premium_subscriptions s
  where s.id = p_subscription_id
  for update;

  if not found or v_subscription.user_id <> (select auth.uid()) then
    raise exception 'Subscription not found';
  end if;

  if v_subscription.status in ('CANCELLED', 'EXPIRED') then
    raise exception 'This subscription has already ended';
  end if;

  if v_subscription.status = 'ACTIVE'
     and v_subscription.ends_at is not null
     and v_subscription.ends_at > v_now then
    -- Paid time left: keep access until ends_at, just stop renewal.
    update public.premium_subscriptions s
    set cancelled_at = coalesce(s.cancelled_at, v_now),
        auto_renew = false
    where s.id = p_subscription_id;
  else
    update public.premium_subscriptions s
    set status = 'CANCELLED',
        cancelled_at = coalesce(s.cancelled_at, v_now),
        auto_renew = false
    where s.id = p_subscription_id;
  end if;

  return query
  select s.status, s.ends_at, s.cancelled_at
  from public.premium_subscriptions s
  where s.id = p_subscription_id;
end;
$$;

revoke all on function public.cancel_premium_subscription(uuid) from public, anon;
grant execute on function public.cancel_premium_subscription(uuid) to authenticated;
