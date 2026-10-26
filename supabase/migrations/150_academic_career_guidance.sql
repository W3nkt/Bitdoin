-- My Scores — career guidance: interest questionnaire, explained options,
-- shortlist (P4-CAR #55, piece 2: CAREER-001..004, CAREER-007, CAREER-009,
-- CAREER-010; PRD §22.2–22.4, §22.8).
--
-- The questionnaire (PRD §22.3, 24 items in six interest areas plus three
-- optional preferences) is an exploration tool, not a validated test.
-- Progress is saved after each screen. Area scores are the mean of answered
-- items (items in two areas count half to each); "Not sure" is left out.
--
-- Options come from the published career catalogue (migration 148) through
-- academic_career_rank, whose inputs are only interest areas, work-setting and
-- study-length preferences, the student's relatively stronger subjects and
-- their saved careers. It never receives gender, ethnicity, province, family
-- income or disability (CAREER-004), so profiles that differ only in those
-- get identical options. 3–6 options from at least 2 clusters, at most 2 per
-- cluster, each with the factors that placed it; no score or percentage is
-- shown (CAREER-002). When new scores arrive, the questionnaire is retaken or
-- the catalogue changes, a new result records what changed (CAREER-007).

-- ─── Questionnaire ───────────────────────────────────────────────────────────

