-- Bitdoin Premium Learning Hub: lessons, quizzes, weekly challenges, and habits.

create table if not exists public.premium_learning_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_lo text not null,
  description_en text not null default '',
  description_lo text not null default '',
  icon text not null default 'book-open',
  accent text not null default 'indigo',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.premium_learning_categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_en text not null,
  title_lo text not null,
  summary_en text not null default '',
  summary_lo text not null default '',
  content_en jsonb not null default '[]'::jsonb check (jsonb_typeof(content_en) = 'array'),
  content_lo jsonb not null default '[]'::jsonb check (jsonb_typeof(content_lo) = 'array'),
  key_takeaways_en text[] not null default '{}',
  key_takeaways_lo text[] not null default '{}',
  difficulty text not null default 'BEGINNER' check (difficulty in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  estimated_minutes integer not null default 5 check (estimated_minutes between 1 and 240),
  lesson_type text not null default 'LESSON'
    check (lesson_type in ('LESSON', 'READING_SUMMARY', 'SCHOLARSHIP', 'CAREER', 'BUSINESS_IDEA')),
  source_url text,
  source_verified_at timestamptz,
  application_deadline date,
  is_preview boolean not null default false,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.premium_lessons(id) on delete cascade,
  prompt_en text not null,
  prompt_lo text not null,
  options_en jsonb not null check (jsonb_typeof(options_en) = 'array' and jsonb_array_length(options_en) between 2 and 6),
  options_lo jsonb not null check (jsonb_typeof(options_lo) = 'array' and jsonb_array_length(options_lo) between 2 and 6),
  correct_index integer not null check (correct_index between 0 and 5),
  explanation_en text not null default '',
  explanation_lo text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.premium_lessons(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  quiz_score integer check (quiz_score between 0 and 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.premium_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.premium_lessons(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers) = 'array'),
  score integer not null check (score between 0 and 100),
  completed_at timestamptz not null default now()
);

create table if not exists public.premium_weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_lo text not null,
  description_en text not null,
  description_lo text not null,
  category_slug text not null default 'productivity',
  steps_en jsonb not null default '[]'::jsonb check (jsonb_typeof(steps_en) = 'array'),
  steps_lo jsonb not null default '[]'::jsonb check (jsonb_typeof(steps_lo) = 'array'),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  points integer not null default 100 check (points between 0 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_weekly_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid not null references public.premium_weekly_challenges(id) on delete cascade,
  completed_steps integer[] not null default '{}',
  reflection text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create table if not exists public.premium_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category_slug text not null default 'productivity',
  frequency text not null default 'DAILY' check (frequency in ('DAILY', 'WEEKDAYS', 'WEEKLY')),
  target_days smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  reminder_time time,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  habit_id uuid not null references public.premium_habits(id) on delete cascade,
  checkin_date date not null default timezone('Asia/Vientiane', now())::date,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, checkin_date)
);

create index if not exists premium_lessons_category_status_idx
  on public.premium_lessons (category_id, status, sort_order);
create index if not exists premium_lesson_progress_user_updated_idx
  on public.premium_lesson_progress (user_id, updated_at desc);
create index if not exists premium_quiz_attempts_user_lesson_idx
  on public.premium_quiz_attempts (user_id, lesson_id, completed_at desc);
create index if not exists premium_weekly_challenges_dates_idx
  on public.premium_weekly_challenges (starts_on, ends_on) where is_active = true;
create index if not exists premium_weekly_progress_user_idx
  on public.premium_weekly_challenge_progress (user_id, updated_at desc);
create index if not exists premium_habits_user_active_idx
  on public.premium_habits (user_id, is_active) where archived_at is null;
