-- Recover runs abandoned by a closed tab, failed request, or lost connection.
update public.premium_weekly_content_runs
set status = 'CANCELLED',
    error_message = coalesce(error_message, 'Generation was interrupted and automatically stopped.'),
    completed_at = now()
where status = 'GENERATING'
  and updated_at < now() - interval '20 minutes';
