-- My Scores — analysis engine v1, descriptive (BE-004, #24).
--
-- Phase 1 computes F1–F5 only (PRD §20.2), deterministically in NUMERIC:
--   F1 period mean      unweighted mean of numeric scores; shown only when
--                       coverage = recorded / active >= 0.5. not_applicable and
--                       exempt leave the denominator; missing stays in it.
--   F2 subject mean     last 6 submitted monthly periods (CALC-2), >= 2 values
--   F3 period change    vs the last earlier valid period (CALC-3)
--   F4 subject change   latest value vs the subject's last earlier value
--   F5 rolling mean     mean of 3 consecutive valid periods
-- Changes with |Δ| < 0.25 × (max − min)/10 are "same" (CALC-1).
-- Drafts and non-monthly periods never feed the engine. No labels, trends,
-- significance or comparison with other students (ANALYSIS-008).
--
-- Every change of inputs writes a new immutable snapshot with input_hash,
-- engine_version and config_version (ANALYSIS-006). Unchanged inputs reuse
-- the latest snapshot. Values are stored at full precision; clients round
-- for display (half away from zero, §19.3).

-- ─── Config ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_analysis_configs (
  id          uuid primary key default gen_random_uuid(),
  version     integer not null unique check (version > 0),
  thresholds  jsonb not null check (jsonb_typeof(thresholds) = 'object'),
  notes       text,
  active_from timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

insert into public.academic_analysis_configs (version, thresholds, notes, active_from) values
  (1, '{"window_size": 6, "coverage_min": 0.5, "about_same_band": 0.25, "rolling_k": 3}',
   'Phase 1 defaults; CALC-1..3 in the decision register.', '2026-01-01')
on conflict (version) do nothing;

create or replace trigger academic_analysis_configs_immutable
  before update on public.academic_analysis_configs
  for each row execute function public.academic_block_update();
create or replace trigger academic_analysis_configs_audit
  after insert or update or delete on public.academic_analysis_configs
  for each row execute function public.academic_audit_config_change();

alter table public.academic_analysis_configs enable row level security;
revoke all on public.academic_analysis_configs from anon, authenticated;
grant select, insert on public.academic_analysis_configs to authenticated;
drop policy if exists academic_analysis_configs_read on public.academic_analysis_configs;
create policy academic_analysis_configs_read on public.academic_analysis_configs
  for select to authenticated using (true);
drop policy if exists academic_analysis_configs_admin_insert on public.academic_analysis_configs;
create policy academic_analysis_configs_admin_insert on public.academic_analysis_configs
  for insert to authenticated with check ((select public.academic_is_admin()));

-- ─── Snapshots ───────────────────────────────────────────────────────────────

create table if not exists public.academic_analysis_snapshots (
  id             uuid primary key default gen_random_uuid(),
  enrolment_id   uuid not null references public.academic_enrolments(id) on delete cascade,
  engine_version varchar(32) not null,
  config_version integer not null,
  input_hash     char(64) not null,
  outputs        jsonb not null,
  created_at     timestamptz not null default now()
);

create index if not exists academic_analysis_snapshots_latest_idx
  on public.academic_analysis_snapshots (enrolment_id, created_at desc);
create index if not exists academic_analysis_snapshots_hash_idx
  on public.academic_analysis_snapshots (enrolment_id, input_hash);

create or replace trigger academic_analysis_snapshots_immutable
  before update on public.academic_analysis_snapshots
  for each row execute function public.academic_block_update();

alter table public.academic_analysis_snapshots enable row level security;
revoke all on public.academic_analysis_snapshots from anon, authenticated;
grant select on public.academic_analysis_snapshots to authenticated;
drop policy if exists academic_analysis_snapshots_owner_read on public.academic_analysis_snapshots;
create policy academic_analysis_snapshots_owner_read on public.academic_analysis_snapshots
  for select to authenticated using (public.academic_can_read_enrolment(enrolment_id));

-- Snapshots contain score values, so deleting scores deletes them too
-- (PRIV-005 'scores' scope). The next dashboard view rebuilds one.
create or replace function public.academic_drop_snapshots_for_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academic_analysis_snapshots where enrolment_id = old.enrolment_id;
  return null;
end;
$$;

create or replace trigger academic_score_entries_drop_snapshots
  after delete on public.academic_score_entries
  for each row execute function public.academic_drop_snapshots_for_entry();

-- ─── Engine ──────────────────────────────────────────────────────────────────

create or replace function public.academic_engine_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'f1-f5@1.0.0'::text;
$$;

-- Returns the id of a snapshot that matches the enrolment's current inputs,
-- writing a new one when they changed.
create or replace function public.academic_build_snapshot(p_enrolment_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_enrolment public.academic_enrolments;
  v_scale public.academic_grading_scale_versions;
  v_config public.academic_analysis_configs;
  v_numeric boolean;
  v_band numeric;
  v_coverage_min numeric;
  v_window integer;
  v_hash text;
  v_latest public.academic_analysis_snapshots;
  v_period record;
  v_periods jsonb := '[]'::jsonb;
  v_means jsonb := '{}'::jsonb;
  v_prev_id uuid;
  v_prev_seq integer;
  v_prev_mean numeric;
  v_mean numeric;
  v_delta numeric;
  v_rolling numeric;
  v_window_seqs integer[];
  v_latest_seq integer;
  v_subjects jsonb;
  v_summary jsonb;
  v_id uuid;
begin
  select * into v_enrolment from public.academic_enrolments where id = p_enrolment_id;
  if v_enrolment.id is null then
    return null;
  end if;
  select * into v_scale from public.academic_grading_scale_versions where id = v_enrolment.grading_scale_version_id;
  select * into v_config from public.academic_analysis_configs where active_from <= now() order by version desc limit 1;

  v_numeric := v_scale.scale_family = 'numeric_linear';
  v_band := coalesce((v_config.thresholds->>'about_same_band')::numeric, 0.25)
    * case when v_numeric then (v_scale.max_value - v_scale.min_value) / 10 else 1 end;
  v_coverage_min := coalesce((v_config.thresholds->>'coverage_min')::numeric, 0.5);
  v_window := coalesce((v_config.thresholds->>'window_size')::integer, 6);

  -- Inputs: submitted monthly lines + subject applicability + versions.
  select encode(sha256(convert_to(concat_ws('#',
    public.academic_engine_version(), v_config.version, v_scale.id,
    (select string_agg(concat_ws('|', p.sequence, l.subject_enrolment_id, l.status, l.raw_value, l.ordinal_code), ';'
              order by p.sequence, l.subject_enrolment_id)
     from public.academic_score_entries en
     join public.academic_reporting_periods p on p.id = en.reporting_period_id
     join public.academic_score_lines l on l.score_entry_id = en.id and l.is_current
     where en.enrolment_id = v_enrolment.id and en.state = 'submitted' and p.period_type = 'monthly'),
    (select string_agg(concat_ws('|', p.sequence, en.id), ';' order by p.sequence)
     from public.academic_score_entries en
     join public.academic_reporting_periods p on p.id = en.reporting_period_id
     where en.enrolment_id = v_enrolment.id and en.state = 'submitted' and p.period_type = 'monthly'),
    (select string_agg(concat_ws('|', se.id, se.start_period_seq, se.end_period_seq, se.display_order, se.custom_name), ';' order by se.id)
     from public.academic_subject_enrolments se where se.enrolment_id = v_enrolment.id)
  ), 'UTF8')), 'hex') into v_hash;

  select * into v_latest from public.academic_analysis_snapshots
  where enrolment_id = v_enrolment.id order by created_at desc, id desc limit 1;
  if v_latest.input_hash = v_hash then
    return v_latest.id;
  end if;

  -- F1, F3, F5 over every submitted monthly period, in sequence order.
  for v_period in
    with per as (
      select p.id, p.sequence, p.label_lo, p.label_en, p.start_date, en.id as entry_id
      from public.academic_score_entries en
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      where en.enrolment_id = v_enrolment.id and en.state = 'submitted' and p.period_type = 'monthly'
    ),
    lines as (
      select per.id as period_id, l.subject_enrolment_id, l.status, l.raw_value
      from per join public.academic_score_lines l on l.score_entry_id = per.entry_id and l.is_current
    ),
    -- Subjects on the form that period, plus any that hold a score there,
    -- minus not_applicable / exempt.
    active as (
      select per.id as period_id, se.id as subject_enrolment_id
      from per
      join public.academic_subject_enrolments se on se.enrolment_id = v_enrolment.id
      where (se.start_period_seq <= per.sequence and (se.end_period_seq is null or per.sequence <= se.end_period_seq))
         or exists (select 1 from lines l where l.period_id = per.id and l.subject_enrolment_id = se.id and l.status = 'scored')
      except
      select period_id, subject_enrolment_id from lines where status in ('not_applicable', 'exempt')
    )
    select per.*,
      (select count(*) from lines l where l.period_id = per.id and l.status = 'scored') as recorded,
      (select count(*) from active a where a.period_id = per.id) as active_count,
      (select count(*) from active a where a.period_id = per.id
         and not exists (select 1 from lines l where l.period_id = per.id and l.subject_enrolment_id = a.subject_enrolment_id and l.status = 'scored')) as missing,
      (select avg(l.raw_value) from lines l where l.period_id = per.id and l.status = 'scored' and l.raw_value is not null) as mean_all
    from per
    order by per.sequence
  loop
    v_mean := case
      when v_numeric and v_period.active_count > 0 and v_period.recorded > 0
        and v_period.recorded::numeric / v_period.active_count >= v_coverage_min
      then v_period.mean_all
    end;
    v_delta := null;
    v_rolling := null;

    if v_mean is not null then
      if v_prev_id is not null then
        v_delta := v_mean - v_prev_mean;
      end if;
      if v_means ? (v_period.sequence - 1)::text and v_means ? (v_period.sequence - 2)::text then
        v_rolling := (v_mean + (v_means->>(v_period.sequence - 1)::text)::numeric
                             + (v_means->>(v_period.sequence - 2)::text)::numeric) / 3;
      end if;
    end if;

    v_periods := v_periods || jsonb_build_array(jsonb_build_object(
      'period_id', v_period.id,
      'sequence', v_period.sequence,
      'key', to_char(v_period.start_date, 'YYYY-MM'),
      'label_lo', v_period.label_lo,
      'label_en', v_period.label_en,
      'recorded', v_period.recorded,
      'active', v_period.active_count,
      'missing', v_period.missing,
      'coverage', case when v_period.active_count > 0 then v_period.recorded::numeric / v_period.active_count end,
      'mean', v_mean,
      'change', case when v_delta is null then null else jsonb_build_object(
        'value', v_delta,
        'direction', case when abs(v_delta) < v_band then 'same' when v_delta > 0 then 'up' else 'down' end,
        'compared_period_id', v_prev_id,
        'skipped_periods', v_period.sequence - v_prev_seq - 1
      ) end,
      'rolling_mean', v_rolling
    ));

    if v_mean is not null then
      v_means := v_means || jsonb_build_object(v_period.sequence::text, v_mean);
      v_prev_id := v_period.id;
      v_prev_seq := v_period.sequence;
      v_prev_mean := v_mean;
    end if;
  end loop;

  -- F2 window: the last N submitted monthly periods (CALC-2).
  select array_agg(seq order by seq), max(seq) into v_window_seqs, v_latest_seq
  from (
    select (p->>'sequence')::integer as seq from jsonb_array_elements(v_periods) as p
    order by (p->>'sequence')::integer desc limit v_window
  ) w;

  -- Per subject: series, F2 mean, F4 latest change.
  select coalesce(jsonb_agg(subject order by (subject->>'active')::boolean desc, (subject->>'display_order')::integer, subject->>'subject_enrolment_id'), '[]'::jsonb)
  into v_subjects
  from (
    select jsonb_build_object(
      'subject_enrolment_id', se.id,
      'code', s.code,
      'name_lo', coalesce(se.custom_name, s.name_lo),
      'name_en', coalesce(se.custom_name, s.name_en),
      'display_order', se.display_order,
      'active', v_latest_seq is not null and se.start_period_seq <= v_latest_seq
        and (se.end_period_seq is null or v_latest_seq <= se.end_period_seq),
      'series', coalesce(series.points, '[]'::jsonb),
      'window_n', coalesce(win.n, 0),
      'mean', case when v_numeric and win.n >= 2 then win.mean end,
      'latest', latest.point,
      'change', case when v_numeric and latest.value is not null and prior.value is not null then jsonb_build_object(
        'value', latest.value - prior.value,
        'direction', case when abs(latest.value - prior.value) < v_band then 'same'
                          when latest.value > prior.value then 'up' else 'down' end,
        'compared_period_id', prior.period_id
      ) end
    ) as subject
    from public.academic_subject_enrolments se
    left join public.academic_subjects s on s.id = se.subject_id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'period_id', p.id, 'sequence', p.sequence, 'status', l.status,
        'value', coalesce(to_jsonb(l.raw_value), to_jsonb(l.ordinal_code))
      ) order by p.sequence) as points
      from public.academic_score_lines l
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      where l.subject_enrolment_id = se.id and l.is_current and en.state = 'submitted' and p.period_type = 'monthly'
    ) series on true
    left join lateral (
      select count(*)::integer as n, avg(l.raw_value) as mean
      from public.academic_score_lines l
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      where l.subject_enrolment_id = se.id and l.is_current and en.state = 'submitted' and p.period_type = 'monthly'
        and l.status = 'scored' and l.raw_value is not null and p.sequence = any (v_window_seqs)
    ) win on true
    left join lateral (
      select p.sequence, l.raw_value as value,
        jsonb_build_object('period_id', p.id, 'sequence', p.sequence, 'status', l.status,
          'value', coalesce(to_jsonb(l.raw_value), to_jsonb(l.ordinal_code))) as point
      from public.academic_score_lines l
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      where l.subject_enrolment_id = se.id and l.is_current and en.state = 'submitted' and p.period_type = 'monthly'
        and p.sequence = v_latest_seq
    ) latest on true
    left join lateral (
      select p.id as period_id, l.raw_value as value
      from public.academic_score_lines l
      join public.academic_score_entries en on en.id = l.score_entry_id
      join public.academic_reporting_periods p on p.id = en.reporting_period_id
      where l.subject_enrolment_id = se.id and l.is_current and en.state = 'submitted' and p.period_type = 'monthly'
        and l.status = 'scored' and l.raw_value is not null and p.sequence < v_latest_seq
      order by p.sequence desc
      limit 1
    ) prior on true
    where se.enrolment_id = v_enrolment.id
      and (series.points is not null
           or (v_latest_seq is not null and se.start_period_seq <= v_latest_seq
               and (se.end_period_seq is null or v_latest_seq <= se.end_period_seq)))
  ) subjects;

  select jsonb_build_object(
    'latest_period_id', p->'period_id',
    'mean', p->'mean',
    'coverage', jsonb_build_object('recorded', p->'recorded', 'active', p->'active'),
    'missing', p->'missing',
    'change', p->'change',
    'rolling_mean', p->'rolling_mean'
  ) into v_summary
  from jsonb_array_elements(v_periods) as p
  order by (p->>'sequence')::integer desc
  limit 1;

  insert into public.academic_analysis_snapshots (enrolment_id, engine_version, config_version, input_hash, outputs)
  values (v_enrolment.id, public.academic_engine_version(), v_config.version, v_hash, jsonb_build_object(
    'engine_version', public.academic_engine_version(),
    'config_version', v_config.version,
    'numeric', v_numeric,
    'scale', public.academic_scale_json(v_scale.id),
    'about_same_band', v_band,
    'window_period_sequences', to_jsonb(coalesce(v_window_seqs, '{}')),
    'periods', v_periods,
    'subjects', v_subjects,
    'summary', v_summary
  ))
  returning id into v_id;
  return v_id;
