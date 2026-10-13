-- Short member codes, e.g. BA-PRM-DAN9XY, so staff can quickly check that a
-- WhatsApp message comes from a real Academy member.
--
--   BA   Bitdoin Academy
--   PRM  Premium Monthly · PRY Premium Yearly · FRE Free / no paid plan
--        (worked out from the current plan when shown, never stored)
--   6 characters derived from the user ID and stored in users.member_code.
--
-- The 6 characters are SHA-256(user id) written in Crockford Base32 (no I, L,
-- O, U). They never change, even when the plan does. If a code is already
-- taken, the next window of the same hash is used, so codes stay unique.

alter table public.users add column if not exists member_code text;

create or replace function public.member_code_candidate(p_user_id uuid, p_attempt integer)
returns text
language sql
immutable
set search_path = ''
as $$
  with hash as (
    select extensions.digest(p_user_id::text, 'sha256') as bytes
  ),
  value as (
    -- 30 bits (6 × 5) from 4 bytes starting at byte p_attempt.
    select (
      (get_byte(bytes, p_attempt)::bigint << 24)
      | (get_byte(bytes, p_attempt + 1)::bigint << 16)
      | (get_byte(bytes, p_attempt + 2)::bigint << 8)
      | get_byte(bytes, p_attempt + 3)::bigint
    ) & 1073741823 as v
    from hash
  )
  select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ', ((v >> (5 * (5 - i))) & 31)::integer + 1, 1), '' order by i)
  from value, generate_series(0, 5) as i;
$$;

create or replace function public.assign_member_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if tg_op = 'UPDATE' then
    -- The code is permanent: nobody can change it, owner included.
    new.member_code := old.member_code;
    if new.member_code is not null then
      return new;
    end if;
  end if;

  for attempt in 0..28 loop
    v_code := public.member_code_candidate(new.id, attempt);
    if not exists (select 1 from public.users where member_code = v_code and id <> new.id) then
      new.member_code := v_code;
      return new;
    end if;
  end loop;
  raise exception 'Could not assign a unique member code for %', new.id;
end;
$$;

drop trigger if exists assign_member_code on public.users;
create trigger assign_member_code
  before insert or update on public.users
  for each row execute function public.assign_member_code();

-- Existing users, oldest first (the update fires the trigger above).
do $$
declare
  r record;
begin
  for r in select id from public.users where member_code is null order by created_at, id loop
    update public.users set member_code = null where id = r.id;
  end loop;
end;
$$;

alter table public.users alter column member_code set not null;
create unique index if not exists users_member_code_idx on public.users (member_code);

-- ─── Staff lookup ────────────────────────────────────────────────────────────
-- Accepts the full code or just the 6 characters, any case, with or without
-- dashes/spaces; Crockford look-alikes (O→0, I/L→1) are forgiven.

create or replace function public.verify_member_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clean text;
  v_code text;
  v_entered_prefix text;
  v_user public.users%rowtype;
  v_sub record;
  v_active boolean;
  v_prefix text;
begin
  if coalesce(public.get_user_role()::text, '') not in ('ADMIN', 'OPERATIONS') then
    raise exception 'Only staff can verify member codes';
  end if;

  v_clean := translate(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'OIL', '011');
  if length(v_clean) < 6 then
    return jsonb_build_object('found', false);
  end if;
  v_code := right(v_clean, 6);
  -- "BAPRM…" or "PRM…" before the 6 characters.
  v_entered_prefix := nullif(substring(left(v_clean, length(v_clean) - 6) from '(PRM|PRY|FRE)$'), '');

  select * into v_user from public.users where member_code = v_code;
  if not found then
    return jsonb_build_object('found', false, 'code', v_code);
  end if;

  select subscription.status, subscription.ends_at, plan.name as plan_name, plan.interval, plan.price_lak
  into v_sub
  from public.premium_subscriptions as subscription
  join public.premium_plans as plan on plan.id = subscription.plan_id
  where subscription.user_id = v_user.id
  order by (subscription.status = 'ACTIVE') desc, subscription.created_at desc
  limit 1;

  v_active := v_sub.status = 'ACTIVE' and (v_sub.ends_at is null or v_sub.ends_at > now());
  v_prefix := case
    when v_active and coalesce(v_sub.price_lak, 0) > 0 and v_sub.interval = 'year' then 'PRY'
    when v_active and coalesce(v_sub.price_lak, 0) > 0 then 'PRM'
    else 'FRE'
  end;

  return jsonb_build_object(
    'found', true,
    'user_id', v_user.id,
    'name', v_user.name,
    'email', v_user.email,
    'phone', v_user.phone,
    'whatsapp', (select responses ->> 'whatsapp_number' from public.premium_onboarding_responses where user_id = v_user.id),
    'member_code', 'BA-' || v_prefix || '-' || v_user.member_code,
    'entered_prefix', v_entered_prefix,
    'prefix', v_prefix,
    'plan_name', v_sub.plan_name,
    'status', v_sub.status,
    'ends_at', v_sub.ends_at,
    'active', coalesce(v_active, false),
    'paid', coalesce(v_active, false) and coalesce(v_sub.price_lak, 0) > 0
  );
end;
$$;

revoke all on function public.verify_member_code(text) from public, anon;
grant execute on function public.verify_member_code(text) to authenticated;
revoke all on function public.member_code_candidate(uuid, integer) from public, anon, authenticated;
revoke all on function public.assign_member_code() from public, anon, authenticated;
