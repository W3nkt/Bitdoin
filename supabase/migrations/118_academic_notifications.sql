-- My Scores — in-app notifications and score reminders (BE-009, #27).
--
-- SCORE-014: when a monthly period ended 7 days ago with no submitted entry,
-- one in-app reminder; 7 days after that, one more (push if the student
-- opted in, else in-app); never more than 2 per period.
-- NOTIF-001: in-app is on by default; push needs the 'push' consent and the
-- category switch, and is sent to the devices in push_subscriptions.
-- NOTIF-003: push respects quiet hours 21:00–07:00 Asia/Vientiane and caps of
-- 1 per day / 3 per week; a capped or undeliverable push becomes in-app.
-- NOTIF-004: payloads carry period labels only, never scores. Text comes
-- from the client copy library (UX-005) and send-push/messages.ts.
--
-- academic_schedule_score_reminders()  hourly (pg_cron)
-- send-push { action: 'academic-reminders' }  every 15 min (pg_cron) claims
--   due push rows, delivers them and reports back.

insert into public.academic_settings (key, value, description) values
  ('score_reminders', '{"first_after_days": 7, "second_after_days": 7, "max_per_period": 2}',
   'SCORE-014 timing: first reminder N days after period end, second N days after the first.'),
  ('notification_quiet_hours', '{"start": "21:00", "end": "07:00"}', 'No push in this window, Asia/Vientiane (NOTIF-003).'),
  ('push_caps', '{"per_day": 1, "per_week": 3}', 'Push caps per student across categories (NOTIF-003).')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  student_profile_id uuid references public.academic_student_profiles(id) on delete cascade,
  category           text not null check (category in ('score_reminder')),
  code               varchar(64) not null,
  payload            jsonb not null default '{}'::jsonb,
  channel            text not null check (channel in ('in_app', 'push')),
  state              text not null check (state in ('pending', 'sending', 'sent', 'read', 'dismissed', 'suppressed', 'failed')),
  dedupe_key         varchar(160) not null unique,
  attempts           smallint not null default 0,
  created_at         timestamptz not null default now(),
  sent_at            timestamptz,
  read_at            timestamptz,
  dismissed_at       timestamptz
);

create index if not exists academic_notifications_inbox_idx
  on public.academic_notifications (user_id, created_at desc) where state in ('sent', 'read');
create index if not exists academic_notifications_push_idx
  on public.academic_notifications (state, created_at) where channel = 'push';

create table if not exists public.academic_notification_preferences (
  user_id        uuid not null references public.users(id) on delete cascade,
  category       text not null check (category in ('score_reminder')),
  in_app_enabled boolean not null default true,
  push_enabled   boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.academic_notifications enable row level security;
alter table public.academic_notification_preferences enable row level security;
revoke all on public.academic_notifications from anon, authenticated;
revoke all on public.academic_notification_preferences from anon, authenticated;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_in_quiet_hours(p_at timestamptz default now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select coalesce((public.academic_setting('notification_quiet_hours')->>'start')::time, time '21:00') as q_start,
           coalesce((public.academic_setting('notification_quiet_hours')->>'end')::time, time '07:00') as q_end,
           (p_at at time zone 'Asia/Vientiane')::time as local_time
  )
  select case when q_start <= q_end then local_time >= q_start and local_time < q_end
              else local_time >= q_start or local_time < q_end end
  from cfg;
$$;

-- True when another push may go to this user now (caps, NOTIF-003).
create or replace function public.academic_push_allowed(p_user_id uuid, p_exclude uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.academic_notifications
     where user_id = p_user_id and channel = 'push' and state in ('sending', 'sent', 'read')
       and coalesce(sent_at, created_at) > now() - interval '1 day' and id is distinct from p_exclude)
      < coalesce((public.academic_setting('push_caps')->>'per_day')::integer, 1)
    and
    (select count(*) from public.academic_notifications
     where user_id = p_user_id and channel = 'push' and state in ('pending', 'sending', 'sent', 'read')
       and coalesce(sent_at, created_at) > now() - interval '7 days' and id is distinct from p_exclude)
      < coalesce((public.academic_setting('push_caps')->>'per_week')::integer, 3);
$$;

create or replace function public.academic_push_opted_in(p_user_id uuid, p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select push_enabled from public.academic_notification_preferences
                   where user_id = p_user_id and category = p_category), false)
    and exists (
      select 1 from public.academic_consent_records c
      join public.academic_student_profiles p on p.id = c.student_profile_id
      where p.user_id = p_user_id and c.purpose = 'push' and c.withdrawn_at is null
    )
    and exists (select 1 from public.push_subscriptions where user_id = p_user_id);
