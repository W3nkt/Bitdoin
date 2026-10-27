// Diagnostic item bank (P2-ANL #49: ADMIN-007, QUIZ-005): admin-only topics
// and items, draft -> in_review -> approved -> retired, approval by an admin who
// neither wrote nor last edited the version, versioning of approved items,
// immutability, the leaked/official-exam guard, and the servable gate.
import { createDb, ok, fails, eq, done, readMigration, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [ADM, ADM2, ADM3] = ['d1', 'd2', 'd3'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STUDENT = '00000000-0000-0000-0000-0000000000a1'
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${ADM}', 'Admin One', 'ADMIN'), ('${ADM2}', 'Admin Two', 'ADMIN'), ('${ADM3}', 'Admin Three', 'ADMIN'), ('${STUDENT}', 'Noy', 'CUSTOMER')`)
await ok(db, 'config', CONFIG_SQL)

const as = (user) => (call) => rpc(user, call, STAFF)
const errorOf = async (user, call, opts = STAFF) => await rpcError(user, call, opts)
const [a1, a2, a3] = [as(ADM), as(ADM2), as(ADM3)]
const servable = async (id) => (await one(`select public.academic_quiz_item_servable('${id}') as ok`)).ok

// ─── Access ──────────────────────────────────────────────────────────────────

eq('students cannot open the bank', (await errorOf(STUDENT, `public.academic_admin_list_quiz_bank()`))?.code, 'FORBIDDEN_ROLE')
eq('admins need MFA', (await errorOf(ADM, `public.academic_admin_list_quiz_bank()`, {}))?.code, 'MFA_REQUIRED')
eq('tables are hidden from users', (await errorOf(STUDENT, `(select count(*) from academic_quiz_items)`, {}))?.status, '42501')
eq('empty bank, non-author approval on by default', await a1(`public.academic_admin_list_quiz_bank()`), { four_eyes: true, topics: [], items: [] })

// ─── Topics ──────────────────────────────────────────────────────────────────

const topicInput = { subject_id: ID.math, grade_id: ID.g11, code: 'algebra', name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra' }
let bank = await a1(`public.academic_admin_save_quiz_topic(${json(topicInput)})`)
const algebra = bank.topics[0]
eq('topic created for a subject and grade', [algebra.code, algebra.subject_code, algebra.grade_code, algebra.approved_items, algebra.active], ['algebra', 'MATH', 'G11', 0, true])
eq('topic codes are unique per subject and grade', (await errorOf(ADM, `public.academic_admin_save_quiz_topic(${json(topicInput)})`))?.details?.field, 'code')
eq('topic codes are slugs', (await errorOf(ADM, `public.academic_admin_save_quiz_topic(${json({ ...topicInput, code: 'Has Spaces' })})`))?.code, 'VALIDATION_FAILED')
bank = await a1(`public.academic_admin_save_quiz_topic(${json({ ...topicInput, code: 'geometry', name_lo: 'ເລຂາຄະນິດ', name_en: 'Geometry', display_order: 2 })})`)
const geometry = bank.topics.find((t) => t.code === 'geometry')

// ─── Items: drafts and completeness ──────────────────────────────────────────

const options = [{ key: 'A', text_lo: '2' }, { key: 'B', text_lo: '3' }, { key: 'C', text_lo: '4' }, { key: 'D', text_lo: '5' }]
const complete = { topic_id: algebra.id, stem_lo: 'ຖ້າ x + 2 = 5, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If x + 2 = 5, what is x?', options, correct_key: 'B', explanation_lo: 'ລົບ 2 ອອກທັງສອງຂ້າງ: x = 3.' }

let draft = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, explanation_lo: '' })})`)
eq('new item is draft version 1 by its author', [draft.status, draft.item_version, draft.author_name, draft.live_version, draft.can_approve], ['draft', 1, 'Admin One', null, false])
eq('missing Lao explanation listed as a problem', Object.keys(draft.problems), ['explanation_lo'])
const incomplete = await errorOf(ADM, `public.academic_admin_review_quiz_item('${draft.id}', 'submit')`)
eq('incomplete items cannot go to review', [incomplete?.code, Object.keys(incomplete?.details?.problems ?? {})], ['QUIZ_ITEM_INCOMPLETE', ['explanation_lo']])
eq('Lao question text is required', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, stem_lo: ' ' })})`))?.code, 'VALIDATION_FAILED')
eq('leaked or official exam questions are refused', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, licence: 'licensed', source: 'Leaked 2025 national exam' })})`))?.details?.field, 'source')
eq('... also when described in Lao', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, stem_lo: 'ຂໍ້ສອບແຫ່ງຊາດ 2025: x = ?' })})`))?.details?.field, 'source')

