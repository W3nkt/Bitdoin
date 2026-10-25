-- My Scores — score-book scanning: jobs, allowance, duplicates, subject
-- matching, confirmation and retention (P2-OCR #48: OCR-001..012, PRIV-006).
--
-- Off by default (ocr_enabled). Switching on needs, in order: a privacy notice
-- version that names the AI provider (counsel), 'ocr_processing' added to
-- consent_purposes_enabled, the vendor assessment (no training, retention,
-- region) and the QG-3 gate passed on the #9 hold-out set.
--
-- Flow: the client asks for a job (allowance, duplicate check by perceptual
-- hash), then sends the compressed, EXIF-free photo to the academic-ocr Edge
-- Function, which stores it in the private 'academic-ocr' bucket (service role
-- only), extracts with the provider and records the result here. Nothing is
-- saved as a score until the student confirms (OCR-006); confirmed scores
-- carry source = ocr_confirmed and verification = self_reported.
-- Allowance: 10 jobs a month (Vientiane), failed, abandoned and reused-duplicate
-- jobs excluded (OCR-012, decision OD-11/OCR). Images go 30 days after the
-- job is settled unless the student keeps them; any image can be deleted now
-- (OCR-011). Job rows go with the profile; their images are queued for the
-- storage purge first.

insert into public.academic_settings (key, value, description) values
  ('ocr_enabled', 'false', 'P2-OCR: students can scan score-book pages. Needs the notice, consent purpose, vendor assessment and QG-3 first.'),
  ('ocr_rules', '{"monthly_allowance": 10, "timeout_seconds": 60, "clear_threshold": 0.85, "review_threshold": 0.5, "retention_days": 30, "duplicate_distance": 6, "duplicate_days": 90, "subject_fuzzy_threshold": 0.85}',
   'P2-OCR: allowance, timeout, confidence bands, image retention, duplicate detection and subject matching.')
on conflict (key) do nothing;

-- Private bucket; only the Edge Function (service role) reads and writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academic-ocr', 'academic-ocr', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_ocr_jobs (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  enrolment_id       uuid not null references public.academic_enrolments(id) on delete cascade,
  status             text not null default 'awaiting_upload'
                     check (status in ('awaiting_upload', 'processing', 'succeeded', 'failed', 'confirmed', 'discarded')),
  phash              char(16) not null check (phash ~ '^[0-9a-f]{16}$'),
  duplicate_of       uuid references public.academic_ocr_jobs(id) on delete set null,
  storage_path       text,
  image_bytes        integer,
  keep_photo         boolean not null default false,
  image_delete_requested_at timestamptz,
  image_deleted_at   timestamptz,
  model_id           text,
  prompt_version     text,
  extraction         jsonb,
  error_code         text,
  attempts           smallint not null default 0,
  latency_ms         integer,
  cost_usd           numeric(10, 6),
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  completed_at       timestamptz,
  settled_at         timestamptz
);
create index if not exists academic_ocr_jobs_profile_idx on public.academic_ocr_jobs (student_profile_id, created_at desc);

create table if not exists public.academic_ocr_confirmations (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.academic_ocr_jobs(id) on delete cascade,
  reporting_period_id uuid not null references public.academic_reporting_periods(id),
  score_entry_id     uuid references public.academic_score_entries(id) on delete set null,
  -- [{subject_enrolment_id, subject_raw, original_value, original_confidence, confirmed_value, edited}]
  fields             jsonb not null check (jsonb_typeof(fields) = 'array'),
  edits_count        integer not null default 0,
  time_to_confirm_ms integer,
  created_at         timestamptz not null default now(),
  unique (job_id, reporting_period_id)
);