$$;

-- ─── Scheduler (SCORE-014) ───────────────────────────────────────────────────

create or replace function public.academic_schedule_score_reminders()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := public.academic_setting('score_reminders');
  v_first integer := coalesce((v_cfg->>'first_after_days')::integer, 7);
  v_second integer := coalesce((v_cfg->>'second_after_days')::integer, 7);
  v_max integer := coalesce((v_cfg->>'max_per_period')::integer, 2);
  v_today date := public.academic_today();
  v_due record;
  v_first_row public.academic_notifications;
  v_in_app boolean;
  v_channel text;
  v_count integer := 0;
  v_inserted integer;
begin
  if coalesce(public.academic_setting('my_scores_enabled'), 'false'::jsonb) <> 'true'::jsonb then
    return 0;
  end if;

  for v_due in
    select pr.id as profile_id, pr.user_id, e.id as enrolment_id, p.id as period_id,
           p.label_lo, p.label_en, to_char(p.start_date, 'YYYY-MM') as period_key, p.end_date
    from public.academic_student_profiles pr
    join public.academic_enrolments e on e.student_profile_id = pr.id and e.state = 'active'
    join public.academic_reporting_periods p on p.calendar_template_id = e.calendar_template_id and p.period_type = 'monthly'
    where pr.status = 'active' and pr.consent_state = 'active'
      and p.sequence >= e.start_period_seq
      and (e.end_period_seq is null or p.sequence <= e.end_period_seq)
      -- Only months that ended after the student joined.
      and p.end_date >= (pr.created_at at time zone 'Asia/Vientiane')::date
      and p.end_date + v_first <= v_today
      and not exists (
        select 1 from public.academic_score_entries se
        where se.enrolment_id = e.id and se.reporting_period_id = p.id and se.state = 'submitted'
      )
  loop
    v_in_app := coalesce((select in_app_enabled from public.academic_notification_preferences
                          where user_id = v_due.user_id and category = 'score_reminder'), true);

    select * into v_first_row from public.academic_notifications
    where dedupe_key = 'score_reminder:' || v_due.enrolment_id || ':' || v_due.period_id || ':1';

    if v_first_row.id is null then
      if not v_in_app then
        continue;
      end if;
      insert into public.academic_notifications (user_id, student_profile_id, category, code, payload, channel, state, dedupe_key, sent_at)
      values (v_due.user_id, v_due.profile_id, 'score_reminder', 'score_reminder.first',
        jsonb_build_object('enrolment_id', v_due.enrolment_id, 'period_id', v_due.period_id, 'period_key', v_due.period_key,
          'period_label_lo', v_due.label_lo, 'period_label_en', v_due.label_en),
        'in_app', 'sent', 'score_reminder:' || v_due.enrolment_id || ':' || v_due.period_id || ':1', now())
      on conflict (dedupe_key) do nothing;
      get diagnostics v_inserted = row_count;
      v_count := v_count + v_inserted;
      continue;
    end if;

    if v_max < 2 or v_first_row.created_at > now() - make_interval(days => v_second) then
      continue;
    end if;

    v_channel := case
      when public.academic_push_opted_in(v_due.user_id, 'score_reminder') and public.academic_push_allowed(v_due.user_id) then 'push'
      when v_in_app then 'in_app'
    end;
    if v_channel is null then
      continue;
    end if;

    insert into public.academic_notifications (user_id, student_profile_id, category, code, payload, channel, state, dedupe_key, sent_at)
    values (v_due.user_id, v_due.profile_id, 'score_reminder', 'score_reminder.second',
      jsonb_build_object('enrolment_id', v_due.enrolment_id, 'period_id', v_due.period_id, 'period_key', v_due.period_key,
        'period_label_lo', v_due.label_lo, 'period_label_en', v_due.label_en),
      v_channel, case when v_channel = 'push' then 'pending' else 'sent' end,
      'score_reminder:' || v_due.enrolment_id || ':' || v_due.period_id || ':2',
      case when v_channel = 'in_app' then now() end)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_inserted = row_count;
    v_count := v_count + v_inserted;
  end loop;

  -- A submitted period makes its outstanding reminders moot.
  update public.academic_notifications n
  set state = 'suppressed'
  where n.category = 'score_reminder' and n.state = 'pending'
    and exists (
      select 1 from public.academic_score_entries se
      where se.enrolment_id = (n.payload->>'enrolment_id')::uuid
        and se.reporting_period_id = (n.payload->>'period_id')::uuid
        and se.state = 'submitted'
    );

  return v_count;
