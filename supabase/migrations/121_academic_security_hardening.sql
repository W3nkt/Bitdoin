-- My Scores — security review fixes (SEC-001, #35). Findings and evidence:
-- Docs/my-scores/security-review.md
--
-- S-01  Trigger functions were executable by anon/authenticated (Postgres
--       grants EXECUTE to PUBLIC by default). PostgREST cannot call them, but
--       nothing should be callable that does not need to be.
-- S-02  Export did not ask for a fresh sign-in (PRD §29.6 T3 lists export
--       with delete as a sensitive action). It now does, like deletion.
-- S-03  goals.chips was limited in count but not in content. Only the four
--       known chips are accepted now, checked on the table for every path.
-- S-04  Score-entry denials named the period, not the targeted enrolment.

-- ─── S-01 ────────────────────────────────────────────────────────────────────

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'academic\_%' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;

-- ─── S-02 ────────────────────────────────────────────────────────────────────

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
  -- T3: a shared or borrowed phone must not be enough to take a copy.
  perform public.academic_require_recent_sign_in();

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

revoke all on function public.academic_export_my_data() from public, anon;
grant execute on function public.academic_export_my_data() to authenticated;

-- ─── S-03 ────────────────────────────────────────────────────────────────────

alter table public.academic_student_profiles
  drop constraint if exists academic_student_profiles_goals_shape;
alter table public.academic_student_profiles
  add constraint academic_student_profiles_goals_shape check (
    goals is null or (
      (not goals ? 'chips' or (
        jsonb_typeof(goals->'chips') = 'array'
        and jsonb_array_length(goals->'chips') <= 3
        and goals->'chips' <@ '["exams", "university", "weak", "scholarship"]'::jsonb
      ))
      and length(coalesce(goals->>'text', '')) <= 200
    )
  ) not valid;

-- Existing rows are checked too; if any predate the rule the constraint still
-- guards new writes and the review notes say how to clean them up.
do $$
begin
  alter table public.academic_student_profiles validate constraint academic_student_profiles_goals_shape;
exception when check_violation then
  raise notice 'academic_student_profiles_goals_shape: existing rows need review';
end;
$$;

-- ─── S-04 ────────────────────────────────────────────────────────────────────
-- Denials in the three score-entry RPCs named the period even when the
-- enrolment was someone else's, which hid the targeted student from the
-- audit log. Bodies as in migration 114, apart from the denial.

create or replace function public.academic_get_score_entry(p_enrolment_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_found record;
begin
  select * into v_found from public.academic_find_enrolment_period(v_profile.id, p_enrolment_id, p_period_id);
  if (v_found.enrolment).id is null or (v_found.period).id is null then
    -- S-04: name the object the caller could not open.
    return case when (v_found.enrolment).id is null
      then public.academic_deny('enrolment', p_enrolment_id)
      else public.academic_deny('reporting_period', p_period_id) end;
  end if;
  return public.academic_entry_json(v_found.enrolment, v_found.period);
end;
$$;

create or replace function public.academic_save_draft(
  p_enrolment_id uuid,
  p_period_id uuid,
  p_lines jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_found record;
  v_entry public.academic_score_entries;
  v_seq smallint;
begin
  select * into v_found from public.academic_find_enrolment_period(v_profile.id, p_enrolment_id, p_period_id);
  if (v_found.enrolment).id is null or (v_found.period).id is null then
    -- S-04: name the object the caller could not open.
    return case when (v_found.enrolment).id is null
      then public.academic_deny('enrolment', p_enrolment_id)
      else public.academic_deny('reporting_period', p_period_id) end;
  end if;
  v_seq := public.academic_check_period_writable(v_found.enrolment, v_found.period);

  insert into public.academic_score_entries (enrolment_id, reporting_period_id)
  values ((v_found.enrolment).id, (v_found.period).id)
  on conflict (enrolment_id, reporting_period_id) do nothing;
  select * into v_entry from public.academic_score_entries
  where enrolment_id = (v_found.enrolment).id and reporting_period_id = (v_found.period).id
  for update;

  if v_entry.state = 'submitted' then
    perform public.academic_raise('ENTRY_SUBMITTED', 409, 'This period is already saved; edit individual scores instead',
      jsonb_build_object('score_entry_id', v_entry.id, 'version', v_entry.version));
  end if;
  if p_expected_version is not null and p_expected_version <> v_entry.version then
    perform public.academic_raise('VERSION_CONFLICT', 409, 'This draft changed on another device',
      jsonb_build_object('version', v_entry.version));
  end if;

  perform public.academic_write_lines(v_entry, v_found.enrolment, v_seq, p_lines, false);
  -- Bump the entry version so other devices see the draft changed.
  update public.academic_score_entries set source = source where id = v_entry.id;

  return public.academic_entry_json(v_found.enrolment, v_found.period);
end;
$$;

create or replace function public.academic_submit_score_entry(
  p_enrolment_id uuid,
  p_period_id uuid,
  p_lines jsonb,
  p_idempotency_key text,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_found record;
  v_entry public.academic_score_entries;
  v_seq smallint;
  v_key text := nullif(btrim(p_idempotency_key), '');
begin
  if v_key is null or length(v_key) > 64 then
    perform public.academic_invalid('idempotency_key', 'An idempotency key of up to 64 characters is required');
  end if;

  select * into v_found from public.academic_find_enrolment_period(v_profile.id, p_enrolment_id, p_period_id);
  if (v_found.enrolment).id is null or (v_found.period).id is null then
    -- S-04: name the object the caller could not open.
    return case when (v_found.enrolment).id is null
      then public.academic_deny('enrolment', p_enrolment_id)
      else public.academic_deny('reporting_period', p_period_id) end;
  end if;

  -- A retried submit returns the stored result unchanged.
  select * into v_entry from public.academic_score_entries
  where enrolment_id = (v_found.enrolment).id and idempotency_key = v_key and state = 'submitted';
  if v_entry.id is not null then
    return public.academic_entry_json(v_found.enrolment, v_found.period) || jsonb_build_object('replayed', true);
  end if;

  v_seq := public.academic_check_period_writable(v_found.enrolment, v_found.period);

  insert into public.academic_score_entries (enrolment_id, reporting_period_id)
  values ((v_found.enrolment).id, (v_found.period).id)
  on conflict (enrolment_id, reporting_period_id) do nothing;
  select * into v_entry from public.academic_score_entries
  where enrolment_id = (v_found.enrolment).id and reporting_period_id = (v_found.period).id
  for update;

  if v_entry.state = 'submitted' then
    perform public.academic_raise('SCORE_DUPLICATE', 409, 'Scores for this period already exist; open them to edit',
      jsonb_build_object('score_entry_id', v_entry.id, 'version', v_entry.version));
  end if;
  if p_expected_version is not null and p_expected_version <> v_entry.version then
    perform public.academic_raise('VERSION_CONFLICT', 409, 'This entry changed on another device',
      jsonb_build_object('version', v_entry.version));
  end if;

  perform public.academic_write_lines(v_entry, v_found.enrolment, v_seq, p_lines, true);

  update public.academic_score_entries
  set state = 'submitted', submitted_at = now(), source = 'manual', idempotency_key = v_key
  where id = v_entry.id;

  perform public.academic_on_scores_changed((v_found.enrolment).id);
  perform public.academic_audit('score_entry.submit', 'score_entry', v_entry.id, v_profile.id);
  return public.academic_entry_json(v_found.enrolment, v_found.period) || jsonb_build_object('replayed', false);
end;
$$;
