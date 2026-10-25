-- My Scores — analysis engine v2: subject labels and trends (P2-ANL, #49).
--
-- Adds per subject, on top of F1–F5 (migration 115), PRD §20.2–§20.6:
--   F6 relative deviation  d = x − M_t in the label window (last 6 submitted
--                          periods) where the period mean is shown; D = mean d
--   F7 consistency         share of those periods with d > 0 (stronger) or
--                          d < 0 (lower); d = 0 counts for neither (CALC-5)
--   F8 variability         sample SD of the subject's scores in the enrolment
--   F9 trend slope         Theil–Sen over (period sequence, score)
--   F10 significance       Mann–Kendall S with tie correction; two-sided p from
--                          the continuity-corrected normal approximation
-- Trends use every submitted period of the enrolment, not the 6-period window
-- (CALC-4), so n >= 8 and high trend confidence can be reached.
--
--   label  insufficient_evidence (n < 3) | relatively_stronger | relatively_lower | neutral
--          n = periods with a d; confidence high/medium/low for stronger and lower only
--   trend  insufficient_evidence (n < 4) | volatile | improving | declining | no_clear_trend
--          volatile wins when SD >= 1.0 regardless of slope (§20.5 as written);
--          confidence for improving/declining by n and p, for volatile by n alone
--          (§20.9 grades English "volatile, Medium" at p = 0.57)
-- Thresholds are on a 0–10 scale and scale with (max − min)/10. Comparisons
-- are made on sums and squares so boundary values are exact. Ordinal scales
-- get no labels or trends.
--
-- The engine version is part of the input hash, so every enrolment gets a new
-- snapshot on its next read; older snapshots are kept (ANALYSIS-006).

-- ─── Config v2 ───────────────────────────────────────────────────────────────

insert into public.academic_analysis_configs (version, thresholds, notes, active_from) values
  (2, '{"window_size": 6, "coverage_min": 0.5, "about_same_band": 0.25, "rolling_k": 3,
        "label_min_n": 3, "deviation_threshold": 0.75, "consistency_threshold": 0.6,
        "label_high_n": 6, "label_high_deviation_factor": 1.5, "label_high_consistency": 0.8, "label_medium_n": 4,
        "trend_window": "enrolment", "trend_min_n": 4, "slope_threshold": 0.15, "significance": 0.2,
        "volatility_sd": 1.0, "trend_high_n": 8, "trend_high_p": 0.05, "trend_medium_n": 6}',
   'Phase 2 labels and trends: PRD §20.3/§20.6 defaults; CALC-4, CALC-5 in the decision register.', '2026-10-25')
on conflict (version) do nothing;

-- ─── Statistics ──────────────────────────────────────────────────────────────

-- P(Z > |z|) for a standard normal Z: Hart (1968) as given by West (2005),
-- accurate to about 1e-14.
create or replace function public.academic_normal_tail(p_z double precision)
returns double precision
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_x double precision := abs(p_z);
  v_e double precision;
  v_num double precision;
  v_den double precision;
begin
  if v_x > 37 then
    return 0;
  end if;
  v_e := exp(-v_x * v_x / 2);
  if v_x < 7.07106781186547 then
    v_num := (((((3.52624965998911e-02 * v_x + 0.700383064443688) * v_x + 6.37396220353165) * v_x
      + 33.912866078383) * v_x + 112.079291497871) * v_x + 221.213596169931) * v_x + 220.206867912376;
    v_den := ((((((8.83883476483184e-02 * v_x + 1.75566716318264) * v_x + 16.064177579207) * v_x
      + 86.7807322029461) * v_x + 296.564248779674) * v_x + 637.333633378831) * v_x + 793.826512519948) * v_x
      + 440.413735824752;
    return v_e * v_num / v_den;
  end if;
  return v_e / (v_x + 1 / (v_x + 2 / (v_x + 3 / (v_x + 4 / (v_x + 0.65))))) / 2.506628274631;
end;
$$;

-- Two-sided Mann–Kendall p for values in time order (F10).
create or replace function public.academic_mann_kendall_p(p_values numeric[])
returns double precision
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n integer := coalesce(array_length(p_values, 1), 0);
  v_s integer := 0;
  v_ties bigint;
  v_var double precision;