const wrongShape = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, options: [{ key: 'A', text_lo: '1' }, { key: 'C', text_lo: '2' }], correct_key: 'B' })})`)
eq('options must be A, B … in order', Object.keys(wrongShape.problems), ['options'])
const notListed = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, options: options.slice(0, 2), correct_key: 'D' })})`)
eq('correct answer must be an option', Object.keys(notListed.problems), ['correct_key'])
const thirdParty = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, licence: 'cc-by-4.0' })})`)
eq('non-original items name their source', Object.keys(thirdParty.problems), ['source'])

draft = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, id: draft.id })})`)
eq('editing the draft fixes it', [draft.problems, draft.item_version], [{}, 1])

// ─── Review: non-author approval ─────────────────────────────────────────────

let item = await a1(`public.academic_admin_review_quiz_item('${draft.id}', 'submit')`)
eq('submitted for review', [item.status, item.can_approve], ['in_review', false])
eq('in review it is locked for editing', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, id: draft.id })})`))?.code, 'QUIZ_ITEM_LOCKED')
eq('the author cannot approve', (await errorOf(ADM, `public.academic_admin_review_quiz_item('${draft.id}', 'approve')`))?.code, 'FOUR_EYES_REQUIRED')
eq('another admin sees it can be approved', (await a2(`public.academic_admin_list_quiz_bank()`)).items.find((i) => i.id === draft.id).can_approve, true)
eq('not servable before approval', await servable(draft.id), false)
item = await a2(`public.academic_admin_review_quiz_item('${draft.id}', 'approve', 'Checked the arithmetic')`)
eq('approved by another admin', [item.status, item.reviewer_name, item.review_note, item.live_version], ['approved', 'Admin Two', 'Checked the arithmetic', 1])
eq('approved items are servable (QUIZ-005)', await servable(draft.id), true)
eq('approving twice is not a transition', (await errorOf(ADM3, `public.academic_admin_review_quiz_item('${draft.id}', 'approve')`))?.code, 'QUIZ_BAD_TRANSITION')

// ─── Versions ────────────────────────────────────────────────────────────────

eq('approved versions cannot be edited in place', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, id: draft.id })})`))?.code, 'QUIZ_ITEM_LOCKED')
await fails(db, 'approved content is immutable in the table too', `update academic_quiz_items set stem_lo = 'x' where id = '${draft.id}'`, 'immutable')
const v2 = await a2(`public.academic_admin_save_quiz_item(${json({ ...complete, item_key: draft.item_key, stem_lo: 'ຖ້າ x + 3 = 5, x ເທົ່າກັບເທົ່າໃດ?', correct_key: 'A', explanation_lo: 'ລົບ 3: x = 2.' })})`)
eq('saving an approved item starts the next version as a draft', [v2.item_key, v2.item_version, v2.status, v2.author_name, v2.live_version], [draft.item_key, 2, 'draft', 'Admin Two', 1])
eq('one open version per item', (await errorOf(ADM, `public.academic_admin_save_quiz_item(${json({ ...complete, item_key: draft.item_key })})`))?.code, 'QUIZ_DRAFT_EXISTS')
eq('the bank lists the newest version', (await a1(`public.academic_admin_list_quiz_bank(${json({ topic_id: algebra.id, status: 'draft' })})`)).items.map((i) => [i.item_version, i.live_version]).filter(([v]) => v === 2), [[2, 1]])
eq('filtering by approved still lists v1 while v2 is a draft', (await a1(`public.academic_admin_list_quiz_bank(${json({ status: 'approved' })})`)).items.map((i) => i.id).includes(draft.id), true)
await a2(`public.academic_admin_review_quiz_item('${v2.id}', 'submit')`)
eq('the new author cannot approve their version', (await errorOf(ADM2, `public.academic_admin_review_quiz_item('${v2.id}', 'approve')`))?.code, 'FOUR_EYES_REQUIRED')
await a1(`public.academic_admin_review_quiz_item('${v2.id}', 'approve')`)
eq('approving v2 retires v1', (await db.query(`select item_version, status from academic_quiz_items where item_key = '${draft.item_key}' order by item_version`)).rows.map((r) => [r.item_version, r.status]), [[1, 'retired'], [2, 'approved']])
eq('only the live version is servable', [await servable(draft.id), await servable(v2.id)], [false, true])
await fails(db, 'retired stays retired', `update academic_quiz_items set status = 'approved' where id = '${draft.id}'`, 'retired')

// ─── Last editor counts as an author; return and retire ──────────────────────