create index if not exists premium_habit_checkins_user_date_idx
  on public.premium_habit_checkins (user_id, checkin_date desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'premium_learning_categories', 'premium_lessons', 'premium_lesson_progress',
    'premium_weekly_challenges', 'premium_weekly_challenge_progress', 'premium_habits'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

alter table public.premium_learning_categories enable row level security;
alter table public.premium_lessons enable row level security;
alter table public.premium_quiz_questions enable row level security;
alter table public.premium_lesson_progress enable row level security;
alter table public.premium_quiz_attempts enable row level security;
alter table public.premium_weekly_challenges enable row level security;
alter table public.premium_weekly_challenge_progress enable row level security;
alter table public.premium_habits enable row level security;
alter table public.premium_habit_checkins enable row level security;

create or replace function public.has_active_premium_subscription(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.premium_subscriptions s
    where s.user_id = p_user_id
      and s.status = 'ACTIVE'
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

revoke all on function public.has_active_premium_subscription(uuid) from public, anon;
grant execute on function public.has_active_premium_subscription(uuid) to authenticated;

create policy "premium_categories_member_read" on public.premium_learning_categories for select to authenticated
  using (is_active and public.has_active_premium_subscription());
create policy "premium_lessons_member_read" on public.premium_lessons for select to authenticated
  using (status = 'PUBLISHED' and public.has_active_premium_subscription());
create policy "premium_quizzes_member_read" on public.premium_quiz_questions for select to authenticated
  using (public.has_active_premium_subscription());
create policy "premium_challenges_member_read" on public.premium_weekly_challenges for select to authenticated
  using (is_active and public.has_active_premium_subscription());

create policy "premium_learning_admin_all" on public.premium_learning_categories for all
  using (get_user_role() = 'ADMIN') with check (get_user_role() = 'ADMIN');
create policy "premium_lessons_admin_all" on public.premium_lessons for all
  using (get_user_role() = 'ADMIN') with check (get_user_role() = 'ADMIN');
create policy "premium_quizzes_admin_all" on public.premium_quiz_questions for all
  using (get_user_role() = 'ADMIN') with check (get_user_role() = 'ADMIN');
create policy "premium_challenges_admin_all" on public.premium_weekly_challenges for all
  using (get_user_role() = 'ADMIN') with check (get_user_role() = 'ADMIN');

create policy "premium_lesson_progress_own_all" on public.premium_lesson_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());
create policy "premium_quiz_attempts_own_read" on public.premium_quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "premium_quiz_attempts_own_insert" on public.premium_quiz_attempts for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());
create policy "premium_weekly_progress_own_all" on public.premium_weekly_challenge_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());
create policy "premium_habits_own_all" on public.premium_habits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());
create policy "premium_habit_checkins_own_all" on public.premium_habit_checkins for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.has_active_premium_subscription());

grant select on public.premium_learning_categories, public.premium_lessons,
  public.premium_quiz_questions, public.premium_weekly_challenges to authenticated;
grant insert, update, delete on public.premium_learning_categories, public.premium_lessons,
  public.premium_quiz_questions, public.premium_weekly_challenges to authenticated;
grant select, insert, update, delete on public.premium_lesson_progress,
  public.premium_weekly_challenge_progress, public.premium_habits,
  public.premium_habit_checkins to authenticated;
grant select, insert on public.premium_quiz_attempts to authenticated;

insert into public.premium_learning_categories
  (slug, name_en, name_lo, description_en, description_lo, icon, accent, sort_order)
values
  ('reading-summaries', 'Reading summaries', 'ສະຫຼຸບປຶ້ມ', 'Big ideas from useful books, turned into practical actions.', 'ແນວຄິດສຳຄັນຈາກປຶ້ມ ແລະ ວິທີນຳໄປໃຊ້.', 'book-open', 'violet', 1),
  ('money', 'Money lessons', 'ບົດຮຽນການເງິນ', 'Build confident everyday money habits.', 'ສ້າງນິໄສການເງິນທີ່ດີໃນຊີວິດປະຈຳວັນ.', 'wallet', 'emerald', 2),
  ('ai-skills', 'AI skills', 'ທັກສະ AI', 'Use AI thoughtfully for study, work, and creativity.', 'ໃຊ້ AI ເພື່ອການຮຽນ ວຽກ ແລະ ຄວາມຄິດສ້າງສັນ.', 'sparkles', 'blue', 3),
  ('english', 'English', 'ພາສາອັງກິດ', 'Practice useful English with confidence.', 'ຝຶກພາສາອັງກິດທີ່ໃຊ້ໄດ້ຈິງ.', 'languages', 'amber', 4),
  ('productivity', 'Productivity', 'ການເຮັດວຽກຢ່າງມີຜົນ', 'Focus better and finish what matters.', 'ຈົດຈໍ່ ແລະ ສຳເລັດສິ່ງສຳຄັນ.', 'timer', 'rose', 5),
  ('career', 'Career advice', 'ຄຳແນະນຳອາຊີບ', 'Make clearer education and career decisions.', 'ຕັດສິນໃຈດ້ານການຮຽນ ແລະ ອາຊີບໄດ້ດີຂຶ້ນ.', 'briefcase', 'cyan', 6),
  ('scholarships', 'Scholarships', 'ທຶນການສຶກສາ', 'Find opportunities and prepare stronger applications.', 'ຊອກຫາທຶນ ແລະ ກະກຽມໃບສະໝັກ.', 'graduation-cap', 'indigo', 7),
  ('business-ideas', 'Business ideas', 'ແນວຄິດທຸລະກິດ', 'Test small ideas before risking your money.', 'ທົດສອບແນວຄິດກ່ອນລົງທຶນ.', 'lightbulb', 'orange', 8)