begin
  if v_n < 2 then
    return null;
  end if;
  for a in 1 .. v_n - 1 loop
    for b in a + 1 .. v_n loop
      v_s := v_s + sign(p_values[b] - p_values[a])::integer;
    end loop;
  end loop;
  select coalesce(sum(t * (t - 1) * (2 * t + 5)), 0) into v_ties
  from (select count(*) as t from unnest(p_values) as x group by x) g;
  v_var := (v_n * (v_n - 1) * (2 * v_n + 5) - v_ties) / 18.0;
  if v_s = 0 or v_var <= 0 then
    return 1;
  end if;
  return least(1, 2 * public.academic_normal_tail((abs(v_s) - 1) / sqrt(v_var)));
end;
$$;

-- Theil–Sen slope (F9): median of the pairwise slopes over sequence numbers.
create or replace function public.academic_theil_sen(p_seqs integer[], p_values numeric[])
returns numeric
language sql
immutable
set search_path = ''
as $$
  with slopes as (
    select (p_values[b.i] - p_values[a.i]) / (p_seqs[b.i] - p_seqs[a.i])::numeric as slope
    from generate_subscripts(p_values, 1) as a(i)
    join generate_subscripts(p_values, 1) as b(i) on b.i > a.i
  ),
  ranked as (
    select slope, row_number() over (order by slope) as rn, count(*) over () as c from slopes
  )
  select avg(slope) from ranked where rn in ((c + 1) / 2, (c + 2) / 2);
$$;

-- ─── Labels and trends ───────────────────────────────────────────────────────

-- Label (§20.4) for one subject series. p_means: sequence -> shown period mean.
create or replace function public.academic_subject_label(
  p_series jsonb, p_means jsonb, p_window integer[], p_thresholds jsonb, p_k numeric)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_min integer := coalesce((p_thresholds->>'label_min_n')::integer, 3);
  v_dev numeric := coalesce((p_thresholds->>'deviation_threshold')::numeric, 0.75) * p_k;
  v_share numeric := coalesce((p_thresholds->>'consistency_threshold')::numeric, 0.6);
  v_high_n integer := coalesce((p_thresholds->>'label_high_n')::integer, 6);
  v_high_dev numeric := coalesce((p_thresholds->>'label_high_deviation_factor')::numeric, 1.5) * v_dev;
  v_high_share numeric := coalesce((p_thresholds->>'label_high_consistency')::numeric, 0.8);
  v_medium_n integer := coalesce((p_thresholds->>'label_medium_n')::integer, 4);
  v_n integer;
  v_sum numeric;
  v_above integer;
  v_below integer;
  v_value text := 'insufficient_evidence';
  v_side integer;
  v_confidence text;
begin
  select count(*)::integer, sum(d), (count(*) filter (where d > 0))::integer, (count(*) filter (where d < 0))::integer
  into v_n, v_sum, v_above, v_below
  from (
    select (pt->>'value')::numeric - (p_means->>(pt->>'sequence'))::numeric as d
    from jsonb_array_elements(p_series) as pt
    where pt->>'status' = 'scored' and jsonb_typeof(pt->'value') = 'number'
      and (pt->>'sequence')::integer = any (p_window) and p_means ? (pt->>'sequence')
  ) x;

  if v_n >= v_min then
    if v_sum >= v_dev * v_n and v_above >= v_share * v_n then
      v_value := 'relatively_stronger';
      v_side := v_above;
    elsif v_sum <= -v_dev * v_n and v_below >= v_share * v_n then
      v_value := 'relatively_lower';
      v_side := v_below;
    else
      v_value := 'neutral';
    end if;
  end if;
  if v_side is not null then
    v_confidence := case
      when v_n >= v_high_n and abs(v_sum) >= v_high_dev * v_n and v_side >= v_high_share * v_n then 'high'
      when v_n >= v_medium_n then 'medium'
      else 'low'
    end;
  end if;

  return jsonb_build_object(
    'value', v_value,
    'confidence', v_confidence,
    'rule', 'ANALYSIS-002.' || v_value,
    'n', v_n,
    'mean_deviation', case when v_n > 0 then v_sum / v_n end,
    'periods_above', v_above,
    'periods_below', v_below
  );
end;
$$;

-- Trend (§20.5) for one subject series over the whole enrolment (CALC-4).
create or replace function public.academic_subject_trend(p_series jsonb, p_thresholds jsonb, p_k numeric)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_min integer := coalesce((p_thresholds->>'trend_min_n')::integer, 4);
  v_slope_min numeric := coalesce((p_thresholds->>'slope_threshold')::numeric, 0.15) * p_k;
  v_alpha double precision := coalesce((p_thresholds->>'significance')::double precision, 0.2);
  v_sd_min numeric := coalesce((p_thresholds->>'volatility_sd')::numeric, 1.0) * p_k;
  v_high_n integer := coalesce((p_thresholds->>'trend_high_n')::integer, 8);
  v_high_p double precision := coalesce((p_thresholds->>'trend_high_p')::double precision, 0.05);
  v_medium_n integer := coalesce((p_thresholds->>'trend_medium_n')::integer, 6);
  v_seqs integer[];
  v_values numeric[];
  v_n integer;
  v_var numeric;
  v_slope numeric;
  v_p double precision;
  v_direction text;
  v_value text := 'no_clear_trend';
  v_confidence text;
