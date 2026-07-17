-- Live Premium progress derived from daily mentor replies.
-- Each answered item earns 25 XP and completing all three items in one day
-- earns a further 25 XP, for a maximum of 100 XP per local day.

create or replace function public.get_premium_member_dashboard(p_limit integer default 5)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with active_members as (
    select distinct on (subscription.user_id)
      subscription.user_id,
      coalesce(nullif(btrim(member.name), ''), 'Premium member') as display_name,
      member.avatar_url
    from public.premium_subscriptions as subscription
    join public.users as member on member.id = subscription.user_id
    where subscription.status = 'ACTIVE'
    order by subscription.user_id, subscription.created_at desc
  ),
  allowed as (
    select exists (
      select 1
      from active_members
      where user_id = (select auth.uid())
    ) as ok
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
    join active_members on active_members.user_id = completion.user_id
    left join public.premium_personalized_daily_guidance as guidance
      on guidance.id = completion.guidance_id
    left join public.premium_daily_motivations as motivation
      on motivation.id = completion.motivation_id
  ),
  daily_answers as (
    select
      user_id,
      activity_date,
      bool_or(reflection_done) as reflection_done,
      bool_or(challenge_done) as challenge_done,
      bool_or(mission_done) as mission_done
    from completion_facts
    group by user_id, activity_date
  ),
  daily_progress as (
    select
      user_id,
      activity_date,
      (
        reflection_done::integer
        + challenge_done::integer
        + mission_done::integer
      ) as completed_items,
      reflection_done and challenge_done and mission_done as day_completed
    from daily_answers
  ),
  member_totals as (
    select
      member.user_id,
      member.display_name,
      member.avatar_url,
      coalesce(
        sum(
          progress.completed_items * 25
          + case when progress.day_completed then 25 else 0 end
        ),
        0
      )::integer as xp,
      coalesce(sum(progress.completed_items), 0)::integer as completed_items,
      count(*) filter (where progress.day_completed)::integer as completed_days,
      max(progress.activity_date) filter (where progress.day_completed) as latest_completed_day
    from active_members as member
    left join daily_progress as progress on progress.user_id = member.user_id
    group by member.user_id, member.display_name, member.avatar_url
  ),
  completed_dates as (
    select user_id, activity_date
    from daily_progress
    where day_completed
  ),
  dated_streaks as (
    select
      user_id,
      activity_date,
      activity_date
        - (row_number() over (partition by user_id order by activity_date))::integer as streak_group
    from completed_dates
  ),
  streak_groups as (
    select
      user_id,
      count(*)::integer as streak_days,
      max(activity_date) as last_day
    from dated_streaks
    group by user_id, streak_group
  ),
  current_streaks as (
    select
      totals.user_id,
      case
        when groups.last_day >= timezone('Asia/Vientiane', now())::date - 1
          then groups.streak_days
        else 0
      end::integer as streak
    from member_totals as totals
    left join streak_groups as groups
      on groups.user_id = totals.user_id
      and groups.last_day = totals.latest_completed_day
  ),
  scored_members as (
    select
      totals.user_id,
      totals.display_name,
      totals.avatar_url,
      totals.xp,
      totals.completed_items,
      totals.completed_days,
      totals.latest_completed_day,
      coalesce(streaks.streak, 0)::integer as streak
    from member_totals as totals
    left join current_streaks as streaks on streaks.user_id = totals.user_id
  ),
  ranked_members as (
    select
      scored.*,
      row_number() over (
        order by
          scored.xp desc,
          scored.streak desc,
          scored.latest_completed_day desc nulls last,
          lower(scored.display_name),
          scored.user_id
      )::integer as rank
    from scored_members as scored
  ),
  leaderboard as (
    select ranked.*
    from ranked_members as ranked
    order by ranked.rank
    limit least(greatest(coalesce(p_limit, 5), 1), 20)
  )
  select jsonb_build_object(
    'member',
    coalesce(
      (
        select jsonb_build_object(
          'streak', ranked.streak,
          'xp', ranked.xp,
          'rank', ranked.rank,
          'completed_days', ranked.completed_days,
          'completed_items', ranked.completed_items
        )
        from ranked_members as ranked
        where ranked.user_id = (select auth.uid())
      ),
      jsonb_build_object(
        'streak', 0,
        'xp', 0,
        'rank', 0,
        'completed_days', 0,
        'completed_items', 0
      )
    ),
    'leaderboard',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'display_name', leader.display_name,
            'avatar_url', leader.avatar_url,
            'xp', leader.xp,
            'streak', leader.streak,
            'rank', leader.rank,
            'is_current_user', leader.user_id = (select auth.uid())
          )
          order by leader.rank
        )
        from leaderboard as leader
      ),
      '[]'::jsonb
    )
  )
  from allowed
  where allowed.ok;
$$;

revoke all on function public.get_premium_member_dashboard(integer) from public, anon;
grant execute on function public.get_premium_member_dashboard(integer) to authenticated;
