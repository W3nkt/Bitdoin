-- Require admin approval for every Premium plan, including Free, and enroll
-- approved users for Premium events and activities.

alter table public.premium_subscriptions
  drop constraint if exists premium_subscriptions_status_check;

alter table public.premium_subscriptions
  add constraint premium_subscriptions_status_check
  check (status in (
    'FREE',
    'PENDING_APPROVAL',
    'PENDING_PAYMENT',
    'PAYMENT_REVIEW',
    'ACTIVE',
    'CANCELLED',
    'EXPIRED'
  ));

alter table public.premium_subscriptions
  add column if not exists reviewed_by_user_id uuid references public.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

update public.premium_subscriptions
set status = 'PENDING_APPROVAL'
where status = 'FREE';

drop policy if exists "premium_subscriptions_own_insert" on public.premium_subscriptions;
create policy "premium_subscriptions_own_insert"
  on public.premium_subscriptions for insert
  with check (
    user_id = (select auth.uid())
    and status in ('PENDING_APPROVAL', 'PENDING_PAYMENT')
  );

create table if not exists public.premium_activity_members (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users(id) on delete cascade unique,
  subscription_id     uuid references public.premium_subscriptions(id) on delete set null,
  approved_by_user_id uuid references public.users(id) on delete set null,
  approved_at         timestamptz not null default now(),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists premium_activity_members_active_idx
  on public.premium_activity_members (approved_at desc)
  where is_active = true;

drop trigger if exists premium_activity_members_updated_at on public.premium_activity_members;
create trigger premium_activity_members_updated_at
  before update on public.premium_activity_members
  for each row execute function set_updated_at();

alter table public.premium_activity_members enable row level security;

drop policy if exists "premium_activity_members_own_read" on public.premium_activity_members;
create policy "premium_activity_members_own_read"
  on public.premium_activity_members for select
  using (
    user_id = (select auth.uid())
    or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
  );

drop policy if exists "premium_activity_members_admin_all" on public.premium_activity_members;
create policy "premium_activity_members_admin_all"
  on public.premium_activity_members for all
  using (get_user_role() = 'ADMIN')
  with check (get_user_role() = 'ADMIN');

drop index if exists premium_subscriptions_review_queue_idx;
create index premium_subscriptions_review_queue_idx
  on public.premium_subscriptions (created_at desc)
  where status in ('PENDING_APPROVAL', 'PENDING_PAYMENT', 'PAYMENT_REVIEW');

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

drop function if exists public.approve_premium_subscription_request(uuid);
drop function if exists public.reject_premium_subscription_request(uuid, text);
