// Career catalogue (P4-CAR #55, piece 1): one catalogue keyed by the Explorer's
// slugs (CAREER-008), sourced and dated facts (UNI-002/004, CAREER-005),
// four-eyes publication (UNI-001, ADMIN-010), review-by alerts, the seed.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, A1, A2] = ['c1', 'a1', 'a2'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'Student', 'CUSTOMER'), ('${A1}', 'Admin One', 'ADMIN'), ('${A2}', 'Admin Two', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-10-26' $$`)
// The rest of production's subjects (the fixtures have LAO, MATH, PE, PHYS).
await ok(db, 'subjects', `insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max, is_default)
  select gen_random_uuid(), c, c, c, 10, 12, false from unnest(array['ART', 'BIO', 'CHEM', 'CIV', 'ENG', 'GEO', 'HIST', 'ICT']) c`)
const list = async (kind, status) => (await rpc(A1, `public.academic_admin_career_content('${kind}'${status ? `, '${status}'` : ''})`, STAFF)).items
const review = (admin, id, action, note) => rpc(admin, `public.academic_admin_review_career_content('${id}', '${action}'${note ? `, '${note}'` : ''})`, STAFF)
const save = (admin, input) => rpc(admin, `public.academic_admin_save_career_content(${json(input)})`, STAFF)
const catalogue = () => rpc(S, `public.academic_career_catalogue()`)

// ─── Seed (CAREER-008) ───────────────────────────────────────────────────────

const careers = await list('career')
const institutions = await list('institution')
eq('the 14 Explorer careers keep their slugs, plus 5 Lao pathway careers', [careers.length, careers.some((c) => c.slug === 'software-engineer'), careers.some((c) => c.slug === 'pharmacist')], [19, true, true])
eq('5 institutions from official websites, with faculties', [institutions.length, institutions.find((i) => i.slug === 'uhs').draft.faculties.length], [5, 6])
eq('everything waits for a reviewer; nothing is published yet', [...careers, ...institutions].every((c) => c.status === 'in_review' && c.published === null), true)
eq('every seeded record is complete', [...careers, ...institutions].filter((c) => Object.keys(c.problems).length).map((c) => c.slug), [])
eq('unsourced Explorer salary and demand figures are not entered (OD-10)', careers.every((c) => c.draft.facts.length === 0), true)
eq('students see nothing until it is approved', (await catalogue()).careers.length, 0)
const drafts = await list('programme')
eq('106 programme drafts from official sources; each only needs its length before review (migration 156)',
  [drafts.length, drafts.every((p) => p.status === 'draft' && JSON.stringify(p.problems) === JSON.stringify({ duration_years: 'Duration in years (0.5 to 8)' })), drafts.filter((p) => p.draft.entrance_group).length],
  [106, true, 29])

// ─── Four-eyes publication (UNI-001) ─────────────────────────────────────────

const nurse = careers.find((c) => c.slug === 'registered-nurse')
eq('seeded records have no author, so any admin can approve', nurse.can_approve, true)
eq('approved: published for students', (await review(A1, nurse.id, 'approve')).status, 'published')
let cat = await catalogue()
eq('the published copy is what students see', [cat.careers.length, cat.careers[0].slug, cat.careers[0].title_lo], [1, 'registered-nurse', nurse.draft.title_lo])

