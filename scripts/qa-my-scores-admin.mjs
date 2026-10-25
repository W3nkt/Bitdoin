// End-to-end checks for the Schooling admin screens (FE-007, #34) against a
// mocked Supabase (PostgREST, RPCs and Auth MFA), so no real data is touched.
//
//   VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test npx vite build
//   npx vite preview --port 4173 &
//   node scripts/qa-my-scores-admin.mjs
//
// Env: MY_SCORES_PREVIEW_URL (default http://127.0.0.1:4173), QA_OUTPUT (default qa-artifacts).
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const base = (process.env.MY_SCORES_PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const output = process.env.QA_OUTPUT || 'qa-artifacts'
const SUPABASE = 'https://example.supabase.co'
const USER_ID = '00000000-0000-4000-8000-0000000000a1'
await mkdir(output, { recursive: true })

function jwt(aal) {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', aud: 'authenticated', exp, aal, amr: [{ method: 'password', timestamp: exp - 3600 }] })}.sig`
}

function fixtures(role) {
  return {
    users: [
      { id: USER_ID, name: 'Admin Noy', email: 'admin@example.com', phone: null, member_code: 'ADM001', role, language: 'en', currency: 'LAK', avatar_url: null, cover_image_url: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'u-ops', name: 'Support Keo', email: 'keo@example.com', phone: '020 1111', member_code: 'OPS001', role: 'OPERATIONS' },
      { id: 'u-student', name: 'Student Dao', email: 'dao@example.com', phone: null, member_code: 'DAN9XY', role: 'CUSTOMER' },
    ],
    academic_settings: [{ key: 'admin_mfa_required', value: true }],
    academic_grades: [10, 11, 12].map(n => ({ id: `g${n}`, code: `G${n}`, ordinal: n, label_lo: `ມ.${n - 5}`, label_en: `Grade ${n}`, status: 'active' })),
    academic_subjects: [
      { id: 's-math', code: 'MATH', name_lo: 'ຄະນິດສາດ', name_en: 'Mathematics', grade_min: 10, grade_max: 12, is_default: true, status: 'active', aliases: [{ id: 'a1', alias_text: 'ເລກ', school_id: null }] },
      { id: 's-civ', code: 'CIV', name_lo: 'ສຶກສາສາດ', name_en: 'Civics', grade_min: 10, grade_max: 12, is_default: false, status: 'active', aliases: [] },
    ],
    academic_subject_aliases: [],
    academic_grading_scales: [{
      id: 'sc1', code: 'LA-0-10', name_lo: 'ຄະແນນ 0–10', name_en: '0–10 scale', status: 'active',
      versions: [
        { id: 'v1', version: 1, scale_family: 'numeric_linear', min_value: 0, max_value: 10, step: 0.5, decimals: 1, pass_mark: 5, normalisable: true, ordinal_levels: null, status: 'approved', created_by: null, approved_by: null, approved_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z' },
        { id: 'v2', version: 2, scale_family: 'numeric_linear', min_value: 0, max_value: 10, step: 0.25, decimals: 2, pass_mark: 5, normalisable: true, ordinal_levels: null, status: 'draft', created_by: USER_ID, approved_by: null, approved_at: null, created_at: '2026-10-20T00:00:00Z' },
      ],
    }],
    academic_grading_scale_versions: [],
    academic_schools: [
      { id: 'school-1', name_lo: 'ໂຮງຮຽນ ມັດທະຍົມ ທົດລອງ', name_en: 'Thotlong Secondary School', romanised_name: 'Matthayom Thotlong', province_code: 'vientiane-prefecture', district_code: '1-01', school_type: 'public', status: 'active', merged_into_id: null },
      { id: 'school-2', name_lo: 'ມັດທະຍົມ ທົດລອງ', name_en: null, romanised_name: null, province_code: 'vientiane-prefecture', district_code: null, school_type: null, status: 'active', merged_into_id: null },
    ],
    academic_review_tasks: [{ id: 't1', kind: 'unverified_school', status: 'open', enrolment_id: 'e9', payload: { school_free_text: 'ໂຮງຮຽນ ບ້ານໜອງໄຮ', province_code: 'vientiane-prefecture' }, created_at: '2026-10-22T03:00:00Z' }],
    academic_years: [{ id: 'y1', code: '2026-2027', start_date: '2026-09-01', end_date: '2027-05-31', status: 'active' }],
    academic_calendar_templates: [{
      id: 'cal1', name: 'National 2026-2027', academic_year_id: 'y1', scope: 'national', province_code: null, school_id: null, status: 'active', school: null,
      periods: [
        { id: 'p1', period_type: 'monthly', term_no: 1, sequence: 1, label_lo: 'ກັນຍາ', label_en: 'September', start_date: '2026-09-01', end_date: '2026-09-30' },
        { id: 'p-used', period_type: 'monthly', term_no: 1, sequence: 2, label_lo: 'ຕຸລາ', label_en: 'October', start_date: '2026-10-01', end_date: '2026-10-31' },
      ],
    }],
    academic_reporting_periods: [],
    academic_alerts: [
      { id: 'al1', kind: 'multi_profile_access', actor_user_id: 'u-ops', details: { profiles_24h: 4, threshold: 3, actor_role: 'support' }, status: 'open', acknowledged_at: null, created_at: '2026-10-23T09:00:00Z' },
      { id: 'al2', kind: 'backup_failed', actor_user_id: null, details: { run_url: 'https://github.com/W3nkt/Bitdoin/actions/runs/1' }, status: 'acknowledged', acknowledged_at: '2026-10-23T08:30:00Z', created_at: '2026-10-23T08:00:00Z' },
    ],
    academic_audit_events: [
      { id: 'ev1', occurred_at: '2026-10-23T08:00:00Z', actor_user_id: USER_ID, actor_role: 'admin', action: 'config.update', target_type: 'subjects', target_id: 's-math', student_profile_id: null, outcome: 'success', reason: null },
      { id: 'ev2', occurred_at: '2026-10-23T07:00:00Z', actor_user_id: 'u-ops', actor_role: 'support', action: 'support.lookup', target_type: 'student_profile', target_id: 'prof-1', student_profile_id: 'prof-1', outcome: 'success', reason: null },
      { id: 'ev3', occurred_at: '2026-10-23T06:00:00Z', actor_user_id: 'u-ops', actor_role: 'support', action: 'support.break_glass', target_type: 'student_profile', target_id: 'prof-1', student_profile_id: 'prof-1', outcome: 'success', reason: '=HYPERLINK("http://x") ticket 42' },
    ],
  }
}

function healthFixture() {
  const now = Date.now()
  const window = (read, write, calls, errors, loads, p75) => ({ read_calls: 120, read_p95_ms: read, write_calls: 30, write_p95_ms: write, slowest: null,
    calls, server_errors: errors, client_errors: 4, network_errors: 2, availability: calls ? 1 - errors / calls : null, dashboard_loads: loads, dashboard_p75_ms: p75 })
  return {
    targets: { read_p95_ms: 300, write_p95_ms: 500, availability: 0.995, dashboard_p75_ms: 2500, min_calls: 20 },
    hour: window(410, 220, 150, 0, 12, 2000),
    day: window(260, 210, 2400, 3, 80, 2000),
    month: window(240, 200, 52000, 120, 1900, 2000),
    series: Array.from({ length: 48 }, (_, i) => ({
      hour: new Date(now - (47 - i) * 3600_000).toISOString(),
      read_p95_ms: i % 6 === 0 ? null : 180 + (i % 7) * 30, write_p95_ms: i % 6 === 0 ? null : 240 + (i % 5) * 40,
      calls: i % 6 === 0 ? 0 : 40 + i, server_errors: i === 40 ? 2 : 0,
    })),
    jobs: [
      { job: 'academic-score-reminders', schedule: '5 * * * *', last_run: new Date(now - 600_000).toISOString(), last_status: 'succeeded', failed_24h: 0 },
      { job: 'academic-push-reminders', schedule: '*/15 * * * *', last_run: new Date(now - 300_000).toISOString(), last_status: 'failed', failed_24h: 1 },
    ],
    alerts: { open: 2, unsent: 0, last_error: null },
    pending_push: 0,
    backups: {
      backup: { last: { ok: true, finished_at: new Date(now - 3 * 3600_000).toISOString(), details: { bytes: 5_200_000, tables: 128, rows: 12345, migration: '123', run_url: 'https://github.com/W3nkt/Bitdoin/actions/runs/11' } },
        last_success_at: new Date(now - 3 * 3600_000).toISOString(), runs_30d: 30, failed_30d: 0 },
      drill: { last: { ok: false, finished_at: new Date(now - 2 * 86400_000).toISOString(), details: { problems: 2, rto_s: 420, run_url: 'https://github.com/W3nkt/Bitdoin/actions/runs/12' } },
        last_success_at: new Date(now - 9 * 86400_000).toISOString(), runs_30d: 4, failed_30d: 1 },
    },
  }
}

function metricsFixture() {
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
  const weeks = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, 7, 3 + i * 7)).toISOString().slice(0, 10))
  return {
    generated_at: '2026-10-25T03:00:00Z', timezone: 'Asia/Vientiane', min_group: 20, tracking_since: '2026-08-03T01:00:00Z',
    statistics: { on: 412, off: 37 },
    weeks: weeks.map((week_start, i) => ({
      week_start, profiles_created: i < 2 ? null : 20 + i * 3, onboarding_started: i < 2 ? null : 40 + i * 2, onboarding_completed: i < 2 ? null : 30 + i * 2,
      onboarding_rate: i < 2 ? null : (30 + i * 2) / (40 + i * 2), first_entry_cohort: i < 2 ? null : 20 + i * 3, first_entry_rate: i < 2 ? null : 0.55, first_entry_final: i < 10,
    })),
    months: months.map((month, i) => ({
      month, recording_students: i < 3 ? null : 120 + i * 40, active_students: i < 3 ? null : 200 + i * 50, dashboard_twice_rate: i < 3 ? null : 0.42,
      second_month_base: i < 4 ? null : 60, second_month_rate: i < 4 ? null : 0.61, entry_duration_p50_ms: i < 3 ? null : 185000,
      period_expected: i < 3 ? null : 300, period_completion_rate: i < 3 ? null : 0.58, complete: i < 5,
    })),
    cohorts: months.map((month, i) => ({ month, size: i < 3 ? null : 90, m1_rate: i < 3 ? null : (i < 5 ? 0.66 : null), m3_rate: null, m1_due: i < 5, m3_due: i < 2 })),
    sources: [{ source: 'academy_menu', profiles: 210, share: 0.7 }, { source: 'reminder', profiles: 75, share: 0.25 }, { source: 'other', profiles: null, share: null }],
    grades: [{ grade_code: 'G10', recording_students: 160 }, { grade_code: 'G12', recording_students: null }],
    ratings: { usefulness: { respondents: 120, share_4_or_5: 0.66 }, entry_ease: { respondents: 118, share_4_or_5: 0.74 } },
    pilot: {
      first_entry_rate: 0.62, first_entry_cohort: 140, second_month_rate: 0.45, second_month_base: 90,
      returning_entry_p50_ms: 160000, returning_entries: 210, usefulness_rate: 0.66, usefulness_respondents: 120,
    },
  }
}

