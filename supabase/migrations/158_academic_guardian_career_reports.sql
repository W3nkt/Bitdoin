-- My Scores — guardians see the child's career reports (P4-CAR #55; owner
-- decision 2026-10-27 on CAREER-REPORT): only by the guardian's own active
-- link and only while the child shares career answers with them (the
-- 'careers' scope). Turning the scope off or ending the link hides them at
-- once, because access is checked on every read (QG-4). Every view is
-- audit-logged.

-- The child's reports for one link: newest first, or shared = false.
create or replace function public.academic_guardian_career_reports(p_link_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_link public.academic_guardian_links;
begin
  select * into v_link from public.academic_guardian_links where id = p_link_id and guardian_user_id = v_user and status = 'active';
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  if not public.academic_guardian_can_read(v_link.student_profile_id, 'careers') then
    return jsonb_build_object('shared', false, 'reports', '[]'::jsonb);
  end if;
  return jsonb_build_object('shared', true, 'reports', coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'generated_at', r.generated_at) order by r.generated_at desc)
    from public.academic_career_reports r where r.student_profile_id = v_link.student_profile_id), '[]'::jsonb));
end;
$$;

-- One report, frozen as the child made it.
create or replace function public.academic_guardian_career_report(p_report_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_report public.academic_career_reports;
  v_link uuid;
begin
  select * into v_report from public.academic_career_reports where id = p_report_id;
  select id into v_link from public.academic_guardian_links
  where student_profile_id = v_report.student_profile_id and guardian_user_id = v_user and status = 'active';
  if v_report.id is null or v_link is null or not public.academic_guardian_can_read(v_report.student_profile_id, 'careers') then
    return public.academic_deny('career_report', p_report_id);
  end if;
  perform public.academic_audit('guardian.career_report_view', 'career_report', v_report.id, v_report.student_profile_id, 'success', null);
  return jsonb_build_object('id', v_report.id, 'link_id', v_link, 'generated_at', v_report.generated_at, 'content', v_report.content);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['academic_guardian_career_reports(uuid)', 'academic_guardian_career_report(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
