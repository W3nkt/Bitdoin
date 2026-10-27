-- My Scores — monthly guardian reports by e-mail (P3-PAR #52, piece 3b:
-- NOTIF-002, PRD §14.9).
--
-- A guardian opts in from the Family page. Double opt-in: a confirmation
-- e-mail with a one-time link (48 hours) goes to the e-mail on their Bitdoin
-- account, and nothing else is sent until it is confirmed. Every e-mail has a
-- one-click unsubscribe (link and List-Unsubscribe header, RFC 8058). E-mails
-- carry no scores unless the guardian ticks "include scores": without it they
-- give the month, how many subjects were recorded, which subjects went well or
-- need attention, the family's next steps and a link to the full report.
--
-- E-mails wait in an outbox; the academic-alerts function sends them through
-- Resend every 5 minutes (it already does this for alert e-mails). A report
-- e-mail is dropped if, by sending time, the guardian has unsubscribed, the
-- link is no longer active or scores are no longer shared. Confirming and
-- unsubscribing take a token, not a session; they run in that function with
-- the service role, so anonymous callers still execute nothing (S-01).

insert into public.academic_settings (key, value, description) values
  ('site_url', '"https://bitdoin.store"', 'NOTIF-002: the address used for links in e-mails to guardians.')
on conflict (key) do nothing;

create table if not exists public.academic_guardian_email_prefs (
  user_id             uuid primary key references public.users(id) on delete cascade,
  email               text not null,
  status              text not null check (status in ('pending', 'confirmed', 'unsubscribed')),
  include_scores      boolean not null default false,
  confirm_token_hash  text,
  confirm_expires_at  timestamptz,
  unsubscribe_token   text not null,
  confirm_sends_day   date,
  confirm_sends       integer not null default 0,
  requested_at        timestamptz not null default now(),
  confirmed_at        timestamptz,
  unsubscribed_at     timestamptz,
  updated_at          timestamptz not null default now()
);
create unique index if not exists academic_guardian_email_prefs_confirm_idx on public.academic_guardian_email_prefs (confirm_token_hash) where confirm_token_hash is not null;
create unique index if not exists academic_guardian_email_prefs_unsub_idx on public.academic_guardian_email_prefs (unsubscribe_token);
alter table public.academic_guardian_email_prefs enable row level security;
revoke all on public.academic_guardian_email_prefs from anon, authenticated;

create table if not exists public.academic_email_outbox (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  kind          text not null check (kind in ('guardian_confirm', 'guardian_report')),
  recipient     text not null,
  language      text not null default 'lo',
  payload       jsonb not null,
  dedupe_key    text unique,
  attempts      integer not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  cancelled_at  timestamptz
);
create index if not exists academic_email_outbox_queue_idx on public.academic_email_outbox (created_at) where sent_at is null and cancelled_at is null;
alter table public.academic_email_outbox enable row level security;
revoke all on public.academic_email_outbox from anon, authenticated;

alter table public.academic_alerts drop constraint if exists academic_alerts_kind_check;
alter table public.academic_alerts add constraint academic_alerts_kind_check check (kind in (
  'multi_profile_access', 'access_denied_burst',
  'slo_availability', 'slo_latency', 'slo_dashboard', 'job_failed', 'job_stale', 'push_backlog', 'test',
  'backup_failed', 'backup_stale', 'drill_failed', 'drill_stale',
  'priority_report', 'career_review_due', 'report_purchase', 'guardian_email_failed'
));

