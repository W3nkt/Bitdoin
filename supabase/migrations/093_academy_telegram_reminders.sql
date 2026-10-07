-- Daily Academy reminders on Telegram.
--
-- A member links their Telegram chat once: the Academy profile asks for a
-- short-lived link token, opens t.me/<bot>?start=<token>, and the
-- telegram-webhook edge function stores the chat id when they press Start.
-- telegram-daily-reminder (pg_cron, every 15 min) then sends one reminder per
-- day in the member's chosen slot (Laos time).

create table if not exists public.premium_telegram_links (
  user_id               uuid primary key references public.users(id) on delete cascade,
  chat_id               bigint unique,
  telegram_username     text,
  link_token            text unique,
  link_token_expires_at timestamptz,
  linked_at             timestamptz,
  reminders_enabled     boolean not null default true,
  reminder_slot         text not null default 'MORNING'
                        check (reminder_slot in ('MORNING', 'AFTERNOON', 'EVENING')),
  last_reminded_on      date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists premium_telegram_links_due_idx
  on public.premium_telegram_links (reminder_slot, last_reminded_on)
  where chat_id is not null and reminders_enabled;

drop trigger if exists premium_telegram_links_updated_at on public.premium_telegram_links;
create trigger premium_telegram_links_updated_at
  before update on public.premium_telegram_links
  for each row execute function public.set_updated_at();

alter table public.premium_telegram_links enable row level security;

-- Members can see their own link status; all writes go through the functions
-- below (members) or the service role (webhook / reminder sender).
drop policy if exists "Members read own telegram link" on public.premium_telegram_links;
create policy "Members read own telegram link"
  on public.premium_telegram_links for select to authenticated
  using (user_id = (select auth.uid()));

-- Onboarding asked "Morning / Afternoon / Evening"; reuse it as the default slot.
create or replace function public.default_telegram_reminder_slot(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case lower(coalesce(
      (select daily_reminder_time from public.premium_onboarding_responses where user_id = p_user_id),
      ''))
    when 'afternoon' then 'AFTERNOON'
    when 'evening' then 'EVENING'
    else 'MORNING'
  end;
$$;

revoke all on function public.default_telegram_reminder_slot(uuid) from public, anon, authenticated;

create or replace function public.create_telegram_link_token()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  -- Telegram start parameters allow [A-Za-z0-9_-], max 64 chars.
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if v_user_id is null then
    raise exception 'Please sign in first';
  end if;

  insert into public.premium_telegram_links (user_id, link_token, link_token_expires_at, reminder_slot)
  values (v_user_id, v_token, now() + interval '30 minutes', public.default_telegram_reminder_slot(v_user_id))
  on conflict (user_id) do update
  set link_token = excluded.link_token,
      link_token_expires_at = excluded.link_token_expires_at;

  return v_token;
end;
$$;

create or replace function public.update_telegram_reminder_settings(p_enabled boolean, p_slot text)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_slot not in ('MORNING', 'AFTERNOON', 'EVENING') then
    raise exception 'Invalid reminder time';
  end if;

  update public.premium_telegram_links
  set reminders_enabled = p_enabled,
      reminder_slot = p_slot
  where user_id = (select auth.uid());

  if not found then
    raise exception 'Connect Telegram first';
  end if;
end;
$$;

create or replace function public.disconnect_telegram()
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.premium_telegram_links
  set chat_id = null, telegram_username = null, linked_at = null,
      link_token = null, link_token_expires_at = null
  where user_id = (select auth.uid());
$$;

revoke all on function public.create_telegram_link_token() from public, anon;
revoke all on function public.update_telegram_reminder_settings(boolean, text) from public, anon;
revoke all on function public.disconnect_telegram() from public, anon;
grant execute on function public.create_telegram_link_token() to authenticated;
grant execute on function public.update_telegram_reminder_settings(boolean, text) to authenticated;
grant execute on function public.disconnect_telegram() to authenticated;

-- Wake the reminder sender every 15 minutes. It only sends to members whose
-- slot has passed and who have not been reminded today, so extra calls are
-- harmless.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'academy-telegram-reminders';
select cron.schedule(
  'academy-telegram-reminders',
  '*/15 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/telegram-daily-reminder',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );$$
);
