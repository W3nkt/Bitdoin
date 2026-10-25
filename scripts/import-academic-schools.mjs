// Fetch once from MoES, validate locations/types, retain a source snapshot and
// generate the insert-only migration. No database connection or writes.
// node scripts/import-academic-schools.mjs [report.html] [lesmis-entities.json]
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

export const SOURCE_URL = 'http://emisform.lesmis.edu.la:8880/reportview.php?lang=eng&qrid=listofschool_location_school&qrtitle=A+list+of+schools+and+their+locations+%28villages%29+that+are+under+MoES&grp=7&sgrp=1'
export const COORDINATES_URL = 'https://lesmis-api.lesmis.edu.la/v1/entities/LA?fields=id,code,name,type,point,parent_code,attributes'
const TYPES = { '7': 'ມັດທະຍົມຕອນປາຍ', '8': 'ມັດທະຍົມສົມບູນ' }
const PROVINCES = ['vientiane-prefecture', 'phongsaly', 'luang-namtha', 'oudomxay', 'bokeo', 'luang-prabang', 'houaphanh', 'sainyabuli', 'xiangkhouang', 'vientiane-province', 'bolikhamsai', 'khammouane', 'savannakhet', 'salavan', 'sekong', 'champasak', 'attapeu', 'xaisomboun']

function cellText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim()
}

export function extractSchools(html, divisions) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(row => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cellText(cell[1])))
    .filter(row => row.length)
  if (!rows.length || rows.some(row => row.length !== 11)) throw new Error('Unexpected MoES report columns')
  const schools = []
  const seen = new Set()
  for (const row of rows) {
    const [period, provinceId, provinceName, districtId, districtName, schoolId, name, typeId, typeName, villageId, villageName] = row
    if (!(typeId in TYPES)) continue
    if (period !== '19' || TYPES[typeId] !== typeName) throw new Error('Unexpected reporting year or secondary-school type')
    if (!/^\d{8}$/.test(schoolId) || seen.has(schoolId)) throw new Error('Invalid or duplicate school id: ' + schoolId)
    if (!/^\d{2}$/.test(provinceId) || !/^\d{4}$/.test(districtId) || !districtId.startsWith(provinceId)) throw new Error('Invalid administrative codes: ' + schoolId)
    const provinceCode = PROVINCES[Number(provinceId) - 1]
    // MoES uses 1013 for Meun (ໝື່ນ); the shared app list uses 10-11.
    const districtCode = districtId === '1013' ? '10-11' : Number(provinceId) + '-' + districtId.slice(2)
    const province = divisions.find(p => p.id === provinceCode)
    if (!province?.districts.some(d => d.code === districtCode)) throw new Error('Unmapped district: ' + districtId)
    if (!name || name.length > 160) throw new Error('Invalid school name: ' + schoolId)
    seen.add(schoolId)
    schools.push({ emis_school_id: schoolId, name_lo: name, province_code: provinceCode, district_code: districtCode,
      secondary_level: typeId === '7' ? 'upper_secondary' : 'complete_secondary',
      source_province_id: provinceId, source_province_name: provinceName, source_district_id: districtId, source_district_name: districtName,
      source_school_type_id: typeId, source_school_type_name: typeName, source_village_id: villageId, source_village_name: villageName })
  }
  if (new Set(schools.map(s => s.province_code)).size !== 18) throw new Error('Incomplete province coverage')
  return { sourceRowCount: rows.length, schools: schools.sort((a, b) => a.emis_school_id.localeCompare(b.emis_school_id)) }
}

export function enrichCoordinates(schools, entities) {
  if (!Array.isArray(entities)) throw new Error('Unexpected LESMIS entity response')
  const byCode = new Map()
  const wanted = new Set(schools.map(s => s.emis_school_id))
  for (const entity of entities) {
    if (entity.type !== 'school' || !wanted.has(entity.code)) continue
    if (byCode.has(entity.code)) throw new Error('Duplicate LESMIS school: ' + entity.code)
    byCode.set(entity.code, entity)
  }
  return schools.map(school => {
    const entity = byCode.get(school.emis_school_id)
    if (!entity || entity.parentCode !== school.source_district_id || entity.attributes?.type !== 'Secondary') throw new Error('LESMIS school/district mismatch: ' + school.emis_school_id)
    const point = entity.point
    if (point != null && (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)
      || point[0] < 13.8 || point[0] > 22.6 || point[1] < 100 || point[1] > 108)) throw new Error('Invalid Lao school coordinates: ' + school.emis_school_id)
    // The LESMIS map API already returns [latitude, longitude], not GeoJSON.
    return { ...school, latitude: point ? Number(point[0].toFixed(6)) : null, longitude: point ? Number(point[1].toFixed(6)) : null }
  })
}

