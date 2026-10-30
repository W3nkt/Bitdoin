-- Facebook sign-in from the Bitdoin app (it opens the Facebook app to authorize).
--
-- The app gets a Facebook access token from Facebook's own login. Supabase's built-in Facebook
-- provider cannot check such a token, so the facebook-native-login Edge Function checks it with
-- Facebook and then needs to know which Bitdoin account that Facebook person is. This is that
-- lookup. It reads auth.identities / auth.users, which the API cannot reach, so it is
-- SECURITY DEFINER and only the service role (that Edge Function) may run it.
--
--   facebook_login_lookup(facebook_id, email)
--     -> null                                    no account yet (the function creates one)
--     -> {user_id, email, matched_by, blocked}   matched_by 'identity': this Facebook id is on the
--                                                account, either as a Facebook identity (the person
--                                                signed in through the website) or in app_metadata
--                                                (the account was made, or first linked, by the app)
--                                                'email': an account with the same email, which
--                                                Facebook has confirmed (the linking Supabase does
--                                                for the website too)
--     -> {conflict: true}                        that email's account already belongs to a
--                                                different Facebook profile: not signed in
--
-- Only server-controlled data is trusted for the Facebook id: never user_metadata, which the
-- signed-in person can edit (they could claim someone else's Facebook id).
-- Nothing changes for existing sign-in methods.

create or replace function public.facebook_login_lookup(p_facebook_id text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user auth.users%rowtype;
  v_by   text;
begin
  if p_facebook_id is null or length(p_facebook_id) not between 1 and 64 then
    return null;
  end if;

  select u.* into v_user
  from auth.users u
  where u.deleted_at is null
    and (
      exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'facebook' and i.provider_id = p_facebook_id
      )
      or u.raw_app_meta_data->>'facebook_id' = p_facebook_id
    )
  limit 1;
  if found then
    v_by := 'identity';
  elsif nullif(trim(p_email), '') is not null then
    select u.* into v_user
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and u.deleted_at is null
    limit 1;
    if found then
      if (v_user.raw_app_meta_data->>'facebook_id') is distinct from p_facebook_id
         and (
           (v_user.raw_app_meta_data->>'facebook_id') is not null
           or exists (
             select 1 from auth.identities i
             where i.user_id = v_user.id and i.provider = 'facebook' and i.provider_id <> p_facebook_id
           )
         ) then
        return jsonb_build_object('conflict', true);
      end if;
      v_by := 'email';
    end if;
  end if;

  if v_by is null then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', v_user.id,
    'email', v_user.email,
    'matched_by', v_by,
    'blocked', coalesce(v_user.banned_until > now(), false)
  );
end;
$$;

revoke all on function public.facebook_login_lookup(text, text) from public, anon, authenticated;
grant execute on function public.facebook_login_lookup(text, text) to service_role;
