-- One admin-triggered AI content release for the following Academy week.

create table if not exists public.premium_weekly_content_runs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  status text not null default 'GENERATING' check (status in ('GENERATING', 'READY', 'FAILED')),
  model text not null,
  generated_by uuid not null references public.users(id),
  content_counts jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_roleplay_missions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.premium_weekly_content_runs(id) on delete cascade,
  mission_date date not null unique,
  slug text not null,
  title_en text not null,
  title_lo text not null,
  description_en text not null,
  description_lo text not null,
  coach_prompt_en text not null,
  coach_prompt_lo text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_prompt_library (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.premium_weekly_content_runs(id) on delete cascade,
  week_start date not null,
  slug text not null,
  category text not null,
  title_en text not null,
  title_lo text not null,
  description_en text not null,
  description_lo text not null,
  prompt_en text not null,
  prompt_lo text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (week_start, slug)
);

alter table public.premium_lessons
  add column if not exists weekly_run_id uuid references public.premium_weekly_content_runs(id) on delete set null;

create index if not exists premium_weekly_content_runs_status_idx
  on public.premium_weekly_content_runs (status, week_start desc);
create index if not exists premium_roleplay_missions_date_idx
  on public.premium_roleplay_missions (mission_date);
create index if not exists premium_prompt_library_week_idx
  on public.premium_prompt_library (week_start desc, sort_order);
create index if not exists premium_lessons_weekly_run_idx
  on public.premium_lessons (weekly_run_id) where weekly_run_id is not null;

alter table public.premium_weekly_content_runs enable row level security;
alter table public.premium_roleplay_missions enable row level security;
alter table public.premium_prompt_library enable row level security;

create policy "weekly_content_runs_admin_read" on public.premium_weekly_content_runs
  for select to authenticated using (get_user_role() = 'ADMIN');
create policy "roleplay_missions_member_read" on public.premium_roleplay_missions
  for select to authenticated using (public.has_active_premium_subscription() or get_user_role() = 'ADMIN');
create policy "prompt_library_member_read" on public.premium_prompt_library
  for select to authenticated using (public.has_active_premium_subscription() or get_user_role() = 'ADMIN');

grant select on public.premium_weekly_content_runs, public.premium_roleplay_missions,
  public.premium_prompt_library to authenticated;
grant select, insert, update, delete on public.premium_weekly_content_runs,
  public.premium_roleplay_missions, public.premium_prompt_library to service_role;

drop trigger if exists premium_weekly_content_runs_updated_at on public.premium_weekly_content_runs;
create trigger premium_weekly_content_runs_updated_at before update on public.premium_weekly_content_runs
  for each row execute function public.set_updated_at();
