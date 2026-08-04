-- Fix duplicate Premium subscription rows: a user could end up with more
-- than one non-terminal (not CANCELLED/EXPIRED) subscription row at once
-- (e.g. an old Free ACTIVE row left behind after subscribing to Premium),
-- which made "current plan" resolution ambiguous on the client. This
-- migration (1) cleans up existing duplicates, (2) makes approval supersede
-- any other non-terminal subscription for that user so only one remains,
-- and (3) enables Realtime on premium_subscriptions/premium_payments so the
-- member's own page reflects admin approvals without a manual reload.

-- 1) One-time cleanup: for every user, keep only the most-recently-created
-- non-terminal subscription row; cancel the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at desc
    ) as rn
  from public.premium_subscriptions
  where status not in ('CANCELLED', 'EXPIRED')
)
update public.premium_subscriptions s
set status = 'CANCELLED',
    cancelled_at = coalesce(s.cancelled_at, now()),
    rejection_reason = coalesce(s.rejection_reason, 'Superseded by a newer subscription request.')
from ranked
where ranked.id = s.id
  and ranked.rn > 1;

-- 2) Approval now supersedes every other non-terminal subscription for the
-- same user, so activating a new plan can never leave a stale ACTIVE/PENDING
-- row behind.
create or replace function public.review_premium_subscription_request(
  p_subscription_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription public.premium_subscriptions;
  v_payment public.premium_payments;
  v_plan_price integer;
  v_reviewed_at timestamptz := now();
begin
  if coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    raise exception 'Only administrators can review Premium subscriptions';
  end if;

  select *
  into v_subscription
  from public.premium_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Premium subscription request not found';
  end if;

  if v_subscription.status not in ('PENDING_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_REVIEW') then
    raise exception 'This subscription is not awaiting review';
  end if;

  select price_lak
  into v_plan_price
  from public.premium_plans
  where id = v_subscription.plan_id;

  if not found then
    raise exception 'The subscription plan was not found';
  end if;

  if p_approve and v_plan_price > 0 then
    select *
    into v_payment
    from public.premium_payments
    where subscription_id = v_subscription.id
      and status = 'REQUIRES_REVIEW'
      and receipt_image_url is not null
    order by created_at desc
    limit 1
    for update;

    if not found then
      raise exception 'A paid subscription requires payment proof before approval';
    end if;

    update public.premium_payments
    set
      status = 'VERIFIED',
      reviewed_by_user_id = (select auth.uid()),
      reviewed_at = v_reviewed_at,
      rejection_reason = null
    where id = v_payment.id;
  elsif not p_approve and v_plan_price > 0 then
    select *
    into v_payment
    from public.premium_payments
    where subscription_id = v_subscription.id
    order by created_at desc
    limit 1
    for update;

    if found and v_payment.status = 'REQUIRES_REVIEW' then
      update public.premium_payments
      set
        status = 'REJECTED',
        reviewed_by_user_id = (select auth.uid()),
        reviewed_at = v_reviewed_at,
        rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Subscription request was not approved.')
      where id = v_payment.id;
    end if;
  end if;

  if p_approve then
    update public.premium_subscriptions
    set
      status = 'ACTIVE',
      starts_at = v_reviewed_at,
      ends_at = case when v_plan_price > 0 then v_reviewed_at + interval '30 days' else null end,
      cancelled_at = null,
      reviewed_by_user_id = (select auth.uid()),
      reviewed_at = v_reviewed_at,
      rejection_reason = null
    where id = v_subscription.id;

    -- Supersede any other non-terminal subscription this user still has
    -- (e.g. a leftover ACTIVE Free plan, or an abandoned pending request)
    -- so exactly one subscription remains current.
    update public.premium_subscriptions
    set
      status = 'CANCELLED',
      cancelled_at = v_reviewed_at,
      rejection_reason = 'Superseded by a newer subscription request.'
    where user_id = v_subscription.user_id
      and id <> v_subscription.id
      and status not in ('CANCELLED', 'EXPIRED');

    insert into public.premium_activity_members (
      user_id,
      subscription_id,
      approved_by_user_id,
      approved_at,
      is_active
    )
    values (
      v_subscription.user_id,
      v_subscription.id,
      (select auth.uid()),
      v_reviewed_at,
      true
    )
    on conflict (user_id) do update
    set
      subscription_id = excluded.subscription_id,
      approved_by_user_id = excluded.approved_by_user_id,
      approved_at = excluded.approved_at,
      is_active = true;
  else
    update public.premium_subscriptions
    set
      status = 'CANCELLED',
      cancelled_at = v_reviewed_at,
      reviewed_by_user_id = (select auth.uid()),
      reviewed_at = v_reviewed_at,
      rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Subscription request was not approved.')
    where id = v_subscription.id;

    update public.premium_activity_members
    set is_active = false
    where user_id = v_subscription.user_id;
  end if;
end;
$$;

revoke all on function public.review_premium_subscription_request(uuid, boolean, text) from public, anon;
grant execute on function public.review_premium_subscription_request(uuid, boolean, text) to authenticated;

-- 3) Realtime so the member's own Subscription page updates the moment an
-- admin approves/rejects, without requiring a manual page reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'premium_subscriptions'
  ) then
    alter publication supabase_realtime add table public.premium_subscriptions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'premium_payments'
  ) then
    alter publication supabase_realtime add table public.premium_payments;
  end if;
end $$;
