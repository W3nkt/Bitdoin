-- A short-lived distributed lease prevents concurrent requests from paying
-- for duplicate Daily Mentor generations.
create table if not exists public.daily_mentor_generation_leases (
  user_id      uuid        not null references public.users(id) on delete cascade,
  publish_date date        not null,
  lease_token  uuid        not null default gen_random_uuid(),
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, publish_date)
);

create index if not exists daily_mentor_generation_leases_expiry_idx
  on public.daily_mentor_generation_leases (expires_at);

alter table public.daily_mentor_generation_leases enable row level security;
revoke all on table public.daily_mentor_generation_leases from anon, authenticated;
grant select, insert, update, delete on table public.daily_mentor_generation_leases to service_role;

create or replace function public.claim_daily_mentor_generation(
  p_user_id uuid,
  p_publish_date date,
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
  if p_user_id is null or p_publish_date is null
     or p_lease_seconds not between 10 and 300 then
    raise exception 'Invalid generation lease parameters';
  end if;

  insert into public.daily_mentor_generation_leases (
    user_id, publish_date, lease_token, expires_at
  )
  values (
    p_user_id,
    p_publish_date,
    v_token,
    clock_timestamp() + make_interval(secs => p_lease_seconds)
  )
  on conflict (user_id, publish_date)
  do update set
    lease_token = excluded.lease_token,
    expires_at = excluded.expires_at,
    created_at = clock_timestamp()
  where public.daily_mentor_generation_leases.expires_at <= clock_timestamp()
  returning lease_token into v_claimed;

  return v_claimed;
end;
$$;

create or replace function public.release_daily_mentor_generation(
  p_user_id uuid,
  p_publish_date date,
  p_lease_token uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  with deleted as (
    delete from public.daily_mentor_generation_leases
    where user_id = p_user_id
      and publish_date = p_publish_date
      and lease_token = p_lease_token
    returning 1
  )
  select exists(select 1 from deleted);
$$;

revoke all on function public.claim_daily_mentor_generation(uuid, date, integer)
  from public, anon, authenticated;
revoke all on function public.release_daily_mentor_generation(uuid, date, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_daily_mentor_generation(uuid, date, integer)
  to service_role;
grant execute on function public.release_daily_mentor_generation(uuid, date, uuid)
  to service_role;

