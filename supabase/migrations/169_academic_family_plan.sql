-- My Scores — Family plan (P3-BIL #51: BILLING-005; owner decisions
-- FAMILY-PLAN, 2026-10-27).
--
-- Two new Academy plans, bought and confirmed like the others (QR or bank
-- transfer, Finance review): Family Monthly 79,000 kip and Family Yearly
-- 790,000 kip. The guardian who subscribes has Academy Premium as usual. Their
-- first 3 actively linked children (longest linked first) get the module's
-- Premium features ("family_plan" source) for the same period; Academy-wide
-- membership checks are unchanged (Schooling Premium only). Removing, pausing
-- or suspending a link frees its seat at once and the next linked child gets
-- it, because coverage is worked out on every check.

insert into public.academic_settings (key, value, description) values
  ('family_plan', '{"slugs": ["family-monthly", "family-yearly"], "seats": 3}', 'BILLING-005: the Academy plans that cover linked children, and how many.')
on conflict (key) do nothing;

insert into public.premium_plans (slug, name, description, price_lak, interval, features, is_active, sort_order) values
  ('family-monthly', 'Family Monthly', 'Academy Premium for a parent or guardian, and Schooling Premium for up to 3 linked children.', 79000, 'month', array['Academy Premium for you', 'Schooling Premium for up to 3 linked children', 'Monthly progress reports for each child', 'Career reports for each child'], true, 4),
  ('family-yearly', 'Family Yearly', 'Academy Premium for a parent or guardian, and Schooling Premium for up to 3 linked children.', 790000, 'year', array['Academy Premium for you', 'Schooling Premium for up to 3 linked children', 'Monthly progress reports for each child', 'Career reports for each child'], true, 5)
on conflict (slug) do nothing;