function backend({ role = 'ADMIN', aal = 'aal1', factors = [] } = {}) {
  const state = {
    calls: [], writes: [], factors: [...factors], tables: fixtures(role), token: jwt(aal),
    pilot: { pilot_mode: false, cohorts: [{ id: 'pc1', code: 'ABC234', name: 'Matthayom Thotlong', school_id: null, school_name: null, max_students: 60, active: true, created_at: '2026-10-25T04:00:00Z', students: 41 }] },
  }
  const user = () => ({ id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'admin@example.com', app_metadata: {}, user_metadata: {}, factors: state.factors })

  const rpc = {
    academic_admin_create_scale_version: () => 'v3',
    academic_admin_approve_scale_version: (args) => ({ id: args.p_version_id, status: 'approved' }),
    academic_admin_merge_schools: () => ({ enrolments_moved: 3 }),
    academic_admin_resolve_school_task: (args) => ({ task_id: args.p_task_id, status: args.p_school_id ? 'resolved' : 'dismissed' }),
    academic_admin_create_school_calendar: () => 'cal2',
    academic_admin_set_user_role: (args) => ({ user_id: args.p_user_id, role: args.p_role }),
    academic_support_lookup: (args) => args.p_user_ref.toUpperCase().includes('DAN9XY') ? {
      user: { id: 'u-student', member_code: 'DAN9XY', role: 'CUSTOMER' },
      profile: { id: 'prof-1', status: 'active', consent_state: 'active', age_band: '16_17', deletion_requested_at: null, deletion_scope: null, created_at: '2026-10-01T02:00:00Z' },
      enrolments: [{ id: 'e1', academic_year: '2026-2027', grade: 'G11', state: 'active', closed_reason: null, school_verification: 'verified', submitted_periods: 2, draft_periods: 1 }],
      consents: [{ purpose: 'module_processing', notice_version: '2026-10', granted_at: '2026-10-01T02:00:00Z', withdrawn_at: null }],
    } : { error: { code: 'NOT_FOUND', status: 404 } },
    academic_admin_health: () => healthFixture(),
    academic_admin_usage_metrics: (args) => ({ ...metricsFixture(), cohort_id: args.p_cohort ?? null }),
    academic_admin_list_pilot: () => state.pilot,
    academic_admin_save_pilot_cohort: (args) => {
      const input = args.p_input
      if (input.id) Object.assign(state.pilot.cohorts.find(c => c.id === input.id), input)
      else state.pilot.cohorts.push({ id: `pc${state.pilot.cohorts.length + 1}`, code: 'K7MQ2X', school_name: null, created_at: '2026-10-25T05:00:00Z', students: 0, active: true, ...input })
      return state.pilot
    },
    academic_admin_set_pilot_mode: (args) => { state.pilot.pilot_mode = args.p_enabled; return state.pilot },
    academic_admin_test_alert: () => ({ id: 'al-test' }),
    academic_support_break_glass: () => ({ session_id: 'bg1', expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
    academic_support_view_scores: () => ({
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      enrolments: [{
        enrolment_id: 'e1', academic_year: '2026-2027', grade: { code: 'G11', label_lo: 'ມ.6', label_en: 'Grade 11' }, school: { id: 'school-1', name_lo: 'x', name_en: 'x', verification: 'verified' },
        state: 'active', closed_reason: null, read_only: false,
        terms: [{ term_no: 1, periods: [{ id: 'p1', key: '2026-09', period_type: 'monthly', term_no: 1, sequence: 1, label_lo: 'ກັນຍາ', label_en: 'September', start_date: '2026-09-01', end_date: '2026-09-30',
          entry: { id: 'en1', state: 'submitted', submitted_at: '2026-10-02T00:00:00Z', source: 'manual' },
          lines: [{ subject_enrolment_id: 'se1', code: 'MATH', name_lo: 'ຄະນິດສາດ', name_en: 'Mathematics', line: { id: 'l1', status: 'scored', value: 7.5, normalised_value: 0.75, source: 'manual', verification: 'self_reported', edited: false, version: 1 } }] }] }],
      }],
    }),
  }

  function matches(row, params) {
    for (const [key, raw] of params) {
      if (['select', 'order', 'limit', 'offset', 'or', 'columns'].includes(key)) continue
      const [op, ...rest] = raw.split('.')
      const value = rest.join('.')
      const cell = row[key]
      if (op === 'eq' && String(cell) !== value) return false
      if (op === 'neq' && String(cell) === value) return false
      if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/"/g, '')).includes(String(cell))) return false
      if (op === 'like' && !new RegExp(`^${value.replace(/[.]/g, '\\.').replace(/[%*]/g, '.*')}$`).test(String(cell))) return false
    }
    const or = params.get('or')
    if (or) {
      const term = /ilike\.[%*]([^%*]+)[%*]/.exec(or)?.[1]?.toLowerCase()
      if (term && !JSON.stringify(row).toLowerCase().includes(term)) return false
    }
    return true
  }

  async function handle(route) {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) })

    if (url.pathname === '/functions/v1/academic-alerts') {
      state.calls.push({ fn: 'fn academic-alerts', args: request.postDataJSON() })
      return json({ claimed: 1, sent: 1, failed: 0 })
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      const path = url.pathname.replace('/auth/v1', '')
      state.calls.push({ fn: `auth ${method} ${path}`, args: request.postDataJSON?.() ?? null })
      if (path === '/factors' && method === 'POST') {
        state.factors.push({ id: 'f1', factor_type: 'totp', status: 'unverified', friendly_name: 'Bitdoin admin' })
        return json({ id: 'f1', type: 'totp', friendly_name: 'Bitdoin admin', totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x' } })
      }
      if (/\/factors\/[^/]+\/challenge$/.test(path)) return json({ id: 'ch1', type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 })
      if (/\/factors\/[^/]+\/verify$/.test(path)) {
        if (request.postDataJSON()?.code !== '123456') return json({ code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' }, 422)
        state.factors = state.factors.map(factor => ({ ...factor, status: 'verified' }))
        state.token = jwt('aal2')
        return json({ access_token: state.token, token_type: 'bearer', expires_in: 3600, refresh_token: 'refresh2', user: user() })
      }
      if (path === '/token') return json({ access_token: state.token, token_type: 'bearer', expires_in: 3600, refresh_token: 'refresh3', user: user() })
      return json(user())
    }

    const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/)
    if (rpcMatch) {
      const args = request.postDataJSON() ?? {}
      state.calls.push({ fn: rpcMatch[1], args })
      const handler = rpc[rpcMatch[1]]
      return json(handler ? handler(args) : null)
    }

    const table = url.pathname.replace('/rest/v1/', '')
    const rows = state.tables[table] ?? []
    const body = request.postData() ? request.postDataJSON() : null
    if (method !== 'GET' && method !== 'HEAD') state.writes.push({ table, method, query: url.search, body })
    if (method === 'DELETE') {
      if (table === 'academic_reporting_periods' && url.searchParams.get('id') === 'eq.p-used') {
        return json({ code: '23503', message: 'update or delete on table "academic_reporting_periods" violates foreign key constraint', details: null, hint: null }, 409)
      }
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'PATCH') {
      rows.filter(row => matches(row, url.searchParams)).forEach(row => Object.assign(row, body))
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'POST') {
      const inserted = (Array.isArray(body) ? body : [body]).map((item, i) => ({ id: `new-${table}-${state.writes.length}-${i}`, ...item }))
      rows.push(...inserted)
      return (request.headers().prefer ?? '').includes('return=representation') ? json(inserted, 201) : route.fulfill({ status: 201, body: '' })
    }
    const found = rows.filter(row => matches(row, url.searchParams))
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? found.length)
    const page = found.slice(offset, offset + limit)
    const headers = { 'content-range': `${offset}-${offset + Math.max(page.length - 1, 0)}/${found.length}`, 'access-control-expose-headers': 'content-range', 'access-control-allow-origin': '*' }
    if ((request.headers().accept ?? '').includes('vnd.pgrst.object')) return json(page[0] ?? null, 200, headers)
    return json(page, 200, headers)
  }
  return { state, handle }
}

async function isolate(context) {
  await context.route(url => !url.href.startsWith(base) && !url.href.startsWith(SUPABASE), route => route.abort())
}

async function openAs(browser, options = {}, device = { viewport: { width: 1280, height: 900 } }) {
  const context = await browser.newContext({ ...device, locale: 'en-GB', acceptDownloads: true })
  await isolate(context)
  const mock = backend(options)
  await context.route(`${SUPABASE}/**`, mock.handle)
  await context.addInitScript(({ token, userId }) => {
    localStorage.setItem('pwen_lang', 'en')
    localStorage.setItem('sb-example-auth-token', JSON.stringify({
      access_token: token, refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'admin@example.com', app_metadata: {}, user_metadata: {}, factors: [] },
    }))
  }, { token: mock.state.token, userId: USER_ID })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, mock, errors }
}

