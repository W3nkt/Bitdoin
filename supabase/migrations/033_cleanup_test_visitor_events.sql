-- Remove the test rows inserted while debugging the insert policy/grants.
delete from public.visitor_events where path in ('/test', '/test-confirm', '/test-final');
