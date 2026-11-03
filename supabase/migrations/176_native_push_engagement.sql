-- Push notifications in the iOS / Android apps, and the engagement notifications
-- that bring members back (streak, leaderboard, comeback) or send them off to
-- rest (well-being).
--
-- Devices. A phone gets one row in push_subscriptions, like a browser does:
--   * channel IOS / ANDROID (WEB is every row that existed before),
--   * endpoint 'native://ios/<APNs token>' or 'native://android/<FCM token>',
--     so every existing rule (one row per device, switches, dead-token removal,
--     audience counts) works unchanged; p256dh / auth stay empty,
--   * two new switches next to Bookstore / Academy / My Scores:
--       engagement_enabled  streak at risk, leaderboard, "we saved your place"
--       wellbeing_enabled   take a break, time to put the phone down
--   * last_active_at / session_started_at, kept fresh by the app while it is open.
--
-- Engagement. push_claim_engagement() picks, per member, at most one message for
-- this moment and writes it to push_engagement_log in the same step, so
-- overlapping runs cannot send twice. The rules that protect members live here,
-- not in the edge function:
--   * only inside a time window for that kind (Laos time), never at night,
--   * at most 2 engagement pushes and 2 well-being pushes a day, 2 hours apart,
--   * nothing while the app is open right now,
--   * after 3 engagement pushes that were not followed by opening the app, stop
--     until the member opens it again.
-- send-push does the sending (action 'engagement', woken by pg_cron below).

alter table public.push_subscriptions
  add column if not exists my_scores_enabled boolean not null default false,
  add column if not exists channel text not null default 'WEB',
  add column if not exists engagement_enabled boolean not null default false,
  add column if not exists wellbeing_enabled boolean not null default false,
  add column if not exists app_version text,
  add column if not exists last_active_at timestamptz,
  add column if not exists session_started_at timestamptz;

alter table public.push_subscriptions drop constraint if exists push_subscriptions_channel_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_channel_check check (channel in ('WEB', 'IOS', 'ANDROID'));

-- A browser endpoint is an https URL; a phone's is native://<channel>/<token>.
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_check check (
    (channel = 'WEB' and endpoint like 'https://%')
    or (channel <> 'WEB' and endpoint like 'native://%')
  );

create index if not exists push_subscriptions_engagement_idx
  on public.push_subscriptions (user_id)
  where channel <> 'WEB' and (engagement_enabled or wellbeing_enabled);

-- ─── Phones: save, move, touch, remove ───────────────────────────────────────

