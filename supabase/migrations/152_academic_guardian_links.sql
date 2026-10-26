-- My Scores — guardian links (P3-PAR #52, piece 1: PARENT-001..004,
-- PARENT-007..009, AUTH-004; consent rule GUARDIAN-CONSENT, PRD §29.3).
--
-- A student invites a parent or guardian with a one-time 8-character code
-- (72 hours, single use, at most 5 open at a time) and chooses what they may
-- see. The guardian accepts with their own Bitdoin account, says how they are
-- related and confirms they are the student's parent or guardian. The link
-- becomes active only when the student confirms the guardian's name within 7
-- days (two-sided confirmation). Scopes: scores and trends (on), study plan
-- progress (on), career questionnaire answers (off), goals free text (off);
-- Coach chats and photos are never shared. Either side can remove a link at
-- any time; support can suspend a disputed link and only an admin can
-- reinstate it. Access is checked on every read, so a removed, paused or
-- suspended link loses access at once (QG-4).
--
-- Students aged 13–15 need a guardian's consent before any score is stored
-- (PARENT-003): their profile waits in 'pending_guardian' until a guardian
-- accepts a consent invite. When a student's age band becomes 18+, they keep
-- or remove each link; links not answered within 30 days are paused
-- (PARENT-009). The guardian relationship lives in the module schema; the
-- core account is unchanged (AUTH-004).

insert into public.academic_settings (key, value, description) values
  ('guardian_rules', '{"invite_hours": 72, "max_open_invites": 5, "confirm_days": 7, "consent_age_bands": ["13_15"], "adult_age_band": "18_plus", "reconfirm_days": 30, "code_attempts_per_hour": 10,
    "default_scopes": {"scores": true, "plan": true, "careers": false, "goals_text": false}}',
   'P3-PAR: guardian invites, two-sided confirmation, the consent age band (PRD §29.3) and re-confirmation at 18.')
on conflict (key) do nothing;

-- Guardian consent for a minor (PARENT-003) is its own consent purpose.
alter table public.academic_consent_records drop constraint if exists academic_consent_records_purpose_check;
alter table public.academic_consent_records add constraint academic_consent_records_purpose_check check (purpose in (
  'module_processing', 'guardian_sharing', 'ocr_processing', 'ai_processing',
  'email', 'push', 'research_samples', 'keep_photos', 'usage_statistics', 'coach_review', 'guardian_consent'
));

