// Facebook sign-in from the app (migration 171): which account is this Facebook person?
// The lookup trusts only server-controlled data, never user_metadata, and is server-only.
import { createDb, ok, eq, done, readMigration } from './harness.mjs'

const db = await createDb([])
// The pieces of Supabase auth the lookup reads.
await ok(db, 'auth tables', `
  create table auth.users (
    id uuid primary key, email text, raw_app_meta_data jsonb not null default '{}',
    raw_user_meta_data jsonb not null default '{}', deleted_at timestamptz, banned_until timestamptz);
  create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
    provider text not null, provider_id text not null);`)
await db.exec(readMigration('171_facebook_app_login.sql'))

const U = (n) => `00000000-0000-0000-0000-0000000000${n}`
await ok(db, 'users', `
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data, deleted_at, banned_until) values
    ('${U('a1')}', 'web@example.com',     '{}', '{}', null, null),                                   -- signed in through the website (has a facebook identity)
    ('${U('a2')}', 'app@example.com',     '{"facebook_id": "200"}', '{}', null, null),               -- made by the app
    ('${U('a3')}', 'pw@example.com',      '{}', '{}', null, null),                                   -- email and password only
    ('${U('a4')}', 'Mixed@Example.com',   '{}', '{}', null, null),
    ('${U('a5')}', 'gone@example.com',    '{"facebook_id": "500"}', '{}', now(), null),              -- deleted
    ('${U('a6')}', 'banned@example.com',  '{"facebook_id": "600"}', '{}', null, now() + interval '1 day'),
    ('${U('a7')}', 'evil@example.com',    '{}', '{"facebook_id": "100"}', null, null),               -- claims a Facebook id in user_metadata
    ('${U('a8')}', 'other@example.com',   '{}', '{}', null, null),                                   -- linked to a different Facebook profile on the website
    ('${U('a9')}', 'stamped@example.com', '{"facebook_id": "900"}', '{}', null, null);              -- linked to a different Facebook profile by the app
  insert into auth.identities (user_id, provider, provider_id) values
    ('${U('a1')}', 'facebook', '100'), ('${U('a1')}', 'email', '${U('a1')}'),
    ('${U('a8')}', 'facebook', '800');`)

const lookup = async (facebookId, email) => (await db.query(`select public.facebook_login_lookup($1, $2) as r`, [facebookId, email])).rows[0].r

eq('a Facebook id that signed in through the website finds that account, whatever email Facebook now says',
  await lookup('100', 'changed@example.com'), { user_id: U('a1'), email: 'web@example.com', matched_by: 'identity', blocked: false })
eq('an id the app stamped on an account finds it again', await lookup('200', null),
  { user_id: U('a2'), email: 'app@example.com', matched_by: 'identity', blocked: false })
eq('an unknown Facebook person with an email that has an account is matched by email, ignoring case and spaces',
  await lookup('300', '  PW@example.com '), { user_id: U('a3'), email: 'pw@example.com', matched_by: 'email', blocked: false })
eq('and the other way round: stored with capitals, Facebook says lower case', (await lookup('400', 'mixed@example.com')).user_id, U('a4'))
eq('a new Facebook person with a new email has no account yet', await lookup('700', 'new@example.com'), null)
eq('a new Facebook person who shared no email has no account to match', [await lookup('701', null), await lookup('702', '   ')], [null, null])
eq('a deleted account is never matched, by id or by email', [await lookup('500', 'gone@example.com'), await lookup('501', 'gone@example.com')], [null, null])
eq('a banned account is found but marked blocked', (await lookup('600', null)).blocked, true)
eq('a Facebook id written into user_metadata (editable by the person) never matches: a stranger with id 100 is not them',
  [(await lookup('100', null)).user_id, await lookup('999', 'evil@example.com').then((r) => r.user_id)], [U('a1'), U('a7')])
eq('an email whose account belongs to a different Facebook profile (website or app) is a conflict, not a sign-in',
  [await lookup('801', 'other@example.com'), await lookup('901', 'stamped@example.com')], [{ conflict: true }, { conflict: true }])
eq('the same profile on that account is still matched', (await lookup('800', 'other@example.com')).matched_by, 'identity')
eq('an empty or oversized id finds nothing', [await lookup('', 'pw@example.com'), await lookup('9'.repeat(65), 'pw@example.com')], [null, null])

eq('only the service role may run the lookup', (await db.query(`
  select r.rolname, has_function_privilege(r.rolname, 'public.facebook_login_lookup(text, text)', 'execute') as can
  from pg_roles r where r.rolname in ('anon', 'authenticated', 'service_role') order by 1`)).rows,
  [{ rolname: 'anon', can: false }, { rolname: 'authenticated', can: false }, { rolname: 'service_role', can: true }])

done()
