-- My Scores — observability (OPS-002, #42; NFR-001, NFR-002, NFR-005, NFR-017).
--
-- Metrics, never content: RPC names, durations, status classes and error
-- codes. No user IDs, arguments, scores, names or free text are stored.
--
--   Server time   pg_stat_statements is sampled every 5 minutes; per RPC and
--                 window: calls, mean and an estimated p95 (mean + 1.645 sd).
--                 NFR-002: reads p95 <= 300 ms, writes p95 <= 500 ms.
--   Client side   the app reports each RPC's outcome and the dashboard
--                 summary's load time in minute buckets with a latency
--                 histogram (academic_record_metrics).
--                 NFR-005: 99.5% of calls without a server error.
--                 NFR-001: dashboard summary visible <= 2.5 s at p75.
--   Health        hourly: targets missed, failed or stale jobs and stuck
--                 push reminders open academic_alerts (one per kind a day).
--   Alerts        every alert is emailed to the on-call address by the
--                 academic-alerts Edge Function (pg_cron, every 5 minutes).
--   Admin         academic_admin_health() feeds the Health tab.

insert into public.academic_settings (key, value, description) values
  ('slo_targets', '{"read_p95_ms": 300, "write_p95_ms": 500, "availability": 0.995, "dashboard_p75_ms": 2500, "min_calls": 20}',
   'Service level targets (NFR-001/002/005) and the minimum calls before a target is judged.')
on conflict (key) do nothing;

-- The on-call address is not shown to clients.
insert into public.academic_private_settings (key, value) values ('alert_email', 'bitdoin0@gmail.com')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Latency histogram upper bounds in ms; the last bucket is open-ended.
create or replace function public.academic_histogram_bounds()
returns integer[]
language sql
immutable
set search_path = ''
as $$ select array[100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000, 10000] $$;

create table if not exists public.academic_client_metrics (
  bucket        timestamptz not null,
  kind          text not null check (kind in ('rpc', 'page')),
  name          varchar(64) not null,
  calls         integer not null default 0,
  client_errors integer not null default 0,
  server_errors integer not null default 0,
  network_errors integer not null default 0,
  sum_ms        bigint not null default 0,
  histogram     integer[] not null default array_fill(0, array[13]),
  primary key (bucket, kind, name)
);

create table if not exists public.academic_server_metrics (
  window_end  timestamptz not null,
  rpc         varchar(64) not null,
  kind        text not null check (kind in ('read', 'write')),
  calls       bigint not null,
  mean_ms     double precision not null,
  p95_est_ms  double precision not null,
  primary key (window_end, rpc)
);

-- Last cumulative pg_stat_statements totals per RPC, to compute deltas.
create table if not exists public.academic_stat_cursor (
  rpc       varchar(64) primary key,
  calls     bigint not null,
  total_ms  double precision not null,
  sumsq_ms  double precision not null,
  taken_at  timestamptz not null default now()
);

alter table public.academic_client_metrics enable row level security;
alter table public.academic_server_metrics enable row level security;
alter table public.academic_stat_cursor enable row level security;
revoke all on public.academic_client_metrics from anon, authenticated;
revoke all on public.academic_server_metrics from anon, authenticated;
revoke all on public.academic_stat_cursor from anon, authenticated;

-- Alerts gain operational kinds and email delivery state.
alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test'
));
alter table public.academic_alerts add column if not exists notified_at timestamptz;
alter table public.academic_alerts add column if not exists notify_attempts smallint not null default 0;
alter table public.academic_alerts add column if not exists notify_error varchar(300);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Reads change nothing; everything else is a write (NFR-002 targets differ).
create or replace function public.academic_rpc_kind(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^academic_(get|list|search|export|can_read|current|is_|mfa_ok|module_enabled|today|engine_version|admin_session|admin_health|support_lookup|support_view_scores)'
      then 'read'
    else 'write'
  end;
$$;

-- Upper bound of the bucket holding the q-th quantile; null without data.
create or replace function public.academic_histogram_quantile(p_histogram integer[], p_q double precision)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_bounds integer[] := public.academic_histogram_bounds();
  v_total bigint := 0;
  v_seen bigint := 0;
  i integer;
begin
  select coalesce(sum(x), 0) into v_total from unnest(p_histogram) as x;
  if v_total = 0 then
    return null;
  end if;
  for i in 1 .. array_length(p_histogram, 1) loop
    v_seen := v_seen + p_histogram[i];
    if v_seen >= ceil(v_total * p_q) then
      return coalesce(v_bounds[i], v_bounds[array_length(v_bounds, 1)] * 2);
    end if;
  end loop;
  return v_bounds[array_length(v_bounds, 1)] * 2;
end;
$$;

-- Element-wise sum, for aggregating histograms.
create or replace function public.academic_histogram_add(p_a integer[], p_b integer[])
returns integer[]
language sql
immutable
set search_path = ''
as $$
  select array_agg(coalesce(p_a[i], 0) + coalesce(p_b[i], 0) order by i)
  from generate_series(1, greatest(coalesce(array_length(p_a, 1), 0), coalesce(array_length(p_b, 1), 0))) as i;
$$;

create or replace aggregate public.academic_histogram_sum(integer[]) (
  sfunc = public.academic_histogram_add,
  stype = integer[],
  initcond = '{0,0,0,0,0,0,0,0,0,0,0,0,0}'
);

-- ─── Client reports ──────────────────────────────────────────────────────────

-- Items: {k: 'rpc'|'page', n: name, ms: 0..120000, s: HTTP-like status (0 =
-- network failure)}. Up to 100 per call. Anything else is refused, so no
-- content can be smuggled in.
create or replace function public.academic_record_metrics(p_items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_bucket timestamptz := date_trunc('minute', now());
  v_bounds integer[] := public.academic_histogram_bounds();
  v_item jsonb;
  v_kind text;
  v_name text;
  v_ms integer;
  v_status integer;
  v_slot integer;
  v_hist integer[];
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 100 then
    perform public.academic_invalid('items', 'Send up to 100 items');
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or exists (select 1 from jsonb_object_keys(v_item) as k where k not in ('k', 'n', 'ms', 's')) then
      perform public.academic_invalid('items', 'Unknown metric field');
    end if;
    v_kind := v_item->>'k';
    v_name := v_item->>'n';
    v_ms := case when jsonb_typeof(v_item->'ms') = 'number' then (v_item->>'ms')::numeric::integer end;
    v_status := case when jsonb_typeof(v_item->'s') = 'number' then (v_item->>'s')::numeric::integer end;
    if v_kind not in ('rpc', 'page')
      or (v_kind = 'rpc' and (v_name is null or v_name !~ '^academic_[a-z_]{1,55}$'))
      or (v_kind = 'page' and v_name is distinct from 'dashboard_summary')
      or v_ms is null or v_ms < 0 or v_ms > 120000
      or (v_kind = 'rpc' and (v_status is null or v_status < 0 or v_status > 599)) then
      perform public.academic_invalid('items', 'Invalid metric');
    end if;

    v_slot := coalesce((select min(i) from generate_subscripts(v_bounds, 1) as i where v_ms <= v_bounds[i]), array_length(v_bounds, 1) + 1);
    v_hist := array_fill(0, array[13]);
    v_hist[v_slot] := 1;

    insert into public.academic_client_metrics as m (bucket, kind, name, calls, client_errors, server_errors, network_errors, sum_ms, histogram)
    values (v_bucket, v_kind, v_name, 1,
      case when v_status between 400 and 499 then 1 else 0 end,
      case when v_status >= 500 then 1 else 0 end,
      case when v_kind = 'rpc' and v_status = 0 then 1 else 0 end,
      v_ms, v_hist)
    on conflict (bucket, kind, name) do update set
      calls = m.calls + 1,
      client_errors = m.client_errors + excluded.client_errors,
      server_errors = m.server_errors + excluded.server_errors,
      network_errors = m.network_errors + excluded.network_errors,
      sum_ms = m.sum_ms + excluded.sum_ms,
      histogram = public.academic_histogram_add(m.histogram, excluded.histogram);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('accepted', v_count);
end;
$$;

-- ─── Server time (pg_stat_statements) ────────────────────────────────────────

create or replace function public.academic_collect_server_metrics()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_row record;
  v_prev public.academic_stat_cursor;
  v_calls bigint;
  v_total double precision;
  v_sumsq double precision;
  v_mean double precision;
  v_sd double precision;
  v_count integer := 0;
begin
  if to_regclass('extensions.pg_stat_statements') is null then
    return 0;
  end if;

  for v_row in
    execute $q$
      select substring(query from '"public"\."(academic_[a-z_]+)"\(') as rpc,
             sum(calls)::bigint as calls,
             sum(total_exec_time) as total_ms,
             -- per statement: calls * (sd^2 + mean^2) = sum of squares
             sum(calls * (stddev_exec_time ^ 2 + mean_exec_time ^ 2)) as sumsq_ms
      from extensions.pg_stat_statements
      where query like 'WITH pgrst_source AS%' and query ~ '"public"\."academic_[a-z_]+"\('
        and query !~ '"academic_record_metrics"'
      group by 1
    $q$
  loop
    select * into v_prev from public.academic_stat_cursor where rpc = v_row.rpc;
    if v_prev.rpc is null or v_row.calls < v_prev.calls then
      -- First sight, or statistics were reset: start counting from here.
      v_calls := case when v_prev.rpc is null then 0 else v_row.calls end;
      v_total := case when v_prev.rpc is null then 0 else v_row.total_ms end;
      v_sumsq := case when v_prev.rpc is null then 0 else v_row.sumsq_ms end;
    else
      v_calls := v_row.calls - v_prev.calls;
      v_total := v_row.total_ms - v_prev.total_ms;
      v_sumsq := v_row.sumsq_ms - v_prev.sumsq_ms;
    end if;

    if v_calls > 0 then
      v_mean := v_total / v_calls;
      v_sd := sqrt(greatest(v_sumsq / v_calls - v_mean ^ 2, 0));
      insert into public.academic_server_metrics (window_end, rpc, kind, calls, mean_ms, p95_est_ms)
      values (v_now, v_row.rpc, public.academic_rpc_kind(v_row.rpc), v_calls, v_mean, v_mean + 1.645 * v_sd)
      on conflict do nothing;
      v_count := v_count + 1;
    end if;

    insert into public.academic_stat_cursor (rpc, calls, total_ms, sumsq_ms, taken_at)
    values (v_row.rpc, v_row.calls, v_row.total_ms, v_row.sumsq_ms, v_now)
    on conflict (rpc) do update set calls = excluded.calls, total_ms = excluded.total_ms,
      sumsq_ms = excluded.sumsq_ms, taken_at = excluded.taken_at;
  end loop;
  return v_count;
end;
$$;

-- ─── Measurements ────────────────────────────────────────────────────────────

-- Service levels over a period: server p95 by kind (worst RPC with enough
-- calls), availability and dashboard p75 from client reports.
create or replace function public.academic_slo_window(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select coalesce((public.academic_setting('slo_targets')->>'min_calls')::integer, 20) as min_calls
  ),
  server as (
    select kind, rpc, sum(calls) as calls,
           sum(calls * mean_ms) / nullif(sum(calls), 0) as mean_ms,
           max(p95_est_ms) as p95_ms
    from public.academic_server_metrics
    where window_end > p_from and window_end <= p_to
    group by kind, rpc
  ),
  rpc as (
    select coalesce(sum(calls), 0) as calls, coalesce(sum(server_errors), 0) as server_errors,
           coalesce(sum(client_errors), 0) as client_errors, coalesce(sum(network_errors), 0) as network_errors
    from public.academic_client_metrics
    where kind = 'rpc' and bucket >= p_from and bucket < p_to
  ),
  page as (
    select coalesce(sum(calls), 0) as calls, public.academic_histogram_sum(histogram) as histogram
    from public.academic_client_metrics
    where kind = 'page' and name = 'dashboard_summary' and bucket >= p_from and bucket < p_to
  )
  select jsonb_build_object(
    'read_calls', coalesce((select sum(calls) from server where kind = 'read'), 0),
    'read_p95_ms', (select round(max(p95_ms)) from server, cfg where kind = 'read' and calls >= cfg.min_calls),
    'write_calls', coalesce((select sum(calls) from server where kind = 'write'), 0),
    'write_p95_ms', (select round(max(p95_ms)) from server, cfg where kind = 'write' and calls >= cfg.min_calls),
    'slowest', (select jsonb_agg(jsonb_build_object('rpc', rpc, 'kind', kind, 'calls', calls, 'p95_ms', round(p95_ms)) order by p95_ms desc)
                from (select * from server order by p95_ms desc limit 5) s),
    'calls', (select calls from rpc),
    'server_errors', (select server_errors from rpc),
    'client_errors', (select client_errors from rpc),
    'network_errors', (select network_errors from rpc),
    'availability', (select case when calls > 0 then round(1 - server_errors::numeric / calls, 5) end from rpc),
    'dashboard_loads', (select calls from page),
    'dashboard_p75_ms', (select public.academic_histogram_quantile(histogram, 0.75) from page)
  );
$$;

-- ─── Health check (hourly) ───────────────────────────────────────────────────

create or replace function public.academic_raise_alert(p_kind text, p_details jsonb)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.academic_alerts where kind = p_kind and actor_user_id is null
             and created_at > now() - interval '24 hours' and p_kind <> 'test') then
    return false;
  end if;
  insert into public.academic_alerts (kind, details) values (p_kind, p_details);
  return true;
end;
$$;

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

  -- Retention: metrics are kept for 90 days.
  delete from public.academic_client_metrics where bucket < now() - interval '90 days';
  delete from public.academic_server_metrics where window_end < now() - interval '90 days';

  return jsonb_build_object('raised', to_jsonb(v_raised), 'hour', v_hour, 'day', v_day);
end;
$$;

-- ─── Alert email delivery (service role, academic-alerts function) ───────────

create or replace function public.academic_claim_alert_emails(p_limit integer default 20)
returns table (id uuid, kind text, details jsonb, created_at timestamptz, recipient text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_to text := (select value from public.academic_private_settings where key = 'alert_email');
begin
  if coalesce(v_to, '') = '' then
    return;
  end if;
  return query
  update public.academic_alerts a
  set notify_attempts = a.notify_attempts + 1
  where a.id in (
    select x.id from public.academic_alerts x
    where x.notified_at is null and x.notify_attempts < 5
    order by x.created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update skip locked
  )
  returning a.id, a.kind, a.details, a.created_at, v_to;
end;
$$;

create or replace function public.academic_complete_alert_emails(p_sent uuid[], p_failed uuid[], p_error text default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.academic_alerts set notified_at = now(), notify_error = null where id = any (coalesce(p_sent, '{}'));
  update public.academic_alerts set notify_error = left(p_error, 300) where id = any (coalesce(p_failed, '{}'));
$$;

-- ─── Admin ───────────────────────────────────────────────────────────────────

-- The Health tab: targets, hourly series for 48 h, jobs, alert counts.
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
    'pending_push', (select count(*) from public.academic_notifications where channel = 'push' and state in ('pending', 'sending'))
  );
end;
$$;

-- Acceptance test for the on-call channel: a 'test' alert goes out with the next delivery.
create or replace function public.academic_admin_test_alert()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_id uuid;
begin
  insert into public.academic_alerts (kind, details, actor_user_id)
  values ('test', jsonb_build_object('requested_at', now()), v_admin)
  returning id into v_id;
  perform public.academic_audit('admin.test_alert', 'alert', v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_histogram_bounds() from public, anon, authenticated;
revoke all on function public.academic_rpc_kind(text) from public, anon, authenticated;
revoke all on function public.academic_histogram_quantile(integer[], double precision) from public, anon, authenticated;
revoke all on function public.academic_histogram_add(integer[], integer[]) from public, anon, authenticated;
revoke all on function public.academic_histogram_sum(integer[]) from public, anon, authenticated;
revoke all on function public.academic_collect_server_metrics() from public, anon, authenticated;
revoke all on function public.academic_slo_window(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.academic_raise_alert(text, jsonb) from public, anon, authenticated;
revoke all on function public.academic_check_health() from public, anon, authenticated;
revoke all on function public.academic_claim_alert_emails(integer) from public, anon, authenticated;
revoke all on function public.academic_complete_alert_emails(uuid[], uuid[], text) from public, anon, authenticated;
grant execute on function public.academic_claim_alert_emails(integer) to service_role;
grant execute on function public.academic_complete_alert_emails(uuid[], uuid[], text) to service_role;

do $$
declare
  f text;
begin
  foreach f in array array['academic_record_metrics(jsonb)', 'academic_admin_health()', 'academic_admin_test_alert()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- ─── Schedules ───────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-collect-metrics';
select cron.schedule('academic-collect-metrics', '*/5 * * * *', $$select public.academic_collect_server_metrics();$$);

select cron.unschedule(jobid) from cron.job where jobname = 'academic-health-check';
select cron.schedule('academic-health-check', '10 * * * *', $$select public.academic_check_health();$$);

select cron.unschedule(jobid) from cron.job where jobname = 'academic-alert-emails';
select cron.schedule(
  'academic-alert-emails',
  '*/5 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/academic-alerts',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"deliver"}'::jsonb,
    timeout_milliseconds := 30000
  );$$
);
