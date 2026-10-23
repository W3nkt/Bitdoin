-- My Scores — score entry API with drafts and revisions (BE-003, #23).
--
--   academic_list_periods(enrolment)                 periods + status (SCORE-002)
--   academic_get_score_entry(enrolment, period)      one period's form (SCORE-009)
--   academic_save_draft(enrolment, period, lines)    partial drafts (SCORE-005)
--   academic_submit_score_entry(enrolment, period,   confirm a period (SCORE-006/009)
--     lines, idempotency_key, expected_version)
--   academic_correct_score_line(line, version, ...)  correction + revision (SCORE-007)
--   academic_get_line_revisions(line)                correction history (SCORE-007)
--   academic_get_history()                           all years (SCORE-010/012)
--
-- A line is {"subject_enrolment_id": ..., "status": "scored" | "missing" |
-- "not_applicable" | "exempt", "value": number or string}. Values are
-- trimmed and Lao digits (໐–໙) are read as 0–9 (SCORE-001). Official term
-- and annual results are entries on term_official / annual_official periods
-- and never mix with monthly ones (SCORE-011). Drafts never count as data.
-- Every by-ID access re-checks ownership; foreign IDs get the 404 envelope.

-- ─── Dates ───────────────────────────────────────────────────────────────────

create or replace function public.academic_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Vientiane')::date;
$$;

-- The current month is taken on Vientiane time rather than the server's UTC date.
create or replace function public.academic_current_period_seq(p_calendar_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select sequence from public.academic_reporting_periods
     where calendar_template_id = p_calendar_id and period_type = 'monthly'
       and public.academic_today() between start_date and end_date
     limit 1),
    case
      when public.academic_today() < (select min(start_date) from public.academic_reporting_periods where calendar_template_id = p_calendar_id)
        then 1::smallint
      else (select max(sequence) from public.academic_reporting_periods where calendar_template_id = p_calendar_id and period_type = 'monthly')
    end,
    1::smallint
  );
$$;

-- ─── Period helpers ──────────────────────────────────────────────────────────

-- The monthly sequence a period belongs to: its own for monthly periods,
-- otherwise the month its end date falls in (term results arrive at term end).
create or replace function public.academic_period_month_seq(p_period public.academic_reporting_periods)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_period.period_type = 'monthly' then p_period.sequence else coalesce(
    (select m.sequence from public.academic_reporting_periods m
     where m.calendar_template_id = p_period.calendar_template_id and m.period_type = 'monthly'
       and p_period.end_date between m.start_date and m.end_date
     limit 1),
    (select max(m.sequence) from public.academic_reporting_periods m
     where m.calendar_template_id = p_period.calendar_template_id and m.period_type = 'monthly'
       and m.start_date <= p_period.end_date),
    1::smallint
  ) end;
$$;

-- Subjects that belong on the form for a period (SCORE-013).
create or replace function public.academic_applicable_subjects(p_enrolment_id uuid, p_month_seq smallint)
returns setof public.academic_subject_enrolments
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.academic_subject_enrolments
  where enrolment_id = p_enrolment_id
    and start_period_seq <= p_month_seq
    and (end_period_seq is null or p_month_seq <= end_period_seq)
  order by display_order, created_at;
$$;

