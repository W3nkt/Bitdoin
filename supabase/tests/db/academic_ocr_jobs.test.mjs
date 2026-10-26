// Score-book scanning (P2-OCR #48): off switch and consent, allowance,
// duplicate detection, the Edge Function's claim/complete/fail, subject
// matching, timeout, confirmation as the only way to scores, discard, image
// deletion and retention, and cleanup after a profile is deleted.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [A, B] = ['a1', 'b1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'A'), ('${B}', 'B')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2027-03-10' $$`)
const profile = { display_name: 'S', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }, { custom_name: 'Robotics' }] }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json(profile)})`)
const ids = Object.fromEntries((await db.query(`select coalesce(s.code, se.custom_name) as code, se.id from academic_subject_enrolments se left join academic_subjects s on s.id = se.subject_id where se.enrolment_id = '${a.enrolment_id}'`)).rows.map((r) => [r.code, r.id]))
const errorOf = async (user, call) => await rpcError(user, call)
const HASH = 'f0f0f0f0f0f0f0f0'
const NEAR = 'f0f0f0f0f0f0f0f7' // 3 bits apart
const FAR = '0f0f0f0f0f0f0f0f'

// ─── Off switch and consent ──────────────────────────────────────────────────

eq('bucket created, private, JPEG only', await one(`select public, allowed_mime_types from storage.buckets where id = 'academic-ocr'`), { public: false, allowed_mime_types: ['image/jpeg'] })
eq('off by default', (await rpc(A, `public.academic_ocr_status()`)).available, false)
eq('off: no jobs', (await errorOf(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${HASH}')`))?.code, 'OCR_UNAVAILABLE')
await ok(db, 'switch on with the consent purpose', `update academic_settings set value = 'true' where key = 'ocr_enabled';
  update academic_settings set value = value || '["ocr_processing"]' where key = 'consent_purposes_enabled'`)
