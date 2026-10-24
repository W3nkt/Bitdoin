-- STAGING ONLY. Removes the whole My Scores module (migrations 109+): every
-- academic_* table, policy and function, and every My Scores row. Never run
-- this in production: migrations are forward-only there, and student data
-- cannot be recovered after this.
--
-- Kept on purpose: push_subscriptions.my_scores_enabled and the
-- save_push_subscription version from migration 120. Both are core push
-- objects that Bookstore and Academy notifications use; the extra switch is
-- simply unused once the module is gone.

do $$
declare
  r record;
begin
  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname like 'academic-%';
  end if;

  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'academic\_%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  -- Aggregates first: they depend on functions and need DROP AGGREGATE.
  for r in
    select p.oid::regprocedure as signature, p.prokind
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'academic\_%'
    order by p.prokind = 'a' desc
  loop
    if r.prokind = 'a' then
      execute format('drop aggregate if exists %s cascade', r.signature);
    elsif exists (select 1 from pg_proc where oid = r.signature::oid) then
      execute format('drop function if exists %s cascade', r.signature);
    end if;
  end loop;
end;
$$;
