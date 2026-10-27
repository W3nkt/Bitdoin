// Monthly guardian reports by e-mail (P3-PAR #52, piece 3b: NOTIF-002,
// migration 161): double opt-in, one-click unsubscribe, no scores unless the
// guardian chooses, nothing sent once the link or sharing ends.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, G, G2] = ['a1', 'c1', 'c2'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, email, member_code, role, language) values
  ('${S}', 'Noy', 'noy@example.com', 'AAA111', 'CUSTOMER', 'lo'), ('${G}', 'Mrs Phonsavan', 'mother@example.com', 'GGG333', 'CUSTOMER', 'en'),
  ('${G2}', 'Mr Kham', null, 'GGG444', 'CUSTOMER', 'lo')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';`)

const s = await rpc(S, `public.academic_create_profile(${json({ display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] })})`)
const link = await rpc(G, `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'mother', true)`)
await rpc(S, `public.academic_confirm_guardian_link('${link.id}', true)`)
const link2 = await rpc(G2, `public.academic_accept_guardian_invite('${(await rpc(S, `public.academic_create_guardian_invite()`)).code}', 'father', true)`)
void link2

const outbox = async (kind) => (await db.query(`select * from academic_email_outbox where kind = '${kind}' order by created_at`)).rows
const claim = async () => (await db.query(`select * from public.academic_claim_guardian_emails(20)`)).rows
const complete = (sent, failed = [], error = null) => db.query(`select public.academic_complete_guardian_emails($1::uuid[], $2::uuid[], $3)`, [sent, failed, error])
const confirm = async (token) => (await one(`select public.academic_guardian_email_confirm(${token === null ? 'null' : `'${token}'`}) as r`)).r
const unsubscribe = async (token) => (await one(`select public.academic_guardian_email_unsubscribe('${token}') as r`)).r
let periodNo = 1
const report = async (content = {}) => one(`insert into academic_guardian_reports (link_id, student_profile_id, reporting_period_id, content) values ('${link.id}', '${s.profile_id}', '${period(periodNo++)}', '${JSON.stringify({
  student_name: 'Noy', period: { label_en: 'October', label_lo: 'ຕຸລາ', school_year: '2026-2027' }, recorded: { recorded: 4, active: 5, missing: [] },
  changes: { mean_change: -0.25, subjects: [{ name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ', latest: 6, previous: 7, direction: 'down' }] },
  stronger: [{ name_en: 'Lao language', name_lo: 'ພາສາລາວ', reason: { n: 3, above: 3, below: 0, confidence: 'medium' } }],
  needs_attention: [{ name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ', reason: { n: 3, above: 0, below: 2, confidence: 'low' } }],
  next_steps: [{ kind: 'ask_hardest', subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ' }], ...content,
}).replace(/'/g, "''")}') returning id`)

// ─── Opting in ───────────────────────────────────────────────────────────────

eq('off to begin with, with the account e-mail shown', await rpc(G, `public.academic_guardian_email_settings()`),
  { account_email: 'mother@example.com', is_guardian: true, status: 'off', email: null, include_scores: false, confirmed_at: null })
eq('only guardians can turn it on', (await rpcError(S, `public.academic_guardian_email_subscribe(false)`))?.code, 'NOT_A_GUARDIAN')
eq('an account without an e-mail is told to add one', (await rpcError(G2, `public.academic_guardian_email_subscribe(false)`))?.code, 'EMAIL_MISSING')
eq('turning it on waits for the confirmation', (await rpc(G, `public.academic_guardian_email_subscribe(false)`)).status, 'pending')
await report()
eq('nothing but the confirmation is queued before confirming', [(await outbox('guardian_confirm')).length, (await outbox('guardian_report')).length], [1, 0])
let claimed = await claim()
const token = claimed[0].payload.token
eq('the confirmation goes to the account e-mail in their language, with a one-time link and an unsubscribe token',
  [claimed.length, claimed[0].kind, claimed[0].recipient, claimed[0].language, token.length, claimed[0].unsubscribe_token.length], [1, 'guardian_confirm', 'mother@example.com', 'en', 64, 64])
await complete([claimed[0].id])
eq('only a hash of the token is kept once sent', [(await outbox('guardian_confirm'))[0].payload.token, (await one(`select confirm_token_hash = encode(sha256(convert_to('${token}', 'UTF8')), 'hex') as ok from academic_guardian_email_prefs`)).ok], [undefined, true])
eq('a wrong link does nothing', await confirm('0'.repeat(64)), { status: 'invalid' })
eq('the link confirms', await confirm(token), { status: 'confirmed' })
eq('and works once', await confirm(token), { status: 'invalid' })
eq('confirmed', (await rpc(G, `public.academic_guardian_email_settings()`)).status, 'confirmed')

