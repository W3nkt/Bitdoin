-- Store one reply for each of the three daily mentor activities.
alter table public.premium_challenge_completions
  add column if not exists responses jsonb not null default '{}'::jsonb;

alter table public.premium_challenge_completions
  alter column completed_at drop not null;

drop policy if exists "premium_challenge_completions_own_update" on public.premium_challenge_completions;
create policy "premium_challenge_completions_own_update"
  on public.premium_challenge_completions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.premium_challenge_completions
  drop constraint if exists premium_challenge_completions_responses_check;

alter table public.premium_challenge_completions
  add constraint premium_challenge_completions_responses_check
  check (
    jsonb_typeof(responses) = 'object'
    and responses - array['reflection', 'challenge', 'mission']::text[] = '{}'::jsonb
  );
