-- AI-generated Play & Learn content pools (Daily Brain Sprint + Word Match).
-- One shared pool is generated per activity type per ISO week (Asia/Vientiane);
-- the premium-arcade-pool edge function assigns each user a unique, non-repeating
-- daily slice of that week's pool. Only the edge function's service-role client
-- touches these tables directly.

create table if not exists public.premium_arcade_content_pools (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('brain_sprint', 'word_match')),
  pool_week date not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  model text not null,
  generated_at timestamptz not null default now(),
  unique (activity_type, pool_week)
);

alter table public.premium_arcade_content_pools enable row level security;
revoke all on table public.premium_arcade_content_pools from anon, authenticated;
grant select, insert on table public.premium_arcade_content_pools to service_role;

-- Generation lease: a short-lived distributed lease prevents concurrent requests
-- (e.g. many users opening the arcade at once on a Monday) from paying for
-- duplicate AI generations of the same week's pool.
create table if not exists public.premium_arcade_pool_generation_leases (
  activity_type text        not null check (activity_type in ('brain_sprint', 'word_match')),
  pool_week      date        not null,
  lease_token    uuid        not null default gen_random_uuid(),
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  primary key (activity_type, pool_week)
);

create index if not exists premium_arcade_pool_generation_leases_expiry_idx
  on public.premium_arcade_pool_generation_leases (expires_at);

alter table public.premium_arcade_pool_generation_leases enable row level security;
revoke all on table public.premium_arcade_pool_generation_leases from anon, authenticated;
grant select, insert, update, delete on table public.premium_arcade_pool_generation_leases to service_role;

create or replace function public.claim_arcade_pool_generation(
  p_activity_type text,
  p_pool_week date,
  p_lease_seconds integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
begin
  if p_activity_type is null or p_pool_week is null
     or p_lease_seconds not between 10 and 300 then
    raise exception 'Invalid generation lease parameters';
  end if;

  insert into public.premium_arcade_pool_generation_leases (
    activity_type, pool_week, lease_token, expires_at
  )
  values (
    p_activity_type,
    p_pool_week,
    v_token,
    clock_timestamp() + make_interval(secs => p_lease_seconds)
  )
  on conflict (activity_type, pool_week)
  do update set
    lease_token = excluded.lease_token,
    expires_at = excluded.expires_at,
    created_at = clock_timestamp()
  where public.premium_arcade_pool_generation_leases.expires_at <= clock_timestamp()
  returning lease_token into v_claimed;

  return v_claimed;
end;
$$;

create or replace function public.release_arcade_pool_generation(
  p_activity_type text,
  p_pool_week date,
  p_lease_token uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.premium_arcade_pool_generation_leases
    where activity_type = p_activity_type
      and pool_week = p_pool_week
      and lease_token = p_lease_token
    returning 1
  )
  select exists(select 1 from deleted);
$$;

revoke all on function public.claim_arcade_pool_generation(text, date, integer)
  from public, anon, authenticated;
revoke all on function public.release_arcade_pool_generation(text, date, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_arcade_pool_generation(text, date, integer)
  to service_role;
grant execute on function public.release_arcade_pool_generation(text, date, uuid)
  to service_role;
