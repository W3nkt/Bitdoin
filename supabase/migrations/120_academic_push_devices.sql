-- My Scores — a per-device switch for score reminders (BE-009, #27).
--
-- Until now a device row in push_subscriptions existed only while Bookstore or
-- Academy daily notifications were on, and score reminders went to every
-- device of the student. So turning on My Scores reminders also meant daily
-- quotes, and a phone set up only for new-book alerts got score reminders.
--
-- my_scores_enabled is the third switch on the same row:
--   * save_push_subscription accepts p_platform 'MY_SCORES'; the row is removed
--     only when all three switches are off. Bookstore/Academy behave as before.
--   * academic_push_opted_in and the preferences' push_device look only at
--     devices with my_scores_enabled; send-push delivers only to those.
--
-- Also: submitting a month clears its reminders right away (trigger below).

alter table public.push_subscriptions
  add column if not exists my_scores_enabled boolean not null default false;

create index if not exists push_subscriptions_my_scores_idx
  on public.push_subscriptions (user_id)
  where my_scores_enabled;

-- Same as migration 102, plus the MY_SCORES switch.
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
  if p_platform not in ('BOOKSTORE', 'ACADEMY', 'MY_SCORES') then
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
    (user_id, endpoint, p256dh, auth, user_agent, bookstore_enabled, academy_enabled, my_scores_enabled, academy_slot)
  values (
    v_user_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300),
    p_platform = 'BOOKSTORE' and p_enabled,
    p_platform = 'ACADEMY' and p_enabled,
    p_platform = 'MY_SCORES' and p_enabled,
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
    my_scores_enabled = case
      when p_platform = 'MY_SCORES' then p_enabled
      when s.user_id = v_user_id then s.my_scores_enabled
      else false end,
    academy_slot = coalesce(p_slot, case when s.user_id = v_user_id then s.academy_slot else excluded.academy_slot end)
  returning * into v_row;

  if not v_row.bookstore_enabled and not v_row.academy_enabled and not v_row.my_scores_enabled then
    delete from public.push_subscriptions where id = v_row.id;
  end if;

  return jsonb_build_object(
    'bookstore_enabled', v_row.bookstore_enabled,
    'academy_enabled', v_row.academy_enabled,
    'my_scores_enabled', v_row.my_scores_enabled,
    'academy_slot', v_row.academy_slot
  );
end;
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
    and exists (select 1 from public.push_subscriptions where user_id = p_user_id and my_scores_enabled);
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
    'push_device', exists (select 1 from public.push_subscriptions where user_id = v_user and my_scores_enabled),
    'quiet_hours', public.academic_setting('notification_quiet_hours')
  );
end;
$$;

-- A submitted month settles its reminders at once: queued pushes are
-- suppressed and shown ones leave the inbox, so nobody is asked to add scores
-- they already added.
create or replace function public.academic_settle_score_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.academic_notifications n
  set state = case when n.state = 'pending' then 'suppressed' else 'dismissed' end,
      dismissed_at = case when n.state = 'pending' then n.dismissed_at else now() end
  where n.category = 'score_reminder'
    and n.state in ('pending', 'sent', 'read')
    and n.payload->>'enrolment_id' = new.enrolment_id::text
    and n.payload->>'period_id' = new.reporting_period_id::text;
  return null;
end;
$$;

drop trigger if exists academic_score_entries_settle_reminders on public.academic_score_entries;
create trigger academic_score_entries_settle_reminders
  after insert or update of state on public.academic_score_entries
  for each row when (new.state = 'submitted')
  execute function public.academic_settle_score_reminders();

revoke all on function public.academic_settle_score_reminders() from public, anon, authenticated;

revoke all on function public.save_push_subscription(text, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text, text, boolean, text) to authenticated;
revoke all on function public.academic_push_opted_in(uuid, text) from public, anon, authenticated;
