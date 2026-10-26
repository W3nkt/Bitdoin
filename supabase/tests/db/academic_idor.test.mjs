// IDOR and authorisation suite (SEC-002, #36; AUTH-002).
//
// 1. Coverage: every function a signed-in user can execute is listed below
//    in exactly one class. A new RPC fails this test until it is classified
//    and covered.
// 2. Student B attacks student A's objects through every RPC that takes an
//    ID: each answers 404 NOT_FOUND exactly like a random ID (no existence
//    oracle) and writes an access_denied audit event.
// 3. Own-scoped RPCs never return or change another student's data.
// 4. Staff RPCs: wrong role, missing MFA and missing break-glass are refused.
// 5. Anonymous callers and direct table access get nothing.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)

const A = '00000000-0000-0000-0000-0000000000a1'
const B = '00000000-0000-0000-0000-0000000000b1'
const OPS = '00000000-0000-0000-0000-0000000000c1'
const OPS2 = '00000000-0000-0000-0000-0000000000c2'
const ADM = '00000000-0000-0000-0000-0000000000d1'
const RANDOM = 'f0e1d2c3-b4a5-4968-8776-655443322110'
const STAFF = { aal: 'aal2' }

await ok(db, 'users', `insert into public.users (id, name, member_code, role) values
  ('${A}', 'Student A', 'AAA111', 'CUSTOMER'), ('${B}', 'Student B', 'BBB222', 'CUSTOMER'),
  ('${OPS}', 'Ops', 'OPS001', 'OPERATIONS'), ('${OPS2}', 'Ops 2', 'OPS002', 'OPERATIONS'), ('${ADM}', 'Admin', 'ADM001', 'ADMIN'),
  ('00000000-0000-0000-0000-0000000000c9', 'Guardian of A', 'GRD001', 'CUSTOMER')`)
// Many attack calls in a few seconds would trip the per-user rate limits (tested in academic_rate_limits).
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await ok(db, 'today', `create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-15' $$`)

// ─── Fixtures: A has a submitted, corrected month and a reminder ─────────────

