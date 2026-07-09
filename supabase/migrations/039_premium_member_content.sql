-- Admin-managed Premium member content shown after a subscription is ACTIVE.

create table if not exists public.premium_member_events (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  detail      text not null,
  time_label  text,
  event_date  timestamptz,
  action_url  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_communities (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  detail      text not null,
  action_url  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_performance_highlights (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.users(id) on delete set null,
  display_name text not null,
  metric      text not null,
  period_label text,
  rank_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists premium_subscriptions_active_user_idx
  on public.premium_subscriptions (user_id)
  where status = 'ACTIVE';

create index if not exists premium_member_events_active_idx
  on public.premium_member_events (sort_order, event_date)
  where is_active = true;

create index if not exists premium_communities_active_idx
  on public.premium_communities (sort_order)
  where is_active = true;

create index if not exists premium_performance_highlights_active_idx
  on public.premium_performance_highlights (rank_order)
  where is_active = true;

create unique index if not exists premium_member_events_title_unique_idx
  on public.premium_member_events (lower(title));

create unique index if not exists premium_communities_title_unique_idx
  on public.premium_communities (lower(title));

create unique index if not exists premium_performance_highlights_name_metric_unique_idx
  on public.premium_performance_highlights (lower(display_name), lower(metric));

drop trigger if exists premium_member_events_updated_at on public.premium_member_events;
create trigger premium_member_events_updated_at
  before update on public.premium_member_events
  for each row execute function set_updated_at();

drop trigger if exists premium_communities_updated_at on public.premium_communities;
create trigger premium_communities_updated_at
  before update on public.premium_communities
  for each row execute function set_updated_at();

drop trigger if exists premium_performance_highlights_updated_at on public.premium_performance_highlights;
create trigger premium_performance_highlights_updated_at
  before update on public.premium_performance_highlights
  for each row execute function set_updated_at();

alter table public.premium_member_events enable row level security;
alter table public.premium_communities enable row level security;
alter table public.premium_performance_highlights enable row level security;

drop policy if exists "premium_member_events_member_read" on public.premium_member_events;
create policy "premium_member_events_member_read"
  on public.premium_member_events for select
  using (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    or (
      is_active = true
      and exists (
        select 1
        from public.premium_subscriptions s
        where s.user_id = (select auth.uid())
          and s.status = 'ACTIVE'
          and (s.ends_at is null or s.ends_at > now())
      )
    )
  );

drop policy if exists "premium_member_events_admin_all" on public.premium_member_events;
create policy "premium_member_events_admin_all"
  on public.premium_member_events for all
  using (get_user_role() in ('ADMIN'))
  with check (get_user_role() in ('ADMIN'));

drop policy if exists "premium_communities_member_read" on public.premium_communities;
create policy "premium_communities_member_read"
  on public.premium_communities for select
  using (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    or (
      is_active = true
      and exists (
        select 1
        from public.premium_subscriptions s
        where s.user_id = (select auth.uid())
          and s.status = 'ACTIVE'
          and (s.ends_at is null or s.ends_at > now())
      )
    )
  );

drop policy if exists "premium_communities_admin_all" on public.premium_communities;
create policy "premium_communities_admin_all"
  on public.premium_communities for all
  using (get_user_role() in ('ADMIN'))
  with check (get_user_role() in ('ADMIN'));

drop policy if exists "premium_performance_highlights_member_read" on public.premium_performance_highlights;
create policy "premium_performance_highlights_member_read"
  on public.premium_performance_highlights for select
  using (
    get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE')
    or (
      is_active = true
      and exists (
        select 1
        from public.premium_subscriptions s
        where s.user_id = (select auth.uid())
          and s.status = 'ACTIVE'
          and (s.ends_at is null or s.ends_at > now())
      )
    )
  );

drop policy if exists "premium_performance_highlights_admin_all" on public.premium_performance_highlights;
create policy "premium_performance_highlights_admin_all"
  on public.premium_performance_highlights for all
  using (get_user_role() in ('ADMIN'))
  with check (get_user_role() in ('ADMIN'));

insert into public.premium_member_events (title, detail, time_label, sort_order)
values
  ('AI Study Sprint', '30-minute focus session with a practical AI prompt challenge.', 'Tonight', 1),
  ('English Speaking Circle', 'Practice simple conversation prompts with other Premium learners.', 'Saturday', 2),
  ('Goal Review Room', 'Review your weekly goal and choose one next action.', 'Sunday', 3)
on conflict do nothing;

insert into public.premium_communities (title, detail, sort_order)
values
  ('Study Accountability', 'Share daily progress and keep your streak alive.', 1),
  ('AI Prompt Practice', 'Compare prompts for homework, coding, writing, and research.', 2),
  ('English Corner', 'Daily vocabulary, speaking prompts, and confidence practice.', 3)
on conflict do nothing;

insert into public.premium_performance_highlights (display_name, metric, period_label, rank_order)
values
  ('Noy', '12-day streak', 'This week', 1),
  ('Anousone', '960 XP', 'This week', 2),
  ('Mina', '8 challenges', 'This week', 3)
on conflict do nothing;
