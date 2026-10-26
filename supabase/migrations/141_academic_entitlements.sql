-- My Scores — entitlements and quotas (P3-BIL #51: BILLING-001/002/003/006/007,
-- PRD §30.3–30.4).
--
-- One service answers "may this user use feature X, and how much is left":
--   features(user) = free features
--                  + premium features   while an Academy Premium membership is active
--                                       (ACTIVE, not past ends_at, on a paid plan) or a
--                                       manual 'premium' grant runs
--                  + single features    granted manually (trial, one-time purchase, …)
--   monthly quota  = the highest limit of the user's sources (no stacking)
-- Which plan includes what is configuration ('entitlement_features'), not code.
-- Family plans (BILLING-005) come with guardian links (#52).
--
-- Feature locks are off until prices are decided (OD-11): while
-- 'entitlements_enforced' is false every feature is open, as today, and only
-- monthly quotas apply (by tier). Locks never hide recorded data (BILLING-006).
--
-- Quotas are counters per user, feature and Vientiane calendar month, taken
-- and given back atomically (BILLING-003). Score-book scans move onto them:
-- a scan takes one when it starts and gets it back if it fails or is abandoned.

insert into public.academic_settings (key, value, description) values
  ('entitlements_enforced', 'false', 'P3-BIL: lock premium features for users without Premium. Off until pricing is decided (OD-11).'),
  ('entitlement_features', '{
     "advanced_analysis":    {"free": false, "premium": true},
     "diagnostic_unlimited": {"free": false, "premium": true},
     "ocr_upload":           {"free": true,  "premium": true, "monthly": {"free": 10, "premium": 20}},
     "coach_academic":       {"free": true,  "premium": true, "monthly": {"free": 10, "premium": 300}},
     "ai_monthly_summary":   {"free": false, "premium": true},
     "planner_full":         {"free": false, "premium": true},
     "parent_reports":       {"free": false, "premium": true},
     "career_report":        {"free": false, "premium": false},
     "mock_exams":           {"free": false, "premium": true}
   }', 'P3-BIL: which tier includes each feature and monthly quotas per tier (PRD §30.3; numbers are OD-11 hypotheses).'),
  ('entitlement_grant_reasons', '["bank_transfer_confirmed", "trial", "one_time_purchase", "pilot", "school_partnership", "support_goodwill", "correction", "other"]',
   'P3-BIL: reason codes for manual entitlement grants (BILLING-007).')
on conflict (key) do nothing;

-- The owner's free scan allowance (OD-11, 10) carries over from ocr_rules.
update public.academic_settings s
set value = jsonb_set(s.value, '{ocr_upload,monthly,free}', coalesce((select r.value->'monthly_allowance' from public.academic_settings r where r.key = 'ocr_rules'), '10'::jsonb))
where s.key = 'entitlement_features';

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Manual grants: Financial Administrator activations, trials, one-time purchases.
create table if not exists public.academic_entitlement_grants (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  -- 'premium' = every premium feature and the premium quotas; otherwise one feature code.
  feature_code  text not null,
  source        text not null check (source in ('manual_grant', 'trial', 'one_time_purchase')),
  reason_code   text not null,
  note          text check (length(note) <= 200),
  reference     text check (length(reference) <= 80),   -- payment or invoice reference
  amount_lak    integer check (amount_lak >= 0),
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  granted_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  revoked_by    uuid references public.users(id) on delete set null,
  revoke_reason text,
  check (ends_at > starts_at)
);
create index if not exists academic_entitlement_grants_user_idx on public.academic_entitlement_grants (user_id, ends_at desc);

-- Monthly usage per user and feature. Kept when a module profile is deleted
-- (counts only), so deleting and re-creating a profile does not reset quotas.
create table if not exists public.academic_usage_counters (
  user_id      uuid not null references public.users(id) on delete cascade,
  feature_code text not null,
  period_key   text not null check (period_key ~ '^\d{4}-\d{2}$'),
  used         integer not null default 0 check (used >= 0),
  updated_at   timestamptz not null default now(),
  primary key (user_id, feature_code, period_key)
);

alter table public.academic_entitlement_grants enable row level security;
alter table public.academic_usage_counters enable row level security;
revoke all on public.academic_entitlement_grants from anon, authenticated;
revoke all on public.academic_usage_counters from anon, authenticated;

alter table public.academic_ocr_jobs add column if not exists quota_period text;
alter table public.academic_ocr_jobs add column if not exists quota_refunded boolean not null default false;

-- ─── The service ─────────────────────────────────────────────────────────────

create or replace function public.academic_quota_period()
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(now() at time zone 'Asia/Vientiane', 'YYYY-MM');
$$;

-- BILLING-002: Academy Premium = an ACTIVE membership on a paid plan, not past
-- ends_at. Returns when it ends ('infinity' for no end), or null.
create or replace function public.academic_premium_until(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(coalesce(s.ends_at, 'infinity'::timestamptz))
  from public.premium_subscriptions s
  join public.premium_plans p on p.id = s.plan_id
  where s.user_id = p_user_id and s.status = 'ACTIVE' and p.price_lak > 0
    and (s.ends_at is null or s.ends_at > now());
$$;

-- Everything the user is entitled to now, with this month's quotas (GET /me/entitlements).
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
  v_premium_until := greatest(v_subscription, v_grant_premium);
  v_premium_source := case when v_subscription is not null and v_subscription >= coalesce(v_grant_premium, '-infinity') then 'academy_premium'
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
    v_until := case v_source when 'academy_premium' then v_premium_until when 'manual_grant' then greatest(v_grant, case when coalesce((v_rule->>'premium')::boolean, false) then v_grant_premium end) end;
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

create or replace function public.academic_has_feature(p_user_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.academic_entitlements(p_user_id)->'features'->p_feature->>'enabled')::boolean, false);
$$;

-- 403 ENTITLEMENT_REQUIRED with what would unlock it (PRD §30.4).
create or replace function public.academic_require_feature(p_user_id uuid, p_feature text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.academic_has_feature(p_user_id, p_feature) then
    perform public.academic_raise('ENTITLEMENT_REQUIRED', 403, 'This needs Academy Premium',
      jsonb_build_object('feature', p_feature, 'upgrade', 'academy_premium'));
  end if;
end;
$$;

-- BILLING-003: takes p_amount from this month's quota, or returns null when
-- not enough is left. Concurrent calls queue on the counter row.
create or replace function public.academic_consume_quota(p_user_id uuid, p_feature text, p_amount integer default 1)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_quota jsonb := public.academic_entitlements(p_user_id)->'features'->p_feature->'quota';
  v_period text := public.academic_quota_period();
  v_limit integer := (v_quota->>'limit')::integer;
  v_used integer;
begin
  if v_quota is null or v_quota = 'null'::jsonb then
    return null;
  end if;
  insert into public.academic_usage_counters (user_id, feature_code, period_key) values (p_user_id, p_feature, v_period)
  on conflict do nothing;
  update public.academic_usage_counters set used = used + p_amount, updated_at = now()
  where user_id = p_user_id and feature_code = p_feature and period_key = v_period and used + p_amount <= v_limit
  returning used into v_used;
  if v_used is null then
    return null;
  end if;
  return jsonb_build_object('period_key', v_period, 'used', v_used, 'limit', v_limit, 'remaining', v_limit - v_used);
end;
$$;

create or replace function public.academic_refund_quota(p_user_id uuid, p_feature text, p_period text, p_amount integer default 1)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.academic_usage_counters set used = greatest(used - p_amount, 0), updated_at = now()
  where user_id = p_user_id and feature_code = p_feature and period_key = p_period;
$$;

-- ─── Student RPC ─────────────────────────────────────────────────────────────

create or replace function public.academic_my_entitlements()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return public.academic_entitlements(v_user);
end;
$$;

-- ─── Score-book scans use the quota (replaces the job count of migration 139) ─

create or replace function public.academic_ocr_used_this_month(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(c.used), 0)::integer
  from public.academic_usage_counters c
  join public.academic_student_profiles p on p.user_id = c.user_id
  where p.id = p_profile_id and c.feature_code = 'ocr_upload' and c.period_key = public.academic_quota_period();
$$;

-- A scan holds its quota from the start. One whose photo never arrived within
-- 10 minutes (closed tab, lost connection) is abandoned and gives it back.
create or replace function public.academic_ocr_expire_stale(p_profile_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.academic_ocr_jobs set status = 'failed', error_code = 'abandoned', settled_at = now()
  where student_profile_id = p_profile_id and status = 'awaiting_upload' and created_at < now() - interval '10 minutes';
$$;

create or replace function public.academic_ocr_status()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_quota jsonb;
begin
  perform public.academic_ocr_expire_stale(v_profile.id);
  v_quota := public.academic_entitlements(v_profile.user_id)->'features'->'ocr_upload'->'quota';
  return jsonb_build_object(
    'available', public.academic_ocr_available(),
    'consent', public.academic_ocr_has_consent(v_profile.id),
    'allowance', jsonb_build_object('limit', coalesce((v_quota->>'limit')::int, 0), 'used', coalesce((v_quota->>'used')::int, 0),
                                    'remaining', coalesce((v_quota->>'remaining')::int, 0))
  );
end;
$$;

create or replace function public.academic_start_ocr_job(p_enrolment_id uuid, p_phash text, p_ignore_duplicate boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(true);
  v_enrolment public.academic_enrolments;
  v_dup public.academic_ocr_jobs;
  v_job public.academic_ocr_jobs;
  v_taken jsonb;
begin
  if not public.academic_ocr_available() then
    perform public.academic_raise('OCR_UNAVAILABLE', 404, 'Scanning is not available');
  end if;
  if not public.academic_ocr_has_consent(v_profile.id) then
    perform public.academic_raise('CONSENT_REQUIRED', 403, 'Agree to photo processing first', jsonb_build_object('purpose', 'ocr_processing'));
  end if;
  if p_phash is null or p_phash !~ '^[0-9a-f]{16}$' then
    perform public.academic_invalid('phash', 'A 64-bit hash in hex is required');
  end if;
  select * into v_enrolment from public.academic_enrolments where id = p_enrolment_id and student_profile_id = v_profile.id and state = 'active';
  if v_enrolment.id is null then
    return public.academic_deny('enrolment', p_enrolment_id);
  end if;

  if not coalesce(p_ignore_duplicate, false) then
    select * into v_dup from public.academic_ocr_jobs j
    where j.student_profile_id = v_profile.id and j.status in ('succeeded', 'confirmed') and j.extraction is not null
      and j.created_at > now() - make_interval(days => public.academic_ocr_rule('duplicate_days')::integer)
      and bit_count(('x' || j.phash)::bit(64) # ('x' || p_phash)::bit(64)) <= public.academic_ocr_rule('duplicate_distance')
    order by j.created_at desc limit 1;
    if v_dup.id is not null then
      return jsonb_build_object('duplicate', jsonb_build_object('job_id', v_dup.id, 'created_at', v_dup.created_at));
    end if;
  end if;

  perform public.academic_ocr_expire_stale(v_profile.id);
  v_taken := public.academic_consume_quota(v_profile.user_id, 'ocr_upload');
  if v_taken is null then
    perform public.academic_raise('OCR_ALLOWANCE_USED', 429, 'This month''s scans are used up; typing is always available',
      jsonb_build_object('limit', (public.academic_entitlements(v_profile.user_id)->'features'->'ocr_upload'->'quota'->>'limit')::int));
  end if;
  insert into public.academic_ocr_jobs (student_profile_id, enrolment_id, phash, quota_period)
  values (v_profile.id, v_enrolment.id, p_phash, v_taken->>'period_key') returning * into v_job;
  return jsonb_build_object('job', public.academic_ocr_job_json(v_job));
end;
$$;

-- A failed or abandoned scan gives its scan back (OCR-012, BILLING-003), once.
create or replace function public.academic_ocr_refund_failed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' and old.status <> 'failed' and new.quota_period is not null and not new.quota_refunded then
    perform public.academic_refund_quota((select user_id from public.academic_student_profiles where id = new.student_profile_id),
                                         'ocr_upload', new.quota_period);
    new.quota_refunded := true;
  end if;
  return new;
end;
$$;

drop trigger if exists academic_ocr_refund_failed on public.academic_ocr_jobs;
create trigger academic_ocr_refund_failed
before update of status on public.academic_ocr_jobs
for each row execute function public.academic_ocr_refund_failed();

-- ─── Financial Administrator: grants with reason codes (BILLING-007) ─────────

create or replace function public.academic_grant_json(p_grant public.academic_entitlement_grants)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_grant.id, 'feature_code', p_grant.feature_code, 'source', p_grant.source, 'reason_code', p_grant.reason_code,
    'note', p_grant.note, 'reference', p_grant.reference, 'amount_lak', p_grant.amount_lak,
    'starts_at', p_grant.starts_at, 'ends_at', p_grant.ends_at, 'created_at', p_grant.created_at,
    'granted_by', (select name from public.users where id = p_grant.granted_by),
    'revoked_at', p_grant.revoked_at, 'revoked_by', (select name from public.users where id = p_grant.revoked_by), 'revoke_reason', p_grant.revoke_reason,
    'active', p_grant.revoked_at is null and p_grant.starts_at <= now() and p_grant.ends_at > now()
  );
$$;

-- Looks a member up by member code: their plan, entitlements and grants.
create or replace function public.academic_admin_member_entitlements(p_member_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'FINANCE']);
  v_user public.users;
begin
  select * into v_user from public.users where upper(member_code) = upper(btrim(coalesce(p_member_code, '')));
  if v_user.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'No member with that code');
  end if;
  perform public.academic_audit('entitlement.lookup', 'user', v_user.id);
  return jsonb_build_object(
    'user', jsonb_build_object('id', v_user.id, 'name', v_user.name, 'member_code', v_user.member_code),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object('plan', p.name, 'price_lak', p.price_lak, 'status', s.status, 'starts_at', s.starts_at, 'ends_at', s.ends_at) order by s.created_at desc)
      from (select * from public.premium_subscriptions where user_id = v_user.id order by created_at desc limit 5) s
      join public.premium_plans p on p.id = s.plan_id
    ), '[]'::jsonb),
    'entitlements', public.academic_entitlements(v_user.id),
    'grants', coalesce((
      select jsonb_agg(public.academic_grant_json(g) order by g.created_at desc)
      from public.academic_entitlement_grants g where g.user_id = v_user.id
    ), '[]'::jsonb)
  );
