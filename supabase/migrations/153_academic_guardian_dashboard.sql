-- My Scores — the guardian's view of a child (P3-PAR #52, piece 2: PARENT-005).
--
-- One child at a time, by the guardian's own active link; never a comparison
-- between children. Each section appears only if the child shares it:
--   scores      months, monthly averages and changes, subjects with latest
--               score, average, change, how it compares with the child's own
--               average and the trend (from the latest analysis snapshot)
--   plan        study goals and this week's tasks done
--   careers     interest levels and saved careers
--   goals_text  the goals the child wrote at sign-up
-- Coach chats, photos and consents are never included. Up to three
-- suggestions are phrased as ways to support, never as judgements
-- (e.g. "Ask what topic felt hardest this month"). Every view is audit-logged.

create or replace function public.academic_guardian_child(p_link_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_link public.academic_guardian_links;
  v_profile public.academic_student_profiles;
  v_enrolment public.academic_enrolments;
  v_snapshot public.academic_analysis_snapshots;
  v_scores jsonb;
  v_suggestions jsonb := '[]'::jsonb;
  v_week date := date_trunc('week', public.academic_today())::date;
begin
  select l.* into v_link from public.academic_guardian_links l
  join public.academic_student_profiles p on p.id = l.student_profile_id
  where l.id = p_link_id and l.guardian_user_id = v_user and l.status = 'active' and p.consent_state = 'active';
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  select * into v_profile from public.academic_student_profiles where id = v_link.student_profile_id;
  v_enrolment := public.academic_planner_enrolment(v_profile.id);

  if (v_link.scopes->>'scores')::boolean and v_enrolment.id is not null then
    select * into v_snapshot from public.academic_analysis_snapshots where id = public.academic_build_snapshot(v_enrolment.id);
    v_scores := jsonb_build_object(
      'scale', public.academic_scale_json(v_enrolment.grading_scale_version_id) - 'id' - 'code' - 'version' - 'levels',
      'months', coalesce((select jsonb_agg(jsonb_build_object('label_en', p->>'label_en', 'label_lo', p->>'label_lo', 'average', p->'mean', 'change', p->'change'->'value',
          'recorded', p->'recorded') order by (p->>'sequence')::integer)
        from jsonb_array_elements(coalesce(v_snapshot.outputs->'periods', '[]'::jsonb)) p), '[]'::jsonb),
      'subjects', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'latest', s->'latest'->'value', 'average', s->'mean',
          'change', s->'change'->'value', 'label', s->'label'->>'value', 'trend', s->'trend'->>'value',
          'number_of_scores', (select count(*) from jsonb_array_elements(coalesce(s->'series', '[]'::jsonb)) pt where pt->>'status' = 'scored'))
          order by (s->>'display_order')::integer, s->>'name_en')
        from jsonb_array_elements(coalesce(v_snapshot.outputs->'subjects', '[]'::jsonb)) s where coalesce((s->>'active')::boolean, true)), '[]'::jsonb));

    -- Supportive suggestions (PARENT-005): what to ask or notice, never a verdict.
    select coalesce(jsonb_agg(x.v order by x.o), '[]'::jsonb) into v_suggestions from (
      select 1 as o, jsonb_build_object('kind', 'ask_hardest', 'subject_en', s->>'name_en', 'subject_lo', s->>'name_lo') as v
      from jsonb_array_elements(coalesce(v_scores->'subjects', '[]'::jsonb)) s where s->>'label' = 'relatively_lower'
      union all
      select 2, jsonb_build_object('kind', 'notice_progress', 'subject_en', s->>'name_en', 'subject_lo', s->>'name_lo')
      from jsonb_array_elements(coalesce(v_scores->'subjects', '[]'::jsonb)) s where s->>'trend' = 'improving'
      union all
      select 3, jsonb_build_object('kind', 'check_in')
      -- The latest month's average went down.
      where (select (m->>'change')::numeric from jsonb_array_elements(v_scores->'months') with ordinality t(m, i) order by i desc limit 1) < 0
      union all
      select 4, jsonb_build_object('kind', 'start_together') where jsonb_array_length(v_scores->'months') = 0
      union all
      select 5, jsonb_build_object('kind', 'ask_support')
    ) x;
    v_suggestions := (select coalesce(jsonb_agg(e), '[]'::jsonb) from (select e from jsonb_array_elements(v_suggestions) with ordinality t(e, i) where i <= 3) y);
  end if;

  perform public.academic_audit('guardian.view', 'guardian_link', v_link.id, v_profile.id, 'success', left((select string_agg(k, ',') from jsonb_each_text(v_link.scopes) j(k, v) where v = 'true'), 200));
  return jsonb_build_object(
    'link_id', v_link.id, 'name', v_profile.display_name, 'relationship', v_link.relationship, 'scopes', v_link.scopes,
    'grade_en', (select label_en from public.academic_grades where id = v_enrolment.grade_id),
    'grade_lo', (select label_lo from public.academic_grades where id = v_enrolment.grade_id),
    'school_year', (select code from public.academic_years where id = v_enrolment.academic_year_id),
    'scores', v_scores,
    'suggestions', v_suggestions,
    'plan', case when (v_link.scopes->>'plan')::boolean then jsonb_build_object(
      'goals', coalesce((select jsonb_agg(public.academic_goal_json(g) - 'id' - 'subject_enrolment_id' - 'version' order by g.created_at)
                         from public.academic_learning_goals g where g.student_profile_id = v_profile.id and g.status = 'active'), '[]'::jsonb),
      'week', (select jsonb_build_object('done', count(*) filter (where t.state = 'done'), 'total', count(*))
               from public.academic_study_tasks t where t.student_profile_id = v_profile.id and t.week_start = v_week),
      'has_plan', exists (select 1 from public.academic_study_plans where student_profile_id = v_profile.id)) end,
    'careers', case when (v_link.scopes->>'careers')::boolean then jsonb_build_object(
      'interests', (select a.area_scores->'areas' from public.academic_career_assessments a where a.student_profile_id = v_profile.id and a.status = 'completed' order by a.completed_at desc limit 1),
      'saved', coalesce((select jsonb_agg(jsonb_build_object('title_en', c.published->>'title_en', 'title_lo', c.published->>'title_lo') order by l.created_at)
                         from public.academic_career_shortlist l join public.academic_career_content c on c.kind = 'career' and c.slug = l.career_slug and c.published is not null
                         where l.student_profile_id = v_profile.id), '[]'::jsonb)) end,
    'goals_text', case when (v_link.scopes->>'goals_text')::boolean then v_profile.goals end
  );
end;
$$;

revoke all on function public.academic_guardian_child(uuid) from public, anon;
grant execute on function public.academic_guardian_child(uuid) to authenticated;
