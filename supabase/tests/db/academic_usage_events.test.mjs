// Usage events (ANL-001, #44; PRD §32.1/§32.3): schema validation, no PII,
// pseudonymous identifiers, consent and opt-out, deduplication, deletion
// and retention.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const A = '00000000-0000-0000-0000-0000000000a1'
await ok(db, 'users', `insert into public.users (id, name, email) values ('${A}', 'Noy Phommachanh', 'noy@example.com')`)
await ok(db, 'config', CONFIG_SQL)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-10-23' $$`)

let n = 0
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const event = (name, props = {}, extra = {}) => ({
  event_id: uuid(), name, occurred_at: new Date().toISOString(), locale: 'lo', platform: 'android', app_version: '2026.10.25', props, ...extra,
})
const track = (user, events) => rpc(user, `public.academic_track_events(${json(events)})`)
const refused = async (user, events) => (await rpcError(user, `public.academic_track_events(${json(events)})`))?.code
const stored = (where = 'true') => db.query(`select name, pseudonym, grade_code, province_code, locale, platform, props from academic_usage_events where ${where} order by received_at, name`).then((r) => r.rows)

// ─── Before a profile: anonymous landing and onboarding steps only ──────────

eq('pre-profile: landing and steps kept, the rest dropped', await track(A, [
  event('module_landing_viewed', { source: 'academy_menu' }),
  event('onboarding_started'),
  event('onboarding_step_completed', { step: 'notice', duration_ms: 4200 }),
  event('dashboard_viewed', { has_trend: false }),
]), { accepted: 3, duplicates: 0, dropped: 1, tracking: true })
eq('pre-profile events carry no identifier, grade or province', (await stored()).map((r) => [r.pseudonym, r.grade_code, r.province_code]),
  [[null, null, null], [null, null, null], [null, null, null]])

// ─── Schema validation: fixed lists, bounded numbers, no free text ──────────

eq('unknown event refused', await refused(A, [event('score_value_entered', {})]), 'VALIDATION_FAILED')
eq('unknown property refused', await refused(A, [event('dashboard_viewed', { has_trend: true, subject: 'Mathematics' })]), 'VALIDATION_FAILED')
eq('free text where a list value belongs refused', await refused(A, [event('module_landing_viewed', { source: 'Noy shared a link' })]), 'VALIDATION_FAILED')
eq('scores cannot ride in counts (non-integer)', await refused(A, [event('score_draft_saved', { lines_filled: 7.5, offline: false })]), 'VALIDATION_FAILED')
eq('counts are bounded', await refused(A, [event('score_draft_saved', { lines_filled: 5000, offline: false })]), 'VALIDATION_FAILED')
eq('durations are bounded', await refused(A, [event('onboarding_completed', { duration_ms: 90_000_000, school_listed: true })]), 'VALIDATION_FAILED')
eq('booleans must be booleans', await refused(A, [event('dashboard_viewed', { has_trend: 'yes' })]), 'VALIDATION_FAILED')
eq('status counts: line statuses only', await refused(A, [event('score_entry_submitted', { lines_status_counts: { scored: 3, 'Maths 8': 1 } })]), 'VALIDATION_FAILED')
eq('server-filled properties refused from the app', await refused(A, [event('score_entry_submitted', { first: true })]), 'VALIDATION_FAILED')
eq('extra envelope fields refused (no user ids)', await refused(A, [event('history_viewed', {}, { user_id: A })]), 'VALIDATION_FAILED')
eq('bad event id refused', await refused(A, [event('history_viewed', {}, { event_id: 'abc' })]), 'VALIDATION_FAILED')
eq('unknown locale refused', await refused(A, [event('history_viewed', {}, { locale: 'th' })]), 'VALIDATION_FAILED')
eq('unknown period refused', await refused(A, [event('score_entry_started', { period: '00000000-0000-4000-8000-999999999999', method: 'manual' })]), 'VALIDATION_FAILED')
eq('at most 50 events', await refused(A, Array.from({ length: 51 }, () => event('history_viewed'))), 'VALIDATION_FAILED')
eq('one bad event rejects the batch', [await refused(A, [event('history_viewed'), event('nope')]), (await stored()).length], ['VALIDATION_FAILED', 3])
eq('signed-out callers refused', (await rpcError(null, `public.academic_track_events('[]'::jsonb)`, { role: 'anon' }))?.status, '42501')
eq('event table hidden from students', (await rpcError(A, `(select count(*) from academic_usage_events)`))?.status, '42501')
eq('catalogue and pseudonym helpers are server-only', [
  (await rpcError(A, `public.academic_event_catalogue()`))?.status, (await rpcError(A, `public.academic_usage_pseudonym('${A}')`))?.status], ['42501', '42501'])

// ─── With a profile: pseudonymous, enriched, consent-aware ──────────────────

const profile = await rpc(A, `public.academic_create_profile(${json({
  display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25',
})})`)
const consents = async (user) => (await rpc(user, `public.academic_list_my_consents()`)).consents.filter((c) => !c.withdrawn_at).map((c) => c.purpose).sort()
eq('agreeing to the notice grants usage statistics', await consents(A), ['module_processing', 'usage_statistics'])

const created = event('profile_created', { source: 'academy_menu' })
eq('identified events accepted', await track(A, [created, event('onboarding_completed', { duration_ms: 95_000, school_listed: true })]),
  { accepted: 2, duplicates: 0, dropped: 0, tracking: true })
