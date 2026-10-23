-- My Scores — profile and enrolment API (BE-002, #21).
--
--   academic_create_profile(input)          onboarding: profile + consent +
--                                           first enrolment + subjects (PROFILE-001..003)
--   academic_update_profile(version, input) profile edits with If-Match (PROFILE-006/007)
--   academic_set_subjects(enrolment, items) add, drop, rename subjects (PROFILE-003, SCORE-013)
--   academic_transition_enrolment(input)    promoted / repeated / transferred /
--                                           left / started (PROFILE-004/005)
--   academic_search_schools(query, ...)     Lao and romanised search (PROFILE-002)
--   academic_get_my_data_summary()          "My data" (PROFILE-007)
--
-- Closed enrolments are read-only: their subjects and scores cannot be
-- added to or changed, and transitions never edit them (PROFILE-004).

-- ─── Settings ────────────────────────────────────────────────────────────────

insert into public.academic_settings (key, value, description) values
  ('default_grading_scale_code', '"LA-0-10"', 'Scale used when the school has no default (PRD §23.1 assumption).'),
  ('allowed_grade_levels', '["upper_secondary"]', 'Phase 1 is Grades 10–12; lower secondary needs legal approval (PROFILE-008).'),
  ('province_codes', '["AT","BK","BL","CH","HO","KH","LM","LP","OU","PH","SL","SV","VI","VT","XA","XE","XI","XS"]',
   'Lao PDR provinces and Vientiane Capital (ISO 3166-2:LA subdivision codes).')
on conflict (key) do nothing;

-- ─── Admin review tasks (unverified schools, ADMIN-003) ──────────────────────

create table if not exists public.academic_review_tasks (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('unverified_school')),
  status             text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  enrolment_id       uuid references public.academic_enrolments(id) on delete cascade,
  payload            jsonb not null default '{}'::jsonb,
  resolution         jsonb,
  resolved_by        uuid references public.users(id) on delete set null,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((status = 'open') = (resolved_at is null))
);

create unique index if not exists academic_review_tasks_open_idx
  on public.academic_review_tasks (kind, enrolment_id) where status = 'open';
create index if not exists academic_review_tasks_status_idx
  on public.academic_review_tasks (status, created_at);

create or replace trigger academic_review_tasks_touch
  before update on public.academic_review_tasks
  for each row execute function public.academic_touch_updated_at();
create or replace trigger academic_review_tasks_audit
  after insert or update or delete on public.academic_review_tasks
  for each row execute function public.academic_audit_config_change();

alter table public.academic_review_tasks enable row level security;
revoke all on public.academic_review_tasks from anon, authenticated;
grant select, update on public.academic_review_tasks to authenticated;
drop policy if exists academic_review_tasks_admin on public.academic_review_tasks;
create policy academic_review_tasks_admin on public.academic_review_tasks
  for all to authenticated
  using ((select public.academic_is_admin()))
  with check ((select public.academic_is_admin()));

-- ─── Closed enrolments are read-only ─────────────────────────────────────────

create or replace function public.academic_guard_closed_enrolment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_enrolment_id uuid;
begin
  if tg_table_name = 'academic_enrolments' then
    if old.state = 'closed' then
      perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
    end if;
    return new;
  end if;

  if tg_table_name = 'academic_score_lines' then
    select enrolment_id into v_enrolment_id from public.academic_score_entries where id = new.score_entry_id;
  else
    v_enrolment_id := new.enrolment_id;
  end if;

  if exists (select 1 from public.academic_enrolments where id = v_enrolment_id and state = 'closed') then
    perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
  end if;
  return new;
end;
$$;

create or replace trigger academic_enrolments_closed_guard
  before update on public.academic_enrolments
  for each row execute function public.academic_guard_closed_enrolment();
create or replace trigger academic_subject_enrolments_closed_guard
  before insert or update on public.academic_subject_enrolments
  for each row execute function public.academic_guard_closed_enrolment();
create or replace trigger academic_score_entries_closed_guard
  before insert or update on public.academic_score_entries
  for each row execute function public.academic_guard_closed_enrolment();
create or replace trigger academic_score_lines_closed_guard
  before insert or update on public.academic_score_lines
  for each row execute function public.academic_guard_closed_enrolment();

-- ─── Resolution helpers ──────────────────────────────────────────────────────

create or replace function public.academic_active_year_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.academic_years where status = 'active';
$$;

