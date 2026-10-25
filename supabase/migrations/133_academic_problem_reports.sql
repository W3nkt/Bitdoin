-- My Scores — "Report a problem" (P2-ANL #49 epic: PRIV-008).
--
-- Any signed-in user can report from any Schooling screen. Categories:
-- guardian_link, ai_answer, account_misuse (safety: priority, first response
-- within 1 business day) and other (3 business days). Business days are
-- Monday–Friday in Vientiane time (UTC+7, no daylight saving); public holidays
-- are not counted yet. Each priority report raises its own alert e-mail with
-- the category and due time only, never the student's words (NFR-017).
-- Support (ADMIN, OPERATIONS) works the queue; every change is audited.
-- Reports are support records: they stay when a Schooling profile is deleted
-- (unlinked from it) and go with the Bitdoin account; part of "Download my data".

insert into public.academic_settings (key, value, description) values
  ('problem_report_rules', '{"priority_business_days": 1, "normal_business_days": 3, "daily_limit": 5}',
   'PRIV-008: first-response targets in business days, and reports a user can send per 24 hours.')
on conflict (key) do nothing;

alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test',
  'backup_failed', 'backup_stale', 'drill_failed', 'drill_stale',
  'priority_report'
));

create table if not exists public.academic_problem_reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_user_id   uuid not null references public.users(id) on delete cascade,
  student_profile_id uuid references public.academic_student_profiles(id) on delete set null,
  category           text not null check (category in ('guardian_link', 'ai_answer', 'account_misuse', 'other')),
  priority           text not null check (priority in ('priority', 'normal')),
  screen             varchar(200),
  description        text not null check (length(btrim(description)) between 5 and 2000),
  status             text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  first_response_due timestamptz not null,
  responded_at       timestamptz,
  handled_by         uuid references public.users(id) on delete set null,
  resolution_note    text check (resolution_note is null or length(resolution_note) <= 500),
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists academic_problem_reports_queue_idx on public.academic_problem_reports (status, first_response_due);
create index if not exists academic_problem_reports_reporter_idx on public.academic_problem_reports (reporter_user_id, created_at desc);
alter table public.academic_problem_reports enable row level security;
revoke all on public.academic_problem_reports from anon, authenticated;

create or replace trigger academic_problem_reports_touch
  before update on public.academic_problem_reports
  for each row execute function public.academic_touch_updated_at();

-- p_days business days (Mon–Fri, Vientiane time) after p_from, same clock time.
create or replace function public.academic_add_business_days(p_from timestamptz, p_days integer)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_local timestamp := (p_from at time zone 'UTC') + interval '7 hours';
  v_added integer := 0;
begin
  while v_added < p_days loop
    v_local := v_local + interval '1 day';
    if extract(isodow from v_local) < 6 then
      v_added := v_added + 1;
    end if;
  end loop;
  return (v_local - interval '7 hours') at time zone 'UTC';
end;
$$;

create or replace function public.academic_report_rule(p_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.academic_setting('problem_report_rules')->>p_key)::integer,
    case p_key when 'priority_business_days' then 1 when 'normal_business_days' then 3 else 5 end);
$$;

