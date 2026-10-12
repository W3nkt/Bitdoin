-- Web Push notifications for the browser and the home-screen app, on both
-- platforms.
--
-- Each browser/device a member turns notifications on from gets one row in
-- push_subscriptions, with a switch per platform:
--   * Bookstore: new-book digest (daily, only when books were added) and
--     announcements from /admin/settings.
--   * Academy:   one daily reminder in the member's chosen slot (Laos time),
--     featuring new lessons when there are any, plus announcements from
--     /academy-admin.
-- The send-push edge function does all sending (pg_cron wakes it below).

create table if not exists public.push_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.users(id) on delete cascade,
  endpoint                 text not null unique check (endpoint like 'https://%'),
  p256dh                   text not null,
  auth                     text not null,
  user_agent               text,
  bookstore_enabled        boolean not null default false,
  academy_enabled          boolean not null default false,
  academy_slot             text not null default 'MORNING'
                           check (academy_slot in ('MORNING', 'AFTERNOON', 'EVENING')),
  last_academy_reminder_on date,
  last_success_at          timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_academy_due_idx
  on public.push_subscriptions (academy_slot, last_academy_reminder_on)
  where academy_enabled;
create index if not exists push_subscriptions_bookstore_idx
  on public.push_subscriptions (id)
  where bookstore_enabled;

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

-- Members can read their own devices; all writes go through the functions
-- below (members) or the service role (send-push).
drop policy if exists "Members read own push subscriptions" on public.push_subscriptions;
create policy "Members read own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Turn one platform on/off for this browser. Creates the row on first use. If
-- the browser was last used by another account, it moves to the caller and the
-- other platform's switch is reset so nobody inherits someone else's choice.
-- Returns the device's switches; when both are off the row is removed and the
-- client should unsubscribe the browser.
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text,
  p_platform text,
  p_enabled boolean,
  p_slot text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.push_subscriptions;
begin
  if v_user_id is null then
    raise exception 'Please sign in first';
  end if;
  if p_platform not in ('BOOKSTORE', 'ACADEMY') then
    raise exception 'Invalid platform';
  end if;
  if p_slot is not null and p_slot not in ('MORNING', 'AFTERNOON', 'EVENING') then
    raise exception 'Invalid reminder time';
  end if;
  if coalesce(p_endpoint, '') not like 'https://%' or length(p_endpoint) > 2048
     or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Invalid push subscription';
  end if;

  insert into public.push_subscriptions as s
    (user_id, endpoint, p256dh, auth, user_agent, bookstore_enabled, academy_enabled, academy_slot)
  values (
    v_user_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300),
    p_platform = 'BOOKSTORE' and p_enabled,
    p_platform = 'ACADEMY' and p_enabled,
    coalesce(p_slot, public.default_telegram_reminder_slot(v_user_id))
  )
  on conflict (endpoint) do update set
    user_id = v_user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    bookstore_enabled = case
      when p_platform = 'BOOKSTORE' then p_enabled
      when s.user_id = v_user_id then s.bookstore_enabled
      else false end,
    academy_enabled = case
      when p_platform = 'ACADEMY' then p_enabled
      when s.user_id = v_user_id then s.academy_enabled
      else false end,
    academy_slot = coalesce(p_slot, case when s.user_id = v_user_id then s.academy_slot else excluded.academy_slot end)
  returning * into v_row;

  if not v_row.bookstore_enabled and not v_row.academy_enabled then
    delete from public.push_subscriptions where id = v_row.id;
  end if;

  return jsonb_build_object(
    'bookstore_enabled', v_row.bookstore_enabled,
    'academy_enabled', v_row.academy_enabled,
    'academy_slot', v_row.academy_slot
  );
end;
$$;

