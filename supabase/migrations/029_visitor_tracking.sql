-- Visitor tracking: page views, book views, cart/checkout funnel, and clicks
-- for the admin "Visitor Tracking" dashboard. Written by anonymous browsers,
-- so RLS allows open insert but restricts reads to admin/operations staff.

create table public.visitor_events (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  uuid not null,
  session_id  uuid not null,
  event_type  text not null check (event_type in (
                'page_view', 'page_duration', 'book_view',
                'add_to_cart', 'checkout_started', 'checkout_completed', 'click'
              )),
  path        text,
  label       text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index visitor_events_created_at_idx on public.visitor_events (created_at);
create index visitor_events_event_type_idx on public.visitor_events (event_type);
create index visitor_events_visitor_id_idx on public.visitor_events (visitor_id);

alter table public.visitor_events enable row level security;

-- Anyone (including anonymous visitors) can log an event, but never read others'.
create policy "visitor_events_insert_all" on public.visitor_events
  for insert to anon, authenticated with check (true);

create policy "visitor_events_admin_read" on public.visitor_events
  for select using (get_user_role() in ('ADMIN', 'OPERATIONS'));
