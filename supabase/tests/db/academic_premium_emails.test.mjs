// E-mail before Academy Premium ends (P3-BIL #51, NOTIF-005, migration 163):
// only with the 'email' consent, 7 days and 1 day before, once each, dropped
// on renewal or withdrawal, one-click unsubscribe withdraws the consent.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, one } = apiFor(db)
const [S, N, X] = ['a1', 'a2', 'a3'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, email, role, language) values
  ('${S}', 'Noy', 'noy@example.com', 'CUSTOMER', 'en'), ('${N}', 'Kham', 'kham@example.com', 'CUSTOMER', 'lo'), ('${X}', 'Vone', null, 'CUSTOMER', 'lo')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';`)
const profile = { display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] }
for (const user of [S, N, X]) await rpc(user, `public.academic_create_profile(${json(profile)})`)
await rpc(S, `public.academic_grant_consent('email', '2026-10-25')`)
await rpc(X, `public.academic_grant_consent('email', '2026-10-25')`)

// Premium ending in N days (Vientiane), for each user.
const endsIn = (days) => `((public.academic_today() + ${days})::timestamp + time '12:00') at time zone 'Asia/Vientiane'`
await ok(db, 'premium', `insert into premium_subscriptions (user_id, plan_id, status, ends_at)
  select u, (select id from premium_plans where slug = 'premium-monthly'), 'ACTIVE', ${endsIn(7)} from unnest(array['${S}', '${N}', '${X}']::uuid[]) u`)
const job = async () => (await one(`select public.academic_premium_ending_emails() as n`)).n
const claim = async () => (await db.query(`select * from public.academic_claim_guardian_emails(20)`)).rows
const complete = (sent) => db.query(`select public.academic_complete_guardian_emails($1::uuid[], '{}'::uuid[], null)`, [sent])

eq('7 days before: only the student who turned on account e-mails and has an address', await job(), 1)
eq('once only', await job(), 0)
let [mail] = await claim()
eq('to the account address, in their language, with the end date and an unsubscribe token',
  [mail.kind, mail.recipient, mail.language, mail.payload.days, mail.unsubscribe_token.length], ['premium_ending', 'noy@example.com', 'en', 7, 64])
await complete([mail.id])

await db.exec(`update premium_subscriptions set ends_at = ${endsIn(1)} where user_id = '${S}'`)
eq('1 day before: one more', await job(), 1)
await db.exec(`update premium_subscriptions set ends_at = ${endsIn(31)} where user_id = '${S}'`)
eq('renewed before sending: dropped', (await claim()).length, 0)
eq('no e-mail on other days', await job(), 0)

await db.exec(`update premium_subscriptions set ends_at = ${endsIn(1)} where user_id = '${S}'`)
await db.exec(`delete from academic_email_outbox`)
await job()
const token = (await one(`select token from academic_email_tokens where user_id = '${S}'`)).token
eq('one-click unsubscribe withdraws the consent', (await one(`select public.academic_guardian_email_unsubscribe('${token}') as r`)).r, { status: 'unsubscribed', scope: 'account' })
eq('the consent is withdrawn and logged', [(await one(`select count(*)::int as n from academic_consent_records c join academic_student_profiles p on p.id = c.student_profile_id
  where p.user_id = '${S}' and c.purpose = 'email' and c.withdrawn_at is null`)).n, (await one(`select count(*)::int as n from academic_audit_events where action = 'consent.withdraw' and actor_user_id = '${S}'`)).n], [0, 1])
eq('queued e-mails are dropped and none follow', [(await claim()).length, (await db.exec(`delete from academic_email_outbox`), await job())], [0, 0])
eq('the job and tokens are server-only', (await db.query(`select p.proname from pg_proc p where p.proname = 'academic_premium_ending_emails'
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows, [])

done()
