// Shared configuration fixtures and API-caller helpers for My Scores tests.

export const ID = {
  structure: '10000000-0000-0000-0000-000000000001',
  g10: '10000000-0000-0000-0000-000000000010',
  g11: '10000000-0000-0000-0000-000000000011',
  g12: '10000000-0000-0000-0000-000000000012',
  g9: '10000000-0000-0000-0000-000000000009',
  year: '10000000-0000-0000-0000-000000000003',
  nextYear: '10000000-0000-0000-0000-000000000013',
  scale: '10000000-0000-0000-0000-000000000004',
  scaleV1: '10000000-0000-0000-0000-000000000006',
  scale50: '10000000-0000-0000-0000-000000000005',
  scale50V1: '10000000-0000-0000-0000-000000000007',
  calendar: '10000000-0000-0000-0000-00000000000a',
  nextCalendar: '10000000-0000-0000-0000-00000000001a',
  school: '10000000-0000-0000-0000-0000000000a9',
  school50: '10000000-0000-0000-0000-0000000000b9',
  math: '10000000-0000-0000-0000-00000000000d',
  lao: '10000000-0000-0000-0000-00000000000e',
  phys: '10000000-0000-0000-0000-00000000000f',
  pe: '10000000-0000-0000-0000-0000000000f0',
}
export const period = (seq, next = false) => `10000000-0000-0000-0000-0000000${next ? '2' : '1'}${String(seq).padStart(4, '0')}`

// 2026-27 is active with monthly periods Sep (1) .. May (9); 2027-28 is upcoming.
export const CONFIG_SQL = `
  insert into academic_education_structures (id, code, name_lo, name_en) values ('${ID.structure}', 'LA-5-4-3', 'ລາວ', 'Lao');
  insert into academic_grades (id, education_structure_id, code, ordinal, level, label_lo, label_en) values
    ('${ID.g9}', '${ID.structure}', 'G9', 9, 'lower_secondary', 'ມ.4', 'Grade 9'),
    ('${ID.g10}', '${ID.structure}', 'G10', 10, 'upper_secondary', 'ມ.5', 'Grade 10'),
    ('${ID.g11}', '${ID.structure}', 'G11', 11, 'upper_secondary', 'ມ.6', 'Grade 11'),
    ('${ID.g12}', '${ID.structure}', 'G12', 12, 'upper_secondary', 'ມ.7', 'Grade 12');
  insert into academic_years (id, code, start_date, end_date, status) values
    ('${ID.year}', '2026-2027', '2026-09-01', '2027-05-31', 'active'),
    ('${ID.nextYear}', '2027-2028', '2027-09-01', '2028-05-31', 'upcoming');
  insert into academic_grading_scales (id, code, name_lo, name_en) values
    ('${ID.scale}', 'LA-0-10', 'ຄະແນນ 0–10', 'Score 0–10'),
    ('${ID.scale50}', 'S50', 'ຄະແນນ 0–50', 'Score 0–50');
  insert into academic_grading_scale_versions (id, grading_scale_id, version, scale_family, min_value, max_value, step, decimals, pass_mark, normalisable, status, approved_at) values
    ('${ID.scaleV1}', '${ID.scale}', 1, 'numeric_linear', 0, 10, 0.5, 1, 5, true, 'approved', now()),
    ('${ID.scale50V1}', '${ID.scale50}', 1, 'numeric_linear', 0, 50, 1, 0, 25, true, 'approved', now());
  insert into academic_calendar_templates (id, name, academic_year_id, scope) values
    ('${ID.calendar}', 'National 2026-27', '${ID.year}', 'national'),
    ('${ID.nextCalendar}', 'National 2027-28', '${ID.nextYear}', 'national');
  insert into academic_reporting_periods (id, calendar_template_id, period_type, term_no, sequence, label_lo, label_en, start_date, end_date)
  select ('10000000-0000-0000-0000-0000000' || y.n || lpad(m.seq::text, 4, '0'))::uuid, y.cal, 'monthly', case when m.seq <= 5 then 1 else 2 end, m.seq,
         'ເດືອນ ' || m.seq, 'Month ' || m.seq, (y.start + make_interval(months => m.seq - 1))::date, (y.start + make_interval(months => m.seq) - interval '1 day')::date
  from (values ('1', '${ID.calendar}'::uuid, date '2026-09-01'), ('2', '${ID.nextCalendar}'::uuid, date '2027-09-01')) as y(n, cal, start),
       generate_series(1, 9) as m(seq);
  insert into academic_schools (id, name_lo, romanised_name, province_code) values
    ('${ID.school}', 'ໂຮງຮຽນ ມັດທະຍົມ ທົດລອງ', 'Matthayom Thotlong', 'VT'),
    ('${ID.school50}', 'ໂຮງຮຽນ ສາກົນ', 'Sakon International', 'LP');
  update academic_schools set default_scale_id = '${ID.scale50}' where id = '${ID.school50}';
  insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max, is_default) values
    ('${ID.math}', 'MATH', 'ຄະນິດສາດ', 'Mathematics', 10, 12, true),
    ('${ID.lao}', 'LAO', 'ພາສາລາວ', 'Lao', 10, 12, true),
    ('${ID.phys}', 'PHYS', 'ຟີຊິກສາດ', 'Physics', 11, 12, true),
    ('${ID.pe}', 'PE', 'ພະລະສຶກສາ', 'PE', 10, 12, false);
  update academic_settings set value = 'true' where key = 'my_scores_enabled';
`

export const HEADERS = JSON.stringify({ 'x-forwarded-for': '203.0.113.7', 'user-agent': 'test' })

// signedInAt: seconds since epoch put in the JWT amr claim (default: now).
export function callerSql(user, { role = 'authenticated', signedInAt } = {}) {
  const claims = JSON.stringify({ sub: user ?? undefined, role, amr: [{ method: 'password', timestamp: signedInAt ?? Math.floor(Date.now() / 1000) }] })
  return `
    select set_config('request.jwt.claim.sub', '${user ?? ''}', true);
    select set_config('request.jwt.claim.role', '${role}', true);
    select set_config('request.jwt.claims', '${claims}', true);
    select set_config('request.headers', '${HEADERS}', true);
    set local role ${role};`
}

/** Binds helpers to a database: rpc() returns the result, rpcError() the raised error. */
export function apiFor(db) {
  async function rpc(user, call, opts) {
    const res = await db.exec(`begin; ${callerSql(user, opts)} select ${call} as r; commit;`)
    return res.at(-2).rows[0].r
  }
  async function rpcError(user, call, opts) {
    try {
      await db.exec(`begin; ${callerSql(user, opts)} select ${call} as r; commit;`)
      return null
    } catch (e) {
      await db.exec('rollback').catch(() => {})
      let details
      try { details = e.hint ? JSON.parse(e.hint) : undefined } catch { details = e.hint }
      return { code: e.message, status: e.code, details }
    }
  }
  const one = async (sql) => (await db.query(sql)).rows[0]
  return { rpc, rpcError, one }
}

export const json = (value) => `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
