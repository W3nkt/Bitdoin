-- Top performers for the Academy admin dashboard, computed from real activity.
--
-- Replaces the hand-entered premium_performance_highlights list in the admin
-- UI. Scoring matches the member leaderboard (048/049): 25 XP per completed
-- daily-mentor item plus a 25 XP bonus for a fully completed day, plus every
-- XP earned in learning activities. Only members with a current membership
-- (ACTIVE and not past ends_at, Free included) are ranked.

create or replace function public.get_academy_top_performers(p_limit integer default 10)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  plan_name text,
  xp integer,
  daily_xp integer,
  learning_xp integer,
  streak integer,
  completed_days integer,
  last_active_day date,
  rank integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if coalesce(public.get_user_role()::text, '') <> 'ADMIN' then
    raise exception 'Only administrators can view top performers';
  end if;

  return query
  with members as (
    select distinct on (subscription.user_id)
      subscription.user_id,
      coalesce(nullif(btrim(member.name), ''), 'Academy member') as display_name,
      member.avatar_url,
      plan.name as plan_name
    from public.premium_subscriptions as subscription
    join public.users as member on member.id = subscription.user_id
    join public.premium_plans as plan on plan.id = subscription.plan_id
    where subscription.status = 'ACTIVE'
      and (subscription.ends_at is null or subscription.ends_at > now())
    -- Prefer a paid plan when a member somehow has two live rows.
    order by subscription.user_id, plan.price_lak desc, subscription.created_at desc
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
      (count(*) filter (where progress.day_completed))::integer as completed_days,
      max(progress.activity_date) filter (where progress.day_completed) as latest_completed_day,
      max(progress.activity_date) as last_daily_day
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
      members.avatar_url,
      members.plan_name,
      coalesce(daily.daily_xp, 0) as daily_xp,
      coalesce(learning.learning_xp, 0) as learning_xp,
      coalesce(daily.daily_xp, 0) + coalesce(learning.learning_xp, 0) as xp,
      coalesce(daily.completed_days, 0) as completed_days,
      case
        when streaks.last_day >= timezone('Asia/Vientiane', now())::date - 1 then streaks.streak_days
        else 0
      end as streak,
      greatest(daily.last_daily_day, learning.last_learning_day) as last_active_day
    from members
    left join daily_totals as daily on daily.user_id = members.user_id
    left join learning_totals as learning on learning.user_id = members.user_id
    left join streak_groups as streaks
      on streaks.user_id = members.user_id
      and streaks.last_day = daily.latest_completed_day
  )
  select
    scored.user_id,
    scored.display_name,
    scored.avatar_url,
    scored.plan_name,
    scored.xp::integer,
    scored.daily_xp::integer,
    scored.learning_xp::integer,
    coalesce(scored.streak, 0)::integer,
    scored.completed_days::integer,
    scored.last_active_day,
    (row_number() over (
      order by scored.xp desc, coalesce(scored.streak, 0) desc, scored.last_active_day desc nulls last, lower(scored.display_name)
    ))::integer as rank
  from scored
  -- Members with no activity yet aren't "performers".
  where scored.xp > 0
  order by rank
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

revoke all on function public.get_academy_top_performers(integer) from public, anon;
grant execute on function public.get_academy_top_performers(integer) to authenticated;
