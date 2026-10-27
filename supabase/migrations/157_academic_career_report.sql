-- My Scores — the career report and its one-time purchase (P4-CAR #55, piece 4:
-- CAREER-006, BILLING-004; owner decisions 2026-10-27: 49,000 kip, included
-- in Academy Premium).
--
-- The report needs the 'career_report' feature: Academy Premium, a one-time
-- purchase (12 months) or a manual grant, on the student's account or on a
-- linked guardian's. It is built from the student's latest career result and
-- analysis snapshot and frozen when made: interests, each option with its
-- reasons, a preparation plan to Grade 12 (related subjects with the latest
-- scores, preparation steps), pathways in Laos (programmes, entrance group,
-- requirements and cut-offs with their year; anything past its review-by date
-- is left out, UNI-002), open scholarships, what changed across results, a
-- discussion guide for the family, sources with dates and a disclaimer.
--
-- The purchase reuses the Bitdoin payment workflow: the buyer (student or
-- guardian) pays by QR or bank transfer to an account on the plans page and
-- uploads the receipt to their own folder in 'premium-payment-proofs'; Finance
-- or an admin checks it and verifies, which grants 'career_report' for 12
-- months with the payment reference.

update public.academic_settings
set value = jsonb_set(value, '{career_report}', '{"free": false, "premium": true}')
where key = 'entitlement_features';

insert into public.academic_settings (key, value, description) values
  ('career_report_price', '{"price_lak": 49000, "months": 12}', 'BILLING-004: the one-time career report: price and how long it lasts (owner decision 2026-10-27).')
on conflict (key) do nothing;

-- ─── Purchases (BILLING-004) ─────────────────────────────────────────────────

create table if not exists public.academic_report_purchases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users(id) on delete cascade,
  amount_lak       integer not null check (amount_lak >= 0),
  status           text not null default 'pending' check (status in ('pending', 'review', 'verified', 'rejected', 'cancelled')),
  receipt_path     text,
  reference        text check (length(reference) <= 80),
  rejection_reason text check (length(rejection_reason) <= 200),
  grant_id         uuid references public.academic_entitlement_grants(id) on delete set null,
  reviewed_by      uuid references public.users(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists academic_report_purchases_one_open on public.academic_report_purchases (user_id) where status in ('pending', 'review');
create index if not exists academic_report_purchases_queue_idx on public.academic_report_purchases (status, created_at);
alter table public.academic_report_purchases enable row level security;
revoke all on public.academic_report_purchases from anon, authenticated;

create or replace function public.academic_report_purchase_json(p public.academic_report_purchases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', p.id, 'amount_lak', p.amount_lak, 'status', p.status, 'has_receipt', p.receipt_path is not null,
    'rejection_reason', p.rejection_reason, 'created_at', p.created_at, 'reviewed_at', p.reviewed_at,
    'valid_until', (select ends_at from public.academic_entitlement_grants where id = p.grant_id));
$$;

-- Any signed-in Bitdoin user (student or guardian) may buy.
create or replace function public.academic_my_report_purchase()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object(
    'price', public.academic_setting('career_report_price'),
    'entitled', public.academic_has_feature(v_user, 'career_report'),
    'purchase', (select public.academic_report_purchase_json(p) from public.academic_report_purchases p where p.user_id = v_user order by p.created_at desc limit 1));
end;
$$;

create or replace function public.academic_start_report_purchase()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  perform public.academic_rate_limit('write');
  if public.academic_has_feature(v_user, 'career_report') then
    perform public.academic_raise('REPORT_ALREADY_INCLUDED', 409, 'You already have the career report');
  end if;
  insert into public.academic_report_purchases (user_id, amount_lak)
  values (v_user, coalesce((public.academic_setting('career_report_price')->>'price_lak')::integer, 49000))
  on conflict do nothing;
  return public.academic_my_report_purchase();
end;
$$;

-- The receipt must be in the buyer's own folder (the bucket's rule too).
create or replace function public.academic_submit_report_receipt(p_purchase_id uuid, p_path text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_id uuid;
begin
  if coalesce(split_part(p_path, '/', 1), '') <> v_user::text or p_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$' then
    perform public.academic_invalid('path', 'Upload the receipt again');
  end if;
  update public.academic_report_purchases set receipt_path = p_path, status = 'review', updated_at = now()
  where id = p_purchase_id and user_id = v_user and status in ('pending', 'review')
  returning id into v_id;
  if v_id is null then
    return public.academic_deny('report_purchase', p_purchase_id);
  end if;
  perform public.academic_raise_alert('report_purchase', jsonb_build_object('purchase_id', v_id));
  return public.academic_my_report_purchase();
end;
$$;

create or replace function public.academic_cancel_report_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_id uuid;
begin
  update public.academic_report_purchases set status = 'cancelled', updated_at = now()
  where id = p_purchase_id and user_id = v_user and status in ('pending', 'review')
  returning id into v_id;
  if v_id is null then
    return public.academic_deny('report_purchase', p_purchase_id);
  end if;
  return public.academic_my_report_purchase();
end;
$$;

-- Finance or an admin checks the receipt and verifies or rejects.
create or replace function public.academic_admin_report_purchases(p_status text default 'review')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'FINANCE']);
begin
  return coalesce((select jsonb_agg(public.academic_report_purchase_json(p) || jsonb_build_object(
      'receipt_path', p.receipt_path, 'reference', p.reference,
      'buyer', (select jsonb_build_object('name', u.name, 'member_code', u.member_code) from public.users u where u.id = p.user_id),
      'reviewed_by', (select name from public.users where id = p.reviewed_by)) order by p.created_at)
    from public.academic_report_purchases p where p.status = coalesce(p_status, 'review')), '[]'::jsonb);