-- Turns one switch on/off for this phone. Creates the row on first use. A phone
-- last used by another account moves to the caller and every other switch is
-- reset, so nobody inherits someone else's choices. A brand-new row gets sensible
-- companions: turning Academy on also turns on streak/leaderboard reminders and
-- well-being nudges (the app says so, and each can be switched off on its own);
-- turning Bookstore on turns on nothing else. The row is removed when every
-- switch is off.
create or replace function public.save_native_push_device(
  p_token text,
  p_channel text,
  p_platform text,
  p_enabled boolean,
  p_slot text default null,
  p_app_version text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_endpoint text;
  v_row public.push_subscriptions;
begin
  if v_user_id is null then
    raise exception 'Please sign in first';
  end if;
  if p_channel not in ('IOS', 'ANDROID') then
    raise exception 'Invalid channel';
  end if;
  if p_platform not in ('BOOKSTORE', 'ACADEMY', 'MY_SCORES', 'ENGAGEMENT', 'WELLBEING') then
    raise exception 'Invalid platform';
  end if;
  if p_slot is not null and p_slot not in ('MORNING', 'AFTERNOON', 'EVENING') then
    raise exception 'Invalid reminder time';
  end if;
  if coalesce(p_token, '') !~ '^[A-Za-z0-9:_.-]+$' or length(p_token) not between 20 and 1024 then
    raise exception 'Invalid push token';
  end if;
  v_endpoint := 'native://' || lower(p_channel) || '/' || p_token;

  insert into public.push_subscriptions as s
    (user_id, endpoint, channel, p256dh, auth, user_agent, app_version,
     bookstore_enabled, academy_enabled, my_scores_enabled, engagement_enabled, wellbeing_enabled,
     academy_slot, last_active_at, session_started_at)
  values (
    v_user_id, v_endpoint, p_channel, '', '', left(p_user_agent, 300), left(p_app_version, 40),
    p_platform = 'BOOKSTORE' and p_enabled,
    p_platform = 'ACADEMY' and p_enabled,
    p_platform = 'MY_SCORES' and p_enabled,
    p_enabled and p_platform in ('ACADEMY', 'ENGAGEMENT'),
    p_enabled and p_platform in ('ACADEMY', 'WELLBEING'),
    coalesce(p_slot, public.default_telegram_reminder_slot(v_user_id)),
    now(), now()
  )
  on conflict (endpoint) do update set
    user_id = v_user_id,
    channel = excluded.channel,
    user_agent = excluded.user_agent,
    app_version = coalesce(excluded.app_version, s.app_version),
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
    engagement_enabled = case
      when p_platform = 'ENGAGEMENT' then p_enabled
      when s.user_id = v_user_id then s.engagement_enabled
      else excluded.engagement_enabled end,
    wellbeing_enabled = case
      when p_platform = 'WELLBEING' then p_enabled
      when s.user_id = v_user_id then s.wellbeing_enabled
      else excluded.wellbeing_enabled end,
    academy_slot = coalesce(p_slot, case when s.user_id = v_user_id then s.academy_slot else excluded.academy_slot end),
    last_active_at = now(),
    session_started_at = case
      when s.user_id = v_user_id and s.last_active_at >= now() - interval '15 minutes' then s.session_started_at
      else now() end
  returning * into v_row;

  if not (v_row.bookstore_enabled or v_row.academy_enabled or v_row.my_scores_enabled
          or v_row.engagement_enabled or v_row.wellbeing_enabled) then
    delete from public.push_subscriptions where id = v_row.id;
  end if;

  return jsonb_build_object(
    'bookstore_enabled', v_row.bookstore_enabled,
    'academy_enabled', v_row.academy_enabled,
    'my_scores_enabled', v_row.my_scores_enabled,
    'engagement_enabled', v_row.engagement_enabled,
    'wellbeing_enabled', v_row.wellbeing_enabled,
    'academy_slot', v_row.academy_slot
  );
end;
$$;

-- The device's saved switches, or null when this phone has no row yet.
create or replace function public.get_native_push_device(p_token text, p_channel text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'bookstore_enabled', s.bookstore_enabled,
    'academy_enabled', s.academy_enabled,
    'my_scores_enabled', s.my_scores_enabled,
    'engagement_enabled', s.engagement_enabled,
    'wellbeing_enabled', s.wellbeing_enabled,
    'academy_slot', s.academy_slot
  )
  from public.push_subscriptions s
  where s.user_id = (select auth.uid())
    and s.endpoint = 'native://' || lower(p_channel) || '/' || p_token;
$$;

-- APNs / FCM sometimes hand out a new token. The app notices on launch and moves
-- the switches over (only the caller's own row).
create or replace function public.replace_native_push_device(p_old_token text, p_token text, p_channel text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_old text := 'native://' || lower(p_channel) || '/' || p_old_token;
  v_new text := 'native://' || lower(p_channel) || '/' || p_token;
begin
  if v_user_id is null then
    raise exception 'Please sign in first';
  end if;
  if p_channel not in ('IOS', 'ANDROID') or coalesce(p_token, '') !~ '^[A-Za-z0-9:_.-]+$'
     or length(p_token) not between 20 and 1024 then
    raise exception 'Invalid push token';
  end if;
  if v_old = v_new then
    return exists (select 1 from public.push_subscriptions where endpoint = v_new and user_id = v_user_id);
  end if;
  if not exists (select 1 from public.push_subscriptions where endpoint = v_old and user_id = v_user_id) then
    return false;
  end if;
  delete from public.push_subscriptions where endpoint = v_new;
  update public.push_subscriptions
  set endpoint = v_new, last_active_at = now()
  where endpoint = v_old and user_id = v_user_id;
  return found;
end;
$$;

-- "The app is open": called when the app comes to the foreground and every few
-- minutes while it stays there. Starts a new session after a 15 minute gap.
-- Returns false when this phone has no row (the app then registers again).
create or replace function public.touch_push_device(p_token text, p_channel text, p_app_version text default null)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  update public.push_subscriptions s
  set last_active_at = now(),
      session_started_at = case
        when s.last_active_at is null or s.last_active_at < now() - interval '15 minutes' then now()
        else s.session_started_at end,
      app_version = coalesce(left(p_app_version, 40), s.app_version)
  where s.user_id = (select auth.uid())
    and s.endpoint = 'native://' || lower(p_channel) || '/' || p_token;
  return found;
end;
$$;

-- Signing out stops this phone getting the previous member's notifications.
create or replace function public.remove_native_push_device(p_token text, p_channel text)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_subscriptions
  where user_id = (select auth.uid())
    and endpoint = 'native://' || lower(p_channel) || '/' || p_token;
$$;

revoke all on function public.save_native_push_device(text, text, text, boolean, text, text, text) from public, anon;
revoke all on function public.get_native_push_device(text, text) from public, anon;
revoke all on function public.replace_native_push_device(text, text, text) from public, anon;
revoke all on function public.touch_push_device(text, text, text) from public, anon;
revoke all on function public.remove_native_push_device(text, text) from public, anon;
grant execute on function public.save_native_push_device(text, text, text, boolean, text, text, text) to authenticated;
grant execute on function public.get_native_push_device(text, text) to authenticated;
grant execute on function public.replace_native_push_device(text, text, text) to authenticated;
grant execute on function public.touch_push_device(text, text, text) to authenticated;
grant execute on function public.remove_native_push_device(text, text) to authenticated;

-- ─── What was sent (caps, no repeats, back-off) ──────────────────────────────

create table if not exists public.push_engagement_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users(id) on delete cascade,
  kind      text not null check (kind in ('STREAK_AT_RISK', 'XP_RIVAL', 'DAILY_NOT_OPENED', 'COMEBACK', 'BREAK', 'WINDDOWN')),
  sent_on   date not null,
  sent_at   timestamptz not null default now()
);

create index if not exists push_engagement_log_user_idx on public.push_engagement_log (user_id, sent_at desc);
create index if not exists push_engagement_log_sent_idx on public.push_engagement_log (sent_at);

-- Service role only: no policy, so members cannot read or write it.
alter table public.push_engagement_log enable row level security;

-- ─── Standings (same scoring as the leaderboard) ─────────────────────────────

-- XP, streak and rank for every member with a current membership (Free included),
-- scored exactly like get_academy_top_performers (097) and the member leaderboard
-- (103): 25 XP per daily-mentor item, 25 more for a full day, plus learning XP.
-- Unlike those, nothing here is shown to a person: it only decides who gets which
-- nudge. rank is null until a member has any XP; gap_to_next is the XP between a
-- member and the one ranked just above.
create or replace function public.push_member_standings(p_now timestamptz default now())
returns table (
  user_id uuid,
  xp integer,
  streak integer,
  items_today integer,
  latest_completed_day date,
  last_active_day date,
  rank integer,
  gap_to_next integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := timezone('Asia/Vientiane', p_now)::date;
begin
  return query
  with members as (
    select distinct on (subscription.user_id)
      subscription.user_id,
      coalesce(nullif(btrim(member.name), ''), 'Academy member') as display_name
    from public.premium_subscriptions as subscription
    join public.users as member on member.id = subscription.user_id
    where subscription.status = 'ACTIVE'
      and (subscription.ends_at is null or subscription.ends_at > p_now)
    order by subscription.user_id, subscription.created_at desc
  ),
  completion_facts as (
    select
      completion.user_id,
      coalesce(
        guidance.publish_date,
        motivation.publish_date,
        timezone('Asia/Vientiane', coalesce(completion.completed_at, now()))::date
      ) as activity_date,
      nullif(btrim(completion.responses ->> 'reflection'), '') is not null as reflection_done,
      nullif(btrim(completion.responses ->> 'challenge'), '') is not null as challenge_done,
      nullif(btrim(completion.responses ->> 'mission'), '') is not null as mission_done
    from public.premium_challenge_completions as completion
    join members on members.user_id = completion.user_id
    left join public.premium_personalized_daily_guidance as guidance on guidance.id = completion.guidance_id
    left join public.premium_daily_motivations as motivation on motivation.id = completion.motivation_id
  ),
  daily_progress as (
    select
      facts.user_id,
      facts.activity_date,
      (bool_or(facts.reflection_done)::integer + bool_or(facts.challenge_done)::integer + bool_or(facts.mission_done)::integer) as completed_items,
      bool_or(facts.reflection_done) and bool_or(facts.challenge_done) and bool_or(facts.mission_done) as day_completed
    from completion_facts as facts
    group by facts.user_id, facts.activity_date
  ),
  daily_totals as (
    select
      progress.user_id,
      sum(progress.completed_items * 25 + case when progress.day_completed then 25 else 0 end)::integer as daily_xp,
      max(progress.activity_date) filter (where progress.day_completed) as latest_completed_day,
      max(progress.activity_date) as last_daily_day,
      coalesce(max(progress.completed_items) filter (where progress.activity_date = v_today), 0)::integer as items_today
    from daily_progress as progress
    group by progress.user_id
  ),
  streak_groups as (
    select
      dated.user_id,
      count(*)::integer as streak_days,
      max(dated.activity_date) as last_day
    from (
      select
        progress.user_id,
        progress.activity_date,
        progress.activity_date - (row_number() over (partition by progress.user_id order by progress.activity_date))::integer as streak_group
      from daily_progress as progress
      where progress.day_completed
    ) as dated
    group by dated.user_id, dated.streak_group
  ),
  learning_totals as (
    select
      attempt.user_id,
      coalesce(sum(attempt.xp_earned), 0)::integer as learning_xp,
      max(timezone('Asia/Vientiane', attempt.completed_at)::date) as last_learning_day
    from public.premium_learning_activity_attempts as attempt
    join members on members.user_id = attempt.user_id
    group by attempt.user_id
  ),
  scored as (
    select
      members.user_id,
      members.display_name,
      coalesce(daily.daily_xp, 0) + coalesce(learning.learning_xp, 0) as xp,
      case
        when streaks.last_day >= v_today - 1 then streaks.streak_days
        else 0
      end as streak,
      coalesce(daily.items_today, 0) as items_today,
      daily.latest_completed_day,
      greatest(daily.last_daily_day, learning.last_learning_day) as last_active_day
    from members
    left join daily_totals as daily on daily.user_id = members.user_id
    left join learning_totals as learning on learning.user_id = members.user_id
    left join streak_groups as streaks
      on streaks.user_id = members.user_id
      and streaks.last_day = daily.latest_completed_day
  ),
  ranked as (
    select
      scored.*,
      case when scored.xp > 0 then (row_number() over (
        order by scored.xp desc, coalesce(scored.streak, 0) desc, scored.last_active_day desc nulls last, lower(scored.display_name)
      ))::integer end as rank
    from scored
  )
  select
    ranked.user_id,
    ranked.xp::integer,
    coalesce(ranked.streak, 0)::integer,
    ranked.items_today::integer,
    ranked.latest_completed_day,
    ranked.last_active_day,
    ranked.rank,
    case when ranked.rank > 1 then (lag(ranked.xp) over (order by ranked.rank) - ranked.xp)::integer end
  from ranked;
end;
$$;

-- ─── Who gets which engagement push, right now ───────────────────────────────

-- Picks at most one message per member for this moment, records it, and returns
-- it for send-push to deliver. Safe to call any number of times: overlapping runs
-- take turns (advisory lock) and a member is never picked twice for the same kind
-- inside its window.
--
--   kind              who                                      window (Laos time)
--   WINDDOWN          well-being on, using the app             21:30 - 23:59, once a day
--   BREAK             well-being on, in one session 90+ min    08:00 - 21:29, 4 hours apart
--   STREAK_AT_RISK    streak alive, today's mentor not done    18:00 - 20:59, once a day
--   XP_RIVAL          within 100 XP of the rank above          15:00 - 20:59, every 2 days
--   COMEBACK          away 3 to 30 days                        17:00 - 19:59, every 4 days
--   DAILY_NOT_OPENED  opened recently but not today            12:00 - 16:59, once a day
--
-- The first row that applies wins; the order above is the priority. Members who
-- are not in the Academy only ever get the two well-being messages.
create or replace function public.push_claim_engagement(p_now timestamptz default now(), p_limit integer default 500)
returns table (user_id uuid, kind text, language text, params jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_local timestamp := timezone('Asia/Vientiane', p_now);
  v_today date := v_local::date;
  v_minutes integer := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
  -- The board is the expensive part; only compute it when a message that needs it can be due.
  v_board boolean := v_minutes between 12 * 60 and 20 * 60 + 59;
begin
  perform pg_advisory_xact_lock(hashtext('push_claim_engagement'));
  delete from public.push_engagement_log l where l.sent_at < p_now - interval '60 days';

  return query
  with devices as (
    select
      s.user_id,
      bool_or(s.engagement_enabled) as engagement,
      bool_or(s.wellbeing_enabled) as wellbeing,
      max(s.last_active_at) as last_active_at,
      (array_agg(s.session_started_at order by s.last_active_at desc nulls last))[1] as session_started_at
    from public.push_subscriptions s
    where s.channel <> 'WEB' and (s.engagement_enabled or s.wellbeing_enabled)
    group by s.user_id
  ),
  board as (
    select b.* from public.push_member_standings(p_now) b where v_board
  ),
  state as (
    select
      d.user_id,
      d.engagement,
      d.wellbeing,
      d.last_active_at,
      d.session_started_at,
      d.last_active_at >= p_now - interval '10 minutes' as open_now,
      coalesce(v_today - timezone('Asia/Vientiane', d.last_active_at)::date, 9999) as idle_days,
      board.user_id is not null as is_member,
      coalesce(board.streak, 0) as streak,
      board.rank,
      board.gap_to_next,
      coalesce(board.items_today, 0) as items_today,
      board.latest_completed_day,
      board.last_active_day,
      (select max(l.sent_at) from public.push_engagement_log l where l.user_id = d.user_id) as last_sent_at,
      (select count(*) from public.push_engagement_log l
        where l.user_id = d.user_id and l.sent_on = v_today and l.kind not in ('BREAK', 'WINDDOWN')) as engagement_today,
      (select count(*) from public.push_engagement_log l
        where l.user_id = d.user_id and l.sent_on = v_today and l.kind in ('BREAK', 'WINDDOWN')) as wellbeing_today,
      -- Engagement pushes sent since the member last opened the app.
      (select count(*) from public.push_engagement_log l
        where l.user_id = d.user_id and l.kind not in ('BREAK', 'WINDDOWN')
          and l.sent_at > coalesce(d.last_active_at, '-infinity'::timestamptz)) as unanswered
    from devices d
    left join board on board.user_id = d.user_id
  ),
  picked as (
    select s.user_id, pick.kind, pick.params
    from state s
    cross join lateral (
      select v.kind, v.params
      from (values
        (1, 'WINDDOWN',
          s.wellbeing and v_minutes between 21 * 60 + 30 and 24 * 60 - 1
            and s.last_active_at >= p_now - interval '15 minutes'
            and s.wellbeing_today < 2
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'WINDDOWN' and l.sent_on = v_today),
          '{}'::jsonb),
        (2, 'BREAK',
          s.wellbeing and v_minutes between 8 * 60 and 21 * 60 + 29
            and s.last_active_at >= p_now - interval '10 minutes'
            and s.session_started_at <= p_now - interval '90 minutes'
            and s.wellbeing_today < 2
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'BREAK' and l.sent_at > p_now - interval '4 hours'),
          '{}'::jsonb),
        (3, 'STREAK_AT_RISK',
          s.engagement and not s.open_now and s.is_member
            and v_minutes between 18 * 60 and 20 * 60 + 59
            and s.streak > 0 and s.latest_completed_day < v_today
            and s.engagement_today < 2 and s.unanswered < 3
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'STREAK_AT_RISK' and l.sent_on = v_today),
          jsonb_build_object('streak', s.streak)),
        (4, 'XP_RIVAL',
          s.engagement and not s.open_now and s.is_member
            and v_minutes between 15 * 60 and 20 * 60 + 59
            and s.rank > 1 and s.gap_to_next between 1 and 100 and s.items_today < 3
            and s.engagement_today < 2 and s.unanswered < 3
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'XP_RIVAL' and l.sent_on > v_today - 2),
          jsonb_build_object('gap', s.gap_to_next, 'rank', s.rank - 1)),
        (5, 'COMEBACK',
          s.engagement and not s.open_now and s.is_member
            and v_minutes between 17 * 60 and 19 * 60 + 59
            and s.idle_days between 3 and 30
            and s.engagement_today < 2 and s.unanswered < 3
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'COMEBACK' and l.sent_on > v_today - 4),
          jsonb_build_object('days', s.idle_days)),
        (6, 'DAILY_NOT_OPENED',
          s.engagement and not s.open_now and s.is_member
            and v_minutes between 12 * 60 and 16 * 60 + 59
            and s.idle_days between 1 and 2
            and s.last_active_day is distinct from v_today
            and s.engagement_today < 2 and s.unanswered < 3
            and not exists (select 1 from public.push_engagement_log l
              where l.user_id = s.user_id and l.kind = 'DAILY_NOT_OPENED' and l.sent_on = v_today),
          '{}'::jsonb)
      ) as v(prio, kind, ok, params)
      where v.ok
      order by v.prio
      limit 1
    ) pick
    -- Two hours between any two of these messages.
    where s.last_sent_at is null or s.last_sent_at <= p_now - interval '2 hours'
    order by s.user_id
    limit greatest(coalesce(p_limit, 500), 1)
  ),
  logged as (
    insert into public.push_engagement_log (user_id, kind, sent_on, sent_at)
    select p.user_id, p.kind, v_today, p_now from picked p
    returning push_engagement_log.user_id
  )
  select p.user_id, p.kind, coalesce(u.language, 'lo'), p.params
  from picked p
  left join public.users u on u.id = p.user_id;
end;
$$;

-- Nothing reached the member's phone (temporary failure): give the claim back so
-- the next run can try again.
create or replace function public.push_release_engagement(p_user_id uuid, p_kind text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.push_engagement_log
  where id = (
    select l.id from public.push_engagement_log l
    where l.user_id = p_user_id and l.kind = p_kind
    order by l.sent_at desc
    limit 1
  );
$$;

revoke all on function public.push_member_standings(timestamptz) from public, anon, authenticated;
revoke all on function public.push_claim_engagement(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.push_release_engagement(uuid, text) from public, anon, authenticated;
grant execute on function public.push_member_standings(timestamptz) to service_role;
grant execute on function public.push_claim_engagement(timestamptz, integer) to service_role;
grant execute on function public.push_release_engagement(uuid, text) to service_role;

-- ─── Schedule ────────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'push-engagement';
select cron.schedule(
  'push-engagement',
  '*/15 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"engagement"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