-- Owner's enrolment and a period from its calendar, or nulls.
create or replace function public.academic_find_enrolment_period(
  p_profile_id uuid,
  p_enrolment_id uuid,
  p_period_id uuid,
  out enrolment public.academic_enrolments,
  out period public.academic_reporting_periods
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  select * into enrolment from public.academic_enrolments
  where id = p_enrolment_id and student_profile_id = p_profile_id;
  if enrolment.id is not null and p_period_id is not null then
    select * into period from public.academic_reporting_periods
    where id = p_period_id and calendar_template_id = enrolment.calendar_template_id;
  end if;
end;
$$;

-- Raises unless the period can take scores for this enrolment now.
create or replace function public.academic_check_period_writable(
  p_enrolment public.academic_enrolments,
  p_period public.academic_reporting_periods
)
returns smallint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_seq smallint := public.academic_period_month_seq(p_period);
begin
  if p_enrolment.state = 'closed' then
    perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
  end if;
  if p_period.start_date > public.academic_today() then
    perform public.academic_raise('PERIOD_IN_FUTURE', 400, 'You cannot record a period that has not started',
      jsonb_build_object('field', 'period_id'));
  end if;
  if v_seq < p_enrolment.start_period_seq or (p_enrolment.end_period_seq is not null and v_seq > p_enrolment.end_period_seq) then
    perform public.academic_raise('PERIOD_NOT_IN_ENROLMENT', 400, 'This period is outside this school enrolment',
      jsonb_build_object('field', 'period_id'));
  end if;
  return v_seq;
end;
$$;

-- ─── Value parsing and validation (SCORE-001/003/004) ────────────────────────

-- Returns {"status", "raw_value", "ordinal_code"} or raises with field details.
create or replace function public.academic_parse_line_value(
  p_scale public.academic_grading_scale_versions,
  p_line jsonb,
  p_field text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text := p_line->>'status';
  v_text text;
  v_value numeric;
  v_steps numeric;
begin
  if v_status is null or v_status not in ('scored', 'missing', 'not_applicable', 'exempt') then
    perform public.academic_invalid(p_field || '.status', 'Choose a score or a status');
  end if;
  if v_status <> 'scored' then
    return jsonb_build_object('status', v_status, 'raw_value', null, 'ordinal_code', null);
  end if;

  v_text := btrim(translate(coalesce(p_line->>'value', ''), '໐໑໒໓໔໕໖໗໘໙', '0123456789'));

  if p_scale.scale_family <> 'numeric_linear' then
    if not exists (select 1 from jsonb_array_elements(p_scale.ordinal_levels) as level where level->>'code' = v_text) then
      perform public.academic_raise('SCORE_OUT_OF_RANGE', 400, 'Choose one of the grades on your score book',
        jsonb_build_object('field', p_field || '.value', 'levels', p_scale.ordinal_levels, 'received', v_text));
    end if;
    return jsonb_build_object('status', 'scored', 'raw_value', null, 'ordinal_code', v_text);
  end if;

  if v_text !~ '^[0-9]+(\.[0-9]+)?$' then
    perform public.academic_raise('VALIDATION_FAILED', 400, 'Enter a number',
      jsonb_build_object('field', p_field || '.value', 'received', v_text));
  end if;
  v_value := v_text::numeric;

  if v_value < p_scale.min_value or v_value > p_scale.max_value
    or round(v_value, p_scale.decimals) <> v_value
    or (p_scale.step is not null and (v_value - p_scale.min_value) / p_scale.step <> trunc((v_value - p_scale.min_value) / p_scale.step)) then
    perform public.academic_raise('SCORE_OUT_OF_RANGE', 400,
      'Score must be between ' || trim_scale(p_scale.min_value) || ' and ' || trim_scale(p_scale.max_value)
        || coalesce(' in steps of ' || trim_scale(p_scale.step), ''),
      jsonb_build_object('field', p_field || '.value', 'min', p_scale.min_value, 'max', p_scale.max_value,
        'step', p_scale.step, 'received', v_value));
  end if;

  return jsonb_build_object('status', 'scored', 'raw_value', v_value, 'ordinal_code', null);
end;
$$;

-- Upserts lines for an entry. p_require_all: every applicable subject must
-- be present (submit). Returns the subject_enrolment ids written.
create or replace function public.academic_write_lines(
  p_entry public.academic_score_entries,
  p_enrolment public.academic_enrolments,
  p_month_seq smallint,
  p_lines jsonb,
  p_require_all boolean
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_scale public.academic_grading_scale_versions;
  v_applicable uuid[];
  v_written uuid[] := '{}';
  v_line jsonb;
  v_index integer := 0;
  v_se uuid;
  v_parsed jsonb;
  v_missing uuid[];
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    perform public.academic_invalid('lines', 'Lines must be a list');
  end if;

  select * into v_scale from public.academic_grading_scale_versions where id = p_enrolment.grading_scale_version_id;
  select coalesce(array_agg(id), '{}') into v_applicable from public.academic_applicable_subjects(p_enrolment.id, p_month_seq);

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_index := v_index + 1;
    begin
      v_se := (v_line->>'subject_enrolment_id')::uuid;
    exception when others then
      v_se := null;
    end;
    if v_se is null or not (v_se = any (v_applicable)) then
      perform public.academic_invalid('lines[' || (v_index - 1) || '].subject_enrolment_id', 'This subject is not on this period''s form');
    end if;
    if v_se = any (v_written) then
      perform public.academic_invalid('lines[' || (v_index - 1) || '].subject_enrolment_id', 'This subject is listed twice');
    end if;

    -- Drafts may clear a line the student emptied.
    if not p_require_all and coalesce((v_line->>'clear')::boolean, false) then
      delete from public.academic_score_lines where score_entry_id = p_entry.id and subject_enrolment_id = v_se and is_current;
      v_written := v_written || v_se;
      continue;
    end if;

    v_parsed := public.academic_parse_line_value(v_scale, v_line, 'lines[' || (v_index - 1) || ']');

    insert into public.academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, ordinal_code, status, grading_scale_version_id, source)
    values (p_entry.id, v_se, (v_parsed->>'raw_value')::numeric, v_parsed->>'ordinal_code', v_parsed->>'status', v_scale.id, 'manual')
    on conflict (score_entry_id, subject_enrolment_id) where is_current do update
      set raw_value = excluded.raw_value,
          ordinal_code = excluded.ordinal_code,
          status = excluded.status,
          source = 'manual'
      where public.academic_score_lines.raw_value is distinct from excluded.raw_value
         or public.academic_score_lines.ordinal_code is distinct from excluded.ordinal_code
         or public.academic_score_lines.status is distinct from excluded.status;
    v_written := v_written || v_se;
  end loop;

  if p_require_all then
    select coalesce(array_agg(a), '{}') into v_missing from unnest(v_applicable) as a where not (a = any (v_written));
    if cardinality(v_missing) > 0 then
      perform public.academic_raise('VALIDATION_FAILED', 400, 'Give every subject a score or a status',
        jsonb_build_object('field', 'lines', 'missing_subject_enrolment_ids', to_jsonb(v_missing)));
    end if;
    -- Draft lines for subjects dropped since the draft was saved.
    delete from public.academic_score_lines
    where score_entry_id = p_entry.id and is_current and not (subject_enrolment_id = any (v_applicable));
  end if;

  return v_written;
end;
$$;

-- ─── Read models ─────────────────────────────────────────────────────────────

create or replace function public.academic_period_json(p_period public.academic_reporting_periods)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_period.id,
    'key', to_char(p_period.start_date, 'YYYY-MM'),
    'period_type', p_period.period_type,
    'term_no', p_period.term_no,
    'sequence', p_period.sequence,
    'label_lo', p_period.label_lo,
    'label_en', p_period.label_en,
    'start_date', p_period.start_date,
    'end_date', p_period.end_date
  );
$$;

create or replace function public.academic_scale_json(p_scale_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id, 'code', s.code, 'version', v.version, 'family', v.scale_family,
    'min', v.min_value, 'max', v.max_value, 'step', v.step, 'decimals', v.decimals,
    'pass_mark', v.pass_mark, 'normalisable', v.normalisable, 'levels', v.ordinal_levels
  )
  from public.academic_grading_scale_versions v
  join public.academic_grading_scales s on s.id = v.grading_scale_id
  where v.id = p_scale_version_id;
$$;

-- Every line carries source and verification (SCORE-012) and an edited marker.
create or replace function public.academic_line_json(p_line public.academic_score_lines)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_line.id is null then null else jsonb_build_object(
    'id', p_line.id,
    'status', p_line.status,
    'value', coalesce(to_jsonb(p_line.raw_value), to_jsonb(p_line.ordinal_code)),
    'normalised_value', p_line.normalised_value,
    'grading_scale_version_id', p_line.grading_scale_version_id,
    'source', p_line.source,
    'verification', p_line.verification,
    'edited', exists (select 1 from public.academic_score_revisions r where r.score_line_id = p_line.id),
    'version', p_line.version
  ) end;
$$;

create or replace function public.academic_entry_json(p_enrolment public.academic_enrolments, p_period public.academic_reporting_periods)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_entry public.academic_score_entries;
  v_seq smallint := public.academic_period_month_seq(p_period);
begin
  select * into v_entry from public.academic_score_entries
  where enrolment_id = p_enrolment.id and reporting_period_id = p_period.id;

  return jsonb_build_object(
    'enrolment_id', p_enrolment.id,
    'period', public.academic_period_json(p_period),
    'scale', public.academic_scale_json(p_enrolment.grading_scale_version_id),
    'read_only', p_enrolment.state = 'closed',
    'entry', case when v_entry.id is null then null else jsonb_build_object(
      'id', v_entry.id, 'state', v_entry.state, 'version', v_entry.version,
      'source', v_entry.source, 'submitted_at', v_entry.submitted_at
    ) end,
    -- Subjects on the form, plus any scored subject since dropped.
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'subject_enrolment_id', se.id,
        'code', s.code,
        'name_lo', coalesce(se.custom_name, s.name_lo),
        'name_en', coalesce(se.custom_name, s.name_en),
        'line', public.academic_line_json(l)
      ) order by se.display_order, se.created_at)
      from public.academic_subject_enrolments se
      left join public.academic_subjects s on s.id = se.subject_id
      left join public.academic_score_lines l
        on l.subject_enrolment_id = se.id and l.score_entry_id = v_entry.id and l.is_current
      where se.enrolment_id = p_enrolment.id
        and (
          (se.start_period_seq <= v_seq and (se.end_period_seq is null or v_seq <= se.end_period_seq))
          or l.id is not null
        )
    ), '[]'::jsonb)
  );
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- Periods for the selector: only this enrolment's calendar, future periods
-- disabled, first period without a submitted entry suggested (SCORE-002).
create or replace function public.academic_list_periods(p_enrolment_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_enrolment public.academic_enrolments;
  v_periods jsonb;
begin
  select * into v_enrolment from public.academic_enrolments
  where id = p_enrolment_id and student_profile_id = v_profile.id;
  if v_enrolment.id is null then
    return public.academic_deny('enrolment', p_enrolment_id);
  end if;

  select coalesce(jsonb_agg(public.academic_period_json(p) || jsonb_build_object(
      'state', coalesce(e.state, 'empty'),
      'entry_id', e.id,
      'entry_version', e.version,
      'disabled', p.start_date > public.academic_today()
    ) order by p.period_type <> 'monthly', p.start_date, p.period_type), '[]'::jsonb)
  into v_periods
  from public.academic_reporting_periods p
  left join public.academic_score_entries e on e.reporting_period_id = p.id and e.enrolment_id = v_enrolment.id
  where p.calendar_template_id = v_enrolment.calendar_template_id
    and public.academic_period_month_seq(p) >= v_enrolment.start_period_seq
    and (v_enrolment.end_period_seq is null or public.academic_period_month_seq(p) <= v_enrolment.end_period_seq);

  return jsonb_build_object(
    'enrolment_id', v_enrolment.id,
    'read_only', v_enrolment.state = 'closed',
    'periods', v_periods,
    'suggested_period_id', (
      select (p->>'id')::uuid from jsonb_array_elements(v_periods) as p
      where p->>'period_type' = 'monthly' and p->>'state' <> 'submitted' and not (p->>'disabled')::boolean
      order by p->>'start_date'
      limit 1
    )
  );
end;
$$;

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
    return public.academic_deny('score_entry', p_period_id);
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
    return public.academic_deny('score_entry', p_period_id);
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
    return public.academic_deny('score_entry', p_period_id);
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

  perform public.academic_audit('score_entry.submit', 'score_entry', v_entry.id, v_profile.id);
  return public.academic_entry_json(v_found.enrolment, v_found.period) || jsonb_build_object('replayed', false);
end;
$$;

-- Corrects one submitted score; the old value goes to the revision history.
create or replace function public.academic_correct_score_line(
  p_line_id uuid,
  p_expected_version integer,
  p_line jsonb,
  p_reason text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_line public.academic_score_lines;
  v_entry public.academic_score_entries;
  v_enrolment public.academic_enrolments;
  v_scale public.academic_grading_scale_versions;
  v_parsed jsonb;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select l.* into v_line
  from public.academic_score_lines l
  join public.academic_score_entries se on se.id = l.score_entry_id
  join public.academic_enrolments e on e.id = se.enrolment_id
  where l.id = p_line_id and l.is_current and e.student_profile_id = v_profile.id
  for update of l;
  if v_line.id is null then
    return public.academic_deny('score_line', p_line_id);
  end if;

  select * into v_entry from public.academic_score_entries where id = v_line.score_entry_id;
  select * into v_enrolment from public.academic_enrolments where id = v_entry.enrolment_id;
  if v_enrolment.state = 'closed' then
    perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
  end if;
  if v_entry.state <> 'submitted' then
    perform public.academic_raise('ENTRY_NOT_SUBMITTED', 409, 'Save the draft instead');
  end if;
  if p_expected_version is distinct from v_line.version then
    perform public.academic_raise('VERSION_CONFLICT', 409, 'This score changed elsewhere; reload and try again',
      jsonb_build_object('version', v_line.version));
  end if;
  if v_reason is not null and length(v_reason) > 120 then
    perform public.academic_invalid('reason', 'Reason must be 120 characters or fewer');
  end if;

  select * into v_scale from public.academic_grading_scale_versions where id = v_line.grading_scale_version_id;
  v_parsed := public.academic_parse_line_value(v_scale, p_line, 'line');

  perform set_config('academic.revision_reason', coalesce(v_reason, ''), true);
  update public.academic_score_lines
  set raw_value = (v_parsed->>'raw_value')::numeric,
      ordinal_code = v_parsed->>'ordinal_code',
      status = v_parsed->>'status',
      source = 'manual'
  where id = v_line.id
    and (raw_value is distinct from (v_parsed->>'raw_value')::numeric
         or ordinal_code is distinct from v_parsed->>'ordinal_code'
         or status is distinct from v_parsed->>'status')
  returning * into v_line;
  perform set_config('academic.revision_reason', '', true);

  if v_line.id is null then
    -- Same value as before: nothing to record.
    select * into v_line from public.academic_score_lines where id = p_line_id;
  else
    perform public.academic_audit('score_line.correct', 'score_line', v_line.id, v_profile.id);
  end if;
  return public.academic_line_json(v_line);
end;
$$;

create or replace function public.academic_get_line_revisions(p_line_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  if not exists (
    select 1
    from public.academic_score_lines l
    join public.academic_score_entries se on se.id = l.score_entry_id
    join public.academic_enrolments e on e.id = se.enrolment_id
    where l.id = p_line_id and e.student_profile_id = v_profile.id
  ) then
    return public.academic_deny('score_line', p_line_id);
  end if;

  return jsonb_build_object('score_line_id', p_line_id, 'revisions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'old_value', coalesce(to_jsonb(r.old_value), to_jsonb(r.old_ordinal_code)),
      'new_value', coalesce(to_jsonb(r.new_value), to_jsonb(r.new_ordinal_code)),
      'old_status', r.old_status,
      'new_status', r.new_status,
      'changed_by', r.actor_role,
      'reason', r.reason,
      'source', r.source,
      'changed_at', r.created_at
    ) order by r.created_at desc)
    from public.academic_score_revisions r
    where r.score_line_id = p_line_id
  ), '[]'::jsonb));
