-- Let a lapsed member's renewal reminder be closed out.
--
-- member_dismissed_expiry_at: the member pressed Close on the "Premium
-- expired" notice (they're fine on Free). admin_renewal_dismissed_at: an admin
-- removed them from the Renewals list after reminding them. Both are kept on
-- the expired paid membership they refer to, so a later expiry starts fresh.

alter table public.premium_subscriptions
  add column if not exists member_dismissed_expiry_at timestamptz,
  add column if not exists admin_renewal_dismissed_at timestamptz;

-- Members can't update their own ACTIVE/EXPIRED rows (see 040), so closing the
-- notice goes through this function, limited to their latest lapsed paid row.
create or replace function public.dismiss_premium_expiry_notice()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.premium_subscriptions s
  set member_dismissed_expiry_at = coalesce(s.member_dismissed_expiry_at, now())
  where s.id = (
    select lapsed.id
    from public.premium_subscriptions lapsed
    join public.premium_plans plan on plan.id = lapsed.plan_id
    where lapsed.user_id = (select auth.uid())
      and plan.price_lak > 0
      and lapsed.ends_at is not null
      and lapsed.ends_at <= now()
    order by lapsed.ends_at desc
    limit 1
  );
end;
$$;

revoke all on function public.dismiss_premium_expiry_notice() from public, anon;
grant execute on function public.dismiss_premium_expiry_notice() to authenticated;
