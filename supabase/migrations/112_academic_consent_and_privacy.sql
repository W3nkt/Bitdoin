-- My Scores — consent, export and deletion services (BE-006, #20).
--
-- Consent (PRIV-001/003): purpose-specific, versioned and append-only. Phase 1
-- offers module_processing (required to store anything), email and push.
-- OCR, AI, guardian sharing, research and photo purposes stay closed until
-- their phases. Interim policy OD-07: every supported age band self-consents;
-- the whole module stays behind my_scores_enabled until legal sign-off.
--
-- Export (PRIV-004): academic_export_my_data() returns everything the module
-- holds about the caller; the client writes profile.json, scores.csv,
-- revisions.csv and consents.json (Docs/my-scores/export-format.md).
--
-- Deletion (PRIV-005): a request needs a recent sign-in, starts a 14-day
-- cancellable grace period, and is carried out by a daily purge job. Scope
-- 'scores' removes score records only; 'profile' removes the whole module
-- profile. Consent evidence and minimised audit events are retained.
--
-- Privacy rights keep working while the module is switched off.

-- ─── Settings ────────────────────────────────────────────────────────────────

insert into public.academic_settings (key, value, description) values
  ('consent_purposes_enabled', '["module_processing", "email", "push"]', 'Consent purposes students can grant in this phase.'),
  ('deletion_grace_days', '14', 'Days a deletion request can be cancelled before it is carried out (PRIV-005).'),
  ('reauth_max_age_minutes', '15', 'How recent a sign-in must be to request deletion.')
on conflict (key) do nothing;

-- ─── Profile deletion scope ──────────────────────────────────────────────────

alter table public.academic_student_profiles
  add column if not exists deletion_scope text check (deletion_scope in ('scores', 'profile'));

alter table public.academic_student_profiles
  drop constraint if exists academic_student_profiles_deletion_scope_check1;
alter table public.academic_student_profiles
  add constraint academic_student_profiles_deletion_scope_check1
  check ((deletion_scope is not null) = (status = 'deletion_pending'));

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.academic_settings where key = p_key;
$$;

create or replace function public.academic_invalid(p_field text, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.academic_raise('VALIDATION_FAILED', 400, p_reason, jsonb_build_object('field', p_field));
end;
$$;

-- The caller's own profile for privacy actions: no feature-flag check and no
-- status check, so export, consent withdrawal and deletion always work.
create or replace function public.academic_own_profile(p_lock boolean default false)
returns public.academic_student_profiles
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_profile public.academic_student_profiles;
begin
  if p_lock then
    select * into v_profile from public.academic_student_profiles where user_id = v_user for update;
  else
    select * into v_profile from public.academic_student_profiles where user_id = v_user;
  end if;
  if v_profile.id is null then
    perform public.academic_raise('PROFILE_REQUIRED', 404, 'No My Scores profile exists for this account');
  end if;
  return v_profile;
end;
$$;

-- Supabase JWTs carry amr[].timestamp = when the user actually signed in;
-- refreshing a session does not move it.
create or replace function public.academic_require_recent_sign_in()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_signed_in_at timestamptz;
  v_max_age integer := coalesce((public.academic_setting('reauth_max_age_minutes') #>> '{}')::integer, 15);
begin
  select to_timestamp(max((entry->>'timestamp')::bigint)) into v_signed_in_at
  from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as entry
  where entry ? 'timestamp';

  if v_signed_in_at is null or v_signed_in_at < now() - make_interval(mins => v_max_age) then
    perform public.academic_raise('REAUTH_REQUIRED', 401, 'Sign in again to confirm',
      jsonb_build_object('max_age_minutes', v_max_age));
  end if;
end;
$$;

-- Records consent for one purpose. Re-acknowledging a newer notice version
-- closes the old record and opens a new one; the same version is a no-op.
create or replace function public.academic_record_consent(
  p_profile_id uuid,
  p_purpose text,
  p_notice_version text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_current text := public.academic_setting('consent_notice_version') #>> '{}';
  v_existing public.academic_consent_records;
  v_id uuid;
begin
  if not coalesce(public.academic_setting('consent_purposes_enabled') ? p_purpose, false) then
    perform public.academic_invalid('purpose', 'This consent purpose is not available');
  end if;
  if p_notice_version is distinct from v_current then
    perform public.academic_raise('NOTICE_OUTDATED', 409, 'Read and accept the current privacy notice',
      jsonb_build_object('notice_version', v_current));
  end if;

  select * into v_existing from public.academic_consent_records
  where student_profile_id = p_profile_id and purpose = p_purpose and withdrawn_at is null
  for update;

  if v_existing.id is not null and v_existing.notice_version = v_current then
    return v_existing.id;
  end if;
  if v_existing.id is not null then
    update public.academic_consent_records set withdrawn_at = now() where id = v_existing.id;
  end if;

  insert into public.academic_consent_records (
    student_profile_id, grantor_user_id, grantor_role, purpose, scope, notice_version, method
  ) values (
    p_profile_id, (select auth.uid()), 'student', p_purpose, '{}'::jsonb, v_current, 'in_app_checkbox'
  )
  returning id into v_id;

  perform public.academic_audit('consent.grant', 'consent_record', v_id, p_profile_id, 'success', p_purpose);
  return v_id;
end;
$$;

-- ─── Consent RPCs (PRD §27.2 #48) ────────────────────────────────────────────

create or replace function public.academic_list_my_consents()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile();
begin
  return jsonb_build_object(
    'notice_version', public.academic_setting('consent_notice_version') #>> '{}',
    'purposes_available', public.academic_setting('consent_purposes_enabled'),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'purpose', c.purpose, 'notice_version', c.notice_version, 'method', c.method,
        'granted_at', c.granted_at, 'withdrawn_at', c.withdrawn_at
      ) order by c.granted_at desc)
      from public.academic_consent_records c
      where c.student_profile_id = v_profile.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.academic_grant_consent(p_purpose text, p_notice_version text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile(true);
begin
  perform public.academic_record_consent(v_profile.id, p_purpose, p_notice_version);

  if p_purpose = 'module_processing' then
    update public.academic_student_profiles
    set consent_state = 'active',
        status = case when status = 'read_only' then 'active' else status end
    where id = v_profile.id
      and (consent_state <> 'active' or status = 'read_only');
  end if;

  return public.academic_list_my_consents();
end;
$$;

-- Withdrawing module processing stops all further processing: the profile
-- becomes read-only until consent is given again or data is deleted.
create or replace function public.academic_withdraw_consent(p_purpose text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile(true);
  v_id uuid;
begin
  update public.academic_consent_records
  set withdrawn_at = now()
  where student_profile_id = v_profile.id and purpose = p_purpose and withdrawn_at is null
  returning id into v_id;

  if v_id is not null then
    perform public.academic_audit('consent.withdraw', 'consent_record', v_id, v_profile.id, 'success', p_purpose);
  end if;

  if p_purpose = 'module_processing' then
    update public.academic_student_profiles
    set consent_state = 'withdrawn',
        status = case when status = 'active' then 'read_only' else status end
    where id = v_profile.id;
  end if;

  return public.academic_list_my_consents();
end;
$$;

-- ─── Export (PRIV-004) ───────────────────────────────────────────────────────

create or replace function public.academic_export_my_data()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile();
  v_result jsonb;
begin
  select jsonb_build_object(
    'format_version', 1,
    'generated_at', now(),
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'display_name', v_profile.display_name,
      'age_band', v_profile.age_band,
      'province_code', v_profile.province_code,
      'district_code', v_profile.district_code,
      'goals', v_profile.goals,
      'interest_subject_codes', to_jsonb(v_profile.interest_subject_codes),
      'consent_state', v_profile.consent_state,
      'status', v_profile.status,
      'created_at', v_profile.created_at,
      'updated_at', v_profile.updated_at
    ),
    'enrolments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'academic_year', y.code,
        'grade', g.code,
        'school', coalesce(s.name_lo, e.school_free_text),
        'school_verification', e.school_verification,
        'grading_scale', gs.code || ' v' || gv.version,
        'start_period_seq', e.start_period_seq,
        'end_period_seq', e.end_period_seq,
        'is_repeat', e.is_repeat,
        'state', e.state,
        'closed_reason', e.closed_reason,
        'subjects', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', se.id,
            'subject_code', sub.code,
            'name', coalesce(se.custom_name, sub.name_lo),
            'start_period_seq', se.start_period_seq,
            'end_period_seq', se.end_period_seq
          ) order by se.display_order, se.created_at)
          from public.academic_subject_enrolments se
          left join public.academic_subjects sub on sub.id = se.subject_id
          where se.enrolment_id = e.id
        ), '[]'::jsonb)
      ) order by y.start_date, e.created_at)
      from public.academic_enrolments e
      join public.academic_years y on y.id = e.academic_year_id
      join public.academic_grades g on g.id = e.grade_id
      left join public.academic_schools s on s.id = e.school_id
      join public.academic_grading_scale_versions gv on gv.id = e.grading_scale_version_id
      join public.academic_grading_scales gs on gs.id = gv.grading_scale_id
      where e.student_profile_id = v_profile.id
    ), '[]'::jsonb),
    -- One row per score line: the shape of scores.csv.
    'scores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'score_line_id', l.id,
        'academic_year', y.code,
        'grade', g.code,
        'period', p.label_en,
        'period_type', p.period_type,
        'period_start', p.start_date,
        'subject_code', sub.code,
        'subject', coalesce(se.custom_name, sub.name_lo),
        'status', l.status,
        'raw_value', l.raw_value,
        'ordinal_code', l.ordinal_code,
        'grading_scale', gs.code || ' v' || gv.version,
        'normalised_value', l.normalised_value,
        'source', l.source,
        'verification', l.verification,
        'entry_state', en.state,
        'submitted_at', en.submitted_at,
        'edited', exists (select 1 from public.academic_score_revisions r where r.score_line_id = l.id)
      ) order by y.start_date, p.start_date, se.display_order)
      from public.academic_score_lines l
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_enrolments e on e.id = en.enrolment_id
      join public.academic_years y on y.id = e.academic_year_id
      join public.academic_grades g on g.id = e.grade_id
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      join public.academic_subject_enrolments se on se.id = l.subject_enrolment_id
      left join public.academic_subjects sub on sub.id = se.subject_id
      join public.academic_grading_scale_versions gv on gv.id = l.grading_scale_version_id
      join public.academic_grading_scales gs on gs.id = gv.grading_scale_id
      where e.student_profile_id = v_profile.id and l.is_current
    ), '[]'::jsonb),
    'revisions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'score_line_id', r.score_line_id,
        'old_value', coalesce(r.old_value::text, r.old_ordinal_code),
        'new_value', coalesce(r.new_value::text, r.new_ordinal_code),
        'old_status', r.old_status,
        'new_status', r.new_status,
        'changed_by', r.actor_role,
        'reason', r.reason,
        'changed_at', r.created_at
      ) order by r.created_at)
      from public.academic_score_revisions r
      join public.academic_score_lines l on l.id = r.score_line_id
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_enrolments e on e.id = en.enrolment_id
      where e.student_profile_id = v_profile.id
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'purpose', c.purpose, 'notice_version', c.notice_version, 'method', c.method,
        'granted_at', c.granted_at, 'withdrawn_at', c.withdrawn_at
      ) order by c.granted_at)
      from public.academic_consent_records c
      where c.student_profile_id = v_profile.id
    ), '[]'::jsonb)
  ) into v_result;

  perform public.academic_audit('privacy.export', 'student_profile', v_profile.id, v_profile.id);
  return v_result;
