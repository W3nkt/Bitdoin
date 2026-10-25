import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const NOBODY = '00000000-0000-0000-0000-0000000000c1'
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B'), ('${NOBODY}', 'C')`)
await ok(db, 'config', CONFIG_SQL)

const onboard = (user) => rpc(user, `public.academic_create_profile(${json({
  display_name: 'S', age_band: '18_plus', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25',
})})`)
const a = await onboard(A)
const b = await onboard(B)
const P = a.profile_id

// Scores, a correction and a draft for A (written as the owner, like the score RPCs will).
await ok(db, 'A scores', `
  insert into academic_score_entries (id, enrolment_id, reporting_period_id, state, submitted_at) values
    ('30000000-0000-0000-0000-000000000001', '${a.enrolment_id}', '${period(1)}', 'submitted', now() - interval '1 day');
  insert into academic_score_entries (id, enrolment_id, reporting_period_id) values ('30000000-0000-0000-0000-000000000002', '${a.enrolment_id}', '${period(2)}');
  insert into academic_score_lines (score_entry_id, subject_enrolment_id, raw_value, status, grading_scale_version_id)
  select '30000000-0000-0000-0000-000000000001', se.id, 6, 'scored', '${ID.scaleV1}' from academic_subject_enrolments se where se.enrolment_id = '${a.enrolment_id}';
  update academic_score_lines set raw_value = 7 where score_entry_id = '30000000-0000-0000-0000-000000000001'`)
await ok(db, 'B score', `insert into academic_score_entries (enrolment_id, reporting_period_id) values ('${b.enrolment_id}', '${period(1)}')`)

// ─── Consent (PRIV-001/003) ──────────────────────────────────────────────────

let consents = await rpc(A, `public.academic_list_my_consents()`)
eq('only current purposes offered', consents.purposes_available, ['module_processing', 'email', 'push', 'usage_statistics'])
eq('AI/OCR purposes closed in Phase 1', (await rpcError(A, `public.academic_grant_consent('ai_processing', '2026-10-25')`))?.code, 'VALIDATION_FAILED')
eq('outdated notice refused', (await rpcError(A, `public.academic_grant_consent('push', '2025-01')`))?.code, 'NOTICE_OUTDATED')
consents = await rpc(A, `public.academic_grant_consent('push', '2026-10-25')`)
eq('push granted', consents.consents.filter((c) => !c.withdrawn_at).map((c) => c.purpose).sort(), ['module_processing', 'push', 'usage_statistics'])
await rpc(A, `public.academic_grant_consent('push', '2026-10-25')`)
eq('same version is a no-op', (await one(`select count(*)::int as n from academic_consent_records where student_profile_id = '${P}' and purpose = 'push'`)).n, 1)

// Re-acknowledging a new notice closes the old record and opens a new one.
await ok(db, 'new notice', `update academic_settings set value = '"2027-01"' where key = 'consent_notice_version'`)
await rpc(A, `public.academic_grant_consent('module_processing', '2027-01')`)
eq('re-acknowledged', (await db.query(`select notice_version, withdrawn_at is not null as closed from academic_consent_records where student_profile_id = '${P}' and purpose = 'module_processing' order by granted_at, notice_version`)).rows,
  [{ notice_version: '2026-10-25', closed: true }, { notice_version: '2027-01', closed: false }])
eq('session ready after re-ack', (await rpc(A, `public.academic_get_session()`)).next_step, 'ready')
await ok(db, 'restore notice', `update academic_settings set value = '"2026-10-25"' where key = 'consent_notice_version'`)
await rpc(A, `public.academic_grant_consent('module_processing', '2026-10-25')`)

// Withdrawing module processing makes the profile read-only.
await rpc(A, `public.academic_withdraw_consent('module_processing')`)
eq('withdrawn -> read only', await one(`select consent_state, status from academic_student_profiles where id = '${P}'`), { consent_state: 'withdrawn', status: 'read_only' })
eq('writes refused after withdrawal', (await rpcError(A, `public.academic_update_profile(1, ${json({ display_name: 'X' })})`))?.code, 'PROFILE_READ_ONLY')
await rpc(A, `public.academic_grant_consent('module_processing', '2026-10-25')`)
eq('consent again -> active', await one(`select consent_state, status from academic_student_profiles where id = '${P}'`), { consent_state: 'active', status: 'active' })
eq('consent events audited', (await one(`select count(*)::int as n from academic_audit_events where action in ('consent.grant', 'consent.withdraw') and student_profile_id = '${P}'`)).n, 7)

// ─── Export (PRIV-004) ───────────────────────────────────────────────────────

const exp = await rpc(A, `public.academic_export_my_data()`)
eq('export sections', Object.keys(exp).sort(), ['consents', 'enrolments', 'format_version', 'generated_at', 'profile', 'revisions', 'scores'])
eq('export profile is own', exp.profile.id, P)
eq('export enrolment', [exp.enrolments.length, exp.enrolments[0].academic_year, exp.enrolments[0].grade, exp.enrolments[0].grading_scale, exp.enrolments[0].subjects.length], [1, '2026-2027', 'G11', 'LA-0-10 v1', 3])
eq('export scores (current lines, incl. draft-free submitted entry)', exp.scores.map((s) => [s.subject_code, s.raw_value, s.edited, s.entry_state]),
  [['LAO', 7, true, 'submitted'], ['MATH', 7, true, 'submitted'], ['PHYS', 7, true, 'submitted']])
