-- My Scores — diagnostic item bank with review workflow (P2-ANL, #49:
-- ADMIN-007, QUIZ-005).
--
-- Topics belong to a subject and grade. Quiz items are multiple choice, tagged
-- to exactly one topic, written in Lao (English optional), with a human or
-- AI-drafted explanation, an author, a licence and a source.
--
--   status   draft -> in_review -> approved -> retired
--            in_review -> draft (returned with a note)
--   versions an approved item is never edited: saving it starts the next
--            item_version as a draft; approving that version retires the old one
--   approval by an admin who is neither the author nor the last editor of that
--            version (setting quiz_four_eyes_required, on by default; decision
--            ADMIN-007 in the register: no separate Academic Reviewer role yet)
--   serving  only approved items (academic_quiz_item_servable); nothing that is
--            described as leaked or official exam content is accepted
--
-- Admin access only, through the RPCs below; students reach items in a later
-- step (quiz delivery), which must use academic_quiz_item_servable.

insert into public.academic_settings (key, value, description) values
  ('quiz_four_eyes_required', 'true', 'ADMIN-007: a quiz item must be approved by an admin who did not write or last edit it.')
on conflict (key) do nothing;

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_quiz_topics (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.academic_subjects(id),
  grade_id      uuid not null references public.academic_grades(id),
  code          varchar(40) not null check (code ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name_lo       varchar(120) not null check (length(btrim(name_lo)) > 0),
  name_en       varchar(120) not null check (length(btrim(name_en)) > 0),
  display_order integer not null default 0,
  active        boolean not null default true,
  version       integer not null default 1,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (subject_id, grade_id, code)
);

create table if not exists public.academic_quiz_items (
  id                 uuid primary key default gen_random_uuid(),
  item_key           uuid not null default gen_random_uuid(),
  item_version       integer not null default 1 check (item_version > 0),
  topic_id           uuid not null references public.academic_quiz_topics(id),
  stem_lo            text not null check (length(btrim(stem_lo)) between 1 and 2000),
  stem_en            text check (stem_en is null or length(stem_en) <= 2000),
  -- [{ "key": "A", "text_lo": "...", "text_en": "..." }, ...] — 2 to 6, keys A.. in order
  options            jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_key        char(1) not null check (correct_key between 'A' and 'F'),
  explanation_lo     text check (explanation_lo is null or length(explanation_lo) <= 4000),
  explanation_en     text check (explanation_en is null or length(explanation_en) <= 4000),
  explanation_origin text not null default 'human' check (explanation_origin in ('human', 'ai')),
  licence            text not null default 'original' check (licence in ('original', 'cc-by-4.0', 'cc-by-sa-4.0', 'licensed')),
  source             text check (source is null or length(source) <= 300),
  status             text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'retired')),
  author_id          uuid references public.users(id) on delete set null,
  last_edited_by     uuid references public.users(id) on delete set null,
  submitted_at       timestamptz,
  reviewed_by        uuid references public.users(id) on delete set null,
  reviewed_at        timestamptz,
  review_note        text check (review_note is null or length(review_note) <= 500),
  retired_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (item_key, item_version)
);

create index if not exists academic_quiz_items_topic_idx on public.academic_quiz_items (topic_id, status);
-- One live version per item; one open (draft or in review) version per item.
create unique index if not exists academic_quiz_items_one_approved on public.academic_quiz_items (item_key) where status = 'approved';
create unique index if not exists academic_quiz_items_one_open on public.academic_quiz_items (item_key) where status in ('draft', 'in_review');

alter table public.academic_quiz_topics enable row level security;
alter table public.academic_quiz_items enable row level security;
revoke all on public.academic_quiz_topics from anon, authenticated;
revoke all on public.academic_quiz_items from anon, authenticated;

create or replace trigger academic_quiz_topics_touch
  before update on public.academic_quiz_topics
  for each row execute function public.academic_touch_row();
create or replace trigger academic_quiz_items_touch
  before update on public.academic_quiz_items
  for each row execute function public.academic_touch_updated_at();