const row = (await stored(`name = 'profile_created'`))[0]
eq('pseudonym: 32 hex characters, not the account id', [/^[0-9a-f]{32}$/.test(row.pseudonym), row.pseudonym.includes(A.replace(/-/g, '').slice(0, 8))], [true, false])
eq('grade and province added on the server; age band from the profile', [row.grade_code, row.province_code, row.props], ['G11', 'vientiane-prefecture', { source: 'academy_menu', age_band: '16_17' }])
eq('same student, same pseudonym', (await one(`select count(distinct pseudonym)::int as n from academic_usage_events where pseudonym is not null`)).n, 1)
eq('retry of the same event is a duplicate', await track(A, [created]), { accepted: 0, duplicates: 1, dropped: 0, tracking: true })

eq('period stored as year:type:sequence', await track(A, [event('score_entry_started', { period: period(2), method: 'manual' })]), { accepted: 1, duplicates: 0, dropped: 0, tracking: true })
eq('period key', (await stored(`name = 'score_entry_started'`))[0].props, { period: '2026-2027:monthly:2', method: 'manual' })

const se = (await db.query(`select se.id from academic_subject_enrolments se where se.enrolment_id = '${profile.enrolment_id}'`)).rows.map((r) => r.id)
await rpc(A, `public.academic_submit_score_entry('${profile.enrolment_id}', '${period(2)}', ${json(se.map((id) => ({ subject_enrolment_id: id, status: 'scored', value: 7.5 })))}, 'k-1')`)
const submitted = { period: period(2), lines_scored: se.length, lines_status_counts: { scored: se.length }, duration_ms: 61_000, method: 'manual' }
await track(A, [event('score_entry_submitted', submitted)])
await rpc(A, `public.academic_submit_score_entry('${profile.enrolment_id}', '${period(1)}', ${json(se.map((id) => ({ subject_enrolment_id: id, status: 'scored', value: 9.5 })))}, 'k-2')`)
await track(A, [event('score_entry_submitted', { ...submitted, period: period(1) })])
eq('"first" set on the server: true only for the first submission', (await stored(`name = 'score_entry_submitted'`)).map((r) => r.props.first), [true, false])

const everything = JSON.stringify(await stored())
eq('no name, e-mail, account id or score anywhere in stored events', ['Noy', 'noy@example.com', A, '"value"', '7.5', '9.5'].filter((text) => everything.includes(text)), [])

// Clocks: a device far in the future is clamped to the server time.
await track(A, [event('history_viewed', {}, { occurred_at: '2031-01-01T00:00:00Z' })])
eq('implausible device time replaced', (await one(`select occurred_at < now() + interval '1 minute' as ok from academic_usage_events where name = 'history_viewed'`)).ok, true)

// ─── Opt-out and consent ────────────────────────────────────────────────────

await rpc(A, `public.academic_withdraw_consent('usage_statistics')`)
eq('switched off: events dropped and the app told to stop', await track(A, [event('dashboard_viewed', { has_trend: true })]), { accepted: 0, duplicates: 0, dropped: 1, tracking: false })
eq('switched off: anonymous events dropped too (the student has a profile)', (await track(A, [event('module_landing_viewed', { source: 'direct' })])).dropped, 1)
await ok(db, 'notice changes', `update academic_settings set value = '"2026-11-01"' where key = 'consent_notice_version'`)
await rpc(A, `public.academic_grant_consent('module_processing', '2026-11-01')`)
eq('re-agreeing to a new notice does not switch statistics back on', await consents(A), ['module_processing'])
await rpc(A, `public.academic_grant_consent('usage_statistics', '2026-11-01')`)
eq('the student can switch them back on', (await track(A, [event('dashboard_viewed', { has_trend: true })])).tracking, true)
await ok(db, 'module off', `update academic_settings set value = 'false' where key = 'my_scores_enabled'`)
eq('module switched off: nothing kept', (await track(A, [event('history_viewed')])).tracking, false)
await ok(db, 'module on', `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)
await rpc(A, `public.academic_withdraw_consent('module_processing')`)
eq('Schooling consent withdrawn: nothing kept', await track(A, [event('dashboard_viewed', { has_trend: true })]), { accepted: 0, duplicates: 0, dropped: 1, tracking: false })
await ok(db, 'notice back', `update academic_settings set value = '"2026-10-25"' where key = 'consent_notice_version'`)

// ─── Deletion and retention ─────────────────────────────────────────────────

const before = await one(`select count(*) filter (where pseudonym is null)::int as anonymous, count(*) filter (where pseudonym is not null)::int as identified from academic_usage_events`)
eq('identified events exist before deletion', before.identified > 0, true)
await ok(db, 'profile deleted', `delete from academic_student_profiles where user_id = '${A}'`)
eq('deleting the profile deletes its events; anonymous counts stay', await one(`select count(*) filter (where pseudonym is null)::int as anonymous, count(*) filter (where pseudonym is not null)::int as identified from academic_usage_events`),
  { anonymous: before.anonymous, identified: 0 })

await ok(db, 'old event', `insert into academic_usage_events (id, name, occurred_at, role, locale, platform, app_version) values (gen_random_uuid(), 'history_viewed', now() - interval '25 months', 'student', 'en', 'desktop', 'x')`)
eq('events older than 24 months purged', (await one(`select public.academic_purge_usage_events() as n`)).n, 1)
eq('purge and retention scheduled hourly', (await db.query(`select schedule from cron.job where jobname = 'academic-purge-usage-events'`)).rows, [{ schedule: '25 * * * *' }])

done()