end;
$$;

-- ─── Deletion (PRIV-005) ─────────────────────────────────────────────────────

create or replace function public.academic_deletion_status(p_profile public.academic_student_profiles)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', p_profile.status,
    'deletion_scope', p_profile.deletion_scope,
    'deletion_requested_at', p_profile.deletion_requested_at,
    'deletion_scheduled_for', p_profile.deletion_requested_at
      + make_interval(days => coalesce((public.academic_setting('deletion_grace_days') #>> '{}')::integer, 14))
  );
$$;

create or replace function public.academic_request_deletion(p_scope text default 'profile')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile(true);
begin
  if p_scope is null or p_scope not in ('scores', 'profile') then
    perform public.academic_invalid('scope', 'Choose scores or profile');
  end if;

  -- Idempotent: a repeated request keeps the original schedule.
  if v_profile.status = 'deletion_pending' then
    return public.academic_deletion_status(v_profile);
  end if;

  perform public.academic_require_recent_sign_in();

  update public.academic_student_profiles
  set status = 'deletion_pending', deletion_requested_at = now(), deletion_scope = p_scope
  where id = v_profile.id
  returning * into v_profile;

  perform public.academic_audit('privacy.deletion_request', 'student_profile', v_profile.id, v_profile.id, 'success', p_scope);
  return public.academic_deletion_status(v_profile);
end;
$$;

create or replace function public.academic_cancel_deletion()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_own_profile(true);
begin
  if v_profile.status <> 'deletion_pending' then
    return public.academic_deletion_status(v_profile);
  end if;

  update public.academic_student_profiles
  set status = case when consent_state = 'active' then 'active' else 'read_only' end,
      deletion_requested_at = null,
      deletion_scope = null
  where id = v_profile.id
  returning * into v_profile;

  perform public.academic_audit('privacy.deletion_cancel', 'student_profile', v_profile.id, v_profile.id);
  return public.academic_deletion_status(v_profile);
end;
$$;

-- Carries out deletions whose grace period has ended. Idempotent; run by
-- pg_cron (and callable by the service role). Returns how many ran.
create or replace function public.academic_purge_due_deletions()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grace integer := coalesce((public.academic_setting('deletion_grace_days') #>> '{}')::integer, 14);
  v_profile public.academic_student_profiles;
  v_count integer := 0;
begin
  for v_profile in
    select * from public.academic_student_profiles
    where status = 'deletion_pending'
      and deletion_requested_at <= now() - make_interval(days => v_grace)
    for update skip locked
  loop
    if v_profile.deletion_scope = 'scores' then
      delete from public.academic_score_entries
      where enrolment_id in (select id from public.academic_enrolments where student_profile_id = v_profile.id);
      update public.academic_student_profiles
      set status = case when consent_state = 'active' then 'active' else 'read_only' end,
          deletion_requested_at = null,
          deletion_scope = null
      where id = v_profile.id;
    else
      -- Cascades to enrolments, subjects, scores and revisions. Consent
      -- records keep their evidence with the profile link set to null.
      delete from public.academic_student_profiles where id = v_profile.id;
    end if;

    perform public.academic_audit('privacy.purge', 'student_profile', v_profile.id, v_profile.id, 'success', v_profile.deletion_scope);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_setting(text) from public, anon, authenticated;
revoke all on function public.academic_invalid(text, text) from public, anon, authenticated;
revoke all on function public.academic_own_profile(boolean) from public, anon, authenticated;
revoke all on function public.academic_require_recent_sign_in() from public, anon, authenticated;
revoke all on function public.academic_record_consent(uuid, text, text) from public, anon, authenticated;
revoke all on function public.academic_deletion_status(public.academic_student_profiles) from public, anon, authenticated;
revoke all on function public.academic_purge_due_deletions() from public, anon, authenticated;
grant execute on function public.academic_purge_due_deletions() to service_role;

revoke all on function public.academic_list_my_consents() from public, anon;
revoke all on function public.academic_grant_consent(text, text) from public, anon;
revoke all on function public.academic_withdraw_consent(text) from public, anon;
revoke all on function public.academic_export_my_data() from public, anon;
revoke all on function public.academic_request_deletion(text) from public, anon;
revoke all on function public.academic_cancel_deletion() from public, anon;
grant execute on function public.academic_list_my_consents() to authenticated;
grant execute on function public.academic_grant_consent(text, text) to authenticated;
grant execute on function public.academic_withdraw_consent(text) to authenticated;
grant execute on function public.academic_export_my_data() to authenticated;
grant execute on function public.academic_request_deletion(text) to authenticated;
grant execute on function public.academic_cancel_deletion() to authenticated;

-- ─── Daily purge ─────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-purge-deletions';
select cron.schedule(
  'academic-purge-deletions',
  '15 20 * * *', -- 03:15 Asia/Vientiane
  $$select public.academic_purge_due_deletions();$$
);