create or replace function public.academic_email_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function public.academic_email_token_hash(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- ─── The guardian's own settings ─────────────────────────────────────────────

create or replace function public.academic_guardian_email_view(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account_email', u.email,
    'is_guardian', exists (select 1 from public.academic_guardian_links l where l.guardian_user_id = u.id and l.status in ('active', 'pending_student')),
    'status', coalesce(p.status, 'off'),
    'email', p.email,
    'include_scores', coalesce(p.include_scores, false),
    'confirmed_at', p.confirmed_at)
  from public.users u left join public.academic_guardian_email_prefs p on p.user_id = u.id
  where u.id = p_user;
$$;

create or replace function public.academic_guardian_email_settings()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  return public.academic_guardian_email_view(v_user);
end;
$$;

-- Turn e-mails on (sends the confirmation), or change "include scores".
create or replace function public.academic_guardian_email_subscribe(p_include_scores boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
  v_row public.users;
  v_pref public.academic_guardian_email_prefs;
  v_token text;
  v_today date := public.academic_today();
begin
  perform public.academic_rate_limit('write');
  select * into v_row from public.users where id = v_user;
  if nullif(btrim(coalesce(v_row.email, '')), '') is null then
    perform public.academic_raise('EMAIL_MISSING', 409, 'Add an e-mail address to your Bitdoin account first');
  end if;
  if not exists (select 1 from public.academic_guardian_links where guardian_user_id = v_user and status in ('active', 'pending_student')) then
    perform public.academic_raise('NOT_A_GUARDIAN', 409, 'E-mail reports are for linked guardians');
  end if;
  select * into v_pref from public.academic_guardian_email_prefs where user_id = v_user for update;

  -- Already confirmed for this address: only the scores choice changes.
  if v_pref.status = 'confirmed' and v_pref.email = v_row.email then
    update public.academic_guardian_email_prefs set include_scores = coalesce(p_include_scores, false), updated_at = now() where user_id = v_user;
    perform public.academic_audit('guardian.email_scores', 'user', v_user, null, 'success', case when p_include_scores then 'on' else 'off' end);
    return public.academic_guardian_email_view(v_user);
  end if;

  if v_pref.user_id is not null and v_pref.confirm_sends_day = v_today and v_pref.confirm_sends >= 3 then
    perform public.academic_raise('EMAIL_CONFIRM_LIMIT', 429, 'Three confirmation e-mails a day at most; try again tomorrow');
  end if;
  v_token := public.academic_email_token();
  insert into public.academic_guardian_email_prefs (user_id, email, status, include_scores, confirm_token_hash, confirm_expires_at, unsubscribe_token, confirm_sends_day, confirm_sends, requested_at)
  values (v_user, v_row.email, 'pending', coalesce(p_include_scores, false), public.academic_email_token_hash(v_token), now() + interval '48 hours',
          public.academic_email_token(), v_today, 1, now())
  on conflict (user_id) do update set
    email = excluded.email, status = 'pending', include_scores = excluded.include_scores,
    confirm_token_hash = excluded.confirm_token_hash, confirm_expires_at = excluded.confirm_expires_at,
    confirm_sends = case when public.academic_guardian_email_prefs.confirm_sends_day = v_today then public.academic_guardian_email_prefs.confirm_sends + 1 else 1 end,
    confirm_sends_day = v_today, requested_at = now(), confirmed_at = null, unsubscribed_at = null, updated_at = now();
  -- Older confirmation e-mails still waiting are dropped; only the newest link works.
  update public.academic_email_outbox set cancelled_at = now()
  where user_id = v_user and kind = 'guardian_confirm' and sent_at is null and cancelled_at is null;
  insert into public.academic_email_outbox (user_id, kind, recipient, language, payload)
  values (v_user, 'guardian_confirm', v_row.email, coalesce(v_row.language, 'lo'),
          jsonb_build_object('token', v_token, 'site_url', public.academic_setting('site_url') #>> '{}', 'name', v_row.name));
  perform public.academic_audit('guardian.email_subscribe', 'user', v_user, null, 'success', null);
  return public.academic_guardian_email_view(v_user);
end;
$$;

create or replace function public.academic_guardian_email_stop()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.academic_require_user();
begin
  perform public.academic_rate_limit('write');
  update public.academic_guardian_email_prefs set status = 'unsubscribed', confirm_token_hash = null, unsubscribed_at = now(), updated_at = now()
  where user_id = v_user and status <> 'unsubscribed';
  update public.academic_email_outbox set cancelled_at = now() where user_id = v_user and sent_at is null and cancelled_at is null;
  perform public.academic_audit('guardian.email_unsubscribe', 'user', v_user, null, 'success', 'in_app');
  return public.academic_guardian_email_view(v_user);
end;
$$;

-- ─── Token links (service role, academic-alerts function) ────────────────────

create or replace function public.academic_guardian_email_confirm(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pref public.academic_guardian_email_prefs;
begin
  select * into v_pref from public.academic_guardian_email_prefs
  where confirm_token_hash = public.academic_email_token_hash(p_token) for update;
  if v_pref.user_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_pref.confirm_expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  update public.academic_guardian_email_prefs set status = 'confirmed', confirmed_at = now(), confirm_token_hash = null, updated_at = now()
  where user_id = v_pref.user_id;
  insert into public.academic_audit_events (actor_user_id, actor_role, action, target_type, target_id, outcome, reason)
  values (v_pref.user_id, 'guardian', 'guardian.email_confirm', 'user', v_pref.user_id, 'success', null);
  return jsonb_build_object('status', 'confirmed');
end;
$$;

create or replace function public.academic_guardian_email_unsubscribe(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pref public.academic_guardian_email_prefs;
begin
  select * into v_pref from public.academic_guardian_email_prefs where unsubscribe_token = coalesce(p_token, '') for update;
  if v_pref.user_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_pref.status <> 'unsubscribed' then
    update public.academic_guardian_email_prefs set status = 'unsubscribed', confirm_token_hash = null, unsubscribed_at = now(), updated_at = now()
    where user_id = v_pref.user_id;
    update public.academic_email_outbox set cancelled_at = now() where user_id = v_pref.user_id and sent_at is null and cancelled_at is null;
    insert into public.academic_audit_events (actor_user_id, actor_role, action, target_type, target_id, outcome, reason)
    values (v_pref.user_id, 'guardian', 'guardian.email_unsubscribe', 'user', v_pref.user_id, 'success', 'link');
  end if;
  return jsonb_build_object('status', 'unsubscribed');
end;
$$;

-- ─── A new monthly report queues its e-mail ──────────────────────────────────

create or replace function public.academic_guardian_report_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.academic_guardian_links;
  v_pref public.academic_guardian_email_prefs;
  v_lang text;
  c jsonb := new.content;
begin
  select * into v_link from public.academic_guardian_links where id = new.link_id;
  select * into v_pref from public.academic_guardian_email_prefs where user_id = v_link.guardian_user_id and status = 'confirmed';
  if v_pref.user_id is null then
    return new;
  end if;
  select coalesce(language, 'lo') into v_lang from public.users where id = v_pref.user_id;
  insert into public.academic_email_outbox (user_id, kind, recipient, language, payload, dedupe_key)
  values (v_pref.user_id, 'guardian_report', v_pref.email, v_lang, jsonb_build_object(
      'report_id', new.id, 'link_id', new.link_id, 'site_url', public.academic_setting('site_url') #>> '{}',
      'include_scores', v_pref.include_scores,
      'student_name', c->>'student_name', 'period', c->'period', 'recorded', c->'recorded',
      'stronger', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo')) from jsonb_array_elements(coalesce(c->'stronger', '[]')) s), '[]'),
      'needs_attention', coalesce((select jsonb_agg(jsonb_build_object('name_en', s->>'name_en', 'name_lo', s->>'name_lo')) from jsonb_array_elements(coalesce(c->'needs_attention', '[]')) s), '[]'),
      'next_steps', coalesce(c->'next_steps', '[]'),
      'changes', case when v_pref.include_scores then c->'changes' end),
    'guardian_report:' || new.id)
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists academic_guardian_report_email on public.academic_guardian_reports;
create trigger academic_guardian_report_email after insert on public.academic_guardian_reports
  for each row execute function public.academic_guardian_report_email();

-- ─── Delivery (service role, academic-alerts function) ───────────────────────

create or replace function public.academic_claim_guardian_emails(p_limit integer default 20)
returns table (id uuid, kind text, recipient text, language text, payload jsonb, unsubscribe_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- Drop what should no longer go out: unsubscribed, the link ended or scores
  -- are no longer shared, or a confirmation that was replaced or confirmed.
  update public.academic_email_outbox o set cancelled_at = now()
  where o.sent_at is null and o.cancelled_at is null and (
    (o.kind = 'guardian_report' and not exists (
      select 1 from public.academic_guardian_email_prefs p
      join public.academic_guardian_links l on l.guardian_user_id = p.user_id
      join public.academic_student_profiles sp on sp.id = l.student_profile_id
      where p.user_id = o.user_id and p.status = 'confirmed' and l.id = (o.payload->>'link_id')::uuid
        and l.status = 'active' and sp.consent_state = 'active' and coalesce((l.scopes->>'scores')::boolean, false)))
    or (o.kind = 'guardian_confirm' and not exists (
      select 1 from public.academic_guardian_email_prefs p
      where p.user_id = o.user_id and p.status = 'pending' and p.confirm_token_hash = public.academic_email_token_hash(o.payload->>'token'))));

  return query
  update public.academic_email_outbox o
  set attempts = o.attempts + 1
  from public.academic_guardian_email_prefs p
  where p.user_id = o.user_id and o.id in (
    select x.id from public.academic_email_outbox x
    where x.sent_at is null and x.cancelled_at is null and x.attempts < 5
    order by x.created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update skip locked)
  returning o.id, o.kind, o.recipient, o.language, o.payload, p.unsubscribe_token;
end;
$$;

create or replace function public.academic_complete_guardian_emails(p_sent uuid[], p_failed uuid[], p_error text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_given_up integer;
begin
  -- The confirmation token is not kept once the e-mail has gone.
  update public.academic_email_outbox set sent_at = now(), last_error = null, payload = payload - 'token' where id = any (coalesce(p_sent, '{}'));
  update public.academic_email_outbox set last_error = left(p_error, 300) where id = any (coalesce(p_failed, '{}'));
  select count(*) into v_given_up from public.academic_email_outbox where id = any (coalesce(p_failed, '{}')) and attempts >= 5;
  if v_given_up > 0 then
    perform public.academic_raise_alert('guardian_email_failed', jsonb_build_object('count', v_given_up, 'error', left(p_error, 200)));
  end if;
end;
$$;

-- ─── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'academic_email_token()', 'academic_email_token_hash(text)', 'academic_guardian_email_view(uuid)', 'academic_guardian_report_email()',
    'academic_guardian_email_confirm(text)', 'academic_guardian_email_unsubscribe(text)',
    'academic_claim_guardian_emails(integer)', 'academic_complete_guardian_emails(uuid[],uuid[],text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'academic_guardian_email_confirm(text)', 'academic_guardian_email_unsubscribe(text)',
    'academic_claim_guardian_emails(integer)', 'academic_complete_guardian_emails(uuid[],uuid[],text)'
  ] loop
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['academic_guardian_email_settings()', 'academic_guardian_email_subscribe(boolean)', 'academic_guardian_email_stop()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