-- Approved and retired versions keep their content (QUIZ-005 versioning).
create or replace function public.academic_quiz_item_freeze()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('approved', 'retired') and (
    new.topic_id, new.stem_lo, new.stem_en, new.options, new.correct_key, new.explanation_lo, new.explanation_en,
    new.explanation_origin, new.licence, new.source, new.item_key, new.item_version, new.author_id
  ) is distinct from (
    old.topic_id, old.stem_lo, old.stem_en, old.options, old.correct_key, old.explanation_lo, old.explanation_en,
    old.explanation_origin, old.licence, old.source, old.item_key, old.item_version, old.author_id
  ) then
    raise exception 'approved quiz items are immutable; save a new version' using errcode = 'check_violation';
  end if;
  if old.status = 'retired' and new.status <> 'retired' then
    raise exception 'retired quiz items stay retired' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace trigger academic_quiz_items_freeze
  before update on public.academic_quiz_items
  for each row execute function public.academic_quiz_item_freeze();

-- ─── Checks ──────────────────────────────────────────────────────────────────

-- QUIZ-005: no content described as leaked or official exam questions.
create or replace function public.academic_quiz_text_allowed(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text is null or not (lower(p_text) ~ '(leak|official exam|exam paper|national exam|ຂໍ້ສອບຮົ່ວ|ຂໍ້ສອບທາງການ|ຂໍ້ສອບແຫ່ງຊາດ|ຂໍ້ເສັງແຫ່ງຊາດ|ຮົ່ວໄຫຼ)');
$$;

-- What still stops an item going to review, as field -> message.
create or replace function public.academic_quiz_item_problems(p_item public.academic_quiz_items)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_problems jsonb := '{}'::jsonb;
  v_keys text[];
  v_count integer := jsonb_array_length(p_item.options);
begin
  select array_agg(o->>'key' order by ord) into v_keys
  from jsonb_array_elements(p_item.options) with ordinality as x(o, ord);
  if v_count not between 2 and 6 then
    v_problems := v_problems || '{"options": "Give 2 to 6 answer options"}';
  elsif v_keys is distinct from (select array_agg(chr(64 + i) order by i) from generate_series(1, v_count) as i) then
    v_problems := v_problems || '{"options": "Options must be labelled A, B, C … in order"}';
  elsif exists (select 1 from jsonb_array_elements(p_item.options) o where length(btrim(coalesce(o->>'text_lo', ''))) = 0) then
    v_problems := v_problems || '{"options": "Every option needs Lao text"}';
  elsif not p_item.correct_key = any (v_keys) then
    v_problems := v_problems || '{"correct_key": "The correct answer must be one of the options"}';
  end if;
  if length(btrim(coalesce(p_item.explanation_lo, ''))) = 0 then
    v_problems := v_problems || '{"explanation_lo": "Write the explanation in Lao (QUIZ-003)"}';
  end if;
  if p_item.licence <> 'original' and length(btrim(coalesce(p_item.source, ''))) = 0 then
    v_problems := v_problems || '{"source": "Name the source and licence holder"}';
  end if;
  if not (public.academic_quiz_text_allowed(p_item.source) and public.academic_quiz_text_allowed(p_item.stem_lo)
          and public.academic_quiz_text_allowed(p_item.stem_en)) then
    v_problems := v_problems || '{"source": "Leaked or official exam questions cannot be used (QUIZ-005)"}';
  end if;
  return v_problems;
end;
$$;

-- QUIZ-005: the only gate quiz delivery may use to pick items.
create or replace function public.academic_quiz_item_servable(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.academic_quiz_items i
    join public.academic_quiz_topics t on t.id = i.topic_id
    where i.id = p_item_id and i.status = 'approved' and t.active
  );
$$;

-- ─── Admin RPCs ──────────────────────────────────────────────────────────────

create or replace function public.academic_quiz_item_json(p_item public.academic_quiz_items, p_admin uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(p_item) || jsonb_build_object(
    'author_name', (select name from public.users where id = p_item.author_id),
    'reviewer_name', (select name from public.users where id = p_item.reviewed_by),
    'live_version', (select item_version from public.academic_quiz_items where item_key = p_item.item_key and status = 'approved'),
    'problems', public.academic_quiz_item_problems(p_item),
    'can_approve', p_item.status = 'in_review' and (
      public.academic_setting('quiz_four_eyes_required') is distinct from 'true'::jsonb
      or p_admin is distinct from p_item.author_id and p_admin is distinct from p_item.last_edited_by)
  );
$$;

-- Topics with item counts, and items. Filter (all optional): subject_id,
-- grade_id, topic_id, status.
create or replace function public.academic_admin_list_quiz_bank(p_filter jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_filter jsonb := coalesce(p_filter, '{}'::jsonb);
begin
  return jsonb_build_object(
    'four_eyes', public.academic_setting('quiz_four_eyes_required') is not distinct from 'true'::jsonb,
    'topics', coalesce((
      select jsonb_agg(to_jsonb(t) || jsonb_build_object(
        'subject_code', s.code, 'grade_code', g.code,
        'approved_items', (select count(*) from public.academic_quiz_items i where i.topic_id = t.id and i.status = 'approved'),
        'open_items', (select count(*) from public.academic_quiz_items i where i.topic_id = t.id and i.status in ('draft', 'in_review'))
      ) order by s.code, g.ordinal, t.display_order, t.code)
      from public.academic_quiz_topics t
      join public.academic_subjects s on s.id = t.subject_id
      join public.academic_grades g on g.id = t.grade_id
      where (v_filter->>'subject_id' is null or t.subject_id = (v_filter->>'subject_id')::uuid)
        and (v_filter->>'grade_id' is null or t.grade_id = (v_filter->>'grade_id')::uuid)
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(public.academic_quiz_item_json(i, v_admin) order by i.status = 'in_review' desc, i.updated_at desc)
      from public.academic_quiz_items i
      join public.academic_quiz_topics t on t.id = i.topic_id
      -- Newest version per item; with a status filter, every version in that
      -- status (an approved v1 stays listable while v2 is a draft).
      where (v_filter ? 'status' or i.item_version = (select max(item_version) from public.academic_quiz_items x where x.item_key = i.item_key))
        and (v_filter->>'subject_id' is null or t.subject_id = (v_filter->>'subject_id')::uuid)
        and (v_filter->>'grade_id' is null or t.grade_id = (v_filter->>'grade_id')::uuid)
        and (v_filter->>'topic_id' is null or i.topic_id = (v_filter->>'topic_id')::uuid)
        and (v_filter->>'status' is null or i.status = v_filter->>'status')
    ), '[]'::jsonb)
  );
end;
$$;

-- Input: id? (update), subject_id, grade_id, code, name_lo, name_en, display_order?, active?
create or replace function public.academic_admin_save_quiz_topic(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_id uuid;
begin
  if jsonb_typeof(p_input) is distinct from 'object' then
    perform public.academic_invalid('input', 'Topic details are required');
  end if;
  if not exists (select 1 from public.academic_subjects where id = (p_input->>'subject_id')::uuid) then
    perform public.academic_invalid('subject_id', 'Unknown subject');
  end if;
  if not exists (select 1 from public.academic_grades where id = (p_input->>'grade_id')::uuid) then
    perform public.academic_invalid('grade_id', 'Unknown grade');
  end if;
  begin
    if nullif(p_input->>'id', '') is null then
      insert into public.academic_quiz_topics (subject_id, grade_id, code, name_lo, name_en, display_order, active, created_by)
      values ((p_input->>'subject_id')::uuid, (p_input->>'grade_id')::uuid, btrim(p_input->>'code'), btrim(p_input->>'name_lo'),
              btrim(p_input->>'name_en'), coalesce((p_input->>'display_order')::integer, 0), coalesce((p_input->>'active')::boolean, true), v_admin)
      returning id into v_id;
      perform public.academic_audit('quiz.topic_create', 'quiz_topic', v_id);
    else
      update public.academic_quiz_topics
      set subject_id = (p_input->>'subject_id')::uuid, grade_id = (p_input->>'grade_id')::uuid, code = btrim(p_input->>'code'),
          name_lo = btrim(p_input->>'name_lo'), name_en = btrim(p_input->>'name_en'),
          display_order = coalesce((p_input->>'display_order')::integer, display_order),
          active = coalesce((p_input->>'active')::boolean, active)
      where id = (p_input->>'id')::uuid
      returning id into v_id;
      if v_id is null then perform public.academic_raise('NOT_FOUND', 404, 'Topic not found'); end if;
      perform public.academic_audit('quiz.topic_update', 'quiz_topic', v_id);
    end if;
  exception
    when unique_violation then perform public.academic_invalid('code', 'This subject and grade already have a topic with that code');
    when check_violation or not_null_violation then perform public.academic_invalid('topic', 'Give a code (a-z, 0-9, -) and names in Lao and English');
  end;
  return public.academic_admin_list_quiz_bank(jsonb_build_object('subject_id', p_input->>'subject_id', 'grade_id', p_input->>'grade_id'));
end;
$$;

-- Input: id? (edit that draft) | item_key? (start the next version of an
-- approved or retired item) | neither (new item); topic_id, stem_lo, stem_en?,
-- options, correct_key, explanation_lo?, explanation_en?, explanation_origin?,
-- licence?, source?. Returns the saved version.
create or replace function public.academic_admin_save_quiz_item(p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_item public.academic_quiz_items;
  v_key uuid;
  v_next integer;
  v_options jsonb;
begin
  if jsonb_typeof(p_input) is distinct from 'object' then
    perform public.academic_invalid('input', 'Item details are required');
  end if;
  if not exists (select 1 from public.academic_quiz_topics where id = (p_input->>'topic_id')::uuid) then
    perform public.academic_invalid('topic_id', 'Choose a topic');
  end if;
  v_options := p_input->'options';
  if jsonb_typeof(v_options) is distinct from 'array' then
    perform public.academic_invalid('options', 'Give the answer options');
  end if;
  if not (public.academic_quiz_text_allowed(p_input->>'source') and public.academic_quiz_text_allowed(p_input->>'stem_lo')
          and public.academic_quiz_text_allowed(p_input->>'stem_en')) then
    perform public.academic_invalid('source', 'Leaked or official exam questions cannot be used (QUIZ-005)');
  end if;

  begin
    if nullif(p_input->>'id', '') is not null then
      select * into v_item from public.academic_quiz_items where id = (p_input->>'id')::uuid for update;
      if v_item.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Item not found'); end if;
      if v_item.status <> 'draft' then
        perform public.academic_raise('QUIZ_ITEM_LOCKED', 409, 'Only drafts can be edited; return it to draft or save a new version');
      end if;
      update public.academic_quiz_items set
        topic_id = (p_input->>'topic_id')::uuid, stem_lo = btrim(p_input->>'stem_lo'), stem_en = nullif(btrim(p_input->>'stem_en'), ''),
        options = v_options, correct_key = p_input->>'correct_key',
        explanation_lo = nullif(btrim(p_input->>'explanation_lo'), ''), explanation_en = nullif(btrim(p_input->>'explanation_en'), ''),
        explanation_origin = coalesce(p_input->>'explanation_origin', 'human'), licence = coalesce(p_input->>'licence', 'original'),
        source = nullif(btrim(p_input->>'source'), ''), last_edited_by = v_admin
      where id = v_item.id
      returning * into v_item;
    else
      v_key := nullif(p_input->>'item_key', '')::uuid;
      if v_key is not null then
        if not exists (select 1 from public.academic_quiz_items where item_key = v_key) then
          perform public.academic_raise('NOT_FOUND', 404, 'Item not found');
        end if;
        if exists (select 1 from public.academic_quiz_items where item_key = v_key and status in ('draft', 'in_review')) then
          perform public.academic_raise('QUIZ_DRAFT_EXISTS', 409, 'This item already has a version in draft or review');
        end if;
        select max(item_version) + 1 into v_next from public.academic_quiz_items where item_key = v_key;
      end if;
      insert into public.academic_quiz_items (
        item_key, item_version, topic_id, stem_lo, stem_en, options, correct_key, explanation_lo, explanation_en,
        explanation_origin, licence, source, author_id, last_edited_by
      ) values (
        coalesce(v_key, gen_random_uuid()), coalesce(v_next, 1), (p_input->>'topic_id')::uuid, btrim(p_input->>'stem_lo'),
        nullif(btrim(p_input->>'stem_en'), ''), v_options, p_input->>'correct_key',
        nullif(btrim(p_input->>'explanation_lo'), ''), nullif(btrim(p_input->>'explanation_en'), ''),
        coalesce(p_input->>'explanation_origin', 'human'), coalesce(p_input->>'licence', 'original'),
        nullif(btrim(p_input->>'source'), ''), v_admin, v_admin
      )
      returning * into v_item;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation or string_data_right_truncation then
    perform public.academic_invalid('item', 'Write the question in Lao, give a correct answer A–F, and keep texts within their limits');
  end;
  perform public.academic_audit('quiz.item_save', 'quiz_item', v_item.id);
  return public.academic_quiz_item_json(v_item, v_admin);
end;
$$;

-- Actions: submit (draft -> in_review), approve (in_review -> approved; the
-- previous approved version retires), return (in_review -> draft, note
-- required), retire (approved -> retired, note required).
create or replace function public.academic_admin_review_quiz_item(p_item_id uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_item public.academic_quiz_items;
  v_problems jsonb;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_item from public.academic_quiz_items where id = p_item_id for update;
  if v_item.id is null then perform public.academic_raise('NOT_FOUND', 404, 'Item not found'); end if;
  if p_action in ('return', 'retire') and length(coalesce(v_note, '')) < 5 then
    perform public.academic_invalid('note', 'Say why (5 characters or more)');
  end if;

  if p_action = 'submit' and v_item.status = 'draft' then
    v_problems := public.academic_quiz_item_problems(v_item);
    if v_problems <> '{}'::jsonb then
      perform public.academic_raise('QUIZ_ITEM_INCOMPLETE', 400, 'Finish the item before sending it for review', jsonb_build_object('problems', v_problems));
    end if;
    update public.academic_quiz_items set status = 'in_review', submitted_at = now(), review_note = null
    where id = v_item.id returning * into v_item;
  elsif p_action = 'approve' and v_item.status = 'in_review' then
    if public.academic_setting('quiz_four_eyes_required') is not distinct from 'true'::jsonb
       and (v_admin = v_item.author_id or v_admin = v_item.last_edited_by) then
      perform public.academic_raise('FOUR_EYES_REQUIRED', 403, 'Another admin must approve an item you wrote or edited');
    end if;
    update public.academic_quiz_items set status = 'retired', retired_at = now()
    where item_key = v_item.item_key and status = 'approved';
    update public.academic_quiz_items set status = 'approved', reviewed_by = v_admin, reviewed_at = now(), review_note = v_note
    where id = v_item.id returning * into v_item;
  elsif p_action = 'return' and v_item.status = 'in_review' then
    update public.academic_quiz_items set status = 'draft', reviewed_by = v_admin, reviewed_at = now(), review_note = v_note
    where id = v_item.id returning * into v_item;
  elsif p_action = 'retire' and v_item.status = 'approved' then
    update public.academic_quiz_items set status = 'retired', retired_at = now(), review_note = v_note
    where id = v_item.id returning * into v_item;
  else
    perform public.academic_raise('QUIZ_BAD_TRANSITION', 409, 'This item cannot be ' || coalesce(p_action, '?') || ' from ' || v_item.status,
      jsonb_build_object('status', v_item.status, 'action', p_action));
  end if;

  perform public.academic_audit('quiz.item_' || p_action, 'quiz_item', v_item.id, null, 'success', left(v_note, 200));
  return public.academic_quiz_item_json(v_item, v_admin);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.academic_quiz_item_freeze() from public, anon, authenticated;
revoke all on function public.academic_quiz_text_allowed(text) from public, anon, authenticated;
revoke all on function public.academic_quiz_item_problems(public.academic_quiz_items) from public, anon, authenticated;
revoke all on function public.academic_quiz_item_servable(uuid) from public, anon, authenticated;
revoke all on function public.academic_quiz_item_json(public.academic_quiz_items, uuid) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_admin_list_quiz_bank(jsonb)', 'academic_admin_save_quiz_topic(jsonb)',
    'academic_admin_save_quiz_item(jsonb)', 'academic_admin_review_quiz_item(uuid,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
