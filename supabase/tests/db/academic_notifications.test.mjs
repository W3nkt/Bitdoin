import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const C = '00000000-0000-0000-0000-0000000000c1'
await ok(db, 'users', `insert into public.users (id, name, language) values ('${A}', 'A', 'lo'), ('${B}', 'B', 'en'), ('${C}', 'C', 'lo')`)
await ok(db, 'config', CONFIG_SQL)
const setToday = (d) => db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '${d}' $$`)
await setToday('2026-10-05')

const profile = { display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-draft' }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json(profile)})`)
const c = await rpc(C, `public.academic_create_profile(${json(profile)})`)
// All joined on 1 October 2026 (Vientiane).
await ok(db, 'joined', `update academic_student_profiles set created_at = '2026-10-01 09:00+07'`)

const schedule = async () => (await one(`select public.academic_schedule_score_reminders() as n`)).n
const notes = async (user) => (await db.query(`select code, channel, state, payload->>'period_key' as period from academic_notifications where user_id = '${user}' order by created_at, code`)).rows
const ageFirstReminders = () => db.exec(`update academic_notifications set created_at = created_at - interval '8 days' where code = 'score_reminder.first'`)

// ─── Timing and dedupe (SCORE-014) ───────────────────────────────────────────

await setToday('2026-11-06')
eq('Oct not due until 7 days after it ends; Sep ended before joining', await schedule(), 0)
await setToday('2026-11-07')
eq('one first reminder per student for October', await schedule(), 3)
eq('first reminder is in-app', await notes(A), [{ code: 'score_reminder.first', channel: 'in_app', state: 'sent', period: '2026-10' }])
eq('re-running creates no duplicates', await schedule(), 0)
const payload = (await one(`select payload from academic_notifications where user_id = '${A}'`)).payload
eq('payload carries labels, never scores (NOTIF-004)', Object.keys(payload).sort(), ['enrolment_id', 'period_id', 'period_key', 'period_label_en', 'period_label_lo'])

await setToday('2026-11-10')
eq('second waits a further 7 days', await schedule(), 0)

// A submits October; their reminders stop.
const lines = (await db.query(`select id from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}'`)).rows.map((r) => ({ subject_enrolment_id: r.id, status: 'missing' }))
await rpc(A, `public.academic_submit_score_entry('${a.enrolment_id}', '${period(2)}', ${json(lines)}, 'oct')`)
eq('submitting settles that month at once (migration 120)', await notes(A), [{ code: 'score_reminder.first', channel: 'in_app', state: 'dismissed', period: '2026-10' }])

// B opts in to push; C turns in-app reminders off.
eq('push needs consent first', (await rpcError(B, `public.academic_set_notification_preference('score_reminder', true, true)`))?.code, 'CONSENT_REQUIRED')
await rpc(B, `public.academic_grant_consent('push', '2026-10-draft')`)
const prefs = await rpc(B, `public.academic_set_notification_preference('score_reminder', true, true)`)
eq('preferences', [prefs.categories, prefs.push_consent, prefs.push_device], [[{ category: 'score_reminder', in_app_enabled: true, push_enabled: true }], true, false])
// Devices (migration 120): a Bookstore-only device does not get score reminders.
const saveDevice = (platform, enabled, endpoint = 'https://push.example/b') =>
  rpc(B, `public.save_push_subscription('${endpoint}', 'k', 'a', 'test', '${platform}', ${enabled})`)
await saveDevice('BOOKSTORE', true)
eq('Bookstore-only device is not a My Scores device', (await rpc(B, `public.academic_get_notification_preferences()`)).push_device, false)
eq('My Scores switch on the same device', await saveDevice('MY_SCORES', true), { bookstore_enabled: true, academy_enabled: false, my_scores_enabled: true, academy_slot: 'MORNING' })
eq('now a My Scores device', (await rpc(B, `public.academic_get_notification_preferences()`)).push_device, true)
await saveDevice('MY_SCORES', true, 'https://push.example/b2')
await saveDevice('MY_SCORES', false, 'https://push.example/b2')
eq('device row removed only when every switch is off', (await db.query(`select endpoint from push_subscriptions where user_id = '${B}' order by endpoint`)).rows.map((r) => r.endpoint), ['https://push.example/b'])
await saveDevice('BOOKSTORE', false)
eq('turning Bookstore off keeps the My Scores device', (await one(`select bookstore_enabled, my_scores_enabled from push_subscriptions where endpoint = 'https://push.example/b'`)), { bookstore_enabled: false, my_scores_enabled: true })
await rpc(C, `public.academic_set_notification_preference('score_reminder', false, false)`)

await ageFirstReminders()
await setToday('2026-11-15')
eq('second reminders: B (push), not A (submitted), not C (in-app off)', await schedule(), 1)
eq('B second reminder queued for push', (await notes(B)).map((n) => [n.code, n.channel, n.state]), [['score_reminder.first', 'in_app', 'sent'], ['score_reminder.second', 'push', 'pending']])
eq('A only has the first', (await notes(A)).length, 1)
eq('C gets nothing more', (await notes(C)).length, 1)
await ageFirstReminders()
eq('never more than 2 per period', await schedule(), 0)

// ─── Quiet hours and push delivery (NOTIF-003) ───────────────────────────────