on conflict (slug) do update set
  name_en = excluded.name_en, name_lo = excluded.name_lo,
  description_en = excluded.description_en, description_lo = excluded.description_lo,
  icon = excluded.icon, accent = excluded.accent, sort_order = excluded.sort_order, is_active = true;

insert into public.premium_lessons
  (category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
   key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, is_preview, status, published_at, sort_order)
select c.id, seed.slug, seed.title_en, seed.title_lo, seed.summary_en, seed.summary_lo,
  seed.content_en::jsonb, seed.content_lo::jsonb, seed.takeaways_en, seed.takeaways_lo,
  seed.minutes, seed.lesson_type, seed.preview, 'PUBLISHED', now(), seed.sort_order
from public.premium_learning_categories c
join (values
  ('money','build-your-first-budget','Build your first simple budget','ສ້າງແຜນງົບປະມານທຳອິດ','Give every kip a clear job before you spend it.','ກຳນົດໜ້າທີ່ໃຫ້ເງິນທຸກກີບກ່ອນໃຊ້.',
   '[{"heading":"Start with reality","body":"Write down the money you actually receive each month, then list essential costs first."},{"heading":"Use three buckets","body":"Separate needs, future savings, and flexible spending. Start small and adjust weekly."},{"heading":"Your action","body":"Plan the next 100,000 LAK before spending it."}]',
   '[{"heading":"ເລີ່ມຈາກຄວາມຈິງ","body":"ຂຽນລາຍຮັບຈິງຕໍ່ເດືອນ ແລະ ຈັດຄ່າໃຊ້ຈ່າຍຈຳເປັນກ່ອນ."},{"heading":"ແບ່ງເປັນສາມສ່ວນ","body":"ແບ່ງເງິນສຳລັບຄວາມຈຳເປັນ, ອະນາຄົດ ແລະ ຄ່າໃຊ້ຈ່າຍຍືດຫຍຸ່ນ."},{"heading":"ລົງມື","body":"ວາງແຜນເງິນ 100,000 ກີບຕໍ່ໄປກ່ອນໃຊ້."}]',
   array['Plan before spending','Save a small amount consistently','Review the plan every week'], array['ວາງແຜນກ່ອນໃຊ້','ອອມເງິນຈຳນວນນ້ອຍຢ່າງສະໝ່ຳສະເໝີ','ທົບທວນທຸກອາທິດ'], 8, 'LESSON', true, 1),
  ('ai-skills','ask-ai-better-questions','Ask AI better questions','ຖາມ AI ໃຫ້ໄດ້ຄຳຕອບດີ','A useful prompt gives context, a clear task, and the desired format.','Prompt ທີ່ດີມີບໍລິບົດ, ໜ້າວຽກ ແລະ ຮູບແບບຄຳຕອບ.',
   '[{"heading":"Give context","body":"Explain who you are, what you are working on, and what you already know."},{"heading":"Name the task","body":"Use a clear verb: explain, compare, critique, plan, or practice."},{"heading":"Check the answer","body":"AI can be wrong. Verify important facts with reliable sources."}]',
   '[{"heading":"ໃຫ້ບໍລິບົດ","body":"ອະທິບາຍວ່າທ່ານແມ່ນໃຜ, ກຳລັງເຮັດຫຍັງ ແລະ ຮູ້ຫຍັງແລ້ວ."},{"heading":"ລະບຸໜ້າວຽກ","body":"ໃຊ້ຄຳສັ່ງຊັດເຈນ: ອະທິບາຍ, ປຽບທຽບ, ວິຈານ ຫຼື ວາງແຜນ."},{"heading":"ກວດຄຳຕອບ","body":"AI ອາດຜິດໄດ້. ກວດຂໍ້ມູນສຳຄັນຈາກແຫຼ່ງທີ່ໜ້າເຊື່ອຖື."}]',
   array['Context improves relevance','Clear tasks produce clearer output','Verify important claims'], array['ບໍລິບົດຊ່ວຍໃຫ້ຄຳຕອບກ່ຽວຂ້ອງ','ໜ້າວຽກຊັດເຈນໄດ້ຄຳຕອບຊັດເຈນ','ກວດສອບຂໍ້ມູນສຳຄັນ'], 7, 'LESSON', true, 1),
  ('english','introduce-yourself-confidently','Introduce yourself confidently','ແນະນຳຕົນເອງຢ່າງໝັ້ນໃຈ','Use a simple four-part structure in school, work, and interviews.','ໃຊ້ໂຄງສ້າງສີ່ສ່ວນສຳລັບໂຮງຮຽນ, ວຽກ ແລະ ສຳພາດ.',
   '[{"heading":"Four useful lines","body":"Say your name, current role, strongest interest, and what you hope to do next."},{"heading":"Keep it natural","body":"Short sentences are easier to say clearly and remember."},{"heading":"Practice aloud","body":"Record yourself twice. Improve one thing on the second attempt."}]',
   '[{"heading":"ສີ່ປະໂຫຍກທີ່ໃຊ້ໄດ້","body":"ບອກຊື່, ບົດບາດປັດຈຸບັນ, ຄວາມສົນໃຈ ແລະ ເປົ້າໝາຍຕໍ່ໄປ."},{"heading":"ເວົ້າໃຫ້ທຳມະຊາດ","body":"ປະໂຫຍກສັ້ນເວົ້າຊັດ ແລະ ຈື່ງ່າຍ."},{"heading":"ຝຶກອອກສຽງ","body":"ອັດສຽງສອງຄັ້ງ ແລະ ປັບປຸງໜຶ່ງຢ່າງໃນຄັ້ງທີສອງ."}]',
   array['Use four short parts','Speak slowly and clearly','Improve through recording'], array['ໃຊ້ສີ່ສ່ວນສັ້ນໆ','ເວົ້າຊ້າ ແລະ ຊັດ','ປັບປຸງດ້ວຍການອັດສຽງ'], 6, 'LESSON', true, 1),
  ('productivity','the-one-task-rule','The one-task rule','ກົດໜຶ່ງໜ້າວຽກ','Choose the one result that would make today meaningful.','ເລືອກໜຶ່ງຜົນລັບທີ່ເຮັດໃຫ້ມື້ນີ້ມີຄວາມໝາຍ.',
   '[{"heading":"Decide before reacting","body":"Choose your most important task before messages and small requests take over."},{"heading":"Make it startable","body":"Turn the task into a clear first action that takes less than five minutes to begin."},{"heading":"Protect one block","body":"Work for 25 focused minutes with notifications away."}]',
   '[{"heading":"ຕັດສິນໃຈກ່ອນຕອບສະໜອງ","body":"ເລືອກວຽກສຳຄັນກ່ອນຂໍ້ຄວາມ ແລະ ວຽກນ້ອຍໆ."},{"heading":"ເຮັດໃຫ້ເລີ່ມໄດ້","body":"ປ່ຽນວຽກໃຫຍ່ເປັນຂັ້ນຕອນທຳອິດທີ່ເລີ່ມໄດ້ພາຍໃນຫ້ານາທີ."},{"heading":"ປົກປ້ອງເວລາ","body":"ເຮັດວຽກ 25 ນາທີໂດຍປິດການແຈ້ງເຕືອນ."}]',
   array['Pick one meaningful outcome','Define the first tiny action','Protect a focused work block'], array['ເລືອກໜຶ່ງຜົນລັບສຳຄັນ','ກຳນົດຂັ້ນຕອນນ້ອຍທຳອິດ','ຈັດເວລາຈົດຈໍ່'], 5, 'LESSON', true, 1),
  ('reading-summaries','atomic-habits-practical-summary','Atomic Habits: practical summary','Atomic Habits: ສະຫຼຸບນຳໃຊ້','An original practical overview of building better systems through small actions.','ສະຫຼຸບແນວຄິດຕົ້ນສະບັບເພື່ອສ້າງລະບົບທີ່ດີດ້ວຍການກະທຳນ້ອຍໆ.',
   '[{"heading":"Focus on systems","body":"Goals set direction, but repeated systems create results."},{"heading":"Make good habits easier","body":"Use obvious cues, reduce friction, and reward completion."},{"heading":"Start tiny","body":"Choose a version so small that it is difficult to avoid."}]',
   '[{"heading":"ສຸມໃສ່ລະບົບ","body":"ເປົ້າໝາຍກຳນົດທິດທາງ ແຕ່ລະບົບທີ່ເຮັດຊ້ຳສ້າງຜົນລັບ."},{"heading":"ເຮັດໃຫ້ນິໄສດີງ່າຍ","body":"ໃຊ້ສັນຍານຊັດ, ຫຼຸດອຸປະສັກ ແລະ ໃຫ້ລາງວັນເມື່ອສຳເລັດ."},{"heading":"ເລີ່ມນ້ອຍ","body":"ເລືອກການກະທຳທີ່ນ້ອຍຈົນຍາກຈະຫຼີກລ້ຽງ."}]',
   array['Systems beat intentions','Environment shapes behavior','Small repetitions compound'], array['ລະບົບດີກວ່າຄວາມຕັ້ງໃຈ','ສິ່ງແວດລ້ອມກຳນົດພຶດຕິກຳ','ການເຮັດນ້ອຍໆຊ້ຳກັນສ້າງຜົນໃຫຍ່'], 10, 'READING_SUMMARY', false, 1)
) as seed(category_slug,slug,title_en,title_lo,summary_en,summary_lo,content_en,content_lo,takeaways_en,takeaways_lo,minutes,lesson_type,preview,sort_order)
on c.slug = seed.category_slug
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED', published_at = coalesce(public.premium_lessons.published_at, now());

