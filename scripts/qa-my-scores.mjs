// End-to-end checks for the Schooling onboarding and profile screens
// (FE-001/FE-002) on Android Chrome (Pixel 7 emulation, Lao) and desktop
// (English), against a mocked Supabase so no real data is touched.
//
//   VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_ANON_KEY=test npx vite build
//   npx vite preview --port 4173 &
//   node scripts/qa-my-scores.mjs
//
// Env: MY_SCORES_PREVIEW_URL (default http://127.0.0.1:4173), QA_OUTPUT (default qa-artifacts).
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices } from 'playwright'

const base = (process.env.MY_SCORES_PREVIEW_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const output = process.env.QA_OUTPUT || 'qa-artifacts'
const SUPABASE = 'https://example.supabase.co'
const USER_ID = '00000000-0000-4000-8000-0000000000a1'
await mkdir(output, { recursive: true })

const GRADES = [10, 11, 12].map(n => ({
  id: `g${n}`, code: `G${n}`, ordinal: n, level: 'upper_secondary', label_lo: `ມ.${n - 5}`, label_en: `Grade ${n}`,
}))
const SUBJECTS = [
  ['MATH', 'ຄະນິດສາດ', 'Mathematics', 10, 12, true],
  ['PHYS', 'ຟີຊິກສາດ', 'Physics', 11, 12, true],
  ['LAO', 'ພາສາລາວ', 'Lao Language & Literature', 10, 12, true],
  ['PE', 'ພະລະສຶກສາ', 'Physical education', 10, 12, false],
].map(([code, name_lo, name_en, grade_min, grade_max, is_default]) => ({ id: `s-${code}`, code, name_lo, name_en, grade_min, grade_max, is_default }))
const SCHOOLS = [{ id: 'school-1', name_lo: 'ໂຮງຮຽນ ມັດທະຍົມ ທົດລອງ', name_en: 'Thotlong Secondary School', romanised_name: 'Matthayom Thotlong', province_code: 'vientiane-prefecture', district_code: null }]

function fakeJwt() {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', aud: 'authenticated', exp })}.sig`
}

/** A mocked backend whose session moves through the module states. */
function backend(initial) {
  const state = { calls: [], ...initial }
  const session = () => ({
    user: { id: USER_ID, role: 'CUSTOMER', language: state.lang },
    module_enabled: true,
    notice_version: '2026-10-draft',
    next_step: state.step,
    profile: state.step === 'onboarding' ? null : {
      id: 'p1', display_name: 'Noy', age_band: '16_17', status: 'active',
      consent_state: state.consentState ?? 'active', version: state.version ?? 1,
    },
    active_enrolment_id: state.enrolment ?? null,
    consent: { module_processing: state.step !== 'consent', notice_version: '2026-10-draft' },
  })
  const rpc = {
    academic_get_session: () => session(),
    academic_search_schools: (args) => SCHOOLS.filter(s => `${s.name_lo} ${s.name_en} ${s.romanised_name}`.toLowerCase().includes(args.p_query.toLowerCase().slice(0, 3))),
    academic_create_profile: () => { state.step = 'ready'; state.enrolment = 'e1'; return { created: true, profile_id: 'p1', enrolment_id: 'e1' } },
    academic_grant_consent: (args) => {
      state.step = 'ready'
      state.consents.push({ id: `c${state.consents.length + 1}`, purpose: args.p_purpose, notice_version: args.p_notice_version, granted_at: '2026-10-23T05:00:00Z', withdrawn_at: null })
      return { consents: state.consents }
    },
    academic_transition_enrolment: (args) => { state.step = args.p_input.kind === 'left' ? 'new_school_year' : 'ready'; if (args.p_input.kind === 'left') state.enrolment = null; return { closed_enrolment_id: 'e0', enrolment_id: 'e1' } },
    academic_get_history: () => state.history ?? ({ enrolments: [{ enrolment_id: 'e0', academic_year: '2025-2026', grade: { code: 'G11', label_lo: 'ມ.6', label_en: 'Grade 11' }, school: { id: 'school-1', name_lo: SCHOOLS[0].name_lo, name_en: SCHOOLS[0].name_en, verification: 'verified' }, state: 'active', closed_reason: null, read_only: false }] }),
    academic_get_my_data_summary: () => ({
      profile: { id: 'p1', display_name: state.name ?? 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', district_code: '1-01', goals: null, interest_subject_codes: [], status: state.deletion?.status ?? state.profileStatus ?? 'active', version: state.version ?? 1 },
      counts: { enrolments: 1, score_entries_submitted: 2, score_entries_draft: 1, scores: 6, corrections: 1, uploads: 0, guardian_links: 0 },
      consents: state.consents,
      deletion: state.deletion ?? { status: state.profileStatus ?? 'active', deletion_scope: null, deletion_requested_at: null, deletion_scheduled_for: null },
    }),
    academic_withdraw_consent: (args) => {
      const consent = state.consents.find(c => c.purpose === args.p_purpose && !c.withdrawn_at)
      if (consent) consent.withdrawn_at = '2026-10-23T05:00:00Z'
      if (args.p_purpose === 'module_processing') state.profileStatus = 'read_only'
      return { consents: state.consents }
    },
    academic_export_my_data: () => state.exportReauth ? pgError(401, 'REAUTH_REQUIRED', { max_age_minutes: 15 }) : ({
      format_version: 1, generated_at: '2026-10-23T05:00:00Z',
      profile: { id: 'p1', display_name: 'Noy' }, enrolments: [{ id: 'e1', academic_year: '2026-2027' }],
      scores: [{ academic_year: '2026-2027', period: 'October', subject_code: 'MATH', subject: 'ຄະນິດສາດ', status: 'scored', raw_value: 7.5 }],
      revisions: [], consents: state.consents,
    }),
    academic_request_deletion: (args) => {
      if (state.reauth) return pgError(401, 'REAUTH_REQUIRED', { max_age_minutes: 15 })
      state.deletion = { status: 'deletion_pending', deletion_scope: args.p_scope, deletion_requested_at: '2026-10-23T05:00:00Z', deletion_scheduled_for: '2026-11-06T05:00:00Z' }
      return state.deletion
    },
    academic_cancel_deletion: () => { state.deletion = null; return { status: 'active', deletion_scope: null, deletion_requested_at: null, deletion_scheduled_for: null } },
    academic_update_profile: (args) => { state.version = (state.version ?? 1) + 1; state.name = args.p_changes.display_name; return { profile_id: 'p1', version: state.version } },
    academic_list_periods: () => ({ enrolment_id: 'e1', read_only: false, suggested_period_id: 'm1', periods: [1, 2, 3].map(seq => ({ id: `m${seq}`, key: `2026-${8 + seq}`, period_type: 'monthly', term_no: 1, sequence: seq, label_lo: `ເດືອນ ${seq}`, label_en: ['September', 'October', 'November'][seq - 1], state: state.entries[`m${seq}`]?.state ?? 'empty', disabled: seq === 3 })) }),

    // Score entry (FE-003): one entry per period, lines keyed by subject.
    academic_get_score_entry: (args) => entryView(args.p_period_id),
    academic_save_draft: (args) => {
      const entry = state.entries[args.p_period_id] ??= { state: 'draft', version: 1, lines: {} }
      if (entry.state === 'submitted') return pgError(409, 'ENTRY_SUBMITTED')
      for (const line of args.p_lines) {
        if (line.clear) delete entry.lines[line.subject_enrolment_id]
        else entry.lines[line.subject_enrolment_id] = { status: line.status, value: line.value ?? null, version: 1, edited: false }
      }
      entry.version += 1
      return entryView(args.p_period_id)
    },
    academic_submit_score_entry: (args) => {
      const entry = state.entries[args.p_period_id] ??= { state: 'draft', version: 1, lines: {} }
      if (entry.state === 'submitted') {
        return entry.key === args.p_idempotency_key ? { ...entryView(args.p_period_id), replayed: true } : pgError(409, 'SCORE_DUPLICATE', { score_entry_id: 'x' })
      }
      entry.lines = Object.fromEntries(args.p_lines.map(line => [line.subject_enrolment_id, { status: line.status, value: line.value ?? null, version: 1, edited: false }]))
      Object.assign(entry, { state: 'submitted', key: args.p_idempotency_key, submitted_at: '2026-10-20T03:00:00Z' })
      return entryView(args.p_period_id)
    },
    academic_correct_score_line: (args) => {
      const [periodId, seId] = args.p_line_id.split(':')
      const line = state.entries[periodId].lines[seId]
      if (args.p_expected_version !== line.version) return pgError(409, 'VERSION_CONFLICT')
      state.revisions.push({ old_value: line.value, new_value: args.p_line.value ?? null, old_status: line.status, new_status: args.p_line.status, changed_by: 'student', reason: args.p_reason, changed_at: '2026-10-22T03:00:00Z' })
      Object.assign(line, { status: args.p_line.status, value: args.p_line.value ?? null, version: line.version + 1, edited: true })
      return { id: args.p_line_id, ...line }
    },
    academic_get_line_revisions: (args) => ({ score_line_id: args.p_line_id, revisions: [...state.revisions].reverse() }),
    academic_get_dashboard: () => state.dashboard ?? emptyDashboard(),
    academic_list_notifications: (args) => ({
      items: state.notes.filter(n => n.state === 'sent' || n.state === 'read').slice(0, args.p_limit ?? 20),
      unread_count: state.notes.filter(n => n.state === 'sent').length,
      next_before: null,
    }),
    academic_mark_notifications_read: (args) => {
      state.notes.forEach(n => { if (args.p_ids.includes(n.id) && n.state === 'sent') n.state = 'read' })
      return { unread_count: state.notes.filter(n => n.state === 'sent').length }
    },
    academic_dismiss_notification: (args) => {
      const note = state.notes.find(n => n.id === args.p_id && n.state !== 'dismissed')
      if (!note) return { error: { code: 'NOT_FOUND', status: 404 } }
      note.state = 'dismissed'
      return { id: note.id, state: 'dismissed' }
    },
    academic_get_notification_preferences: () => prefsView(),
    academic_set_notification_preference: (args) => {
      if (args.p_push && !state.consents.some(c => c.purpose === 'push' && !c.withdrawn_at)) return pgError(403, 'CONSENT_REQUIRED')
      state.prefs = { in_app_enabled: args.p_in_app, push_enabled: args.p_push }
      return prefsView()
    },
  }
  state.notes ??= []
  const prefsView = () => ({
    categories: [{ category: 'score_reminder', in_app_enabled: state.prefs?.in_app_enabled ?? true, push_enabled: state.prefs?.push_enabled ?? false }],
    push_consent: state.consents.some(c => c.purpose === 'push' && !c.withdrawn_at),
    push_device: false,
    quiet_hours: { start: '21:00', end: '07:00' },
  })
  state.entries ??= {}
  state.consents ??= [{ id: 'c1', purpose: 'module_processing', notice_version: '2026-10-draft', granted_at: '2026-10-01T02:00:00Z', withdrawn_at: null }]
  state.revisions = []
  state.abort ??= {}
  function entryView(periodId) {
    const entry = state.entries[periodId]
    const seq = Number(periodId.slice(1))
    return {
      enrolment_id: 'e1',
      period: { id: periodId, key: `2026-${8 + seq}`, period_type: 'monthly', term_no: 1, sequence: seq, label_lo: `ເດືອນ ${seq}`, label_en: ['September', 'October', 'November'][seq - 1], start_date: '2026-09-01', end_date: '2026-09-30' },
      scale: { id: 'v1', code: 'LA-0-10', version: 1, family: 'numeric_linear', min: 0, max: 10, step: 0.5, decimals: 1, pass_mark: 5, normalisable: true, levels: null },
      read_only: false,
      entry: entry ? { id: `entry-${periodId}`, state: entry.state, version: entry.version, source: 'manual', submitted_at: entry.submitted_at ?? null } : null,
      subjects: [['se-math', 'MATH', 'ຄະນິດສາດ', 'Mathematics'], ['se-lao', 'LAO', 'ພາສາລາວ', 'Lao Language'], ['se-phys', 'PHYS', 'ຟີຊິກສາດ', 'Physics']].map(([id, code, name_lo, name_en]) => {
        const line = entry?.lines[id]
        return {
          subject_enrolment_id: id, code, name_lo, name_en,
          line: line ? { id: `${periodId}:${id}`, status: line.status, value: line.value === null ? null : Number(line.value), normalised_value: null, source: 'manual', verification: 'self_reported', edited: line.edited, version: line.version } : null,
        }
      }),
    }
  }
  const pgError = (status, code, details) => ({ __error: { status, body: { code: `PT${status}`, message: code, details: code, hint: details ? JSON.stringify(details) : '' } } })
  const tables = {
    academic_grades: GRADES,
    academic_subjects: SUBJECTS,
    academic_years: [{ id: 'y1', code: '2026-2027', start_date: '2026-09-01', end_date: '2027-05-31' }],
    users: [{ id: USER_ID, name: 'Noy Student', phone: null, email: 'noy@example.com', avatar_url: null, cover_image_url: null, member_code: 'DAN9XY', role: 'CUSTOMER', language: state.lang, currency: 'LAK', created_at: '2026-10-01', updated_at: '2026-10-01' }],
  }
  const settings = { allowed_grade_levels: ['upper_secondary'], max_subjects_per_enrolment: 25 }

  async function handle(route) {
    const request = route.request()
    const url = new URL(request.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/auth/v1/')) return json({ id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'noy@example.com' })
    const single = (request.headers().accept ?? '').includes('vnd.pgrst.object')
    const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/)
    if (rpcMatch) {
      const args = request.postDataJSON() ?? {}
      state.calls.push({ fn: rpcMatch[1], args })
      // Simulated dropped connection for the next N calls of a function.
      if (state.abort[rpcMatch[1]] > 0) {
        state.abort[rpcMatch[1]] -= 1
        return route.abort('internetdisconnected')
      }
      const handler = rpc[rpcMatch[1]]
      const result = handler ? handler(args) : null
      if (result?.__error) return json(result.__error.body, result.__error.status)
      return json(result)
    }
    const table = url.pathname.replace('/rest/v1/', '')
    if (table === 'academic_settings') {
      const key = (url.searchParams.get('key') ?? '').replace(/^eq\./, '')
      return json(key in settings ? { value: settings[key] } : null)
    }
    const rows = tables[table] ?? []
    return json(single ? rows[0] ?? null : rows)
  }
  return { state, handle }
}

const SCALE_10 = { id: 'v1', code: 'LA-0-10', version: 1, family: 'numeric_linear', min: 0, max: 10, step: 0.5, decimals: 1, pass_mark: 5, normalisable: true, levels: null }
const ENROLMENT = { id: 'e1', academic_year: '2026-2027', state: 'active', read_only: false, grade: { code: 'G11', label_lo: 'ມ.6', label_en: 'Grade 11' }, school: { name_lo: 'ໂຮງຮຽນ', name_en: 'School', verification: 'verified' }, closed_reason: null, start_period_seq: 1, end_period_seq: null }

function emptyDashboard() {
  return { snapshot_id: 's0', snapshot_created_at: '2026-10-23T00:00:00Z', enrolment: ENROLMENT, engine_version: 'f1-f5@1.0.0', numeric: true, scale: SCALE_10, about_same_band: 0.25, periods: [], subjects: [], summary: null }
}

/** PRD §20.9 worked example as the engine returns it (values recomputed independently). */
function workedExampleDashboard() {
  const months = ['September', 'October', 'November', 'December', 'January', 'February']
  const monthsLo = ['ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ', 'ມັງກອນ', 'ກຸມພາ']
  const table = {
    MATH: ['ຄະນິດສາດ', 'Mathematics', [6, 7, 6.5, 5.5, 5, 5.5], 5.9167],
    PHYS: ['ຟີຊິກສາດ', 'Physics', [7, 6, 6.5, 6, null, 6], 6.3],
    CHEM: ['ເຄມີສາດ', 'Chemistry', [7.5, 8, 8, 8.5, 8, 8.5], 8.0833],
    BIO: ['ຊີວະສາດ', 'Biology', [8.5, 9, 8.5, 9, 9, 9.5], 8.9167],
    LAO: ['ພາສາລາວ', 'Lao Language', [8, 8, 7.5, 8, 8, 8], 7.9167],
    ENG: ['ພາສາອັງກິດ', 'English', [6, 7, 5, 8, 6, 7.5], 6.5833],
  }
  const means = [7.1667, 7.5, 7.0, 7.5, 7.2, 7.5]
  const rolling = [null, null, 7.2222, 7.3333, 7.2333, 7.4]
  const periods = months.map((label_en, i) => ({
    period_id: `p${i + 1}`, sequence: i + 1, key: `2026-${9 + i}`, label_lo: monthsLo[i], label_en,
    recorded: i === 4 ? 5 : 6, active: 6, missing: i === 4 ? 1 : 0, coverage: i === 4 ? 0.8333 : 1, mean: means[i],
    change: i === 0 ? null : { value: means[i] - means[i - 1], direction: Math.abs(means[i] - means[i - 1]) < 0.25 ? 'same' : means[i] > means[i - 1] ? 'up' : 'down', compared_period_id: `p${i}`, skipped_periods: 0 },
    rolling_mean: rolling[i],
  }))
  const subjects = Object.entries(table).map(([code, [name_lo, name_en, values, mean]], index) => {
    const series = values.map((value, i) => ({ period_id: `p${i + 1}`, sequence: i + 1, status: value === null ? 'missing' : 'scored', value }))
    const prior = [...values.slice(0, 5)].reverse().find(value => value !== null)
    const change = values[5] - prior
    return {
      subject_enrolment_id: `se-${code.toLowerCase()}`, code, name_lo, name_en, display_order: index, active: true, series,
      window_n: values.filter(value => value !== null).length, mean, latest: series[5],
      change: { value: change, direction: Math.abs(change) < 0.25 ? 'same' : change > 0 ? 'up' : 'down', compared_period_id: values[4] === null ? 'p4' : 'p5' },
    }
  })
  return {
    ...emptyDashboard(), snapshot_id: 's1', periods, subjects,
    summary: { latest_period_id: 'p6', mean: 7.5, coverage: { recorded: 6, active: 6 }, missing: 0, change: periods[5].change, rolling_mean: 7.4 },
  }
}

// Only the preview server and the mocked Supabase are reachable.
async function isolate(context) {
  await context.route(url => !url.href.startsWith(base) && !url.href.startsWith(SUPABASE), route => route.abort())
}

async function openAs(browser, { device, lang, step, enrolment, consentState, entries }) {
  const context = await browser.newContext({ ...device, locale: lang === 'lo' ? 'lo-LA' : 'en-GB' })
  await isolate(context)
  const mock = backend({ step, lang, enrolment, consentState, entries })
  await context.route(`${SUPABASE}/**`, mock.handle)
  await context.addInitScript(({ token, userId, lang }) => {
    localStorage.setItem('pwen_lang', lang)
    localStorage.setItem('sb-example-auth-token', JSON.stringify({
      access_token: token, refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'noy@example.com', app_metadata: {}, user_metadata: {} },
    }))
  }, { token: fakeJwt(), userId: USER_ID, lang })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, mock, errors }
}