end;
$$;

-- ─── Push delivery (service role, called by send-push) ───────────────────────

-- Claims due push notifications. Nothing during quiet hours. Rows that lost
-- their opt-in are suppressed; rows over the cap become in-app.
create or replace function public.academic_claim_push_notifications(p_limit integer default 100)
returns table (id uuid, user_id uuid, code text, payload jsonb, language text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.academic_notifications;
begin
  if public.academic_in_quiet_hours() then
    return;
  end if;

  for v_row in
    select * from public.academic_notifications n
    where n.channel = 'push' and n.state = 'pending'
    order by n.created_at
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
    for update skip locked
  loop
    if not public.academic_push_opted_in(v_row.user_id, v_row.category) then
      update public.academic_notifications set state = 'suppressed' where academic_notifications.id = v_row.id;
    elsif not public.academic_push_allowed(v_row.user_id, v_row.id) then
      update public.academic_notifications set channel = 'in_app', state = 'sent', sent_at = now()
      where academic_notifications.id = v_row.id;
    else
      update public.academic_notifications set state = 'sending', attempts = attempts + 1
      where academic_notifications.id = v_row.id;
      id := v_row.id;
      user_id := v_row.user_id;
      code := v_row.code;
      payload := v_row.payload;
      language := (select u.language from public.users u where u.id = v_row.user_id);
      return next;
    end if;
  end loop;
end;
$$;

-- Reports delivery. Failed rows retry up to 3 times, then show in-app.
create or replace function public.academic_complete_push_notifications(p_sent uuid[], p_failed uuid[])
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.academic_notifications
  set state = 'sent', sent_at = now()
  where id = any (coalesce(p_sent, '{}')) and state = 'sending';

  update public.academic_notifications
  set state = case when attempts >= 3 then 'sent' else 'pending' end,
      channel = case when attempts >= 3 then 'in_app' else channel end,
      sent_at = case when attempts >= 3 then now() end
  where id = any (coalesce(p_failed, '{}')) and state = 'sending';
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

create or replace function public.academic_list_notifications(p_limit integer default 20, p_before timestamptz default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_items jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', n.id, 'category', n.category, 'code', n.code, 'payload', n.payload,
      'channel', n.channel, 'state', n.state, 'created_at', n.created_at, 'read_at', n.read_at
    ) order by n.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select * from public.academic_notifications
    where user_id = v_user and state in ('sent', 'read')
      and (p_before is null or created_at < p_before)
    order by created_at desc
    limit v_limit
  ) n;

  return jsonb_build_object(
    'items', v_items,
    'unread_count', (select count(*) from public.academic_notifications where user_id = v_user and state = 'sent'),
    'next_before', case when jsonb_array_length(v_items) = v_limit then v_items->(v_limit - 1)->'created_at' end
  );
