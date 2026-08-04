-- Learning Hub: a category's next lesson should only unlock on a day the
-- account was actually active, not simply because a calendar day passed
-- since the category was started. This table records the distinct local
-- days a user was seen using the Learning Hub.

create table if not exists public.premium_active_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  active_date date not null default timezone('Asia/Vientiane', now())::date,
  created_at timestamptz not null default now(),
  unique (user_id, active_date)
);

create index if not exists premium_active_days_user_idx
  on public.premium_active_days (user_id, active_date);

alter table public.premium_active_days enable row level security;

drop policy if exists "premium_active_days_own_all" on public.premium_active_days;
create policy "premium_active_days_own_all" on public.premium_active_days for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert on public.premium_active_days to authenticated;