insert into public.academic_settings (key, value, description) values
  ('career_questionnaire', $json${
    "version": "1.0.0",
    "items": [
      {"n": 1, "areas": ["R"], "en": "Repair a bicycle, phone or household item", "lo": "ສ້ອມແປງລົດຖີບ, ໂທລະສັບ ຫຼື ເຄື່ອງໃຊ້ໃນເຮືອນ"},
      {"n": 2, "areas": ["R"], "en": "Build or assemble something following a plan", "lo": "ສ້າງ ຫຼື ປະກອບສິ່ງຂອງຕາມແບບແຜນ"},
      {"n": 3, "areas": ["R"], "en": "Work outdoors with tools, plants or animals", "lo": "ເຮັດວຽກກາງແຈ້ງກັບເຄື່ອງມື, ພືດ ຫຼື ສັດ"},
      {"n": 4, "areas": ["I"], "en": "Do experiments to find out why something happens", "lo": "ທົດລອງເພື່ອຊອກຫາວ່າເປັນຫຍັງບາງສິ່ງຈຶ່ງເກີດຂຶ້ນ"},
      {"n": 5, "areas": ["I"], "en": "Solve a hard maths or logic problem", "lo": "ແກ້ໂຈດຄະນິດສາດ ຫຼື ໂຈດເຫດຜົນທີ່ຍາກ"},
      {"n": 6, "areas": ["I"], "en": "Read about how the human body, nature or technology works", "lo": "ອ່ານກ່ຽວກັບການເຮັດວຽກຂອງຮ່າງກາຍ, ທຳມະຊາດ ຫຼື ເຕັກໂນໂລຊີ"},
      {"n": 7, "areas": ["A"], "en": "Draw, design posters or make videos", "lo": "ແຕ້ມຮູບ, ອອກແບບໂປສເຕີ ຫຼື ເຮັດວິດີໂອ"},
      {"n": 8, "areas": ["A"], "en": "Write stories, poems or song lyrics of your own", "lo": "ແຕ່ງເລື່ອງ, ກາບກອນ ຫຼື ເນື້ອເພງດ້ວຍຕົນເອງ"},
      {"n": 9, "areas": ["A"], "en": "Perform music, dance or drama", "lo": "ສະແດງດົນຕີ, ຟ້ອນ ຫຼື ລະຄອນ"},
      {"n": 10, "areas": ["S"], "en": "Explain a lesson to a classmate who is stuck", "lo": "ອະທິບາຍບົດຮຽນໃຫ້ໝູ່ທີ່ຍັງບໍ່ເຂົ້າໃຈ"},
      {"n": 11, "areas": ["S"], "en": "Look after someone who is sick or needs help", "lo": "ເບິ່ງແຍງຄົນທີ່ເຈັບປ່ວຍ ຫຼື ຕ້ອງການຄວາມຊ່ວຍເຫຼືອ"},
      {"n": 12, "areas": ["S"], "en": "Volunteer in your village or community", "lo": "ເຮັດວຽກອາສາສະໝັກໃນບ້ານ ຫຼື ຊຸມຊົນຂອງເຈົ້າ"},
      {"n": 13, "areas": ["E"], "en": "Lead a team or class project", "lo": "ນຳພາທີມ ຫຼື ໂຄງການຂອງຫ້ອງຮຽນ"},
      {"n": 14, "areas": ["E"], "en": "Sell things or plan a small business", "lo": "ຂາຍສິນຄ້າ ຫຼື ວາງແຜນທຸລະກິດນ້ອຍ"},
      {"n": 15, "areas": ["E"], "en": "Persuade people to support an idea", "lo": "ຊັກຊວນຄົນອື່ນໃຫ້ສະໜັບສະໜູນແນວຄິດ"},
      {"n": 16, "areas": ["C"], "en": "Keep careful records or organise files", "lo": "ຈົດບັນທຶກຢ່າງລະອຽດ ຫຼື ຈັດລຽງເອກະສານ"},
      {"n": 17, "areas": ["C"], "en": "Work with numbers in tables or spreadsheets", "lo": "ເຮັດວຽກກັບຕົວເລກໃນຕາຕະລາງ"},
      {"n": 18, "areas": ["C"], "en": "Plan a schedule so everything happens on time", "lo": "ວາງຕາຕະລາງເວລາເພື່ອໃຫ້ທຸກຢ່າງທັນເວລາ"},
      {"n": 19, "areas": ["I", "A"], "en": "Use computers to create something (website, app, game)", "lo": "ໃຊ້ຄອມພິວເຕີສ້າງສິ່ງໃໝ່ (ເວັບໄຊ, ແອັບ, ເກມ)"},
      {"n": 20, "areas": ["R", "S"], "en": "Help protect forests, rivers or the environment", "lo": "ຊ່ວຍປົກປັກຮັກສາປ່າໄມ້, ແມ່ນ້ຳ ຫຼື ສິ່ງແວດລ້ອມ"},
      {"n": 21, "areas": ["S", "E"], "en": "Help people understand laws or rules fairly", "lo": "ຊ່ວຍໃຫ້ຄົນເຂົ້າໃຈກົດໝາຍ ຫຼື ລະບຽບການຢ່າງຍຸຕິທຳ"},
      {"n": 22, "areas": ["S", "I"], "en": "Work in a hospital or health centre", "lo": "ເຮັດວຽກຢູ່ໂຮງໝໍ ຫຼື ສຸກສາລາ"},
      {"n": 23, "areas": ["S"], "en": "Teach children or young people", "lo": "ສອນເດັກນ້ອຍ ຫຼື ໄວໜຸ່ມ"},
      {"n": 24, "areas": ["I", "C"], "en": "Analyse information to make a decision", "lo": "ວິເຄາະຂໍ້ມູນເພື່ອຕັດສິນໃຈ"}
    ],
    "items_per_screen": 4,
    "min_answered": 12,
    "retake_days": 90
  }$json$::jsonb, 'P4-CAR: the interest questionnaire (PRD §22.3). Lao translation needs review by two educators.')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_career_assessments (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  version            text not null,
  -- {"1": 3, "2": null, ...}: 3 really like … 0 really dislike, null not sure.
  answers            jsonb not null default '{}'::jsonb,
  -- work_setting, away_from_home, study_length (all optional).
  preferences        jsonb not null default '{}'::jsonb,
  reason             text not null default 'first' check (reason in ('first', 'retake', 'interests_changed')),
  status             text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  area_scores        jsonb,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index if not exists academic_career_assessments_profile_idx on public.academic_career_assessments (student_profile_id, started_at desc);
create unique index if not exists academic_career_assessments_one_open on public.academic_career_assessments (student_profile_id) where status = 'in_progress';

create table if not exists public.academic_career_results (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  assessment_id      uuid not null references public.academic_career_assessments(id) on delete cascade,
  snapshot_id        uuid references public.academic_analysis_snapshots(id) on delete set null,
  -- [{"slug": ..., "cluster": ..., "factors": [...]}]
  options            jsonb not null,
  reason             text not null check (reason in ('first', 'retake', 'interests_changed', 'new_scores', 'catalogue', 'shortlist')),
  created_at         timestamptz not null default now()
);
create index if not exists academic_career_results_profile_idx on public.academic_career_results (student_profile_id, created_at desc);

create table if not exists public.academic_career_shortlist (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  career_slug        text not null,
  created_at         timestamptz not null default now(),
  unique (student_profile_id, career_slug)
);

do $$
declare
  t text;
begin
  foreach t in array array['academic_career_assessments', 'academic_career_results', 'academic_career_shortlist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ─── Scoring (PRD §22.3) ─────────────────────────────────────────────────────

-- Per area: score (0–3), answered items and level (High/Medium/Low among the
-- student's own areas; ties share the higher level). Fewer than 2 answered
-- items: not enough answers.
create or replace function public.academic_career_area_scores(p_answers jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select (i->>'n') as n, a.area, 1.0 / jsonb_array_length(i->'areas') as w
    from jsonb_array_elements(public.academic_setting('career_questionnaire')->'items') i
    cross join lateral jsonb_array_elements_text(i->'areas') a(area)
  ), scored as (
    select it.area, sum(it.w * (p_answers->>it.n)::numeric) / nullif(sum(it.w), 0) as score, count(*) as answered
    from items it
    where p_answers->>it.n is not null and p_answers->>it.n ~ '^[0-3]$'
    group by it.area
  ), ranked as (
    select area, round(score, 2) as score, answered,
           (select count(distinct s2.score) from scored s2 where s2.answered >= 2 and s2.score > s.score) as higher
    from scored s where answered >= 2
  )
  select jsonb_build_object(
    'areas', coalesce((select jsonb_object_agg(a, jsonb_build_object(
        'score', r.score, 'answered', coalesce(r.answered, (select answered from scored where area = a), 0),
        'level', case when r.area is null then 'not_enough' when r.higher < 2 then 'high' when r.higher < 3 then 'medium' else 'low' end))
      from unnest(array['R', 'I', 'A', 'S', 'E', 'C']) a left join ranked r on r.area = a), '{}'::jsonb),
    -- Areas within the top two and top three distinct scores (ties included, no letter order).
    'top2', coalesce((select jsonb_agg(area order by score desc, area) from ranked where higher < 2), '[]'::jsonb),
    'top3', coalesce((select jsonb_agg(area order by score desc, area) from ranked where higher < 3), '[]'::jsonb)
  );
$$;

-- ─── Ranking (PRD §22.4, CAREER-002/004) ─────────────────────────────────────

-- Inputs are deliberately limited (CAREER-004): interest areas, two
-- preferences, relatively stronger subjects and saved careers. The internal
-- order is never shown; each option carries the factors that placed it.
create or replace function public.academic_career_rank(p_interest jsonb, p_preferences jsonb, p_stronger_subjects text[], p_saved text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_top2 text[] := array(select jsonb_array_elements_text(coalesce(p_interest->'top2', '[]')));
  v_top3 text[] := array(select jsonb_array_elements_text(coalesce(p_interest->'top3', '[]')));
  v_setting text := nullif(p_preferences->>'work_setting', '');
  v_length text := nullif(p_preferences->>'study_length', '');
  v_picked jsonb := '[]'::jsonb;
  v_clusters jsonb := '{}'::jsonb;
  v_row record;
  v_swap record;
begin
  create temporary table if not exists pg_temp.career_candidates (
    slug text, cluster text, tier integer, support integer, fit integer, stated integer, priority integer, factors jsonb, ord integer
  ) on commit drop;
  truncate pg_temp.career_candidates;

  insert into pg_temp.career_candidates
  select c.slug, c.published->>'cluster',
         x.tier, x.support, x.fit, x.stated, coalesce((c.published->>'editorial_priority')::integer, 0),
         jsonb_strip_nulls(jsonb_build_object(
           'saved', case when x.stated = 1 then true end,
           'interest', case when x.tier > 1 then (select jsonb_agg(a) from unnest(array[c.published->>'primary_area', c.published->>'secondary_area']) a where a = any(v_top3)) end,
           'subjects', case when x.support > 0 then (select jsonb_agg(s) from jsonb_array_elements_text(c.published->'related_subjects') s where s = any(p_stronger_subjects)) end,
           'preferences', case when x.fit > 0 then (select jsonb_agg(p) from unnest(array[
                            case when v_setting is not null and c.published->'work_settings' ? v_setting then 'work_setting' end,
                            case when v_length is not null and c.published->>'study_years' = v_length then 'study_length' end]) p where p is not null) end
         )),
         row_number() over (order by x.stated desc, x.tier desc, x.fit desc, x.support desc, coalesce((c.published->>'editorial_priority')::integer, 0) desc, c.slug)
  from public.academic_career_content c
  cross join lateral (select
    case when c.published->>'primary_area' = any(v_top2) then 3
         when c.published->>'primary_area' = any(v_top3) or c.published->>'secondary_area' = any(v_top3) then 2 else 1 end as tier,
    least(2, (select count(*) from jsonb_array_elements_text(c.published->'related_subjects') s where s = any(coalesce(p_stronger_subjects, '{}'))))::integer as support,
    ((v_setting is not null and c.published->'work_settings' ? v_setting)::integer + (v_length is not null and c.published->>'study_years' = v_length)::integer) as fit,
    (c.slug = any(coalesce(p_saved, '{}')))::integer as stated
  ) x
  where c.kind = 'career' and c.status <> 'archived' and c.published is not null;

  -- Up to 6, at most 2 per cluster; Low-interest careers only to reach 3.
  for v_row in select * from pg_temp.career_candidates order by ord loop
    exit when jsonb_array_length(v_picked) >= 6;
    continue when coalesce((v_clusters->>v_row.cluster)::integer, 0) >= 2;
    continue when v_row.tier = 1 and v_row.stated = 0 and jsonb_array_length(v_picked) >= 3;
    v_picked := v_picked || jsonb_build_array(jsonb_build_object('slug', v_row.slug, 'cluster', v_row.cluster, 'factors', v_row.factors, 'tier', v_row.tier, 'support', v_row.support, 'stated', v_row.stated));
    v_clusters := v_clusters || jsonb_build_object(v_row.cluster, coalesce((v_clusters->>v_row.cluster)::integer, 0) + 1);
  end loop;

  -- Not only grades: with a High-interest option, include one that no stronger subject supports.
  if exists (select 1 from jsonb_array_elements(v_picked) o where (o->>'tier')::integer = 3)
     and not exists (select 1 from jsonb_array_elements(v_picked) o where (o->>'tier')::integer = 3 and (o->>'support')::integer = 0) then
    select * into v_swap from pg_temp.career_candidates c
    where c.tier = 3 and c.support = 0 and not exists (select 1 from jsonb_array_elements(v_picked) o where o->>'slug' = c.slug)
    order by c.ord limit 1;
    if v_swap.slug is not null then
      if jsonb_array_length(v_picked) >= 6 or coalesce((v_clusters->>v_swap.cluster)::integer, 0) >= 2 then
        -- Replace the last option that is neither saved nor in the swap's cluster limit.
        v_picked := (select coalesce(jsonb_agg(o order by i), '[]'::jsonb) from jsonb_array_elements(v_picked) with ordinality t(o, i)
                     where i <> (select max(i2) from jsonb_array_elements(v_picked) with ordinality t2(o2, i2)
                                 where (o2->>'stated')::integer = 0 and (o2->>'support')::integer > 0
                                   and (coalesce((v_clusters->>v_swap.cluster)::integer, 0) < 2 or o2->>'cluster' = v_swap.cluster)));
      end if;
      if jsonb_array_length(v_picked) < 6 then
        v_picked := v_picked || jsonb_build_array(jsonb_build_object('slug', v_swap.slug, 'cluster', v_swap.cluster, 'factors', v_swap.factors, 'tier', v_swap.tier, 'support', v_swap.support, 'stated', v_swap.stated));
      end if;
    end if;
  end if;

  -- Only slugs, clusters and factors leave this function.
  return (select coalesce(jsonb_agg(o - 'tier' - 'support' - 'stated'), '[]'::jsonb) from jsonb_array_elements(v_picked) o);
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- The student's relatively stronger subjects in their latest snapshot.
create or replace function public.academic_career_stronger_subjects(p_profile_id uuid)
returns table (snapshot_id uuid, codes text[])
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_enrolment public.academic_enrolments := public.academic_planner_enrolment(p_profile_id);
  v_snapshot uuid;
begin
  if v_enrolment.id is not null then
    v_snapshot := public.academic_build_snapshot(v_enrolment.id);
  end if;
  return query
  select v_snapshot, coalesce((select array_agg(s->>'code') from public.academic_analysis_snapshots sn
                               cross join lateral jsonb_array_elements(coalesce(sn.outputs->'subjects', '[]')) s
                               where sn.id = v_snapshot and s->'label'->>'value' = 'relatively_stronger'), '{}');
end;
$$;

-- Builds a new result when the options or their reasons changed (CAREER-007).
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

create or replace function public.academic_career_options_json(p_options jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- Each option with the career's published content (facts marked when out of date).
  select coalesce(jsonb_agg(o || jsonb_build_object('career', public.academic_career_mark_dates(c.published) || jsonb_build_object('slug', c.slug)) order by t.i), '[]'::jsonb)
  from jsonb_array_elements(p_options) with ordinality t(o, i)
  join public.academic_career_content c on c.kind = 'career' and c.slug = o->>'slug' and c.status <> 'archived' and c.published is not null;
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

-- Start the questionnaire, or retake it (after 90 days, or now with 'interests_changed').
create or replace function public.academic_start_career_questionnaire(p_reason text default 'first')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_rules jsonb := public.academic_setting('career_questionnaire');
  v_done public.academic_career_assessments;
begin
  if exists (select 1 from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'in_progress') then
    return public.academic_get_career_guidance();
  end if;
  select * into v_done from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'completed' order by completed_at desc limit 1;
  if p_reason not in ('first', 'retake', 'interests_changed') then
    perform public.academic_invalid('reason', 'Unknown reason');
  end if;
  if v_done.id is not null and p_reason = 'first' then
    p_reason := 'retake';
  end if;
  if v_done.id is not null and p_reason = 'retake'
     and v_done.completed_at + make_interval(days => coalesce((v_rules->>'retake_days')::integer, 90)) > now() then
    perform public.academic_raise('CAREER_RETAKE_TOO_SOON', 409, 'You can retake it after 90 days, or now if your interests have changed',
      jsonb_build_object('retake_after', (v_done.completed_at + make_interval(days => coalesce((v_rules->>'retake_days')::integer, 90)))::date));
  end if;
  insert into public.academic_career_assessments (student_profile_id, version, reason, preferences)
  values (v_profile.id, v_rules->>'version', p_reason, coalesce(v_done.preferences, '{}'::jsonb));
  return public.academic_get_career_guidance();
end;
$$;

-- Saved after each screen (CAREER-001). Answers: item number → 0..3 or null (not sure).
create or replace function public.academic_save_career_answers(p_answers jsonb, p_preferences jsonb default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_open public.academic_career_assessments;
  v_count integer := (select jsonb_array_length(public.academic_setting('career_questionnaire')->'items'));
  v_key text;
  v_value jsonb;
begin
  select * into v_open from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'in_progress' for update;
  if v_open.id is null then
    perform public.academic_raise('CAREER_NOT_STARTED', 409, 'Start the questionnaire first');
  end if;
  for v_key, v_value in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb)) loop
    if v_key !~ '^\d+$' or v_key::integer not between 1 and v_count or not (v_value = 'null'::jsonb or v_value::text ~ '^[0-3]$') then
      perform public.academic_invalid('answers', 'Answer 0 to 3, or not sure');
    end if;
  end loop;
  if p_preferences is not null and (
       coalesce(p_preferences->>'work_setting', 'not_sure') not in ('office', 'outdoors', 'workshop_lab', 'with_people', 'mixed', 'not_sure')
    or coalesce(p_preferences->>'away_from_home', 'not_sure') not in ('yes', 'maybe', 'no', 'not_sure')
    or coalesce(p_preferences->>'study_length', 'not_sure') not in ('le3', '4to5', '6plus', 'not_sure')) then
    perform public.academic_invalid('preferences', 'Unknown preference');
  end if;
  update public.academic_career_assessments
  set answers = answers || coalesce(p_answers, '{}'::jsonb),
      preferences = case when p_preferences is null then preferences else jsonb_strip_nulls(jsonb_build_object(
        'work_setting', nullif(p_preferences->>'work_setting', 'not_sure'), 'away_from_home', nullif(p_preferences->>'away_from_home', 'not_sure'),
        'study_length', nullif(p_preferences->>'study_length', 'not_sure'))) end
  where id = v_open.id;
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.academic_finish_career_questionnaire()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_open public.academic_career_assessments;
  v_answered integer;
  v_min integer := coalesce((public.academic_setting('career_questionnaire')->>'min_answered')::integer, 12);
begin
  select * into v_open from public.academic_career_assessments where student_profile_id = v_profile.id and status = 'in_progress' for update;
  if v_open.id is null then
    perform public.academic_raise('CAREER_NOT_STARTED', 409, 'Start the questionnaire first');
  end if;
  select count(*) into v_answered from jsonb_each(v_open.answers) a where a.value <> 'null'::jsonb;
  if v_answered < v_min then
    perform public.academic_raise('CAREER_TOO_FEW_ANSWERS', 400, 'Answer a few more questions (Not sure does not count)', jsonb_build_object('answered', v_answered, 'needed', v_min));
  end if;
  update public.academic_career_assessments
  set status = 'completed', completed_at = now(), area_scores = public.academic_career_area_scores(answers)
  where id = v_open.id;
  perform public.academic_career_refresh(v_profile, v_open.reason);
  return public.academic_get_career_guidance();
end;
$$;

-- CAREER-010: up to 20 saved careers. Saved careers always appear among the options.
create or replace function public.academic_set_career_saved(p_slug text, p_saved boolean)
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
    if not exists (select 1 from public.academic_career_content where kind = 'career' and slug = p_slug and status <> 'archived' and published is not null) then
      perform public.academic_invalid('slug', 'No such career');
    end if;
    if (select count(*) from public.academic_career_shortlist where student_profile_id = v_profile.id) >= 20
       and not exists (select 1 from public.academic_career_shortlist where student_profile_id = v_profile.id and career_slug = p_slug) then
      perform public.academic_raise('CAREER_SHORTLIST_FULL', 409, 'Your shortlist is full (20). Remove one first');
    end if;
    insert into public.academic_career_shortlist (student_profile_id, career_slug) values (v_profile.id, p_slug) on conflict do nothing;
  else
    delete from public.academic_career_shortlist where student_profile_id = v_profile.id and career_slug = p_slug;
  end if;
  perform public.academic_career_refresh(v_profile, 'shortlist');
  return jsonb_build_object('shortlist', coalesce((select jsonb_agg(career_slug order by created_at) from public.academic_career_shortlist where student_profile_id = v_profile.id), '[]'::jsonb));
end;
$$;

-- ─── Export (PRIV-004) ───────────────────────────────────────────────────────

-- The study planner (migration 143), the Coach's My scores chats (145) and
-- career guidance (this migration), for "Download my data".
create or replace function public.academic_export_my_guidance()
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
    'planner', jsonb_build_object(
      'goals', coalesce((select jsonb_agg(to_jsonb(g) - 'student_profile_id' order by g.created_at) from public.academic_learning_goals g where g.student_profile_id = v_profile.id), '[]'::jsonb),
      'plan', (select to_jsonb(p) - 'student_profile_id' from public.academic_study_plans p where p.student_profile_id = v_profile.id),
      'tasks', coalesce((select jsonb_agg(to_jsonb(t) - 'student_profile_id' order by t.week_start, t.scheduled_date) from public.academic_study_tasks t where t.student_profile_id = v_profile.id), '[]'::jsonb)),
    'coach', jsonb_build_object(
      'conversations', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'created_at', c.created_at,
          'messages', (select coalesce(jsonb_agg(jsonb_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at, 'prompt_version', m.prompt_version, 'model_id', m.model_id) order by m.created_at), '[]'::jsonb)
                       from public.premium_coach_messages m where m.conversation_id = c.id)) order by c.created_at)
        from public.premium_coach_conversations c where c.student_profile_id = v_profile.id and c.mode = 'academic'), '[]'::jsonb),
      'feedback', coalesce((select jsonb_agg(jsonb_build_object('message_id', f.message_id, 'rating', f.rating, 'report_category', f.report_category, 'share_text', f.share_text, 'comment', f.comment, 'created_at', f.created_at) order by f.created_at)
        from public.academic_coach_feedback f where f.student_profile_id = v_profile.id and f.source = 'student'), '[]'::jsonb)),
    'careers', jsonb_build_object(
      'questionnaires', coalesce((select jsonb_agg(jsonb_build_object('version', a.version, 'answers', a.answers, 'preferences', a.preferences, 'reason', a.reason, 'status', a.status, 'area_scores', a.area_scores, 'started_at', a.started_at, 'completed_at', a.completed_at) order by a.started_at)
        from public.academic_career_assessments a where a.student_profile_id = v_profile.id), '[]'::jsonb),
      'results', coalesce((select jsonb_agg(jsonb_build_object('options', r.options, 'reason', r.reason, 'created_at', r.created_at) order by r.created_at)
        from public.academic_career_results r where r.student_profile_id = v_profile.id), '[]'::jsonb),
      'shortlist', coalesce((select jsonb_agg(jsonb_build_object('career', l.career_slug, 'saved_at', l.created_at) order by l.created_at)
        from public.academic_career_shortlist l where l.student_profile_id = v_profile.id), '[]'::jsonb))
  );
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_career_area_scores(jsonb)', 'academic_career_rank(jsonb,jsonb,text[],text[])', 'academic_career_stronger_subjects(uuid)',
    'academic_career_refresh(public.academic_student_profiles,text)', 'academic_career_options_json(jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_get_career_guidance()', 'academic_start_career_questionnaire(text)', 'academic_save_career_answers(jsonb,jsonb)',
    'academic_finish_career_questionnaire()', 'academic_set_career_saved(text,boolean)', 'academic_export_my_guidance()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