-- The links a guardian's family plan covers: their first N active links.
create or replace function public.academic_family_seat_links(p_guardian_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.id from public.academic_guardian_links l
  where l.guardian_user_id = p_guardian_user_id and l.status = 'active'
  order by l.confirmed_at nulls last, l.created_at, l.id
  limit coalesce((public.academic_setting('family_plan')->>'seats')::int, 3);
$$;

-- When a guardian's family plan (active, not ended) ends; null if none.
create or replace function public.academic_family_plan_until(p_guardian_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(coalesce(s.ends_at, 'infinity'::timestamptz))
  from public.premium_subscriptions s
  join public.premium_plans p on p.id = s.plan_id
  where s.user_id = p_guardian_user_id and s.status = 'ACTIVE' and (s.ends_at is null or s.ends_at > now())
    and p.slug in (select jsonb_array_elements_text(coalesce(public.academic_setting('family_plan')->'slugs', '[]'::jsonb)));
$$;

-- A student's cover from a guardian's family plan, when they hold one of its seats.
create or replace function public.academic_family_premium_until(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(public.academic_family_plan_until(l.guardian_user_id))
  from public.academic_student_profiles sp
  join public.academic_guardian_links l on l.student_profile_id = sp.id and l.status = 'active'
  where sp.user_id = p_user_id
    and l.id in (select public.academic_family_seat_links(l.guardian_user_id));
$$;

-- Unchanged from 141 apart from the family plan source.
create or replace function public.academic_entitlements(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_config jsonb := coalesce(public.academic_setting('entitlement_features'), '{}'::jsonb);
  v_enforced boolean := coalesce((public.academic_setting('entitlements_enforced'))::text = 'true', false);
  v_subscription timestamptz := public.academic_premium_until(p_user_id);
  v_family timestamptz := public.academic_family_premium_until(p_user_id);
  v_grant_premium timestamptz;
  v_premium_until timestamptz;
  v_premium_source text;
  v_period text := public.academic_quota_period();
  v_resets timestamptz := (date_trunc('month', now() at time zone 'Asia/Vientiane') + interval '1 month') at time zone 'Asia/Vientiane';
  v_features jsonb := '{}'::jsonb;
  v_code text;
  v_rule jsonb;
  v_grant timestamptz;
  v_enabled boolean;
  v_source text;
  v_until timestamptz;
  v_limit integer;
  v_used integer;
begin
  select max(g.ends_at) into v_grant_premium from public.academic_entitlement_grants g
  where g.user_id = p_user_id and g.feature_code = 'premium' and g.revoked_at is null and g.starts_at <= now() and g.ends_at > now();
  v_premium_until := greatest(v_subscription, v_grant_premium, v_family);
  v_premium_source := case
    when v_subscription is not null and v_subscription >= coalesce(v_grant_premium, '-infinity') and v_subscription >= coalesce(v_family, '-infinity') then 'academy_premium'
    when v_family is not null and v_family >= coalesce(v_grant_premium, '-infinity') then 'family_plan'
    when v_grant_premium is not null then 'manual_grant' end;

  for v_code, v_rule in select key, value from jsonb_each(v_config) loop
    select max(g.ends_at) into v_grant from public.academic_entitlement_grants g
    where g.user_id = p_user_id and g.feature_code = v_code and g.revoked_at is null and g.starts_at <= now() and g.ends_at > now();
    v_source := case
      when v_premium_until is not null and coalesce((v_rule->>'premium')::boolean, false) then v_premium_source
      when v_grant is not null then 'manual_grant'
      when coalesce((v_rule->>'free')::boolean, false) then 'free'
      when not v_enforced then 'open'
    end;
    v_enabled := v_source is not null;
    v_until := case v_source when 'academy_premium' then v_premium_until when 'family_plan' then v_premium_until when 'manual_grant' then greatest(v_grant, case when coalesce((v_rule->>'premium')::boolean, false) then v_grant_premium end) end;
    v_limit := null;
    if v_rule ? 'monthly' then
      -- The highest limit of the user's sources (a grant of the feature counts as premium).
      v_limit := case when v_premium_until is not null or v_grant is not null
                      then greatest((v_rule->'monthly'->>'premium')::int, (v_rule->'monthly'->>'free')::int)
                      else (v_rule->'monthly'->>'free')::int end;
      select coalesce(max(c.used), 0) into v_used from public.academic_usage_counters c
      where c.user_id = p_user_id and c.feature_code = v_code and c.period_key = v_period;
    end if;
    v_features := v_features || jsonb_build_object(v_code, jsonb_build_object(
      'enabled', v_enabled, 'source', v_source,
      'until', case when v_until = 'infinity' then null else v_until end,
      'quota', case when v_limit is null then null else jsonb_build_object('limit', v_limit, 'used', v_used, 'remaining', greatest(v_limit - v_used, 0)) end
    ));
  end loop;

  return jsonb_build_object(
    'enforced', v_enforced,
    'tier', case when v_premium_until is not null then 'premium' else 'free' end,
    'premium', jsonb_build_object('active', v_premium_until is not null, 'source', v_premium_source,
                                  'until', case when v_premium_until = 'infinity' then null else v_premium_until end),
    'period_key', v_period,
    'resets_at', v_resets,
    'features', v_features
  );
end;
$$;

-- The guardian's view: the plan, and which linked children it covers.
create or replace function public.academic_family_plan()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_until timestamptz := public.academic_family_plan_until(v_user);
begin
  return jsonb_build_object(
    'active', v_until is not null,
    'until', case when v_until = 'infinity' then null else v_until end,
    'seats', coalesce((public.academic_setting('family_plan')->>'seats')::int, 3),
    'prices', (select jsonb_object_agg(p.slug, p.price_lak) from public.premium_plans p
               where p.is_active and p.slug in (select jsonb_array_elements_text(public.academic_setting('family_plan')->'slugs'))),
    'children', coalesce((
      select jsonb_agg(jsonb_build_object('link_id', l.id, 'name', sp.display_name, 'covered', l.id in (select public.academic_family_seat_links(v_user)))
        order by l.confirmed_at nulls last, l.created_at, l.id)
      from public.academic_guardian_links l join public.academic_student_profiles sp on sp.id = l.student_profile_id
      where l.guardian_user_id = v_user and l.status = 'active'), '[]'::jsonb));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['academic_family_seat_links(uuid)', 'academic_family_plan_until(uuid)', 'academic_family_premium_until(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  execute 'revoke all on function public.academic_family_plan() from public, anon';
  execute 'grant execute on function public.academic_family_plan() to authenticated';
end;
$$;