export function schoolMigration(schools) {
  const quote = s => "'" + s.replace(/'/g, "''") + "'"
  const values = schools.map(s => `  (md5('bitdoin.academic.school.moes.${s.emis_school_id}')::uuid, ${[s.emis_school_id, s.name_lo, s.province_code, s.district_code, s.secondary_level, '2025-2026'].map(quote).join(', ')}, ${s.latitude ?? 'null'}, ${s.longitude ?? 'null'}, ${s.latitude == null ? 'null, null' : quote(COORDINATES_URL) + ", '2026-10-25'"})`)
  return `-- Generated by scripts/import-academic-schools.mjs; do not edit rows by hand.
-- Source: ${SOURCE_URL}
-- MoES period 19 (2025-2026), retrieved 2026-10-25. ${schools.length} schools.
-- Only type 7 (upper secondary) and 8 (complete secondary), supporting G10-12.
-- Lower secondary (type 6), primary and preschool are excluded.
-- Official Lao names are retained; English/romanised names are not invented.
-- Coordinates: LESMIS map API, joined by exact school ID and district.
-- ${schools.filter(s => s.latitude != null).length} coordinate pairs; missing points remain NULL. WGS84 decimal degrees.
-- Stable MoES IDs; reruns preserve admin edits, merges and archives.
insert into public.academic_schools
  (id, emis_school_id, name_lo, province_code, district_code, secondary_level, source_academic_year, latitude, longitude, coordinates_source_url, coordinates_retrieved_on) values
${values.join(',\n')}
on conflict do nothing;
`
}

async function main() {
  let html
  if (process.argv[2]) html = await readFile(process.argv[2], 'utf8')
  else {
    const response = await fetch(SOURCE_URL, { method: 'POST', body: new URLSearchParams({ qrid: 'listofschool_location_school', qrtitle: 'Schools', txtPERIOD_ID: '19', txtPROVINCE_ID: '', txtDISTRICT_ID: '', txtSCHOOL_ID: '' }), signal: AbortSignal.timeout(45_000) })
    if (!response.ok) throw new Error('MoES request failed: ' + response.status)
    html = await response.text()
  }
  const code = ts.transpileModule(await readFile('src/data/laosAdministrativeDivisions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const { LAOS_ADMIN_DIVISIONS } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  const { sourceRowCount, schools: extracted } = extractSchools(html, LAOS_ADMIN_DIVISIONS)
  let coordinateText
  if (process.argv[3]) coordinateText = await readFile(process.argv[3], 'utf8')
  else {
    const response = await fetch(COORDINATES_URL, { signal: AbortSignal.timeout(45_000) })
    if (!response.ok) throw new Error('LESMIS coordinates request failed: ' + response.status)
    coordinateText = await response.text()
  }
  const schools = enrichCoordinates(extracted, JSON.parse(coordinateText))
  const snapshot = { source_url: SOURCE_URL, source_academic_year: '2025-2026', retrieved_on: '2026-10-25', source_sha256: createHash('sha256').update(html).digest('hex'), source_row_count: sourceRowCount,
    coordinates_source_url: COORDINATES_URL, coordinates_sha256: createHash('sha256').update(coordinateText).digest('hex'), schools }
  await mkdir('supabase/data', { recursive: true })
  await writeFile('supabase/data/moes-secondary-schools-2025-2026.json', JSON.stringify(snapshot, null, 2) + '\n')
  await writeFile('supabase/migrations/127_academic_moes_secondary_schools.sql', schoolMigration(schools))
  console.log(`Prepared ${schools.length} upper/complete secondary schools from ${sourceRowCount} source rows across all 18 provinces; ${schools.filter(s => s.latitude != null).length} with coordinates.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