-- Most specific active calendar for the school: the school's own override,
-- then a school-scoped template, then the province, then national.
create or replace function public.academic_resolve_calendar(p_year_id uuid, p_school_id uuid, p_province_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select c.id into v_id
  from public.academic_calendar_templates c
  left join public.academic_schools s on s.id = p_school_id
  where c.academic_year_id = p_year_id and c.status = 'active'
    and (
      c.id = s.calendar_template_id
      or (c.scope = 'school' and c.school_id = p_school_id)
      or (c.scope = 'province' and c.province_code = coalesce(s.province_code, p_province_code))
      or c.scope = 'national'
    )
  order by
    (c.id = s.calendar_template_id) desc nulls last,
    case c.scope when 'school' then 0 when 'province' then 1 else 2 end,
    c.created_at
  limit 1;

  if v_id is null then
    perform public.academic_raise('CALENDAR_NOT_CONFIGURED', 409, 'No school calendar is set up for this year yet');
  end if;
  return v_id;
end;
$$;

-- Latest approved version of the school's default scale, else the platform default.
create or replace function public.academic_resolve_scale_version(p_school_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_scale_id uuid;
  v_id uuid;
begin
  select default_scale_id into v_scale_id from public.academic_schools where id = p_school_id;
  if v_scale_id is null then
    select id into v_scale_id from public.academic_grading_scales
    where code = public.academic_setting('default_grading_scale_code') #>> '{}';
  end if;

  select id into v_id from public.academic_grading_scale_versions
  where grading_scale_id = v_scale_id and status = 'approved'
  order by version desc
  limit 1;

  if v_id is null then
    perform public.academic_raise('SCALE_NOT_CONFIGURED', 409, 'No approved grading scale is set up');
  end if;
  return v_id;
end;
$$;

-- The period that contains today (or the first/last one outside the year).
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
       and current_date between start_date and end_date
     limit 1),
    case
      when current_date < (select min(start_date) from public.academic_reporting_periods where calendar_template_id = p_calendar_id)
        then 1::smallint
      else (select max(sequence) from public.academic_reporting_periods where calendar_template_id = p_calendar_id and period_type = 'monthly')
    end,
    1::smallint
  );
$$;

