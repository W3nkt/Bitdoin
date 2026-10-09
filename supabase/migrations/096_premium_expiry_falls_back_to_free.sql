-- Expired paid memberships fall back to the Free plan.
--
-- Paid rows used to stay ACTIVE after ends_at, and every access check is
-- "status = 'ACTIVE' and (ends_at is null or ends_at > now())", so a lapsed
-- member had no Academy access at all — not even what Free members get.
-- Now, once a paid membership ends, the row becomes EXPIRED and the member
-- gets an ACTIVE Free membership (no ends_at, no admin approval needed).
-- Every existing check then treats them exactly like a Free member.
--
-- downgraded_from_id marks those Free rows, so the app can still say
-- "Your Premium expired on <starts_at> — subscribe again".

alter table public.premium_subscriptions
  add column if not exists downgraded_from_id uuid
    references public.premium_subscriptions(id) on delete set null;

-- Called by the scheduler for everyone, or by a signed-in member for
-- themselves (the Academy pages call it the moment they notice an expiry,
-- so nobody waits for the next scheduled run). Returns rows moved to Free.
create or replace function public.downgrade_expired_premium()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_caller uuid := (select auth.uid());
  v_free_plan_id uuid;
  v_expired record;
  v_count integer := 0;
begin
  select p.id into v_free_plan_id
  from public.premium_plans p
  where p.price_lak = 0
  order by (p.slug = 'free') desc, p.sort_order
  limit 1;
  if v_free_plan_id is null then
    return 0;
  end if;

  for v_expired in
    select s.id, s.user_id, s.ends_at
    from public.premium_subscriptions s
    join public.premium_plans p on p.id = s.plan_id
    where s.status = 'ACTIVE'
      and s.ends_at is not null
      and s.ends_at <= now()
      and p.price_lak > 0
      -- Members may only trigger their own; the scheduler (no auth.uid()) does everyone.
      and (v_caller is null or s.user_id = v_caller)
    for update of s skip locked
  loop
    update public.premium_subscriptions s
    set status = 'EXPIRED', auto_renew = false
    where s.id = v_expired.id;

    -- Already has another live membership (e.g. a renewal was approved): no Free row needed.
    if not exists (
      select 1 from public.premium_subscriptions o
      where o.user_id = v_expired.user_id
        and o.status = 'ACTIVE'
        and (o.ends_at is null or o.ends_at > now())
    ) then
      insert into public.premium_subscriptions
        (user_id, plan_id, status, starts_at, ends_at, auto_renew, downgraded_from_id, created_at)
      values (
        v_expired.user_id,
        v_free_plan_id,
        'ACTIVE',
        v_expired.ends_at,
        null,
        false,
        v_expired.id,
        -- The app reads the newest row as "current". Sort the Free row before
        -- any renewal request already waiting, so that request stays visible.
        -- Approving the renewal later cancels this Free row (see 072).
        least(
          now(),
          coalesce((
            select min(o.created_at) - interval '1 second'
            from public.premium_subscriptions o
            where o.user_id = v_expired.user_id
              and o.status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL')
          ), now())
        )
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.downgrade_expired_premium() from public, anon;
grant execute on function public.downgrade_expired_premium() to authenticated;

-- Catch everyone who already lapsed.
select public.downgrade_expired_premium();

-- Then keep doing it every 5 minutes.
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academy-expired-to-free';
select cron.schedule(
  'academy-expired-to-free',
  '*/5 * * * *',
  $$select public.downgrade_expired_premium();$$
);
