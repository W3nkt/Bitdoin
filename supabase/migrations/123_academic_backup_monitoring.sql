-- My Scores: backup and restore monitoring (OPS-003, #43).
--
-- The project is on Supabase's Free plan, which keeps no backups. The backup
-- workflow (.github/workflows/backup.yml) dumps the whole database nightly,
-- encrypts it and keeps 30 days off-site; a weekly drill restores the latest
-- copy into an empty Supabase stack and checks every table against it. Both
-- report here, and the hourly health check raises an alert when a run fails
-- or stops arriving.
--
--   academic_backup_runs           one row per backup or drill (counts and timings only)
--   academic_record_backup_run()   called by the workflow as the database owner
--   academic_check_health()        + backup_failed / backup_stale / drill_failed / drill_stale
--   academic_admin_health()        + 'backups' for the Health tab
--
-- Runbook: Docs/my-scores/backup-restore.md

create table if not exists public.academic_backup_runs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('backup', 'drill')),
  ok          boolean not null,
  finished_at timestamptz not null default now(),
  details     jsonb not null default '{}'::jsonb
);
create index if not exists academic_backup_runs_kind_idx on public.academic_backup_runs (kind, finished_at desc);
alter table public.academic_backup_runs enable row level security;
revoke all on public.academic_backup_runs from anon, authenticated;

-- Staleness counts from when monitoring started, so a new install is not
-- reported overdue before its first night.
insert into public.academic_private_settings (key, value) values ('backup_monitoring_since', now()::text)
on conflict (key) do nothing;

alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test',
  'backup_failed', 'backup_stale', 'drill_failed', 'drill_stale'
));

