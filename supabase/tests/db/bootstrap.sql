-- Minimal stand-in for the Supabase pieces the academic migrations rely on.
set search_path = "$user", public, extensions;
create schema if not exists extensions;
create schema if not exists auth;
do $$ begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create type user_role as enum ('CUSTOMER', 'ADMIN', 'OPERATIONS', 'FINANCE');
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.get_user_role() returns user_role
language sql stable security definer set search_path = '' as $$
  select role from public.users where id = (select auth.uid());
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.get_user_role() in ('ADMIN', 'OPERATIONS', 'FINANCE'), false);
$$;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