-- Storage paths whose objects the purge must remove (also after a profile is deleted).
create table if not exists public.academic_ocr_storage_trash (
  storage_path text primary key,
  queued_at    timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['academic_ocr_jobs', 'academic_ocr_confirmations', 'academic_ocr_storage_trash'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

create or replace function public.academic_ocr_trash_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.storage_path is not null and old.image_deleted_at is null then
    insert into public.academic_ocr_storage_trash (storage_path) values (old.storage_path) on conflict do nothing;
  end if;
  return old;
end;
$$;

create or replace trigger academic_ocr_jobs_trash_image
  before delete on public.academic_ocr_jobs
  for each row execute function public.academic_ocr_trash_image();

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_ocr_rule(p_key text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.academic_setting('ocr_rules')->>p_key)::numeric,
    case p_key when 'monthly_allowance' then 10 when 'timeout_seconds' then 60 when 'clear_threshold' then 0.85
      when 'review_threshold' then 0.5 when 'retention_days' then 30 when 'duplicate_distance' then 6
      when 'duplicate_days' then 90 else 0.85 end);
$$;

create or replace function public.academic_ocr_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_setting('ocr_enabled') is not distinct from 'true'::jsonb
    and coalesce(public.academic_setting('consent_purposes_enabled') ? 'ocr_processing', false);
$$;

create or replace function public.academic_ocr_has_consent(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academic_consent_records
                 where student_profile_id = p_profile_id and purpose = 'ocr_processing' and withdrawn_at is null);
$$;

-- Jobs that count towards this month's allowance (Vientiane calendar month).
create or replace function public.academic_ocr_used_this_month(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.academic_ocr_jobs
  where student_profile_id = p_profile_id and duplicate_of is null
    and status in ('processing', 'succeeded', 'confirmed', 'discarded')
    and (created_at at time zone 'Asia/Vientiane') >= date_trunc('month', now() at time zone 'Asia/Vientiane');
$$;

-- Lower case, no spaces, punctuation or Lao/Arabic digit differences, for matching.
create or replace function public.academic_ocr_normalise(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(translate(coalesce(p_text, ''), '໐໑໒໓໔໕໖໗໘໙', '0123456789')), '[[:space:][:punct:]]', '', 'g');
$$;

-- Edit distance for short strings (subject names, <= 80 characters).
create or replace function public.academic_ocr_levenshtein(p_a text, p_b text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_prev integer[];
  v_curr integer[];
  i integer;
  j integer;
  la integer := char_length(p_a);
  lb integer := char_length(p_b);
begin
  if la = 0 then return lb; end if;
  if lb = 0 then return la; end if;
  v_prev := array(select generate_series(0, lb));
  for i in 1 .. la loop
    v_curr := array[i];
    for j in 1 .. lb loop
      v_curr := v_curr || least(v_prev[j + 1] + 1, v_curr[j] + 1,
        v_prev[j] + case when substr(p_a, i, 1) = substr(p_b, j, 1) then 0 else 1 end);
    end loop;
    v_prev := v_curr;
  end loop;
  return v_prev[lb + 1];
end;
$$;

-- OCR-005: an extracted subject name -> the student's subject in this school
-- year. Exact name or alias (school's first, then national) = 1.0; normalised
-- fuzzy similarity >= threshold = suggested; otherwise none ("Choose subject").
-- Subjects are never created from OCR text.
create or replace function public.academic_ocr_match_subject(p_enrolment_id uuid, p_text text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_norm text := public.academic_ocr_normalise(p_text);
  v_school uuid;
  v_best record;
begin
  if v_norm = '' then
    return null;
  end if;
  select school_id into v_school from public.academic_enrolments where id = p_enrolment_id;

  with candidates as (
    select se.id as subject_enrolment_id, s.code, public.academic_ocr_normalise(n.label) as norm, n.school_rank
    from public.academic_subject_enrolments se
    left join public.academic_subjects s on s.id = se.subject_id
    cross join lateral (
      select coalesce(se.custom_name, s.name_lo) as label, 0 as school_rank
      union all select s.name_en, 0 where s.id is not null
      union all select se.custom_name, 0 where se.custom_name is not null
      union all select a.alias_text, case when a.school_id = v_school then 0 else 1 end
      from public.academic_subject_aliases a where a.subject_id = s.id and (a.school_id is null or a.school_id = v_school)
    ) n
    where se.enrolment_id = p_enrolment_id and n.label is not null
  )
  select c.subject_enrolment_id, c.code,
         case when c.norm = v_norm then 1.0
              else 1.0 - public.academic_ocr_levenshtein(c.norm, v_norm)::numeric / greatest(char_length(c.norm), char_length(v_norm)) end as score,
         c.norm = v_norm as exact
  into v_best
  from candidates c
  where c.norm <> ''
  order by score desc, c.school_rank, c.code nulls last
  limit 1;

  if v_best.subject_enrolment_id is null or v_best.score < public.academic_ocr_rule('subject_fuzzy_threshold') then
    return jsonb_build_object('subject_enrolment_id', null, 'method', 'none', 'confidence', coalesce(round(v_best.score, 2), 0));
  end if;
  return jsonb_build_object('subject_enrolment_id', v_best.subject_enrolment_id, 'subject_code', v_best.code,
    'method', case when v_best.exact then 'alias_exact' else 'alias_fuzzy' end, 'confidence', round(v_best.score, 2));
end;
$$;

-- The caller's job, or null (callers deny with a 404).
create or replace function public.academic_own_ocr_job(p_job_id uuid, p_for_write boolean)
returns public.academic_ocr_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(p_for_write);
  v_job public.academic_ocr_jobs;
begin
  select * into v_job from public.academic_ocr_jobs where id = p_job_id and student_profile_id = v_profile.id;
  return v_job;
end;
$$;

create or replace function public.academic_ocr_job_json(p_job public.academic_ocr_jobs)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'job_id', p_job.id, 'status', p_job.status, 'enrolment_id', p_job.enrolment_id, 'created_at', p_job.created_at,
    'duplicate_of', p_job.duplicate_of, 'extraction', p_job.extraction, 'error_code', p_job.error_code,
    'keep_photo', p_job.keep_photo, 'has_image', p_job.storage_path is not null and p_job.image_deleted_at is null and p_job.image_delete_requested_at is null,
    'thresholds', jsonb_build_object('clear', public.academic_ocr_rule('clear_threshold'), 'review', public.academic_ocr_rule('review_threshold')),
    'timeout_seconds', public.academic_ocr_rule('timeout_seconds')
  );
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- Whether scanning is offered, consent, and the allowance left this month.
create or replace function public.academic_ocr_status()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_used integer := public.academic_ocr_used_this_month(v_profile.id);
  v_limit integer := public.academic_ocr_rule('monthly_allowance')::integer;
begin
  return jsonb_build_object(
    'available', public.academic_ocr_available(),
    'consent', public.academic_ocr_has_consent(v_profile.id),
    'allowance', jsonb_build_object('limit', v_limit, 'used', v_used, 'remaining', greatest(v_limit - v_used, 0))
  );
end;
$$;

-- OCR-008/012: a job for a photo (perceptual hash from the client). A close
-- match with one of the student's recent results comes back as an offer
-- instead (unless p_ignore_duplicate); the allowance is checked last.
create or replace function public.academic_start_ocr_job(p_enrolment_id uuid, p_phash text, p_ignore_duplicate boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_enrolment public.academic_enrolments;
  v_dup public.academic_ocr_jobs;
  v_job public.academic_ocr_jobs;
begin
  if not public.academic_ocr_available() then
    perform public.academic_raise('OCR_UNAVAILABLE', 404, 'Scanning is not available');
  end if;
  if not public.academic_ocr_has_consent(v_profile.id) then
    perform public.academic_raise('CONSENT_REQUIRED', 403, 'Agree to photo processing first', jsonb_build_object('purpose', 'ocr_processing'));
  end if;
  if p_phash is null or p_phash !~ '^[0-9a-f]{16}$' then
    perform public.academic_invalid('phash', 'A 64-bit hash in hex is required');
  end if;
  select * into v_enrolment from public.academic_enrolments where id = p_enrolment_id and student_profile_id = v_profile.id and state = 'active';
  if v_enrolment.id is null then
    return public.academic_deny('enrolment', p_enrolment_id);
  end if;

  if not coalesce(p_ignore_duplicate, false) then
    select * into v_dup from public.academic_ocr_jobs j
    where j.student_profile_id = v_profile.id and j.status in ('succeeded', 'confirmed') and j.extraction is not null
      and j.created_at > now() - make_interval(days => public.academic_ocr_rule('duplicate_days')::integer)
      and bit_count(('x' || j.phash)::bit(64) # ('x' || p_phash)::bit(64)) <= public.academic_ocr_rule('duplicate_distance')
    order by j.created_at desc limit 1;
    if v_dup.id is not null then
      return jsonb_build_object('duplicate', jsonb_build_object('job_id', v_dup.id, 'created_at', v_dup.created_at));
    end if;
  end if;

  if public.academic_ocr_used_this_month(v_profile.id) >= public.academic_ocr_rule('monthly_allowance') then
    perform public.academic_raise('OCR_ALLOWANCE_USED', 429, 'This month''s scans are used up; typing is always available',
      jsonb_build_object('limit', public.academic_ocr_rule('monthly_allowance')));
  end if;
  insert into public.academic_ocr_jobs (student_profile_id, enrolment_id, phash)
  values (v_profile.id, v_enrolment.id, p_phash) returning * into v_job;
  return jsonb_build_object('job', public.academic_ocr_job_json(v_job));
end;
$$;

-- OCR-008: "Use those results" — a new job carrying the earlier extraction,
-- not counted against the allowance.
create or replace function public.academic_reuse_ocr_job(p_job_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_source public.academic_ocr_jobs := public.academic_own_ocr_job(p_job_id, true);
  v_job public.academic_ocr_jobs;
begin
  if v_source.id is null or v_source.extraction is null or v_source.status not in ('succeeded', 'confirmed') then
    return public.academic_deny('ocr_job', p_job_id);
  end if;
  insert into public.academic_ocr_jobs (student_profile_id, enrolment_id, status, phash, duplicate_of, model_id, prompt_version, extraction, completed_at)
  values (v_source.student_profile_id, v_source.enrolment_id, 'succeeded', v_source.phash, v_source.id, v_source.model_id, v_source.prompt_version, v_source.extraction, now())
  returning * into v_job;
  return jsonb_build_object('job', public.academic_ocr_job_json(v_job));
end;
$$;

create or replace function public.academic_get_ocr_job(p_job_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs := public.academic_own_ocr_job(p_job_id, false);
begin
  if v_job.id is null then
    return public.academic_deny('ocr_job', p_job_id);
  end if;
  -- OCR-009: past the timeout a job still processing is failed.
  if v_job.status = 'processing' and v_job.started_at < now() - make_interval(secs => public.academic_ocr_rule('timeout_seconds')::integer) then
    update public.academic_ocr_jobs set status = 'failed', error_code = 'timeout', completed_at = now(), settled_at = now()
    where id = v_job.id returning * into v_job;
  end if;
  return public.academic_ocr_job_json(v_job);
end;
$$;

-- OCR-006: the only way OCR values become scores. The student has reviewed
-- every value; lines are the confirmed scores (same shape as a manual submit),
-- fields the audit of original vs confirmed values (OCR-010).
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
  set status = 'confirmed', settled_at = coalesce(settled_at, now()), keep_photo = coalesce(p_keep_photo, false)
  where id = v_job.id;
  perform public.academic_audit('ocr.confirm', 'ocr_job', v_job.id, v_job.student_profile_id);
  return v_result || jsonb_build_object('ocr_job_id', v_job.id);
end;
$$;

-- "Type scores instead" or abandoning a result: nothing is saved.
create or replace function public.academic_discard_ocr_job(p_job_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs := public.academic_own_ocr_job(p_job_id, true);
begin
  if v_job.id is null then
    return public.academic_deny('ocr_job', p_job_id);
  end if;
  if v_job.status in ('awaiting_upload', 'processing', 'succeeded') then
    update public.academic_ocr_jobs set status = case when status = 'succeeded' then 'discarded' else 'failed' end,
      error_code = case when status = 'succeeded' then error_code else 'abandoned' end, settled_at = now()
    where id = v_job.id returning * into v_job;
  end if;
  return public.academic_ocr_job_json(v_job);
end;
$$;

-- OCR-011: delete a photo now (the storage purge removes it within 24 h).
create or replace function public.academic_delete_ocr_image(p_job_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs := public.academic_own_ocr_job(p_job_id, true);
begin
  if v_job.id is null then
    return public.academic_deny('ocr_job', p_job_id);
  end if;
  update public.academic_ocr_jobs set image_delete_requested_at = coalesce(image_delete_requested_at, now()), keep_photo = false
  where id = v_job.id returning * into v_job;
  perform public.academic_audit('ocr.image_delete', 'ocr_job', v_job.id, v_job.student_profile_id);
  return public.academic_ocr_job_json(v_job);
end;
$$;

-- ─── Edge Function (service role) ────────────────────────────────────────────

-- Called with the student's id after their JWT was verified: claims an
-- awaiting job for processing and records where the photo is stored.
create or replace function public.academic_ocr_begin(p_job_id uuid, p_user_id uuid, p_storage_path text, p_image_bytes integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs;
begin
  update public.academic_ocr_jobs j
  set status = 'processing', storage_path = p_storage_path, image_bytes = p_image_bytes, started_at = now(), attempts = attempts + 1
  from public.academic_student_profiles p
  where j.id = p_job_id and p.id = j.student_profile_id and p.user_id = p_user_id and j.status = 'awaiting_upload'
  returning j.* into v_job;
  if v_job.id is null then
    return null;
  end if;
  return jsonb_build_object('job_id', v_job.id, 'enrolment_id', v_job.enrolment_id,
    'scale', (select public.academic_scale_json(e.grading_scale_version_id) from public.academic_enrolments e where e.id = v_job.enrolment_id),
    'subjects', (select coalesce(jsonb_agg(jsonb_build_object('subject_enrolment_id', se.id, 'name_lo', coalesce(se.custom_name, s.name_lo), 'name_en', coalesce(se.custom_name, s.name_en))), '[]'::jsonb)
                 from public.academic_subject_enrolments se left join public.academic_subjects s on s.id = se.subject_id where se.enrolment_id = v_job.enrolment_id));
end;
$$;

-- Stores a schema-validated extraction, adding subject matches (OCR-004/005).
create or replace function public.academic_ocr_complete(p_job_id uuid, p_extraction jsonb, p_model_id text, p_prompt_version text, p_latency_ms integer, p_cost_usd numeric default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_job public.academic_ocr_jobs;
  v_periods jsonb;
begin
  select * into v_job from public.academic_ocr_jobs where id = p_job_id and status = 'processing' for update;
  if v_job.id is null or jsonb_typeof(p_extraction->'periods') is distinct from 'array' then
    return null;
  end if;
  select coalesce(jsonb_agg(p || jsonb_build_object('rows', (
    select coalesce(jsonb_agg(r || jsonb_build_object('subject_match', public.academic_ocr_match_subject(v_job.enrolment_id, r->>'subject_raw')) order by ord), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p->'rows', '[]'::jsonb)) with ordinality as x(r, ord)
  )) order by pord), '[]'::jsonb)
  into v_periods
  from jsonb_array_elements(p_extraction->'periods') with ordinality as y(p, pord);

  update public.academic_ocr_jobs
  set status = 'succeeded', extraction = jsonb_set(p_extraction, '{periods}', v_periods) || jsonb_build_object('job_id', v_job.id),
      model_id = p_model_id, prompt_version = p_prompt_version, latency_ms = p_latency_ms, cost_usd = p_cost_usd, completed_at = now()
  where id = v_job.id returning * into v_job;
  return public.academic_ocr_job_json(v_job);
end;
$$;

create or replace function public.academic_ocr_fail(p_job_id uuid, p_error_code text, p_model_id text default null, p_latency_ms integer default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.academic_ocr_jobs
  set status = 'failed', error_code = left(p_error_code, 60), model_id = coalesce(p_model_id, model_id), latency_ms = p_latency_ms,
      completed_at = now(), settled_at = now()
  where id = p_job_id and status in ('awaiting_upload', 'processing');
$$;

-- OCR-011: storage objects to remove now: deletion requested, retention over
-- (settled more than retention_days ago and not kept), or a job deleted.
create or replace function public.academic_ocr_images_due(p_limit integer default 200)
returns table (storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select storage_path from (
    select j.storage_path, coalesce(j.image_delete_requested_at, j.settled_at) as since from public.academic_ocr_jobs j
    where j.storage_path is not null and j.image_deleted_at is null
      and (j.image_delete_requested_at is not null
           or (not j.keep_photo and j.settled_at < now() - make_interval(days => public.academic_ocr_rule('retention_days')::integer)))
    union all
    select t.storage_path, t.queued_at from public.academic_ocr_storage_trash t
  ) due
  order by since limit p_limit;
$$;

create or replace function public.academic_ocr_images_deleted(p_paths text[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.academic_ocr_jobs set image_deleted_at = now() where storage_path = any (p_paths) and image_deleted_at is null;
  get diagnostics v_count = row_count;
  delete from public.academic_ocr_storage_trash where storage_path = any (p_paths);
  return v_count;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_ocr_trash_image()', 'academic_ocr_rule(text)', 'academic_ocr_available()', 'academic_ocr_has_consent(uuid)',
    'academic_ocr_used_this_month(uuid)', 'academic_ocr_normalise(text)', 'academic_ocr_levenshtein(text,text)',
    'academic_ocr_match_subject(uuid,text)', 'academic_own_ocr_job(uuid,boolean)', 'academic_ocr_job_json(public.academic_ocr_jobs)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_ocr_begin(uuid,uuid,text,integer)', 'academic_ocr_complete(uuid,jsonb,text,text,integer,numeric)',
    'academic_ocr_fail(uuid,text,text,integer)', 'academic_ocr_images_due(integer)', 'academic_ocr_images_deleted(text[])'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array[
    'academic_ocr_status()', 'academic_start_ocr_job(uuid,text,boolean)', 'academic_reuse_ocr_job(uuid)', 'academic_get_ocr_job(uuid)',
    'academic_confirm_ocr_job(uuid,uuid,jsonb,jsonb,integer,boolean)', 'academic_discard_ocr_job(uuid)', 'academic_delete_ocr_image(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