eq('on: available, no consent yet, 10 scans left', await rpc(A, `public.academic_ocr_status()`), { available: true, consent: false, allowance: { limit: 10, used: 0, remaining: 10 } })
eq('consent is required first', (await errorOf(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${HASH}')`))?.code, 'CONSENT_REQUIRED')
await rpc(A, `public.academic_grant_consent('ocr_processing', '2026-10-25')`)
await rpc(B, `public.academic_grant_consent('ocr_processing', '2026-10-25')`)
eq('a 64-bit hex hash is required', (await errorOf(A, `public.academic_start_ocr_job('${a.enrolment_id}', 'xyz')`))?.details?.field, 'phash')
eq("another student's school year -> 404", await rpc(B, `public.academic_start_ocr_job('${a.enrolment_id}', '${HASH}')`), { error: { code: 'NOT_FOUND', status: 404 } })

// ─── A job through the Edge Function steps ───────────────────────────────────

let job = (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${HASH}')`)).job
eq('job waits for the photo', [job.status, job.thresholds, job.timeout_seconds], ['awaiting_upload', { clear: 0.85, review: 0.5 }, 60])
eq('an awaiting job does not count', (await rpc(A, `public.academic_ocr_status()`)).allowance.used, 0)
const begin = async (jobId, user) => (await one(`select public.academic_ocr_begin('${jobId}', '${user}', '${user}/${jobId}.jpg', 412000) as v`)).v
eq('the function cannot claim another user\'s job', await begin(job.job_id, B), null)
const claimed = await begin(job.job_id, A)
eq('claimed: the scale and the student\'s subjects for the prompt', [claimed.scale.max, claimed.subjects.map((s) => s.name_en).sort()], [10, ['Mathematics', 'Physics', 'Robotics']])
eq('a job is claimed once', await begin(job.job_id, A), null)
await ok(db, 'school alias', `insert into academic_subject_aliases (subject_id, alias_text, alias_normalised) values ('${ID.math}', 'ເລກ', 'ເລກ')`)
const extraction = {
  schema: 'ocr_extraction.v1', model: { id: 'qwen-vl-max', prompt_version: 'ocr_extract.v1.0' },
  document: { detected_person_blocks: 1 },
  periods: [{ period_label_raw: 'ເດືອນ 3', period_guess: { month: 3, confidence: 0.91 }, rows: [
    { subject_raw: 'ຄະນິດສາດ', score_raw: '7', score_value: 7, score_confidence: 0.95, bbox: [10, 10, 50, 30] },
    { subject_raw: 'ເລກ', score_raw: '6', score_value: 6, score_confidence: 0.7, bbox: [10, 40, 50, 60] },
    { subject_raw: 'ຟີຊິກສາ', score_raw: '6.5?', score_value: 6.5, score_confidence: 0.62, bbox: [10, 70, 50, 90] },
    { subject_raw: 'Art', score_raw: '9', score_value: 9, score_confidence: 0.9, bbox: [10, 100, 50, 120] },
  ] }],
  warnings: [],
}
const done1 = (await one(`select public.academic_ocr_complete('${job.job_id}', ${json(extraction)}, 'qwen-vl-max', 'ocr_extract.v1.0', 8420, 0.0031) as v`)).v
const rows = done1.extraction.periods[0].rows
eq('subjects matched: exact name, school alias, fuzzy, none (OCR-005)', rows.map((r) => [r.subject_match.method, r.subject_match.subject_enrolment_id]),
  [['alias_exact', ids.MATH], ['alias_exact', ids.MATH], ['alias_fuzzy', ids.PHYS], ['none', null]])
eq('fuzzy confidence at or above 0.85', rows[2].subject_match.confidence >= 0.85, true)
eq('succeeded and counted', [(await rpc(A, `public.academic_get_ocr_job('${job.job_id}')`)).status, (await rpc(A, `public.academic_ocr_status()`)).allowance.used], ['succeeded', 1])
eq("another student cannot read A's scan", await rpc(B, `public.academic_get_ocr_job('${job.job_id}')`), { error: { code: 'NOT_FOUND', status: 404 } })

// ─── Duplicates (OCR-008) ────────────────────────────────────────────────────

eq('a near-identical photo offers the earlier result', (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${NEAR}')`)).duplicate?.job_id, job.job_id)
const reused = (await rpc(A, `public.academic_reuse_ocr_job('${job.job_id}')`)).job
eq('reusing copies the result without using the allowance', [reused.status, reused.duplicate_of, reused.extraction.periods[0].rows.length, (await rpc(A, `public.academic_ocr_status()`)).allowance.used], ['succeeded', job.job_id, 4, 1])
eq('a different photo starts a new job', (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${FAR}')`)).job?.status, 'awaiting_upload')
const forced = (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', '${NEAR}', true)`)).job
eq('"Scan again" despite a match is allowed', forced.status, 'awaiting_upload')

// ─── Failure, timeout, allowance ─────────────────────────────────────────────

await begin(forced.job_id, A)
await ok(db, 'model failed', `select public.academic_ocr_fail('${forced.job_id}', 'schema_invalid', 'qwen-vl-max', 61000)`)
eq('failed jobs do not count (OCR-012)', [(await rpc(A, `public.academic_get_ocr_job('${forced.job_id}')`)).status, (await rpc(A, `public.academic_ocr_status()`)).allowance.used], ['failed', 1])
const slow = (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', 'aaaaaaaaaaaaaaaa')`)).job
await begin(slow.job_id, A)
await ok(db, 'two minutes ago', `update academic_ocr_jobs set started_at = now() - interval '2 minutes' where id = '${slow.job_id}'`)
eq('past 60 s a processing job fails as timeout (OCR-009)', [(await rpc(A, `public.academic_get_ocr_job('${slow.job_id}')`)).status, (await rpc(A, `public.academic_get_ocr_job('${slow.job_id}')`)).error_code], ['failed', 'timeout'])
await ok(db, 'allowance of 2', `update academic_settings set value = value || '{"monthly_allowance": 2}' where key = 'ocr_rules'`)
const second = (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', 'bbbbbbbbbbbbbbbb')`)).job
await begin(second.job_id, A)
eq('the allowance stops new scans, never typing', (await errorOf(A, `public.academic_start_ocr_job('${a.enrolment_id}', 'cccccccccccccccc')`))?.code, 'OCR_ALLOWANCE_USED')
await ok(db, 'allowance back to 10', `update academic_settings set value = value || '{"monthly_allowance": 10}' where key = 'ocr_rules'`)

// ─── Confirmation (OCR-006, OCR-010) ─────────────────────────────────────────

eq('nothing to confirm on a failed job', (await errorOf(A, `public.academic_confirm_ocr_job('${forced.job_id}', '${period(3)}', '[]', '[]')`))?.code, 'OCR_NOT_READY')
eq("another student cannot confirm A's scan", await rpc(B, `public.academic_confirm_ocr_job('${job.job_id}', '${period(3)}', '[]', '[]')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('no score exists before confirmation', (await one(`select count(*)::int as n from academic_score_entries where enrolment_id = '${a.enrolment_id}'`)).n, 0)
const lines = [{ subject_enrolment_id: ids.MATH, status: 'scored', value: 7 }, { subject_enrolment_id: ids.PHYS, status: 'scored', value: 6.5 }, { subject_enrolment_id: ids.Robotics, status: 'missing' }]
const fields = [
  { subject_enrolment_id: ids.MATH, subject_raw: 'ຄະນິດສາດ', original_value: 7, original_confidence: 0.95, confirmed_value: 7, edited: false },
  { subject_enrolment_id: ids.PHYS, subject_raw: 'ຟີຊິກສາ', original_value: 6.5, original_confidence: 0.62, confirmed_value: 6.5, edited: true },
]
const confirmed = await rpc(A, `public.academic_confirm_ocr_job('${job.job_id}', '${period(3)}', ${json(lines)}, ${json(fields)}, 41000, true)`)
eq('confirmed scores saved as ocr_confirmed, self-reported', await one(`select e.source, e.state, (select array_agg(distinct l.source || '/' || l.verification) from academic_score_lines l where l.score_entry_id = e.id and l.is_current) as lines
  from academic_score_entries e where e.enrolment_id = '${a.enrolment_id}' and e.reporting_period_id = '${period(3)}'`), { source: 'ocr_confirmed', state: 'submitted', lines: ['ocr_confirmed/self_reported'] })
eq('original vs confirmed recorded', await one(`select edits_count, time_to_confirm_ms, jsonb_array_length(fields) as n from academic_ocr_confirmations where job_id = '${job.job_id}'`), { edits_count: 1, time_to_confirm_ms: 41000, n: 2 })
eq('job confirmed, photo kept as asked', await one(`select status, keep_photo, settled_at is not null as settled from academic_ocr_jobs where id = '${job.job_id}'`), { status: 'confirmed', keep_photo: true, settled: true })
eq('confirming again changes nothing', [(await rpc(A, `public.academic_confirm_ocr_job('${job.job_id}', '${period(3)}', ${json(lines)}, ${json(fields)})`)).replayed, (await one(`select count(*)::int as n from academic_ocr_confirmations`)).n], [true, 1])
eq('the dashboard sees the scores', (await rpc(A, `public.academic_get_dashboard()`)).periods.length, 1)

// ─── Discard, deletion, retention ────────────────────────────────────────────

eq('discarding a result saves nothing', [(await rpc(A, `public.academic_discard_ocr_job('${reused.job_id}')`)).status, (await one(`select count(*)::int as n from academic_score_entries where enrolment_id = '${a.enrolment_id}'`)).n], ['discarded', 1])
const due = async () => (await db.query(`select storage_path from public.academic_ocr_images_due()`)).rows.map((r) => r.storage_path).sort()
eq('kept and fresh photos are not due', await due(), [])
const photos = async (user) => (await rpc(user, `public.academic_list_ocr_photos()`)).photos
const kept = (await photos(A)).find((p) => p.job_id === job.job_id)
eq('the student sees a kept photo with no deletion date', [kept?.keep_photo, kept?.delete_after], [true, null])
eq("B's photo list has none of A's", (await photos(B)).some((p) => p.job_id === job.job_id), false)
await rpc(A, `public.academic_delete_ocr_image('${job.job_id}')`)
eq('a photo asked to be deleted leaves the list at once', (await photos(A)).some((p) => p.job_id === job.job_id), false)
eq('"Delete photo now" queues it even if kept', await due(), [`${A}/${job.job_id}.jpg`])
await ok(db, 'purged', `select public.academic_ocr_images_deleted(array['${A}/${job.job_id}.jpg'])`)
eq('deleted once purged', [await due(), (await rpc(A, `public.academic_get_ocr_job('${job.job_id}')`)).has_image], [[], false])
await ok(db, 'settled 31 days ago', `update academic_ocr_jobs set settled_at = now() - interval '31 days' where id = '${second.job_id}'`)
await ok(db, 'second fails to settle it', `select public.academic_ocr_fail('${second.job_id}', 'provider_error')`)
await ok(db, 'settled 31 days ago again', `update academic_ocr_jobs set settled_at = now() - interval '31 days' where id = '${second.job_id}'`)
eq('after 30 days unkept photos are due (OCR-011)', (await due()).includes(`${A}/${second.job_id}.jpg`), true)

// Withdrawing photo-processing consent deletes the student's photos.
const bJob = (await rpc(B, `public.academic_start_ocr_job('${b.enrolment_id}', '${FAR}')`)).job
await begin(bJob.job_id, B)
eq("B's photo is listed with a deletion date", (await photos(B)).find((p) => p.job_id === bJob.job_id)?.delete_after !== null, true)
await rpc(B, `public.academic_withdraw_consent('ocr_processing')`)
eq('withdrawn: the photo is queued for deletion and no longer listed', [(await due()).includes(`${B}/${bJob.job_id}.jpg`), (await photos(B)).length], [true, 0])
eq('withdrawn: no new scans', (await errorOf(B, `public.academic_start_ocr_job('${b.enrolment_id}', '${FAR}')`))?.code, 'CONSENT_REQUIRED')

// ─── Quality view (ADMIN-008) ────────────────────────────────────────────────

const ADM = '00000000-0000-0000-0000-0000000000ad'
await ok(db, 'admin', `insert into public.users (id, name, role) values ('${ADM}', 'Admin', 'ADMIN')`)
eq('students cannot read OCR quality', (await errorOf(A, `public.academic_admin_ocr_quality()`))?.code, 'FORBIDDEN_ROLE')
const quality = await rpc(ADM, `public.academic_admin_ocr_quality(30)`, { aal: 'aal2' })
eq('daily rows by model and prompt version', quality.daily.some((d) => d.model_id === 'qwen-vl-max' && d.prompt_version === 'ocr_extract.v1.0' && d.confirmed >= 1), true)
eq('reused duplicates are not counted as model calls', quality.daily.reduce((n, d) => n + d.jobs, 0), (await one(`select count(*)::int as n from academic_ocr_jobs where duplicate_of is null and status <> 'awaiting_upload'`)).n)
eq('corrections per subject', quality.subjects.map((s) => [s.subject_code, s.fields, s.edited, s.correction_rate]).sort(), [['MATH', 1, 0, 0], ['PHYS', 1, 1, 1]])
eq('7-day correction rate, no alert under 20 fields', [quality.last_7_days.fields, quality.last_7_days.correction_rate, quality.last_7_days.alerts], [2, 0.5, []])
await ok(db, 'lower the field minimum', `update academic_settings set value = value || '{"min_fields": 2}' where key = 'ocr_alerts'`)
eq('alert when corrections pass 15%', (await rpc(ADM, `public.academic_admin_ocr_quality(7)`, { aal: 'aal2' })).last_7_days.alerts, ['correction_rate'])
eq('the hourly purge is scheduled', (await one(`select schedule, command like '%"action":"purge"%' as purge from cron.job where jobname = 'academic-ocr-purge'`)), { schedule: '17 * * * *', purge: true })

await rpc(A, `public.academic_request_deletion('profile')`)
await ok(db, 'age request', `update academic_student_profiles set deletion_requested_at = now() - interval '15 days' where user_id = '${A}'`)
await ok(db, 'purge profile', `select public.academic_purge_due_deletions()`)
eq('profile deleted: jobs gone, their photos queued for storage removal', [(await one(`select count(*)::int as n from academic_ocr_jobs where student_profile_id = '${a.profile_id}'`)).n, (await due()).length >= 3], [0, true])
eq('OCR tables are hidden from users', (await errorOf(B, `(select count(*) from academic_ocr_jobs)`))?.status, '42501')

done()