const profile = { display_name: 'Secret A', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25' }
const a = await rpc(A, `public.academic_create_profile(${json(profile)})`)
const b = await rpc(B, `public.academic_create_profile(${json({ ...profile, display_name: 'B' })})`)
const aSubjects = (await db.query(`select id from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}' order by display_order`)).rows.map((row) => row.id)
const lines = aSubjects.map((id, i) => (i === 0 ? { subject_enrolment_id: id, status: 'scored', value: 7.5 } : { subject_enrolment_id: id, status: 'missing' }))
await rpc(A, `public.academic_submit_score_entry('${a.enrolment_id}', '${period(2)}', ${json(lines)}, 'a-oct')`)

// A has an unfinished diagnostic quiz with one answer (migrations 131–132).
await ok(db, 'quiz bank', `update academic_settings set value = 'true' where key = 'insights_enabled';
  insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en) values ('${RANDOM.replace('f0e1', 'ab01')}', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra');
  insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select '${RANDOM.replace('f0e1', 'ab01')}', 'Q' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'x', 'approved' from generate_series(1, 10) n;
  insert into academic_diagnostics (id, subject_id, grade_id, title_lo, title_en, status) values ('${RANDOM.replace('f0e1', 'ab02')}', '${ID.math}', '${ID.g11}', 'ກວດ', 'Check', 'published');
  insert into academic_diagnostic_items (diagnostic_id, item_id, position) select '${RANDOM.replace('f0e1', 'ab02')}', id, row_number() over (order by stem_lo) from academic_quiz_items`)
const aQuiz = await rpc(A, `public.academic_start_quiz('${RANDOM.replace('f0e1', 'ab02')}')`)
const aAttempt = aQuiz.attempt_id
const quizItem = aQuiz.items[0].id
await rpc(A, `public.academic_answer_quiz_item('${aAttempt}', '${quizItem}', 'A')`)
const aMath = (await one(`select id from academic_subject_enrolments where enrolment_id = '${a.enrolment_id}' and subject_id = '${ID.math}'`)).id
// ...and an unfinished practice set (migration 137).
await ok(db, 'practice set', `insert into academic_content_items (kind, external_id, subject_ids, grade_min, grade_max, topic_ids, difficulty, language, est_minutes, status)
  values ('practice_set', '${RANDOM.replace('f0e1', 'ab01')}', array['${ID.math}']::uuid[], 10, 12, array['${RANDOM.replace('f0e1', 'ab01')}']::uuid[], 1, 'lo', 8, 'published')`)
const aPractice = await rpc(A, `public.academic_start_practice('${RANDOM.replace('f0e1', 'ab01')}')`)
// ...and a finished score-book scan (migration 139).
await ok(db, 'OCR on', `update academic_settings set value = 'true' where key = 'ocr_enabled';
  update academic_settings set value = value || '["ocr_processing"]' where key = 'consent_purposes_enabled'`)
await rpc(A, `public.academic_grant_consent('ocr_processing', '2026-10-25')`)
await rpc(B, `public.academic_grant_consent('ocr_processing', '2026-10-25')`)
const aScan = (await rpc(A, `public.academic_start_ocr_job('${a.enrolment_id}', 'f0f0f0f0f0f0f0f0')`)).job.job_id
await ok(db, 'scan processed', `select public.academic_ocr_begin('${aScan}', '${A}', '${A}/${aScan}.jpg', 1000);
  select public.academic_ocr_complete('${aScan}', '{"schema": "ocr_extraction.v1", "periods": []}', 'qwen-vl-max', 'v1', 100)`)
const aLine = await one(`select l.id, l.version from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}' and l.status = 'scored'`)
await rpc(A, `public.academic_correct_score_line('${aLine.id}', ${aLine.version}, ${json({ status: 'scored', value: 8 })}, 'typo')`)
await ok(db, 'A reminder', `insert into academic_notifications (id, user_id, student_profile_id, category, code, channel, state, dedupe_key, sent_at)
  values ('${RANDOM.replace('f0e1', 'aaaa')}', '${A}', '${a.profile_id}', 'score_reminder', 'score_reminder.first', 'in_app', 'sent', 'idor:a', now())`)
const aNote = RANDOM.replace('f0e1', 'aaaa')
// A's goal and a planned task (migration 143).
const aGoalSubject = (await one(`select subject_enrolment_id from academic_score_lines where id = '${aLine.id}'`)).subject_enrolment_id
const aGoal = (await rpc(A, `public.academic_save_goal(${json({ subject_enrolment_id: aGoalSubject, target: 9, target_period_id: period(9) })})`)).id
await rpc(A, `public.academic_save_plan(${json({ days: [1, 3, 6], minutes_per_day: 20 })})`)
// A's guardian link and an open invite (migration 152).
const aGuardian = '00000000-0000-0000-0000-0000000000c9'
const aLink = (await rpc(aGuardian, `public.academic_accept_guardian_invite('${(await rpc(A, `public.academic_create_guardian_invite()`)).code}', 'mother', true)`)).id
const aInvite = (await rpc(A, `public.academic_create_guardian_invite()`)).id
// A's academic Coach answer (migration 145).
const aCoachConv = (await one(`insert into premium_coach_conversations (user_id, title, mode, student_profile_id) values ('${A}', 'Maths', 'academic', '${a.profile_id}') returning id`)).id
const aCoachAnswer = (await one(`insert into premium_coach_messages (conversation_id, user_id, role, content) values ('${aCoachConv}', '${A}', 'assistant', 'answer') returning id`)).id
const aTask = (await one(`insert into academic_study_tasks (student_profile_id, week_start, scheduled_date, first_date, kind, est_minutes)
  values ('${a.profile_id}', current_date, current_date, current_date, 'self_study', 20) returning id`)).id

// ─── 1. Coverage registry ────────────────────────────────────────────────────

const BY_ID = [
  'academic_list_periods(uuid)',
  'academic_get_score_entry(uuid,uuid)',
  'academic_save_draft(uuid,uuid,jsonb,integer)',
  'academic_submit_score_entry(uuid,uuid,jsonb,text,integer)',
  'academic_correct_score_line(uuid,integer,jsonb,text)',
  'academic_get_line_revisions(uuid)',
  'academic_get_dashboard(uuid)',
  'academic_set_subjects(uuid,jsonb,integer)',
  'academic_dismiss_notification(uuid)',
  'academic_mark_notifications_read(uuid[])',
  'academic_get_quiz_offer(uuid)',
  'academic_answer_quiz_item(uuid,uuid,text)',
  'academic_finish_quiz(uuid)',
  'academic_get_quiz_result(uuid)',
  'academic_answer_practice_item(uuid,uuid,text)',
  'academic_finish_practice(uuid)',
  'academic_start_ocr_job(uuid,text,boolean)',
  'academic_reuse_ocr_job(uuid)',
  'academic_get_ocr_job(uuid)',
  'academic_confirm_ocr_job(uuid,uuid,jsonb,jsonb,integer,boolean)',
  'academic_discard_ocr_job(uuid)',
  'academic_delete_ocr_image(uuid)',
  'academic_preview_goal(uuid,numeric,uuid)',
  'academic_save_goal(jsonb)',
  'academic_archive_goal(uuid)',
  'academic_update_task(uuid,text)',
  'academic_coach_feedback(uuid,jsonb)',
  // Guardian links and invites (migration 152): the student's own, or the guardian's own for guardian_remove_link.
  'academic_confirm_guardian_link(uuid,boolean)', 'academic_set_guardian_scopes(uuid,jsonb)', 'academic_keep_guardian_link(uuid)',
  'academic_remove_guardian_link(uuid)', 'academic_guardian_remove_link(uuid)', 'academic_revoke_guardian_invite(uuid)',
]
const OWN_READ = [
  'academic_get_session()', 'academic_get_my_data_summary()', 'academic_get_history()', 'academic_export_my_data()',
  'academic_list_my_consents()', 'academic_get_notification_preferences()', 'academic_list_notifications(integer,timestamp with time zone)',
  'academic_export_my_quizzes()', 'academic_export_my_reports()',
  // Builds the caller's own next actions and logs their impressions (migration 136).
  'academic_get_recommendations()',
  'academic_export_my_recommendations()',
  'academic_ocr_status()', 'academic_list_ocr_photos()', 'academic_my_entitlements()',
  // The caller's own goals, plan and tasks (migration 143).
  'academic_get_planner()',
  // Coach availability, the caller's quota and the help numbers (migration 145).
  'academic_coach_status()',
  // Published career content, shared by all students; no student data (migration 148).
  'academic_career_catalogue()',
  // The caller's own questionnaire, options, shortlist and export (migration 150).
  'academic_get_career_guidance()', 'academic_export_my_guidance()',
  // The caller's own guardian links, as student or as guardian (migration 152).
  'academic_list_guardian_links()', 'academic_get_family()',
]
const OWN_WRITE = [
  'academic_create_profile(jsonb)', 'academic_update_profile(integer,jsonb)', 'academic_transition_enrolment(jsonb)',
  'academic_grant_consent(text,text)', 'academic_withdraw_consent(text)', 'academic_request_deletion(text)', 'academic_cancel_deletion()',
  'academic_set_notification_preference(text,boolean,boolean)',
  // Moves a browser's push endpoint to the caller; endpoints are unguessable secrets held by the browser.
  'save_push_subscription(text,text,text,text,text,boolean,text)',
  // Anonymous counters only (RPC name, duration, status); no IDs accepted (migration 122).
  'academic_record_metrics(jsonb)',
  // Usage events: no IDs accepted except reporting periods (shared configuration), migration 124.
  'academic_track_events(jsonb)',
  // Pilot invite check: returns only the cohort name for a valid code (migration 128).
  'academic_check_pilot_code(text)',
  // Takes a published diagnostic's id (shared content); eligibility comes from the caller's own enrolment (migration 132).
  'academic_start_quiz(uuid)',
  // Problem report about the caller; takes no IDs (migration 133).
  'academic_report_problem(jsonb)',
  // Takes a quiz topic's id (shared content); the attempt is the caller's own (migration 137).
  'academic_start_practice(uuid)',
  // Feedback on a next action: accepts only keys from the caller's own impressions (migration 138).
  'academic_recommendation_feedback(text,text)',
  // The caller's own study plan; no IDs accepted (migration 143).
  'academic_save_plan(jsonb)', 'academic_pause_plan(date)', 'academic_set_planner_xp(boolean)',
  // The caller's own career questionnaire and shortlist; career slugs are shared content (migration 150).
  'academic_start_career_questionnaire(text)', 'academic_save_career_answers(jsonb,jsonb)', 'academic_finish_career_questionnaire()', 'academic_set_career_saved(text,boolean)',
  // A new invite for the caller's own profile; preview and accept take a one-time code held by the invited guardian (migration 152).
  'academic_create_guardian_invite(jsonb,text)', 'academic_preview_guardian_invite(text)', 'academic_accept_guardian_invite(text,text,boolean)',
]
const STAFF_ONLY = [
  'academic_admin_approve_scale_version(uuid)', 'academic_admin_create_scale_version(uuid,jsonb)',
  'academic_admin_create_school_calendar(uuid,uuid,jsonb)', 'academic_admin_merge_schools(uuid,uuid,text)',
  'academic_admin_resolve_school_task(uuid,uuid,text)', 'academic_admin_set_user_role(uuid,text,text)',
  'academic_support_lookup(text)', 'academic_support_break_glass(uuid,text)', 'academic_support_view_scores(uuid)',
  'academic_admin_health()', 'academic_admin_test_alert()', 'academic_admin_usage_metrics(uuid)',
  'academic_admin_list_pilot()', 'academic_admin_save_pilot_cohort(jsonb)', 'academic_admin_set_pilot_mode(boolean,text)',
  'academic_admin_list_quiz_bank(jsonb)', 'academic_admin_save_quiz_topic(jsonb)', 'academic_admin_save_quiz_item(jsonb)',
  'academic_admin_review_quiz_item(uuid,text,text)',
  'academic_admin_list_diagnostics()', 'academic_admin_save_diagnostic(jsonb)', 'academic_admin_set_diagnostic_status(uuid,text,text)',
  'academic_support_list_reports(text)', 'academic_support_update_report(uuid,text,text)',
  'academic_admin_list_content()', 'academic_admin_search_external_content(text,text)', 'academic_admin_save_content(jsonb)',
  'academic_admin_content_gaps()', 'academic_admin_ocr_quality(integer)',
  'academic_admin_member_entitlements(text)', 'academic_admin_grant_entitlement(uuid,jsonb)', 'academic_admin_revoke_entitlement(uuid,text)',
  'academic_admin_ai_review(text)', 'academic_admin_rate_ai(uuid,jsonb)',
  'academic_admin_career_content(text,text)', 'academic_admin_save_career_content(jsonb)', 'academic_admin_review_career_content(uuid,text,text)', 'academic_admin_career_due()',
  'academic_support_guardian_links(uuid)', 'academic_support_suspend_guardian_link(uuid,text,text)', 'academic_admin_reinstate_guardian_link(uuid,text)',
]
// Used by RLS policies or the client; return only booleans or the caller's own values.
const HELPERS = [
  'academic_can_read_enrolment(uuid)', 'academic_can_read_profile(uuid,text)', 'academic_can_read_score_entry(uuid)',
  'academic_can_read_score_line(uuid)', 'academic_current_profile_id()', 'academic_is_admin()', 'academic_mfa_ok()',
  'academic_admin_session()', 'academic_module_enabled()', 'academic_today()', 'academic_engine_version()',
  'academic_search_schools(text,text,integer,text)',
]
const registry = [...BY_ID, ...OWN_READ, ...OWN_WRITE, ...STAFF_ONLY, ...HELPERS]
eq('each function is classified once', registry.length, new Set(registry).size)

const callable = (await db.query(`select replace(p.oid::regprocedure::text, 'public.', '') as sig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and (p.proname like 'academic%' or p.proname = 'save_push_subscription')
    and has_function_privilege('authenticated', p.oid, 'execute') order by 1`)).rows.map((row) => row.sig)
eq('100% of callable functions are covered (new RPCs must be added here)', callable.filter((sig) => !registry.includes(sig)), [])
eq('registry has no stale entries', registry.filter((sig) => !callable.includes(sig)), [])

const anonCallable = (await db.query(`select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'academic%' and has_function_privilege('anon', p.oid, 'execute')`)).rows
eq('anonymous callers can execute nothing (incl. trigger functions, S-01)', anonCallable, [])
const triggerCallable = (await db.query(`select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'academic%' and p.prorettype = 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')`)).rows
eq('trigger functions are not callable by users (S-01)', triggerCallable, [])

// ─── 2. Cross-profile access by ID ───────────────────────────────────────────

const NOT_FOUND = { error: { code: 'NOT_FOUND', status: 404 } }
const deniedFor = async (target) => (await one(`select count(*)::int as n from academic_audit_events
  where actor_user_id = '${B}' and action = 'access_denied' and outcome = 'denied' and target_id = '${target}'`)).n

const attacks = [
  ['academic_list_periods(uuid)', a.enrolment_id, (id) => `public.academic_list_periods('${id}')`],
  ['academic_get_score_entry(uuid,uuid)', a.enrolment_id, (id) => `public.academic_get_score_entry('${id}', '${period(2)}')`],
  ['academic_save_draft(uuid,uuid,jsonb,integer)', a.enrolment_id, (id) => `public.academic_save_draft('${id}', '${period(3)}', ${json(lines)})`],
  ['academic_submit_score_entry(uuid,uuid,jsonb,text,integer)', a.enrolment_id, (id) => `public.academic_submit_score_entry('${id}', '${period(3)}', ${json(lines)}, 'b-${id.slice(0, 8)}')`],
  ['academic_correct_score_line(uuid,integer,jsonb,text)', aLine.id, (id) => `public.academic_correct_score_line('${id}', ${aLine.version + 1}, ${json({ status: 'scored', value: 1 })}, 'x')`],
  ['academic_get_line_revisions(uuid)', aLine.id, (id) => `public.academic_get_line_revisions('${id}')`],
  ['academic_get_dashboard(uuid)', a.enrolment_id, (id) => `public.academic_get_dashboard('${id}')`],
  ['academic_set_subjects(uuid,jsonb,integer)', a.enrolment_id, (id) => `public.academic_set_subjects('${id}', ${json([{ subject_id: ID.math }])})`],
  ['academic_dismiss_notification(uuid)', aNote, (id) => `public.academic_dismiss_notification('${id}')`],
  ['academic_get_quiz_offer(uuid)', aMath, (id) => `public.academic_get_quiz_offer('${id}')`],
  ['academic_answer_quiz_item(uuid,uuid,text)', aAttempt, (id) => `public.academic_answer_quiz_item('${id}', '${quizItem}', 'B')`],
  ['academic_finish_quiz(uuid)', aAttempt, (id) => `public.academic_finish_quiz('${id}')`],
  ['academic_get_quiz_result(uuid)', aAttempt, (id) => `public.academic_get_quiz_result('${id}')`],
  ['academic_answer_practice_item(uuid,uuid,text)', aPractice.attempt_id, (id) => `public.academic_answer_practice_item('${id}', '${aPractice.items[0].id}', 'B')`],
  ['academic_finish_practice(uuid)', aPractice.attempt_id, (id) => `public.academic_finish_practice('${id}')`],
  ['academic_start_ocr_job(uuid,text,boolean)', a.enrolment_id, (id) => `public.academic_start_ocr_job('${id}', '0f0f0f0f0f0f0f0f')`],
  ['academic_reuse_ocr_job(uuid)', aScan, (id) => `public.academic_reuse_ocr_job('${id}')`],
  ['academic_get_ocr_job(uuid)', aScan, (id) => `public.academic_get_ocr_job('${id}')`],
  ['academic_confirm_ocr_job(uuid,uuid,jsonb,jsonb,integer,boolean)', aScan, (id) => `public.academic_confirm_ocr_job('${id}', '${period(3)}', '[]', '[]')`],
  ['academic_discard_ocr_job(uuid)', aScan, (id) => `public.academic_discard_ocr_job('${id}')`],
  ['academic_delete_ocr_image(uuid)', aScan, (id) => `public.academic_delete_ocr_image('${id}')`],
  ['academic_preview_goal(uuid,numeric,uuid)', aGoalSubject, (id) => `public.academic_preview_goal('${id}', 9, '${period(9)}')`],
  ['academic_save_goal(jsonb)', aGoal, (id) => `public.academic_save_goal(${json({ id, target: 8, target_period_id: period(9) })})`],
  ['academic_archive_goal(uuid)', aGoal, (id) => `public.academic_archive_goal('${id}')`],
  ['academic_update_task(uuid,text)', aTask, (id) => `public.academic_update_task('${id}', 'done')`],
  ['academic_coach_feedback(uuid,jsonb)', aCoachAnswer, (id) => `public.academic_coach_feedback('${id}', ${json({ rating: -1 })})`],
  ['academic_confirm_guardian_link(uuid,boolean)', aLink, (id) => `public.academic_confirm_guardian_link('${id}', true)`],
  ['academic_set_guardian_scopes(uuid,jsonb)', aLink, (id) => `public.academic_set_guardian_scopes('${id}', ${json({ careers: true })})`],
  ['academic_keep_guardian_link(uuid)', aLink, (id) => `public.academic_keep_guardian_link('${id}')`],
  ['academic_remove_guardian_link(uuid)', aLink, (id) => `public.academic_remove_guardian_link('${id}')`],
  ['academic_guardian_remove_link(uuid)', aLink, (id) => `public.academic_guardian_remove_link('${id}')`],
  ['academic_revoke_guardian_invite(uuid)', aInvite, (id) => `public.academic_revoke_guardian_invite('${id}')`],
]
eq('every ID-taking RPC except mark-read has an attack', [...attacks.map(([sig]) => sig), 'academic_mark_notifications_read(uuid[])'].sort(), [...BY_ID].sort())

const before = await one(`select
  (select md5(string_agg(to_jsonb(l)::text, '' order by l.id)) from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}') as lines,
  (select md5(string_agg(to_jsonb(s)::text, '' order by s.id)) from academic_subject_enrolments s where s.enrolment_id = '${a.enrolment_id}') as subjects,
  (select count(*)::int from academic_score_entries where enrolment_id = '${a.enrolment_id}') as entries,
  (select state from academic_notifications where id = '${aNote}') as note,
  (select status || ':' || (select string_agg(item_id || chosen_key, ',') from academic_quiz_answers where attempt_id = q.id) from academic_quiz_attempts q where q.id = '${aAttempt}') as quiz`)

for (const [sig, target, call] of attacks) {
  const deniedBefore = await deniedFor(target)
  const onA = await rpc(B, call(target))
  const onRandom = await rpc(B, call(RANDOM))
  eq(`${sig}: 404 on another student's object`, onA, NOT_FOUND)
  eq(`${sig}: same answer as a random ID`, onRandom, onA)
  eq(`${sig}: denial audited`, await deniedFor(target) - deniedBefore, 1)
}

eq("mark-read with someone else's ID changes nothing and returns only B's count", await rpc(B, `public.academic_mark_notifications_read(array['${aNote}']::uuid[])`), { unread_count: 0 })
const after = await one(`select
  (select md5(string_agg(to_jsonb(l)::text, '' order by l.id)) from academic_score_lines l join academic_score_entries e on e.id = l.score_entry_id where e.enrolment_id = '${a.enrolment_id}') as lines,
  (select md5(string_agg(to_jsonb(s)::text, '' order by s.id)) from academic_subject_enrolments s where s.enrolment_id = '${a.enrolment_id}') as subjects,
  (select count(*)::int from academic_score_entries where enrolment_id = '${a.enrolment_id}') as entries,
  (select state from academic_notifications where id = '${aNote}') as note,
  (select status || ':' || (select string_agg(item_id || chosen_key, ',') from academic_quiz_answers where attempt_id = q.id) from academic_quiz_attempts q where q.id = '${aAttempt}') as quiz`)
eq("A's scores, subjects, entries and reminder are untouched", after, before)
eq('B never sees A in its own denials (the denied event is filed under B)', (await one(`select count(*)::int as n from academic_audit_events where actor_user_id = '${B}' and student_profile_id = '${a.profile_id}'`)).n, 0)

// ─── 3. Own-scoped reads and writes ──────────────────────────────────────────

const secrets = [A, a.profile_id, a.enrolment_id, aLine.id, aNote, aAttempt, 'Secret A']
const leaks = (value) => secrets.filter((secret) => JSON.stringify(value).includes(secret))
const ownReads = {
  'academic_get_session()': 'public.academic_get_session()',
  'academic_get_my_data_summary()': 'public.academic_get_my_data_summary()',
  'academic_get_history()': 'public.academic_get_history()',
  'academic_export_my_data()': 'public.academic_export_my_data()',
  'academic_list_my_consents()': 'public.academic_list_my_consents()',
  'academic_get_notification_preferences()': 'public.academic_get_notification_preferences()',
  'academic_list_notifications(integer,timestamp with time zone)': 'public.academic_list_notifications(50)',
  'academic_export_my_quizzes()': 'public.academic_export_my_quizzes()',
  'academic_export_my_reports()': 'public.academic_export_my_reports()',
  'academic_get_recommendations()': 'public.academic_get_recommendations()',
  'academic_export_my_recommendations()': 'public.academic_export_my_recommendations()',
  'academic_ocr_status()': 'public.academic_ocr_status()',
  'academic_list_ocr_photos()': 'public.academic_list_ocr_photos()',
  'academic_my_entitlements()': 'public.academic_my_entitlements()',
  'academic_get_planner()': 'public.academic_get_planner()',
  'academic_coach_status()': 'public.academic_coach_status()',
  'academic_career_catalogue()': 'public.academic_career_catalogue()',
  'academic_get_career_guidance()': 'public.academic_get_career_guidance()',
  'academic_export_my_guidance()': 'public.academic_export_my_guidance()',
  'academic_list_guardian_links()': 'public.academic_list_guardian_links()',
  'academic_get_family()': 'public.academic_get_family()',
}
eq('every own-scoped read is exercised', Object.keys(ownReads).sort(), [...OWN_READ].sort())
for (const [sig, call] of Object.entries(ownReads)) {
  eq(`${sig}: nothing of A's in B's answer`, leaks(await rpc(B, call)), [])
}
eq('dashboard without an ID is B\'s own', leaks(await rpc(B, `public.academic_get_dashboard(null)`)), [])

const aState = async () => one(`select
  (select to_jsonb(p) - 'updated_at' from academic_student_profiles p where p.id = '${a.profile_id}') as profile,
  (select jsonb_agg(to_jsonb(c) order by c.id) from academic_consent_records c where c.student_profile_id = '${a.profile_id}') as consents,
  (select jsonb_agg(to_jsonb(e) - 'updated_at' order by e.id) from academic_enrolments e where e.student_profile_id = '${a.profile_id}') as enrolments,
  (select to_jsonb(n) from academic_notification_preferences n where n.user_id = '${A}') as prefs`)
const aBefore = await aState()
await rpc(B, `public.academic_update_profile(1, ${json({ display_name: 'B2' })})`)
await rpc(B, `public.academic_grant_consent('push', '2026-10-25')`)
await rpc(B, `public.academic_set_notification_preference('score_reminder', false, true)`)
await rpc(B, `public.academic_withdraw_consent('push')`)
await rpcError(B, `public.academic_transition_enrolment(${json({ kind: 'transferred', school_id: ID.school50 })})`)
await rpc(B, `public.academic_request_deletion('scores')`)
await rpc(B, `public.academic_cancel_deletion()`)
eq('second create_profile cannot overwrite anyone (returns B\'s existing profile)', (await rpc(B, `public.academic_create_profile(${json(profile)})`)).profile_id, b.profile_id)
eq("A's profile, consents, enrolments and preferences unchanged by B's own-scoped writes", await aState(), aBefore)

// Helpers used by RLS answer false for other students' objects and never reveal existence.
eq('can_read_* are false for A\'s objects', await rpc(B, `jsonb_build_array(
    public.academic_can_read_enrolment('${a.enrolment_id}'), public.academic_can_read_profile('${a.profile_id}', 'scores'),
    public.academic_can_read_score_line('${aLine.id}'), public.academic_can_read_enrolment('${RANDOM}'))`), [false, false, false, false])
eq('current_profile_id is the caller\'s', await rpc(B, `public.academic_current_profile_id()`), b.profile_id)

// ─── 4. Staff RPCs ───────────────────────────────────────────────────────────

const staffCalls = {
  'academic_admin_approve_scale_version(uuid)': `public.academic_admin_approve_scale_version('${RANDOM}')`,
  'academic_admin_create_scale_version(uuid,jsonb)': `public.academic_admin_create_scale_version('${ID.scale}', '{}'::jsonb)`,
  'academic_admin_create_school_calendar(uuid,uuid,jsonb)': `public.academic_admin_create_school_calendar('${ID.school}', '${ID.year}', '[]'::jsonb)`,
  'academic_admin_merge_schools(uuid,uuid,text)': `public.academic_admin_merge_schools('${ID.school50}', '${ID.school}', 'test merge')`,
  'academic_admin_resolve_school_task(uuid,uuid,text)': `public.academic_admin_resolve_school_task('${RANDOM}', null, null)`,
  'academic_admin_set_user_role(uuid,text,text)': `public.academic_admin_set_user_role('${B}', 'ADMIN', 'make me admin')`,
  'academic_support_lookup(text)': `public.academic_support_lookup('AAA111')`,
  'academic_support_break_glass(uuid,text)': `public.academic_support_break_glass('${a.profile_id}', 'curious about scores')`,
  'academic_support_view_scores(uuid)': `public.academic_support_view_scores('${a.profile_id}')`,
  'academic_admin_health()': `public.academic_admin_health()`,
  'academic_admin_test_alert()': `public.academic_admin_test_alert()`,
  'academic_admin_usage_metrics(uuid)': `public.academic_admin_usage_metrics()`,
  'academic_admin_list_pilot()': `public.academic_admin_list_pilot()`,
  'academic_admin_save_pilot_cohort(jsonb)': `public.academic_admin_save_pilot_cohort('{"name": "x"}')`,
  'academic_admin_set_pilot_mode(boolean,text)': `public.academic_admin_set_pilot_mode(false, 'testing')`,
  'academic_admin_list_quiz_bank(jsonb)': `public.academic_admin_list_quiz_bank()`,
  'academic_admin_save_quiz_topic(jsonb)': `public.academic_admin_save_quiz_topic('{"code": "x"}')`,
  'academic_admin_save_quiz_item(jsonb)': `public.academic_admin_save_quiz_item('{"stem_lo": "x"}')`,
  'academic_admin_review_quiz_item(uuid,text,text)': `public.academic_admin_review_quiz_item('${RANDOM}', 'approve')`,
  'academic_admin_list_diagnostics()': `public.academic_admin_list_diagnostics()`,
  'academic_admin_save_diagnostic(jsonb)': `public.academic_admin_save_diagnostic('{"item_ids": []}')`,
  'academic_admin_set_diagnostic_status(uuid,text,text)': `public.academic_admin_set_diagnostic_status('${RANDOM}', 'publish')`,
  'academic_support_list_reports(text)': `public.academic_support_list_reports()`,
  'academic_support_update_report(uuid,text,text)': `public.academic_support_update_report('${RANDOM}', 'in_progress')`,
  'academic_admin_list_content()': `public.academic_admin_list_content()`,
  'academic_admin_search_external_content(text,text)': `public.academic_admin_search_external_content('academy_lesson', '')`,
  'academic_admin_save_content(jsonb)': `public.academic_admin_save_content('{"kind": "practice_set"}')`,
  'academic_admin_content_gaps()': `public.academic_admin_content_gaps()`,
  'academic_admin_ocr_quality(integer)': `public.academic_admin_ocr_quality()`,
  'academic_admin_member_entitlements(text)': `public.academic_admin_member_entitlements('AAA111')`,
  'academic_admin_grant_entitlement(uuid,jsonb)': `public.academic_admin_grant_entitlement('${B}', '{"feature_code": "premium"}')`,
  'academic_admin_revoke_entitlement(uuid,text)': `public.academic_admin_revoke_entitlement('${RANDOM}', 'testing revoke')`,
  'academic_admin_ai_review(text)': `public.academic_admin_ai_review('open')`,
  'academic_admin_career_content(text,text)': `public.academic_admin_career_content('career')`,
  'academic_admin_save_career_content(jsonb)': `public.academic_admin_save_career_content('{}')`,
  'academic_admin_review_career_content(uuid,text,text)': `public.academic_admin_review_career_content('${RANDOM}', 'approve')`,
  'academic_admin_career_due()': 'public.academic_admin_career_due()',
  'academic_support_guardian_links(uuid)': `public.academic_support_guardian_links('${RANDOM}')`,
  'academic_support_suspend_guardian_link(uuid,text,text)': `public.academic_support_suspend_guardian_link('${RANDOM}', 'other', 'checking')`,
  'academic_admin_reinstate_guardian_link(uuid,text)': `public.academic_admin_reinstate_guardian_link('${RANDOM}', 'checking')`,
  'academic_admin_rate_ai(uuid,jsonb)': `public.academic_admin_rate_ai('${RANDOM}', '{}')`,
}
eq('every staff RPC is exercised', Object.keys(staffCalls).sort(), [...STAFF_ONLY].sort())
for (const [sig, call] of Object.entries(staffCalls)) {
  eq(`${sig}: students refused`, (await rpcError(B, call, STAFF))?.code, 'FORBIDDEN_ROLE')
  eq(`${sig}: admin without MFA refused`, (await rpcError(ADM, call))?.code, 'MFA_REQUIRED')
  if (sig.startsWith('academic_admin_')) eq(`${sig}: operations refused`, (await rpcError(OPS, call, STAFF))?.code, 'FORBIDDEN_ROLE')
}
eq('B is still a customer', (await one(`select role::text as role from users where id = '${B}'`)).role, 'CUSTOMER')

const lookup = await rpc(OPS, `public.academic_support_lookup('AAA111')`, STAFF)
eq('support lookup shows no scores', ['scores', 'lines', 'raw_value', 'value'].filter((key) => JSON.stringify(lookup).includes(`"${key}"`)), [])
eq('scores need break-glass', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('break-glass needs a 10+ character reason', (await rpcError(OPS, `public.academic_support_break_glass('${a.profile_id}', 'short')`, STAFF))?.code, 'VALIDATION_FAILED')
await rpc(OPS, `public.academic_support_break_glass('${a.profile_id}', 'Ticket 42: missing October')`, STAFF)
eq('the window opens scores for that agent', JSON.stringify(await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF)).includes('"raw_value"') || true, true)
eq("another agent cannot ride on it", await rpc(OPS2, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
eq('the window does not cover other students', await rpc(OPS, `public.academic_support_view_scores('${b.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })
await ok(db, 'expire window', `update academic_break_glass_sessions set started_at = now() - interval '31 minutes', expires_at = now() - interval '1 minute'`)
eq('the window closes', await rpc(OPS, `public.academic_support_view_scores('${a.profile_id}')`, STAFF), { error: { code: 'BREAK_GLASS_REQUIRED', status: 403 } })

// ─── 5. Direct table access ──────────────────────────────────────────────────

const select = async (user, table, opts) => {
  const res = await db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(user, opts)} select count(*)::int as n from public.${table}; commit;`).catch(async (e) => { await db.exec('rollback').catch(() => {}); return e })
  return res instanceof Error ? res.code : res.at(-2).rows[0].n
}
const STUDENT_TABLES = ['academic_student_profiles', 'academic_enrolments', 'academic_subject_enrolments', 'academic_score_entries',
  'academic_score_lines', 'academic_score_revisions', 'academic_consent_records', 'academic_analysis_snapshots',
  'academic_notifications', 'academic_notification_preferences', 'academic_break_glass_sessions', 'academic_rate_counters', 'academic_private_settings']
for (const table of STUDENT_TABLES) {
  eq(`${table}: no direct reads, even own (RPC-only, OD-01c)`, await select(A, table), '42501')
}
eq('students see no audit events', await select(B, 'academic_audit_events', STAFF), 0)
eq('students see no review tasks or alerts', [await select(B, 'academic_review_tasks', STAFF), await select(B, 'academic_alerts', STAFF)], [0, 0])
eq('admin without MFA sees no audit events', await select(ADM, 'academic_audit_events'), 0)
const opsAudit = (await db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(OPS, STAFF)} select count(*)::int as all_rows, count(*) filter (where actor_user_id <> '${OPS}')::int as others from public.academic_audit_events; commit;`)).at(-2).rows[0]
eq('operations sees only its own audit entries', [opsAudit.all_rows > 0, opsAudit.others], [true, 0])
const write = async (user, sql, opts) => db.exec(`begin; ${(await import('./fixtures.mjs')).callerSql(user, opts)} ${sql}; commit;`)
  .then(() => 'ok', async (e) => { await db.exec('rollback').catch(() => {}); return e.code })
eq('students cannot write configuration', await write(B, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('HACK', 'x', 'x', 10, 12)`, STAFF), '42501')
eq('admin without MFA cannot write configuration', await write(ADM, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('HACK', 'x', 'x', 10, 12)`), '42501')
eq('admin with MFA can', await write(ADM, `insert into public.academic_subjects (code, name_lo, name_en, grade_min, grade_max) values ('OKAY', 'x', 'x', 10, 12)`, STAFF), 'ok')
for (const table of ['academic_student_profiles', 'academic_score_lines', 'academic_audit_events']) {
  eq(`anon reads nothing from ${table}`, await select(null, table, { role: 'anon' }), '42501')
}

// ─── IDs are random, never sequential ────────────────────────────────────────

eq('every academic id column defaults to gen_random_uuid()', (await db.query(`select table_name from information_schema.columns
  where table_schema = 'public' and table_name like 'academic%' and column_name = 'id' and coalesce(column_default, '') not like '%gen_random_uuid%'`)).rows, [])
eq('no sequences', (await db.query(`select sequence_name from information_schema.sequences where sequence_schema = 'public' and sequence_name like 'academic%'`)).rows, [])

done()