eq('export revisions', exp.revisions.map((r) => [r.old_value, r.new_value, r.changed_by]), [['6.00', '7.00', 'system'], ['6.00', '7.00', 'system'], ['6.00', '7.00', 'system']])
eq('export consents (6 records incl. usage statistics; the withdrawal closes one)', exp.consents.length, 6)
eq('export never includes other students', JSON.stringify(exp).includes(b.profile_id), false)
eq('export audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'privacy.export' and actor_user_id = '${A}'`)).n, 1)
eq('no profile -> 404', (await rpcError(NOBODY, `public.academic_export_my_data()`))?.code, 'PROFILE_REQUIRED')

// Privacy rights work while the module is switched off.
await ok(db, 'module off', `update academic_settings set value = 'false' where key = 'my_scores_enabled'`)
eq('export with module off', (await rpc(A, `public.academic_export_my_data()`)).profile.id, P)
eq('my data with module off', (await rpc(A, `public.academic_get_my_data_summary()`)).counts.scores, 3)
eq('consents with module off', (await rpc(A, `public.academic_list_my_consents()`)).consents.length, 6)
await ok(db, 'module on', `update academic_settings set value = 'true' where key = 'my_scores_enabled'`)

// ─── Deletion (PRIV-005) ─────────────────────────────────────────────────────

const old = Math.floor(Date.now() / 1000) - 60 * 60
eq('stale sign-in -> reauth', (await rpcError(A, `public.academic_request_deletion('profile')`, { signedInAt: old }))?.code, 'REAUTH_REQUIRED')
eq('bad scope', (await rpcError(A, `public.academic_request_deletion('everything')`))?.code, 'VALIDATION_FAILED')
let del = await rpc(A, `public.academic_request_deletion('profile')`)
eq('pending with 14-day schedule', [del.status, del.deletion_scope, Math.round((new Date(del.deletion_scheduled_for) - new Date(del.deletion_requested_at)) / 86400000)], ['deletion_pending', 'profile', 14])
const again = await rpc(A, `public.academic_request_deletion('scores')`, { signedInAt: old })
eq('repeat request keeps schedule', [again.deletion_scope, again.deletion_requested_at], ['profile', del.deletion_requested_at])
eq('writes blocked while pending', (await rpcError(A, `public.academic_update_profile(1, ${json({ display_name: 'X' })})`))?.code, 'PROFILE_READ_ONLY')

del = await rpc(A, `public.academic_cancel_deletion()`)
eq('cancel restores', [del.status, del.deletion_scope], ['active', null])

// Purge only after the grace period.
await rpc(A, `public.academic_request_deletion('profile')`)
await rpc(B, `public.academic_request_deletion('scores')`)
eq('nothing due yet', (await one(`select public.academic_purge_due_deletions() as n`)).n, 0)
eq('clients cannot run purge', (await rpcError(A, `public.academic_purge_due_deletions()`))?.status, '42501')
await ok(db, 'age requests', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where status = 'deletion_pending'`)
eq('two purged', (await one(`select public.academic_purge_due_deletions() as n`)).n, 2)
eq('purge is idempotent', (await one(`select public.academic_purge_due_deletions() as n`)).n, 0)

// Data sweep: nothing left that points at A, except retained consent evidence and minimised audit events.
const sweep = await one(`select
  (select count(*)::int from academic_student_profiles where id = '${P}') as profiles,
  (select count(*)::int from academic_enrolments where student_profile_id = '${P}') as enrolments,
  (select count(*)::int from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}') as subjects,
  (select count(*)::int from academic_score_entries where enrolment_id = '${a.enrolment_id}') as entries,
  (select count(*)::int from academic_score_lines l left join academic_score_entries e on e.id = l.score_entry_id where e.id is null) as orphan_lines,
  (select count(*)::int from academic_score_revisions r left join academic_score_lines l on l.id = r.score_line_id where l.id is null) as orphan_revisions,
  (select count(*)::int from academic_review_tasks where student_profile_id = '${P}') as tasks,
  (select count(*)::int from academic_consent_records where student_profile_id = '${P}') as linked_consents,
  (select count(*)::int from academic_consent_records where student_profile_id is null) as retained_consents,
  (select count(*)::int from academic_audit_events where student_profile_id = '${P}' and action = 'privacy.purge') as purge_audit`)
eq('profile scope fully removed', sweep, { profiles: 0, enrolments: 0, subjects: 0, entries: 0, orphan_lines: 0, orphan_revisions: 0, tasks: 0, linked_consents: 0, retained_consents: 6, purge_audit: 1 })
eq('audit events hold ids only', (await one(`select count(*)::int as n from academic_audit_events where reason is not null and reason not in ('module_processing', 'push', 'email', 'usage_statistics', 'profile', 'scores')`)).n, 0)

const bAfter = await one(`select p.status, p.deletion_scope, (select count(*)::int from academic_score_entries where enrolment_id = '${b.enrolment_id}') as entries,
  (select count(*)::int from academic_enrolments where student_profile_id = p.id) as enrolments from academic_student_profiles p where p.id = '${b.profile_id}'`)
eq('scores scope keeps profile and enrolment', bAfter, { status: 'active', deletion_scope: null, entries: 0, enrolments: 1 })
eq('A can start over', (await onboard(A)).created, true)

eq('daily purge scheduled', await one(`select schedule, command from cron.job where jobname = 'academic-purge-deletions'`), { schedule: '15 20 * * *', command: 'select public.academic_purge_due_deletions();' })

done()