end;
$$;

create or replace function public.academic_admin_review_report_purchase(p_purchase_id uuid, p_action text, p_reference text default null, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'FINANCE']);
  v_purchase public.academic_report_purchases;
  v_grant uuid;
begin
  select * into v_purchase from public.academic_report_purchases where id = p_purchase_id and status = 'review' for update;
  if v_purchase.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'No purchase waiting for review');
  end if;
  if p_action = 'verify' then
    if length(btrim(coalesce(p_reference, ''))) < 3 then
      perform public.academic_invalid('reference', 'Add the payment reference from the bank');
    end if;
    insert into public.academic_entitlement_grants (user_id, feature_code, source, reason_code, note, reference, amount_lak, ends_at, granted_by)
    values (v_purchase.user_id, 'career_report', 'one_time_purchase', 'one_time_purchase', 'Career report purchase', btrim(p_reference), v_purchase.amount_lak,
            now() + make_interval(months => coalesce((public.academic_setting('career_report_price')->>'months')::integer, 12)), v_staff)
    returning id into v_grant;
    update public.academic_report_purchases
    set status = 'verified', reference = btrim(p_reference), grant_id = v_grant, reviewed_by = v_staff, reviewed_at = now(), updated_at = now()
    where id = v_purchase.id returning * into v_purchase;
  elsif p_action = 'reject' then
    if length(btrim(coalesce(p_reason, ''))) < 5 then
      perform public.academic_invalid('reason', 'Say why (5 characters or more)');
    end if;
    update public.academic_report_purchases
    set status = 'rejected', rejection_reason = btrim(p_reason), reviewed_by = v_staff, reviewed_at = now(), updated_at = now()
    where id = v_purchase.id returning * into v_purchase;
  else
    perform public.academic_invalid('action', 'Verify or reject');
  end if;
  perform public.academic_audit('report_purchase.' || p_action, 'report_purchase', v_purchase.id, null, 'success', left(coalesce(p_reference, p_reason), 200));
  return public.academic_report_purchase_json(v_purchase);
end;
$$;

alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test',
  'backup_failed', 'backup_stale', 'drill_failed', 'drill_stale',
  'priority_report', 'career_review_due', 'report_purchase'
));

-- ─── The report (CAREER-006) ─────────────────────────────────────────────────

create table if not exists public.academic_career_reports (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  content            jsonb not null,
  generated_at       timestamptz not null default now()
);
create index if not exists academic_career_reports_profile_idx on public.academic_career_reports (student_profile_id, generated_at desc);
alter table public.academic_career_reports enable row level security;
revoke all on public.academic_career_reports from anon, authenticated;

