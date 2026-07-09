-- Bitdoin Premium onboarding responses, used to personalize AI Coach and daily guidance.
--
-- `responses` is a flexible jsonb blob (no fixed columns, easy to extend via
-- progressive profiling). Its keys follow the AI Memory Schema field names
-- from Premium/BitDoin_AI_Personalization_System.md section 1, e.g.
-- preferred_name, current_status, priority_goal, biggest_problem_now,
-- daily_study_hours, ai_tool_experience, english_level_self_rating,
-- motivation_source, preferred_mentor_tone, preferred_ai_response_style,
-- whatsapp_number, daily_reminder_time.
-- See src/lib/bitdoinMentor.ts for the prompt-assembly helper that consumes it.
create table if not exists public.premium_onboarding_responses (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade unique,
  responses    jsonb not null default '{}'::jsonb,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists premium_onboarding_responses_user_idx on public.premium_onboarding_responses (user_id);

drop trigger if exists premium_onboarding_responses_updated_at on public.premium_onboarding_responses;
create trigger premium_onboarding_responses_updated_at
  before update on public.premium_onboarding_responses
  for each row execute function set_updated_at();

alter table public.premium_onboarding_responses enable row level security;

drop policy if exists "premium_onboarding_own_read" on public.premium_onboarding_responses;
create policy "premium_onboarding_own_read"
  on public.premium_onboarding_responses for select
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));

drop policy if exists "premium_onboarding_own_insert" on public.premium_onboarding_responses;
create policy "premium_onboarding_own_insert"
  on public.premium_onboarding_responses for insert
  with check (user_id = auth.uid());

drop policy if exists "premium_onboarding_own_update" on public.premium_onboarding_responses;
create policy "premium_onboarding_own_update"
  on public.premium_onboarding_responses for update
  using (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'))
  with check (user_id = auth.uid() or get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'));