alter table public.academic_notifications drop constraint if exists academic_notifications_category_check;
alter table public.academic_notifications add constraint academic_notifications_category_check check (category in ('score_reminder', 'guardian_link'));

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.academic_guardian_invites (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  code_hash          text not null unique,
  purpose            text not null default 'link' check (purpose in ('link', 'consent')),
  scopes             jsonb not null,
  expires_at         timestamptz not null,
  used_at            timestamptz,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists academic_guardian_invites_profile_idx on public.academic_guardian_invites (student_profile_id, created_at desc);

create table if not exists public.academic_guardian_links (
  id                 uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.academic_student_profiles(id) on delete cascade,
  guardian_user_id   uuid not null references public.users(id) on delete cascade,
  invite_id          uuid references public.academic_guardian_invites(id) on delete set null,
  relationship       text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  purpose            text not null default 'link' check (purpose in ('link', 'consent')),
  status             text not null default 'pending_student' check (status in ('pending_student', 'active', 'paused', 'suspended', 'removed')),
  scopes             jsonb not null,
  declared_at        timestamptz not null default now(),
  confirm_by         timestamptz not null,
  confirmed_at       timestamptz,
  reconfirm_by       date,
  paused_at          timestamptz,
  suspended_at       timestamptz,
  removed_at         timestamptz,
  removed_by         text check (removed_by in ('student', 'guardian', 'system')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists academic_guardian_links_one_live on public.academic_guardian_links (student_profile_id, guardian_user_id) where status <> 'removed';
create index if not exists academic_guardian_links_guardian_idx on public.academic_guardian_links (guardian_user_id) where status <> 'removed';

-- PARENT-008: suspensions and reinstatements, with reason codes.
create table if not exists public.academic_guardian_link_cases (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid not null references public.academic_guardian_links(id) on delete cascade,
  action     text not null check (action in ('suspend', 'reinstate')),
  reason     text not null check (reason in ('not_guardian', 'safety', 'student_request', 'resolved', 'other')),
  note       text not null check (length(note) between 5 and 500),
  actor_id   uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['academic_guardian_invites', 'academic_guardian_links', 'academic_guardian_link_cases'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.academic_guardian_rule(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.academic_setting('guardian_rules')->p_key;
$$;

create or replace function public.academic_guardian_code_hash(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex');
$$;

-- Scopes: only the four the student can share. Coach chats and photos are not scopes.
create or replace function public.academic_guardian_clean_scopes(p_scopes jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(k, coalesce((p_scopes->>k)::boolean, (public.academic_guardian_rule('default_scopes')->>k)::boolean))
  from unnest(array['scores', 'plan', 'careers', 'goals_text']) k;
$$;

-- The single switch the access policies use (migration 110): an active link,
-- the scope granted, guardian consent in place where it is needed.
create or replace function public.academic_guardian_can_read(p_student_profile_id uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.academic_guardian_links l
    join public.academic_student_profiles p on p.id = l.student_profile_id
    where l.student_profile_id = p_student_profile_id
      and l.guardian_user_id = (select auth.uid())
      and l.status = 'active'
      and p.consent_state = 'active'
      and coalesce((l.scopes->>case p_scope when 'goals' then 'goals_text' else p_scope end)::boolean, false)
  );
$$;

create or replace function public.academic_guardian_notify(p_user_id uuid, p_profile_id uuid, p_code text, p_link_id uuid, p_payload jsonb)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.academic_notifications (user_id, student_profile_id, category, code, payload, channel, state, dedupe_key, sent_at)
  values (p_user_id, p_profile_id, 'guardian_link', p_code, p_payload, 'in_app', 'sent',
          'guardian:' || p_link_id || ':' || p_user_id || ':' || p_code || ':' || extract(epoch from clock_timestamp())::bigint, now())
  on conflict (dedupe_key) do nothing;
$$;

-- What a student sees of a guardian, and a guardian of a student: names only.
create or replace function public.academic_guardian_link_json(p_link public.academic_guardian_links)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_link.id, 'status', p_link.status, 'purpose', p_link.purpose, 'relationship', p_link.relationship, 'scopes', p_link.scopes,
    'guardian_name', (select name from public.users where id = p_link.guardian_user_id),
    'student_name', (select display_name from public.academic_student_profiles where id = p_link.student_profile_id),
    'declared_at', p_link.declared_at, 'confirm_by', p_link.confirm_by, 'confirmed_at', p_link.confirmed_at,
    'reconfirm_by', p_link.reconfirm_by, 'removed_at', p_link.removed_at, 'removed_by', p_link.removed_by
  );
$$;

-- ─── Consent band (PARENT-003) ───────────────────────────────────────────────

-- A profile in the consent age band waits for a guardian unless one has
-- already given consent. Runs on create and when the age band changes.
create or replace function public.academic_guardian_consent_band()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.academic_guardian_rule('consent_age_bands') ? new.age_band, false)
     and new.consent_state = 'active'
     and not exists (select 1 from public.academic_consent_records
                     where student_profile_id = new.id and purpose = 'guardian_consent' and withdrawn_at is null) then
    new.consent_state := 'pending_guardian';
  end if;
  -- PARENT-009: reaching the adult band, the student re-confirms each link within 30 days.
  if tg_op = 'UPDATE' and new.age_band = public.academic_guardian_rule('adult_age_band') #>> '{}'
     and old.age_band is distinct from new.age_band then
    update public.academic_guardian_links
    set reconfirm_by = public.academic_today() + coalesce((public.academic_guardian_rule('reconfirm_days'))::integer, 30), updated_at = now()
    where student_profile_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists academic_guardian_consent_band on public.academic_student_profiles;
create trigger academic_guardian_consent_band
before insert or update of age_band, consent_state on public.academic_student_profiles
for each row execute function public.academic_guardian_consent_band();

-- Unchanged from 117 apart from the guardian consent check on writes.
create or replace function public.academic_require_profile(p_for_write boolean default false)
returns public.academic_student_profiles
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_profile public.academic_student_profiles;
begin
  if not public.academic_module_enabled() then
    perform public.academic_raise('MODULE_DISABLED', 403, 'My Scores is not available yet');
  end if;

  if p_for_write then
    perform public.academic_rate_limit('write');
    select * into v_profile from public.academic_student_profiles where user_id = v_user for update;
  else
    select * into v_profile from public.academic_student_profiles where user_id = v_user;
  end if;

  if v_profile.id is null then
    perform public.academic_raise('PROFILE_REQUIRED', 404, 'Create a My Scores profile first');
  end if;

  if p_for_write then
    if v_profile.status <> 'active' then
      perform public.academic_raise('PROFILE_READ_ONLY', 409, 'This profile is ' || v_profile.status);
    end if;
    if not exists (
      select 1 from public.academic_consent_records
      where student_profile_id = v_profile.id and purpose = 'module_processing' and withdrawn_at is null
    ) then
      perform public.academic_raise('CONSENT_REQUIRED', 403, 'Module processing consent is required',
        jsonb_build_object('purpose', 'module_processing'));
    end if;
    -- PARENT-003: nothing is stored until a guardian has given consent.
    if v_profile.consent_state = 'pending_guardian' then
      perform public.academic_raise('GUARDIAN_CONSENT_REQUIRED', 403, 'A parent or guardian needs to agree first',
        jsonb_build_object('purpose', 'guardian_consent'));
    end if;
  end if;

  return v_profile;
end;
$$;

-- Unchanged from 111 apart from the 'guardian_consent' step.
create or replace function public.academic_get_session()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_enabled boolean := public.academic_module_enabled();
  v_notice text;
  v_user_row public.users;
  v_profile public.academic_student_profiles;
  v_consent public.academic_consent_records;
  v_enrolment public.academic_enrolments;
  v_active_year uuid;
  v_next text;
begin
  select * into v_user_row from public.users where id = v_user;
  select value #>> '{}' into v_notice from public.academic_settings where key = 'consent_notice_version';
  select id into v_active_year from public.academic_years where status = 'active';

  select * into v_profile from public.academic_student_profiles where user_id = v_user;
  if v_profile.id is not null then
    select * into v_consent from public.academic_consent_records
    where student_profile_id = v_profile.id and purpose = 'module_processing' and withdrawn_at is null;
    select * into v_enrolment from public.academic_enrolments
    where student_profile_id = v_profile.id and state = 'active';
  end if;

  v_next := case
    when not v_enabled then 'unavailable'
    when v_profile.id is null then 'onboarding'
    -- A changed notice version is treated as material: re-acknowledge (PRIV-001).
    when v_consent.id is null or v_consent.notice_version is distinct from v_notice then 'consent'
    -- PARENT-003: ages 13–15 wait for a guardian's consent.
    when v_profile.consent_state = 'pending_guardian' then 'guardian_consent'
    when v_active_year is not null and (v_enrolment.id is null or v_enrolment.academic_year_id <> v_active_year) then 'new_school_year'
    else 'ready'
  end;

  return jsonb_build_object(
    'user', jsonb_build_object('id', v_user, 'role', v_user_row.role, 'language', v_user_row.language),
    'module_enabled', v_enabled,
    'notice_version', v_notice,
    'next_step', v_next,
    'profile', case when v_profile.id is null or not v_enabled then null else jsonb_build_object(
      'id', v_profile.id,
      'display_name', v_profile.display_name,
      'age_band', v_profile.age_band,
      'status', v_profile.status,
      'consent_state', v_profile.consent_state,
      'version', v_profile.version
    ) end,
    'active_enrolment_id', case when v_enabled then v_enrolment.id end,
    'consent', jsonb_build_object(
      'module_processing', v_consent.id is not null,
      'notice_version', v_consent.notice_version
    )
  );
end;
$$;

-- ─── Student RPCs ────────────────────────────────────────────────────────────

-- Own invites and links. Uses the read guard so a waiting profile can manage its consent invite.
create or replace function public.academic_list_guardian_links()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  return jsonb_build_object(
    'consent_state', v_profile.consent_state,
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'purpose', i.purpose, 'scopes', i.scopes, 'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at desc)
      from public.academic_guardian_invites i
      where i.student_profile_id = v_profile.id and i.used_at is null and i.revoked_at is null and i.expires_at > now()), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(public.academic_guardian_link_json(l) order by l.created_at)
      from public.academic_guardian_links l where l.student_profile_id = v_profile.id and l.status <> 'removed'), '[]'::jsonb),
    'default_scopes', public.academic_guardian_rule('default_scopes')
  );
end;
$$;

-- PARENT-001 (and PARENT-003 with purpose 'consent'): returns the code once; only its hash is kept.
create or replace function public.academic_create_guardian_invite(p_scopes jsonb default '{}'::jsonb, p_purpose text default 'link')
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_hex text := md5(gen_random_uuid()::text || clock_timestamp()::text);
  v_code text := '';
  v_invite public.academic_guardian_invites;
  i integer;
begin
  -- A waiting profile (consent band) may only ask for consent; everything else needs a writable profile.
  v_profile := public.academic_require_profile(false);
  if p_purpose = 'consent' then
    if v_profile.consent_state <> 'pending_guardian' then
      perform public.academic_invalid('purpose', 'No guardian consent is needed');
    end if;
    perform public.academic_rate_limit('write');
  elsif p_purpose = 'link' then
    v_profile := public.academic_require_profile(true);
  else
    perform public.academic_invalid('purpose', 'Unknown purpose');
  end if;
  if (select count(*) from public.academic_guardian_invites where student_profile_id = v_profile.id and used_at is null and revoked_at is null and expires_at > now())
     >= coalesce((public.academic_guardian_rule('max_open_invites'))::integer, 5) then
    perform public.academic_raise('GUARDIAN_INVITE_LIMIT', 409, 'You already have 5 open invites. Cancel one first');
  end if;
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, 1 + ((('x' || substr(v_hex, i * 2 + 1, 2))::bit(8)::integer) % 32), 1);
  end loop;
  insert into public.academic_guardian_invites (student_profile_id, code_hash, purpose, scopes, expires_at)
  values (v_profile.id, public.academic_guardian_code_hash(v_code), p_purpose, public.academic_guardian_clean_scopes(p_scopes),
          now() + make_interval(hours => coalesce((public.academic_guardian_rule('invite_hours'))::integer, 72)))
  returning * into v_invite;
  perform public.academic_audit('guardian.invite', 'guardian_invite', v_invite.id, v_profile.id, 'success', p_purpose);
  return jsonb_build_object('id', v_invite.id, 'code', v_code, 'purpose', v_invite.purpose, 'scopes', v_invite.scopes, 'expires_at', v_invite.expires_at);
end;
$$;

create or replace function public.academic_revoke_guardian_invite(p_invite_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
begin
  update public.academic_guardian_invites set revoked_at = now()
  where id = p_invite_id and student_profile_id = v_profile.id and used_at is null and revoked_at is null;
  if not found then
    return public.academic_deny('guardian_invite', p_invite_id);
  end if;
  return public.academic_list_guardian_links();
end;
$$;

-- PARENT-002: the student confirms the guardian's name within 7 days, or declines.
create or replace function public.academic_confirm_guardian_link(p_link_id uuid, p_confirm boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_link public.academic_guardian_links;
begin
  select * into v_link from public.academic_guardian_links
  where id = p_link_id and student_profile_id = v_profile.id and status = 'pending_student' and confirm_by > now() for update;
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  if p_confirm then
    update public.academic_guardian_links set status = 'active', confirmed_at = now(), updated_at = now() where id = v_link.id returning * into v_link;
    perform public.academic_guardian_notify(v_link.guardian_user_id, null, 'guardian.confirmed', v_link.id, jsonb_build_object('student', v_profile.display_name));
  else
    update public.academic_guardian_links set status = 'removed', removed_at = now(), removed_by = 'student', updated_at = now() where id = v_link.id returning * into v_link;
    perform public.academic_guardian_notify(v_link.guardian_user_id, null, 'guardian.declined', v_link.id, jsonb_build_object('student', v_profile.display_name));
  end if;
  perform public.academic_audit(case when p_confirm then 'guardian.confirm' else 'guardian.decline' end, 'guardian_link', v_link.id, v_profile.id, 'success', null);
  return public.academic_list_guardian_links();
end;
$$;

-- PARENT-004: scopes apply on the next read and are audit-logged.
create or replace function public.academic_set_guardian_scopes(p_link_id uuid, p_scopes jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_scopes jsonb;
  v_id uuid;
begin
  v_scopes := public.academic_guardian_clean_scopes(coalesce((select scopes from public.academic_guardian_links where id = p_link_id and student_profile_id = v_profile.id), '{}'::jsonb) || coalesce(p_scopes, '{}'::jsonb));
  update public.academic_guardian_links set scopes = v_scopes, updated_at = now()
  where id = p_link_id and student_profile_id = v_profile.id and status in ('pending_student', 'active', 'paused')
  returning id into v_id;
  if v_id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  perform public.academic_audit('guardian.scopes', 'guardian_link', v_id, v_profile.id, 'success', left(v_scopes::text, 200));
  return public.academic_list_guardian_links();
end;
$$;

-- PARENT-007 (student side) and PARENT-009 (keep or remove at 18).
create or replace function public.academic_remove_guardian_link(p_link_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_link public.academic_guardian_links;
begin
  update public.academic_guardian_links set status = 'removed', removed_at = now(), removed_by = 'student', updated_at = now()
  where id = p_link_id and student_profile_id = v_profile.id and status in ('pending_student', 'active', 'paused')
  returning * into v_link;
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  perform public.academic_guardian_notify(v_link.guardian_user_id, null, 'guardian.removed', v_link.id, jsonb_build_object('student', v_profile.display_name, 'by', 'student'));
  perform public.academic_guardian_notify(v_profile.user_id, v_profile.id, 'guardian.removed', v_link.id, jsonb_build_object('guardian', (select name from public.users where id = v_link.guardian_user_id), 'by', 'student'));
  perform public.academic_audit('guardian.remove', 'guardian_link', v_link.id, v_profile.id, 'success', 'student');
  return public.academic_list_guardian_links();
end;
$$;

create or replace function public.academic_keep_guardian_link(p_link_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.academic_student_profiles := public.academic_require_profile(false);
  v_id uuid;
begin
  update public.academic_guardian_links
  set reconfirm_by = null, status = case when status = 'paused' then 'active' else status end, paused_at = null, updated_at = now()
  where id = p_link_id and student_profile_id = v_profile.id and (reconfirm_by is not null or status = 'paused') and status in ('active', 'paused')
  returning id into v_id;
  if v_id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  perform public.academic_audit('guardian.keep', 'guardian_link', v_id, v_profile.id, 'success', null);
  return public.academic_list_guardian_links();
end;
$$;

-- ─── Guardian RPCs (any signed-in Bitdoin user) ──────────────────────────────

-- Too many wrong codes in an hour: refuse (codes are 8 characters, 72 hours, single use).
create or replace function public.academic_guardian_find_invite(p_code text)
returns public.academic_guardian_invites
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_invite public.academic_guardian_invites;
begin
  if (select count(*) from public.academic_audit_events where actor_user_id = v_user and action = 'guardian.code_invalid' and occurred_at > now() - interval '1 hour')
     >= coalesce((public.academic_guardian_rule('code_attempts_per_hour'))::integer, 10) then
    perform public.academic_raise('RATE_LIMITED', 429, 'Too many tries. Wait an hour and check the code');
  end if;
  select * into v_invite from public.academic_guardian_invites
  where code_hash = public.academic_guardian_code_hash(p_code) and used_at is null and revoked_at is null and expires_at > now();
  if v_invite.id is null then
    perform public.academic_audit('guardian.code_invalid', 'guardian_invite', null, null, 'denied', null);
  end if;
  return v_invite;
end;
$$;

-- What the guardian sees before accepting: the student's display name and what would be shared.
create or replace function public.academic_preview_guardian_invite(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_invite public.academic_guardian_invites := public.academic_guardian_find_invite(p_code);
begin
  if v_invite.id is null then
    perform public.academic_raise('GUARDIAN_CODE_INVALID', 404, 'This code is not valid or has expired');
  end if;
  return jsonb_build_object(
    'student_name', (select display_name from public.academic_student_profiles where id = v_invite.student_profile_id),
    'purpose', v_invite.purpose, 'scopes', v_invite.scopes, 'expires_at', v_invite.expires_at);
end;
$$;

-- PARENT-002/003: accept with relationship and declaration. A consent invite
-- also records the guardian's consent, which lets the student store scores.
create or replace function public.academic_accept_guardian_invite(p_code text, p_relationship text, p_declaration boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_invite public.academic_guardian_invites;
  v_profile public.academic_student_profiles;
  v_link public.academic_guardian_links;
begin
  perform public.academic_rate_limit('write');
  if coalesce(p_relationship, '') not in ('mother', 'father', 'guardian', 'other') then
    perform public.academic_invalid('relationship', 'Choose how you are related');
  end if;
  if not coalesce(p_declaration, false) then
    perform public.academic_invalid('declaration', 'Confirm that you are this student''s parent or guardian');
  end if;
  v_invite := public.academic_guardian_find_invite(p_code);
  if v_invite.id is null then
    perform public.academic_raise('GUARDIAN_CODE_INVALID', 404, 'This code is not valid or has expired');
  end if;
  select * into v_profile from public.academic_student_profiles where id = v_invite.student_profile_id for update;
  if v_profile.user_id = v_user then
    perform public.academic_raise('GUARDIAN_SELF', 409, 'You cannot link to your own Schooling profile');
  end if;
  if exists (select 1 from public.academic_guardian_links where student_profile_id = v_profile.id and guardian_user_id = v_user and status <> 'removed') then
    perform public.academic_raise('GUARDIAN_ALREADY_LINKED', 409, 'You are already linked to this student');
  end if;
  update public.academic_guardian_invites set used_at = now() where id = v_invite.id;
  insert into public.academic_guardian_links (student_profile_id, guardian_user_id, invite_id, relationship, purpose, scopes, confirm_by)
  values (v_profile.id, v_user, v_invite.id, p_relationship, v_invite.purpose, v_invite.scopes,
          now() + make_interval(days => coalesce((public.academic_guardian_rule('confirm_days'))::integer, 7)))
  returning * into v_link;

  if v_invite.purpose = 'consent' and v_profile.consent_state = 'pending_guardian' then
    insert into public.academic_consent_records (student_profile_id, grantor_user_id, grantor_role, purpose, scope, notice_version, method)
    values (v_profile.id, v_user, 'guardian', 'guardian_consent', jsonb_build_object('link_id', v_link.id, 'relationship', p_relationship),
            public.academic_setting('consent_notice_version') #>> '{}', 'guardian_link_flow');
    update public.academic_student_profiles set consent_state = 'active' where id = v_profile.id;
    perform public.academic_audit('consent.grant', 'consent_record', null, v_profile.id, 'success', 'guardian_consent');
  end if;
  perform public.academic_guardian_notify(v_profile.user_id, v_profile.id, 'guardian.request', v_link.id,
    jsonb_build_object('guardian', (select name from public.users where id = v_user), 'relationship', p_relationship, 'consent', v_invite.purpose = 'consent'));
  perform public.academic_audit('guardian.accept', 'guardian_link', v_link.id, v_profile.id, 'success', v_invite.purpose);
  return public.academic_guardian_link_json(v_link);
end;
$$;

-- The guardian's side: their links (no student data in this piece).
create or replace function public.academic_get_family()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return jsonb_build_object(
    'links', coalesce((select jsonb_agg(public.academic_guardian_link_json(l) || jsonb_build_object(
        'grade', (select g.label_en from public.academic_enrolments e join public.academic_grades g on g.id = e.grade_id
                  where e.student_profile_id = l.student_profile_id and e.state = 'active' and l.status = 'active' limit 1)) order by l.created_at)
      from public.academic_guardian_links l
      where l.guardian_user_id = v_user and (l.status <> 'removed' or l.removed_at > now() - interval '30 days')), '[]'::jsonb),
    'notices', coalesce((select jsonb_agg(jsonb_build_object('code', n.code, 'payload', n.payload, 'created_at', n.created_at) order by n.created_at desc)
      from (select * from public.academic_notifications where user_id = v_user and category = 'guardian_link' order by created_at desc limit 10) n), '[]'::jsonb)
  );
end;
$$;

-- PARENT-007 (guardian side).
create or replace function public.academic_guardian_remove_link(p_link_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_link public.academic_guardian_links;
begin
  update public.academic_guardian_links set status = 'removed', removed_at = now(), removed_by = 'guardian', updated_at = now()
  where id = p_link_id and guardian_user_id = v_user and status in ('pending_student', 'active', 'paused')
  returning * into v_link;
  if v_link.id is null then
    return public.academic_deny('guardian_link', p_link_id);
  end if;
  perform public.academic_guardian_notify((select user_id from public.academic_student_profiles where id = v_link.student_profile_id), v_link.student_profile_id,
    'guardian.removed', v_link.id, jsonb_build_object('guardian', (select name from public.users where id = v_user), 'by', 'guardian'));
  perform public.academic_audit('guardian.remove', 'guardian_link', v_link.id, v_link.student_profile_id, 'success', 'guardian');
  return public.academic_get_family();
end;
$$;

-- ─── Support (PARENT-008) ────────────────────────────────────────────────────

create or replace function public.academic_support_guardian_links(p_profile_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
begin
  perform public.academic_audit('guardian.support_view', 'student_profile', p_profile_id, p_profile_id, 'success', null);
  return coalesce((select jsonb_agg(public.academic_guardian_link_json(l) || jsonb_build_object(
      'cases', (select coalesce(jsonb_agg(jsonb_build_object('action', c.action, 'reason', c.reason, 'note', c.note, 'at', c.created_at,
                 'by', (select name from public.users where id = c.actor_id)) order by c.created_at), '[]'::jsonb)
                from public.academic_guardian_link_cases c where c.link_id = l.id)) order by l.created_at)
    from public.academic_guardian_links l where l.student_profile_id = p_profile_id), '[]'::jsonb);
end;
$$;

-- Support or admin suspends; only an admin reinstates after review.
create or replace function public.academic_support_suspend_guardian_link(p_link_id uuid, p_reason text, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff uuid := public.academic_require_staff(array['ADMIN', 'OPERATIONS']);
  v_link public.academic_guardian_links;
begin
  if coalesce(p_reason, '') not in ('not_guardian', 'safety', 'student_request', 'other') then
    perform public.academic_invalid('reason', 'Choose a reason');
  end if;
  if length(btrim(coalesce(p_note, ''))) < 5 then
    perform public.academic_invalid('note', 'Describe the case (5 characters or more)');
  end if;
  update public.academic_guardian_links set status = 'suspended', suspended_at = now(), updated_at = now()
  where id = p_link_id and status in ('pending_student', 'active', 'paused') returning * into v_link;
  if v_link.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'No such link, or it is already suspended or removed');
  end if;
  insert into public.academic_guardian_link_cases (link_id, action, reason, note, actor_id) values (v_link.id, 'suspend', p_reason, btrim(p_note), v_staff);
  perform public.academic_audit('guardian.suspend', 'guardian_link', v_link.id, v_link.student_profile_id, 'success', p_reason);
  return public.academic_guardian_link_json(v_link);
end;
$$;

create or replace function public.academic_admin_reinstate_guardian_link(p_link_id uuid, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.academic_require_staff(array['ADMIN']);
  v_link public.academic_guardian_links;
begin
  if length(btrim(coalesce(p_note, ''))) < 5 then
    perform public.academic_invalid('note', 'Record the review (5 characters or more)');
  end if;
  update public.academic_guardian_links set status = 'active', suspended_at = null, updated_at = now()
  where id = p_link_id and status = 'suspended' and confirmed_at is not null returning * into v_link;
  if v_link.id is null then
    perform public.academic_raise('NOT_FOUND', 404, 'Only a suspended, confirmed link can be reinstated');
  end if;
  insert into public.academic_guardian_link_cases (link_id, action, reason, note, actor_id) values (v_link.id, 'reinstate', 'resolved', btrim(p_note), v_admin);
  perform public.academic_audit('guardian.reinstate', 'guardian_link', v_link.id, v_link.student_profile_id, 'success', null);
  return public.academic_guardian_link_json(v_link);
end;
$$;

-- ─── Daily housekeeping ──────────────────────────────────────────────────────

-- Unconfirmed links lapse after 7 days; links not re-confirmed at 18 are paused (not deleted).
create or replace function public.academic_guardian_daily()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_lapsed integer;
  v_paused integer;
begin
  update public.academic_guardian_links set status = 'removed', removed_at = now(), removed_by = 'system', updated_at = now()
  where status = 'pending_student' and confirm_by <= now();
  get diagnostics v_lapsed = row_count;
  update public.academic_guardian_links set status = 'paused', paused_at = now(), updated_at = now()
  where status = 'active' and reconfirm_by is not null and reconfirm_by < public.academic_today();
  get diagnostics v_paused = row_count;
  delete from public.academic_guardian_invites where (used_at is not null or revoked_at is not null or expires_at < now()) and created_at < now() - interval '90 days';
  return jsonb_build_object('lapsed', v_lapsed, 'paused', v_paused);
end;
$$;

-- ─── Grants and schedule ─────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_guardian_rule(text)', 'academic_guardian_code_hash(text)', 'academic_guardian_clean_scopes(jsonb)', 'academic_guardian_can_read(uuid,text)',
    'academic_guardian_notify(uuid,uuid,text,uuid,jsonb)', 'academic_guardian_link_json(public.academic_guardian_links)', 'academic_guardian_consent_band()',
    'academic_guardian_find_invite(text)', 'academic_guardian_daily()', 'academic_require_profile(boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_get_session()', 'academic_list_guardian_links()', 'academic_create_guardian_invite(jsonb,text)', 'academic_revoke_guardian_invite(uuid)',
    'academic_confirm_guardian_link(uuid,boolean)', 'academic_set_guardian_scopes(uuid,jsonb)', 'academic_remove_guardian_link(uuid)', 'academic_keep_guardian_link(uuid)',
    'academic_preview_guardian_invite(text)', 'academic_accept_guardian_invite(text,text,boolean)', 'academic_get_family()', 'academic_guardian_remove_link(uuid)',
    'academic_support_guardian_links(uuid)', 'academic_support_suspend_guardian_link(uuid,text,text)', 'academic_admin_reinstate_guardian_link(uuid,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'academic-guardian-daily';
select cron.schedule(
  'academic-guardian-daily',
  '40 19 * * *', -- 02:40 Asia/Vientiane
  $$select public.academic_guardian_daily();$$
);