// Let 150 ms colour transitions finish so screenshots show the final state.
async function shot(page, name) {
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
}

const lastCall = (mock, fn) => [...mock.state.calls].reverse().find(call => call.fn === fn)
const browser = await chromium.launch()
const results = []
const pass = (line) => { results.push(line); console.log(`ok  ${line}`) }
const MOBILE = devices['Pixel 7']
const DESKTOP = { viewport: { width: 1280, height: 900 } }

try {
  // Signed out -> /auth with return path (AUTH-001).
  {
    const context = await browser.newContext(MOBILE)
    await isolate(context)
    await context.route(`${SUPABASE}/**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    const page = await context.newPage()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/auth/)
    assert.equal(await page.evaluate(() => window.history.state?.usr?.from), '/academy/scores')
    await context.close()
    pass('Signed out: redirected to /auth with return path /academy/scores')
  }

  // Full onboarding on Android Chrome in Lao, catalogue school.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'onboarding' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'ກ່ອນເລີ່ມຕົ້ນ' }).waitFor()
    await shot(page, 'my-scores-1-notice-lo-mobile')
    const agree = page.getByRole('button', { name: 'ຍອມຮັບ ແລະ ສືບຕໍ່' })
    assert.equal(await agree.isDisabled(), true, 'cannot continue before agreeing')
    await page.getByLabel('ຂ້ອຍໄດ້ອ່ານ ແລະ ຍອມຮັບ').check()
    await agree.click()

    await page.getByRole('button', { name: '16–17 ປີ' }).click()
    await page.getByRole('button', { name: 'ຕໍ່ໄປ' }).click()

    // Required-field validation before anything is sent.
    await page.getByRole('button', { name: 'ຕໍ່ໄປ' }).click()
    await page.getByText('ເລືອກຊັ້ນຮຽນ').first().waitFor()
    assert.equal(lastCall(mock, 'academic_create_profile'), undefined)
    await shot(page, 'my-scores-2-details-errors-lo-mobile')

    await page.getByLabel('ຊື່ທີ່ຈະສະແດງ').fill('ນ້ອຍ')
    await page.getByLabel('ຊັ້ນຮຽນ').selectOption('g11')
    assert.equal(await page.getByText('ເລືອກຊັ້ນຮຽນ').count(), 0, 'fixed field clears its error')
    await page.getByLabel('ແຂວງ').selectOption('vientiane-prefecture')
    await page.getByLabel('ເມືອງ (ບໍ່ບັງຄັບ)').selectOption('1-01')
    await page.getByRole('searchbox').fill('ທົດລອງ')
    await page.getByRole('option', { name: /ທົດລອງ/ }).click()
    await shot(page, 'my-scores-3-details-lo-mobile')
    await page.getByRole('button', { name: 'ຕໍ່ໄປ' }).click()

    // Grade 11 defaults pre-selected (PROFILE-003); PE is not a default.
    for (const name of ['ຄະນິດສາດ', 'ຟີຊິກສາດ', 'ພາສາລາວ']) assert.equal(await page.getByRole('button', { name, exact: true }).getAttribute('aria-pressed'), 'true', name)
    assert.equal(await page.getByRole('button', { name: 'ພະລະສຶກສາ', exact: true }).getAttribute('aria-pressed'), 'false')
    await page.getByRole('button', { name: 'ຟີຊິກສາດ', exact: true }).click()
    await page.getByLabel('ເພີ່ມວິຊາທີ່ບໍ່ມີໃນລາຍການ').fill('ຫຸ່ນຍົນ')
    await page.getByRole('button', { name: 'ເພີ່ມ', exact: true }).click()
    await shot(page, 'my-scores-4-subjects-lo-mobile')
    await page.getByRole('button', { name: 'ຕໍ່ໄປ' }).click()

    await page.getByRole('button', { name: 'ເຂົ້າມະຫາວິທະຍາໄລ' }).click()
    await page.getByLabel('ຂຽນດ້ວຍຄຳເວົ້າຂອງເຈົ້າເອງ').fill('ຢາກເປັນທ່ານໝໍ')
    await shot(page, 'my-scores-5-goals-lo-mobile')
    await page.getByRole('button', { name: 'ສຳເລັດ' }).click()
    await page.getByRole('link', { name: 'ຂໍ້ມູນ ແລະ ຄວາມເປັນສ່ວນຕົວ' }).waitFor()

    const input = lastCall(mock, 'academic_create_profile').args.p_input
    assert.deepEqual(input, {
      display_name: 'ນ້ອຍ', age_band: '16_17', province_code: 'vientiane-prefecture', district_code: '1-01', grade_id: 'g11',
      school_id: 'school-1', subjects: [{ subject_id: 's-MATH' }, { subject_id: 's-LAO' }, { custom_name: 'ຫຸ່ນຍົນ' }],
      goals: { chips: ['university'], text: 'ຢາກເປັນທ່ານໝໍ' }, interest_subject_codes: [], notice_version: '2026-10-draft',
    })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Android/Lao onboarding: notice gate, age, validation, school search, default subjects, custom subject, goals; payload exact')
  }

  // Unlisted school, skip goals, desktop English (PROFILE-002/006).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'onboarding' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('button', { name: '18 or older' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('Name to show').fill('Noy')
    await page.getByLabel('Grade').selectOption('g12')
    await page.getByLabel('Province').selectOption('champasak')
    await page.getByRole('searchbox').fill('Ban Nong Hai')
    await page.getByRole('button', { name: 'My school is not listed: use “Ban Nong Hai”' }).click()
    await page.getByText('We will check this school name').waitFor()
    await shot(page, 'my-scores-6-unlisted-school-en-desktop')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    const input = lastCall(mock, 'academic_create_profile').args.p_input
    assert.equal(input.school_free_text, 'Ban Nong Hai')
    assert.equal(input.school_id, undefined)
    assert.equal(input.goals, null)
    assert.equal(input.district_code, null)
    assert.deepEqual(input.subjects.map(s => s.subject_id), ['s-MATH', 's-PHYS', 's-LAO'])
    assert.deepEqual(errors, [])
    await context.close()
    pass('Desktop/English: unlisted school as free text, goals skipped, grade 12 defaults')
  }

  // Under 13 is not supported (PRIV-002).
  {
    const { context, page, mock } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'onboarding' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('button', { name: 'Under 13' }).click()
    await page.getByRole('heading', { name: 'Schooling is for older students for now' }).waitFor()
    assert.equal(lastCall(mock, 'academic_create_profile'), undefined)
    await context.close()
    pass('Under 13: blocked before anything is stored')
  }

  // Re-acknowledge after withdrawal (PRIV-001/003).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'consent', enrolment: 'e1', consentState: 'withdrawn' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Schooling is paused' }).waitFor()
    await shot(page, 'my-scores-7-consent-paused-en-mobile')
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'module_processing', p_notice_version: '2026-10-draft' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Consent review: paused state, re-agreement sends module_processing with the current notice')
  }

  // New school year (PROFILE-004).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'new_school_year', enrolment: 'e0' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'I moved up to Grade 12' }).click()
    await shot(page, 'my-scores-8-new-year-en-mobile')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_transition_enrolment').args.p_input, { kind: 'promoted' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('New school year: promotion to the next grade')
  }

  // My data: counts, consents, edit with version, mid-year transfer (PROFILE-005/007).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'lo', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'ຂໍ້ມູນທີ່ ໂຮງຮຽນ ເກັບໄວ້' }).waitFor()
    assert.match(await page.locator('dl').nth(1).innerText(), /ຄະແນນ\s*6/)
    await page.getByText('ເກັບຄະແນນໄວ້ໃນ ໂຮງຮຽນ').waitFor()
    await page.getByText('ໃຫ້ເມື່ອ 1 ຕຸລາ 2026').waitFor()
    await shot(page, 'my-scores-9-my-data-lo-desktop')
    await page.getByRole('button', { name: 'ແກ້ໄຂ' }).click()
    await page.getByLabel('ຊື່ທີ່ຈະສະແດງ').fill('ນ້ອຍ ໃໝ່')
    await page.getByRole('button', { name: 'ບັນທຶກ' }).click()
    await page.getByText('ນ້ອຍ ໃໝ່').first().waitFor()
    assert.deepEqual(lastCall(mock, 'academic_update_profile').args, {
      p_expected_version: 1,
      p_changes: { display_name: 'ນ້ອຍ ໃໝ່', age_band: '16_17', province_code: 'vientiane-prefecture', district_code: '1-01' },
    })
    await page.getByRole('button', { name: 'ຂ້ອຍຍ້າຍໂຮງຮຽນ' }).click()
    const months = await page.getByLabel('ເດືອນທຳອິດຢູ່ໂຮງຮຽນໃໝ່').locator('option').allInnerTexts()
    assert.deepEqual(months.slice(1), ['ເດືອນ 2'], 'first month and future months are not offered')
    await page.getByLabel('ເດືອນທຳອິດຢູ່ໂຮງຮຽນໃໝ່').selectOption('2')
    await page.getByRole('searchbox').fill('ທົດລອງ')
    await page.getByRole('option', { name: /ທົດລອງ/ }).click()
    await page.getByRole('button', { name: 'ຢືນຢັນ' }).click()
    await page.waitForTimeout(300)
    assert.deepEqual(lastCall(mock, 'academic_transition_enrolment').args.p_input, { kind: 'transferred', effective_period_seq: 2, school_id: 'school-1' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('My data (Lao, desktop): counts, consents, profile edit with If-Match version, mid-year transfer')
  }

  // ─── Score entry (FE-003) ─────────────────────────────────────────────────

  // Validation, Lao digits, statuses, review and exact submit (Android, Lao).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'ເພີ່ມຄະແນນ' }).click()
    const math = page.getByLabel('ຄະນິດສາດ', { exact: true })
    await math.fill('11')
    await page.getByText('ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ 0 ຫາ 10 ເທື່ອລະ 0.5').waitFor()
    assert.equal(await page.getByRole('button', { name: 'ກວດຄືນ' }).isDisabled(), true, 'review blocked while invalid')
    await math.fill('7.3')
    await page.getByText('ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ 0 ຫາ 10 ເທື່ອລະ 0.5').waitFor()
    await math.fill('abc')
    await page.getByText('ປ້ອນຕົວເລກ').waitFor()
    await math.fill('໗.໕')
    await math.press('Enter')
    assert.equal(await math.inputValue(), '7.5', 'Lao digits normalised')
    assert.equal(await page.getByLabel('ພາສາລາວ', { exact: true }).evaluate(el => el === document.activeElement), true, 'Enter moves to the next subject')
    await page.keyboard.type('10')
    await page.getByLabel('ສະຖານະຂອງ ຟີຊິກສາດ').selectOption('exempt')
    await page.getByText('ບັນທຶກຮ່າງແລ້ວ').waitFor()
    await shot(page, 'my-scores-10-entry-lo-mobile')
    const draftCall = lastCall(mock, 'academic_save_draft').args
    assert.deepEqual(draftCall.p_lines, [
      { subject_enrolment_id: 'se-math', status: 'scored', value: '7.5' },
      { subject_enrolment_id: 'se-lao', status: 'scored', value: '10' },
      { subject_enrolment_id: 'se-phys', status: 'exempt' },
    ])
    await page.getByRole('button', { name: 'ກວດຄືນ' }).click()
    await shot(page, 'my-scores-11-review-lo-mobile')
    await page.getByRole('button', { name: 'ຢືນຢັນ ແລະ ບັນທຶກ' }).click()
    await page.getByText('ບັນທຶກເມື່ອ').waitFor()
    const submit = lastCall(mock, 'academic_submit_score_entry').args
    assert.equal(submit.p_period_id, 'm1')
    assert.match(submit.p_idempotency_key, /^[0-9a-f-]{36}$/)
    assert.deepEqual(submit.p_lines, draftCall.p_lines)
    await shot(page, 'my-scores-12-submitted-lo-mobile')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Entry (Android/Lao): range/step/number errors, Lao digits, Enter to next, statuses, autosave, review, exact submit')
  }

  // Offline draft survives a closed tab; a lost submit retries with the same key.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.abort.academic_save_draft = 99
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Mathematics', { exact: true }).fill('6')
    await page.getByLabel('Lao Language', { exact: true }).fill('8.5')
    await page.getByText('Offline: saved on this phone').waitFor()
    await page.close()

    const restored = await context.newPage()
    restored.on('pageerror', error => errors.push(error.message))
    await restored.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await restored.getByLabel('Mathematics', { exact: true }).waitFor()
    await restored.waitForFunction(() => document.querySelector('#score-se-math')?.value === '6')
    assert.equal(await restored.getByLabel('Lao Language', { exact: true }).inputValue(), '8.5', 'draft restored from this device')
    await shot(restored, 'my-scores-13-offline-restored-en-desktop')

    mock.state.abort.academic_save_draft = 0
    await restored.getByLabel('Status for Physics').selectOption('missing')
    await restored.getByRole('button', { name: 'Review' }).click()
    mock.state.abort.academic_submit_score_entry = 1
    await restored.getByRole('button', { name: 'Confirm and save' }).click()
    await restored.getByText('You are offline. It will save automatically').waitFor()
    await restored.evaluate(() => window.dispatchEvent(new Event('online')))
    await restored.getByText('Saved 20 Oct 2026').waitFor()
    const submits = mock.state.calls.filter(call => call.fn === 'academic_submit_score_entry')
    assert.equal(submits.length, 2, 'one lost attempt and one retry')
    assert.equal(submits[0].args.p_idempotency_key, submits[1].args.p_idempotency_key, 'retry reuses the idempotency key')
    assert.equal(mock.state.entries.m1.state, 'submitted')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Offline: draft restored after closing the tab; lost submit retried once with the same idempotency key')
  }

  // Another device saved the period first: SCORE_DUPLICATE shows the saved scores.
  {
    const entries = { m1: { state: 'draft', version: 2, lines: { 'se-math': { status: 'scored', value: '5', version: 1, edited: false } } } }
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1', entries })
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Lao Language', { exact: true }).fill('9')
    await page.getByLabel('Status for Physics').selectOption('not_applicable')
    await page.getByRole('button', { name: 'Review' }).click()
    Object.assign(mock.state.entries.m1, { state: 'submitted', key: 'other-device', submitted_at: '2026-10-19T03:00:00Z' })
    await page.getByRole('button', { name: 'Confirm and save' }).click()
    await page.getByText('Scores for this month were already saved').waitFor()
    await page.getByText('Saved 19 Oct 2026').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('Duplicate period: 409 SCORE_DUPLICATE opens the saved scores instead of a second record')
  }

  // Corrections keep history (SCORE-007).
  {
    const entries = { m1: { state: 'submitted', key: 'k', submitted_at: '2026-10-20T03:00:00Z', version: 3, lines: {
      'se-math': { status: 'scored', value: '7.5', version: 1, edited: false },
      'se-lao': { status: 'scored', value: '10', version: 1, edited: false },
      'se-phys': { status: 'exempt', value: null, version: 1, edited: false },
    } } }
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1', entries })
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Correct Mathematics' }).click()
    await page.getByLabel('Mathematics', { exact: true }).fill('8')
    await page.getByLabel('Reason (optional)').fill('Teacher re-marked')
    await page.getByRole('button', { name: 'Save correction' }).click()
    await page.getByText('Edited').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_correct_score_line').args, { p_line_id: 'm1:se-math', p_expected_version: 1, p_line: { status: 'scored', value: '8' }, p_reason: 'Teacher re-marked' })
    await page.getByRole('button', { name: 'History: Mathematics' }).click()
    await page.getByText('7.5 → 8').waitFor()
    await page.getByText('“Teacher re-marked”').waitFor()
    await shot(page, 'my-scores-14-correction-history-en-mobile')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Correction: If-Match version and reason sent; Edited badge and old → new history shown')
  }

  // Shared phone: another account's local draft is purged on open.
  {
    const { context, page, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Mathematics', { exact: true }).waitFor()
    // Let the startup purge finish first, or it would race the insert below.
    await page.waitForTimeout(800)
    const countOthers = () => page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('bitdoin-my-scores')
      request.onsuccess = () => {
        const all = request.result.transaction('drafts').objectStore('drafts').getAll()
        all.onsuccess = () => { resolve(all.result.filter(row => row.userId === 'someone-else').length); request.result.close() }
      }
    }))
    await page.evaluate(() => new Promise(resolve => {
      const request = indexedDB.open('bitdoin-my-scores')
      request.onsuccess = () => {
        const tx = request.result.transaction('drafts', 'readwrite')
        tx.objectStore('drafts').put({ key: 'someone-else:e9:m1', userId: 'someone-else', enrolmentId: 'e9', periodId: 'm1', lines: { x: { status: 'scored', text: '9' } }, synced: false, updatedAt: 0 })
        tx.oncomplete = () => { request.result.close(); resolve(null) }
      }
    }))
    assert.equal(await countOthers(), 1)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByLabel('Mathematics', { exact: true }).waitFor()
    await page.waitForTimeout(300)
    assert.equal(await countOthers(), 0, 'other account draft removed')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Shared phone: drafts of another account are purged when Schooling opens')
  }

  // ─── Dashboard (FE-005) ───────────────────────────────────────────────────

  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    // Empty state before the first month.
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Add your first month' }).waitFor()

    mock.state.dashboard = workedExampleDashboard()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Up 0.3 since January').waitFor()
    const summary = await page.locator('section').first().innerText()
    assert.match(summary, /February · 2026-2027/)
    assert.match(summary, /7\.5\s*\/ 10/)
    assert.match(summary, /6 of 6 subjects recorded/)
    // Trend: 6 points, rolling line present, gaps none here.
    assert.equal(await page.locator('.recharts-line').count(), 2, 'average + 3-month average lines')
    assert.equal(await page.locator('.recharts-line-dots circle').count(), 6)
    // Latest month bars sorted by score, values labelled.
    const barLabels = await page.locator('.recharts-bar .recharts-label').evaluateAll(els => els.map(el => el.textContent))
    assert.deepEqual(barLabels, ['9.5', '8.5', '8', '7.5', '6', '5.5'])
    const yTicks = await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').evaluateAll(els => els.map(el => el.textContent))
    assert.deepEqual(yTicks.slice(-6), ['Biology', 'Chemistry', 'Lao Language', 'English', 'Physics', 'Mathematics'])
    await shot(page, 'my-scores-15-dashboard-en-mobile')

    // Table view of the trend (DASH-008).
    await page.getByRole('button', { name: 'View as table' }).first().click()
    const rows = await page.locator('table').first().locator('tbody tr').allInnerTexts()
    assert.equal(rows.length, 6)
    assert.match(rows[0], /September\s+7\.2\s+—\s+6\/6/)
    assert.match(rows[4], /January\s+7\.2\s+7\.2\s+5\/6/)
    await page.getByRole('button', { name: 'View as chart' }).click()

    // Accessibility: no serious or critical axe violations.
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document, { resultTypes: ['violations'] })
      return result.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => `${v.id}: ${v.nodes.map(n => `${n.target.join(' ')} [${n.any?.[0]?.message ?? ''}] ${n.html.slice(0, 120)}`).join(' | ')}`)
    })
    assert.deepEqual(axe, [], `axe violations: ${axe.join(', ')}`)

    // Per-subject view with the mean reference line (DASH-003).
    await page.getByRole('button', { name: /^Mathematics/ }).click()
    await page.getByRole('heading', { name: 'Mathematics by month' }).waitFor()
    await page.getByText('Average 5.9 over 6 months').waitFor()
    await page.getByText('Up 0.5 since January').waitFor()
    // Recharts draws the reference line after layout; wait for it rather than counting at once.
    await page.locator('.recharts-reference-line').first().waitFor({ state: 'attached' })
    assert.equal(await page.locator('.recharts-reference-line').count(), 1)
    await shot(page, 'my-scores-16-subject-en-mobile')
    await page.getByRole('button', { name: 'All subjects' }).click()

    // Physics was missing in January: its change compares with December.
    await page.getByRole('button', { name: /^Physics/ }).click()
    await page.getByText('About the same as December').waitFor()
    await page.getByRole('button', { name: 'View as table' }).click()
    assert.match(await page.locator('table').innerText(), /January\s+Not recorded yet/)
    await page.getByRole('button', { name: 'All subjects' }).click()

    // Offline: the copy loaded on this device is shown with a stale marker.
    mock.state.abort.academic_get_dashboard = 99
    mock.state.abort.academic_get_session = 0
    const offline = await context.newPage()
    offline.on('pageerror', error => errors.push(error.message))
    await offline.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await offline.getByText(/Offline: showing what was loaded on/).waitFor()
    await offline.getByText('Up 0.3 since January').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('Dashboard: empty state, summary, trend with rolling mean, sorted bars, table views, axe clean, subject detail, offline stale copy')
  }

  // Lao dashboard on desktop, with a gap month and low coverage.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'lo', step: 'ready', enrolment: 'e1' })
    const view = workedExampleDashboard()
    view.periods[2].mean = null
    view.periods[2].recorded = 2
    view.periods[2].coverage = 0.33
    view.periods[3].change = { value: 0, direction: 'same', compared_period_id: 'p2', skipped_periods: 1 }
    // As the engine does: no rolling mean without 3 consecutive valid months.
    for (const i of [2, 3, 4]) view.periods[i].rolling_mean = null
    mock.state.dashboard = view
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByText('ເພີ່ມຂຶ້ນ 0.3 ຈາກ ມັງກອນ').waitFor()
    await page.getByText('ບ່ອນຫວ່າງ ແມ່ນເດືອນທີ່ບໍ່ມີຄ່າສະເລ່ຍ.').waitFor()
    assert.equal(await page.locator('.recharts-line-dots circle').count(), 5, 'gap month has no point')
    await shot(page, 'my-scores-17-dashboard-lo-desktop')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Dashboard (Lao, desktop): gap month not interpolated, Lao change text')
  }

  // ─── History (FE-004) ─────────────────────────────────────────────────────

  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    const line = (id, status, value, extra = {}) => ({ id, status, value, normalised_value: null, source: 'manual', verification: 'self_reported', edited: false, version: 1, ...extra })
    const subjects = [['se-math', 'MATH', 'ຄະນິດສາດ', 'Mathematics'], ['se-lao', 'LAO', 'ພາສາລາວ', 'Lao Language'], ['se-phys', 'PHYS', 'ຟີຊິກສາດ', 'Physics']]
    const period = (id, seq, label, type, entryState, values) => ({
      id, key: `2026-${8 + seq}`, period_type: type, term_no: 1, sequence: seq, label_lo: label, label_en: label, start_date: '2026-09-01', end_date: '2026-09-30',
      entry: { id: `entry-${id}`, state: entryState, submitted_at: entryState === 'submitted' ? '2026-11-02T03:00:00Z' : null, source: 'manual' },
      lines: subjects.map(([se, code, name_lo, name_en], i) => ({ subject_enrolment_id: se, code, name_lo, name_en, line: values[i] })),
    })
    mock.state.history = { enrolments: [
      {
        enrolment_id: 'e1', academic_year: '2026-2027', grade: { code: 'G11', label_lo: 'ມ.6', label_en: 'Grade 11' },
        school: { id: 'school-1', name_lo: SCHOOLS[0].name_lo, name_en: SCHOOLS[0].name_en, verification: 'verified' },
        state: 'active', closed_reason: null, read_only: false, scale: SCALE_10,
        terms: [{ term_no: 1, periods: [
          period('m2', 2, 'October', 'monthly', 'submitted', [line('h2:se-math', 'scored', 7.5, { edited: true, version: 2 }), line('h2:se-lao', 'scored', 9, { verification: 'school_verified' }), line('h2:se-phys', 'exempt', null)]),
          period('t1', 1, 'Term 1', 'term_official', 'submitted', [line('ht:se-math', 'scored', 8), line('ht:se-lao', 'scored', 8.5), line('ht:se-phys', 'missing', null)]),
        ] }],
      },
      {
        enrolment_id: 'e0', academic_year: '2025-2026', grade: { code: 'G10', label_lo: 'ມ.5', label_en: 'Grade 10' },
        school: { id: null, name_lo: 'ໂຮງຮຽນເກົ່າ', name_en: 'Old school', verification: 'unverified_school' },
        state: 'closed', closed_reason: 'transferred', read_only: true, scale: SCALE_10,
        terms: [{ term_no: 1, periods: [period('o1', 1, 'September 2025', 'monthly', 'submitted', [line('ho:se-math', 'scored', 6), line('ho:se-lao', 'scored', 7), line('ho:se-phys', 'missing', null)])] }],
      },
    ] }
    mock.state.revisions.push({ old_value: 7, new_value: 7.5, old_status: 'scored', new_status: 'scored', changed_by: 'student', reason: 'Re-marked', changed_at: '2026-11-03T03:00:00Z' })

    await page.goto(`${base}/academy/scores/history`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '2026-2027 · Grade 11' }).waitFor()
    const years = await page.locator('section > header h2').allInnerTexts()
    assert.deepEqual(years, ['2026-2027 · Grade 11', '2025-2026 · Grade 10'], 'newest year first')
    await page.getByText('Closed · read-only · Changed school').waitFor()

    // Missing month is shown as missing, with a way to add it; never as 0.
    const firstYear = page.locator('section').first()
    await firstYear.getByText('Not recorded').waitFor()
    assert.equal(await firstYear.getByRole('link', { name: 'Add' }).getAttribute('href'), '/academy/scores/entry?period=m1')

    // Term average calculated by Bitdoin, official result kept apart (SCORE-011).
    await firstYear.getByText('Term average · calculated by Bitdoin').waitFor()
    assert.match(await firstYear.locator('div.border-dashed').innerText(), /Mathematics\s*7\.5\s*\(1 month\)/)
    await firstYear.getByText('Official result').waitFor()

    // Open October: badges and correction history (SCORE-012, SCORE-007).
    await firstYear.getByRole('button', { name: /^October/ }).click()
    await firstYear.getByText('Verified by school').waitFor()
    assert.match(await firstYear.locator('li', { hasText: 'Physics' }).first().innerText(), /Absent \/ exempt/)
    await firstYear.getByRole('button', { name: 'Edited' }).click()
    await firstYear.getByText('7 → 7.5').waitFor()
    await firstYear.getByText('“Re-marked”').waitFor()
    await shot(page, 'my-scores-18-history-en-mobile')

    // Closed year: read-only, no add or open links.
    const closedYear = page.locator('section').nth(1)
    await closedYear.getByRole('button', { name: /^September 2025/ }).click()
    assert.equal(await closedYear.getByRole('link').count(), 0, 'closed year has no edit links')
    assert.deepEqual(errors, [])
    await context.close()
    pass('History: years newest first, missing month not zero, calculated vs official term, badges, revision history, closed year read-only')
  }

  // ─── Privacy (FE-006) ─────────────────────────────────────────────────────

  // Export downloads a valid ZIP with the documented files (PRIV-004).
  {
    const { context, page, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download ZIP' }).click()])
    assert.match(download.suggestedFilename(), /^my-scores-\d{4}-\d{2}-\d{2}\.zip$/)
    const bytes = await (await import('node:fs/promises')).readFile(await download.path())
    assert.equal(bytes.readUInt32LE(0), 0x04034b50, 'starts with a ZIP local header')
    const eocd = bytes.length - 22
    assert.equal(bytes.readUInt32LE(eocd), 0x06054b50, 'ends with a ZIP directory record')
    assert.equal(bytes.readUInt16LE(eocd + 10), 5, 'five files')
    for (const name of ['profile.json', 'enrolments.json', 'scores.csv', 'revisions.csv', 'consents.json']) assert.ok(bytes.includes(Buffer.from(name)), name)
    assert.ok(bytes.includes(Buffer.from('ຄະນິດສາດ')), 'Lao text kept as UTF-8')
    await page.getByText('Your data was downloaded.').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('Export: ZIP downloaded with profile.json, enrolments.json, scores.csv, revisions.csv, consents.json')
  }

  // Export on an old session asks for a fresh sign-in first (PRD §29.6 T3, S-02).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    mock.state.exportReauth = true
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'ດາວໂຫຼດ ZIP' }).click()
    await page.getByText('ການດາວໂຫຼດຕ້ອງເຂົ້າສູ່ລະບົບໃໝ່').waitFor()
    await page.getByRole('button', { name: 'ເຂົ້າສູ່ລະບົບອີກຄັ້ງ' }).click()
    await page.waitForURL(/\/auth/)
    assert.equal(await page.evaluate(() => window.history.state?.usr?.from), '/academy/scores/data')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Export (Lao): old session asks for a fresh sign-in, then returns to My data')
  }

  // Deletion: needs a fresh sign-in, then a cancellable 14-day grace period (PRIV-005).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.reauth = true
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.getByRole('button', { name: 'Continue' }).isDisabled(), true, 'a scope must be chosen first')
    await page.getByLabel(/Delete my whole Schooling profile/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Yes, delete in 14 days' }).click()
    await page.getByText('Please sign in again').waitFor()
    await shot(page, 'my-scores-19-delete-reauth-en-mobile')

    mock.state.reauth = false
    await page.getByRole('button', { name: 'Yes, delete in 14 days' }).count() // still hidden behind the sign-in prompt
    const fresh = await context.newPage()
    fresh.on('pageerror', error => errors.push(error.message))
    await fresh.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    await fresh.getByLabel(/Delete my scores only/).check()
    await fresh.getByRole('button', { name: 'Continue' }).click()
    await fresh.getByRole('button', { name: 'Yes, delete in 14 days' }).click()
    await fresh.getByText('Your scores will be deleted on 6 Nov 2026.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_request_deletion').args, { p_scope: 'scores' })
    await shot(fresh, 'my-scores-20-delete-pending-en-mobile')
    await fresh.getByRole('button', { name: 'Cancel deletion' }).click()
    await fresh.getByText('Deletion cancelled.').waitFor()
    await fresh.getByRole('button', { name: 'Continue' }).waitFor()
    assert.equal(await fresh.getByText('Deletion scheduled').count(), 0)

    // The sign-in prompt signs out and returns to My data afterwards.
    await page.getByRole('button', { name: 'Sign in again' }).click()
    await page.waitForURL(/\/auth/)
    assert.equal(await page.evaluate(() => window.history.state?.usr?.from), '/academy/scores/data')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Delete: scope required, fresh sign-in requested, 14-day schedule shown with date, cancellable; sign-in returns to My data')
  }

  // Consents: stop device reminders; withdraw module processing with a warning.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    mock.state.consents.push({ id: 'c2', purpose: 'push', notice_version: '2026-10-draft', granted_at: '2026-10-20T02:00:00Z', withdrawn_at: null })
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const pushRow = page.getByText('ສົ່ງການແຈ້ງເຕືອນໄປທີ່ອຸປະກອນ')
    await pushRow.waitFor()
    await page.getByRole('button', { name: 'ຢຸດ' }).nth(1).click()
    await pushRow.waitFor({ state: 'detached' })
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'push' })
    await page.getByRole('link', { name: 'ຕັ້ງຄ່າການແຈ້ງເຕືອນ' }).waitFor()
    await page.getByRole('button', { name: 'ຢຸດ' }).first().click()
    await page.getByText('ຢຸດເກັບຄະແນນໃໝ່ບໍ?').waitFor()
    await shot(page, 'my-scores-21-consents-lo-mobile')
    await page.getByRole('button', { name: 'ແມ່ນ, ຢຸດ' }).click()
    await page.getByText('ການບັນທຶກຖືກຢຸດ').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'module_processing' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Consents (Lao): device reminders stopped and hidden until given again; module processing withdrawn after a warning, profile shown read-only')
  }

  // Reminders (Lao, phone): bell count, dashboard banner, inbox read/dismiss, settings.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    const note = (id, code, seq, created_at) => ({ id, category: 'score_reminder', code, channel: 'in_app', state: 'sent', created_at, read_at: null,
      payload: { enrolment_id: 'e1', period_id: `m${seq}`, period_key: `2026-${8 + seq}`, period_label_lo: ['ກັນຍາ', 'ຕຸລາ'][seq - 1], period_label_en: ['September', 'October'][seq - 1] } })
    mock.state.notes = [note('n2', 'score_reminder.second', 2, '2026-11-14T03:00:00Z'), note('n1', 'score_reminder.first', 1, '2026-10-07T03:00:00Z')]
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'ການແຈ້ງເຕືອນ, ໃໝ່ 2' }).waitFor()
    await page.getByRole('heading', { name: 'ເພີ່ມຄະແນນເດືອນຕຸລາ' }).waitFor()
    await page.getByText('ເດືອນນີ້ຍັງເປີດຢູ່').waitFor()
    await shot(page, 'my-scores-22-reminder-banner-lo-mobile')
    await page.getByRole('button', { name: 'ພາຍຫຼັງ' }).click()
    await page.getByRole('heading', { name: 'ເພີ່ມຄະແນນເດືອນກັນຍາ' }).waitFor() // the next unread takes its place
    assert.deepEqual(lastCall(mock, 'academic_mark_notifications_read').args, { p_ids: ['n2'] })
    await page.getByRole('link', { name: 'ການແຈ້ງເຕືອນ, ໃໝ່ 1' }).click()

    await page.waitForURL(/\/academy\/scores\/inbox$/)
    await page.getByText('ໃໝ່', { exact: true }).waitFor()
    await page.waitForTimeout(300)
    assert.deepEqual(lastCall(mock, 'academic_mark_notifications_read').args, { p_ids: ['n1'] })
    assert.equal(mock.state.notes.filter(n => n.state === 'sent').length, 0)
    await shot(page, 'my-scores-23-inbox-lo-mobile')

    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document, { resultTypes: ['violations'] })
      return result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)
    })
    assert.deepEqual(axe, [], `axe violations: ${axe.join(', ')}`)

    await page.getByRole('button', { name: 'ລຶບການແຈ້ງເຕືອນນີ້' }).nth(1).click()
    await page.getByText('ເພີ່ມຄະແນນເດືອນກັນຍາ').waitFor({ state: 'detached' })
    assert.deepEqual(lastCall(mock, 'academic_dismiss_notification').args, { p_id: 'n1' })

    const inApp = page.getByRole('switch', { name: 'ແຈ້ງເຕືອນໃຫ້ເພີ່ມຄະແນນ' })
    assert.equal(await inApp.getAttribute('aria-checked'), 'true')
    await page.getByText('ບໍ່ສົ່ງລະຫວ່າງ 21:00 ຫາ 07:00 (ເວລາລາວ)', { exact: false }).waitFor()
    await inApp.click()
    await page.waitForFunction(() => document.querySelector('[role=switch][aria-labelledby=pref-in-app]')?.getAttribute('aria-checked') === 'false')
    assert.deepEqual(lastCall(mock, 'academic_set_notification_preference').args, { p_category: 'score_reminder', p_in_app: false, p_push: false })

    await page.getByRole('link', { name: 'ເພີ່ມຄະແນນ', exact: true }).click()
    await page.waitForURL(/\/academy\/scores\/entry\?period=m2$/)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Reminders (Lao): bell count, newest reminder on the dashboard, inbox marks read and dismisses, reminders switched off, axe clean, "Add scores" opens that month')
  }

  // Reminders (English, desktop): empty inbox.
  {
    const { context, page, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores/inbox`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'You are all caught up', level: 3 }).waitFor()
    await page.getByRole('heading', { name: 'Reminder settings' }).waitFor()
    await shot(page, 'my-scores-24-inbox-empty-en-desktop')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Reminders (English): empty inbox and settings')
  }

  console.log(`
${results.length} scenarios passed`)
} finally {
  await browser.close()
}
