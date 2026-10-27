-- My Scores — programme lengths for the draft programmes (P4-CAR #55; owner
-- decision PROGRAMME-LENGTHS, 2026-10-27).
--
-- No official page states the length of the 106 draft programmes of migration
-- 156 (NUOL faculty pages give credit totals only; Souphanouvong's faculty
-- pages have no programme data yet). At the owner's request each draft gets
-- 4 years, 5 for architecture, marked "duration_unconfirmed": a draft so
-- marked cannot be sent for review until an admin confirms the length with
-- the faculty (or corrects it) and ticks "Length confirmed", so an unconfirmed
-- length never reaches students.

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
  end if;
  return v_problems;
end;
$$;

update public.academic_career_content
set draft = draft || jsonb_build_object(
      'duration_years', case when draft->>'faculty' like '%ສະຖາປັດຕະຍະກຳ%' then '5' else '4' end,
      'duration_unconfirmed', true),
    updated_at = now()
where kind = 'programme' and status = 'draft' and slug ~ '^p-(nuol|su)-' and coalesce(draft->>'duration_years', '') = '';

revoke all on function public.academic_career_problems(text, jsonb) from public, anon, authenticated;