insert into public.premium_lessons
  (category_id, slug, title_en, title_lo, summary_en, summary_lo, content_en, content_lo,
   key_takeaways_en, key_takeaways_lo, estimated_minutes, lesson_type, status, published_at, sort_order)
select c.id, seed.slug, seed.title_en, seed.title_lo, seed.summary_en, seed.summary_lo,
  jsonb_build_array(jsonb_build_object('heading', seed.heading_en, 'body', seed.body_en)),
  jsonb_build_array(jsonb_build_object('heading', seed.heading_lo, 'body', seed.body_lo)),
  seed.takeaways_en, seed.takeaways_lo, seed.minutes, seed.lesson_type, 'PUBLISHED', now(), 1
from public.premium_learning_categories c
join (values
  ('career','career-direction-map','Create your career direction map','ສ້າງແຜນທິດທາງອາຊີບ',
   'Connect your strengths, interests, and real opportunities.','ເຊື່ອມຕໍ່ຈຸດແຂງ, ຄວາມສົນໃຈ ແລະ ໂອກາດຈິງ.',
   'Map three signals','List what you do well, problems you enjoy solving, and roles that employers or customers need. Choose one role to investigate this week.',
   'ວາງແຜນສາມສັນຍານ','ຂຽນສິ່ງທີ່ທ່ານເຮັດໄດ້ດີ, ບັນຫາທີ່ມັກແກ້ ແລະ ວຽກທີ່ຕະຫຼາດຕ້ອງການ.',
   array['Explore before committing','Talk to someone doing the work','Build one proof-of-skill project'],
   array['ສຳຫຼວດກ່ອນຕັດສິນໃຈ','ສົນທະນາກັບຄົນໃນອາຊີບ','ສ້າງໜຶ່ງຜົນງານພິສູດທັກສະ'],8,'CAREER'),
  ('scholarships','scholarship-application-checklist','Scholarship application checklist','ລາຍການກະກຽມສະໝັກທຶນ',
   'Prepare a complete, verified application without last-minute stress.','ກະກຽມໃບສະໝັກທີ່ຄົບຖ້ວນ ແລະ ກວດສອບແລ້ວ.',
   'Build your application folder','Confirm eligibility on the official provider website. Collect transcripts, identification, references, language results, and essay drafts before the deadline.',
   'ສ້າງໂຟນເດີໃບສະໝັກ','ກວດເງື່ອນໄຂຈາກເວັບທາງການ ແລະ ກະກຽມຄະແນນ, ເອກະສານ, ຜູ້ຮັບຮອງ ແລະ ບົດຄວາມ.',
   array['Use only official requirements','Ask for references early','Submit before the final day'],
   array['ໃຊ້ຂໍ້ມູນທາງການ','ຂໍໃບຮັບຮອງໄວ','ສົ່ງກ່ອນມື້ສຸດທ້າຍ'],9,'SCHOLARSHIP'),
  ('business-ideas','test-a-business-idea','Test a business idea cheaply','ທົດສອບແນວຄິດທຸລະກິດແບບປະຢັດ',
   'Learn from customers before spending heavily.','ຮຽນຈາກລູກຄ້າກ່ອນລົງທຶນຫຼາຍ.',
   'Test the problem first','Describe one customer and one painful problem. Interview five people, offer a simple manual solution, and measure whether anyone will pay.',
   'ທົດສອບບັນຫາກ່ອນ','ລະບຸລູກຄ້າໜຶ່ງກຸ່ມ ແລະ ບັນຫາໜຶ່ງຢ່າງ. ສຳພາດຫ້າຄົນ ແລະ ລອງສະເໜີທາງແກ້ງ່າຍໆ.',
   array['Problems matter more than ideas','Interview before building','A payment is stronger evidence than praise'],
   array['ບັນຫາສຳຄັນກວ່າແນວຄິດ','ສຳພາດກ່ອນສ້າງ','ການຈ່າຍເງິນແມ່ນຫຼັກຖານທີ່ດີ'],8,'BUSINESS_IDEA')
) as seed(category_slug,slug,title_en,title_lo,summary_en,summary_lo,heading_en,body_en,heading_lo,body_lo,takeaways_en,takeaways_lo,minutes,lesson_type)
on c.slug = seed.category_slug
on conflict (slug) do update set
  title_en = excluded.title_en, title_lo = excluded.title_lo,
  summary_en = excluded.summary_en, summary_lo = excluded.summary_lo,
  content_en = excluded.content_en, content_lo = excluded.content_lo,
  key_takeaways_en = excluded.key_takeaways_en, key_takeaways_lo = excluded.key_takeaways_lo,
  status = 'PUBLISHED';

