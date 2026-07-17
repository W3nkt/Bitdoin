-- One cached AI-generated daily mentor set per Premium member and local day.
create table if not exists public.premium_personalized_daily_guidance (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  publish_date  date not null,
  quote         text not null check (char_length(quote) between 1 and 500),
  reflection    text not null check (char_length(reflection) between 1 and 1000),
  challenge     text not null check (char_length(challenge) between 1 and 1000),
  mission       text not null check (char_length(mission) between 1 and 1000),
  model         text not null default 'deepseek-v4-flash',
  created_at    timestamptz not null default now(),
  unique (user_id, publish_date)
);

create index if not exists premium_personalized_daily_guidance_user_idx
  on public.premium_personalized_daily_guidance (user_id, publish_date desc);

alter table public.premium_personalized_daily_guidance enable row level security;

drop policy if exists "premium_personalized_guidance_own_read" on public.premium_personalized_daily_guidance;
create policy "premium_personalized_guidance_own_read"
  on public.premium_personalized_daily_guidance for select
  using (user_id = (select auth.uid()) or get_user_role() in ('ADMIN', 'OPERATIONS'));

-- Generation and writes happen only inside the authenticated Edge Function.
revoke insert, update, delete on public.premium_personalized_daily_guidance from anon, authenticated;

alter table public.premium_challenge_completions
  alter column motivation_id drop not null;

alter table public.premium_challenge_completions
  add column if not exists guidance_id uuid references public.premium_personalized_daily_guidance(id) on delete cascade;

create unique index if not exists premium_challenge_completions_user_guidance_idx
  on public.premium_challenge_completions (user_id, guidance_id);

alter table public.premium_challenge_completions
  drop constraint if exists premium_challenge_completions_one_source_check;

alter table public.premium_challenge_completions
  add constraint premium_challenge_completions_one_source_check
  check (num_nonnulls(motivation_id, guidance_id) = 1);
