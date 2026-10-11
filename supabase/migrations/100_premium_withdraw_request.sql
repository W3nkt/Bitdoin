-- Let a member withdraw a Premium request they haven't paid for yet.
--
-- The member page treats the newest premium_subscriptions row as the
-- member's current one, so marking the request CANCELLED would hide the
-- membership they had before it (e.g. an ACTIVE Free plan). Instead the
-- unpaid request is deleted outright (its PENDING payment goes with it via
-- on delete cascade), which also drops it from the admin's "Requests to
-- review". Only requests still waiting for a transfer qualify: once a proof
-- is uploaded the admin has to review it, so those can't be withdrawn here.

create or replace function public.withdraw_premium_request(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.premium_subscriptions;
begin
  select *
  into v_subscription
  from public.premium_subscriptions s
  where s.id = p_subscription_id
  for update;

  if not found or v_subscription.user_id <> (select auth.uid()) then
    raise exception 'Subscription not found';
  end if;

  if v_subscription.status <> 'PENDING_PAYMENT' then
    raise exception 'Only a request that is still waiting for payment can be cancelled';
  end if;

  if exists (
    select 1
    from public.premium_payments p
    where p.subscription_id = p_subscription_id
      and (p.receipt_image_url is not null or p.status <> 'PENDING')
  ) then
    raise exception 'A payment proof was already submitted for this request';
  end if;

  delete from public.premium_subscriptions s
  where s.id = p_subscription_id;
end;
$$;

revoke all on function public.withdraw_premium_request(uuid) from public, anon;
grant execute on function public.withdraw_premium_request(uuid) to authenticated;
