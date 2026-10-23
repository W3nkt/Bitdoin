// Migration 119: databases that applied 109/113 with ISO province codes.
import { createDb, ok, eq, done, readMigration, ACADEMIC_MIGRATIONS } from './harness.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const reconcile = readMigration('119_academic_reconcile_province_ids.sql')
const one = async (sql) => (await db.query(sql)).rows[0]

await ok(db, 'no-op on an up-to-date database', reconcile)
eq('slugs kept', (await one(`select value->>0 as first from academic_settings where key = 'province_codes'`)).first, 'vientiane-prefecture')

// Simulate the old state: ISO list and rows saved with ISO codes.
await ok(db, 'old state', `
  update academic_settings set value = '["AT","BK","BL","CH","HO","KH","LM","LP","OU","PH","SL","SV","VI","VT","XA","XE","XI","XS"]' where key = 'province_codes';
  insert into academic_schools (id, name_lo, province_code) values ('10000000-0000-0000-0000-0000000000a9', 'ໂຮງຮຽນ', 'VT');
  insert into academic_education_structures (id, code, name_lo, name_en) values ('10000000-0000-0000-0000-000000000001', 'LA', 'ລາວ', 'Lao');
  insert into academic_years (id, code, start_date, end_date) values ('10000000-0000-0000-0000-000000000003', '2026-2027', '2026-09-01', '2027-05-31');
  insert into academic_calendar_templates (name, academic_year_id, scope, province_code) values ('Prov', '10000000-0000-0000-0000-000000000003', 'province', 'LP');
  insert into public.users (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'A');
  insert into academic_student_profiles (user_id, display_name, age_band, province_code) values ('00000000-0000-0000-0000-0000000000a1', 'S', '18_plus', 'SV');`)
await ok(db, 'reconcile', reconcile)
eq('setting converted', (await one(`select jsonb_array_length(value) as n, value ? 'vientiane-prefecture' as has from academic_settings where key = 'province_codes'`)), { n: 18, has: true })
eq('rows converted', await one(`select (select province_code from academic_schools) as school, (select province_code from academic_calendar_templates) as calendar,
  (select province_code from academic_student_profiles) as profile`), { school: 'vientiane-prefecture', calendar: 'luang-prabang', profile: 'savannakhet' })
await ok(db, 'second run is a no-op', reconcile)
eq('still converted', (await one(`select province_code from academic_schools`)).province_code, 'vientiane-prefecture')

done()