-- The student's own account, or an active guardian of theirs, has the report.
create or replace function public.academic_career_report_entitled(p_profile public.academic_student_profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_has_feature(p_profile.user_id, 'career_report')
      or exists (select 1 from public.academic_guardian_links l where l.student_profile_id = p_profile.id and l.status = 'active'
                 and public.academic_has_feature(l.guardian_user_id, 'career_report'));
$$;

-- The report includes the options, so having the report also shows them
-- (unchanged from 151 apart from that).
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
  if not (public.academic_has_feature(p_profile.user_id, 'career_options') or public.academic_career_report_entitled(p_profile)) then
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
    'options_locked', not (public.academic_has_feature(v_profile.user_id, 'career_options') or public.academic_career_report_entitled(v_profile)),
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

create or replace function public.academic_generate_career_report()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_assessment public.academic_career_assessments;
  v_result public.academic_career_results;
  v_enrolment public.academic_enrolments;
  v_snapshot public.academic_analysis_snapshots;
  v_options jsonb;
  v_report public.academic_career_reports;
begin
  if not public.academic_career_report_entitled(v_profile) then
    perform public.academic_raise('ENTITLEMENT_REQUIRED', 403, 'The career report needs Academy Premium or a one-time purchase', jsonb_build_object('feature', 'career_report'));
  end if;
  select * into v_assessment from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'completed' order by completed_at desc limit 1;
  if v_assessment.id is null then
    perform public.academic_raise('CAREER_NOT_STARTED', 409, 'Answer the career questions first');
  end if;
  v_result := public.academic_career_refresh(v_profile);
  if v_result.id is null then
    select * into v_result from public.academic_career_results where student_profile_id = v_profile.id order by created_at desc limit 1;
  end if;
  v_enrolment := public.academic_planner_enrolment(v_profile.id);
  if v_enrolment.id is not null then
    select * into v_snapshot from public.academic_analysis_snapshots where id = public.academic_build_snapshot(v_enrolment.id);
  end if;

  -- Each option: the career, its reasons, the preparation plan and pathways, without out-of-date facts.
  select coalesce(jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'cluster', o->>'cluster', 'factors', o->'factors',
      'title_en', c.published->>'title_en', 'title_lo', c.published->>'title_lo', 'summary_en', c.published->>'summary_en', 'summary_lo', c.published->>'summary_lo',
      'study_years', c.published->>'study_years',
      'preparation_en', coalesce(c.published->'preparation_en', '[]'::jsonb), 'preparation_lo', coalesce(c.published->'preparation_lo', '[]'::jsonb),
      'subjects', coalesce((select jsonb_agg(jsonb_build_object('code', s->>'code', 'name_en', s->>'name_en', 'name_lo', s->>'name_lo', 'latest', s->'latest'->'value', 'label', s->'label'->>'value'))
        from jsonb_array_elements(coalesce(v_snapshot.outputs->'subjects', '[]'::jsonb)) s
        where s->>'code' in (select jsonb_array_elements_text(c.published->'related_subjects'))), '[]'::jsonb),
      'facts', coalesce((select jsonb_agg(f - 'review_by') from jsonb_array_elements(coalesce(c.published->'facts', '[]'::jsonb)) f
        where (f->>'review_by')::date >= public.academic_today()), '[]'::jsonb),
      'programmes', coalesce((select jsonb_agg(jsonb_build_object(
          'name_en', p.published->>'name_en', 'name_lo', p.published->>'name_lo', 'faculty', p.published->>'faculty',
          'institution_en', i.published->>'name_en', 'institution_lo', i.published->>'name_lo', 'province_code', i.published->>'province_code',
          'degree_level', p.published->>'degree_level', 'duration_years', p.published->>'duration_years', 'entrance_group', nullif(p.published->>'entrance_group', ''),
          'requirements', coalesce((select jsonb_agg(r - 'review_by') from jsonb_array_elements(coalesce(p.published->'requirements', '[]'::jsonb)) r
            where (r->>'review_by')::date >= public.academic_today()), '[]'::jsonb),
          'source_name', p.published->>'source_name', 'source_url', p.published->>'source_url', 'verified_on', p.published->>'verified_on'))
        from public.academic_career_content p
        join public.academic_career_content i on i.kind = 'institution' and i.slug = p.published->>'institution' and i.status <> 'archived' and i.published is not null
        where p.kind = 'programme' and p.status <> 'archived' and p.published is not null
          and (p.published->>'review_by')::date >= public.academic_today()
          and p.published->'careers' ? c.slug), '[]'::jsonb)
    ) order by t.i), '[]'::jsonb) into v_options
  from jsonb_array_elements(coalesce(v_result.options, '[]'::jsonb)) with ordinality t(o, i)
  join public.academic_career_content c on c.kind = 'career' and c.slug = o->>'slug' and c.published is not null;

  insert into public.academic_career_reports (student_profile_id, content)
  values (v_profile.id, jsonb_build_object(
    'student_name', v_profile.display_name,
    'generated_at', now(),
    'school_year', (select code from public.academic_years where id = v_enrolment.academic_year_id),
    'grade_en', (select label_en from public.academic_grades where id = v_enrolment.grade_id),
    'grade_lo', (select label_lo from public.academic_grades where id = v_enrolment.grade_id),
    'scores_as_of', v_snapshot.created_at,
    'interests', v_assessment.area_scores->'areas',
    'questionnaire_on', v_assessment.completed_at,
    'preferences', v_assessment.preferences,
    'options', v_options,
    'scholarships', coalesce((select jsonb_agg(jsonb_build_object('name_en', published->>'name_en', 'name_lo', published->>'name_lo', 'provider', published->>'provider',
        'deadline', published->>'deadline', 'eligibility_en', published->>'eligibility_en', 'eligibility_lo', published->>'eligibility_lo',
        'source_name', published->>'source_name', 'source_url', published->>'source_url', 'verified_on', published->>'verified_on') order by published->>'deadline')
      from public.academic_career_content where kind = 'scholarship' and status <> 'archived' and published is not null
        and (published->>'deadline')::date >= public.academic_today() and (published->>'review_by')::date >= public.academic_today()), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('created_at', r.created_at, 'reason', r.reason, 'options', (select jsonb_agg(x->>'slug') from jsonb_array_elements(r.options) x)) order by r.created_at)
      from public.academic_career_results r where r.student_profile_id = v_profile.id), '[]'::jsonb)
  )) returning * into v_report;
  perform public.academic_audit('career.report', 'career_report', v_report.id, v_profile.id, 'success', null);
  return jsonb_build_object('id', v_report.id, 'generated_at', v_report.generated_at, 'content', v_report.content);