end;
$$;

-- p_input: {feature_code, source, reason_code, ends_at, starts_at?, note?, reference?, amount_lak?}
-- A grant starts at confirmation time unless a start is given.
create or replace function public.academic_admin_grant_entitlement(p_user_id uuid, p_input jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'FINANCE']);
  v_feature text := btrim(coalesce(p_input->>'feature_code', ''));
  v_source text := coalesce(p_input->>'source', 'manual_grant');
  v_reason text := p_input->>'reason_code';
  v_starts timestamptz := coalesce(nullif(p_input->>'starts_at', '')::timestamptz, now());
  v_ends timestamptz := nullif(p_input->>'ends_at', '')::timestamptz;
  v_grant public.academic_entitlement_grants;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    perform public.academic_raise('NOT_FOUND', 404, 'No such member');
  end if;
  if v_feature <> 'premium' and not (coalesce(public.academic_setting('entitlement_features'), '{}'::jsonb) ? v_feature) then
    perform public.academic_invalid('feature_code', 'Unknown feature');
  end if;
  if v_source not in ('manual_grant', 'trial', 'one_time_purchase') then
    perform public.academic_invalid('source', 'Unknown source');
  end if;
  if v_reason is null or not (coalesce(public.academic_setting('entitlement_grant_reasons'), '[]'::jsonb) ? v_reason) then
    perform public.academic_invalid('reason_code', 'Choose a reason');
  end if;
  if v_ends is null or v_ends <= v_starts or v_ends > v_starts + interval '2 years' then
    perform public.academic_invalid('ends_at', 'End after the start and within 2 years');
  end if;
  if v_reason = 'bank_transfer_confirmed' and coalesce(btrim(p_input->>'reference'), '') = '' then
    perform public.academic_invalid('reference', 'A confirmed transfer needs its payment reference');
  end if;

  insert into public.academic_entitlement_grants (user_id, feature_code, source, reason_code, note, reference, amount_lak, starts_at, ends_at, granted_by)
  values (p_user_id, v_feature, v_source, v_reason, nullif(btrim(p_input->>'note'), ''), nullif(btrim(p_input->>'reference'), ''),
          nullif(p_input->>'amount_lak', '')::integer, v_starts, v_ends, v_staff)
  returning * into v_grant;
  perform public.academic_audit('entitlement.grant', 'entitlement_grant', v_grant.id, null, 'success', v_feature || ':' || v_reason);
  return public.academic_grant_json(v_grant);
end;
$$;

create or replace function public.academic_admin_revoke_entitlement(p_grant_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'FINANCE']);
  v_reason text := public.academic_require_reason(p_reason, 5);
  v_grant public.academic_entitlement_grants;
begin
  update public.academic_entitlement_grants set revoked_at = now(), revoked_by = v_staff, revoke_reason = v_reason
  where id = p_grant_id and revoked_at is null returning * into v_grant;
  if v_grant.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'No active grant with that id');
  end if;
  perform public.academic_audit('entitlement.revoke', 'entitlement_grant', v_grant.id, null, 'success', v_reason);
  return public.academic_grant_json(v_grant);
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_quota_period()', 'academic_premium_until(uuid)', 'academic_entitlements(uuid)', 'academic_has_feature(uuid,text)',
    'academic_require_feature(uuid,text)', 'academic_consume_quota(uuid,text,integer)', 'academic_refund_quota(uuid,text,text,integer)',
    'academic_ocr_refund_failed()', 'academic_ocr_expire_stale(uuid)', 'academic_grant_json(public.academic_entitlement_grants)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_my_entitlements()', 'academic_admin_member_entitlements(text)',
    'academic_admin_grant_entitlement(uuid,jsonb)', 'academic_admin_revoke_entitlement(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
