-- My Scores — score-book scanning: photo list, deletion on withdrawal, the
-- hourly storage purge and the OCR quality view (P2-OCR #48: OCR-010,
-- OCR-011, ADMIN-008). Scanning itself stays off (ocr_enabled).

-- ─── Withdrawing photo-processing consent deletes the photos (OCR-011) ───────

create or replace function public.academic_ocr_consent_withdrawn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.academic_ocr_jobs
  set image_delete_requested_at = coalesce(image_delete_requested_at, now()), keep_photo = false
  where student_profile_id = new.student_profile_id and storage_path is not null and image_deleted_at is null;
  return new;
end;
$$;

drop trigger if exists academic_ocr_consent_withdrawn on public.academic_consent_records;
create trigger academic_ocr_consent_withdrawn
after update of withdrawn_at on public.academic_consent_records
for each row
when (new.purpose = 'ocr_processing' and new.withdrawn_at is not null and old.withdrawn_at is null)
execute function public.academic_ocr_consent_withdrawn();

-- ─── The student's stored photos (OCR-011: delete any image now) ─────────────

create or replace function public.academic_list_ocr_photos()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_days integer := public.academic_ocr_rule('retention_days')::integer;
begin
  return jsonb_build_object('photos', coalesce((
    select jsonb_agg(jsonb_build_object(
      'job_id', j.id, 'created_at', j.created_at, 'status', j.status, 'keep_photo', j.keep_photo,
      'delete_after', case when j.keep_photo then null else coalesce(j.settled_at, j.created_at) + make_interval(days => v_days) end
    ) order by j.created_at desc)
    from public.academic_ocr_jobs j
    where j.student_profile_id = v_profile.id and j.storage_path is not null
      and j.image_deleted_at is null and j.image_delete_requested_at is null
  ), '[]'::jsonb));
end;
$$;

-- ─── OCR quality (ADMIN-008) ─────────────────────────────────────────────────
-- Daily jobs, failures, latency and cost by model and prompt version; field
-- corrections by subject; alerts when the last 7 days cross a threshold.
-- Reused duplicates are left out (no model call).

insert into public.academic_settings (key, value, description) values
  ('ocr_alerts', '{"correction_rate": 0.15, "failure_rate": 0.2, "min_fields": 20, "min_jobs": 10}',
   'P2-OCR: OCR quality alert thresholds over the last 7 days (ADMIN-008).')
on conflict (key) do nothing;

create or replace function public.academic_admin_ocr_quality(p_days integer default 30)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 180);
  v_alerts jsonb := coalesce(public.academic_setting('ocr_alerts'), '{}'::jsonb);
  v_result jsonb;
begin
  with jobs as (
    select j.*, (j.created_at at time zone 'Asia/Vientiane')::date as day
    from public.academic_ocr_jobs j
    where j.created_at > now() - make_interval(days => v_days) and j.duplicate_of is null and j.status <> 'awaiting_upload'
  ),
  fields as (
    select c.created_at, j.model_id, f,
           coalesce(s.code, 'CUSTOM') as subject_code
    from public.academic_ocr_confirmations c
    join public.academic_ocr_jobs j on j.id = c.job_id
    cross join jsonb_array_elements(c.fields) f
    left join public.academic_subject_enrolments se on se.id = (f->>'subject_enrolment_id')::uuid
    left join public.academic_subjects s on s.id = se.subject_id
    where c.created_at > now() - make_interval(days => v_days)
  ),
  recent_jobs as (select * from jobs where created_at > now() - interval '7 days'),
  recent_fields as (select * from fields where created_at > now() - interval '7 days'),
  week as (
    select
      (select count(*) from recent_jobs) as jobs,
      (select count(*) from recent_jobs where status = 'failed' and error_code is distinct from 'abandoned') as failed,
      (select count(*) from recent_fields) as fields,
      (select count(*) from recent_fields where coalesce((f->>'edited')::boolean, false)) as edited
  )
  select jsonb_build_object(
    'days', v_days,
    'daily', coalesce((
      select jsonb_agg(d order by d->>'day' desc, d->>'model_id') from (
        select jsonb_build_object(
          'day', day, 'model_id', coalesce(model_id, 'unknown'), 'prompt_version', coalesce(prompt_version, 'unknown'),
          'jobs', count(*),
          'failed', count(*) filter (where status = 'failed' and error_code is distinct from 'abandoned'),
          'abandoned', count(*) filter (where error_code = 'abandoned'),
          'confirmed', count(*) filter (where status = 'confirmed'),
          'latency_p50_ms', round(percentile_cont(0.5) within group (order by latency_ms)),
          'latency_p95_ms', round(percentile_cont(0.95) within group (order by latency_ms)),
          'cost_usd', round(coalesce(sum(cost_usd), 0), 4)
        ) as d
        from jobs group by day, model_id, prompt_version
      ) x
    ), '[]'::jsonb),
    'errors', coalesce((
      select jsonb_agg(jsonb_build_object('error_code', error_code, 'count', n) order by n desc)
      from (select error_code, count(*) as n from jobs where status = 'failed' group by error_code) e
    ), '[]'::jsonb),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('subject_code', subject_code, 'fields', n, 'edited', edited,
                                          'correction_rate', round(edited::numeric / n, 3)) order by n desc)
      from (select subject_code, count(*) as n, count(*) filter (where coalesce((f->>'edited')::boolean, false)) as edited
            from fields group by subject_code) s
    ), '[]'::jsonb),
    'last_7_days', (
      select jsonb_build_object(
        'jobs', jobs, 'failed', failed, 'fields', fields, 'edited', edited,
        'failure_rate', case when jobs > 0 then round(failed::numeric / jobs, 3) end,
        'correction_rate', case when fields > 0 then round(edited::numeric / fields, 3) end,
        'alerts', to_jsonb(array_remove(array[
          case when fields >= coalesce((v_alerts->>'min_fields')::int, 20)
                and edited::numeric / fields > coalesce((v_alerts->>'correction_rate')::numeric, 0.15) then 'correction_rate' end,
          case when jobs >= coalesce((v_alerts->>'min_jobs')::int, 10)
                and failed::numeric / jobs > coalesce((v_alerts->>'failure_rate')::numeric, 0.2) then 'failure_rate' end
        ], null)),
        'thresholds', v_alerts
      ) from week
    )
  ) into v_result;
  return v_result;
