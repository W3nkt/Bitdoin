import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createDb, ok, fails, eq, done, ACADEMIC_MIGRATIONS, readMigration } from './harness.mjs'
import { apiFor } from './fixtures.mjs'
import { schoolMigration, enrichCoordinates } from '../../../scripts/import-academic-schools.mjs'

const source = JSON.parse(readFileSync(new URL('../../data/moes-secondary-schools-2025-2026.json', import.meta.url), 'utf8'))
const code = ts.transpileModule(readFileSync(new URL('../../../src/data/laosAdministrativeDivisions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { LAOS_ADMIN_DIVISIONS: divisions } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
eq('780 unique MoES schools', [source.schools.length, new Set(source.schools.map(s => s.emis_school_id)).size], [780, 780])
eq('all provinces covered', new Set(source.schools.map(s => s.province_code)).size, 18)
eq('only upper and complete secondary imported', [...new Set(source.schools.map(s => s.source_school_type_id))].sort(), ['7', '8'])
eq('all locations exist in shared province/district selectors', source.schools.every(s => divisions.find(p => p.id === s.province_code)?.districts.some(d => d.code === s.district_code)), true)
eq('Meun mapped by its MoES district, not school/village code prefix', source.schools.filter(s => s.source_district_id === '1013').map(s => s.district_code), ['10-11', '10-11', '10-11', '10-11'])
eq('migration matches retained source', readMigration('127_academic_moes_secondary_schools.sql'), schoolMigration(source.schools))
const first = source.schools[0]
const entity = { code: first.emis_school_id, parentCode: first.source_district_id, type: 'school', attributes: { type: 'Secondary' }, point: [first.latitude, first.longitude] }
assert.throws(() => enrichCoordinates([first], [{ ...entity, point: [first.longitude, first.latitude] }]), /Invalid Lao school coordinates/)
assert.throws(() => enrichCoordinates([first], [{ ...entity, parentCode: '9999' }]), /school\/district mismatch/)
assert.throws(() => enrichCoordinates([first], [entity, entity]), /Duplicate LESMIS school/)
eq('missing coordinates stay null', enrichCoordinates([first], [{ ...entity, point: null }])[0].latitude, null)

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, one } = apiFor(db)
const A = '00000000-0000-4000-8000-0000000000a1'
await ok(db, 'user', `insert into public.users (id, name) values ('${A}', 'Student')`)
eq('all official rows loaded', (await one('select count(*)::int as n from academic_schools where emis_school_id is not null')).n, 780)
eq('school levels match official type counts', (await db.query('select secondary_level, count(*)::int as n from academic_schools group by secondary_level order by secondary_level')).rows,
  [{ secondary_level: 'complete_secondary', n: 751 }, { secondary_level: 'upper_secondary', n: 29 }])
eq('ownership and English names not inferred from educational type', (await one('select count(*)::int as n from academic_schools where school_type is not null or name_en is not null')).n, 0)
eq('774 coordinates, six missing', await one('select count(latitude)::int as located, count(*) filter (where latitude is null and longitude is null)::int as missing from academic_schools'), { located: 774, missing: 6 })
eq('coordinate order and precision', await one("select latitude, longitude from academic_schools where emis_school_id = '20101015'"), { latitude: 17.978409, longitude: 102.616505 })
eq('coordinate provenance recorded', (await one('select count(*)::int as n from academic_schools where latitude is not null and coordinates_source_url is not null and coordinates_retrieved_on is not null')).n, 774)
await fails(db, 'invalid latitude rejected', "update academic_schools set latitude = 100 where emis_school_id = '20101015'", 'check constraint')
await fails(db, 'partial coordinate pair rejected', "update academic_schools set longitude = null where emis_school_id = '20101015'", 'coordinate_pair')
const search = (q, province = null, district = null, limit = 20) => rpc(A, `coalesce((select jsonb_agg(to_jsonb(s)) from public.academic_search_schools('${q}', ${province ? `'${province}'` : 'null'}, ${limit}, ${district ? `'${district}'` : 'null'}) s), '[]')`)
eq('cannot browse entire country without a query', await search(''), [])
eq('single character search stays bounded', await search('ມ', 'vientiane-prefecture'), [])
eq('browse caps results', (await search('', 'vientiane-prefecture')).length, 20)
const district = await search('', 'vientiane-prefecture', '1-01')
eq('district browse returns all five appropriate schools', district.length, 5)
eq('district and province both respected', district.every(s => s.province_code === 'vientiane-prefecture' && s.district_code === '1-01'), true)
eq('coordinates available in school search response', district.find(s => s.name_lo === 'ຈັນທະບູລີ')?.latitude, 17.978409)
eq('mismatched district and province returns no schools', await search('', 'phongsaly', '1-01'), [])
eq('Lao name search with location', (await search('ຈັນທະບູລີ', 'vientiane-prefecture', '1-01')).some(s => s.name_lo === 'ຈັນທະບູລີ'), true)
eq('name hit outside selected district excluded', await search('ຈັນທະບູລີ', 'vientiane-prefecture', '1-09'), [])
eq('Meun schools browsable', (await search('', 'vientiane-province', '10-11')).length, 4)

await ok(db, 'admin edits and archives an imported school', `update academic_schools set name_lo = 'Admin-reviewed name', status = 'archived' where emis_school_id = '20101015'`)
await ok(db, 'safe to rerun import', readMigration('127_academic_moes_secondary_schools.sql'))
eq('no duplicate rows on rerun', (await one('select count(*)::int as n from academic_schools')).n, 780)
eq('admin edits survive import', await one("select name_lo, status from academic_schools where emis_school_id = '20101015'"), { name_lo: 'Admin-reviewed name', status: 'archived' })
eq('archived schools excluded from browse', (await search('', 'vientiane-prefecture', '1-01')).length, 4)
await fails(db, 'anonymous school search denied', `set local role anon; select * from public.academic_search_schools('', 'vientiane-prefecture', 20, '1-01')`, 'permission denied')
done()