end;
$$;

create or replace function public.academic_mark_notifications_read(p_ids uuid[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  update public.academic_notifications
  set state = 'read', read_at = now()
  where user_id = v_user and state = 'sent' and id = any (coalesce(p_ids, '{}'));
  return jsonb_build_object('unread_count',
    (select count(*) from public.academic_notifications where user_id = v_user and state = 'sent'));
end;
$$;

create or replace function public.academic_dismiss_notification(p_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  update public.academic_notifications
  set state = 'dismissed', dismissed_at = now()
  where id = p_id and user_id = v_user and state in ('sent', 'read');
  if not found then
    return public.academic_deny('notification', p_id);
  end if;
  return jsonb_build_object('id', p_id, 'state', 'dismissed');
end;
$$;

create or replace function public.academic_get_notification_preferences()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object(
    'categories', (
      select jsonb_agg(jsonb_build_object(
        'category', c.category,
        'in_app_enabled', coalesce(p.in_app_enabled, true),
        'push_enabled', coalesce(p.push_enabled, false)
      ))
      from (values ('score_reminder')) as c(category)
      left join public.academic_notification_preferences p on p.user_id = v_user and p.category = c.category
    ),
    'push_consent', exists (
      select 1 from public.academic_consent_records cr
      join public.academic_student_profiles sp on sp.id = cr.student_profile_id
      where sp.user_id = v_user and cr.purpose = 'push' and cr.withdrawn_at is null
    ),
    'push_device', exists (select 1 from public.push_subscriptions where user_id = v_user),
    'quiet_hours', public.academic_setting('notification_quiet_hours')
  );
end;
$$;

-- Turning push on requires the 'push' consent first (NOTIF-001, PRIV-003).
create or replace function public.academic_set_notification_preference(p_category text, p_in_app boolean, p_push boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile(true);
begin
  if p_category is null or p_category not in ('score_reminder') then
    perform public.academic_invalid('category', 'Unknown notification type');
  end if;
  if coalesce(p_push, false) and not exists (
    select 1 from public.academic_consent_records
    where student_profile_id = v_profile.id and purpose = 'push' and withdrawn_at is null
  ) then
    perform public.academic_raise('CONSENT_REQUIRED', 403, 'Allow push notifications first',
      jsonb_build_object('purpose', 'push'));
  end if;

  insert into public.academic_notification_preferences (user_id, category, in_app_enabled, push_enabled)
  values (v_profile.user_id, p_category, coalesce(p_in_app, true), coalesce(p_push, false))
  on conflict (user_id, category) do update
    set in_app_enabled = excluded.in_app_enabled, push_enabled = excluded.push_enabled, updated_at = now();

  return public.academic_get_notification_preferences();
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_in_quiet_hours(timestamptz) from public, anon, authenticated;
revoke all on function public.academic_push_allowed(uuid, uuid) from public, anon, authenticated;
revoke all on function public.academic_push_opted_in(uuid, text) from public, anon, authenticated;
revoke all on function public.academic_schedule_score_reminders() from public, anon, authenticated;
revoke all on function public.academic_claim_push_notifications(integer) from public, anon, authenticated;
revoke all on function public.academic_complete_push_notifications(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.academic_claim_push_notifications(integer) to service_role;
grant execute on function public.academic_complete_push_notifications(uuid[], uuid[]) to service_role;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_list_notifications(integer, timestamptz)',
    'academic_mark_notifications_read(uuid[])',
    'academic_dismiss_notification(uuid)',
    'academic_get_notification_preferences()',
    'academic_set_notification_preference(text, boolean, boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ─── Schedules ───────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-score-reminders';
select cron.schedule(
  'academic-score-reminders',
  '5 * * * *',
  $$select public.academic_schedule_score_reminders();$$
);

select cron.unschedule(jobid) from cron.job where jobname = 'academic-push-reminders';
select cron.schedule(
  'academic-push-reminders',
  '*/15 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"academic-reminders"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
