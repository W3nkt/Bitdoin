-- My Scores — career catalogue with sources and four-eyes publication
-- (P4-CAR #55, piece 1: CAREER-005, CAREER-008, UNI-001, UNI-002, UNI-004,
-- ADMIN-010; decisions OD-10, OD-20).
--
-- One catalogue (CAREER-008): a career here has the same slug as the Academy
-- Career Explorer (src/data/careerPaths.ts) and adds what career guidance
-- needs (interest areas, cluster, related school subjects, study length, work
-- settings), new Lao pathway careers, institutions and programmes.
--
-- Every record has a working copy (draft) and a published copy. Students only
-- ever see published copies. An admin edits the working copy and sends it for
-- review; a different admin approves it (four-eyes, UNI-001), which copies it
-- to the published copy. Time-sensitive facts (salary, demand, entrance
-- requirements, cut-offs) need a source, a link, a verified date and a
-- review-by date (UNI-002/004); cut-offs and requirements also need their
-- academic year. Past their review-by date they are labelled out of date
-- (CAREER-005). A weekly check alerts the admins 30 days before anything
-- needs review.

-- ─── Content ─────────────────────────────────────────────────────────────────

create table if not exists public.academic_career_content (
  id                  uuid primary key default gen_random_uuid(),
  kind                text not null check (kind in ('career', 'institution', 'programme')),
  slug                text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  draft               jsonb not null,
  published           jsonb,
  status              text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  -- Earliest review-by date in each copy (the record's own or any fact's).
  review_by           date,
  published_review_by date,
  author_id           uuid references public.users(id) on delete set null,
  last_edited_by      uuid references public.users(id) on delete set null,
  submitted_at        timestamptz,
  reviewed_by         uuid references public.users(id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text check (length(review_note) <= 500),
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (kind, slug)
);
create index if not exists academic_career_content_status_idx on public.academic_career_content (kind, status);

alter table public.academic_career_content enable row level security;
revoke all on public.academic_career_content from anon, authenticated;

insert into public.academic_settings (key, value, description) values
  ('career_four_eyes_required', 'true', 'UNI-001: career content is published only when a different admin approves it.'),
  ('career_rules', '{"clusters": ["technology", "engineering", "health", "business", "creative", "environment_agriculture", "education", "law_public", "tourism_hospitality"], "review_warning_days": 30}',
   'P4-CAR: career clusters, and how many days before a review-by date the admins are alerted.')
on conflict (key) do nothing;

-- ─── Validation ──────────────────────────────────────────────────────────────

create or replace function public.academic_career_is_url(p_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_value ~ '^https?://[^\s/$.?#][^\s]*$', false);
$$;

create or replace function public.academic_career_is_date(p_value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform p_value::date;
  return p_value ~ '^\d{4}-\d{2}-\d{2}$';
exception when others then
  return false;
end;
$$;

-- A sourced, dated fact (UNI-002): source name and link, verified on, review by.
create or replace function public.academic_career_fact_problems(p_fact jsonb, p_need_year boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_fact->>'text_en'), '') is null or nullif(btrim(p_fact->>'text_lo'), '') is null then 'Write it in English and Lao'
    when nullif(btrim(p_fact->>'source_name'), '') is null then 'Name the source'
    when not public.academic_career_is_url(p_fact->>'source_url') then 'Add the source link (https://…)'
    when p_need_year and nullif(btrim(p_fact->>'academic_year'), '') is null then 'Add the academic year it applies to'
    when not public.academic_career_is_date(p_fact->>'verified_on') then 'Add the date it was checked'
    when not public.academic_career_is_date(p_fact->>'review_by') then 'Add a review-by date'
    when (p_fact->>'review_by')::date <= (p_fact->>'verified_on')::date then 'The review-by date must come after the check date'
  end;
$$;

-- Missing or invalid fields of a working copy: {} when it can be sent for review.
create or replace function public.academic_career_problems(p_kind text, p_data jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_problems jsonb := '{}'::jsonb;
  v_clusters jsonb := coalesce(public.academic_setting('career_rules')->'clusters', '[]'::jsonb);
  v_item jsonb;
  v_problem text;
  v_i integer := 0;
  v_value text;
begin
  -- Names in both languages for every kind.
  foreach v_value in array case p_kind when 'career' then array['title_en', 'title_lo'] else array['name_en', 'name_lo'] end loop
    if nullif(btrim(p_data->>v_value), '') is null then
      v_problems := v_problems || jsonb_build_object(v_value, 'Required');
    end if;
  end loop;

  if p_kind = 'career' then
    if not v_clusters ? coalesce(p_data->>'cluster', '') then v_problems := v_problems || '{"cluster": "Choose a cluster"}'; end if;
    if coalesce(p_data->>'primary_area', '') !~ '^[RIASEC]$' then v_problems := v_problems || '{"primary_area": "Choose the main interest area"}'; end if;
    if coalesce(p_data->>'secondary_area', '') !~ '^[RIASEC]?$' or p_data->>'secondary_area' = p_data->>'primary_area' then
      v_problems := v_problems || '{"secondary_area": "Choose a different area or none"}';
    end if;
    if jsonb_typeof(coalesce(p_data->'related_subjects', '[]')) <> 'array' or jsonb_array_length(coalesce(p_data->'related_subjects', '[]')) > 4
       or exists (select 1 from jsonb_array_elements_text(coalesce(p_data->'related_subjects', '[]')) c where not exists (select 1 from public.academic_subjects s where s.code = c)) then
      v_problems := v_problems || '{"related_subjects": "Up to 4 school subjects from the list"}';
    end if;
    if coalesce(p_data->>'study_years', '') not in ('le3', '4to5', '6plus') then v_problems := v_problems || '{"study_years": "Choose a typical study length"}'; end if;
    if jsonb_typeof(coalesce(p_data->'work_settings', '[]')) <> 'array' or jsonb_array_length(coalesce(p_data->'work_settings', '[]')) = 0
       or exists (select 1 from jsonb_array_elements_text(p_data->'work_settings') w where w not in ('office', 'outdoors', 'workshop_lab', 'with_people')) then
      v_problems := v_problems || '{"work_settings": "Choose at least one work setting"}';
    end if;
    if nullif(btrim(p_data->>'summary_en'), '') is null or nullif(btrim(p_data->>'summary_lo'), '') is null then
      v_problems := v_problems || '{"summary": "Write a summary in English and Lao"}';
    end if;
    for v_item in select * from jsonb_array_elements(coalesce(p_data->'facts', '[]')) loop
      v_i := v_i + 1;
      v_problem := case when coalesce(v_item->>'kind', '') not in ('salary', 'demand', 'employers', 'other') then 'Choose what kind of fact it is'
                        else public.academic_career_fact_problems(v_item, false) end;
      if v_problem is not null then v_problems := v_problems || jsonb_build_object('facts.' || v_i, v_problem); end if;
    end loop;

  elsif p_kind = 'institution' then
    if coalesce(p_data->>'type', '') not in ('university', 'college', 'tvet', 'other') then v_problems := v_problems || '{"type": "Choose a type"}'; end if;
    if nullif(btrim(p_data->>'province_code'), '') is null then v_problems := v_problems || '{"province_code": "Choose a province"}'; end if;
    if not public.academic_career_is_url(p_data->>'website_url') then v_problems := v_problems || '{"website_url": "Add the official website (https://…)"}'; end if;
    v_problem := public.academic_career_fact_problems(p_data || jsonb_build_object('text_en', p_data->>'name_en', 'text_lo', p_data->>'name_lo'), false);
    if v_problem is not null then v_problems := v_problems || jsonb_build_object('source', v_problem); end if;
    if exists (select 1 from jsonb_array_elements(coalesce(p_data->'faculties', '[]')) f where nullif(btrim(f->>'name_lo'), '') is null and nullif(btrim(f->>'name_en'), '') is null) then
      v_problems := v_problems || '{"faculties": "Each faculty needs a name"}';
    end if;

  elsif p_kind = 'programme' then
    if not exists (select 1 from public.academic_career_content where kind = 'institution' and slug = p_data->>'institution' and status <> 'archived') then
      v_problems := v_problems || '{"institution": "Choose the institution"}';
    end if;
    if coalesce(p_data->>'degree_level', '') not in ('certificate', 'diploma', 'higher_diploma', 'bachelor', 'master', 'doctorate') then
      v_problems := v_problems || '{"degree_level": "Choose a degree level"}';
    end if;
    if coalesce(p_data->>'duration_years', '') !~ '^\d+(\.\d+)?$' or (p_data->>'duration_years')::numeric not between 0.5 and 8 then
      v_problems := v_problems || '{"duration_years": "Duration in years (0.5 to 8)"}';
    end if;
    if coalesce(p_data->>'entrance_group', '') !~ '^[A-Z]?$' then v_problems := v_problems || '{"entrance_group": "One letter, or leave empty if not confirmed"}'; end if;
    v_problem := public.academic_career_fact_problems(p_data || jsonb_build_object('text_en', p_data->>'name_en', 'text_lo', p_data->>'name_lo'), false);
    if v_problem is not null then v_problems := v_problems || jsonb_build_object('source', v_problem); end if;
    if exists (select 1 from jsonb_array_elements_text(coalesce(p_data->'careers', '[]')) c
               where not exists (select 1 from public.academic_career_content where kind = 'career' and slug = c)) then
      v_problems := v_problems || '{"careers": "Link only careers in the catalogue"}';
    end if;
    -- UNI-004: requirements and cut-offs only with an official source and their year.
    for v_item in select * from jsonb_array_elements(coalesce(p_data->'requirements', '[]')) loop
      v_i := v_i + 1;
      v_problem := case when coalesce(v_item->>'kind', '') not in ('requirement', 'cutoff') then 'Choose requirement or cut-off'
                        else public.academic_career_fact_problems(v_item, true) end;
      if v_problem is not null then v_problems := v_problems || jsonb_build_object('requirements.' || v_i, v_problem); end if;
    end loop;
  end if;
  return v_problems;
end;
$$;

-- The earliest review-by date in a copy.
create or replace function public.academic_career_review_by(p_data jsonb)
returns date
language sql
immutable
set search_path = ''
as $$
  select min(d) from (
    select (p_data->>'review_by')::date as d where public.academic_career_is_date(p_data->>'review_by')
    union all
    select (f->>'review_by')::date from jsonb_array_elements(coalesce(p_data->'facts', '[]') || coalesce(p_data->'requirements', '[]')) f
    where public.academic_career_is_date(f->>'review_by')
  ) x;
$$;

-- ─── Admin (ADMIN-010) ───────────────────────────────────────────────────────

create or replace function public.academic_career_content_json(p_row public.academic_career_content, p_admin uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_row.id, 'kind', p_row.kind, 'slug', p_row.slug, 'status', p_row.status,
    'draft', p_row.draft, 'published', p_row.published, 'changed', p_row.published is distinct from p_row.draft,
    'problems', public.academic_career_problems(p_row.kind, p_row.draft),
    'review_by', p_row.review_by, 'published_review_by', p_row.published_review_by,
    'author', (select name from public.users where id = p_row.author_id),
    'last_edited_by', (select name from public.users where id = p_row.last_edited_by),
    'reviewed_by', (select name from public.users where id = p_row.reviewed_by),
    'review_note', p_row.review_note, 'submitted_at', p_row.submitted_at, 'published_at', p_row.published_at, 'updated_at', p_row.updated_at,
    'can_approve', p_row.status = 'in_review' and (public.academic_setting('career_four_eyes_required') is distinct from 'true'::jsonb
                   or (p_admin is distinct from p_row.author_id and p_admin is distinct from p_row.last_edited_by))
  );
$$;

create or replace function public.academic_admin_career_content(p_kind text, p_status text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(public.academic_career_content_json(c, v_admin) order by (c.status = 'in_review') desc, coalesce(c.draft->>'title_en', c.draft->>'name_en'))
      from public.academic_career_content c
      where c.kind = p_kind and (p_status is null or c.status = p_status)
    ), '[]'::jsonb),
    'clusters', public.academic_setting('career_rules')->'clusters',
    'subjects', (select jsonb_agg(jsonb_build_object('code', code, 'name_en', name_en) order by code) from public.academic_subjects),
    'institutions', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name_en', draft->>'name_en') order by draft->>'name_en'), '[]'::jsonb)
                     from public.academic_career_content where kind = 'institution' and status <> 'archived'),
    'careers', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title_en', draft->>'title_en') order by draft->>'title_en'), '[]'::jsonb)
                from public.academic_career_content where kind = 'career' and status <> 'archived')
  );
