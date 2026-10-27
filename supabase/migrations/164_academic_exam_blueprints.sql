-- My Scores — entrance exam blueprints (P5-EXAM #56, piece 1: EXAM-001;
-- owner decision MOCK-EXAMS, 2026-10-27).
--
-- A blueprint is a fifth kind of career-catalogue record ('exam_blueprint'):
-- entrance group, intake year, exam date and sessions (minutes and school
-- subjects), from an official source with check and review-by dates, with the
-- same second-admin approval. Students see published blueprints with their
-- source. A mock exam is a "Mock exam" only when its blueprint is for the
-- intake the current Grade 12 sits for (the year after the active school
-- year); otherwise it is a "Practice set" (EXAM-001).
--
-- Drafts: Groups A and B for the 2026-2027 intake, from the National
-- University of Laos report of the exam day (8 August 2026): sessions,
-- subjects and minutes. It does not state question counts or maximum scores.
-- The 2027-2028 structure is not announced yet, so no blueprint is current.
-- English subject codes follow academic_subjects; "Mathematics A/B" are both
-- MATH (the source names the variant, kept in the session label).

alter table public.academic_career_content drop constraint if exists academic_career_content_kind_check;
alter table public.academic_career_content add constraint academic_career_content_kind_check check (kind in ('career', 'institution', 'programme', 'scholarship', 'exam_blueprint'));

-- The intake the current Grade 12 sits the entrance exam for: the school year
-- after the active one ('2026-2027' active -> '2027-2028').
create or replace function public.academic_exam_intake_year()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select (left(code, 4)::int + 1) || '-' || (left(code, 4)::int + 2)
  from public.academic_years where status = 'active' order by start_date desc limit 1;
$$;

-- Unchanged from 159 apart from exam blueprints.
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
    -- A length that is not from an official source must be confirmed before review (migration 159).
    if coalesce(p_data->>'duration_unconfirmed', 'false') = 'true' then
      v_problems := v_problems || '{"duration_years": "Confirm the length with the faculty, then tick Length confirmed"}';
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

  -- EXAM-001 (migration 164): an entrance exam blueprint from an official source, for one intake year.
  elsif p_kind = 'exam_blueprint' then
    if coalesce(p_data->>'group', '') !~ '^[A-Z]$' then v_problems := v_problems || '{"group": "One letter, as in the official notice"}'; end if;
    if coalesce(p_data->>'intake_year', '') !~ '^[0-9]{4}-[0-9]{4}$' then v_problems := v_problems || '{"intake_year": "The intake year, for example 2027-2028"}'; end if;
    if nullif(p_data->>'exam_date', '') is not null and not public.academic_career_is_date(p_data->>'exam_date') then
      v_problems := v_problems || '{"exam_date": "A date, or leave empty"}';
    end if;
    if jsonb_typeof(coalesce(p_data->'sessions', '[]')) <> 'array' or jsonb_array_length(coalesce(p_data->'sessions', '[]')) not between 1 and 4 then
      v_problems := v_problems || '{"sessions": "Add 1 to 4 sessions"}';
    else
      v_i := 0;
      for v_item in select * from jsonb_array_elements(p_data->'sessions') loop
        v_i := v_i + 1;
        if coalesce(v_item->>'minutes', '') !~ '^[0-9]+$' or (v_item->>'minutes')::int not between 15 and 300
           or jsonb_typeof(coalesce(v_item->'subjects', '[]')) <> 'array' or jsonb_array_length(coalesce(v_item->'subjects', '[]')) = 0
           or exists (select 1 from jsonb_array_elements_text(coalesce(v_item->'subjects', '[]')) c where not exists (select 1 from public.academic_subjects s where s.code = c)) then
          v_problems := v_problems || jsonb_build_object('sessions.' || v_i, 'Minutes (15 to 300) and at least one school subject');
        end if;
      end loop;
    end if;
    v_problem := public.academic_career_fact_problems(p_data || jsonb_build_object('text_en', p_data->>'name_en', 'text_lo', p_data->>'name_lo'), false);
    if v_problem is not null then v_problems := v_problems || jsonb_build_object('source', v_problem); end if;
  end if;
  return v_problems;
end;
$$;

