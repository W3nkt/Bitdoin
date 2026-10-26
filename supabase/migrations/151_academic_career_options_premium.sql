-- My Scores — career options are an Academy Premium feature (P4-CAR #55;
-- owner decision CAREER-GUIDANCE, 2026-10-26).
--
-- Free students answer the questionnaire, see their interest levels and browse
-- every career; the 3–6 explained options need Academy Premium (feature
-- 'career_options'). When a Free student gets Premium, their options are
-- built from the questionnaire they already answered.

update public.academic_settings
set value = value || '{"career_options": {"free": false, "premium": true}}'::jsonb
where key = 'entitlement_features' and not value ? 'career_options';

-- Unchanged from 150 apart from the Premium check at the top.
create or replace function public.academic_career_refresh(p_profile public.academic_student_profiles, p_reason text default null)
returns public.academic_career_results
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_assessment public.academic_career_assessments;
  v_last public.academic_career_results;
  v_stronger record;
  v_options jsonb;
  v_result public.academic_career_results;
begin
  -- Options are an Academy Premium feature (owner decision 2026-10-26).
  if not public.academic_has_feature(p_profile.user_id, 'career_options') then
    return null;
  end if;
  select * into v_assessment from public.academic_career_assessments
  where student_profile_id = p_profile.id and status = 'completed' order by completed_at desc limit 1;
  if v_assessment.id is null then
    return null;
  end if;
  select * into v_last from public.academic_career_results where student_profile_id = p_profile.id order by created_at desc limit 1;
  select * into v_stronger from public.academic_career_stronger_subjects(p_profile.id);
  v_options := public.academic_career_rank(v_assessment.area_scores, v_assessment.preferences, v_stronger.codes,
    array(select career_slug from public.academic_career_shortlist where student_profile_id = p_profile.id));
  if v_last.id is not null and v_last.assessment_id = v_assessment.id and v_last.options = v_options then
    return v_last;
  end if;
  insert into public.academic_career_results (student_profile_id, assessment_id, snapshot_id, options, reason)
  values (p_profile.id, v_assessment.id, v_stronger.snapshot_id, v_options, coalesce(p_reason,
    case when v_last.id is null then v_assessment.reason
         when v_last.assessment_id <> v_assessment.id then v_assessment.reason
         when v_last.snapshot_id is distinct from v_stronger.snapshot_id then 'new_scores'
         else 'catalogue' end))
  returning * into v_result;
  return v_result;
end;
$$;

-- Unchanged from 150 apart from 'options_locked'.
create or replace function public.academic_get_career_guidance()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_rules jsonb := public.academic_setting('career_questionnaire');
  v_open public.academic_career_assessments;
  v_done public.academic_career_assessments;
  v_result public.academic_career_results;
  v_previous public.academic_career_results;
begin
  select * into v_open from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'in_progress';
  select * into v_done from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'completed' order by completed_at desc limit 1;
  if v_done.id is not null and v_profile.status <> 'read_only' then
    v_result := public.academic_career_refresh(v_profile);
  end if;
  if v_result.id is not null then
    select * into v_previous from public.academic_career_results where student_profile_id = v_profile.id and created_at < v_result.created_at order by created_at desc limit 1;
  end if;
  return jsonb_build_object(
    'questionnaire', jsonb_build_object('version', v_rules->'version', 'items', v_rules->'items', 'items_per_screen', v_rules->'items_per_screen', 'min_answered', v_rules->'min_answered'),
    'in_progress', case when v_open.id is not null then jsonb_build_object('answers', v_open.answers, 'preferences', v_open.preferences, 'reason', v_open.reason) end,
    'completed_at', v_done.completed_at,
    'area_scores', v_done.area_scores,
    'preferences', v_done.preferences,
    -- CAREER-007: after 90 days, or straight away when interests have changed.
    'retake_after', case when v_done.id is not null then (v_done.completed_at + make_interval(days => coalesce((v_rules->>'retake_days')::integer, 90)))::date end,
    'options_locked', not public.academic_has_feature(v_profile.user_id, 'career_options'),
    'catalogue_size', (select count(*) from public.academic_career_content where kind = 'career' and status <> 'archived' and published is not null),
    'result', case when v_result.id is not null then jsonb_build_object(
      'created_at', v_result.created_at, 'reason', v_result.reason, 'has_scores', v_result.snapshot_id is not null,
      'options', public.academic_career_options_json(v_result.options),
      'changes', case when v_previous.id is not null then jsonb_build_object(
        'since', v_previous.created_at, 'reason', v_result.reason,
        'added', (select coalesce(jsonb_agg(o->>'slug'), '[]'::jsonb) from jsonb_array_elements(v_result.options) o
                  where not exists (select 1 from jsonb_array_elements(v_previous.options) p where p->>'slug' = o->>'slug')),
        'removed', (select coalesce(jsonb_agg(p->>'slug'), '[]'::jsonb) from jsonb_array_elements(v_previous.options) p
                    where not exists (select 1 from jsonb_array_elements(v_result.options) o where o->>'slug' = p->>'slug'))) end) end,
    'shortlist', coalesce((select jsonb_agg(career_slug order by created_at) from public.academic_career_shortlist where student_profile_id = v_profile.id), '[]'::jsonb),
    'subject_names', (select coalesce(jsonb_object_agg(code, jsonb_build_object('en', name_en, 'lo', name_lo)), '{}'::jsonb) from public.academic_subjects)
  );
end;
$$;