end;
$$;

-- Create or edit a working copy. Students keep seeing the published copy
-- until a different admin approves the change.
create or replace function public.academic_admin_save_career_content(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_id uuid := nullif(p_input->>'id', '')::uuid;
  v_kind text := p_input->>'kind';
  v_data jsonb := p_input->'data';
  v_row public.academic_career_content;
  v_slug text := lower(nullif(btrim(p_input->>'slug'), ''));
begin
  if v_kind not in ('career', 'institution', 'programme') then perform public.academic_invalid('kind', 'Unknown content kind'); end if;
  if jsonb_typeof(v_data) is distinct from 'object' then perform public.academic_invalid('data', 'Send the record'); end if;

  if v_id is null then
    v_slug := coalesce(v_slug, case when v_kind = 'programme' then 'p-' || substr(md5(gen_random_uuid()::text), 1, 10) end);
    if v_slug is null or v_slug !~ '^[a-z0-9][a-z0-9-]{1,63}$' then perform public.academic_invalid('slug', 'Lower-case letters, digits and hyphens'); end if;
    if exists (select 1 from public.academic_career_content where kind = v_kind and slug = v_slug) then
      perform public.academic_invalid('slug', 'Already used');
    end if;
    insert into public.academic_career_content (kind, slug, draft, status, review_by, author_id, last_edited_by)
    values (v_kind, v_slug, v_data, 'draft', public.academic_career_review_by(v_data), v_admin, v_admin)
    returning * into v_row;
  else
    select * into v_row from public.academic_career_content where id = v_id and kind = v_kind for update;
    if v_row.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Not found'); end if;
    if v_row.status = 'archived' then perform public.academic_raise('CAREER_ARCHIVED', 409, 'Restore it before editing'); end if;
    update public.academic_career_content
    set draft = v_data, review_by = public.academic_career_review_by(v_data), last_edited_by = v_admin,
        status = case when v_data is not distinct from published then 'published' else 'draft' end,
        submitted_at = null, updated_at = now()
    where id = v_row.id returning * into v_row;
  end if;
  perform public.academic_audit('career.save', 'career_content', v_row.id, null, 'success', v_kind || ':' || v_row.slug);
  return public.academic_career_content_json(v_row, v_admin);
end;
$$;

-- submit | approve | return | archive | restore (UNI-001 four-eyes on approve).
create or replace function public.academic_admin_review_career_content(p_id uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_row public.academic_career_content;
  v_problems jsonb;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.academic_career_content where id = p_id for update;
  if v_row.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Not found'); end if;
  if p_action in ('return', 'archive') and length(coalesce(v_note, '')) < 5 then
    perform public.academic_invalid('note', 'Say why (5 characters or more)');
  end if;

  if p_action = 'submit' and v_row.status = 'draft' then
    v_problems := public.academic_career_problems(v_row.kind, v_row.draft);
    if v_problems <> '{}'::jsonb then
      perform public.academic_raise('CAREER_INCOMPLETE', 400, 'Finish the record before sending it for review', jsonb_build_object('problems', v_problems));
    end if;
    update public.academic_career_content set status = 'in_review', submitted_at = now(), review_note = null, updated_at = now()
    where id = v_row.id returning * into v_row;
  elsif p_action = 'approve' and v_row.status = 'in_review' then
    if public.academic_setting('career_four_eyes_required') is not distinct from 'true'::jsonb
       and (v_admin is not distinct from v_row.author_id or v_admin is not distinct from v_row.last_edited_by) then
      perform public.academic_raise('FOUR_EYES_REQUIRED', 403, 'Another admin must approve a record you wrote or edited');
    end if;
    v_problems := public.academic_career_problems(v_row.kind, v_row.draft);
    if v_problems <> '{}'::jsonb then
      perform public.academic_raise('CAREER_INCOMPLETE', 400, 'This record is no longer complete', jsonb_build_object('problems', v_problems));
    end if;
    update public.academic_career_content
    set status = 'published', published = draft, published_review_by = review_by, published_at = now(),
        reviewed_by = v_admin, reviewed_at = now(), review_note = v_note, updated_at = now()
    where id = v_row.id returning * into v_row;
  elsif p_action = 'return' and v_row.status = 'in_review' then
    update public.academic_career_content set status = 'draft', reviewed_by = v_admin, reviewed_at = now(), review_note = v_note, updated_at = now()
    where id = v_row.id returning * into v_row;
  elsif p_action = 'archive' and v_row.status <> 'archived' then
    update public.academic_career_content set status = 'archived', review_note = v_note, updated_at = now()
    where id = v_row.id returning * into v_row;
  elsif p_action = 'restore' and v_row.status = 'archived' then
    update public.academic_career_content set status = case when published is null or published is distinct from draft then 'draft' else 'published' end, updated_at = now()
    where id = v_row.id returning * into v_row;
  else
    perform public.academic_raise('CAREER_BAD_TRANSITION', 409, 'This record cannot be ' || coalesce(p_action, '?') || ' from ' || v_row.status,
      jsonb_build_object('status', v_row.status, 'action', p_action));
  end if;
  perform public.academic_audit('career.' || p_action, 'career_content', v_row.id, null, 'success', left(v_note, 200));
  return public.academic_career_content_json(v_row, v_admin);
end;
$$;

-- ─── Review-by dates (UNI-002) ───────────────────────────────────────────────

-- Published records with something to review within the warning window (or overdue).
create or replace function public.academic_career_due(p_days integer default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'slug', c.slug, 'name', coalesce(c.published->>'title_en', c.published->>'name_en'),
    'review_by', c.published_review_by, 'overdue', c.published_review_by < public.academic_today()
  ) order by c.published_review_by), '[]'::jsonb)
  from public.academic_career_content c
  where c.status <> 'archived' and c.published is not null
    and c.published_review_by <= public.academic_today()
        + coalesce(p_days, (public.academic_setting('career_rules')->>'review_warning_days')::integer, 30);