create or replace function public.academic_parse_uuid(p_value text, p_field text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  perform public.academic_invalid(p_field, 'Unknown ' || replace(p_field, '_id', ''));
  return null;
end;
$$;

create or replace function public.academic_check_grade(p_grade_id text)
returns public.academic_grades
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grade public.academic_grades;
begin
  select * into v_grade from public.academic_grades
  where id = public.academic_parse_uuid(p_grade_id, 'grade_id') and status = 'active';
  if v_grade.id is null then
    perform public.academic_invalid('grade_id', 'Choose your grade');
  end if;
  if not coalesce(public.academic_setting('allowed_grade_levels') ? v_grade.level, false) then
    perform public.academic_raise('GRADE_NOT_SUPPORTED', 400, 'My Scores supports Grades 10–12 for now',
      jsonb_build_object('field', 'grade_id'));
  end if;
  return v_grade;
end;
$$;

-- School from the catalogue (following merges) or the student's own text.
-- Returns {school_id, school_free_text, school_verification, province_code}.
create or replace function public.academic_resolve_school(p_input jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_school public.academic_schools;
  v_text text := nullif(btrim(p_input->>'school_free_text'), '');
  v_id uuid;
begin
  if (p_input->>'school_id') is not null and v_text is not null then
    perform public.academic_invalid('school_id', 'Choose a school or type its name, not both');
  end if;

  if (p_input->>'school_id') is not null then
    begin
      v_id := (p_input->>'school_id')::uuid;
    exception when others then
      perform public.academic_invalid('school_id', 'Unknown school');
    end;
    select * into v_school from public.academic_schools where id = v_id;
    if v_school.status = 'merged' then
      select * into v_school from public.academic_schools where id = v_school.merged_into_id;
    end if;
    if v_school.id is null or v_school.status <> 'active' then
      perform public.academic_invalid('school_id', 'Unknown school');
    end if;
    return jsonb_build_object('school_id', v_school.id, 'school_free_text', null,
      'school_verification', 'verified', 'province_code', v_school.province_code);
  end if;

  if v_text is null then
    perform public.academic_invalid('school_id', 'Choose your school or type its name');
  end if;
  if length(v_text) > 80 then
    perform public.academic_invalid('school_free_text', 'School name must be 80 characters or fewer');
  end if;
  return jsonb_build_object('school_id', null, 'school_free_text', v_text,
    'school_verification', 'unverified_school', 'province_code', null);
end;
$$;

-- Validates profile fields that onboarding and edits share. Returns the
-- cleaned values; only keys present in p_input are returned.
create or replace function public.academic_clean_profile_fields(p_input jsonb, p_required boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_name text;
  v_goals jsonb;
  v_codes text[];
begin
  if p_required or p_input ? 'display_name' then
    v_name := btrim(coalesce(p_input->>'display_name', ''));
    if length(v_name) = 0 or length(v_name) > 40 then
      perform public.academic_invalid('display_name', 'Enter a name of 1–40 characters');
    end if;
    v_out := v_out || jsonb_build_object('display_name', v_name);
  end if;

  if p_required or p_input ? 'age_band' then
    if coalesce(p_input->>'age_band', '') not in ('13_15', '16_17', '18_plus') then
      perform public.academic_invalid('age_band', 'Choose your age group');
    end if;
    v_out := v_out || jsonb_build_object('age_band', p_input->>'age_band');
  end if;

  if p_required or p_input ? 'province_code' then
    if not coalesce(public.academic_setting('province_codes') ? (p_input->>'province_code'), false) then
      perform public.academic_invalid('province_code', 'Choose your province');
    end if;
    v_out := v_out || jsonb_build_object('province_code', p_input->>'province_code');
  end if;

  if p_input ? 'district_code' then
    if p_input->>'district_code' is not null and p_input->>'district_code' !~ '^[A-Z0-9-]{1,8}$' then
      perform public.academic_invalid('district_code', 'Unknown district');
    end if;
    v_out := v_out || jsonb_build_object('district_code', p_input->'district_code');
  end if;

  -- Up to 3 goal chips plus free text of at most 200 characters (PROFILE-006).
  if p_input ? 'goals' then
    v_goals := p_input->'goals';
    if v_goals is not null and jsonb_typeof(v_goals) <> 'null' then
      if jsonb_typeof(v_goals) <> 'object'
        or (v_goals ? 'chips' and (jsonb_typeof(v_goals->'chips') <> 'array' or jsonb_array_length(v_goals->'chips') > 3))
        or length(coalesce(v_goals->>'text', '')) > 200
        or exists (select 1 from jsonb_object_keys(v_goals) as k where k not in ('chips', 'text')) then
        perform public.academic_invalid('goals', 'Choose up to 3 goals and write at most 200 characters');
      end if;
      v_goals := jsonb_strip_nulls(jsonb_build_object(
        'chips', v_goals->'chips',
        'text', nullif(btrim(coalesce(v_goals->>'text', '')), '')
      ));
    else
      v_goals := 'null'::jsonb;
    end if;
    v_out := v_out || jsonb_build_object('goals', v_goals);
  end if;

  if p_input ? 'interest_subject_codes' then
    if jsonb_typeof(p_input->'interest_subject_codes') = 'array' then
      select array_agg(distinct code) into v_codes
      from jsonb_array_elements_text(p_input->'interest_subject_codes') as code;
      if exists (
        select 1 from unnest(coalesce(v_codes, '{}')) as wanted(code)
        where not exists (select 1 from public.academic_subjects s where s.code = wanted.code and s.status = 'active')
      ) then
        perform public.academic_invalid('interest_subject_codes', 'Unknown subject');
      end if;
      v_out := v_out || jsonb_build_object('interest_subject_codes', to_jsonb(coalesce(v_codes, '{}')));
    else
      v_out := v_out || jsonb_build_object('interest_subject_codes', 'null'::jsonb);
    end if;
  end if;

  return v_out;
end;
$$;

-- ─── Subjects (PROFILE-003, SCORE-013) ───────────────────────────────────────

-- Default subjects for a grade, as set_subjects items.
create or replace function public.academic_default_subject_items(p_grade_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('subject_id', s.id) order by s.code), '[]'::jsonb)
  from public.academic_subjects s
  join public.academic_grades g on g.id = p_grade_id
  where s.status = 'active' and s.is_default and g.ordinal between s.grade_min and s.grade_max;
$$;

-- Makes the enrolment's current subject list equal to p_items, in order.
-- Each item is {subject_id} or {custom_name}, optionally with the id of an
-- existing row (needed to rename a custom subject). A dropped subject that
-- already has scores ends before p_effective_seq so its history stays; one
-- without scores is removed.
create or replace function public.academic_apply_subjects(p_enrolment_id uuid, p_items jsonb, p_effective_seq smallint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_max integer := coalesce((public.academic_setting('max_subjects_per_enrolment') #>> '{}')::integer, 25);
  v_item jsonb;
  v_index integer := 0;
  v_keep uuid[] := '{}';
  v_row public.academic_subject_enrolments;
  v_subject_id uuid;
  v_name text;
  v_existing_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    perform public.academic_invalid('subjects', 'Subjects must be a list');
  end if;
  if jsonb_array_length(p_items) > v_max then
    perform public.academic_raise('SUBJECT_LIMIT', 400, 'You can track at most ' || v_max || ' subjects',
      jsonb_build_object('max', v_max));
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_index := v_index + 1;
    v_subject_id := null;
    v_name := nullif(btrim(coalesce(v_item->>'custom_name', '')), '');
    v_existing_id := null;

    if jsonb_typeof(v_item) <> 'object' or ((v_item->>'subject_id') is null) = (v_name is null) then
      perform public.academic_invalid('subjects[' || v_index || ']', 'Each subject needs a catalogue subject or a name');
    end if;
    if v_name is not null and length(v_name) > 60 then
      perform public.academic_invalid('subjects[' || v_index || ']', 'Subject names must be 60 characters or fewer');
    end if;

    if (v_item->>'subject_id') is not null then
      begin
        v_subject_id := (v_item->>'subject_id')::uuid;
      exception when others then
        perform public.academic_invalid('subjects[' || v_index || ']', 'Unknown subject');
      end;
      if not exists (select 1 from public.academic_subjects where id = v_subject_id and status = 'active') then
        perform public.academic_invalid('subjects[' || v_index || ']', 'Unknown subject');
      end if;
      select id into v_existing_id from public.academic_subject_enrolments
      where enrolment_id = p_enrolment_id and subject_id = v_subject_id;
    elsif (v_item->>'id') is not null then
      select id into v_existing_id from public.academic_subject_enrolments
      where enrolment_id = p_enrolment_id and id::text = v_item->>'id' and custom_name is not null;
      if v_existing_id is null then
        perform public.academic_invalid('subjects[' || v_index || ']', 'Unknown subject');
      end if;
    else
      select id into v_existing_id from public.academic_subject_enrolments
      where enrolment_id = p_enrolment_id and lower(btrim(custom_name)) = lower(v_name);
    end if;

    if v_existing_id = any (v_keep) then
      perform public.academic_invalid('subjects[' || v_index || ']', 'This subject is listed twice');
    end if;

    if v_existing_id is null then
      insert into public.academic_subject_enrolments (enrolment_id, subject_id, custom_name, start_period_seq, display_order)
      values (p_enrolment_id, v_subject_id, v_name, p_effective_seq, v_index)
      returning id into v_existing_id;
    else
      update public.academic_subject_enrolments
      set end_period_seq = null,
          custom_name = case when subject_id is null then v_name else null end,
          display_order = v_index
      where id = v_existing_id
        and (end_period_seq is not null or display_order <> v_index
             or (subject_id is null and custom_name is distinct from v_name));
    end if;
    v_keep := v_keep || v_existing_id;
  end loop;

  -- Drop what is no longer listed.
  for v_row in
    select * from public.academic_subject_enrolments
    where enrolment_id = p_enrolment_id and not (id = any (v_keep)) and end_period_seq is null
  loop
    if exists (select 1 from public.academic_score_lines where subject_enrolment_id = v_row.id) then
      update public.academic_subject_enrolments
      set end_period_seq = greatest(v_row.start_period_seq, p_effective_seq - 1)
      where id = v_row.id;
    else
      delete from public.academic_subject_enrolments where id = v_row.id;
    end if;
  end loop;
end;
$$;

create or replace function public.academic_subjects_json(p_enrolment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', se.id,
    'subject_id', se.subject_id,
    'code', s.code,
    'name_lo', coalesce(se.custom_name, s.name_lo),
    'name_en', coalesce(se.custom_name, s.name_en),
    'custom', se.subject_id is null,
    'start_period_seq', se.start_period_seq,
    'end_period_seq', se.end_period_seq,
    'display_order', se.display_order
  ) order by se.end_period_seq is not null, se.display_order, se.created_at), '[]'::jsonb)
  from public.academic_subject_enrolments se
  left join public.academic_subjects s on s.id = se.subject_id
  where se.enrolment_id = p_enrolment_id;
$$;

-- ─── Enrolment creation ──────────────────────────────────────────────────────

create or replace function public.academic_open_enrolment(
  p_profile public.academic_student_profiles,
  p_year_id uuid,
  p_grade_id uuid,
  p_school jsonb,
  p_start_seq smallint,
  p_is_repeat boolean,
  p_subjects jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_school_id uuid := (p_school->>'school_id')::uuid;
  v_calendar uuid := public.academic_resolve_calendar(p_year_id, v_school_id, p_profile.province_code);
  v_max_seq smallint;
  v_id uuid;
begin
  select max(sequence) into v_max_seq from public.academic_reporting_periods where calendar_template_id = v_calendar;
  if p_start_seq < 1 or p_start_seq > coalesce(v_max_seq, 1) then
    perform public.academic_invalid('effective_period_seq', 'Choose a month in this school year');
  end if;

  insert into public.academic_enrolments (
    student_profile_id, academic_year_id, grade_id, school_id, school_free_text, school_verification,
    grading_scale_version_id, calendar_template_id, start_period_seq, is_repeat
  ) values (
    p_profile.id, p_year_id, p_grade_id, v_school_id, p_school->>'school_free_text', p_school->>'school_verification',
    public.academic_resolve_scale_version(v_school_id), v_calendar, p_start_seq, p_is_repeat
  )
  returning id into v_id;

  perform public.academic_apply_subjects(v_id, p_subjects, p_start_seq);

  if p_school->>'school_verification' = 'unverified_school' then
    insert into public.academic_review_tasks (kind, student_profile_id, enrolment_id, payload)
    values ('unverified_school', p_profile.id, v_id, jsonb_build_object(
      'school_free_text', p_school->>'school_free_text',
      'province_code', p_profile.province_code
    ));
  end if;

  perform public.academic_audit('enrolment.create', 'enrolment', v_id, p_profile.id);
  return v_id;
end;
$$;

-- ─── Onboarding (PROFILE-001) ────────────────────────────────────────────────

-- Input: display_name, age_band, province_code, district_code?, grade_id,
-- school_id | school_free_text, subjects? (default: grade defaults),
-- goals?, interest_subject_codes?, notice_version (accepted privacy notice).
-- Idempotent per user: a second call returns the existing profile.
create or replace function public.academic_create_profile(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_profile public.academic_student_profiles;
  v_fields jsonb;
  v_grade public.academic_grades;
  v_school jsonb;
  v_year uuid := public.academic_active_year_id();
  v_enrolment uuid;
begin
  if not public.academic_module_enabled() then
    perform public.academic_raise('MODULE_DISABLED', 403, 'My Scores is not available yet');
  end if;

  -- Serialise concurrent onboarding for the same user.
  perform 1 from public.users where id = v_user for update;
  select * into v_profile from public.academic_student_profiles where user_id = v_user;
  if v_profile.id is not null then
    return jsonb_build_object('created', false, 'profile_id', v_profile.id,
      'enrolment_id', (select id from public.academic_enrolments where student_profile_id = v_profile.id and state = 'active'));
  end if;

  if p_input is null or jsonb_typeof(p_input) <> 'object' then
    perform public.academic_invalid('input', 'Profile details are required');
  end if;
  -- Nothing is stored before the privacy notice is accepted (PRIV-001).
  if nullif(p_input->>'notice_version', '') is null then
    perform public.academic_raise('CONSENT_REQUIRED', 403, 'Accept the privacy notice to continue',
      jsonb_build_object('purpose', 'module_processing'));
  end if;
  if v_year is null then
    perform public.academic_raise('CALENDAR_NOT_CONFIGURED', 409, 'The school year is not set up yet');
  end if;

  v_fields := public.academic_clean_profile_fields(p_input, true);
  v_grade := public.academic_check_grade(p_input->>'grade_id');
  v_school := public.academic_resolve_school(p_input);

  insert into public.academic_student_profiles (
    user_id, display_name, age_band, consent_state, province_code, district_code, goals, interest_subject_codes
  ) values (
    v_user,
    v_fields->>'display_name',
    v_fields->>'age_band',
    'active',
    v_fields->>'province_code',
    v_fields->>'district_code',
    nullif(v_fields->'goals', 'null'::jsonb),
    case when jsonb_typeof(v_fields->'interest_subject_codes') = 'array'
      then array(select jsonb_array_elements_text(v_fields->'interest_subject_codes')) end
  )
  returning * into v_profile;

  perform public.academic_record_consent(v_profile.id, 'module_processing', p_input->>'notice_version');

  v_enrolment := public.academic_open_enrolment(
    v_profile, v_year, v_grade.id, v_school, 1::smallint, false,
    coalesce(p_input->'subjects', public.academic_default_subject_items(v_grade.id))
  );

  perform public.academic_audit('profile.create', 'student_profile', v_profile.id, v_profile.id);
  return jsonb_build_object('created', true, 'profile_id', v_profile.id, 'enrolment_id', v_enrolment);
end;
$$;

-- ─── Profile edits (PROFILE-006/007) ─────────────────────────────────────────

create or replace function public.academic_update_profile(p_expected_version integer, p_changes jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_fields jsonb;
begin
  if p_expected_version is distinct from v_profile.version then
    perform public.academic_raise('VERSION_CONFLICT', 409, 'Your profile changed elsewhere; reload and try again',
      jsonb_build_object('version', v_profile.version));
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object'
    or exists (select 1 from jsonb_object_keys(p_changes) as k where k not in (
      'display_name', 'age_band', 'province_code', 'district_code', 'goals', 'interest_subject_codes'
    )) then
    perform public.academic_invalid('changes', 'Only profile fields can be changed here');
  end if;

  v_fields := public.academic_clean_profile_fields(p_changes, false);

  update public.academic_student_profiles set
    display_name = coalesce(v_fields->>'display_name', display_name),
    age_band = coalesce(v_fields->>'age_band', age_band),
    age_band_confirmed_at = case when v_fields ? 'age_band' then now() else age_band_confirmed_at end,
    province_code = coalesce(v_fields->>'province_code', province_code),
    district_code = case when v_fields ? 'district_code' then v_fields->>'district_code' else district_code end,
    goals = case when v_fields ? 'goals' then nullif(v_fields->'goals', 'null'::jsonb) else goals end,
    interest_subject_codes = case when v_fields ? 'interest_subject_codes'
      then case when jsonb_typeof(v_fields->'interest_subject_codes') = 'array'
        then array(select jsonb_array_elements_text(v_fields->'interest_subject_codes')) end
      else interest_subject_codes end
  where id = v_profile.id
  returning * into v_profile;

  perform public.academic_audit('profile.update', 'student_profile', v_profile.id, v_profile.id);
  return jsonb_build_object('profile_id', v_profile.id, 'version', v_profile.version);
end;
$$;

-- ─── Subject changes (PROFILE-003, SCORE-013) ────────────────────────────────

-- p_effective_period_seq: first period the change applies to (default: the
-- current month). Dropped subjects keep earlier scores.
create or replace function public.academic_set_subjects(
  p_enrolment_id uuid,
  p_subjects jsonb,
  p_effective_period_seq integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_enrolment public.academic_enrolments;
  v_seq smallint;
begin
  select * into v_enrolment from public.academic_enrolments
  where id = p_enrolment_id and student_profile_id = v_profile.id
  for update;
  if v_enrolment.id is null then
    return public.academic_deny('enrolment', p_enrolment_id);
  end if;
  if v_enrolment.state = 'closed' then
    perform public.academic_raise('ENROLMENT_CLOSED', 409, 'Closed enrolments are read-only');
  end if;

  v_seq := greatest(
    v_enrolment.start_period_seq,
    coalesce(p_effective_period_seq, public.academic_current_period_seq(v_enrolment.calendar_template_id))
  );
  perform public.academic_apply_subjects(v_enrolment.id, p_subjects, v_seq);
  perform public.academic_audit('enrolment.subjects', 'enrolment', v_enrolment.id, v_profile.id);

  return jsonb_build_object('enrolment_id', v_enrolment.id, 'subjects', public.academic_subjects_json(v_enrolment.id));
end;
$$;

-- ─── Year rollover and transfers (PROFILE-004/005) ───────────────────────────

-- Input: kind = promoted | repeated | transferred | left | started, plus
--   school_id | school_free_text  (required for transferred and started;
--                                  otherwise defaults to the current school)
--   grade_id                      (required for started; optional override)
--   effective_period_seq          (transferred: first month at the new school)
--   subjects                      (optional; default copies or grade defaults)
-- The previous enrolment is closed, never edited further; its scores stay.
create or replace function public.academic_transition_enrolment(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_kind text := p_input->>'kind';
  v_current public.academic_enrolments;
  v_year uuid := public.academic_active_year_id();
  v_grade public.academic_grades;
  v_school jsonb;
  v_subjects jsonb;
  v_seq smallint;
  v_new uuid;
begin
  if v_kind is null or v_kind not in ('promoted', 'repeated', 'transferred', 'left', 'started') then
    perform public.academic_invalid('kind', 'Choose what changed');
  end if;

  select * into v_current from public.academic_enrolments
  where student_profile_id = v_profile.id and state = 'active'
  for update;

  if v_kind = 'started' and v_current.id is not null then
    perform public.academic_raise('ENROLMENT_EXISTS', 409, 'You already have a current school year');
  end if;
  if v_kind <> 'started' and v_current.id is null then
    perform public.academic_raise('NO_ACTIVE_ENROLMENT', 409, 'There is no current school year to change');
  end if;
  if v_kind in ('promoted', 'repeated') and (v_year is null or v_year = v_current.academic_year_id) then
    perform public.academic_raise('YEAR_NOT_ROLLED_OVER', 409, 'The new school year has not started yet');
  end if;
  if v_kind in ('started') and v_year is null then
    perform public.academic_raise('CALENDAR_NOT_CONFIGURED', 409, 'The school year is not set up yet');
  end if;

  -- Copy of the current subjects, for repeats and transfers.
  if v_current.id is not null then
    select coalesce(jsonb_agg(
      case when se.subject_id is not null then jsonb_build_object('subject_id', se.subject_id)
           else jsonb_build_object('custom_name', se.custom_name) end
      order by se.display_order, se.created_at), '[]'::jsonb)
    into v_subjects
    from public.academic_subject_enrolments se
    where se.enrolment_id = v_current.id and se.end_period_seq is null;
  end if;

  if v_kind = 'left' then
    update public.academic_enrolments set state = 'closed', closed_reason = 'left' where id = v_current.id;
    perform public.academic_audit('enrolment.close', 'enrolment', v_current.id, v_profile.id, 'success', 'left');
    return jsonb_build_object('closed_enrolment_id', v_current.id, 'enrolment_id', null);
  end if;

  -- School: new one if given, else the current one.
  if p_input ? 'school_id' or p_input ? 'school_free_text' then
    v_school := public.academic_resolve_school(p_input);
  elsif v_kind in ('transferred', 'started') then
    perform public.academic_invalid('school_id', 'Choose your new school or type its name');
  else
    v_school := jsonb_build_object(
      'school_id', v_current.school_id,
      'school_free_text', v_current.school_free_text,
      'school_verification', v_current.school_verification
    );
  end if;

  if v_kind = 'transferred' then
    v_seq := (p_input->>'effective_period_seq')::smallint;
    if v_seq is null or v_seq <= v_current.start_period_seq then
      perform public.academic_invalid('effective_period_seq', 'Choose the first month at your new school');
    end if;
    select * into v_grade from public.academic_grades where id = v_current.grade_id;

    update public.academic_enrolments
    set state = 'closed', closed_reason = 'transferred', end_period_seq = v_seq - 1
    where id = v_current.id;

    v_new := public.academic_open_enrolment(
      v_profile, v_current.academic_year_id, v_grade.id, v_school, v_seq, v_current.is_repeat,
      coalesce(p_input->'subjects', v_subjects)
    );
  else
    if v_kind = 'started' or p_input ? 'grade_id' then
      v_grade := public.academic_check_grade(p_input->>'grade_id');
    elsif v_kind = 'repeated' then
      select * into v_grade from public.academic_grades where id = v_current.grade_id;
    else
      select g.* into v_grade
      from public.academic_grades g
      join public.academic_grades cur on cur.id = v_current.grade_id
      where g.education_structure_id = cur.education_structure_id
        and g.ordinal = cur.ordinal + 1 and g.status = 'active';
      if v_grade.id is null then
        perform public.academic_raise('GRADE_NOT_AVAILABLE', 409, 'There is no next grade; choose "Left school" instead');
      end if;
      v_grade := public.academic_check_grade(v_grade.id::text);
    end if;

    if v_current.id is not null then
      update public.academic_enrolments set state = 'closed', closed_reason = v_kind where id = v_current.id;
    end if;

    v_new := public.academic_open_enrolment(
      v_profile, v_year, v_grade.id, v_school, 1::smallint, v_kind = 'repeated',
      coalesce(
        p_input->'subjects',
        case when v_kind = 'repeated' then v_subjects else public.academic_default_subject_items(v_grade.id) end
      )
    );
  end if;

  if v_current.id is not null then
    perform public.academic_audit('enrolment.close', 'enrolment', v_current.id, v_profile.id, 'success', v_kind);
  end if;
  return jsonb_build_object('closed_enrolment_id', v_current.id, 'enrolment_id', v_new);
end;
$$;

-- ─── School search (PROFILE-002) ─────────────────────────────────────────────

create or replace function public.academic_search_schools(
  p_query text,
  p_province_code text default null,
  p_limit integer default 20
)
returns table (id uuid, name_lo text, name_en text, romanised_name text, province_code text, district_code text)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
begin
  perform public.academic_require_user();
  if length(v_query) < 2 then
    return;
  end if;

  return query
  select s.id, s.name_lo::text, s.name_en::text, s.romanised_name::text, s.province_code::text, s.district_code::text
  from public.academic_schools s
  where s.status = 'active'
    and (p_province_code is null or s.province_code = p_province_code)
    and (
      lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')) like '%' || v_query || '%'
      or lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')) % v_query
    )
  order by similarity(lower(s.name_lo || ' ' || coalesce(s.name_en, '') || ' ' || coalesce(s.romanised_name, '')), v_query) desc,
           s.name_lo
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

-- ─── "My data" (PROFILE-007) ─────────────────────────────────────────────────

-- Works while the module is switched off, like the other privacy actions.
create or replace function public.academic_get_my_data_summary()
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
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'display_name', v_profile.display_name,
      'age_band', v_profile.age_band,
      'province_code', v_profile.province_code,
      'district_code', v_profile.district_code,
      'goals', v_profile.goals,
      'interest_subject_codes', to_jsonb(v_profile.interest_subject_codes),
      'status', v_profile.status,
      'version', v_profile.version
    ),
    'counts', jsonb_build_object(
      'enrolments', (select count(*) from public.academic_enrolments where student_profile_id = v_profile.id),
      'score_entries_submitted', (select count(*) from public.academic_score_entries se
        join public.academic_enrolments e on e.id = se.enrolment_id
        where e.student_profile_id = v_profile.id and se.state = 'submitted'),
      'score_entries_draft', (select count(*) from public.academic_score_entries se
        join public.academic_enrolments e on e.id = se.enrolment_id
        where e.student_profile_id = v_profile.id and se.state = 'draft'),
      'scores', (select count(*) from public.academic_score_lines l
        join public.academic_score_entries se on se.id = l.score_entry_id
        join public.academic_enrolments e on e.id = se.enrolment_id
        where e.student_profile_id = v_profile.id and l.is_current),
      'corrections', (select count(*) from public.academic_score_revisions r
        join public.academic_score_lines l on l.id = r.score_line_id
        join public.academic_score_entries se on se.id = l.score_entry_id
        join public.academic_enrolments e on e.id = se.enrolment_id
        where e.student_profile_id = v_profile.id),
      'uploads', 0,
      'guardian_links', 0
    ),
    'consents', public.academic_list_my_consents()->'consents',
    'deletion', public.academic_deletion_status(v_profile)
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_guard_closed_enrolment() from public, anon, authenticated;
revoke all on function public.academic_active_year_id() from public, anon, authenticated;
revoke all on function public.academic_resolve_calendar(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.academic_resolve_scale_version(uuid) from public, anon, authenticated;
revoke all on function public.academic_current_period_seq(uuid) from public, anon, authenticated;
revoke all on function public.academic_parse_uuid(text, text) from public, anon, authenticated;
revoke all on function public.academic_check_grade(text) from public, anon, authenticated;
revoke all on function public.academic_resolve_school(jsonb) from public, anon, authenticated;
revoke all on function public.academic_clean_profile_fields(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.academic_default_subject_items(uuid) from public, anon, authenticated;
revoke all on function public.academic_apply_subjects(uuid, jsonb, smallint) from public, anon, authenticated;
revoke all on function public.academic_subjects_json(uuid) from public, anon, authenticated;
revoke all on function public.academic_open_enrolment(public.academic_student_profiles, uuid, uuid, jsonb, smallint, boolean, jsonb) from public, anon, authenticated;

revoke all on function public.academic_create_profile(jsonb) from public, anon;
revoke all on function public.academic_update_profile(integer, jsonb) from public, anon;
revoke all on function public.academic_set_subjects(uuid, jsonb, integer) from public, anon;
revoke all on function public.academic_transition_enrolment(jsonb) from public, anon;
revoke all on function public.academic_search_schools(text, text, integer) from public, anon;
revoke all on function public.academic_get_my_data_summary() from public, anon;
grant execute on function public.academic_create_profile(jsonb) to authenticated;
grant execute on function public.academic_update_profile(integer, jsonb) to authenticated;
grant execute on function public.academic_set_subjects(uuid, jsonb, integer) to authenticated;
grant execute on function public.academic_transition_enrolment(jsonb) to authenticated;
grant execute on function public.academic_search_schools(text, text, integer) to authenticated;
grant execute on function public.academic_get_my_data_summary() to authenticated;