insert into public.premium_quiz_questions
  (lesson_id, prompt_en, prompt_lo, options_en, options_lo, correct_index, explanation_en, explanation_lo, sort_order)
select l.id,
  'What should you do before spending money from a budget?',
  'ກ່ອນໃຊ້ເງິນຈາກງົບປະມານຄວນເຮັດຫຍັງ?',
  '["Give the money a purpose","Buy first and record later","Ignore small expenses"]'::jsonb,
  '["ກຳນົດໜ້າທີ່ໃຫ້ເງິນ","ຊື້ກ່ອນແລ້ວຈຶ່ງບັນທຶກ","ບໍ່ສົນໃຈລາຍຈ່າຍນ້ອຍ"]'::jsonb,
  0,
  'Planning first makes the budget useful.',
  'ການວາງແຜນກ່ອນເຮັດໃຫ້ງົບປະມານມີປະໂຫຍດ.',
  1
from public.premium_lessons l
where l.slug = 'build-your-first-budget'
and not exists (
  select 1 from public.premium_quiz_questions q
  where q.lesson_id = l.id and q.sort_order = 1
);

insert into public.premium_weekly_challenges
  (slug, title_en, title_lo, description_en, description_lo, category_slug, steps_en, steps_lo, starts_on, ends_on, points)
values (
  'seven-day-focus-reset',
  '7-day focus reset',
  'ຟື້ນຟູຄວາມຈົດຈໍ່ 7 ມື້',
  'Complete one protected 25-minute focus block each day.',
  'ເຮັດວຽກແບບຈົດຈໍ່ 25 ນາທີໃນແຕ່ລະມື້.',
  'productivity',
  '["Choose one important task","Put your phone away","Focus for 25 minutes","Write what you completed","Repeat on five days"]',
  '["ເລືອກໜຶ່ງວຽກສຳຄັນ","ວາງໂທລະສັບໄວ້ໄກ","ຈົດຈໍ່ 25 ນາທີ","ຂຽນສິ່ງທີ່ສຳເລັດ","ເຮັດຊ້ຳໃຫ້ຄົບຫ້າມື້"]',
  current_date - extract(dow from current_date)::integer + 1,
  current_date - extract(dow from current_date)::integer + 7,
  100
)
on conflict (slug) do update set
  starts_on = excluded.starts_on, ends_on = excluded.ends_on, is_active = true;