async function shot(page, name) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
}

async function axe(page) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ['violations'] })
    return result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)
  })
  assert.deepEqual(violations, [], `axe violations: ${violations.join(', ')}`)
}

const lastCall = (mock, fn) => [...mock.state.calls].reverse().find(call => call.fn === fn)
const lastWrite = (mock, table, method) => [...mock.state.writes].reverse().find(write => write.table === table && write.method === method)
const browser = await chromium.launch()
const results = []
const pass = (line) => { results.push(line); console.log(`ok  ${line}`) }
const VERIFIED = [{ id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'Bitdoin admin' }]

try {
  // MFA setup: no authenticator yet -> QR + key -> wrong code -> right code -> admin opens.
  {
    const { context, page, mock, errors } = await openAs(browser)
    await page.goto(`${base}/academy-admin/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Two-step verification required' }).waitFor()
    assert.equal(mock.state.calls.some(call => call.fn === 'academic_admin_set_user_role'), false)
    await page.getByRole('button', { name: 'Set up authenticator app' }).click()
    await page.getByRole('img', { name: 'QR code for your authenticator app' }).waitFor()
    await page.getByText('JBSWY3DPEHPK3PXP').waitFor()
    await shot(page, 'admin-1-mfa-setup')
    await axe(page)
    const code = page.getByLabel('6-digit code')
    await code.fill('000000')
    await page.getByRole('button', { name: 'Verify' }).click()
    await page.getByRole('alert').filter({ hasText: 'That code did not work' }).waitFor()
    await code.fill('123456')
    await page.getByRole('button', { name: 'Verify' }).click()
    await page.getByRole('heading', { name: 'Subjects', exact: true }).waitFor()
    assert.ok(lastCall(mock, 'auth POST /factors/f1/challenge'))
    assert.deepEqual(errors, [])
    await context.close()
    pass('MFA: setup with QR and key, wrong code rejected, right code opens the admin (aal2)')
  }

  // Returning admin with an authenticator: code prompt, no setup.
  {
    const { context, page, errors } = await openAs(browser, { factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: "Confirm it's you" }).waitFor()
    await page.getByLabel('6-digit code').fill('123456')
    await page.getByRole('button', { name: 'Verify' }).click()
    await page.getByRole('heading', { name: 'Subjects', exact: true }).waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('MFA: existing authenticator asks for a code only')
  }

  // Subjects: edit, alias add/remove; axe on an aal2 session.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=subjects`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ສຶກສາສາດ').waitFor()
    await shot(page, 'admin-2-subjects')
    await axe(page)
    await page.getByRole('button', { name: 'Edit Civics' }).click()
    await page.getByLabel('English name').fill('Civic education')
    await page.getByLabel('Pre-select for new students in these grades').check()
    await page.getByRole('button', { name: 'Save subject' }).click()
    await page.getByText('Subject saved.').waitFor()
    const patch = lastWrite(mock, 'academic_subjects', 'PATCH')
    assert.equal(patch.query, '?id=eq.s-civ')
    assert.deepEqual(patch.body, { code: 'CIV', name_lo: 'ສຶກສາສາດ', name_en: 'Civic education', grade_min: 10, grade_max: 12, is_default: true, status: 'active' })
    await page.getByLabel('Add alias for Mathematics').fill('ຄະນິດ')
    await page.getByLabel('Add alias for Mathematics').press('Enter')
    await page.waitForTimeout(300)
    assert.equal(lastWrite(mock, 'academic_subject_aliases', 'POST').body.alias_text, 'ຄະນິດ')
    await page.getByRole('button', { name: 'Remove alias ເລກ' }).click()
    await page.waitForTimeout(300)
    assert.equal(lastWrite(mock, 'academic_subject_aliases', 'DELETE').query, '?id=eq.a1')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Subjects: edit saves exact fields, aliases added and removed, axe clean')
  }

  // Scales: a change is a new draft version; approve a draft.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=scales`, { waitUntil: 'domcontentloaded' })
    await page.getByText('0–10, step 0.5, 1 decimals, pass 5, comparable').waitFor()
    await page.getByRole('button', { name: 'New version' }).click()
    await page.getByLabel('Pass mark').fill('11')
    await page.getByText('Pass mark must be between minimum and maximum.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Save as draft' }).isDisabled(), true)
    await page.getByLabel('Pass mark').fill('6')
    await page.getByRole('button', { name: 'Save as draft' }).click()
    await page.getByText('Draft version saved').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_create_scale_version').args, {
      p_scale_id: 'sc1', p_fields: { scale_family: 'numeric_linear', min_value: 0, max_value: 10, step: 0.5, decimals: 1, pass_mark: 6, normalisable: true, ordinal_levels: null },
    })
    await page.getByRole('button', { name: 'Approve' }).click()
    await page.getByText('v2 approved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_approve_scale_version').args, { p_version_id: 'v2' })
    await shot(page, 'admin-3-scales')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Scales: invalid pass mark blocked, new draft version sent from the approved one, draft approved')
  }

  // Schools: merge needs a target and a reason; unverified school linked.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=schools`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ໂຮງຮຽນ ບ້ານໜອງໄຮ').waitFor()
    await shot(page, 'admin-4-schools')
    await axe(page)
    await page.getByRole('button', { name: 'Merge ມັດທະຍົມ ທົດລອງ into another school' }).click()
    const dialog = page.getByRole('dialog')
    const merge = dialog.getByRole('button', { name: 'Merge' })
    assert.equal(await merge.isDisabled(), true)
    await dialog.getByRole('radio').first().check()
    await dialog.getByLabel('Reason (saved in the audit log)').fill('Duplicate entry')
    await merge.click()
    await page.getByText('Merged. 3 enrolment(s) moved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_merge_schools').args, { p_from_id: 'school-2', p_into_id: 'school-1', p_reason: 'Duplicate entry' })
    await page.getByRole('button', { name: 'Link to school' }).click()
    await page.getByRole('dialog').getByRole('radio').first().check()
    await page.getByRole('dialog').getByRole('button', { name: 'Link', exact: true }).click()
    await page.getByText('Linked.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_resolve_school_task').args, { p_task_id: 't1', p_school_id: 'school-1', p_note: null })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Schools: merge requires target and reason, sends both; typed school linked to the catalogue')
  }

  // Calendars: period with submitted scores cannot be deleted; school calendar created.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=calendars`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Calendars for 2026-2027' }).waitFor()
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Delete October' }).click()
    await page.getByText('This is still in use').waitFor()
    await page.getByRole('button', { name: 'Edit September' }).click()
    await page.getByLabel('Ends').fill('2026-09-29')
    await page.getByRole('button', { name: 'Save period' }).click()
    await page.getByText('Period saved.').waitFor()
    assert.equal(lastWrite(mock, 'academic_reporting_periods', 'PATCH').body.end_date, '2026-09-29')
    await page.getByRole('button', { name: 'School calendar' }).click()
    await page.getByRole('dialog').getByRole('radio').first().check()
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click()
    await page.getByText('School calendar created.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_create_school_calendar').args, { p_school_id: 'school-1', p_year_id: 'y1', p_overrides: [] })
    await shot(page, 'admin-5-calendars')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Calendars: used period not deletable (clear message), period edited, school calendar copied')
  }

  // Roles: change with a reason.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=roles`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Support Keo').waitFor()
    assert.equal(await page.getByText('Student Dao').count(), 0) // only staff until searching
    await page.getByRole('button', { name: 'Change role' }).nth(1).click()
    await page.getByRole('radio', { name: /Finance/ }).check()
    assert.equal(await page.getByRole('button', { name: 'Save role' }).isDisabled(), true)
    await page.getByLabel('Reason (saved in the audit log)').fill('Moved to finance team')
    await page.getByRole('button', { name: 'Save role' }).click()
    await page.getByText('Support Keo is now Finance.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_set_user_role').args, { p_user_id: 'u-ops', p_role: 'FINANCE', p_reason: 'Moved to finance team' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Roles: staff listed, change needs a reason, sent to the audited RPC')
  }

  // Support (OPERATIONS): only support and audit; no scores until emergency access with a reason.
  {
    const { context, page, mock, errors } = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=subjects`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    const tabs = await page.getByRole('navigation', { name: 'Schooling admin sections' }).getByRole('button').allInnerTexts()
    assert.deepEqual(tabs.map(text => text.trim()), ['Support', 'Audit log'])
    await page.getByLabel('Member code or user ID').fill('BA-ACA-NOPE00')
    await page.getByRole('button', { name: 'Look up' }).click()
    await page.getByText('No Schooling account for that reference.').waitFor()
    await page.getByLabel('Member code or user ID').fill('BA-ACA-DAN9XY')
    await page.getByRole('button', { name: 'Look up' }).click()
    await page.getByRole('heading', { name: 'Member DAN9XY' }).waitFor()
    assert.equal(await page.getByText('7.5').count(), 0)
    await page.getByRole('button', { name: 'Emergency access to scores' }).click()
    await page.getByLabel('Reason (saved in the audit log)').fill('short')
    assert.equal(await page.getByRole('button', { name: 'Open for 30 minutes' }).isDisabled(), true)
    await page.getByLabel('Reason (saved in the audit log)').fill('Ticket 42: student says October scores vanished')
    await page.getByRole('button', { name: 'Open for 30 minutes' }).click()
    await page.getByRole('heading', { name: 'Scores (emergency access)' }).waitFor()
    await page.getByText('7.5').waitFor()
    await page.getByText(/Closes in (29|30):\d\d/).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_support_break_glass').args, { p_student_profile_id: 'prof-1', p_reason: 'Ticket 42: student says October scores vanished' })
    await shot(page, 'admin-6-support')
    await axe(page)
    await page.getByRole('button', { name: 'Audit log' }).click()
    await page.getByRole('heading', { name: 'Audit log' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Export CSV' }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Alerts to review' }).count(), 0)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Support (Operations): two tabs only, lookup without scores, emergency access needs 10+ char reason, 30-min countdown, no CSV export or alerts')
  }

  // Audit (ADMIN): filters reach the query; CSV export neutralises formulas.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=audit`, { waitUntil: 'domcontentloaded' })
    await page.getByText('3 entries · page 1 of 1').waitFor()
    await page.getByText("Opened 4 students' records in 24 hours").waitFor()
    await page.getByText('1 open').waitFor()
    await page.getByText('Nightly database backup failed').waitFor()
    assert.equal(await page.getByText(/^System · /).count(), 1, 'operational alerts have no actor')
    await page.getByRole('button', { name: 'Mark reviewed' }).click()
    await page.getByText('All reviewed').waitFor()
    const ack = lastWrite(mock, 'academic_alerts', 'PATCH')
    assert.equal(ack.query, '?id=eq.al1&status=eq.open')
    assert.deepEqual([ack.body.status, ack.body.acknowledged_by], ['acknowledged', USER_ID])
    await page.getByLabel('Action').selectOption('support.')
    await page.getByRole('button', { name: 'Apply' }).click()
    await page.getByText('2 entries · page 1 of 1').waitFor()
    await page.getByText('Support Keo · OPS001').first().waitFor()
    await shot(page, 'admin-7-audit')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
    const csv = await readFile(await download.path(), 'utf8')
    assert.match(csv, /^\uFEFFoccurred_at,actor_user_id,actor_role,action/)
    assert.match(csv, /"'=HYPERLINK\(""http:\/\/x""\) ticket 42"/)
    assert.equal(csv.trim().split('\r\n').length, 3)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Audit: alert reviewed (who and when saved), operational alerts titled, action filter applied, actor names shown, CSV export with formula cells neutralised')
  }

  // Health (OPS-002): service levels with verdicts, charts with table views, jobs, test alert.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=health`, { waitUntil: 'domcontentloaded' })
    const tiles = page.getByRole('region', { name: 'Service levels' })
    await tiles.getByText('99.77%').waitFor()
    assert.equal(await tiles.getByText('Missed').count(), 1, 'reads p95 410 ms > 300 ms')
    assert.equal(await tiles.getByText('Met').count(), 3)
    await page.locator('.recharts-line-curve').first().waitFor()
    await page.getByText('academic-push-reminders').waitFor()
    const backups = page.locator('section', { has: page.getByRole('heading', { name: 'Backups' }) })
    await backups.getByText('5.2 MB').waitFor()
    await backups.getByText('7 min (target 4 h)').waitFor()
    assert.equal(await backups.getByText('Met').count(), 1, 'backup 3 h old')
    assert.equal(await backups.getByText('Missed').count(), 1, 'latest drill failed')
    await backups.getByText(/The latest run failed on/).waitFor()
    assert.equal(await backups.getByRole('link', { name: 'Open the workflow run' }).count(), 2)
    await shot(page, 'admin-9-health')
    await axe(page)
    await page.getByRole('button', { name: 'Show table' }).first().click()
    await page.getByRole('columnheader', { name: 'Read p95' }).waitFor()
    await page.getByRole('button', { name: 'Send test alert' }).click()
    await page.getByText('Test alert sent. Check the on-call inbox.').waitFor()
    assert.ok(lastCall(mock, 'academic_admin_test_alert'))
    assert.deepEqual(lastCall(mock, 'fn academic-alerts').args, { action: 'deliver' })
    assert.deepEqual(errors, [])
    await context.close()
    const ops = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await ops.page.goto(`${base}/academy-admin/scores?tab=health`, { waitUntil: 'domcontentloaded' })
    await ops.page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    assert.equal(await ops.page.getByRole('button', { name: 'Health' }).count(), 0)
    await ops.context.close()
    pass('Health: verdicts per target (icon + label), latency and error charts with table views, job results, backup and drill status, test alert queued and e-mailed; Operations has no Health tab')
  }

  // Metrics (ANL-002): headline tiles, small groups hidden, pending rates, definitions, admin only.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=metrics`, { waitUntil: 'domcontentloaded' })
    const tiles = page.getByRole('region', { name: 'Headline metrics' })
    await tiles.getByText(/^Recording students, Sept? 2026$/).waitFor()
    await tiles.getByText('280').waitFor()
    await tiles.getByText('This month so far: 320').waitFor()
    await page.getByText('Students with usage statistics on: 412; off: 37.', { exact: false }).waitFor()
    await page.locator('.recharts-line-curve').first().waitFor()
    const funnel = page.locator('section', { has: page.getByRole('heading', { name: 'Weekly funnel' }) })
    assert.ok(await funnel.getByText('<20').count() >= 2, 'small weekly groups hidden')
    assert.equal(await funnel.getByText('not yet').count(), 2, 'first-entry rates of the last two weeks pending')
    const monthly = page.locator('section', { has: page.getByRole('heading', { name: 'Monthly recording' }) })
    await monthly.getByText('Oct 2026 (so far)').waitFor()
    await monthly.getByText('3.1 min').first().waitFor()
    await page.getByText('Profile page link').count().then(n => assert.equal(n, 0))
    await page.getByText('Academy menu').waitFor()
    // Pilot go/no-go (PRD §36.4): 62% go, 45% iterate, 160 s stop, 66% go, 74% easy fails the UAT 80%.
    const gate = page.locator('section', { has: page.getByRole('heading', { name: 'Pilot go / no-go' }) })
    const readings = await gate.locator('tbody tr').evaluateAll(rows => rows.map(row => [row.cells[0].textContent, row.cells[1].textContent, row.cells[3].textContent]))
    assert.deepEqual(readings, [
      ['First entry within 7 days', '62.0%', 'Go'], ['Second-month recording', '45.0%', 'Iterate'], ['Median entry time, returning', '160 s', 'Stop / rethink'],
      ['Usefulness rated 4–5', '66.0%', 'Go'], ['Entry rated easy (4–5), UAT exit', '74.0%', 'Stop / rethink'],
    ])
    await shot(page, 'admin-10-metrics')
    await axe(page)
    await page.getByRole('button', { name: 'Show table' }).first().click()
    await page.getByRole('columnheader', { name: 'Recording students' }).waitFor()
    // One pilot cohort.
    await page.getByLabel('Showing').selectOption({ label: 'Pilot: Matthayom Thotlong' })
    await page.waitForTimeout(300)
    assert.deepEqual(lastCall(mock, 'academic_admin_usage_metrics').args, { p_cohort: 'pc1' })
    assert.deepEqual(errors, [])
    await context.close()
    const ops = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await ops.page.goto(`${base}/academy-admin/scores?tab=metrics`, { waitUntil: 'domcontentloaded' })
    await ops.page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    assert.equal(await ops.page.getByRole('button', { name: 'Metrics' }).count(), 0)
    await ops.context.close()
    pass('Metrics: headline tiles, pilot go/no-go readings, monthly chart with table view, groups under 20 hidden, pending rates marked, per-cohort view; Operations has no Metrics tab')
  }

  // Pilot (REL-001): cohorts with codes, a new cohort, and the gate switched with a reason.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=pilot`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ABC234').waitFor()
    await page.getByText('41 / 60').waitFor()
    await page.getByText('Off: anyone in the Academy can set up Schooling').waitFor()
    await page.getByRole('button', { name: 'New cohort' }).click()
    await page.getByLabel('Cohort name').fill('Youth club Pakse')
    await page.getByLabel('Cap (optional)').fill('40')
    await page.getByRole('button', { name: 'Create and get a code' }).click()
    await page.getByText('K7MQ2X').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_save_pilot_cohort').args.p_input, { name: 'Youth club Pakse', school_id: null, max_students: 40 })
    await page.getByRole('button', { name: 'Turn the gate on' }).click()
    const confirm = page.getByRole('button', { name: 'Turn on' })
    assert.equal(await confirm.isDisabled(), true, 'a reason is required')
    await page.getByLabel('Reason (saved in the audit log)').fill('Pilot starts with two schools')
    await confirm.click()
    await page.getByText('On: new students need a code').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_set_pilot_mode').args, { p_enabled: true, p_reason: 'Pilot starts with two schools' })
    await shot(page, 'admin-11-pilot')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Pilot: cohorts listed with codes and counts, new cohort gets a code, gate switched on with an audited reason')
  }

  // Finance: no access; phone width has no horizontal scroll.
  {
    const { context, page, errors } = await openAs(browser, { role: 'FINANCE', aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'No Schooling access' }).waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    const phone = await openAs(browser, { aal: 'aal2', factors: VERIFIED }, devices['Pixel 7'])
    await phone.page.goto(`${base}/academy-admin/scores?tab=schools`, { waitUntil: 'domcontentloaded' })
    await phone.page.getByText('ໂຮງຮຽນ ບ້ານໜອງໄຮ').waitFor()
    assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await shot(phone.page, 'admin-8-schools-phone')
    assert.deepEqual(phone.errors, [])
    await phone.context.close()
    pass('Finance: no access message; phone width: no horizontal scroll')
  }

  console.log(`\n${results.length} scenarios passed`)
} finally {
  await browser.close()
}