const shared = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, topic_id: geometry.id })})`)
await a2(`public.academic_admin_save_quiz_item(${json({ ...complete, topic_id: geometry.id, id: shared.id, explanation_lo: 'ອະທິບາຍໃໝ່.' })})`)
await a1(`public.academic_admin_review_quiz_item('${shared.id}', 'submit')`)
eq('neither the author nor the last editor may approve', [(await errorOf(ADM, `public.academic_admin_review_quiz_item('${shared.id}', 'approve')`))?.code,
  (await errorOf(ADM2, `public.academic_admin_review_quiz_item('${shared.id}', 'approve')`))?.code], ['FOUR_EYES_REQUIRED', 'FOUR_EYES_REQUIRED'])
eq('returning needs a note', (await errorOf(ADM3, `public.academic_admin_review_quiz_item('${shared.id}', 'return', 'no')`))?.details?.field, 'note')
item = await a3(`public.academic_admin_review_quiz_item('${shared.id}', 'return', 'Option C is also correct')`)
eq('returned to draft with the note', [item.status, item.review_note, item.reviewer_name], ['draft', 'Option C is also correct', 'Admin Three'])
await a1(`public.academic_admin_review_quiz_item('${shared.id}', 'submit')`)
item = await a3(`public.academic_admin_review_quiz_item('${shared.id}', 'approve')`)
eq('a third admin approves', item.status, 'approved')
eq('retiring needs a note', (await errorOf(ADM, `public.academic_admin_review_quiz_item('${shared.id}', 'retire')`))?.details?.field, 'note')
item = await a1(`public.academic_admin_review_quiz_item('${shared.id}', 'retire', 'Replaced by a clearer item')`)
eq('retired items are no longer servable', [item.status, await servable(shared.id)], ['retired', false])

// ─── Inactive topics, setting, audit ─────────────────────────────────────────

await a1(`public.academic_admin_save_quiz_topic(${json({ ...topicInput, id: algebra.id, active: false })})`)
eq('items in an inactive topic are not servable', await servable(v2.id), false)
await a1(`public.academic_admin_save_quiz_topic(${json({ ...topicInput, id: algebra.id, active: true })})`)

await ok(db, 'single-admin team', `update academic_settings set value = 'false' where key = 'quiz_four_eyes_required'`)
const solo = await a1(`public.academic_admin_save_quiz_item(${json({ ...complete, topic_id: geometry.id })})`)
await a1(`public.academic_admin_review_quiz_item('${solo.id}', 'submit')`)
eq('with the setting off, the author may approve', (await a1(`public.academic_admin_review_quiz_item('${solo.id}', 'approve')`)).status, 'approved')

const audit = (await db.query(`select action, count(*)::int as n from academic_audit_events where action like 'quiz.%' group by action order by action`)).rows
eq('every change is audited', audit.map((r) => r.action), ['quiz.item_approve', 'quiz.item_retire', 'quiz.item_return', 'quiz.item_save', 'quiz.item_submit', 'quiz.topic_create', 'quiz.topic_update'])
eq('return note kept in the audit log', (await one(`select reason from academic_audit_events where action = 'quiz.item_return'`)).reason, 'Option C is also correct')

// ─── Draft questions for mock exams (migration 166) ──────────────────────────

// Migrations run before the fixtures, so re-run 166 now (it must be safe to re-run).
// The fixtures have only LAO, MATH, PE and PHYS, so only those subjects' drafts load here.
await ok(db, 'drafts after the fixtures', readMigration('166_academic_quiz_item_drafts.sql') + readMigration('166_academic_quiz_item_drafts.sql'))
const drafts166 = (await db.query(`select s.code, i.status, i.author_id, i.explanation_origin, i.licence, i.id from academic_quiz_items i
  join academic_quiz_topics t on t.id = i.topic_id join academic_subjects s on s.id = t.subject_id where i.source like 'Drafted by Claude%' order by s.code, i.created_at`)).rows
eq('drafts load as unserved, authorless drafts with AI-marked explanations, 6 per subject',
  [drafts166.length, [...new Set(drafts166.map((d) => d.code))].sort(), drafts166.every((d) => d.status === 'draft' && d.author_id === null && d.explanation_origin === 'ai' && d.licence === 'original'),
   (await Promise.all(drafts166.slice(0, 3).map((d) => servable(d.id)))).some(Boolean)],
  [18, ['LAO', 'MATH', 'PHYS'], true, false])
await a1(`public.academic_admin_review_quiz_item('${drafts166[0].id}', 'submit')`)
eq('a reviewer approves a draft, which can then be served', [(await a2(`public.academic_admin_review_quiz_item('${drafts166[0].id}', 'approve')`)).status, await servable(drafts166[0].id)], ['approved', true])

done()
