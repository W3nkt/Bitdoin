create table if not exists public.premium_weekly_content_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.premium_weekly_content_runs(id) on delete cascade,
  task_key text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, task_key)
);

create index if not exists premium_weekly_content_tasks_claim_idx
  on public.premium_weekly_content_tasks (available_at, created_at)
  where status in ('PENDING', 'PROCESSING');

alter table public.premium_weekly_content_tasks enable row level security;

drop policy if exists "Admins can read weekly content tasks" on public.premium_weekly_content_tasks;
create policy "Admins can read weekly content tasks"
  on public.premium_weekly_content_tasks for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'ADMIN'));

create or replace function public.claim_academy_content_task(p_run_id uuid default null)
returns setof public.premium_weekly_content_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  select t.id into claimed_id
  from public.premium_weekly_content_tasks t
  join public.premium_weekly_content_runs r on r.id = t.run_id
  where (p_run_id is null or t.run_id = p_run_id)
    and r.status = 'GENERATING'
    and t.attempts < t.max_attempts
    and t.available_at <= now()
    and (t.status = 'PENDING' or (t.status = 'PROCESSING' and t.lease_expires_at < now()))
  order by t.created_at
  for update of t skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.premium_weekly_content_tasks
  set status = 'PROCESSING', attempts = attempts + 1,
      lease_expires_at = now() + interval '3 minutes',
      started_at = coalesce(started_at, now()), updated_at = now(), error_message = null
  where id = claimed_id
  returning *;
end;
$$;

revoke all on function public.claim_academy_content_task(uuid) from public, anon, authenticated;
grant execute on function public.claim_academy_content_task(uuid) to service_role;

-- Wake the worker every minute. It returns immediately and processes at most one
-- durable task, so it cannot become one long-running weekly HTTP request.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'academy-content-worker';
select cron.schedule(
  'academy-content-worker',
  '* * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/generate-academy-week',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"process"}'::jsonb,
    timeout_milliseconds := 10000
  );$$
);
