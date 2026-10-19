-- Let an admin dismiss a Premium request whose member was reminded to pay but
-- never uploaded a proof. The request is cancelled so it leaves "Requests to
-- review" for good.
--
-- Unlike rejecting (review_premium_subscription_request), this touches only the
-- pending request: it keeps premium_activity_members as is, so a current member
-- who asked to renew and never paid keeps the access they already have.

create or replace function public.dismiss_premium_subscription_request(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription public.premium_subscriptions;
  v_now timestamptz := now();
begin
  if coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    raise exception 'Only administrators can dismiss Premium requests';
  end if;

  select *
  into v_subscription
  from public.premium_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Premium subscription request not found';
  end if;

  if v_subscription.status <> 'PENDING_PAYMENT' then
    raise exception 'Only requests still waiting for payment can be dismissed';
  end if;

  update public.premium_subscriptions
  set
    status = 'CANCELLED',
    cancelled_at = v_now,
    auto_renew = false,
    reviewed_by_user_id = (select auth.uid()),
    reviewed_at = v_now,
    rejection_reason = 'Dismissed by admin: no payment after reminder.'
  where id = v_subscription.id;
end;
$$;

revoke all on function public.dismiss_premium_subscription_request(uuid) from public, anon;
grant execute on function public.dismiss_premium_subscription_request(uuid) to authenticated;