end;
$$;

-- ─── Confirm: "Keep my photo" stays on ─────────────────────────────────────
-- Fix to migration 139: confirming another month from the same photo, or a
-- replayed confirmation, no longer turns a kept photo back to 30-day deletion.

create or replace function public.academic_confirm_ocr_job(
  p_job_id uuid, p_period_id uuid, p_lines jsonb, p_fields jsonb, p_time_to_confirm_ms integer default null, p_keep_photo boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs := public.academic_own_ocr_job(p_job_id, true);
  v_result jsonb;
  v_entry uuid;
begin
  if v_job.id is null then
    return public.academic_deny('ocr_job', p_job_id);
  end if;
  if v_job.status not in ('succeeded', 'confirmed') then
    perform public.academic_raise('OCR_NOT_READY', 409, 'This scan has no results to confirm', jsonb_build_object('status', v_job.status));
  end if;
  if jsonb_typeof(p_fields) is distinct from 'array' then
    perform public.academic_invalid('fields', 'The reviewed fields are required');
  end if;

  v_result := public.academic_submit_score_entry(v_job.enrolment_id, p_period_id, p_lines, 'ocr:' || v_job.id || ':' || left(p_period_id::text, 8));
  if v_result ? 'error' then
    return v_result;
  end if;
  v_entry := (v_result->>'id')::uuid;
  if v_entry is null then
    select id into v_entry from public.academic_score_entries where enrolment_id = v_job.enrolment_id and reporting_period_id = p_period_id;
  end if;
  update public.academic_score_entries set source = 'ocr_confirmed' where id = v_entry;
  update public.academic_score_lines set source = 'ocr_confirmed' where score_entry_id = v_entry and is_current;

  insert into public.academic_ocr_confirmations (job_id, reporting_period_id, score_entry_id, fields, edits_count, time_to_confirm_ms)
  values (v_job.id, p_period_id, v_entry, p_fields,
          (select count(*) from jsonb_array_elements(p_fields) f where coalesce((f->>'edited')::boolean, false)), p_time_to_confirm_ms)
  on conflict (job_id, reporting_period_id) do nothing;
  update public.academic_ocr_jobs
  set status = 'confirmed', settled_at = coalesce(settled_at, now()), keep_photo = keep_photo or coalesce(p_keep_photo, false)
  where id = v_job.id;
  perform public.academic_audit('ocr.confirm', 'ocr_job', v_job.id, v_job.student_profile_id);
  return v_result || jsonb_build_object('ocr_job_id', v_job.id);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_ocr_consent_withdrawn() from public, anon, authenticated;
revoke all on function public.academic_list_ocr_photos() from public, anon;
grant execute on function public.academic_list_ocr_photos() to authenticated;
revoke all on function public.academic_admin_ocr_quality(integer) from public, anon;
grant execute on function public.academic_admin_ocr_quality(integer) to authenticated;

-- ─── Hourly storage purge (OCR-011: within 24 h) ─────────────────────────────
-- Idempotent: removes only photos whose time is up or whose deletion was asked for.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-ocr-purge';
select cron.schedule(
  'academic-ocr-purge',
  '17 * * * *',
  $$select net.http_post(
    url := 'https://bzyvzftnfuuxcseuqrnj.supabase.co/functions/v1/academic-ocr',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"purge"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
