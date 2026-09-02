-- Added separately because migration 079 had already reached the remote project
-- before the Direction count was requested.
create or replace function public.get_prompt_library_catalog_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from public.premium_prompt_library
  where week_start <= timezone('Asia/Vientiane', now())::date
    and (public.has_active_premium_subscription() or public.get_user_role() = 'ADMIN');
$$;

revoke all on function public.get_prompt_library_catalog_count() from public;
grant execute on function public.get_prompt_library_catalog_count() to authenticated;