end;
$$;

-- History grouped by academic year > term > period (SCORE-010). Includes
-- closed enrolments (read-only) and labels drafts so the UI can hide them.
create or replace function public.academic_get_history()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return jsonb_build_object('enrolments', coalesce((
    select jsonb_agg(jsonb_build_object(
      'enrolment_id', e.id,
      'academic_year', y.code,
      'grade', jsonb_build_object('code', g.code, 'label_lo', g.label_lo, 'label_en', g.label_en),
      'school', jsonb_build_object('id', e.school_id, 'name_lo', coalesce(sc.name_lo, e.school_free_text),
        'name_en', coalesce(sc.name_en, sc.name_lo, e.school_free_text), 'verification', e.school_verification),
      'state', e.state,
      'closed_reason', e.closed_reason,
      'read_only', e.state = 'closed',
      'scale', public.academic_scale_json(e.grading_scale_version_id),
      'terms', coalesce((
        select jsonb_agg(term order by term->>'term_no' nulls last)
        from (
          select jsonb_build_object(
            'term_no', p.term_no,
            'periods', jsonb_agg(public.academic_period_json(p) || jsonb_build_object(
              'entry', jsonb_build_object('id', en.id, 'state', en.state, 'submitted_at', en.submitted_at, 'source', en.source),
              'lines', coalesce((
                select jsonb_agg(jsonb_build_object(
                  'subject_enrolment_id', se.id,
                  'code', s.code,
                  'name_lo', coalesce(se.custom_name, s.name_lo),
                  'name_en', coalesce(se.custom_name, s.name_en),
                  'line', public.academic_line_json(l)
                ) order by se.display_order, se.created_at)
                from public.academic_score_lines l
                join public.academic_subject_enrolments se on se.id = l.subject_enrolment_id
                left join public.academic_subjects s on s.id = se.subject_id
                where l.score_entry_id = en.id and l.is_current
              ), '[]'::jsonb)
            ) order by p.period_type <> 'monthly', p.start_date, p.period_type)
          ) as term
          from public.academic_score_entries en
          join public.academic_reporting_periods p on p.id = en.reporting_period_id
          where en.enrolment_id = e.id
          group by p.term_no
        ) terms
      ), '[]'::jsonb)
    ) order by y.start_date desc, e.start_period_seq desc)
    from public.academic_enrolments e
    join public.academic_years y on y.id = e.academic_year_id
    join public.academic_grades g on g.id = e.grade_id
    left join public.academic_schools sc on sc.id = e.school_id
    where e.student_profile_id = v_profile.id
  ), '[]'::jsonb));
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_today() from public, anon;
grant execute on function public.academic_today() to authenticated;
revoke all on function public.academic_current_period_seq(uuid) from public, anon, authenticated;
revoke all on function public.academic_period_month_seq(public.academic_reporting_periods) from public, anon, authenticated;
revoke all on function public.academic_applicable_subjects(uuid, smallint) from public, anon, authenticated;
revoke all on function public.academic_find_enrolment_period(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.academic_check_period_writable(public.academic_enrolments, public.academic_reporting_periods) from public, anon, authenticated;
revoke all on function public.academic_parse_line_value(public.academic_grading_scale_versions, jsonb, text) from public, anon, authenticated;
revoke all on function public.academic_write_lines(public.academic_score_entries, public.academic_enrolments, smallint, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.academic_period_json(public.academic_reporting_periods) from public, anon, authenticated;
revoke all on function public.academic_scale_json(uuid) from public, anon, authenticated;
revoke all on function public.academic_line_json(public.academic_score_lines) from public, anon, authenticated;
revoke all on function public.academic_entry_json(public.academic_enrolments, public.academic_reporting_periods) from public, anon, authenticated;

revoke all on function public.academic_list_periods(uuid) from public, anon;
revoke all on function public.academic_get_score_entry(uuid, uuid) from public, anon;
revoke all on function public.academic_save_draft(uuid, uuid, jsonb, integer) from public, anon;
revoke all on function public.academic_submit_score_entry(uuid, uuid, jsonb, text, integer) from public, anon;
revoke all on function public.academic_correct_score_line(uuid, integer, jsonb, text) from public, anon;
revoke all on function public.academic_get_line_revisions(uuid) from public, anon;
revoke all on function public.academic_get_history() from public, anon;
grant execute on function public.academic_list_periods(uuid) to authenticated;
grant execute on function public.academic_get_score_entry(uuid, uuid) to authenticated;
grant execute on function public.academic_save_draft(uuid, uuid, jsonb, integer) to authenticated;
grant execute on function public.academic_submit_score_entry(uuid, uuid, jsonb, text, integer) to authenticated;
grant execute on function public.academic_correct_score_line(uuid, integer, jsonb, text) to authenticated;
grant execute on function public.academic_get_line_revisions(uuid) to authenticated;
grant execute on function public.academic_get_history() to authenticated;
