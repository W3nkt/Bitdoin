-- My Scores — programme search, scholarships and deadline reminders
-- (P4-CAR #55, piece 3: UNI-003, UNI-005).
--
-- Programmes may name a field (one of the career clusters) so students can
-- search by field, institution, province and entrance group; a programme
-- whose group is not confirmed by an official source shows under "Group not
-- confirmed" (UNI-003). Scholarships are a fourth kind of career content,
-- published with the same four-eyes review; each needs its provider, year,
-- who can apply, a verified deadline and its official source (UNI-005).
-- Students only see scholarships whose deadline has not passed. A student can
-- save a scholarship and turn on reminders 14 and 3 days before the deadline.

alter table public.academic_career_content drop constraint if exists academic_career_content_kind_check;
-- not valid: a re-run (rollback rehearsal) must not fail on kinds added later (164).
alter table public.academic_career_content add constraint academic_career_content_kind_check check (kind in ('career', 'institution', 'programme', 'scholarship')) not valid;

alter table public.academic_notifications drop constraint if exists academic_notifications_category_check;
alter table public.academic_notifications add constraint academic_notifications_category_check check (category in ('score_reminder', 'guardian_link', 'guardian_report', 'scholarship_deadline'));

-- Fix from 148: a missing date returned null rather than false, so a missing
-- deadline, check date or review-by date passed validation.
create or replace function public.academic_career_is_date(p_value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_value is null or p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return false;
  end if;
  perform p_value::date;
  return true;
exception when others then
  return false;
end;
$$;

-- Unchanged from 148 apart from the programme field and scholarships.
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
    if nullif(p_data->>'field', '') is not null and not v_clusters ? (p_data->>'field') then v_problems := v_problems || '{"field": "Choose a field from the list"}'; end if;
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

  -- UNI-005: a scholarship needs its official source, its year and a verified deadline.
  elsif p_kind = 'scholarship' then
    if nullif(btrim(p_data->>'provider'), '') is null then v_problems := v_problems || '{"provider": "Who offers it"}'; end if;
    if not public.academic_career_is_date(p_data->>'deadline') then v_problems := v_problems || '{"deadline": "Add the application deadline"}'; end if;
    if nullif(btrim(p_data->>'academic_year'), '') is null then v_problems := v_problems || '{"academic_year": "Add the academic year"}'; end if;
    if nullif(p_data->>'institution', '') is not null and not exists (select 1 from public.academic_career_content where kind = 'institution' and slug = p_data->>'institution' and status <> 'archived') then
      v_problems := v_problems || '{"institution": "Choose an institution from the list, or none"}';
    end if;
    if nullif(btrim(p_data->>'eligibility_en'), '') is null or nullif(btrim(p_data->>'eligibility_lo'), '') is null then
      v_problems := v_problems || '{"eligibility": "Say who can apply, in English and Lao"}';
    end if;
    v_problem := public.academic_career_fact_problems(p_data || jsonb_build_object('text_en', p_data->>'name_en', 'text_lo', p_data->>'name_lo'), false);
    if v_problem is not null then v_problems := v_problems || jsonb_build_object('source', v_problem); end if;
  end if;
  return v_problems;
end;
$$;


-- Unchanged from 148 apart from 'scholarships'.
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
                                          and i.status <> 'archived' and i.published is not null)), '[]'::jsonb),
    -- UNI-005: scholarships whose deadline has not passed.
    'scholarships', coalesce((select jsonb_agg(public.academic_career_mark_dates(published) || jsonb_build_object('slug', slug) order by published->>'deadline')
                              from public.academic_career_content where kind = 'scholarship' and status <> 'archived' and published is not null
                                and (published->>'deadline')::date >= public.academic_today()), '[]'::jsonb)
  );
end;
$$;


