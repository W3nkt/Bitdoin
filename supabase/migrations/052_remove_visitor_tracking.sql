-- Visitor analytics now uses Google Analytics instead of Postgres.
drop function if exists public.get_admin_visitor_tracking_events(integer);
drop table if exists public.visitor_events;

