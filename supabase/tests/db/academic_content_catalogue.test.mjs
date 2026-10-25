// Content catalogue for recommendations (P2-REC #50: LEARN-004, OD-05): the
// Academy adapter's availability rules, required metadata, references to
// existing records only, admin-only access and the audit trail.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const ADM = '00000000-0000-0000-0000-0000000000d1'
const STUDENT = '00000000-0000-0000-0000-0000000000a1'
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${ADM}', 'Admin', 'ADMIN'), ('${STUDENT}', 'Noy', 'CUSTOMER')`)
await ok(db, 'config', CONFIG_SQL)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-10-26' $$`)
const admin = (call) => rpc(ADM, call, STAFF)
const errorOf = async (call, user = ADM, opts = STAFF) => await rpcError(user, call, opts)

// Academy records (migration 054 tables; stubs in the test bootstrap).
const L = { live: '20000000-0000-0000-0000-000000000001', draft: '20000000-0000-0000-0000-000000000002', future: '20000000-0000-0000-0000-000000000003' }
const CH = { now: '20000000-0000-0000-0000-000000000011', past: '20000000-0000-0000-0000-000000000012' }
await ok(db, 'academy', `
  insert into premium_lessons (id, slug, title_en, title_lo, status, published_at) values
    ('${L.live}', 'english-tenses', 'English tenses', 'ການໃຊ້ Tense', 'PUBLISHED', now() - interval '1 day'),
    ('${L.draft}', 'algebra-draft', 'Algebra basics', 'ພື້ນຖານພຶດຊະຄະນິດ', 'DRAFT', null),
    ('${L.future}', 'next-week', 'Next week lesson', 'ບົດອາທິດໜ້າ', 'PUBLISHED', now() + interval '3 days');
  insert into premium_weekly_challenges (id, slug, title_en, title_lo, starts_on, ends_on, is_active) values
    ('${CH.now}', 'focus-week', 'Focus week', 'ອາທິດສຸມໃສ່', '2026-10-25', '2026-10-31', true),
    ('${CH.past}', 'old-week', 'Old week', 'ອາທິດເກົ່າ', '2026-10-01', '2026-10-07', true);`)
const topic = async (code, subject = ID.math) => (await admin(`public.academic_admin_save_quiz_topic(${json({ subject_id: subject, grade_id: ID.g11, code, name_lo: code, name_en: code })})`)).topics.find((t) => t.code === code).id
const algebra = await topic('algebra')
const empty = await topic('geometry')
await ok(db, 'algebra items', `insert into academic_quiz_items (topic_id, stem_lo, options, correct_key, explanation_lo, status)
  select '${algebra}', 'Q' || n, '[{"key":"A","text_lo":"1"},{"key":"B","text_lo":"2"}]', 'B', 'x', 'approved' from generate_series(1, 3) n`)

// ─── Adapter (OD-05) ─────────────────────────────────────────────────────────

const ext = async (kind, id) => (await one(`select public.academic_external_content('${kind}', '${id}') as v`)).v
eq('published lesson: available, opens by slug, needs membership', await ext('academy_lesson', L.live), { title_lo: 'ການໃຊ້ Tense', title_en: 'English tenses', available: true, route: '/academy/lesson/english-tenses', membership: true })
eq('draft and future-dated lessons are not available', [(await ext('academy_lesson', L.draft)).available, (await ext('academy_lesson', L.future)).available], [false, false])
eq("challenges are available only in their week", [(await ext('academy_challenge', CH.now)).available, (await ext('academy_challenge', CH.past)).available], [true, false])
eq('practice set: free, needs 3 approved items', [(await ext('practice_set', algebra)).available, (await ext('practice_set', algebra)).membership, (await ext('practice_set', empty)).available], [true, false, false])
eq('unknown records -> null', await ext('academy_lesson', CH.now), null)

// ─── Admin ───────────────────────────────────────────────────────────────────

eq('students cannot open the catalogue', (await errorOf(`public.academic_admin_list_content()`, STUDENT, {}))?.code, 'FORBIDDEN_ROLE')
eq('admins need MFA', (await errorOf(`public.academic_admin_list_content()`, ADM, {}))?.code, 'MFA_REQUIRED')
const found = await admin(`public.academic_admin_search_external_content('academy_lesson', 'algebra')`)
eq('search finds Academy lessons by title', found.map((r) => [r.title_en, r.available, r.tagged]), [['Algebra basics', false, false]])

const base = { kind: 'academy_lesson', external_id: L.live, subject_ids: [ID.math], grade_min: 10, grade_max: 12, topic_ids: [algebra], difficulty: 1, language: 'en', est_minutes: 15 }
for (const [field, patch] of [['external_id', { external_id: '20000000-0000-0000-0000-0000000000ff' }], ['subject_ids', { subject_ids: [] }],
  ['topic_ids', { topic_ids: [] }], ['content', { difficulty: 4 }], ['content', { language: 'fr' }], ['content', { est_minutes: 0 }], ['content', { grade_min: 12, grade_max: 10 }]]) {
  eq(`required: ${field} ${JSON.stringify(patch)}`, (await errorOf(`public.academic_admin_save_content(${json({ ...base, ...patch })})`))?.details?.field, field)
}
eq('topics must belong to the chosen subjects', (await errorOf(`public.academic_admin_save_content(${json({ ...base, subject_ids: [ID.lao] })})`))?.details?.field, 'topic_ids')
let item = await admin(`public.academic_admin_save_content(${json({ ...base, objectives_en: ['Use the present simple'], quality_score: 4 })})`)
eq('saved as a draft with the adapter view', [item.status, item.external.title_en, item.subject_codes, item.topic_names, item.objectives_en], ['draft', 'English tenses', ['MATH'], ['algebra'], ['Use the present simple']])
eq('one entry per record', (await errorOf(`public.academic_admin_save_content(${json(base)})`))?.details?.field, 'external_id')
item = await admin(`public.academic_admin_save_content(${json({ ...base, id: item.id, status: 'published' })})`)
eq('published with a date', [item.status, item.published_at !== null], ['published', true])
eq('a practice set is tagged with its own topic', (await errorOf(`public.academic_admin_save_content(${json({ ...base, kind: 'practice_set', external_id: algebra, topic_ids: [empty] })})`))?.details?.field, 'topic_ids')
await admin(`public.academic_admin_save_content(${json({ ...base, kind: 'practice_set', external_id: algebra, language: 'lo', est_minutes: 8, status: 'published' })})`)
const list = await admin(`public.academic_admin_list_content()`)
eq('catalogue lists both with availability', list.map((c) => [c.kind, c.external.available, c.external.membership]).sort(), [['academy_lesson', true, true], ['practice_set', true, false]])
eq('search marks catalogued records', (await admin(`public.academic_admin_search_external_content('practice_set', '')`)).map((r) => [r.title_en, r.tagged]), [['geometry', false], ['algebra', true]])
eq('changes are audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'content.save'`)).n, 3)
eq('the table is hidden from users', (await errorOf(`(select count(*) from academic_content_items)`, STUDENT, {}))?.status, '42501')

done()