end;
$$;

create or replace function public.academic_career_reports()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return jsonb_build_object(
    'entitled', public.academic_career_report_entitled(v_profile),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'generated_at', generated_at) order by generated_at desc)
      from public.academic_career_reports where student_profile_id = v_profile.id), '[]'::jsonb));
end;
$$;

create or replace function public.academic_get_career_report(p_report_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_report public.academic_career_reports;
begin
  select * into v_report from public.academic_career_reports where id = p_report_id and student_profile_id = v_profile.id;
  if v_report.id is null then
    return public.academic_deny('career_report', p_report_id);
  end if;
  return jsonb_build_object('id', v_report.id, 'generated_at', v_report.generated_at, 'content', v_report.content);
end;
$$;

-- "Download my data": career reports go with careers.
create or replace function public.academic_export_my_career_reports()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('generated_at', generated_at, 'content', content) order by generated_at)
    from public.academic_career_reports where student_profile_id = v_profile.id), '[]'::jsonb);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array['academic_report_purchase_json(public.academic_report_purchases)', 'academic_career_report_entitled(public.academic_student_profiles)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_my_report_purchase()', 'academic_start_report_purchase()', 'academic_submit_report_receipt(uuid,text)', 'academic_cancel_report_purchase(uuid)',
    'academic_admin_report_purchases(text)', 'academic_admin_review_report_purchase(uuid,text,text,text)',
    'academic_generate_career_report()', 'academic_career_reports()', 'academic_get_career_report(uuid)', 'academic_export_my_career_reports()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