-- Unchanged from 148 apart from scholarships.
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
  if v_kind not in ('career', 'institution', 'programme', 'scholarship') then perform public.academic_invalid('kind', 'Unknown content kind'); end if;
  if jsonb_typeof(v_data) is distinct from 'object' then perform public.academic_invalid('data', 'Send the record'); end if;

  if v_id is null then
    v_slug := coalesce(v_slug, case when v_kind = 'programme' then 'p-' || substr(md5(gen_random_uuid()::text), 1, 10)
                                    when v_kind = 'scholarship' then 's-' || substr(md5(gen_random_uuid()::text), 1, 10) end);
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

-- ─── Saved scholarships and reminders (UNI-005) ──────────────────────────────

create table if not exists public.academic_scholarship_saves (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  scholarship_slug   text not null,
  remind             boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (student_profile_id, scholarship_slug)
);
alter table public.academic_scholarship_saves enable row level security;
revoke all on public.academic_scholarship_saves from anon, authenticated;

create or replace function public.academic_my_scholarships()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('slug', scholarship_slug, 'remind', remind) order by created_at)
    from public.academic_scholarship_saves where student_profile_id = v_profile.id), '[]'::jsonb);
end;
$$;

create or replace function public.academic_set_scholarship_saved(p_slug text, p_saved boolean, p_remind boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
begin
  if p_saved then
    if not exists (select 1 from public.academic_career_content where kind = 'scholarship' and slug = p_slug and status <> 'archived' and published is not null
                   and (published->>'deadline')::date >= public.academic_today()) then
      perform public.academic_invalid('slug', 'No such scholarship, or its deadline has passed');
    end if;
    insert into public.academic_scholarship_saves (student_profile_id, scholarship_slug, remind) values (v_profile.id, p_slug, coalesce(p_remind, false))
    on conflict (student_profile_id, scholarship_slug) do update set remind = excluded.remind;
  else
    delete from public.academic_scholarship_saves where student_profile_id = v_profile.id and scholarship_slug = p_slug;
  end if;
  return public.academic_my_scholarships();
end;
$$;

-- Daily: a reminder 14 days and 3 days before each saved deadline.
create or replace function public.academic_scholarship_reminders()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.academic_notifications (user_id, student_profile_id, category, code, payload, channel, state, dedupe_key, sent_at)
  select p.user_id, p.id, 'scholarship_deadline', 'scholarship.' || d.days,
         jsonb_build_object('name_en', c.published->>'name_en', 'name_lo', c.published->>'name_lo', 'deadline', c.published->>'deadline', 'days', d.days),
         'in_app', 'sent', 'scholarship:' || s.id || ':' || d.days, now()
  from public.academic_scholarship_saves s
  join public.academic_student_profiles p on p.id = s.student_profile_id and p.status = 'active'
  join public.academic_career_content c on c.kind = 'scholarship' and c.slug = s.scholarship_slug and c.status <> 'archived' and c.published is not null
  cross join lateral (select ((c.published->>'deadline')::date - public.academic_today()) as days) d
  where s.remind and d.days in (14, 3)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─── Export (PRIV-004) ───────────────────────────────────────────────────────

-- Saved scholarships join the careers section of "Download my data".
create or replace function public.academic_export_my_scholarships()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('scholarship', scholarship_slug, 'remind', remind, 'saved_at', created_at) order by created_at)
    from public.academic_scholarship_saves where student_profile_id = v_profile.id), '[]'::jsonb);
end;
$$;

-- ─── Grants and schedule ─────────────────────────────────────────────────────

revoke all on function public.academic_career_problems(text, jsonb) from public, anon, authenticated;
revoke all on function public.academic_scholarship_reminders() from public, anon, authenticated;
do $$
declare
  f text;
begin
  foreach f in array array['academic_career_catalogue()', 'academic_my_scholarships()', 'academic_set_scholarship_saved(text,boolean,boolean)', 'academic_export_my_scholarships()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-scholarship-reminders';
select cron.schedule(
  'academic-scholarship-reminders',
  '20 1 * * *', -- 08:20 Asia/Vientiane
  $$select public.academic_scholarship_reminders();$$
);
