-- Play & Learn activity attempts and server-authoritative XP awards.

create table if not exists public.premium_learning_activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('brain_sprint', 'word_match', 'ai_roleplay')),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  xp_earned integer not null default 0 check (xp_earned between 0 and 20),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  completed_at timestamptz not null default now(),
  activity_date date not null default timezone('Asia/Vientiane', now())::date
);

create index if not exists premium_learning_activity_attempts_user_date_idx
  on public.premium_learning_activity_attempts (user_id, activity_date desc, completed_at desc);

alter table public.premium_learning_activity_attempts enable row level security;

drop policy if exists "premium_learning_activity_attempts_own_read"
  on public.premium_learning_activity_attempts;
create policy "premium_learning_activity_attempts_own_read"
  on public.premium_learning_activity_attempts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.premium_learning_activity_attempts from public, anon;
grant select on table public.premium_learning_activity_attempts to authenticated;

create or replace function public.complete_premium_learning_activity(
  p_activity_type text,
  p_score integer,
  p_total integer,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_activity_date date := timezone('Asia/Vientiane', now())::date;
  v_xp integer;
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_activity_type not in ('brain_sprint', 'word_match', 'ai_roleplay') then
    raise exception 'Unknown learning activity';
  end if;

  if p_score is null or p_total is null or p_score < 0 or p_total <= 0 or p_score > p_total then
    raise exception 'Invalid activity score';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Activity metadata must be an object';
  end if;

  if not exists (
    select 1
    from public.premium_subscriptions as subscription
    where subscription.user_id = v_user_id
      and subscription.status = 'ACTIVE'
      and (subscription.ends_at is null or subscription.ends_at > now())
  ) then
    raise exception 'An active Premium subscription is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_activity_type || ':' || v_activity_date::text, 0)
  );

  if exists (
    select 1
    from public.premium_learning_activity_attempts as attempt
    where attempt.user_id = v_user_id
      and attempt.activity_type = p_activity_type
      and attempt.activity_date = v_activity_date
      and attempt.xp_earned > 0
  ) then
    v_xp := 0;
  else
    v_xp := case p_activity_type
      when 'brain_sprint' then 15
      when 'word_match' then 15
      when 'ai_roleplay' then 20
      else 0
    end;
  end if;

  insert into public.premium_learning_activity_attempts (
    user_id,
    activity_type,
    score,
    total,
    xp_earned,
    metadata,
    activity_date
  )
  values (
    v_user_id,
    p_activity_type,
    p_score,
    p_total,
    v_xp,
    p_metadata,
    v_activity_date
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'activity_type', p_activity_type,
    'xp_earned', v_xp,
    'activity_date', v_activity_date
  );
end;
$$;

revoke all on function public.complete_premium_learning_activity(text, integer, integer, jsonb)
  from public, anon;
grant execute on function public.complete_premium_learning_activity(text, integer, integer, jsonb)
  to authenticated;

-- Preserve the existing mentor-derived dashboard calculation and augment its
-- current-member XP with Play & Learn awards.
alter function public.get_premium_member_dashboard(integer)
  rename to get_premium_member_dashboard_without_learning;

create or replace function public.get_premium_member_dashboard(p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dashboard jsonb;
  v_learning_xp integer;
  v_leaderboard jsonb;
begin
  v_dashboard := public.get_premium_member_dashboard_without_learning(p_limit);
  if v_dashboard is null then
    return null;
  end if;

  select coalesce(sum(attempt.xp_earned), 0)::integer
  into v_learning_xp
  from public.premium_learning_activity_attempts as attempt
  where attempt.user_id = (select auth.uid());

  v_dashboard := jsonb_set(
    v_dashboard,
    '{member,xp}',
    to_jsonb(coalesce((v_dashboard #>> '{member,xp}')::integer, 0) + v_learning_xp)
  );

  select coalesce(
    jsonb_agg(
      case
        when item ->> 'is_current_user' = 'true'
          then jsonb_set(
            item,
            '{xp}',
            to_jsonb(coalesce((item ->> 'xp')::integer, 0) + v_learning_xp)
          )
        else item
      end
      order by position
    ),
    '[]'::jsonb
  )
  into v_leaderboard
  from jsonb_array_elements(v_dashboard -> 'leaderboard') with ordinality as entries(item, position);

  return jsonb_set(v_dashboard, '{leaderboard}', v_leaderboard);
end;
$$;

revoke all on function public.get_premium_member_dashboard_without_learning(integer)
  from public, anon, authenticated;
revoke all on function public.get_premium_member_dashboard(integer)
  from public, anon;
grant execute on function public.get_premium_member_dashboard(integer)
  to authenticated;
