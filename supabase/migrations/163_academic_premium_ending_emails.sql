-- My Scores — e-mail before Academy Premium ends (P3-BIL #51, NOTIF-005).
--
-- The in-app notice in Premium's last 7 days exists (migration 142). This adds
-- the e-mail "if consented": a student who turns on "E-mails about my
-- account" in My data (consent purpose 'email', self-granted, withdrawn at any
-- time) gets an e-mail 7 days and 1 day before their Academy Premium
-- membership ends (Vientiane dates), to the e-mail on their Bitdoin account.
-- A daily job at 09:00 Vientiane queues them in the e-mail outbox (migration
-- 161); academic-alerts sends them. An e-mail is dropped if, by sending time,
-- the consent was withdrawn or Premium was renewed. Every e-mail has a
-- one-click unsubscribe (link and List-Unsubscribe header), which withdraws
-- the 'email' consent.

create table if not exists public.academic_email_tokens (
  user_id     uuid primary key references public.users(id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now()
);
alter table public.academic_email_tokens enable row level security;
revoke all on public.academic_email_tokens from anon, authenticated;

alter table public.academic_email_outbox drop constraint if exists academic_email_outbox_kind_check;
alter table public.academic_email_outbox add constraint academic_email_outbox_kind_check check (kind in ('guardian_confirm', 'guardian_report', 'premium_ending'));

create or replace function public.academic_premium_ending_emails()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    select u.id as user_id, u.email, coalesce(u.language, 'lo') as language, u.name, pu.until,
           ((pu.until at time zone 'Asia/Vientiane')::date - public.academic_today()) as days
    from public.users u
    join public.academic_student_profiles p on p.user_id = u.id
    join public.academic_consent_records c on c.student_profile_id = p.id and c.purpose = 'email' and c.withdrawn_at is null
    cross join lateral (select public.academic_premium_until(u.id) as until) pu
    where nullif(btrim(coalesce(u.email, '')), '') is not null and pu.until is not null and pu.until <> 'infinity'::timestamptz
  ), tokens as (
    insert into public.academic_email_tokens (user_id, token)
    select d.user_id, public.academic_email_token() from due d where d.days in (7, 1)
    on conflict (user_id) do nothing
  ), queued as (
    insert into public.academic_email_outbox (user_id, kind, recipient, language, payload, dedupe_key)
    select d.user_id, 'premium_ending', d.email, d.language,
           jsonb_build_object('days', d.days, 'until', d.until, 'name', d.name, 'site_url', public.academic_setting('site_url') #>> '{}'),
           'premium_ending:' || d.user_id || ':' || (d.until at time zone 'Asia/Vientiane')::date || ':' || d.days
    from due d where d.days in (7, 1)
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_count from queued;
  return v_count;
end;
$$;

-- Claiming (re-created from 161): premium e-mails are dropped once consent is
-- withdrawn or Premium was renewed, and carry the account unsubscribe token.
create or replace function public.academic_claim_guardian_emails(p_limit integer default 20)
returns table (id uuid, kind text, recipient text, language text, payload jsonb, unsubscribe_token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
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
      where p.user_id = o.user_id and p.status = 'pending' and p.confirm_token_hash = public.academic_email_token_hash(o.payload->>'token')))
    or (o.kind = 'premium_ending' and (
      not exists (
        select 1 from public.academic_student_profiles sp
        join public.academic_consent_records c on c.student_profile_id = sp.id and c.purpose = 'email' and c.withdrawn_at is null
        where sp.user_id = o.user_id)
      or public.academic_premium_until(o.user_id) is distinct from (o.payload->>'until')::timestamptz)));

  return query
  update public.academic_email_outbox o
  set attempts = o.attempts + 1
  where o.id in (
    select x.id from public.academic_email_outbox x
    where x.sent_at is null and x.cancelled_at is null and x.attempts < 5
    order by x.created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update skip locked)
  returning o.id, o.kind, o.recipient, o.language, o.payload,
    case when o.kind = 'premium_ending'
      then (select t.token from public.academic_email_tokens t where t.user_id = o.user_id)
      else (select p.unsubscribe_token from public.academic_guardian_email_prefs p where p.user_id = o.user_id) end;
end;
$$;

-- Unsubscribing by token (re-created from 161): guardian report e-mails, or
-- account e-mails (withdraws the 'email' consent). 'scope' tells the page which.
create or replace function public.academic_guardian_email_unsubscribe(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pref public.academic_guardian_email_prefs;
  v_user uuid;
  v_consent uuid;
  v_profile uuid;
begin
  select * into v_pref from public.academic_guardian_email_prefs where unsubscribe_token = coalesce(p_token, '') for update;
  if v_pref.user_id is not null then
    if v_pref.status <> 'unsubscribed' then
      update public.academic_guardian_email_prefs set status = 'unsubscribed', confirm_token_hash = null, unsubscribed_at = now(), updated_at = now()
      where user_id = v_pref.user_id;
      update public.academic_email_outbox set cancelled_at = now()
      where user_id = v_pref.user_id and kind like 'guardian_%' and sent_at is null and cancelled_at is null;
      insert into public.academic_audit_events (actor_user_id, actor_role, action, target_type, target_id, outcome, reason)
      values (v_pref.user_id, 'guardian', 'guardian.email_unsubscribe', 'user', v_pref.user_id, 'success', 'link');
    end if;
    return jsonb_build_object('status', 'unsubscribed', 'scope', 'guardian');
  end if;

  select user_id into v_user from public.academic_email_tokens where token = coalesce(p_token, '');
  if v_user is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  update public.academic_consent_records c set withdrawn_at = now()
  from public.academic_student_profiles sp
  where sp.id = c.student_profile_id and sp.user_id = v_user and c.purpose = 'email' and c.withdrawn_at is null
  returning c.id, sp.id into v_consent, v_profile;
  update public.academic_email_outbox set cancelled_at = now()
  where user_id = v_user and kind = 'premium_ending' and sent_at is null and cancelled_at is null;
  if v_consent is not null then
    insert into public.academic_audit_events (actor_user_id, actor_role, action, target_type, target_id, student_profile_id, outcome, reason)
    values (v_user, 'student', 'consent.withdraw', 'consent_record', v_consent, v_profile, 'success', 'email (link)');
  end if;
  return jsonb_build_object('status', 'unsubscribed', 'scope', 'account');
end;
$$;

revoke all on function public.academic_premium_ending_emails() from public, anon, authenticated;
revoke all on function public.academic_claim_guardian_emails(integer) from public, anon, authenticated;
revoke all on function public.academic_guardian_email_unsubscribe(text) from public, anon, authenticated;
grant execute on function public.academic_claim_guardian_emails(integer) to service_role;
grant execute on function public.academic_guardian_email_unsubscribe(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'academic-premium-ending-emails';
select cron.schedule(
  'academic-premium-ending-emails',
  '0 2 * * *', -- 09:00 Asia/Vientiane
  $$select public.academic_premium_ending_emails();$$
);