$$;

create or replace function public.academic_admin_career_due()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
begin
  return public.academic_career_due();
end;
$$;

-- Weekly (cron below): one alert e-mail listing how many records need review.
create or replace function public.academic_career_review_check()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_due jsonb := public.academic_career_due();
begin
  if jsonb_array_length(v_due) = 0 then
    return false;
  end if;
  return public.academic_raise_alert('career_review_due', jsonb_build_object(
    'due', jsonb_array_length(v_due),
    'overdue', (select count(*) from jsonb_array_elements(v_due) d where (d->>'overdue')::boolean),
    'first', (select jsonb_agg(d->'name') from (select d from jsonb_array_elements(v_due) d limit 5) x)));
end;
$$;

alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test',
  'backup_failed', 'backup_stale', 'drill_failed', 'drill_stale',
  'priority_report', 'career_review_due'
));

-- ─── Students: the published catalogue (CAREER-005) ──────────────────────────

-- Each published fact and requirement says whether it is past its review-by
-- date ('out_of_date'); the screens label it "May be out of date".
create or replace function public.academic_career_mark_dates(p_data jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select p_data
    || jsonb_build_object('out_of_date', public.academic_career_is_date(p_data->>'review_by') and (p_data->>'review_by')::date < public.academic_today())
    || case when p_data ? 'facts' then jsonb_build_object('facts', (select coalesce(jsonb_agg(f || jsonb_build_object('out_of_date', (f->>'review_by')::date < public.academic_today())), '[]'::jsonb) from jsonb_array_elements(p_data->'facts') f)) else '{}'::jsonb end
    || case when p_data ? 'requirements' then jsonb_build_object('requirements', (select coalesce(jsonb_agg(f || jsonb_build_object('out_of_date', (f->>'review_by')::date < public.academic_today())), '[]'::jsonb) from jsonb_array_elements(p_data->'requirements') f)) else '{}'::jsonb end;
$$;

create or replace function public.academic_career_catalogue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object(
    'careers', coalesce((select jsonb_agg(public.academic_career_mark_dates(published) || jsonb_build_object('slug', slug) order by published->>'title_en')
                         from public.academic_career_content where kind = 'career' and status <> 'archived' and published is not null), '[]'::jsonb),
    'institutions', coalesce((select jsonb_agg(public.academic_career_mark_dates(published) || jsonb_build_object('slug', slug) order by published->>'name_en')
                              from public.academic_career_content where kind = 'institution' and status <> 'archived' and published is not null), '[]'::jsonb),
    'programmes', coalesce((select jsonb_agg(public.academic_career_mark_dates(p.published) || jsonb_build_object('slug', p.slug) order by p.published->>'name_en')
                            from public.academic_career_content p
                            where p.kind = 'programme' and p.status <> 'archived' and p.published is not null
                              and exists (select 1 from public.academic_career_content i where i.kind = 'institution' and i.slug = p.published->>'institution'
                                          and i.status <> 'archived' and i.published is not null)), '[]'::jsonb)
  );
end;
$$;

-- ─── Grants and schedule ─────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_career_is_url(text)', 'academic_career_is_date(text)', 'academic_career_fact_problems(jsonb,boolean)',
    'academic_career_problems(text,jsonb)', 'academic_career_review_by(jsonb)',
    'academic_career_content_json(public.academic_career_content,uuid)', 'academic_career_due(integer)',
    'academic_career_review_check()', 'academic_career_mark_dates(jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_admin_career_content(text,text)', 'academic_admin_save_career_content(jsonb)',
    'academic_admin_review_career_content(uuid,text,text)', 'academic_admin_career_due()', 'academic_career_catalogue()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-career-review-check';
select cron.schedule(
  'academic-career-review-check',
  '0 2 * * 1', -- Monday 09:00 Asia/Vientiane
  $$select public.academic_career_review_check();$$
);
