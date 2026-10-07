-- Academy Content Forge: strictly one step at a time, in a fixed order, with
-- per-step pause/resume.
--
-- Before: claim_academy_content_task only skipped *locked* rows, so the
-- every-minute cron could start a second step while a long one was still
-- running, and all tasks of a run shared one created_at (single insert), so
-- "oldest first" was effectively random.

alter table public.premium_weekly_content_tasks
  add column if not exists sort_order integer not null default 0;

-- Existing runs: order brain sprint → word match → mentor → role-play →
-- prompts → lessons (by category order), matching the edge function.
with ordered as (
  select t.id,
    row_number() over (
      partition by t.run_id
      order by
        case
          when t.task_key like 'brain_sprint-%' then 0
          when t.task_key like 'word_match-%' then 1
          when t.task_key = 'daily_mentor' then 2
          when t.task_key = 'roleplay_missions' then 3
          when t.task_key = 'prompt_library' then 4
          else 5
        end,
        coalesce(c.sort_order, 0),
        t.task_key
    ) as position
  from public.premium_weekly_content_tasks t
  left join public.premium_learning_categories c
    on t.task_key = 'lesson-' || c.id::text
)
update public.premium_weekly_content_tasks t
set sort_order = ordered.position
from ordered
where ordered.id = t.id;

alter table public.premium_weekly_content_tasks
  drop constraint if exists premium_weekly_content_tasks_status_check;
alter table public.premium_weekly_content_tasks
  add constraint premium_weekly_content_tasks_status_check
  check (status in ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED', 'PAUSED'));

-- PAUSED: nothing left to run except steps an admin paused.
alter table public.premium_weekly_content_runs
  drop constraint if exists premium_weekly_content_runs_status_check;
alter table public.premium_weekly_content_runs
  add constraint premium_weekly_content_runs_status_check
  check (status in ('GENERATING', 'PAUSED', 'READY', 'FAILED', 'CANCELLED'));

create index if not exists premium_weekly_content_tasks_run_order_idx
  on public.premium_weekly_content_tasks (run_id, sort_order);

create or replace function public.claim_academy_content_task(p_run_id uuid default null)
returns setof public.premium_weekly_content_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  run_record record;
  next_task public.premium_weekly_content_tasks%rowtype;
begin
  -- Locking the run row serialises concurrent workers (cron + self-invoke):
  -- a second caller skips the locked run instead of starting a parallel step.
  for run_record in
    select r.id
    from public.premium_weekly_content_runs r
    where r.status = 'GENERATING'
      and (p_run_id is null or r.id = p_run_id)
    order by r.week_start
    for update skip locked
  loop
    -- One step at a time: wait while another step of this run holds a lease.
    if exists (
      select 1 from public.premium_weekly_content_tasks t
      where t.run_id = run_record.id
        and t.status = 'PROCESSING'
        and t.lease_expires_at >= now()
    ) then
      continue;
    end if;

    -- Strict order: take the earliest runnable step. If that step is waiting
    -- out a retry delay, wait for it rather than jumping ahead.
    select t.* into next_task
    from public.premium_weekly_content_tasks t
    where t.run_id = run_record.id
      and t.attempts < t.max_attempts
      and (t.status = 'PENDING' or (t.status = 'PROCESSING' and t.lease_expires_at < now()))
    order by t.sort_order, t.created_at
    limit 1
    for update;

    if not found or next_task.available_at > now() then
      continue;
    end if;

    return query
    update public.premium_weekly_content_tasks
    set status = 'PROCESSING', attempts = attempts + 1,
        lease_expires_at = now() + interval '3 minutes',
        started_at = coalesce(started_at, now()), updated_at = now(), error_message = null
    where id = next_task.id
    returning *;
    return;
  end loop;
end;
$$;

revoke all on function public.claim_academy_content_task(uuid) from public, anon, authenticated;
grant execute on function public.claim_academy_content_task(uuid) to service_role;
