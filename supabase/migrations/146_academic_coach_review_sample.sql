-- My Scores — Coach review: weekly random sample from consenting students and
-- review results by prompt version (P3-AI #53: ADMIN-009, feeding AI-010;
-- COACH-DESIGN approved by the owner 2026-10-26).
--
-- Students can let a reviewer read some of their Coach chats about their
-- scores (consent purpose 'coach_review', off until they turn it on). Each
-- Monday the previous week's academic conversations from those students are
-- sampled at random: 1% of all that week's conversations or 50, whichever is
-- larger (setting 'coach_review_sample'). One AI answer per sampled
-- conversation joins the reviewer queue next to the reported answers. Text is
-- shown only while the consent is active; withdrawing it removes the open
-- sampled items. Reviewer ratings are summarised by prompt version and model
-- for the evaluation pipeline (scripts/coach-eval.mjs).

-- ─── Consent purpose ─────────────────────────────────────────────────────────

alter table public.academic_consent_records drop constraint if exists academic_consent_records_purpose_check;
alter table public.academic_consent_records add constraint academic_consent_records_purpose_check check (purpose in (
  'module_processing', 'guardian_sharing', 'ocr_processing', 'ai_processing',
  'email', 'push', 'research_samples', 'keep_photos', 'usage_statistics', 'coach_review'
));

update public.academic_settings
set value = value || '["coach_review"]'::jsonb
where key = 'consent_purposes_enabled' and not value ? 'coach_review';

insert into public.academic_settings (key, value, description) values
  ('coach_review_sample', '{"rate": 0.01, "minimum": 50}',
   'ADMIN-009: each week, sample this share of the week''s academic Coach conversations, or the minimum if larger, from students who agreed to coach_review.')
on conflict (key) do nothing;

-- ─── Sampled items in the review queue ───────────────────────────────────────

alter table public.academic_coach_feedback add column if not exists source text not null default 'student';
alter table public.academic_coach_feedback drop constraint if exists academic_coach_feedback_source_check;
alter table public.academic_coach_feedback add constraint academic_coach_feedback_source_check check (source in ('student', 'sample'));
alter table public.academic_coach_feedback add column if not exists sample_week date;
create index if not exists academic_coach_feedback_sample_idx on public.academic_coach_feedback (sample_week) where source = 'sample';

create or replace function public.academic_coach_review_consented(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.academic_consent_records
                 where student_profile_id = p_profile_id and purpose = 'coach_review' and withdrawn_at is null);
$$;

-- Runs weekly (cron below); safe to run again, a week is sampled once.
-- p_week: the Monday of the week to sample; default the previous week in
-- Vientiane.
create or replace function public.academic_coach_weekly_sample(p_week date default null)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_week date := coalesce(p_week, date_trunc('week', public.academic_today())::date - 7);
  v_rule jsonb := coalesce(public.academic_setting('coach_review_sample'), '{}'::jsonb);
  v_total integer;
  v_size integer;
  v_added integer;
begin
  if exists (select 1 from public.academic_coach_feedback where source = 'sample' and sample_week = v_week) then
    return 0;
  end if;

  -- AI answers of the week (pre-approved safety replies have no model).
  select count(distinct c.id) into v_total
  from public.premium_coach_messages m
  join public.premium_coach_conversations c on c.id = m.conversation_id
  where c.mode = 'academic' and m.role = 'assistant' and m.model_id is not null
    and (m.created_at at time zone 'Asia/Vientiane')::date between v_week and v_week + 6;
  v_size := greatest(ceil(v_total * coalesce((v_rule->>'rate')::numeric, 0.01))::integer, coalesce((v_rule->>'minimum')::integer, 50));

  insert into public.academic_coach_feedback (message_id, conversation_id, student_profile_id, source, sample_week)
  select pick.id, pick.conversation_id, pick.student_profile_id, 'sample', v_week
  from (
    select distinct on (c.id) m.id, c.id as conversation_id, c.student_profile_id, random() as r
    from public.premium_coach_messages m
    join public.premium_coach_conversations c on c.id = m.conversation_id
    where c.mode = 'academic' and c.student_profile_id is not null
      and m.role = 'assistant' and m.model_id is not null
      and (m.created_at at time zone 'Asia/Vientiane')::date between v_week and v_week + 6
      and public.academic_coach_review_consented(c.student_profile_id)
    order by c.id, random()
  ) pick
  order by pick.r
  limit v_size
  on conflict (message_id) do nothing;
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

-- Withdrawing the consent takes the student's open sampled items out of the
-- queue (items the student rated or reported themselves stay).
create or replace function public.academic_coach_review_withdrawn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.academic_coach_feedback
  where student_profile_id = new.student_profile_id and source = 'sample' and status = 'open'
    and rating is null and report_category is null;
  return new;
end;
$$;