// ─── Report e-mails ──────────────────────────────────────────────────────────

const r1 = await report()
claimed = await claim()
eq('a new report queues its e-mail', [claimed.length, claimed[0].kind, claimed[0].payload.report_id, claimed[0].payload.site_url], [1, 'guardian_report', r1.id, 'https://bitdoin.store'])
eq('without "include scores": no scores, no counts behind labels', [claimed[0].payload.include_scores, claimed[0].payload.changes, claimed[0].payload.stronger, JSON.stringify(claimed[0].payload).includes('"latest"')],
  [false, null, [{ name_en: 'Lao language', name_lo: 'ພາສາລາວ' }], false])
await complete([claimed[0].id])
eq('changing "include scores" sends no new confirmation', [(await rpc(G, `public.academic_guardian_email_subscribe(true)`)).include_scores, (await outbox('guardian_confirm')).length], [true, 1])
await report()
claimed = await claim()
eq('with "include scores": the score changes are in', claimed[0].payload.changes.subjects[0].latest, 6)
await complete([claimed[0].id])
eq('one e-mail per report', (await claim()).length, 0)

await report()
await rpc(S, `public.academic_set_guardian_scopes('${link.id}', ${json({ scores: false })})`)
eq('if the child stops sharing scores before sending, the e-mail is dropped', [(await claim()).length, (await outbox('guardian_report')).at(-1).cancelled_at !== null], [0, true])
await rpc(S, `public.academic_set_guardian_scopes('${link.id}', ${json({ scores: true })})`)

// ─── Delivery failures ───────────────────────────────────────────────────────

await report()
for (let i = 0; i < 5; i++) {
  const [mail] = await claim()
  await complete([], [mail.id], 'Resend 403: domain not verified')
}
eq('after 5 failed tries it stops and the admins are alerted', [(await claim()).length, (await one(`select count(*)::int as n from academic_alerts where kind = 'guardian_email_failed'`)).n], [0, 1])

// ─── Unsubscribing ───────────────────────────────────────────────────────────

const unsubToken = (await one(`select unsubscribe_token from academic_guardian_email_prefs where user_id = '${G}'`)).unsubscribe_token
await report()
eq('one-click unsubscribe works without signing in', await unsubscribe(unsubToken), { status: 'unsubscribed', scope: 'guardian' })
eq('queued e-mails are dropped and nothing new is queued', [(await claim()).length, (await report(), (await claim()).length)], [0, 0])
eq('a second click is harmless', await unsubscribe(unsubToken), { status: 'unsubscribed', scope: 'guardian' })
eq('a wrong token does nothing', await unsubscribe('x'), { status: 'invalid' })
eq('logged', (await one(`select count(*)::int as n from academic_audit_events where action = 'guardian.email_unsubscribe' and actor_user_id = '${G}'`)).n, 1)

// Turning it back on needs a new confirmation; at most 3 confirmation e-mails a day.
await rpc(G, `public.academic_guardian_email_subscribe(false)`)
await rpc(G, `public.academic_guardian_email_subscribe(false)`)
eq('re-subscribing asks again; only the newest link is queued', [(await rpc(G, `public.academic_guardian_email_settings()`)).status, (await outbox('guardian_confirm')).filter((m) => !m.sent_at && !m.cancelled_at).length], ['pending', 1])
eq('at most 3 confirmation e-mails a day', (await rpcError(G, `public.academic_guardian_email_subscribe(false)`))?.code, 'EMAIL_CONFIRM_LIMIT')
await db.exec(`update academic_guardian_email_prefs set confirm_expires_at = now() - interval '1 minute'`)
const [late] = await claim()
eq('an expired link is refused', await confirm(late.payload.token), { status: 'expired' })
eq('stopping from the Family page works too', (await rpc(G, `public.academic_guardian_email_stop()`)).status, 'unsubscribed')

// ─── Grants ──────────────────────────────────────────────────────────────────

eq('token and delivery functions are server-only', (await db.query(`select p.proname from pg_proc p where p.proname in
  ('academic_guardian_email_confirm', 'academic_guardian_email_unsubscribe', 'academic_claim_guardian_emails', 'academic_complete_guardian_emails')
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows, [])

done()
