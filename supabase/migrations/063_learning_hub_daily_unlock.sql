-- Premium Learning Hub: pace lessons to one new unlock per day per category,
-- in a per-user shuffled order (tracked via the client-side shuffle seed = user_id + category_id).

create table if not exists public.premium_category_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category_id uuid not null references public.premium_learning_categories(id) on delete cascade,
  start_date date not null default timezone('Asia/Vientiane', now())::date,
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists premium_category_unlocks_user_idx
  on public.premium_category_unlocks (user_id);

alter table public.premium_category_unlocks enable row level security;

drop policy if exists "premium_category_unlocks_own_all" on public.premium_category_unlocks;
create policy "premium_category_unlocks_own_all" on public.premium_category_unlocks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());

grant select, insert, update, delete on public.premium_category_unlocks to authenticated;
