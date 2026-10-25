-- My Scores — switch for subject labels and trends on the dashboard (P2-ANL, #49).
--
-- Engine v2 (migration 129) stores labels and trends in every snapshot. They
-- are Phase 2 features, so students only see them once `insights_enabled` is
-- true: until then the dashboard strips `label` and `trend` from each subject
-- and the Phase 1 pilot is unchanged. Snapshots keep them either way.

insert into public.academic_settings (key, value, description) values
  ('insights_enabled', 'false', 'Show subject labels and trends (engine v2) on the student dashboard (P2-ANL, #49).')
on conflict (key) do nothing;

-- As in migration 115, with labels and trends removed while the switch is off.
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
  v_outputs jsonb;
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

  v_outputs := v_snapshot.outputs;
  if public.academic_setting('insights_enabled') is distinct from 'true'::jsonb then
    v_outputs := jsonb_set(v_outputs, '{subjects}', (
      select coalesce(jsonb_agg(s.subject - 'label' - 'trend' order by s.ord), '[]'::jsonb)
      from jsonb_array_elements(v_outputs->'subjects') with ordinality as s(subject, ord)
    ));
  end if;

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
  ) || v_outputs;
end;
$$;

revoke all on function public.academic_get_dashboard(uuid) from public, anon;
grant execute on function public.academic_get_dashboard(uuid) to authenticated;