drop trigger if exists academic_coach_review_withdrawn on public.academic_consent_records;
create trigger academic_coach_review_withdrawn
after update of withdrawn_at on public.academic_consent_records
for each row
when (new.purpose = 'coach_review' and new.withdrawn_at is not null and old.withdrawn_at is null)
execute function public.academic_coach_review_withdrawn();

-- ─── Academic Reviewer (ADMIN-009) ───────────────────────────────────────────

-- Reported, thumbs-down and sampled answers, unsafe first. Text is shown when
-- the student shared that answer, or for a sampled one while the student's
-- coach_review consent is active. 'ratings': reviewed items of the last 90
-- days by prompt version and model (AI-010 uses them).
create or replace function public.academic_admin_ai_review(p_status text default 'open')
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
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'conversation_id', x.conversation_id, 'rating', x.rating, 'report_category', x.report_category, 'priority', x.priority,
        'source', x.source, 'sample_week', x.sample_week,
        'share_text', x.visible, 'comment', x.comment, 'status', x.status, 'created_at', x.created_at,
        'answer', case when x.visible then x.content end,
        'question', case when x.visible then (select q.content from public.premium_coach_messages q
                    where q.conversation_id = x.conversation_id and q.role = 'user' and q.created_at <= x.message_at order by q.created_at desc limit 1) end,
        'prompt_version', x.prompt_version, 'model_id', x.model_id, 'numbers_checked', x.numbers_checked, 'safety_category', x.safety_category,
        'review', case when x.status = 'reviewed' then jsonb_build_object('accuracy', x.review_accuracy, 'lao', x.review_lao, 'safety', x.review_safety,
                  'note', x.review_note, 'at', x.reviewed_at, 'by', (select name from public.users where id = x.reviewed_by)) end
      ) order by x.priority desc, (x.source = 'sample'), x.created_at)
      from (
        select f.*, m.content, m.created_at as message_at, m.prompt_version, m.model_id, m.numbers_checked, m.safety_category,
               f.share_text or (f.source = 'sample' and public.academic_coach_review_consented(f.student_profile_id)) as visible
        from public.academic_coach_feedback f join public.premium_coach_messages m on m.id = f.message_id
        where f.status = coalesce(p_status, 'open')
          and (f.rating = -1 or f.report_category is not null or f.source = 'sample' or f.status = 'reviewed')
      ) x
    ), '[]'::jsonb),
    'last_7_days', (
      select jsonb_build_object(
        'answers', count(*) filter (where m.role = 'assistant'),
        'safety_redirects', count(*) filter (where m.safety_category is not null),
        'numbers_fallbacks', count(*) filter (where m.numbers_checked = false),
        'thumbs_up', (select count(*) from public.academic_coach_feedback where rating = 1 and created_at > now() - interval '7 days'),
        'thumbs_down', (select count(*) from public.academic_coach_feedback where rating = -1 and created_at > now() - interval '7 days'),
        'provider_failures', (select count(*) from public.academic_ai_calls where not ok and created_at > now() - interval '7 days'))
      from public.premium_coach_messages m join public.premium_coach_conversations c on c.id = m.conversation_id
      where c.mode = 'academic' and m.created_at > now() - interval '7 days'),
    'sample', (
      select jsonb_build_object('week', max(sample_week), 'items', count(*) filter (where sample_week = (select max(sample_week) from public.academic_coach_feedback where source = 'sample')),
        'consenting_students', (select count(*) from public.academic_consent_records where purpose = 'coach_review' and withdrawn_at is null),
        'rule', public.academic_setting('coach_review_sample'))
      from public.academic_coach_feedback where source = 'sample'),
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object('prompt_version', r.prompt_version, 'model_id', r.model_id, 'reviewed', r.n,
        'accuracy', r.accuracy, 'lao', r.lao, 'safety', r.safety) order by r.prompt_version desc, r.model_id)
      from (
        select m.prompt_version, m.model_id, count(*) as n,
               round(avg(f.review_accuracy), 2) as accuracy, round(avg(f.review_lao), 2) as lao, round(avg(f.review_safety), 2) as safety
        from public.academic_coach_feedback f join public.premium_coach_messages m on m.id = f.message_id
        where f.status = 'reviewed' and f.reviewed_at > now() - interval '90 days' and m.model_id is not null
        group by m.prompt_version, m.model_id
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

-- ─── Grants and schedule ─────────────────────────────────────────────────────

revoke all on function public.academic_coach_review_consented(uuid) from public, anon, authenticated;
revoke all on function public.academic_coach_weekly_sample(date) from public, anon, authenticated;
revoke all on function public.academic_coach_review_withdrawn() from public, anon, authenticated;
revoke all on function public.academic_admin_ai_review(text) from public, anon;
grant execute on function public.academic_admin_ai_review(text) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-coach-review-sample';
select cron.schedule(
  'academic-coach-review-sample',
  '30 18 * * 0', -- Monday 01:30 Asia/Vientiane, for the week that just ended
  $$select public.academic_coach_weekly_sample();$$
);