begin
  select array_agg((pt->>'sequence')::integer order by (pt->>'sequence')::integer),
         array_agg((pt->>'value')::numeric order by (pt->>'sequence')::integer)
  into v_seqs, v_values
  from jsonb_array_elements(p_series) as pt
  where pt->>'status' = 'scored' and jsonb_typeof(pt->'value') = 'number';
  v_n := coalesce(array_length(v_values, 1), 0);

  if v_n < v_min then
    return jsonb_build_object('value', 'insufficient_evidence', 'confidence', null, 'rule', 'ANALYSIS-003.insufficient_evidence',
      'n', v_n, 'slope', null, 'p', null, 'sd', null, 'direction', null);
  end if;

  select var_samp(x) into v_var from unnest(v_values) as x;
  v_slope := public.academic_theil_sen(v_seqs, v_values);
  v_p := public.academic_mann_kendall_p(v_values);
  v_direction := case when v_slope >= v_slope_min then 'up' when v_slope <= -v_slope_min then 'down' else 'flat' end;

  if v_var >= v_sd_min * v_sd_min then
    v_value := 'volatile';
    v_confidence := case when v_n >= v_high_n then 'high' when v_n >= v_medium_n then 'medium' else 'low' end;
  elsif v_direction <> 'flat' and v_p < v_alpha then
    v_value := case when v_direction = 'up' then 'improving' else 'declining' end;
    v_confidence := case when v_n >= v_high_n and v_p < v_high_p then 'high' when v_n >= v_medium_n then 'medium' else 'low' end;
  end if;

  return jsonb_build_object(
    'value', v_value,
    'confidence', v_confidence,
    'rule', 'ANALYSIS-003.' || v_value,
    'n', v_n,
    'slope', v_slope,
    'p', v_p,
    'sd', sqrt(v_var),
    'direction', v_direction
  );
end;
$$;

-- Adds 'label' and 'trend' to each subject of a snapshot (null on ordinal scales).
create or replace function public.academic_analyse_subjects(
  p_subjects jsonb, p_means jsonb, p_window integer[], p_thresholds jsonb, p_k numeric, p_numeric boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.subject || jsonb_build_object(
    'label', case when p_numeric then public.academic_subject_label(s.subject->'series', p_means, p_window, p_thresholds, p_k) end,
    'trend', case when p_numeric then public.academic_subject_trend(s.subject->'series', p_thresholds, p_k) end
  ) order by s.ord), '[]'::jsonb)
  from jsonb_array_elements(p_subjects) with ordinality as s(subject, ord);
$$;

-- ─── Engine ──────────────────────────────────────────────────────────────────

create or replace function public.academic_engine_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'f1-f10@2.0.0'::text;
$$;

-- As in migration 115, plus labels and trends per subject.
--
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
  v_k numeric;
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
  v_k := case when v_numeric then (v_scale.max_value - v_scale.min_value) / 10 else 1 end;
  v_band := coalesce((v_config.thresholds->>'about_same_band')::numeric, 0.25) * v_k;
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
    'subjects', public.academic_analyse_subjects(v_subjects, v_means, v_window_seqs, v_config.thresholds, v_k, v_numeric),
    'summary', v_summary
  ))
  returning id into v_id;
  return v_id;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_normal_tail(double precision) from public, anon, authenticated;
revoke all on function public.academic_mann_kendall_p(numeric[]) from public, anon, authenticated;
revoke all on function public.academic_theil_sen(integer[], numeric[]) from public, anon, authenticated;
revoke all on function public.academic_subject_label(jsonb, jsonb, integer[], jsonb, numeric) from public, anon, authenticated;
revoke all on function public.academic_subject_trend(jsonb, jsonb, numeric) from public, anon, authenticated;
revoke all on function public.academic_analyse_subjects(jsonb, jsonb, integer[], jsonb, numeric, boolean) from public, anon, authenticated;
revoke all on function public.academic_build_snapshot(uuid) from public, anon, authenticated;
