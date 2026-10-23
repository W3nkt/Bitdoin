-- My Scores (Academy academic tracking) — module schema, Phase 1 (DB-001, #16).
--
-- Every table is module-owned and prefixed academic_. The only link to the
-- core platform is academic_student_profiles.user_id -> public.users(id); no
-- account details are copied here.
--
-- Scores keep their original value and a reference to the exact grading-scale
-- version they were entered under (SCORE-008). One entry per enrolment and
-- reporting period, one current line per subject (SCORE-009). Corrections to
-- submitted lines are written to academic_score_revisions automatically.
-- Consent records and audit events are append-only (PRIV-003).
--
-- RLS is enabled on every table with no policies, so nothing is readable or
-- writable through the API until the access policies migration (DB-002) adds
-- them. The module stays off until academic_settings.my_scores_enabled is set.

-- ─── Shared helpers ──────────────────────────────────────────────────────────

-- Mutable domain tables carry version for optimistic concurrency; every
-- update bumps it, so a writer that read version N can require version = N.
create or replace function public.academic_touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function public.academic_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Module settings and feature flags ───────────────────────────────────────

create table if not exists public.academic_settings (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  value       jsonb not null,
  description text,
  updated_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger academic_settings_touch
  before update on public.academic_settings
  for each row execute function public.academic_touch_updated_at();

insert into public.academic_settings (key, value, description) values
  ('my_scores_enabled', 'false', 'Kill switch for the whole module. Off until legal sign-off (OD-07).'),
  ('consent_notice_version', '"2026-10-draft"', 'Current privacy notice version students consent to.'),
  ('max_subjects_per_enrolment', '25', 'PROFILE-003 limit.')
on conflict (key) do nothing;

-- ─── Education structure and calendar ────────────────────────────────────────

create table if not exists public.academic_education_structures (
  id                  uuid primary key default gen_random_uuid(),
  code                varchar(32) not null unique,
  name_lo             varchar(120) not null,
  name_en             varchar(120) not null,
  effective_from_year smallint,
  notes               text,
  status              text not null default 'active' check (status in ('active', 'archived')),
  archived_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.academic_grades (
  id                     uuid primary key default gen_random_uuid(),
  education_structure_id uuid not null references public.academic_education_structures(id),
  code                   varchar(8) not null,
  ordinal                smallint not null,
  level                  text not null check (level in ('lower_secondary', 'upper_secondary')),
  label_lo               varchar(40) not null,
  label_en               varchar(40) not null,
  status                 text not null default 'active' check (status in ('active', 'archived')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (education_structure_id, code),
  unique (education_structure_id, ordinal)
);

create table if not exists public.academic_years (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(9) not null unique check (code ~ '^[0-9]{4}-[0-9]{4}$'),
  start_date  date not null,
  end_date    date not null,
  rollover_at timestamptz,
  status      text not null default 'upcoming' check (status in ('upcoming', 'active', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date > start_date)
);

-- At most one academic year is current at a time.
create unique index if not exists academic_years_one_active_idx
  on public.academic_years ((true)) where status = 'active';

create table if not exists public.academic_grading_scales (
  id         uuid primary key default gen_random_uuid(),
  code       varchar(32) not null unique,
  name_lo    varchar(120) not null,
  name_en    varchar(120) not null,
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Approved versions are immutable: a scale change is a new version, so scores
-- entered under the old one keep their meaning.
create table if not exists public.academic_grading_scale_versions (
  id               uuid primary key default gen_random_uuid(),
  grading_scale_id uuid not null references public.academic_grading_scales(id),
  version          integer not null check (version > 0),
  scale_family     text not null check (scale_family in ('numeric_linear', 'ordinal', 'pass_fail')),
  min_value        numeric(6,2),
  max_value        numeric(6,2),
  step             numeric(6,2),
  decimals         smallint not null default 0 check (decimals between 0 and 2),
  pass_mark        numeric(6,2),
  normalisable     boolean not null default false,
  -- Ordinal / pass-fail levels, ordered lowest first:
  -- [{"code":"A","label_lo":"...","label_en":"Excellent"}, ...]
  ordinal_levels   jsonb,
  status           text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  approved_by      uuid references public.users(id) on delete set null,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (grading_scale_id, version),
  check (
    scale_family <> 'numeric_linear'
    or (min_value is not null and max_value is not null and max_value > min_value
        and (step is null or step > 0))
  ),
  check (
    scale_family = 'numeric_linear'
    or (jsonb_typeof(ordinal_levels) = 'array' and jsonb_array_length(ordinal_levels) > 0)
  ),
  check (not normalisable or scale_family = 'numeric_linear'),
  check (pass_mark is null or (pass_mark >= min_value and pass_mark <= max_value)),
  check (status = 'draft' or approved_at is not null)
);

create or replace function public.academic_guard_scale_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Approved grading scale versions cannot be deleted; retire them instead'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if old.status = 'draft' then
    return new;
  end if;

  -- Approved/retired: the only change allowed is approved -> retired.
  if (to_jsonb(new) - array['status', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'updated_at'])
    or not (
      (old.status = 'approved' and new.status in ('approved', 'retired'))
      or (old.status = 'retired' and new.status = 'retired')
    ) then
    raise exception 'Grading scale version % is % and cannot be changed', old.id, old.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace trigger academic_grading_scale_versions_guard
  before update or delete on public.academic_grading_scale_versions
  for each row execute function public.academic_guard_scale_version();

create or replace trigger academic_grading_scale_versions_touch
  before update on public.academic_grading_scale_versions
  for each row execute function public.academic_touch_updated_at();

create table if not exists public.academic_schools (
  id                   uuid primary key default gen_random_uuid(),
  name_lo              varchar(160) not null,
  name_en              varchar(160),
  romanised_name       varchar(160),
  province_code        varchar(32) not null,
  district_code        varchar(8),
  school_type          text check (school_type in ('public', 'private', 'other')),
  status               text not null default 'active' check (status in ('active', 'merged', 'archived')),
  merged_into_id       uuid references public.academic_schools(id),
  calendar_template_id uuid,
  default_scale_id     uuid references public.academic_grading_scales(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check ((status = 'merged') = (merged_into_id is not null)),
  check (merged_into_id is distinct from id)
);

create index if not exists academic_schools_area_idx
  on public.academic_schools (province_code, district_code);

-- Search tolerates Lao and romanised spellings (PROFILE-002).
create extension if not exists pg_trgm with schema extensions;

create index if not exists academic_schools_search_trgm_idx
  on public.academic_schools
  using gin ((
    lower(name_lo || ' ' || coalesce(name_en, '') || ' ' || coalesce(romanised_name, ''))
  ) gin_trgm_ops);

create table if not exists public.academic_calendar_templates (
  id               uuid primary key default gen_random_uuid(),
  name             varchar(120) not null,
  academic_year_id uuid not null references public.academic_years(id),
  scope            text not null check (scope in ('national', 'province', 'school')),
  province_code    varchar(32),
  school_id        uuid references public.academic_schools(id),
  status           text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((scope = 'province') = (province_code is not null)),
  check ((scope = 'school') = (school_id is not null))
);

create index if not exists academic_calendar_templates_year_idx
  on public.academic_calendar_templates (academic_year_id, scope);

alter table public.academic_schools
  drop constraint if exists academic_schools_calendar_template_id_fkey;
alter table public.academic_schools
  add constraint academic_schools_calendar_template_id_fkey
  foreign key (calendar_template_id) references public.academic_calendar_templates(id);

create table if not exists public.academic_reporting_periods (
  id                   uuid primary key default gen_random_uuid(),
  calendar_template_id uuid not null references public.academic_calendar_templates(id) on delete cascade,
  period_type          text not null check (period_type in ('monthly', 'term_official', 'semester_official', 'annual_official', 'exam')),
  term_no              smallint,
  sequence             smallint not null check (sequence > 0),
  label_lo             varchar(40) not null,
  label_en             varchar(40) not null,
  start_date           date not null,
  end_date             date not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (calendar_template_id, period_type, sequence),
  check (end_date >= start_date)
);

-- ─── Subjects ────────────────────────────────────────────────────────────────

create table if not exists public.academic_subjects (
  id         uuid primary key default gen_random_uuid(),
  code       varchar(32) not null unique,
  name_lo    varchar(80) not null,
  name_en    varchar(80) not null,
  grade_min  smallint not null,
  grade_max  smallint not null,
  -- Pre-selected for new enrolments in grades grade_min..grade_max (PROFILE-003).
  is_default boolean not null default true,
  status     text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grade_max >= grade_min)
);

create table if not exists public.academic_subject_aliases (
  id               uuid primary key default gen_random_uuid(),
  subject_id       uuid not null references public.academic_subjects(id) on delete cascade,
  alias_text       varchar(80) not null,
  alias_normalised varchar(80) not null,
  school_id        uuid references public.academic_schools(id) on delete cascade,
  source           text not null default 'admin' check (source in ('admin', 'ocr_learned')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique nulls not distinct (alias_normalised, school_id)
);

-- ─── Student profile and enrolments ──────────────────────────────────────────

create table if not exists public.academic_student_profiles (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references public.users(id) on delete cascade,
  display_name           varchar(40) not null check (length(btrim(display_name)) > 0),
  -- No date of birth is collected; age band only, re-confirmed yearly (PRIV-002).
  age_band               text not null check (age_band in ('13_15', '16_17', '18_plus')),
  age_band_confirmed_at  timestamptz not null default now(),
  consent_state          text not null default 'active' check (consent_state in ('pending_guardian', 'active', 'withdrawn')),
  province_code          varchar(32) not null,
  district_code          varchar(8),
  -- Up to 3 goal chips plus free text of at most 200 characters (PROFILE-006).
  goals                  jsonb check (goals is null or jsonb_typeof(goals) = 'object'),
  interest_subject_codes text[],
  status                 text not null default 'active' check (status in ('active', 'read_only', 'deletion_pending')),
  deletion_requested_at  timestamptz,
  version                integer not null default 1,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check ((status = 'deletion_pending') = (deletion_requested_at is not null))
);

create or replace trigger academic_student_profiles_touch
  before update on public.academic_student_profiles
  for each row execute function public.academic_touch_row();

create table if not exists public.academic_enrolments (
  id                       uuid primary key default gen_random_uuid(),
  student_profile_id       uuid not null references public.academic_student_profiles(id) on delete cascade,
  academic_year_id         uuid not null references public.academic_years(id),
  grade_id                 uuid not null references public.academic_grades(id),
  school_id                uuid references public.academic_schools(id),
  school_free_text         varchar(80),
  school_verification      text not null default 'verified' check (school_verification in ('verified', 'unverified_school')),
  grading_scale_version_id uuid not null references public.academic_grading_scale_versions(id),
  calendar_template_id     uuid not null references public.academic_calendar_templates(id),
  start_period_seq         smallint not null default 1,
  end_period_seq           smallint,
  is_repeat                boolean not null default false,
  state                    text not null default 'active' check (state in ('active', 'closed')),
  closed_reason            text check (closed_reason in ('promoted', 'repeated', 'transferred', 'left', 'year_end')),
  -- Reserved for school tenants; always null in Phase 1 (PRD §26.8).
  organisation_id          uuid,
  version                  integer not null default 1,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (num_nonnulls(school_id, school_free_text) = 1),
  check (school_free_text is null or length(btrim(school_free_text)) > 0),
  check ((school_free_text is not null) = (school_verification = 'unverified_school')),
  check ((state = 'closed') = (closed_reason is not null)),
  check (end_period_seq is null or end_period_seq >= start_period_seq)
);

create unique index if not exists academic_enrolments_one_active_idx
  on public.academic_enrolments (student_profile_id) where state = 'active';
create index if not exists academic_enrolments_profile_year_idx
  on public.academic_enrolments (student_profile_id, academic_year_id);

-- Only approved scale versions can be assigned, and the calendar must belong
-- to the enrolment's academic year.
create or replace function public.academic_check_enrolment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.grading_scale_version_id is distinct from old.grading_scale_version_id then
    if not exists (
      select 1 from public.academic_grading_scale_versions
      where id = new.grading_scale_version_id and status = 'approved'
    ) then
      raise exception 'Grading scale version % is not approved', new.grading_scale_version_id
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' or new.calendar_template_id is distinct from old.calendar_template_id
    or new.academic_year_id is distinct from old.academic_year_id then
    if not exists (
      select 1 from public.academic_calendar_templates
      where id = new.calendar_template_id and academic_year_id = new.academic_year_id
    ) then
      raise exception 'Calendar template % does not belong to academic year %', new.calendar_template_id, new.academic_year_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger academic_enrolments_check
  before insert or update on public.academic_enrolments
  for each row execute function public.academic_check_enrolment();

create or replace trigger academic_enrolments_touch
  before update on public.academic_enrolments
  for each row execute function public.academic_touch_row();

create table if not exists public.academic_subject_enrolments (
  id               uuid primary key default gen_random_uuid(),
  enrolment_id     uuid not null references public.academic_enrolments(id) on delete cascade,
  subject_id       uuid references public.academic_subjects(id),
  custom_name      varchar(60),
  start_period_seq smallint not null default 1,
  end_period_seq   smallint,
  display_order    smallint not null default 0,
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (num_nonnulls(subject_id, custom_name) = 1),
  check (custom_name is null or length(btrim(custom_name)) > 0),
  check (end_period_seq is null or end_period_seq >= start_period_seq)
);

create unique index if not exists academic_subject_enrolments_subject_idx
  on public.academic_subject_enrolments (enrolment_id, subject_id) where subject_id is not null;
create unique index if not exists academic_subject_enrolments_custom_idx
  on public.academic_subject_enrolments (enrolment_id, lower(btrim(custom_name))) where custom_name is not null;

create or replace function public.academic_limit_subject_enrolments()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit integer;
begin
  select coalesce((value #>> '{}')::integer, 25) into v_limit
  from public.academic_settings where key = 'max_subjects_per_enrolment';

  -- Serialise concurrent inserts for the same enrolment.
  perform 1 from public.academic_enrolments where id = new.enrolment_id for update;

  if (select count(*) from public.academic_subject_enrolments where enrolment_id = new.enrolment_id)
     >= coalesce(v_limit, 25) then
    raise exception 'An enrolment can have at most % subjects', coalesce(v_limit, 25)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace trigger academic_subject_enrolments_limit
  before insert on public.academic_subject_enrolments
  for each row execute function public.academic_limit_subject_enrolments();

create or replace trigger academic_subject_enrolments_touch
  before update on public.academic_subject_enrolments
  for each row execute function public.academic_touch_row();

-- ─── Scores ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_score_entries (
  id                  uuid primary key default gen_random_uuid(),
  enrolment_id        uuid not null references public.academic_enrolments(id) on delete cascade,
  reporting_period_id uuid not null references public.academic_reporting_periods(id),
  state               text not null default 'draft' check (state in ('draft', 'submitted')),
  submitted_at        timestamptz,
  source              text not null default 'manual' check (source in ('manual', 'ocr_confirmed', 'school_import', 'mixed')),
  -- Phase 2 OCR job; the foreign key is added with the OCR tables.
  ocr_job_id          uuid,
  idempotency_key     varchar(64),
  version             integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (enrolment_id, reporting_period_id),
  unique (enrolment_id, idempotency_key),
  check ((state = 'submitted') = (submitted_at is not null))
);

create index if not exists academic_score_entries_period_idx
  on public.academic_score_entries (reporting_period_id);

-- A submitted entry never goes back to draft, and the period must come from
-- the enrolment's own calendar (SCORE-002).
create or replace function public.academic_check_score_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.state = 'submitted' and new.state = 'draft' then
      raise exception 'A submitted score entry cannot return to draft'
        using errcode = 'check_violation';
    end if;
    if new.enrolment_id is distinct from old.enrolment_id
      or new.reporting_period_id is distinct from old.reporting_period_id then
      raise exception 'A score entry cannot move to another enrolment or period'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.academic_enrolments e
    join public.academic_reporting_periods p on p.calendar_template_id = e.calendar_template_id
    where e.id = new.enrolment_id and p.id = new.reporting_period_id
  ) then
    raise exception 'Reporting period % is not in the enrolment calendar', new.reporting_period_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace trigger academic_score_entries_check
  before insert or update on public.academic_score_entries
  for each row execute function public.academic_check_score_entry();

create or replace trigger academic_score_entries_touch
  before update on public.academic_score_entries
  for each row execute function public.academic_touch_row();

create table if not exists public.academic_score_lines (
  id                       uuid primary key default gen_random_uuid(),
  score_entry_id           uuid not null references public.academic_score_entries(id) on delete cascade,
  subject_enrolment_id     uuid not null references public.academic_subject_enrolments(id) on delete cascade,
  raw_value                numeric(6,2),
  ordinal_code             varchar(16),
  -- missing / not_applicable / exempt store no value and never count as 0 (SCORE-004).
  status                   text not null check (status in ('scored', 'missing', 'not_applicable', 'exempt')),
  grading_scale_version_id uuid not null references public.academic_grading_scale_versions(id),
  normalised_value         numeric(6,4),
  source                   text not null default 'manual' check (source in ('manual', 'ocr_confirmed', 'school_import')),
  verification             text not null default 'self_reported' check (verification in ('self_reported', 'guardian_acknowledged', 'school_verified')),
  evidence_stream          text not null default 'school_score' check (evidence_stream in ('school_score')),
  is_current               boolean not null default true,
  version                  integer not null default 1,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check ((status = 'scored') = (raw_value is not null or ordinal_code is not null)),
  check (raw_value is null or ordinal_code is null),
  check (normalised_value is null or (raw_value is not null and normalised_value between 0 and 1))
);

create unique index if not exists academic_score_lines_current_idx
  on public.academic_score_lines (score_entry_id, subject_enrolment_id) where is_current;
create index if not exists academic_score_lines_subject_idx
  on public.academic_score_lines (subject_enrolment_id);

-- Validates the value against the line's scale version and derives
-- normalised_value. The scale version is copied from the enrolment when the
-- line is first saved and never changes afterwards.
create or replace function public.academic_prepare_score_line()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_enrolment_id uuid;
  v_scale public.academic_grading_scale_versions%rowtype;
  v_steps numeric;
begin
  select se.enrolment_id into v_enrolment_id
  from public.academic_score_entries se where se.id = new.score_entry_id;

  if not exists (
    select 1 from public.academic_subject_enrolments
    where id = new.subject_enrolment_id and enrolment_id = v_enrolment_id
  ) then
    raise exception 'Subject % is not part of this enrolment', new.subject_enrolment_id
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    select e.grading_scale_version_id into new.grading_scale_version_id
    from public.academic_enrolments e where e.id = v_enrolment_id;
  else
    if new.score_entry_id is distinct from old.score_entry_id
      or new.subject_enrolment_id is distinct from old.subject_enrolment_id then
      raise exception 'A score line cannot move to another entry or subject'
        using errcode = 'check_violation';
    end if;
    new.grading_scale_version_id := old.grading_scale_version_id;
  end if;

  select * into v_scale from public.academic_grading_scale_versions where id = new.grading_scale_version_id;

  new.normalised_value := null;
  if new.status <> 'scored' then
    return new;
  end if;

  if v_scale.scale_family = 'numeric_linear' then
    if new.raw_value is null then
      raise exception 'Scale % expects a number', v_scale.id using errcode = 'check_violation';
    end if;
    if new.raw_value < v_scale.min_value or new.raw_value > v_scale.max_value then
      raise exception 'Score must be between % and %', v_scale.min_value, v_scale.max_value
        using errcode = 'check_violation';
    end if;
    if round(new.raw_value, v_scale.decimals) <> new.raw_value then
      raise exception 'Score allows at most % decimal places', v_scale.decimals
        using errcode = 'check_violation';
    end if;
    if v_scale.step is not null then
      v_steps := (new.raw_value - v_scale.min_value) / v_scale.step;
      if v_steps <> trunc(v_steps) then
        raise exception 'Score must be in steps of %', v_scale.step using errcode = 'check_violation';
      end if;
    end if;
    if v_scale.normalisable then
      new.normalised_value := round((new.raw_value - v_scale.min_value) / (v_scale.max_value - v_scale.min_value), 4);
    end if;
  else
    if new.ordinal_code is null or not exists (
      select 1 from jsonb_array_elements(v_scale.ordinal_levels) as level
      where level->>'code' = new.ordinal_code
    ) then
      raise exception 'Grade % is not a level of scale %', new.ordinal_code, v_scale.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger academic_score_lines_prepare
  before insert or update on public.academic_score_lines
  for each row execute function public.academic_prepare_score_line();

create or replace trigger academic_score_lines_touch
  before update on public.academic_score_lines
  for each row execute function public.academic_touch_row();

-- Append-only history of corrections to submitted lines (SCORE-007).
create table if not exists public.academic_score_revisions (
  id               uuid primary key default gen_random_uuid(),
  score_line_id    uuid not null references public.academic_score_lines(id) on delete cascade,
  old_value        numeric(6,2),
  new_value        numeric(6,2),
  old_ordinal_code varchar(16),
  new_ordinal_code varchar(16),
  old_status       text not null,
  new_status       text not null,
  actor_user_id    uuid,
  actor_role       text not null check (actor_role in ('student', 'admin', 'system')),
  reason           varchar(120),
  source           text not null,
  created_at       timestamptz not null default now()
);

create index if not exists academic_score_revisions_line_idx
  on public.academic_score_revisions (score_line_id, created_at);

-- The writing RPC passes an optional reason with
--   set_config('academic.revision_reason', '<text>', true)
create or replace function public.academic_record_score_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_actor uuid := (select auth.uid());
  v_role text;
begin
  if new.raw_value is not distinct from old.raw_value
    and new.ordinal_code is not distinct from old.ordinal_code
    and new.status is not distinct from old.status then
    return null;
  end if;

  -- Draft edits are not corrections. submitted_at < now() also skips line
  -- writes made in the same transaction that submits the entry.
  if not exists (
    select 1 from public.academic_score_entries
    where id = new.score_entry_id and state = 'submitted' and submitted_at < now()
  ) then
    return null;
  end if;

  select p.user_id into v_owner
  from public.academic_score_entries se
  join public.academic_enrolments e on e.id = se.enrolment_id
  join public.academic_student_profiles p on p.id = e.student_profile_id
  where se.id = new.score_entry_id;

  v_role := case
    when v_actor is null then 'system'
    when v_actor = v_owner then 'student'
    when public.is_staff() then 'admin'
    else 'system'
  end;

  insert into public.academic_score_revisions (
    score_line_id, old_value, new_value, old_ordinal_code, new_ordinal_code,
    old_status, new_status, actor_user_id, actor_role, reason, source
  ) values (
    new.id, old.raw_value, new.raw_value, old.ordinal_code, new.ordinal_code,
    old.status, new.status, v_actor, v_role,
    left(nullif(btrim(current_setting('academic.revision_reason', true)), ''), 120),
    new.source
  );
  return null;
end;
$$;

create or replace trigger academic_score_lines_revision
  after update on public.academic_score_lines
  for each row execute function public.academic_record_score_revision();

-- ─── Consent records (append-only, PRIV-003) ─────────────────────────────────

-- Kept after a profile is deleted (retention: life of profile + 5 years,
-- pending counsel, OD-16), so the profile and grantor links become null
-- instead of cascading.
create table if not exists public.academic_consent_records (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid references public.academic_student_profiles(id) on delete set null,
  grantor_user_id    uuid references public.users(id) on delete set null,
  grantor_role       text not null check (grantor_role in ('student', 'guardian')),
  purpose            text not null check (purpose in (
    'module_processing', 'guardian_sharing', 'ocr_processing', 'ai_processing',
    'email', 'push', 'research_samples', 'keep_photos'
  )),
  scope              jsonb not null default '{}'::jsonb,
  notice_version     varchar(32) not null,
  method             text not null check (method in ('in_app_checkbox', 'guardian_link_flow')),
  granted_at         timestamptz not null default now(),
  withdrawn_at       timestamptz,
  created_at         timestamptz not null default now(),
  check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create unique index if not exists academic_consent_records_active_idx
  on public.academic_consent_records (student_profile_id, purpose)
  where withdrawn_at is null and student_profile_id is not null;
create index if not exists academic_consent_records_profile_idx
  on public.academic_consent_records (student_profile_id, granted_at desc);

-- The only permitted changes: setting withdrawn_at once, and the FK set-null
-- that happens when a profile or account is deleted.
create or replace function public.academic_guard_consent_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Consent records are append-only' using errcode = 'insufficient_privilege';
  end if;

  if (to_jsonb(new) - array['withdrawn_at', 'student_profile_id', 'grantor_user_id'])
       is distinct from (to_jsonb(old) - array['withdrawn_at', 'student_profile_id', 'grantor_user_id'])
    or (old.withdrawn_at is not null and new.withdrawn_at is distinct from old.withdrawn_at)
    or (new.student_profile_id is distinct from old.student_profile_id and new.student_profile_id is not null)
    or (new.grantor_user_id is distinct from old.grantor_user_id and new.grantor_user_id is not null) then
    raise exception 'Consent records are append-only; only withdrawal can be recorded'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace trigger academic_consent_records_guard
  before update or delete on public.academic_consent_records
  for each row execute function public.academic_guard_consent_record();

-- ─── Audit events (append-only, 24-month retention) ──────────────────────────

-- No foreign keys: events outlive the rows they describe. Never store score
-- values, names or contact details here — IDs and outcomes only.
create table if not exists public.academic_audit_events (
  id                 uuid primary key default gen_random_uuid(),
  occurred_at        timestamptz not null default now(),
  actor_user_id      uuid,
  actor_role         text not null check (actor_role in ('student', 'guardian', 'admin', 'support', 'system')),
  action             varchar(64) not null,
  target_type        varchar(48) not null,
  target_id          uuid,
  student_profile_id uuid,
  ip_hash            char(64),
  user_agent_hash    char(64),
  outcome            text not null default 'success' check (outcome in ('success', 'denied', 'error')),
  reason             varchar(200)
);

create index if not exists academic_audit_events_profile_idx
  on public.academic_audit_events (student_profile_id, occurred_at);
create index if not exists academic_audit_events_actor_idx
  on public.academic_audit_events (actor_user_id, occurred_at);
create index if not exists academic_audit_events_occurred_idx
  on public.academic_audit_events (occurred_at);

-- Updates are never allowed. Deletes are reserved for the retention purge,
-- which runs as the table owner or service role.
create or replace function public.academic_guard_audit_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    or (coalesce(auth.role(), '') not in ('service_role', '')
        and current_user not in ('postgres', 'supabase_admin')) then
    raise exception 'Audit events are append-only' using errcode = 'insufficient_privilege';
  end if;
  return old;
end;
$$;

create or replace trigger academic_audit_events_guard
  before update or delete on public.academic_audit_events
  for each row execute function public.academic_guard_audit_event();

-- Revisions are immutable once written; they disappear only with their line.
create or replace function public.academic_block_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;

create or replace trigger academic_score_revisions_immutable
  before update on public.academic_score_revisions
  for each row execute function public.academic_block_update();

-- ─── updated_at on configuration tables ──────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_education_structures', 'academic_grades', 'academic_years',
    'academic_grading_scales', 'academic_schools', 'academic_calendar_templates',
    'academic_reporting_periods', 'academic_subjects', 'academic_subject_aliases'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.academic_touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end;
$$;

-- ─── Lock everything down until DB-002 adds policies ─────────────────────────

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'academic\_%'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

revoke all on function public.academic_record_score_revision() from public, anon, authenticated;
