-- Atomic admin review actions for Premium subscription payment requests.

create index if not exists premium_subscriptions_review_queue_idx
  on public.premium_subscriptions (created_at desc)
  where status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW');

drop policy if exists "premium_subscriptions_own_update" on public.premium_subscriptions;
create policy "premium_subscriptions_own_update"
  on public.premium_subscriptions for update
  using (user_id = (select auth.uid()) or get_user_role() = 'ADMIN')
  with check (
    get_user_role() = 'ADMIN'
    or (
      user_id = (select auth.uid())
      and status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CANCELLED')
    )
  );

drop policy if exists "premium_payments_own_update" on public.premium_payments;
create policy "premium_payments_own_update"
  on public.premium_payments for update
  using (user_id = (select auth.uid()) or get_user_role() = 'ADMIN')
  with check (
    get_user_role() = 'ADMIN'
    or (
      user_id = (select auth.uid())
      and status in ('PENDING', 'REQUIRES_REVIEW')
    )
  );

create or replace function public.approve_premium_subscription_request(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.premium_payments;
  v_starts_at timestamptz := now();
begin
  if coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    raise exception 'Only administrators can approve Premium subscriptions';
  end if;

  select *
  into v_payment
  from public.premium_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Premium payment request not found';
  end if;

  if v_payment.status <> 'REQUIRES_REVIEW' or v_payment.receipt_image_url is null then
    raise exception 'This payment is not ready for approval';
  end if;

  perform 1
  from public.premium_subscriptions
  where id = v_payment.subscription_id
    and user_id = v_payment.user_id
    and status = 'PAYMENT_REVIEW'
  for update;

  if not found then
    raise exception 'The linked subscription is not awaiting review';
  end if;

  update public.premium_payments
  set
    status = 'VERIFIED',
    reviewed_by_user_id = (select auth.uid()),
    reviewed_at = v_starts_at,
    rejection_reason = null
  where id = v_payment.id;

  update public.premium_subscriptions
  set
    status = 'ACTIVE',
    starts_at = v_starts_at,
    ends_at = v_starts_at + interval '30 days',
    cancelled_at = null
  where id = v_payment.subscription_id;
end;
$$;

create or replace function public.reject_premium_subscription_request(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.premium_payments;
begin
  if coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    raise exception 'Only administrators can reject Premium subscriptions';
  end if;

  select *
  into v_payment
  from public.premium_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Premium payment request not found';
  end if;

  if v_payment.status <> 'REQUIRES_REVIEW' then
    raise exception 'This payment is not awaiting review';
  end if;

  perform 1
  from public.premium_subscriptions
  where id = v_payment.subscription_id
    and user_id = v_payment.user_id
  for update;

  if not found then
    raise exception 'The linked subscription was not found';
  end if;

  update public.premium_payments
  set
    status = 'REJECTED',
    reviewed_by_user_id = (select auth.uid()),
    reviewed_at = now(),
    rejection_reason = coalesce(nullif(trim(p_reason), ''), 'Payment proof could not be verified.')
  where id = v_payment.id;

  update public.premium_subscriptions
  set status = 'PENDING_PAYMENT'
  where id = v_payment.subscription_id;
end;
$$;

revoke all on function public.approve_premium_subscription_request(uuid) from public, anon;
revoke all on function public.reject_premium_subscription_request(uuid, text) from public, anon;
grant execute on function public.approve_premium_subscription_request(uuid) to authenticated;
grant execute on function public.reject_premium_subscription_request(uuid, text) to authenticated;