-- Browsers occasionally replace a push subscription (new endpoint/keys). The
-- app notices on load and moves the member's switches to the new endpoint.
create or replace function public.replace_push_subscription(
  p_old_endpoint text,
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Please sign in first';
  end if;
  if coalesce(p_endpoint, '') not like 'https://%' or length(p_endpoint) > 2048
     or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Invalid push subscription';
  end if;

  -- Same endpoint, refreshed keys.
  update public.push_subscriptions
  set p256dh = p_p256dh, auth = p_auth
  where endpoint = p_endpoint and user_id = v_user_id;
  if found then
    return true;
  end if;

  -- New endpoint: carry the old row's switches over (only the caller's own row).
  if not exists (
    select 1 from public.push_subscriptions where endpoint = p_old_endpoint and user_id = v_user_id
  ) then
    return false;
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  update public.push_subscriptions
  set endpoint = p_endpoint, p256dh = p_p256dh, auth = p_auth
  where endpoint = p_old_endpoint and user_id = v_user_id;
  return found;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text, text, boolean, text) from public, anon;
revoke all on function public.replace_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.replace_push_subscription(text, text, text, text) to authenticated;

-- ─── Announcements & digests log ─────────────────────────────────────────────
-- Staff write an announcement here, then ask send-push to deliver it. The
-- new-book digest also logs here, which is how it knows what is "new".

create table if not exists public.push_announcements (
  id                   uuid primary key default gen_random_uuid(),
  platform             text not null check (platform in ('BOOKSTORE', 'ACADEMY', 'ALL')),
  kind                 text not null default 'ANNOUNCEMENT' check (kind in ('ANNOUNCEMENT', 'NEW_BOOKS')),
  title_lo             text check (char_length(title_lo) <= 80),
  body_lo              text check (char_length(body_lo) <= 240),
  title_en             text check (char_length(title_en) <= 80),
  body_en              text check (char_length(body_en) <= 240),
  url                  text not null default '/' check (url like '/%' and url not like '//%'),
  status               text not null default 'PENDING' check (status in ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  sent_count           integer not null default 0,
  failed_count         integer not null default 0,
  last_book_created_at timestamptz,
  created_by           uuid references public.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz,
  constraint push_announcements_has_text check (
    coalesce(title_lo, title_en) is not null and coalesce(body_lo, body_en) is not null
  )
);

create index if not exists push_announcements_recent_idx on public.push_announcements (created_at desc);
create index if not exists push_announcements_digest_idx on public.push_announcements (kind, created_at desc);

alter table public.push_announcements enable row level security;

drop policy if exists "Staff read push announcements" on public.push_announcements;
create policy "Staff read push announcements"
  on public.push_announcements for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "Staff create push announcements" on public.push_announcements;
create policy "Staff create push announcements"
  on public.push_announcements for insert to authenticated
  with check (
    (select public.is_staff())
    and kind = 'ANNOUNCEMENT'
    and status = 'PENDING'
    and created_by = (select auth.uid())
  );

-- How many members/devices each platform would reach (for the composer).
create or replace function public.get_push_audience_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  return (
    select jsonb_build_object(
      'bookstore_members', count(distinct user_id) filter (where bookstore_enabled),
      'bookstore_devices', count(*) filter (where bookstore_enabled),
      'academy_members', count(distinct user_id) filter (where academy_enabled),
      'academy_devices', count(*) filter (where academy_enabled),
      'all_members', count(distinct user_id),
      'all_devices', count(*)
    )
    from public.push_subscriptions
  );
end;
$$;

revoke all on function public.get_push_audience_stats() from public, anon;
grant execute on function public.get_push_audience_stats() to authenticated;

-- ─── Schedules ───────────────────────────────────────────────────────────────
-- Both jobs are idempotent: a device gets one Academy reminder per day, and a
-- new-book digest only covers books added since the previous digest.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'push-academy-reminders';
select cron.schedule(
  'push-academy-reminders',
  '*/15 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"academy-daily"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);

-- 11:00 UTC = 18:00 Laos, when people are off work and browsing.
select cron.unschedule(jobid) from cron.job where jobname = 'push-bookstore-new-books';
select cron.schedule(
  'push-bookstore-new-books',
  '0 11 * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"new-books"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