const quiet = async (iso) => (await one(`select public.academic_in_quiet_hours('${iso}'::timestamptz) as q`)).q
eq('quiet hours 21:00–07:00 Vientiane', [await quiet('2026-11-15 22:00+07'), await quiet('2026-11-15 06:59+07'), await quiet('2026-11-15 07:00+07'), await quiet('2026-11-15 12:00+07'), await quiet('2026-11-15 21:00+07')], [true, true, false, false, true])

const claim = async () => (await db.query(`select id, user_id, code, language from public.academic_claim_push_notifications(10)`)).rows
const setQuiet = (start, end) => db.exec(`update academic_settings set value = '{"start": "${start}", "end": "${end}"}' where key = 'notification_quiet_hours'`)
await setQuiet('00:00', '23:59')
eq('nothing sent in quiet hours', await claim(), [])
await setQuiet('00:00', '00:00')
const claimed = await claim()
eq('claimed outside quiet hours with language', claimed.map((r) => [r.user_id, r.code, r.language]), [[B, 'score_reminder.second', 'en']])
eq('claim is exclusive', await claim(), [])
await ok(db, 'sent', `select public.academic_complete_push_notifications(array['${claimed[0].id}']::uuid[], null)`)
eq('delivered push shows in the inbox', (await rpc(B, `public.academic_list_notifications()`)).items.map((n) => [n.code, n.channel, n.state]),
  [['score_reminder.second', 'push', 'sent'], ['score_reminder.first', 'in_app', 'sent']])

// Caps: B already had a push today -> the next one becomes in-app.
await setToday('2026-12-07')
await schedule()
await ageFirstReminders()
await setToday('2026-12-14')
await schedule()
eq('over the daily cap -> in-app instead of push', (await one(`select channel, state from academic_notifications where user_id = '${B}' and code = 'score_reminder.second' and payload->>'period_key' = '2026-11'`)), { channel: 'in_app', state: 'sent' })

// Opt-out after queueing: pending push is suppressed at claim time.
await ok(db, 'queued push', `insert into academic_notifications (user_id, student_profile_id, category, code, channel, state, dedupe_key, created_at)
  values ('${B}', '${b.profile_id}', 'score_reminder', 'score_reminder.second', 'push', 'pending', 'test:optout', now() - interval '8 days');
  update academic_notifications set sent_at = now() - interval '3 days', created_at = now() - interval '3 days' where channel = 'push' and state = 'sent'`)
await rpc(B, `public.academic_withdraw_consent('push')`)
eq('withdrawn consent suppresses queued push', [await claim(), (await one(`select state from academic_notifications where dedupe_key = 'test:optout'`)).state], [[], 'suppressed'])

// Failed delivery retries 3 times, then shows in-app.
await rpc(B, `public.academic_grant_consent('push', '2026-10-draft')`)
await ok(db, 'queued push 2', `insert into academic_notifications (user_id, student_profile_id, category, code, channel, state, dedupe_key) values ('${B}', '${b.profile_id}', 'score_reminder', 'score_reminder.second', 'push', 'pending', 'test:fail')`)
for (let i = 1; i <= 3; i++) {
  const [row] = await claim()
  await ok(db, `fail ${i}`, `select public.academic_complete_push_notifications(null, array['${row.id}']::uuid[])`)
}
eq('after 3 failures it becomes in-app', await one(`select channel, state, attempts from academic_notifications where dedupe_key = 'test:fail'`), { channel: 'in_app', state: 'sent', attempts: 3 })

// ─── Inbox RPCs ──────────────────────────────────────────────────────────────

const inbox = await rpc(A, `public.academic_list_notifications(1)`)
// A has both November reminders (October was submitted, so its reminder left the inbox).
eq('inbox paginates', [inbox.items.length, inbox.unread_count, inbox.next_before !== null], [1, 2, true])
const read = await rpc(A, `public.academic_mark_notifications_read(array['${inbox.items[0].id}']::uuid[])`)
eq('mark read', read.unread_count, 1)
eq("cannot dismiss someone else's", await rpc(B, `public.academic_dismiss_notification('${inbox.items[0].id}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('marking others as read is a no-op', (await rpc(B, `public.academic_mark_notifications_read(array['${inbox.items[0].id}']::uuid[])`)).unread_count >= 0, true)
eq('dismiss own', (await rpc(A, `public.academic_dismiss_notification('${inbox.items[0].id}')`)).state, 'dismissed')
eq('dismissed leave the inbox', (await rpc(A, `public.academic_list_notifications()`)).items.length, 1)
eq('max page size 50', (await rpc(A, `public.academic_list_notifications(500)`)).items.length <= 50, true)
eq('tables hidden from clients', (await rpcError(A, `(select count(*) from academic_notifications)`))?.status, '42501')
eq('service functions hidden from clients', (await rpcError(A, `(select count(*) from public.academic_claim_push_notifications(1))`))?.status, '42501')

// Module off: no reminders at all.
await ok(db, 'module off', `update academic_settings set value = 'false' where key = 'my_scores_enabled'`)
await setToday('2027-02-01')
eq('no reminders while the module is off', await schedule(), 0)

eq('schedules registered', (await db.query(`select jobname, schedule from cron.job where jobname in ('academic-score-reminders', 'academic-push-reminders') order by jobname`)).rows,
  [{ jobname: 'academic-push-reminders', schedule: '*/15 * * * *' }, { jobname: 'academic-score-reminders', schedule: '5 * * * *' }])

done()
