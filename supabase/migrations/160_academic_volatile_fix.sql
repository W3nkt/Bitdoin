-- My Scores — fix: functions that write must not be STABLE (incident 2026-10-27).
--
-- PostgREST runs STABLE functions in a read-only transaction. Every call to
-- academic_require_user() counts towards the rate limit (an insert into
-- academic_rate_counters, migration 117), so a STABLE function that calls it
-- fails with 25006 "cannot execute INSERT in a read-only transaction" (HTTP
-- 405). Migration 117 made academic_get_session volatile for this reason;
-- migration 152 re-created it as STABLE, which broke the Schooling page for
-- every signed-in user. The career catalogue (148) and the guardian's list of
-- career reports (158) had the same problem. The DB test suite now refuses
-- any callable STABLE function that writes (academic_policies).

alter function public.academic_get_session() volatile;
alter function public.academic_career_catalogue() volatile;
alter function public.academic_guardian_career_reports(uuid) volatile;
