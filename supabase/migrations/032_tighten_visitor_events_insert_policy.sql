-- The broader "to public" grant from migration 030 was unnecessary — the earlier
-- insert failures during testing were actually caused by requesting
-- Prefer: return=representation (which requires SELECT-level RLS on the
-- returned row), not by the insert policy itself. Tighten back to the
-- originally-intended scope.
drop policy if exists "visitor_events_insert_all" on public.visitor_events;
create policy "visitor_events_insert_all" on public.visitor_events
  for insert to anon, authenticated with check (true);