end;
$$;

-- Submitted scores or subjects changed: refresh the snapshot now, so the
-- dashboard reflects the change immediately (SCORE-006/007).
create or replace function public.academic_on_scores_changed(p_enrolment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.academic_build_snapshot(p_enrolment_id);
end;
$$;

-- ─── Dashboard (PRD §27.2 #13) ───────────────────────────────────────────────

-- The current snapshot for an enrolment (default: the active one, else the
-- most recent). Rebuilt on read if inputs changed since it was written.
create or replace function public.academic_get_dashboard(p_enrolment_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_enrolment public.academic_enrolments;
  v_snapshot public.academic_analysis_snapshots;
  v_snapshot_id uuid;
begin
  if p_enrolment_id is not null then
    select * into v_enrolment from public.academic_enrolments
    where id = p_enrolment_id and student_profile_id = v_profile.id;
    if v_enrolment.id is null then
      return public.academic_deny('enrolment', p_enrolment_id);
    end if;
  else
    select * into v_enrolment from public.academic_enrolments
    where student_profile_id = v_profile.id
    order by state = 'active' desc, created_at desc
    limit 1;
    if v_enrolment.id is null then
      perform public.academic_raise('NO_ACTIVE_ENROLMENT', 409, 'There is no school year yet');
    end if;
  end if;

  -- Build first: a snapshot inserted inside the same statement that reads
  -- the table would not be visible to that statement.
  v_snapshot_id := public.academic_build_snapshot(v_enrolment.id);
  select * into v_snapshot from public.academic_analysis_snapshots where id = v_snapshot_id;

  return jsonb_build_object(
    'snapshot_id', v_snapshot.id,
    'snapshot_created_at', v_snapshot.created_at,
    'enrolment', (
      select jsonb_build_object(
        'id', e.id, 'academic_year', y.code, 'state', e.state, 'read_only', e.state = 'closed',
        'grade', jsonb_build_object('code', g.code, 'label_lo', g.label_lo, 'label_en', g.label_en),
        'school', jsonb_build_object('name_lo', coalesce(sc.name_lo, e.school_free_text),
          'name_en', coalesce(sc.name_en, sc.name_lo, e.school_free_text), 'verification', e.school_verification),
        'closed_reason', e.closed_reason,
        'start_period_seq', e.start_period_seq,
        'end_period_seq', e.end_period_seq
      )
      from public.academic_enrolments e
      join public.academic_years y on y.id = e.academic_year_id
      join public.academic_grades g on g.id = e.grade_id
      left join public.academic_schools sc on sc.id = e.school_id
      where e.id = v_enrolment.id
    )
  ) || v_snapshot.outputs;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_drop_snapshots_for_entry() from public, anon, authenticated;
revoke all on function public.academic_engine_version() from public, anon;
grant execute on function public.academic_engine_version() to authenticated;
revoke all on function public.academic_build_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.academic_on_scores_changed(uuid) from public, anon, authenticated;
revoke all on function public.academic_get_dashboard(uuid) from public, anon;
grant execute on function public.academic_get_dashboard(uuid) to authenticated;
