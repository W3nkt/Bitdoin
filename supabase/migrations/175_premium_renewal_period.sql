-- Premium renewals continue the running membership, and a paid membership can announce itself.
--
-- 1. The period a newly paid (or approved) Premium plan covers. If the member's current paid membership is still
--    running, the new period starts where it ends and lasts a month or a year from THAT date, so paying early
--    never costs the days that are left. Otherwise it starts now. A monthly plan is one calendar month, a yearly
--    plan one calendar year. (The admin's Approve button used to give 30 days from the day of approval, also for
--    yearly plans, and dropped the remaining days; it now uses the same rule.)
--
-- 2. After a PhaJay payment starts a membership, the member gets a receipt e-mail and a congratulation push.
--    phajay_claim_notification() hands out the details once per payment, however the payment was detected (the
--    open payment screen or PhaJay's webhook), and phajay_release_notification() puts it back if nothing could
--    be sent, so a later check tries again.

-- ─── 1. The period ───────────────────────────────────────────────────────────

create or replace function public.premium_paid_period(p_user_id uuid, p_subscription_id uuid, p_interval text, p_now timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.begins, b.begins + case when p_interval = 'year' then interval '1 year' else interval '1 month' end
  from (
    select coalesce((
      select max(s.ends_at)
      from public.premium_subscriptions s
      join public.premium_plans pl on pl.id = s.plan_id
      where s.user_id = p_user_id and s.id <> p_subscription_id
        and s.status = 'ACTIVE' and s.ends_at > p_now and pl.price_lak > 0
    ), p_now) as begins
  ) b
$$;
revoke all on function public.premium_paid_period(uuid, uuid, text, timestamptz) from public, anon, authenticated, service_role;

-- The admin's approval, as in migration 072, with the period from premium_paid_period().
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
  v_plan_interval text;
  v_reviewed_at timestamptz := now();
  v_start timestamptz;
  v_end timestamptz;
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

  select price_lak, "interval"
  into v_plan_price, v_plan_interval
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
    -- Before the running membership is superseded below: its end date is where this period starts.
    if v_plan_price > 0 then
      select pp.starts_at, pp.ends_at into v_start, v_end
      from public.premium_paid_period(v_subscription.user_id, v_subscription.id, v_plan_interval, v_reviewed_at) pp;
    else
      v_start := v_reviewed_at;
      v_end := null;
    end if;

    update public.premium_subscriptions
    set
      status = 'ACTIVE',
      starts_at = v_start,
      ends_at = v_end,
      cancelled_at = null,
      reviewed_by_user_id = (select auth.uid()),
      reviewed_at = v_reviewed_at,
      rejection_reason = null
    where id = v_subscription.id;

    -- Supersede any other non-terminal subscription this user still has
    -- (e.g. a leftover ACTIVE Free plan, the membership being renewed, or an abandoned
    -- pending request) so exactly one subscription remains current.
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

-- A PhaJay payment for a Premium plan, as in migration 172, with the period from premium_paid_period().
create or replace function public.phajay_apply_premium(p_tx public.phajay_transactions, p_paid_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.premium_payments;
  v_subscription public.premium_subscriptions;
  v_plan public.premium_plans;
  v_now timestamptz := now();
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_payment from public.premium_payments where id = p_tx.subject_id for update;
  if v_payment.id is null then
    return 'order_not_payable';
  end if;
  select * into v_subscription from public.premium_subscriptions where id = v_payment.subscription_id for update;
  select * into v_plan from public.premium_plans where id = v_subscription.plan_id;

  if v_payment.currency <> 'LAK' or p_tx.amount <> v_payment.amount_lak then
    return 'order_changed';
  end if;
  if v_subscription.status not in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')
     or v_payment.status in ('VERIFIED', 'REFUNDED') then
    return 'order_not_payable';
  end if;

  -- Before the running membership is superseded below: its end date is where this period starts.
  select pp.starts_at, pp.ends_at into v_start, v_end
  from public.premium_paid_period(v_subscription.user_id, v_subscription.id, v_plan."interval", v_now) pp;

  update public.premium_payments
  set status = 'VERIFIED',
      reviewed_at = v_now,
      reference = p_tx.transaction_id,
      notes = 'Paid by BCEL One QR through PhaJay',
      rejection_reason = null
  where id = v_payment.id;

  update public.premium_subscriptions
  set status = 'ACTIVE',
      starts_at = v_start,
      ends_at = v_end,
      cancelled_at = null,
      reviewed_at = v_now,
      rejection_reason = null
  where id = v_subscription.id;

  update public.premium_subscriptions
  set status = 'CANCELLED',
      cancelled_at = v_now,
      rejection_reason = 'Superseded by a newer subscription request.'
  where user_id = v_subscription.user_id
    and id <> v_subscription.id
    and status not in ('CANCELLED', 'EXPIRED');

  insert into public.premium_activity_members (user_id, subscription_id, approved_by_user_id, approved_at, is_active)
  values (v_subscription.user_id, v_subscription.id, null, v_now, true)
  on conflict (user_id) do update
  set subscription_id = excluded.subscription_id,
      approved_by_user_id = excluded.approved_by_user_id,
      approved_at = excluded.approved_at,
      is_active = true;

  insert into public.audit_logs (entity, entity_id, action, old_value, new_value)
  values (
    'premium_payment', v_payment.id, 'PAYMENT_VERIFIED',
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'VERIFIED', 'subscription_id', v_subscription.id, 'amount', p_tx.amount,
                       'provider', 'phajay', 'transaction_id', p_tx.transaction_id,
                       'starts_at', v_start, 'ends_at', v_end)
  );
  return null;
end;
$$;

-- ─── 2. Telling the member ───────────────────────────────────────────────────

alter table public.phajay_transactions add column if not exists notified_at timestamptz;

-- The details of a settled Premium payment, once: the first caller gets them and the payment is marked as
-- announced; everyone after gets null. Only Premium payments are announced.
create or replace function public.phajay_claim_notification(p_transaction_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.phajay_transactions;
  v_payment public.premium_payments;
  v_subscription public.premium_subscriptions;
  v_plan public.premium_plans;
  v_user public.users;
begin
  update public.phajay_transactions
  set notified_at = now()
  where transaction_id = p_transaction_id and kind = 'premium' and settled_at is not null and notified_at is null
  returning * into v_tx;
  if v_tx.transaction_id is null then
    return null;
  end if;

  select * into v_payment from public.premium_payments where id = v_tx.subject_id;
  select * into v_subscription from public.premium_subscriptions where id = v_payment.subscription_id;
  select * into v_plan from public.premium_plans where id = v_subscription.plan_id;
  select * into v_user from public.users where id = v_subscription.user_id;

  return jsonb_build_object(
    'transaction_id', v_tx.transaction_id,
    'user_id', v_subscription.user_id,
    'email', nullif(btrim(coalesce(v_user.email, '')), ''),
    'name', v_user.name,
    'language', coalesce(v_user.language, 'lo'),
    'plan_name', v_plan.name,
    'plan_interval', v_plan."interval",
    'amount', v_tx.amount,
    'paid_at', v_tx.paid_at,
    'starts_at', v_subscription.starts_at,
    'ends_at', v_subscription.ends_at,
    -- The new period begins when the running one ends, not today.
    'extends_previous', v_subscription.starts_at > v_tx.paid_at + interval '1 minute',
    'receipt_no', 'PRM-' || upper(left(v_payment.id::text, 8))
  );
end;
$$;

-- Nothing could be sent: let the next check try again.
create or replace function public.phajay_release_notification(p_transaction_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.phajay_transactions set notified_at = null where transaction_id = p_transaction_id and kind = 'premium'
$$;

revoke all on function public.phajay_claim_notification(text) from public, anon, authenticated;
revoke all on function public.phajay_release_notification(text) from public, anon, authenticated;
grant execute on function public.phajay_claim_notification(text) to service_role;
grant execute on function public.phajay_release_notification(text) to service_role;
