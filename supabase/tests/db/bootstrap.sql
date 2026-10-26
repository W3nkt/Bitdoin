-- Minimal stand-in for the Supabase pieces the academic migrations rely on.
set search_path = "$user", public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
do $$ begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create type user_role as enum ('CUSTOMER', 'ADMIN', 'OPERATIONS', 'FINANCE');
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique,
  email text unique,
  role user_role not null default 'CUSTOMER',
  language text not null default 'lo',
  currency text not null default 'LAK',
  member_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.get_user_role() returns user_role
language sql stable security definer set search_path = '' as $$
  select role from public.users where id = (select auth.uid());
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'), false);
$$;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- auth.jwt() reads the full claims, as on Supabase.
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

-- pg_cron stand-in: records schedules so tests can assert on them.
create schema if not exists cron;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (p_name, p_schedule, p_command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid
$$;
create function cron.unschedule(p_jobid bigint) returns boolean language sql as $$
  delete from cron.job where jobid = p_jobid returning true
$$;
create table cron.job_run_details (
  runid bigserial primary key, jobid bigint, status text, return_message text,
  start_time timestamptz, end_time timestamptz
);

-- pg_net stand-in and the core push_subscriptions table (migration 102).
create schema if not exists net;
create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds integer default 1000)
returns bigint language sql as $$ select 1::bigint $$;
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  bookstore_enabled boolean not null default false,
  academy_enabled boolean not null default false,
  academy_slot text not null default 'MORNING'
);
create function public.default_telegram_reminder_slot(p_user_id uuid) returns text
language sql stable as $$ select 'MORNING' $$;

-- Academy learning hub (migration 054), only the columns the recommendations
-- adapter reads (P2-REC #50, migrations 135+).
create table public.premium_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_lak integer not null default 0
);
insert into public.premium_plans (slug, name, price_lak) values ('free', 'Free', 0), ('premium-monthly', 'Premium Monthly', 39000);
create table public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid references public.premium_plans(id),
  status text not null default 'ACTIVE',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create function public.has_active_premium_subscription(p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.premium_subscriptions s where s.user_id = p_user_id and s.status = 'ACTIVE' and (s.ends_at is null or s.ends_at > now()))
$$;
create table public.premium_learning_activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null constraint premium_learning_activity_attempts_activity_type_check check (activity_type in ('brain_sprint', 'word_match', 'ai_roleplay')),
  score integer not null,
  total integer not null,
  xp_earned integer not null default 0 check (xp_earned between 0 and 20),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  activity_date date not null default timezone('Asia/Vientiane', now())::date
);
create table public.premium_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_lo text not null,
  difficulty text not null default 'BEGINNER',
  estimated_minutes integer not null default 10,
  status text not null default 'DRAFT',
  published_at timestamptz
);
create table public.premium_lesson_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.premium_lessons(id) on delete cascade,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);
create table public.premium_weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_lo text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true
);
create table public.premium_weekly_challenge_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid not null references public.premium_weekly_challenges(id) on delete cascade,
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

-- Supabase Storage: only the buckets table the OCR migration (139) writes to.
create schema if not exists storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
