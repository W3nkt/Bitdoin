-- Bitdoin Premium subscription system.
-- This module is intentionally separate from bookstore orders and payments.

create table if not exists public.premium_plans (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  description text not null,
  price_lak   integer not null default 0,
  interval    text not null default 'month',
  features    text[] not null default '{}',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  plan_id     uuid not null references public.premium_plans(id),
  status      text not null default 'PENDING_PAYMENT'
    check (status in ('FREE', 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'ACTIVE', 'CANCELLED', 'EXPIRED')),
  starts_at   timestamptz,
  ends_at     timestamptz,
  cancelled_at timestamptz,
  auto_renew  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_payments (
  id              uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.premium_subscriptions(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  plan_id         uuid not null references public.premium_plans(id),
  amount_lak      integer not null,
  currency        text not null default 'LAK',
  method          text not null default 'MANUAL_TRANSFER',
  status          text not null default 'PENDING'
    check (status in ('PENDING', 'REQUIRES_REVIEW', 'VERIFIED', 'REJECTED', 'REFUNDED')),
  receipt_image_url text,
  reference       text,
  notes           text,
  reviewed_by_user_id uuid references public.users(id),
  reviewed_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.premium_daily_motivations (
  id          uuid primary key default uuid_generate_v4(),
  publish_date date not null unique default current_date,
  quote       text not null,
  reflection  text not null,
  challenge   text not null,
  mission     text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_challenge_completions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  motivation_id uuid not null references public.premium_daily_motivations(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, motivation_id)
);

create index if not exists premium_subscriptions_user_idx on public.premium_subscriptions (user_id, created_at desc);
create index if not exists premium_payments_user_idx on public.premium_payments (user_id, created_at desc);
create index if not exists premium_payments_status_idx on public.premium_payments (status);

drop trigger if exists premium_plans_updated_at on public.premium_plans;
create trigger premium_plans_updated_at
  before update on public.premium_plans
  for each row execute function set_updated_at();

drop trigger if exists premium_subscriptions_updated_at on public.premium_subscriptions;
create trigger premium_subscriptions_updated_at
  before update on public.premium_subscriptions
  for each row execute function set_updated_at();

drop trigger if exists premium_payments_updated_at on public.premium_payments;
create trigger premium_payments_updated_at
  before update on public.premium_payments
  for each row execute function set_updated_at();

drop trigger if exists premium_daily_motivations_updated_at on public.premium_daily_motivations;
create trigger premium_daily_motivations_updated_at
  before update on public.premium_daily_motivations
  for each row execute function set_updated_at();

alter table public.premium_plans enable row level security;
alter table public.premium_subscriptions enable row level security;
alter table public.premium_payments enable row level security;
alter table public.premium_daily_motivations enable row level security;
alter table public.premium_challenge_completions enable row level security;

drop policy if exists "premium_plans_public_read" on public.premium_plans;
create policy "premium_plans_public_read"
  on public.premium_plans for select
  using (is_active = true or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_plans_admin_all" on public.premium_plans;
create policy "premium_plans_admin_all"
  on public.premium_plans for all
  using (get_user_role() in ('ADMIN'))
  with check (get_user_role() in ('ADMIN'));

drop policy if exists "premium_subscriptions_own_read" on public.premium_subscriptions;
create policy "premium_subscriptions_own_read"
  on public.premium_subscriptions for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_subscriptions_own_insert" on public.premium_subscriptions;
create policy "premium_subscriptions_own_insert"
  on public.premium_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "premium_subscriptions_own_update" on public.premium_subscriptions;
create policy "premium_subscriptions_own_update"
  on public.premium_subscriptions for update
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'))
  with check (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    or (
      user_id = auth.uid()
      and status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CANCELLED')
    )
  );

drop policy if exists "premium_payments_own_read" on public.premium_payments;
create policy "premium_payments_own_read"
  on public.premium_payments for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_payments_own_insert" on public.premium_payments;
create policy "premium_payments_own_insert"
  on public.premium_payments for insert
  with check (user_id = auth.uid());

drop policy if exists "premium_payments_own_update" on public.premium_payments;
create policy "premium_payments_own_update"
  on public.premium_payments for update
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'))
  with check (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    or (
      user_id = auth.uid()
      and status in ('PENDING', 'REQUIRES_REVIEW')
    )
  );

drop policy if exists "premium_daily_motivations_public_read" on public.premium_daily_motivations;
create policy "premium_daily_motivations_public_read"
  on public.premium_daily_motivations for select
  using (is_active = true or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_daily_motivations_admin_all" on public.premium_daily_motivations;
create policy "premium_daily_motivations_admin_all"
  on public.premium_daily_motivations for all
  using (get_user_role() in ('ADMIN'))
  with check (get_user_role() in ('ADMIN'));

drop policy if exists "premium_challenge_completions_own_read" on public.premium_challenge_completions;
create policy "premium_challenge_completions_own_read"
  on public.premium_challenge_completions for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_challenge_completions_own_insert" on public.premium_challenge_completions;
create policy "premium_challenge_completions_own_insert"
  on public.premium_challenge_completions for insert
  with check (user_id = auth.uid());

drop policy if exists "premium_challenge_completions_own_delete" on public.premium_challenge_completions;
create policy "premium_challenge_completions_own_delete"
  on public.premium_challenge_completions for delete
  using (user_id = auth.uid());

insert into public.premium_plans (slug, name, description, price_lak, interval, features, sort_order)
values
  (
    'free',
    'Free',
    'Start with daily motivation and a preview of the Bitdoin mentor system.',
    0,
    'month',
    array['Daily motivation preview', 'Limited learning center access', 'Starter AI prompt library'],
    1
  ),
  (
    'premium-monthly',
    'Premium Monthly',
    'Daily mentor guidance, AI coach access, learning paths, prompt packs, and productivity tools.',
    59000,
    'month',
    array['Daily mentor dashboard', 'AI Coach shortcut', 'Premium lessons and resources', 'Prompt library access', 'Streak and challenge tracking'],
    2
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price_lak = excluded.price_lak,
  interval = excluded.interval,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.premium_daily_motivations (publish_date, quote, reflection, challenge, mission)
values (
  current_date,
  'The future is created by what you do today.',
  'What is one useful thing you can learn, practice, or improve before the day ends?',
  'Study for 30 minutes without using your phone.',
  'Write one sentence about what you learned today.'
)
on conflict (publish_date) do update
set
  quote = excluded.quote,
  reflection = excluded.reflection,
  challenge = excluded.challenge,
  mission = excluded.mission,
  is_active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'premium-payment-proofs',
  'premium-payment-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "premium_payment_proofs_owner_insert" on storage.objects;
create policy "premium_payment_proofs_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'premium-payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "premium_payment_proofs_owner_read" on storage.objects;
create policy "premium_payment_proofs_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'premium-payment-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    )
  );

drop policy if exists "premium_payment_proofs_owner_update" on storage.objects;
create policy "premium_payment_proofs_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'premium-payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'premium-payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