-- Unchanged from 155 (volatile since 160) apart from exam blueprints.
create or replace function public.academic_career_catalogue()
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
                                and (published->>'deadline')::date >= public.academic_today()), '[]'::jsonb),
    -- EXAM-001: entrance exam blueprints, and the intake the current Grade 12 sits for.
    'exam_blueprints', coalesce((select jsonb_agg(public.academic_career_mark_dates(published) || jsonb_build_object('slug', slug) order by published->>'intake_year' desc, published->>'group')
                                 from public.academic_career_content where kind = 'exam_blueprint' and status <> 'archived' and published is not null), '[]'::jsonb),
    'exam_intake_year', public.academic_exam_intake_year()
  );
end;
$$;

-- Unchanged from 155 apart from exam blueprints.
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
  if v_kind not in ('career', 'institution', 'programme', 'scholarship', 'exam_blueprint') then perform public.academic_invalid('kind', 'Unknown content kind'); end if;
  if jsonb_typeof(v_data) is distinct from 'object' then perform public.academic_invalid('data', 'Send the record'); end if;

  if v_id is null then
    v_slug := coalesce(v_slug, case when v_kind = 'programme' then 'p-' || substr(md5(gen_random_uuid()::text), 1, 10)
                                    when v_kind = 'scholarship' then 's-' || substr(md5(gen_random_uuid()::text), 1, 10)
                                    when v_kind = 'exam_blueprint' then 'e-' || substr(md5(gen_random_uuid()::text), 1, 10) end);
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

-- Unchanged from 148 apart from the current intake year.
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
                from public.academic_career_content where kind = 'career' and status <> 'archived'),
    'exam_intake_year', public.academic_exam_intake_year()
  );
end;
$$;

insert into public.academic_career_content (kind, slug, draft, status, review_by)
select 'exam_blueprint', v.slug, v.draft, 'draft', public.academic_career_review_by(v.draft)
from (values
  ('e-nuol-2026-a', '{"name_en":"Entrance exam, Group A (STEM)","name_lo":"ສອບເສັງເຂົ້າ ກຸ່ມ A (STEM)","group":"A","intake_year":"2026-2027","exam_date":"2026-08-08","sessions":[{"label_en":"Morning: Mathematics A and Physics","label_lo":"ຕອນເຊົ້າ: ຄະນິດສາດ A ແລະ ຟີຊິກສາດ","minutes":120,"subjects":["MATH","PHYS"]},{"label_en":"Afternoon: Lao language and literature, Chemistry, Biology and English","label_lo":"ຕອນບ່າຍ: ພາສາລາວ-ວັນນະຄະດີ, ເຄມີສາດ, ຊີວະສາດ ແລະ ພາສາອັງກິດ","minutes":90,"subjects":["LAO","CHEM","BIO","ENG"]}],"note_en":"Question count and maximum score are not stated in the source.","note_lo":"ແຫຼ່ງຂໍ້ມູນບໍ່ໄດ້ບອກຈຳນວນຂໍ້ ແລະ ຄະແນນເຕັມ.","source_name":"National University of Laos: entrance examination news, 8 August 2026","source_url":"https://nuol.edu.la/index.php/news/640","verified_on":"2026-10-27","review_by":"2027-04-27"}'::jsonb),
  ('e-nuol-2026-b', '{"name_en":"Entrance exam, Group B (non-STEM)","name_lo":"ສອບເສັງເຂົ້າ ກຸ່ມ B (NON-STEM)","group":"B","intake_year":"2026-2027","exam_date":"2026-08-08","sessions":[{"label_en":"Morning: Mathematics B and Lao language and literature","label_lo":"ຕອນເຊົ້າ: ຄະນິດສາດ B ແລະ ພາສາລາວ-ວັນນະຄະດີ","minutes":120,"subjects":["MATH","LAO"]},{"label_en":"Afternoon: Geography, History and English","label_lo":"ຕອນບ່າຍ: ພູມສາດ, ປະຫວັດສາດ ແລະ ພາສາອັງກິດ","minutes":90,"subjects":["GEO","HIST","ENG"]}],"note_en":"Question count and maximum score are not stated in the source.","note_lo":"ແຫຼ່ງຂໍ້ມູນບໍ່ໄດ້ບອກຈຳນວນຂໍ້ ແລະ ຄະແນນເຕັມ.","source_name":"National University of Laos: entrance examination news, 8 August 2026","source_url":"https://nuol.edu.la/index.php/news/640","verified_on":"2026-10-27","review_by":"2027-04-27"}'::jsonb)
) as v(slug, draft)
on conflict do nothing;

revoke all on function public.academic_exam_intake_year() from public, anon, authenticated;
revoke all on function public.academic_career_problems(text, jsonb) from public, anon, authenticated;
