alter table public.premium_weekly_content_runs
  drop constraint if exists premium_weekly_content_runs_status_check;

alter table public.premium_weekly_content_runs
  add constraint premium_weekly_content_runs_status_check
  check (status in ('GENERATING', 'READY', 'FAILED', 'CANCELLED'));
