drop policy if exists "visitor_events_insert_all" on public.visitor_events;
create policy "visitor_events_insert_all" on public.visitor_events
  for insert to public with check (true);
