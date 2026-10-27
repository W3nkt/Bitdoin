-- My Scores — compare a subject across school years (P3-PAR #52, DASH-007).
--
-- For one of the caller's subjects, returns the same subject (same catalogue
-- subject, or the same custom name) in each of the student's other school
-- years, aligned by calendar month (September ... August). Only submitted
-- months count. Two years can be compared when both scales are the same
-- family and normalisable (PRD §18); otherwise the year is listed with the
-- reason and no values. When the scales differ in range the screen compares
-- normalised values (share of the scale); when they match it uses the scale.
-- Free for everyone: charts never lock (BILLING-006).

create or replace function public.academic_compare_years(p_subject_enrolment_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_subject public.academic_subject_enrolments;
  v_enrolment public.academic_enrolments;
  v_scale public.academic_grading_scale_versions;
  v_years jsonb;
begin
  select se.* into v_subject from public.academic_subject_enrolments se
  join public.academic_enrolments e on e.id = se.enrolment_id
  where se.id = p_subject_enrolment_id and e.student_profile_id = v_profile.id;
  if v_subject.id is null then
    return public.academic_deny('subject_enrolment', p_subject_enrolment_id);
  end if;
  select * into v_enrolment from public.academic_enrolments where id = v_subject.enrolment_id;
  select * into v_scale from public.academic_grading_scale_versions where id = v_enrolment.grading_scale_version_id;

  select coalesce(jsonb_agg(y order by y->>'year' desc), '[]'::jsonb) into v_years
  from (
    select jsonb_build_object(
      'subject_enrolment_id', se.id,
      'current', se.id = v_subject.id,
      'year', ay.code,
      'grade_en', g.label_en, 'grade_lo', g.label_lo,
      'scale', jsonb_build_object('family', sv.scale_family, 'min', sv.min_value, 'max', sv.max_value, 'normalisable', sv.normalisable),
      'compatible', se.id = v_subject.id or (sv.scale_family = v_scale.scale_family and sv.normalisable and v_scale.normalisable),
      'reason', case
        when se.id = v_subject.id then null
        when sv.scale_family <> v_scale.scale_family then 'different_scale'
        when not (sv.normalisable and v_scale.normalisable) then 'not_normalisable'
      end,
      'series', case when se.id = v_subject.id or (sv.scale_family = v_scale.scale_family and sv.normalisable and v_scale.normalisable) then coalesce((
        select jsonb_agg(jsonb_build_object(
            'month', extract(month from rp.start_date)::int,
            'label_en', rp.label_en, 'label_lo', rp.label_lo,
            'status', l.status, 'value', l.raw_value, 'normalised', l.normalised_value)
          order by rp.start_date)
        from public.academic_score_entries en
        join public.academic_reporting_periods rp on rp.id = en.reporting_period_id and rp.period_type = 'monthly'
        join public.academic_score_lines l on l.score_entry_id = en.id and l.subject_enrolment_id = se.id and l.is_current
        where en.enrolment_id = e.id and en.state = 'submitted'), '[]'::jsonb) end
    ) as y
    from public.academic_enrolments e
    join public.academic_subject_enrolments se on se.enrolment_id = e.id
      and ((v_subject.subject_id is not null and se.subject_id = v_subject.subject_id)
        or (v_subject.subject_id is null and se.subject_id is null and lower(btrim(se.custom_name)) = lower(btrim(v_subject.custom_name))))
    join public.academic_years ay on ay.id = e.academic_year_id
    join public.academic_grades g on g.id = e.grade_id
    join public.academic_grading_scale_versions sv on sv.id = e.grading_scale_version_id
    where e.student_profile_id = v_profile.id
  ) t;

  return jsonb_build_object(
    'subject', (select jsonb_build_object('name_en', coalesce(s.name_en, v_subject.custom_name), 'name_lo', coalesce(s.name_lo, v_subject.custom_name))
                from (select 1) x left join public.academic_subjects s on s.id = v_subject.subject_id),
    'years', v_years);
end;
$$;

revoke all on function public.academic_compare_years(uuid) from public, anon;
grant execute on function public.academic_compare_years(uuid) to authenticated;
