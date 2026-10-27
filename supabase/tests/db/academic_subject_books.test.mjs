// "Books that may help" (P5-EXAM #56, piece 4: LEARN-006, migration 168):
// admins tag Bookstore titles like other content; a subject shows at most 2
// published, in-stock, active titles for the student's grade, with price range.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, B, ADM] = ['a1', 'b1', 'd1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role) values ('${S}', 'Noy', 'CUSTOMER'), ('${B}', 'Kham', 'CUSTOMER'), ('${ADM}', 'Admin', 'ADMIN')`)
await ok(db, 'config', CONFIG_SQL)
const profile = { display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] }
const s = await rpc(S, `public.academic_create_profile(${json(profile)})`)
await rpc(B, `public.academic_create_profile(${json(profile)})`)
const math = (await one(`select id from academic_subject_enrolments where enrolment_id = '${s.enrolment_id}'`)).id
const TOPIC = '70000000-0000-0000-0000-000000000001'
const [B1, B2, B3, B4, B5] = [1, 2, 3, 4, 5].map((n) => `71000000-0000-0000-0000-00000000000${n}`)
await ok(db, 'bookstore', `insert into academic_quiz_topics (id, subject_id, grade_id, code, name_lo, name_en) values ('${TOPIC}', '${ID.math}', '${ID.g11}', 'algebra', 'ພຶດຊະຄະນິດ', 'Algebra');
  insert into books (id, title, author, language, is_active) values
    ('${B1}', 'Algebra for Grade 11', 'A. Author', 'Lao', true), ('${B2}', 'Out of stock maths', null, 'English', true),
    ('${B3}', 'Maths workbook', null, 'Thai', true), ('${B4}', 'Grade 10 maths', null, 'Lao', true), ('${B5}', 'Old maths', null, 'Lao', false);
  insert into book_prices (book_id, final_price, availability) values
    ('${B1}', 45000, 'AVAILABLE'), ('${B1}', 60000, 'AVAILABLE'), ('${B1}', 30000, 'OUT_OF_STOCK'), ('${B2}', 50000, 'OUT_OF_STOCK'),
    ('${B3}', 70000, 'AVAILABLE'), ('${B4}', 40000, 'AVAILABLE'), ('${B5}', 40000, 'AVAILABLE');`)

const found = await rpc(ADM, `public.academic_admin_search_external_content('book', 'maths')`, STAFF)
eq('admins find Bookstore titles to tag, with availability', found.map((b) => [b.title_en, b.available]).sort(),
  [['Grade 10 maths', true], ['Maths workbook', true], ['Old maths', false], ['Out of stock maths', false]])
const tag = (book, extra = {}) => rpc(ADM, `public.academic_admin_save_content(${json({ kind: 'book', external_id: book, subject_ids: [ID.math], grade_min: 11, grade_max: 12, topic_ids: [TOPIC],
  difficulty: 2, language: 'lo', est_minutes: 60, status: 'published', ...extra })})`, STAFF)
await tag(B1, { quality_score: 5 })
await tag(B2)
await tag(B3, { language: 'th', quality_score: 3 })
await tag(B4, { grade_min: 10, grade_max: 10 })
await tag(B5)

let books = await rpc(S, `public.academic_subject_books('${math}')`)
eq('at most 2, in stock, active, for the grade; best first; price range from available offers only',
  books.map((b) => [b.title, b.language, Number(b.price_min), Number(b.price_max), b.route]),
  [['Algebra for Grade 11', 'Lao', 45000, 60000, `/bookstore/books/${B1}`], ['Maths workbook', 'Thai', 70000, 70000, `/bookstore/books/${B3}`]])
await ok(db, 'sold out', `update book_prices set availability = 'OUT_OF_STOCK' where book_id = '${B1}'`)
books = await rpc(S, `public.academic_subject_books('${math}')`)
eq('a title out of stock everywhere is left out', books.map((b) => b.title), ['Maths workbook'])
eq("another student's subject is refused", (await rpc(B, `public.academic_subject_books('${math}')`)).error?.code, 'NOT_FOUND')
eq('books are never next actions', (await one(`select count(*)::int as n from public.academic_recommendable_content(array['practice_set', 'academy_lesson', 'academy_challenge'], null, '${ID.math}', 11::smallint, null, null, true, '${S}')`)).n, 0)

done()