-- Input: category, description, screen? (the page path). Returns id, priority
-- and the first-response target.
create or replace function public.academic_report_problem(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_category text := p_input->>'category';
  v_description text := btrim(coalesce(p_input->>'description', ''));
  v_screen text := nullif(left(split_part(btrim(coalesce(p_input->>'screen', '')), '?', 1), 200), '');
  v_priority text;
  v_report public.academic_problem_reports;
begin
  if v_category is null or v_category not in ('guardian_link', 'ai_answer', 'account_misuse', 'other') then
    perform public.academic_invalid('category', 'Choose what the problem is about');
  end if;
  if length(v_description) not between 5 and 2000 then
    perform public.academic_invalid('description', 'Describe the problem in 5 to 2,000 characters');
  end if;
  if (select count(*) from public.academic_problem_reports where reporter_user_id = v_user and created_at > now() - interval '24 hours')
     >= public.academic_report_rule('daily_limit') then
    perform public.academic_raise('RATE_LIMITED', 429, 'Too many reports today; try again tomorrow');
  end if;

  v_priority := case when v_category = 'other' then 'normal' else 'priority' end;
  insert into public.academic_problem_reports (reporter_user_id, student_profile_id, category, priority, screen, description, first_response_due)
  values (v_user, (select id from public.academic_student_profiles where user_id = v_user), v_category, v_priority, v_screen, v_description,
          public.academic_add_business_days(now(), public.academic_report_rule(case when v_priority = 'priority' then 'priority_business_days' else 'normal_business_days' end)))
  returning * into v_report;

  perform public.academic_audit('support.report', 'problem_report', v_report.id, v_report.student_profile_id, 'success', v_category);
  if v_priority = 'priority' then
    -- One alert per safety report (no 24-hour de-duplication); no free text.
    insert into public.academic_alerts (kind, details)
    values ('priority_report', jsonb_build_object('category', v_category, 'first_response_due', v_report.first_response_due));
  end if;
  return jsonb_build_object('id', v_report.id, 'priority', v_report.priority, 'first_response_due', v_report.first_response_due);
end;
$$;

-- PRIV-004: the caller's reports for "Download my data".
create or replace function public.academic_export_my_reports()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object('reports', coalesce((
    select jsonb_agg(jsonb_build_object('category', r.category, 'screen', r.screen, 'description', r.description,
      'status', r.status, 'created_at', r.created_at, 'resolved_at', r.resolved_at) order by r.created_at)
    from public.academic_problem_reports r where r.reporter_user_id = v_user
  ), '[]'::jsonb));
end;
$$;

-- ─── Support queue (ADMIN, OPERATIONS) ───────────────────────────────────────

-- Filter: status ('open' | 'in_progress' | 'resolved' | 'all'; default: open
-- and in progress). Priority first, then the earliest due.
create or replace function public.academic_support_list_reports(p_status text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'category', r.category, 'priority', r.priority, 'screen', r.screen, 'description', r.description,
      'status', r.status, 'first_response_due', r.first_response_due, 'responded_at', r.responded_at,
      'overdue', r.responded_at is null and r.status = 'open' and r.first_response_due < now(),
      'reporter_member_code', u.member_code, 'handled_by_name', h.name, 'resolution_note', r.resolution_note,
      'resolved_at', r.resolved_at, 'created_at', r.created_at
    ) order by r.status = 'resolved', r.priority = 'normal', r.first_response_due)
    from public.academic_problem_reports r
    join public.users u on u.id = r.reporter_user_id
    left join public.users h on h.id = r.handled_by
    where case coalesce(p_status, 'active')
      when 'active' then r.status in ('open', 'in_progress')
      when 'all' then true
      else r.status = p_status
    end
  ), '[]'::jsonb);
end;
$$;

-- in_progress (first response) or resolved (note required).
create or replace function public.academic_support_update_report(p_report_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
  v_report public.academic_problem_reports;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_report from public.academic_problem_reports where id = p_report_id for update;
  if v_report.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Report not found'); end if;
  if p_status not in ('in_progress', 'resolved') or v_report.status = 'resolved' or v_report.status = p_status then
    perform public.academic_raise('REPORT_BAD_TRANSITION', 409, 'This report cannot move to ' || coalesce(p_status, '?'));
  end if;
  if p_status = 'resolved' and length(coalesce(v_note, '')) < 5 then
    perform public.academic_invalid('note', 'Say how it was resolved (5 characters or more)');
  end if;
  update public.academic_problem_reports
  set status = p_status, handled_by = v_staff, responded_at = coalesce(responded_at, now()),
      resolution_note = case when p_status = 'resolved' then left(v_note, 500) else resolution_note end,
      resolved_at = case when p_status = 'resolved' then now() end
  where id = v_report.id
  returning * into v_report;
  perform public.academic_audit('support.report_' || p_status, 'problem_report', v_report.id, v_report.student_profile_id, 'success', left(v_note, 200));
  return jsonb_build_object('id', v_report.id, 'status', v_report.status, 'responded_at', v_report.responded_at);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_add_business_days(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.academic_report_rule(text) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_report_problem(jsonb)', 'academic_export_my_reports()',
    'academic_support_list_reports(text)', 'academic_support_update_report(uuid,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
