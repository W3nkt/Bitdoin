-- STAGING ONLY. Removes the whole My Scores module (migrations 109+): every
-- academic_* table, policy and function, and every My Scores row. Never run
-- this in production: migrations are forward-only there, and student data
-- cannot be recovered after this.

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'academic\_%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'academic\_%'
  loop
    execute format('drop function if exists %s cascade', r.signature);
  end loop;
end;
$$;
