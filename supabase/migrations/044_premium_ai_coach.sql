-- Premium AI Coach conversations. Provider credentials remain in Edge Function secrets.

create table if not exists public.premium_coach_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null default 'Mentor conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.premium_coach_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.premium_coach_conversations(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (char_length(content) between 1 and 8000),
  created_at      timestamptz not null default now()
);

create index if not exists premium_coach_conversations_user_idx
  on public.premium_coach_conversations (user_id, updated_at desc);
create index if not exists premium_coach_messages_conversation_idx
  on public.premium_coach_messages (conversation_id, created_at);
create index if not exists premium_coach_messages_user_idx
  on public.premium_coach_messages (user_id, created_at desc);

drop trigger if exists premium_coach_conversations_updated_at on public.premium_coach_conversations;
create trigger premium_coach_conversations_updated_at
  before update on public.premium_coach_conversations
  for each row execute function set_updated_at();

alter table public.premium_coach_conversations enable row level security;
alter table public.premium_coach_messages enable row level security;

drop policy if exists "premium_coach_conversations_own_read" on public.premium_coach_conversations;
create policy "premium_coach_conversations_own_read"
  on public.premium_coach_conversations for select
  using (user_id = (select auth.uid()));

drop policy if exists "premium_coach_messages_own_read" on public.premium_coach_messages;
create policy "premium_coach_messages_own_read"
  on public.premium_coach_messages for select
  using (user_id = (select auth.uid()));

-- Writes happen only in the authenticated Edge Function after an ACTIVE subscription check.
revoke insert, update, delete on public.premium_coach_conversations from anon, authenticated;
revoke insert, update, delete on public.premium_coach_messages from anon, authenticated;
