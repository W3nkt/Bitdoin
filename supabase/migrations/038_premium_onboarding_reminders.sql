-- Store reminder delivery fields separately from the flexible onboarding jsonb.
-- The jsonb still holds the full personalization profile; these columns make
-- future WhatsApp reminder jobs cheap to query.

alter table public.premium_onboarding_responses
  add column if not exists whatsapp_number text,
  add column if not exists daily_reminder_enabled boolean not null default false,
  add column if not exists daily_reminder_time text;

create index if not exists premium_onboarding_whatsapp_reminders_idx
  on public.premium_onboarding_responses (daily_reminder_time, updated_at)
  where daily_reminder_enabled = true
    and whatsapp_number is not null;

