// End-to-end checks for the My Scores onboarding and profile screens
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
    academic_grant_consent: () => { state.step = 'ready'; return { consents: [] } },
    academic_transition_enrolment: (args) => { state.step = args.p_input.kind === 'left' ? 'new_school_year' : 'ready'; if (args.p_input.kind === 'left') state.enrolment = null; return { closed_enrolment_id: 'e0', enrolment_id: 'e1' } },
    academic_get_history: () => ({ enrolments: [{ enrolment_id: 'e0', academic_year: '2025-2026', grade: { code: 'G11', label_lo: 'ມ.6', label_en: 'Grade 11' }, school: { id: 'school-1', name_lo: SCHOOLS[0].name_lo, name_en: SCHOOLS[0].name_en, verification: 'verified' }, state: 'active', closed_reason: null, read_only: false }] }),
    academic_get_my_data_summary: () => ({
      profile: { id: 'p1', display_name: state.name ?? 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', district_code: '1-01', goals: null, interest_subject_codes: [], status: 'active', version: state.version ?? 1 },
      counts: { enrolments: 1, score_entries_submitted: 2, score_entries_draft: 1, scores: 6, corrections: 1, uploads: 0, guardian_links: 0 },
      consents: [{ id: 'c1', purpose: 'module_processing', notice_version: '2026-10-draft', granted_at: '2026-10-01T02:00:00Z', withdrawn_at: null }],
      deletion: { status: 'active', deletion_scope: null, deletion_requested_at: null, deletion_scheduled_for: null },
    }),
    academic_update_profile: (args) => { state.version = (state.version ?? 1) + 1; state.name = args.p_changes.display_name; return { profile_id: 'p1', version: state.version } },
    academic_list_periods: () => ({ enrolment_id: 'e1', read_only: false, suggested_period_id: 'm1', periods: [1, 2, 3].map(seq => ({ id: `m${seq}`, key: `2026-${8 + seq}`, period_type: 'monthly', sequence: seq, label_lo: `ເດືອນ ${seq}`, label_en: ['September', 'October', 'November'][seq - 1], state: 'empty', disabled: seq === 3 })) }),
  }
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
      const handler = rpc[rpcMatch[1]]
      return handler ? json(handler(args)) : json(null)
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

// Only the preview server and the mocked Supabase are reachable.
async function isolate(context) {
  await context.route(url => !url.href.startsWith(base) && !url.href.startsWith(SUPABASE), route => route.abort())
}

async function openAs(browser, { device, lang, step, enrolment, consentState }) {
  const context = await browser.newContext({ ...device, locale: lang === 'lo' ? 'lo-LA' : 'en-GB' })
  await isolate(context)
  const mock = backend({ step, lang, enrolment, consentState })
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
    results.push('Signed out: redirected to /auth with return path /academy/scores')
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
    results.push('Android/Lao onboarding: notice gate, age, validation, school search, default subjects, custom subject, goals; payload exact')
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
    results.push('Desktop/English: unlisted school as free text, goals skipped, grade 12 defaults')
  }

  // Under 13 is not supported (PRIV-002).
  {
    const { context, page, mock } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'onboarding' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('button', { name: 'Under 13' }).click()
    await page.getByRole('heading', { name: 'My Scores is for older students for now' }).waitFor()
    assert.equal(lastCall(mock, 'academic_create_profile'), undefined)
    await context.close()
    results.push('Under 13: blocked before anything is stored')
  }

  // Re-acknowledge after withdrawal (PRIV-001/003).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'consent', enrolment: 'e1', consentState: 'withdrawn' })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'My Scores is paused' }).waitFor()
    await shot(page, 'my-scores-7-consent-paused-en-mobile')
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'module_processing', p_notice_version: '2026-10-draft' })
    assert.deepEqual(errors, [])
    await context.close()
    results.push('Consent review: paused state, re-agreement sends module_processing with the current notice')
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
    results.push('New school year: promotion to the next grade')
  }

  // My data: counts, consents, edit with version, mid-year transfer (PROFILE-005/007).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'lo', step: 'ready', enrolment: 'e1' })
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'ຂໍ້ມູນທີ່ ຄະແນນຂອງຂ້ອຍ ເກັບໄວ້' }).waitFor()
    assert.match(await page.locator('dl').nth(1).innerText(), /ຄະແນນ\s*6/)
    await page.getByText('ເກັບຄະແນນໄວ້ໃນ ຄະແນນຂອງຂ້ອຍ').waitFor()
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
    results.push('My data (Lao, desktop): counts, consents, profile edit with If-Match version, mid-year transfer')
  }

  console.log(results.map(line => `ok  ${line}`).join('\n'))
} finally {
  await browser.close()
}