-- Details are counts, seconds, the migration version and the workflow run
-- link: nothing from the backed-up rows.
create or replace function public.academic_record_backup_run(p_kind text, p_ok boolean, p_details jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_id uuid;
begin
  if p_kind is null or p_kind not in ('backup', 'drill') or p_ok is null then
    perform public.academic_invalid('kind', 'Unknown run');
  end if;
  if jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' then
    perform public.academic_invalid('details', 'Expected an object');
  end if;
  for v_key, v_value in select key, value from jsonb_each(coalesce(p_details, '{}'::jsonb)) loop
    if v_key = 'run_url' then
      if jsonb_typeof(v_value) <> 'string' or v_value #>> '{}' !~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/[0-9]+(/attempts/[0-9]+)?$' then
        perform public.academic_invalid('details', 'Invalid run link');
      end if;
    elsif v_key = 'migration' then
      if jsonb_typeof(v_value) <> 'string' or v_value #>> '{}' !~ '^[0-9]{1,20}$' then
        perform public.academic_invalid('details', 'Invalid migration');
      end if;
    elsif v_key in ('bytes', 'tables', 'rows', 'cron_jobs', 'problems', 'dump_s', 'download_s', 'stack_s', 'restore_s',
                    'verify_s', 'rto_s', 'backup_age_s') then
      if jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 1e12 then
        perform public.academic_invalid('details', 'Invalid number');
      end if;
    else
      perform public.academic_invalid('details', 'Unknown field');
    end if;
  end loop;

  insert into public.academic_backup_runs (kind, ok, details) values (p_kind, p_ok, coalesce(p_details, '{}'::jsonb))
  returning id into v_id;
  delete from public.academic_backup_runs where finished_at < now() - interval '1 year';
  return jsonb_build_object('id', v_id);
end;
$$;

-- Unchanged from 122 apart from the backup block before retention.
create or replace function public.academic_check_health()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_t jsonb := public.academic_setting('slo_targets');
  v_min integer := coalesce((v_t->>'min_calls')::integer, 20);
  v_hour jsonb := public.academic_slo_window(now() - interval '1 hour', now());
  v_day jsonb := public.academic_slo_window(now() - interval '24 hours', now());
  v_raised text[] := '{}';
  v_job record;
  v_backlog integer;
  v_since timestamptz := coalesce((select value::timestamptz from public.academic_private_settings where key = 'backup_monitoring_since'), now());
  v_run record;
begin
  -- NFR-002, last hour.
  if (v_hour->>'read_p95_ms')::numeric > (v_t->>'read_p95_ms')::numeric
     or (v_hour->>'write_p95_ms')::numeric > (v_t->>'write_p95_ms')::numeric then
    if public.academic_raise_alert('slo_latency', jsonb_build_object(
      'read_p95_ms', v_hour->'read_p95_ms', 'write_p95_ms', v_hour->'write_p95_ms',
      'read_target_ms', v_t->'read_p95_ms', 'write_target_ms', v_t->'write_p95_ms', 'slowest', v_hour->'slowest')) then
      v_raised := array_append(v_raised, 'slo_latency');
    end if;
  end if;

  -- NFR-005, last 24 hours.
  if (v_day->>'calls')::integer >= v_min and (v_day->>'availability')::numeric < (v_t->>'availability')::numeric then
    if public.academic_raise_alert('slo_availability', jsonb_build_object(
      'availability', v_day->'availability', 'target', v_t->'availability',
      'calls', v_day->'calls', 'server_errors', v_day->'server_errors')) then
      v_raised := array_append(v_raised, 'slo_availability');
    end if;
  end if;

  -- NFR-001, last 24 hours.
  if (v_day->>'dashboard_loads')::integer >= v_min and (v_day->>'dashboard_p75_ms')::numeric > (v_t->>'dashboard_p75_ms')::numeric then
    if public.academic_raise_alert('slo_dashboard', jsonb_build_object(
      'dashboard_p75_ms', v_day->'dashboard_p75_ms', 'target_ms', v_t->'dashboard_p75_ms', 'loads', v_day->'dashboard_loads')) then
      v_raised := array_append(v_raised, 'slo_dashboard');
    end if;
  end if;

  -- Jobs: failures in the last hour, or no run for twice the expected gap.
  if to_regclass('cron.job_run_details') is not null then
    for v_job in
      select j.jobname,
             (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed'
                and d.start_time > now() - interval '1 hour') as failed,
             (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid) as last_run,
             case j.jobname
               when 'academic-purge-deletions' then interval '2 days'
               when 'academic-push-reminders' then interval '1 hour'
               when 'academic-collect-metrics' then interval '30 minutes'
               when 'academic-alert-emails' then interval '30 minutes'
               else interval '3 hours'
             end as max_gap
      from cron.job j
      where j.jobname like 'academic-%' and j.jobname <> 'academic-health-check'
    loop
      if v_job.failed > 0 then
        if public.academic_raise_alert('job_failed', jsonb_build_object('job', v_job.jobname, 'failed_1h', v_job.failed)) then
          v_raised := array_append(v_raised, 'job_failed');
        end if;
      elsif v_job.last_run is not null and v_job.last_run < now() - v_job.max_gap then
        if public.academic_raise_alert('job_stale', jsonb_build_object('job', v_job.jobname, 'last_run', v_job.last_run)) then
          v_raised := array_append(v_raised, 'job_stale');
        end if;
      end if;
    end loop;
  end if;

  -- Push reminders that should have gone out an hour ago (outside quiet hours).
  if not public.academic_in_quiet_hours() then
    select count(*) into v_backlog from public.academic_notifications
    where channel = 'push' and state in ('pending', 'sending') and created_at < now() - interval '2 hours';
    if v_backlog > 0 and public.academic_raise_alert('push_backlog', jsonb_build_object('stuck', v_backlog)) then
      v_raised := array_append(v_raised, 'push_backlog');
    end if;
  end if;

  -- OPS-003: the latest backup (nightly) and drill (weekly) failed, or none
  -- succeeded within the window (26 hours / 8 days, from monitoring start).
  for v_run in
    select k.kind, k.max_gap,
           (select r.ok from public.academic_backup_runs r where r.kind = k.kind order by r.finished_at desc limit 1) as last_ok,
           (select max(r.finished_at) from public.academic_backup_runs r where r.kind = k.kind and r.ok) as last_success,
           (select r.details->>'run_url' from public.academic_backup_runs r where r.kind = k.kind order by r.finished_at desc limit 1) as run_url
    from (values ('backup', interval '26 hours'), ('drill', interval '8 days')) as k(kind, max_gap)
  loop
    if v_run.last_ok is false then
      if public.academic_raise_alert(v_run.kind || '_failed', jsonb_build_object('last_success', v_run.last_success, 'run_url', v_run.run_url)) then
        v_raised := array_append(v_raised, v_run.kind || '_failed');
      end if;
    elsif greatest(v_since, coalesce(v_run.last_success, '-infinity'::timestamptz)) < now() - v_run.max_gap then
      if public.academic_raise_alert(v_run.kind || '_stale', jsonb_build_object('last_success', v_run.last_success)) then
        v_raised := array_append(v_raised, v_run.kind || '_stale');
      end if;
    end if;
  end loop;

  -- Retention: metrics are kept for 90 days.
  delete from public.academic_client_metrics where bucket < now() - interval '90 days';
  delete from public.academic_server_metrics where window_end < now() - interval '90 days';

  return jsonb_build_object('raised', to_jsonb(v_raised), 'hour', v_hour, 'day', v_day);
end;
$$;

-- Unchanged from 122 apart from 'backups'.
create or replace function public.academic_admin_health()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_from timestamptz := date_trunc('hour', now()) - interval '47 hours';
begin
  return jsonb_build_object(
    'targets', public.academic_setting('slo_targets'),
    'hour', public.academic_slo_window(now() - interval '1 hour', now()),
    'day', public.academic_slo_window(now() - interval '24 hours', now()),
    'month', public.academic_slo_window(now() - interval '30 days', now()),
    'series', (
      select jsonb_agg(jsonb_build_object(
        'hour', h,
        'read_p95_ms', (select round(max(p95_est_ms)) from public.academic_server_metrics s
                        where s.kind = 'read' and s.window_end > h and s.window_end <= h + interval '1 hour'),
        'write_p95_ms', (select round(max(p95_est_ms)) from public.academic_server_metrics s
                         where s.kind = 'write' and s.window_end > h and s.window_end <= h + interval '1 hour'),
        'calls', (select coalesce(sum(calls), 0) from public.academic_client_metrics c
                  where c.kind = 'rpc' and c.bucket >= h and c.bucket < h + interval '1 hour'),
        'server_errors', (select coalesce(sum(server_errors), 0) from public.academic_client_metrics c
                          where c.kind = 'rpc' and c.bucket >= h and c.bucket < h + interval '1 hour')
      ) order by h)
      from generate_series(v_from, date_trunc('hour', now()), interval '1 hour') as h
    ),
    'jobs', case when to_regclass('cron.job_run_details') is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'job', j.jobname, 'schedule', j.schedule,
        'last_run', (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid),
        'last_status', (select d.status from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1),
        'failed_24h', (select count(*) from cron.job_run_details d where d.jobid = j.jobid and d.status = 'failed'
                       and d.start_time > now() - interval '24 hours')
      ) order by j.jobname), '[]'::jsonb)
      from cron.job j where j.jobname like 'academic-%'
    ) end,
    'alerts', jsonb_build_object(
      'open', (select count(*) from public.academic_alerts where status = 'open'),
      'unsent', (select count(*) from public.academic_alerts where notified_at is null and notify_attempts >= 5),
      'last_error', (select notify_error from public.academic_alerts where notify_error is not null order by created_at desc limit 1)
    ),
    'pending_push', (select count(*) from public.academic_notifications where channel = 'push' and state in ('pending', 'sending')),
    'backups', (
      select jsonb_object_agg(k.kind, jsonb_build_object(
        'last', (select jsonb_build_object('ok', r.ok, 'finished_at', r.finished_at, 'details', r.details)
                 from public.academic_backup_runs r where r.kind = k.kind order by r.finished_at desc limit 1),
        'last_success_at', (select max(r.finished_at) from public.academic_backup_runs r where r.kind = k.kind and r.ok),
        'runs_30d', (select count(*) from public.academic_backup_runs r where r.kind = k.kind and r.finished_at > now() - interval '30 days'),
        'failed_30d', (select count(*) from public.academic_backup_runs r where r.kind = k.kind and not r.ok and r.finished_at > now() - interval '30 days')
      ))
      from (values ('backup'), ('drill')) as k(kind)
    )
  );
end;
$$;

-- The workflow connects as the database owner; nobody else records runs.
revoke all on function public.academic_record_backup_run(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.academic_record_backup_run(text, boolean, jsonb) to service_role;