const uhs = institutions.find((i) => i.slug === 'uhs')
await review(A2, uhs.id, 'approve')
const programme = {
  kind: 'programme',
  data: {
    institution: 'uhs', name_en: 'Bachelor of Nursing Science', name_lo: 'ປະລິນຍາຕີ ພະຍາບານສາດ', degree_level: 'bachelor', duration_years: '4',
    entrance_group: '', careers: ['registered-nurse'], source_name: 'UHS website', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', review_by: '2027-04-26',
    requirements: [{ kind: 'cutoff', text_en: 'Cut-off 70', text_lo: 'ຄະແນນຂັ້ນຕ່ຳ 70', source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', review_by: '2026-11-15' }],
  },
}
const draft = await save(A1, programme)
eq('a cut-off without its academic year cannot be sent (UNI-004)', [draft.problems['requirements.1'], (await rpcError(A1, `public.academic_admin_review_career_content('${draft.id}', 'submit')`, STAFF))?.code],
  ['Add the academic year it applies to', 'CAREER_INCOMPLETE'])
programme.id = draft.id
programme.data.requirements[0].academic_year = '2026-2027'
await save(A1, programme)
eq('complete: sent for review', (await review(A1, draft.id, 'submit')).status, 'in_review')
eq('the author cannot approve their own record', [(await list('programme'))[0].can_approve, (await rpcError(A1, `public.academic_admin_review_career_content('${draft.id}', 'approve')`, STAFF))?.code], [false, 'FOUR_EYES_REQUIRED'])
eq('returning needs a reason', (await rpcError(A2, `public.academic_admin_review_career_content('${draft.id}', 'return', 'no')`, STAFF))?.details?.field, 'note')
eq('another admin approves', (await review(A2, draft.id, 'approve')).status, 'published')
cat = await catalogue()
eq('students see the programme with its cut-off and year', [cat.programmes.length, cat.programmes[0].requirements[0].academic_year, cat.programmes[0].requirements[0].out_of_date], [1, '2026-2027', false])

// ─── Editing a published record ──────────────────────────────────────────────

const edited = await save(A2, { id: nurse.id, kind: 'career', data: { ...nurse.draft, title_en: 'Nurse' } })
eq('an edit is a new working copy; students keep the approved one', [edited.status, edited.changed, (await catalogue()).careers[0].title_en], ['draft', true, 'Registered Nurse'])
eq('invalid fields are named', (await save(A2, { id: nurse.id, kind: 'career', data: { ...nurse.draft, primary_area: 'X', related_subjects: ['NOPE'] } })).problems,
  { primary_area: 'Choose the main interest area', related_subjects: 'Up to 4 school subjects from the list' })
eq('a fact needs a source link and dates (UNI-002)', (await save(A2, { id: nurse.id, kind: 'career', data: { ...nurse.draft, facts: [{ kind: 'salary', text_en: 'x', text_lo: 'x', source_name: 'Survey' }] } })).problems['facts.1'],
  'Add the source link (https://…)')
await save(A2, { id: nurse.id, kind: 'career', data: nurse.draft })
eq('saving it back unchanged restores the published state', (await list('career', 'published')).map((c) => c.slug), ['registered-nurse'])

// ─── Review-by dates (UNI-002, CAREER-005) ───────────────────────────────────

eq('the cut-off is due within 30 days', (await rpc(A1, `public.academic_admin_career_due()`, STAFF)).map((d) => [d.slug, d.review_by, d.overdue]), [[draft.slug, '2026-11-15', false]])
eq('the weekly check raises one alert', [(await one(`select public.academic_career_review_check() as v`)).v, (await one(`select details from academic_alerts where kind = 'career_review_due'`)).details.due], [true, 1])
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-20' $$`)
eq('past its review-by date it is labelled out of date for students', (await catalogue()).programmes[0].requirements[0].out_of_date, true)
eq('the check runs every Monday morning', (await db.query(`select schedule from cron.job where jobname = 'academic-career-review-check'`)).rows, [{ schedule: '0 2 * * 1' }])

// ─── Archive and access ──────────────────────────────────────────────────────

await review(A1, uhs.id, 'archive', 'Closed for checking')
eq("archiving an institution hides it and its programmes", [(await catalogue()).institutions.length, (await catalogue()).programmes.length], [0, 0])
eq('students cannot use the admin tools', (await rpcError(S, `public.academic_admin_career_content('career')`))?.code, 'FORBIDDEN_ROLE')
eq('signed-out visitors cannot read the catalogue', (await rpcError(null, `public.academic_career_catalogue()`))?.code, 'UNAUTHENTICATED')

// ─── Programme fields and scholarships (UNI-003, UNI-005, migration 155) ─────

await review(A1, uhs.id, 'restore')
eq('a programme field must be one of the clusters', (await save(A1, { kind: 'programme', data: { ...programme.data, field: 'astrology' } })).problems.field, 'Choose a field from the list')
const scholarship = { kind: 'scholarship', data: { name_en: 'Health Sciences Scholarship', name_lo: 'ທຶນການສຶກສາ ວິທະຍາສາດສຸຂະພາບ', provider: 'University of Health Sciences', institution: 'uhs' } }
eq('a scholarship needs its deadline, year, who can apply and its source', Object.keys((await save(A1, scholarship)).problems).sort(), ['academic_year', 'deadline', 'eligibility', 'source'])
const fullScholarship = { ...scholarship, data: { ...scholarship.data, deadline: '2026-12-04', academic_year: '2026-2027', eligibility_en: 'Grade 12 students', eligibility_lo: 'ນັກຮຽນ ມ.7',
  source_name: 'UHS website', source_url: 'https://uhs.edu.la/', verified_on: '2026-11-01', review_by: '2027-01-01' } }
const sch = await save(A1, fullScholarship)
eq('complete: an automatic slug, ready for review', [sch.slug.startsWith('s-'), sch.problems], [true, {}])
await review(A1, sch.id, 'submit')
await review(A2, sch.id, 'approve')
eq('published scholarships with a future deadline are listed for students', (await catalogue()).scholarships.map((x) => x.name_en), ['Health Sciences Scholarship'])

const kid = await rpc(S, `public.academic_create_profile(${json({ display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] })})`)
void kid
eq('a student saves it with reminders on', await rpc(S, `public.academic_set_scholarship_saved('${sch.slug}', true, true)`), [{ slug: sch.slug, remind: true }])
eq('14 days before the deadline: a reminder', (await one(`select public.academic_scholarship_reminders() as v`)).v, 1)
eq('only once', (await one(`select public.academic_scholarship_reminders() as v`)).v, 0)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-12-01' $$`)
eq('3 days before: another reminder', [(await one(`select public.academic_scholarship_reminders() as v`)).v, (await one(`select string_agg(code, ',' order by code) as v from academic_notifications where category = 'scholarship_deadline'`)).v], [1, 'scholarship.14,scholarship.3'])
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-12-05' $$`)
eq('after the deadline it is hidden and cannot be saved', [(await catalogue()).scholarships.length, (await rpcError(S, `public.academic_set_scholarship_saved('${sch.slug}', true)`))?.details?.field], [0, 'slug'])
eq('the saved scholarship is in "Download my data"', (await rpc(S, `public.academic_export_my_scholarships()`)).map((x) => x.scholarship), [sch.slug])

done()
