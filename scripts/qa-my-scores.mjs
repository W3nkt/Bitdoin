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
const SCHOOLS = [
  { id: 'school-1', name_lo: 'ໂຮງຮຽນ ມັດທະຍົມ ທົດລອງ', name_en: 'Thotlong Secondary School', romanised_name: 'Matthayom Thotlong', province_code: 'vientiane-prefecture', district_code: '1-01' },
  { id: 'school-2', name_lo: 'ໂຮງຮຽນ ສີໂຄດ', name_en: 'Sikhottabong Secondary School', romanised_name: null, province_code: 'vientiane-prefecture', district_code: '1-02' },
  { id: 'school-3', name_lo: 'ໂຮງຮຽນ ຜົ້ງສາລີ', name_en: 'Phongsaly Secondary School', romanised_name: null, province_code: 'phongsaly', district_code: '2-01' },
]


const CAREERS = [
  { slug: 'registered-nurse', title_en: 'Registered Nurse', title_lo: 'ພະຍາບານ', summary_en: 'Care for patients.', summary_lo: 'ດູແລຄົນເຈັບ.', cluster: 'health', primary_area: 'S', secondary_area: 'I',
    related_subjects: ['BIO', 'CHEM'], study_years: '4to5', work_settings: ['with_people'], preparation_en: ['Focus on biology and chemistry'], preparation_lo: ['ເນັ້ນຊີວະສາດ ແລະ ເຄມີສາດ'], facts: [] },
  { slug: 'secondary-teacher', title_en: 'Secondary School Teacher', title_lo: 'ຄູສອນມັດທະຍົມ', summary_en: 'Teach secondary students.', summary_lo: 'ສອນນັກຮຽນມັດທະຍົມ.', cluster: 'education', primary_area: 'S', secondary_area: 'I',
    related_subjects: ['LAO', 'MATH'], study_years: '4to5', work_settings: ['with_people'], preparation_en: ['Explain lessons to classmates'], preparation_lo: ['ຝຶກອະທິບາຍບົດຮຽນໃຫ້ໝູ່'], facts: [] },
  { slug: 'lawyer', title_en: 'Lawyer', title_lo: 'ທະນາຍຄວາມ', summary_en: 'Advise people about the law.', summary_lo: 'ໃຫ້ຄຳປຶກສາກ່ຽວກັບກົດໝາຍ.', cluster: 'law_public', primary_area: 'E', secondary_area: 'S',
    related_subjects: ['CIV'], study_years: '4to5', work_settings: ['office'], preparation_en: ['Read widely'], preparation_lo: ['ອ່ານຫຼາຍ'], facts: [] },
]
// A frozen career report (migration 157 shape).
const CAREER_REPORT = {
  student_name: 'Noy', generated_at: '2026-10-27T03:00:00Z', school_year: '2026-2027', grade_en: 'Grade 11', grade_lo: 'ມ.6', scores_as_of: '2026-10-20T03:00:00Z', questionnaire_on: '2026-10-24T03:00:00Z',
  interests: { R: { level: 'low' }, I: { level: 'medium' }, A: { level: 'low' }, S: { level: 'high' }, E: { level: 'medium' }, C: { level: 'not_enough' } },
  options: [{
    slug: 'registered-nurse', cluster: 'health', factors: { interest: ['S'], subjects: ['BIO'], preferences: [] }, title_en: 'Registered Nurse', title_lo: 'ພະຍາບານ',
    summary_en: 'Cares for patients in hospitals and health centres.', summary_lo: 'ດູແລຄົນເຈັບໃນໂຮງໝໍ ແລະ ສຸກສາລາ.', study_years: '4to5',
    preparation_en: ['Practise Biology and Chemistry each week.'], preparation_lo: ['ຝຶກຊີວະວິທະຍາ ແລະ ເຄມີສາດ ທຸກອາທິດ.'],
    subjects: [{ code: 'BIO', name_en: 'Biology', name_lo: 'ຊີວະວິທະຍາ', latest: 8, label: 'stronger' }, { code: 'CHEM', name_en: 'Chemistry', name_lo: 'ເຄມີສາດ', latest: null, label: null }],
    facts: [{ kind: 'work', text_en: 'Nurses work in shifts, including nights.', text_lo: 'ພະຍາບານເຮັດວຽກເປັນກະ, ລວມທັງກາງຄືນ.', source_name: 'Ministry of Health', source_url: 'https://moh.gov.la/', verified_on: '2026-10-01' }],
    programmes: [{ name_en: 'Bachelor of Nursing Science', name_lo: 'ປະລິນຍາຕີ ພະຍາບານສາດ', institution_en: 'University of Health Sciences', institution_lo: 'ມະຫາວິທະຍາໄລ ວິທະຍາສາດສຸຂະພາບ', degree_level: 'bachelor', duration_years: '4', entrance_group: 'B',
      requirements: [{ kind: 'cutoff', text_en: 'Cut-off 70', text_lo: 'ຄະແນນຂັ້ນຕ່ຳ 70', academic_year: '2026-2027', source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26' }],
      source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26' }],
  }],
  scholarships: [{ name_en: 'Health Sciences Scholarship', name_lo: 'ທຶນການສຶກສາ ວິທະຍາສາດສຸຂະພາບ', provider: 'University of Health Sciences', deadline: '2026-12-04', eligibility_en: 'Grade 12 students', eligibility_lo: 'ນັກຮຽນ ມ.7', source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-11-01' }],
  history: [{ created_at: '2026-10-24T03:00:00Z', reason: 'first', options: ['registered-nurse'] }, { created_at: '2026-10-26T03:00:00Z', reason: 'new_scores', options: ['registered-nurse'] }],
}

function careerView(state) {
  const items = Array.from({ length: 24 }, (_, i) => ({ n: i + 1, areas: ['S'], en: ['Help people understand laws or rules fairly', 'Work in a hospital or health centre', 'Teach children or young people', 'Analyse information to make a decision'][i - 20] ?? `Item ${i + 1}`, lo: `ຂໍ້ ${i + 1}` }))
  const c = state.career ?? {}
  const shortlist = state.shortlist ?? []
  const factors = { 'registered-nurse': { interest: ['S'], subjects: ['BIO'] }, 'secondary-teacher': { interest: ['S'], preferences: ['work_setting'] }, lawyer: { interest: ['S'] } }
  return {
    questionnaire: { version: '1.0.0', items, items_per_screen: 4, min_answered: 12 },
    in_progress: c.in_progress ?? null,
    completed_at: c.completed ? '2026-10-26T05:00:00Z' : null,
    area_scores: c.completed ? { areas: Object.fromEntries(['R', 'I', 'A', 'S', 'E', 'C'].map((a) => [a, { score: 1, answered: 4, level: a === 'S' ? 'high' : a === 'I' ? 'medium' : 'low' }])), top2: ['S'], top3: ['S', 'I'] } : null,
    preferences: {}, retake_after: '2027-01-24', catalogue_size: CAREERS.length, options_locked: !!state.careerLocked,
    result: c.completed ? {
      created_at: '2026-10-26T05:00:00Z', reason: shortlist.length ? 'shortlist' : 'first', has_scores: true,
      options: CAREERS.map((career) => ({ slug: career.slug, cluster: career.cluster, factors: { ...factors[career.slug], ...(shortlist.includes(career.slug) ? { saved: true } : {}) }, career })),
      changes: shortlist.length ? { since: '2026-10-26T05:00:00Z', reason: 'shortlist', added: [], removed: ['ux-designer'] } : null,
    } : null,
    shortlist,
    subject_names: { BIO: { en: 'Biology', lo: 'ຊີວະສາດ' }, CHEM: { en: 'Chemistry', lo: 'ເຄມີສາດ' }, MATH: { en: 'Mathematics', lo: 'ຄະນິດສາດ' }, LAO: { en: 'Lao', lo: 'ພາສາລາວ' }, CIV: { en: 'Civics', lo: 'ສຶກສາພົນລະເມືອງ' } },
  }
}

function fakeJwt(sub = USER_ID) {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', aud: 'authenticated', exp })}.sig`
}
const subOf = (authorization) => {
  try { return JSON.parse(Buffer.from((authorization ?? '').split('.')[1] ?? '', 'base64url').toString()).sub } catch { return undefined }
}

/** A mocked backend whose session moves through the module states. */
function backend(initial) {
  const state = { calls: [], events: [], ...initial }
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
    academic_check_pilot_code: (args) => String(args.p_code).replace(/[s-]/g, '').toUpperCase() === 'ABC234'
      ? { code: 'ABC234', name: 'Matthayom Thotlong' }
      : pgError(422, 'PILOT_CODE_INVALID', { field: 'pilot_code' }),
    // Usage events (ANL-001): kept for the assertions below.
    academic_track_events: (args) => {
      // Like the database: nothing is kept while consent is outstanding.
      if (state.step === 'consent') return { accepted: 0, duplicates: 0, dropped: args.p_events.length, tracking: false }
      state.events.push(...args.p_events)
      return { accepted: args.p_events.length, duplicates: 0, dropped: 0, tracking: true }
    },
    academic_search_schools: (args) => SCHOOLS.filter(s =>
      (!args.p_province_code || s.province_code === args.p_province_code)
      && (!args.p_district_code || s.district_code === args.p_district_code)
      && `${s.name_lo} ${s.name_en} ${s.romanised_name ?? ''}`.toLowerCase().includes(args.p_query.toLowerCase().slice(0, 3))),
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
    // Diagnostic quiz (migration 132): Mathematics has one; other subjects none.
    // After finishing, a retake (another form) waits 7 days; "strong" = >= 80% in every topic (ANALYSIS-007).
    academic_get_quiz_offer: (args) => (args.p_subject_enrolment_id === 'se-math'
      ? {
          diagnostic: { id: 'dg1', title_lo: 'ກວດຄະນິດສາດ ມ.6', title_en: 'Grade 11 Mathematics check', items: QUIZ_ITEMS.length },
          start_id: state.quizDone || state.quizLocked ? null : 'dg1', retake_from: state.quizDone && !state.quizLocked ? '2026-11-01T08:00:00Z' : null,
          locked: state.quizLocked ? 'diagnostic_unlimited' : null,
          attempt: state.quizAnswers && !state.quizDone && Object.keys(state.quizAnswers).length < QUIZ_ITEMS.length ? { id: 'at1', answered: Object.keys(state.quizAnswers).length, total: QUIZ_ITEMS.length, expires_at: '2026-11-01T00:00:00Z' } : null,
          last_result: state.quizDone ? { id: 'at1', completed_at: '2026-10-25T08:00:00Z', strong: quizResult(state.quizAnswers).topics.every(t => t.correct * 10 >= t.total * 8) } : null,
        }
      : { diagnostic: null, start_id: null, retake_from: null, attempt: null, last_result: null }),
    academic_start_quiz: () => {
      state.quizAnswers ??= {}
      return { attempt_id: 'at1', status: 'in_progress', expires_at: '2026-11-01T00:00:00Z', diagnostic: { id: 'dg1', title_lo: 'ກວດຄະນິດສາດ ມ.6', title_en: 'Grade 11 Mathematics check' },
        items: QUIZ_ITEMS.map(({ correct_key, explanation_lo, explanation_en, explanation_origin, ...item }) => item), answers: { ...state.quizAnswers } }
    },
    academic_answer_quiz_item: (args) => { state.quizAnswers[args.p_item_id] = args.p_key; return { answered: Object.keys(state.quizAnswers).length, total: QUIZ_ITEMS.length } },
    academic_finish_quiz: () => { state.quizDone = true; return quizResult(state.quizAnswers, state.quizPrevious) },
    academic_get_quiz_result: () => quizResult(state.quizAnswers ?? {}, state.quizPrevious),
    // Score-book scanning (migration 139): off unless a scenario sets state.ocr.
    academic_ocr_status: () => ({
      available: !!state.ocr, consent: state.consents.some(c => c.purpose === 'ocr_processing' && !c.withdrawn_at),
      allowance: { limit: 10, used: state.ocrUsed ?? 3, remaining: Math.max(0, 10 - (state.ocrUsed ?? 3)) },
    }),
    academic_start_ocr_job: (args) => {
      if (state.ocrDuplicate && !args.p_ignore_duplicate) return { duplicate: { job_id: 'ocr-old', created_at: '2026-10-10T03:00:00Z' } }
      return { job: ocrJob('ocr-1', 'awaiting_upload') }
    },
    academic_reuse_ocr_job: () => ({ job: ocrJob('ocr-2', 'succeeded', OCR_EXTRACTION, 'ocr-old') }),
    academic_get_ocr_job: (args) => ocrJob(args.p_job_id, 'succeeded', OCR_EXTRACTION),
    academic_discard_ocr_job: (args) => { (state.ocrDiscarded ??= []).push(args.p_job_id); return ocrJob(args.p_job_id, 'discarded') },
    academic_list_ocr_photos: () => ({ photos: (state.ocrPhotos ?? []).filter(p => !(state.ocrDeleted ?? []).includes(p.job_id)) }),
    academic_delete_ocr_image: (args) => { (state.ocrDeleted ??= []).push(args.p_job_id); return { ...ocrJob(args.p_job_id, 'confirmed'), has_image: false } },
    academic_confirm_ocr_job: (args) => {
      const entry = state.entries[args.p_period_id] ??= { state: 'draft', version: 1, lines: {} }
      if (entry.state === 'submitted') return pgError(409, 'SCORE_DUPLICATE', { score_entry_id: 'x' })
      entry.lines = Object.fromEntries(args.p_lines.map(line => [line.subject_enrolment_id, { status: line.status, value: line.value ?? null, version: 1, edited: false }]))
      Object.assign(entry, { state: 'submitted', key: `ocr:${args.p_job_id}`, submitted_at: '2026-10-20T03:00:00Z' })
      return { ...entryView(args.p_period_id), ocr_job_id: args.p_job_id }
    },
    // Next actions (migration 136) and practice sets (137).
    academic_get_recommendations: () => ({ items: state.recommendations ?? [], more_locked: state.recsLocked ?? 0 }),
    // Coach academic mode (migration 145).
    academic_coach_status: () => state.coach ?? { available: false, busy: false, quota: null, resources: [] },
    academic_coach_feedback: (args) => { (state.coachFeedback ??= []).push(args); return { id: 'f1', rating: args.p_input.rating ?? null, report_category: args.p_input.report_category ?? null, share_text: !!args.p_input.share_text } },
    // Guardian links (migration 152): a small stateful stand-in.
    academic_list_guardian_links: () => ({ consent_state: state.consentState ?? 'active', invites: state.guardianInvites ?? [], links: state.guardianLinks ?? [], default_scopes: { scores: true, plan: true, careers: false, goals_text: false } }),
    academic_create_guardian_invite: (args) => { const invite = { id: 'inv1', code: 'K7MQ2XPA', purpose: args.p_purpose, scopes: { scores: true, plan: true, careers: false, goals_text: false, ...args.p_scopes }, expires_at: '2026-10-29T05:00:00Z' }; (state.guardianInvites ??= []).push(invite); return invite },
    academic_confirm_guardian_link: (args) => { const l = state.guardianLinks.find((x) => x.id === args.p_link_id); l.status = args.p_confirm ? 'active' : 'removed'; state.guardianLinks = state.guardianLinks.filter((x) => x.status !== 'removed'); return {} },
    academic_set_guardian_scopes: (args) => { const l = state.guardianLinks.find((x) => x.id === args.p_link_id); Object.assign(l.scopes, args.p_scopes); return {} },
    academic_remove_guardian_link: (args) => { state.guardianLinks = state.guardianLinks.filter((x) => x.id !== args.p_link_id); return {} },
    academic_preview_guardian_invite: (args) => args.p_code === 'K7MQ2XPA' ? { student_name: 'Noy', purpose: state.invitePurpose ?? 'link', scopes: { scores: true, plan: true, careers: true, goals_text: false }, expires_at: '2026-10-29T05:00:00Z' } : pgError(404, 'GUARDIAN_CODE_INVALID'),
    academic_accept_guardian_invite: (args) => { (state.family ??= []).push({ id: 'gl9', status: 'pending_student', purpose: 'link', relationship: args.p_relationship, scopes: {}, guardian_name: 'Mrs Phonsavan', student_name: 'Noy', declared_at: '2026-10-26T05:00:00Z', confirm_by: '2026-11-02T05:00:00Z', confirmed_at: null, reconfirm_by: null, removed_at: null, removed_by: null }); return state.family.at(-1) },
    academic_get_family: () => ({ links: state.family ?? [], notices: [] }),
    academic_guardian_child: (args) => args.p_link_id !== 'gl7' ? pgError(404, 'NOT_FOUND') : {
      link_id: 'gl7', name: 'Noy', relationship: 'mother', scopes: { scores: true, plan: true, careers: !!state.childSharesCareers, goals_text: false }, grade_en: 'Grade 11', grade_lo: 'ມ.6', school_year: '2026-2027',
      scores: { scale: { min: 0, max: 10 }, hidden_recent: true, months: [{ label_en: 'September', label_lo: 'ກັນຍາ', average: 6.75, change: null }, { label_en: 'October', label_lo: 'ຕຸລາ', average: 6.5, change: -0.25 }],
        subjects: [{ name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ', latest: 6, average: 6.5, change: -1, label: 'relatively_lower', trend: 'declining', number_of_scores: 3 },
          { name_en: 'Physics', name_lo: 'ຟີຊິກສາດ', latest: 7, average: 6.75, change: 0.5, label: 'neutral', trend: 'insufficient_evidence', number_of_scores: 2 }] },
      suggestions: [{ kind: 'ask_hardest', subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ' }, { kind: 'check_in' }, { kind: 'ask_support' }],
      plan: { goals: [{ subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ', target: 8, target_period: { label_en: 'March', label_lo: 'ມີນາ' } }], week: { done: 2, total: 4 }, has_plan: true },
      careers: null, goals_text: null,
      reports_entitled: true, reports: [{ id: 'rep1', label_en: 'October', label_lo: 'ຕຸລາ', generated_at: '2026-11-04T23:10:00Z', read: false }],
    },
    academic_guardian_report: (args) => args.p_report_id !== 'rep1' ? pgError(404, 'NOT_FOUND') : { id: 'rep1', link_id: 'gl7', generated_at: '2026-11-04T23:10:00Z', content: {
      student_name: 'Noy', period: { label_en: 'October', label_lo: 'ຕຸລາ', school_year: '2026-2027', generated_at: '2026-11-04T23:10:00Z', data_as_of: '2026-11-01T08:00:00Z' },
      recorded: { recorded: 4, active: 5, missing: [{ name_en: 'Chemistry', name_lo: 'ເຄມີສາດ' }] },
      changes: { mean_change: -0.25, subjects: [{ name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ', latest: 6, previous: 7, direction: 'down' }, { name_en: 'Lao language', name_lo: 'ພາສາລາວ', latest: 8.5, previous: 8.5, direction: 'same' }] },
      stronger: [{ name_en: 'Lao language', name_lo: 'ພາສາລາວ', reason: { n: 3, above: 3, below: 0, confidence: 'medium' } }],
      needs_attention: [{ name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ', reason: { n: 3, above: 0, below: 2, confidence: 'low' } }],
      activities: { quizzes: 1, practice: 2, plan_tasks: 5 },
      next_steps: [{ kind: 'ask_hardest', subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ' }, { kind: 'ask_support' }],
    } },
    // Career guidance (migration 150): a small stateful stand-in.
    academic_get_career_guidance: () => careerView(state),
    academic_career_catalogue: () => ({
      careers: CAREERS,
      institutions: [{ slug: 'uhs', name_en: 'University of Health Sciences', name_lo: 'ມະຫາວິທະຍາໄລ ວິທະຍາສາດສຸຂະພາບ', province_code: 'vientiane-prefecture', website_url: 'https://uhs.edu.la/' },
        { slug: 'cu', name_en: 'Champasack University', name_lo: 'ມະຫາວິທະຍາໄລ ຈຳປາສັກ', province_code: 'champasak', website_url: 'https://www.cu.edu.la/' }],
      programmes: [
        { slug: 'p-nurse', institution: 'uhs', name_en: 'Bachelor of Nursing Science', name_lo: 'ປະລິນຍາຕີ ພະຍາບານສາດ', degree_level: 'bachelor', duration_years: '4', entrance_group: 'B', field: 'health', careers: ['registered-nurse'],
          source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', out_of_date: false,
          requirements: [{ kind: 'cutoff', text_en: 'Cut-off 70', text_lo: 'ຄະແນນຂັ້ນຕ່ຳ 70', academic_year: '2026-2027', source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', out_of_date: false }] },
        { slug: 'p-edu', institution: 'cu', name_en: 'Bachelor of Education', name_lo: 'ປະລິນຍາຕີ ສຶກສາສາດ', degree_level: 'bachelor', duration_years: '4', field: 'education', careers: ['secondary-teacher'],
          source_name: 'CU', source_url: 'https://www.cu.edu.la/', verified_on: '2026-10-26', out_of_date: false },
      ],
      scholarships: [{ slug: 's-uhs', name_en: 'Health Sciences Scholarship', name_lo: 'ທຶນການສຶກສາ ວິທະຍາສາດສຸຂະພາບ', provider: 'University of Health Sciences', deadline: '2026-12-04', academic_year: '2026-2027',
        eligibility_en: 'Grade 12 students', eligibility_lo: 'ນັກຮຽນ ມ.7', source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-11-01', out_of_date: false }],
      exam_blueprints: [{ slug: 'e-nuol-2026-a', name_en: 'Entrance exam, Group A (STEM)', name_lo: 'ສອບເສັງເຂົ້າ ກຸ່ມ A (STEM)', group: 'A', intake_year: '2026-2027', exam_date: '2026-08-08',
        sessions: [{ label_en: 'Morning: Mathematics A and Physics', label_lo: 'ຕອນເຊົ້າ: ຄະນິດສາດ A ແລະ ຟີຊິກສາດ', minutes: 120, subjects: ['MATH', 'PHYS'] }],
        note_en: 'Question count and maximum score are not stated in the source.', note_lo: 'ແຫຼ່ງຂໍ້ມູນບໍ່ໄດ້ບອກຈຳນວນຂໍ້ ແລະ ຄະແນນເຕັມ.',
        source_name: 'National University of Laos', source_url: 'https://nuol.edu.la/index.php/news/640', verified_on: '2026-10-27', out_of_date: false }],
      exam_intake_year: '2027-2028',
    }),
    academic_my_scholarships: () => state.scholarships ?? [],
    // Compare school years (migration 162): only this year unless a scenario adds more.
    academic_compare_years: (args) => state.compareYears ?? { subject: { name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ' }, years: [{ subject_enrolment_id: args.p_subject_enrolment_id, current: true, year: '2026-2027',
      grade_en: 'Grade 11', grade_lo: 'ມ.6', scale: { family: 'numeric_linear', min: 0, max: 10, normalisable: true }, compatible: true, reason: null, series: [] }] },
    // Guardian report e-mails (migration 161).
    academic_guardian_email_settings: () => (state.guardianEmail ??= { account_email: 'mother@example.com', is_guardian: true, status: 'off', email: null, include_scores: false, confirmed_at: null }),
    academic_guardian_email_subscribe: (args) => (state.guardianEmail = state.guardianEmail.status === 'confirmed'
      ? { ...state.guardianEmail, include_scores: args.p_include_scores }
      : { ...state.guardianEmail, status: 'pending', email: state.guardianEmail.account_email, include_scores: args.p_include_scores }),
    academic_guardian_email_stop: () => (state.guardianEmail = { ...state.guardianEmail, status: 'unsubscribed' }),
    // Career report and its one-time purchase (migration 157).
    academic_career_reports: () => ({ entitled: !!state.reportEntitled, reports: state.careerReports ?? [] }),
    academic_my_report_purchase: () => ({ price: { price_lak: 49000, months: 12 }, entitled: !!state.reportEntitled, purchase: state.reportPurchase ?? null }),
    academic_start_report_purchase: () => { state.reportPurchase = { id: 'rp1', amount_lak: 49000, status: 'pending', has_receipt: false, rejection_reason: null, created_at: '2026-10-27T03:00:00Z', reviewed_at: null, valid_until: null }; return rpc.academic_my_report_purchase() },
    academic_submit_report_receipt: () => { Object.assign(state.reportPurchase, { status: 'review', has_receipt: true }); return rpc.academic_my_report_purchase() },
    academic_cancel_report_purchase: () => { state.reportPurchase = null; return rpc.academic_my_report_purchase() },
    academic_generate_career_report: () => { (state.careerReports ??= []).unshift({ id: 'cr1', generated_at: CAREER_REPORT.generated_at }); return { id: 'cr1', generated_at: CAREER_REPORT.generated_at, content: CAREER_REPORT } },
    academic_guardian_career_reports: () => state.childSharesCareers ? { shared: true, reports: [{ id: 'cr1', generated_at: CAREER_REPORT.generated_at }] } : { shared: false, reports: [] },
    academic_guardian_career_report: (args) => state.childSharesCareers && args.p_report_id === 'cr1' ? { id: 'cr1', link_id: 'gl7', generated_at: CAREER_REPORT.generated_at, content: CAREER_REPORT } : pgError(404, 'NOT_FOUND'),
    academic_get_career_report: (args) => args.p_report_id === 'cr1' ? { id: 'cr1', generated_at: CAREER_REPORT.generated_at, content: CAREER_REPORT } : pgError(404, 'NOT_FOUND'),
    academic_set_scholarship_saved: (args) => { state.scholarships = args.p_saved ? [{ slug: args.p_slug, remind: args.p_remind }] : []; return state.scholarships },
    academic_start_career_questionnaire: (args) => { state.career = { ...(state.career ?? {}), in_progress: { answers: {}, preferences: {}, reason: args.p_reason } }; return careerView(state) },
    academic_save_career_answers: (args) => { (state.careerSaves ??= []).push(args); Object.assign(state.career.in_progress.answers, args.p_answers); if (args.p_preferences) state.career.in_progress.preferences = args.p_preferences; return { saved: true } },
    academic_finish_career_questionnaire: () => { state.career = { completed: true }; return careerView(state) },
    academic_set_career_saved: (args) => { state.shortlist = args.p_saved ? [...(state.shortlist ?? []), args.p_slug] : (state.shortlist ?? []).filter((x) => x !== args.p_slug); return { shortlist: state.shortlist } },
    // Study planner (migration 143): a small stateful stand-in.
    academic_get_planner: () => plannerView(),
    academic_preview_goal: (args) => goalPreview(args.p_subject_enrolment_id, Number(args.p_target), args.p_target_period_id),
    academic_save_goal: (args) => {
      const p = goalPreview(args.p_input.subject_enrolment_id ?? state.goals.find(g => g.id === args.p_input.id).subject_enrolment_id, Number(args.p_input.target), args.p_input.target_period_id)
      const period = PLANNER_PERIODS.find(x => x.id === p.target_period_id)
      const subject = PLANNER_SUBJECTS.find(x => x.subject_enrolment_id === p.subject_enrolment_id)
      const half = PLANNER_PERIODS.find(x => x.months === Math.ceil(p.months_remaining / 2))
      const goal = { id: args.p_input.id ?? `goal-${state.goals.length + 1}`, subject_enrolment_id: p.subject_enrolment_id, subject_lo: subject.name_lo, subject_en: subject.name_en,
        baseline: p.baseline, target: p.target, months_remaining: p.months_remaining, required_gain: p.required_gain, feasibility: p.feasibility,
        target_period: period, milestone: p.milestone_value === null ? null : { value: p.milestone_value, period: half }, latest: p.baseline, status: 'active', version: 1 }
      state.goals = [...state.goals.filter(g => g.id !== goal.id), goal]
      return goal
    },
    academic_archive_goal: (args) => { state.goals = state.goals.filter(g => g.id !== args.p_goal_id); return { id: args.p_goal_id, status: 'archived' } },
    academic_save_plan: (args) => {
      state.plan = { days: args.p_input.days, minutes_per_day: args.p_input.minutes_per_day, paused_until: null, starts_on: '2026-11-18', xp_opt_in: false, xp_per_task: 10 }
      state.tasks = [
        plannerTask('t1', '2026-11-18', 'practice_set', { title_en: 'Algebra practice', title_lo: 'ຝຶກພຶດຊະຄະນິດ', route: '/academy/scores/practice/t1', est_minutes: 8 }),
        plannerTask('t2', '2026-11-21', 'self_study', { subject_en: 'Mathematics', subject_lo: 'ຄະນິດສາດ', est_minutes: 20 }),
        plannerTask('t0', '2026-11-18', 'self_study', { subject_en: 'Physics', subject_lo: 'ຟີຊິກສາດ', est_minutes: 20, moved: true, first_date: '2026-11-14', needs_decision: true }),
      ]
      return plannerView()
    },
    academic_pause_plan: (args) => { state.plan.paused_until = args.p_until; return plannerView() },
    academic_set_planner_xp: (args) => { state.plan.xp_opt_in = args.p_on; return plannerView() },
    academic_update_task: (args) => {
      const task = state.tasks.find(t => t.id === args.p_task_id)
      if (args.p_action === 'done') Object.assign(task, { state: 'done', done_by: 'student', xp: task.xp || (state.plan.xp_opt_in ? 10 : 0) })
      if (args.p_action === 'skip') Object.assign(task, { state: 'skipped', needs_decision: false })
      return task
    },
    // Entitlements (migration 141): Free and not enforced unless a scenario says otherwise.
    academic_my_entitlements: () => state.entitlements ?? {
      enforced: false, tier: 'free', premium: { active: false, source: null, until: null }, period_key: '2026-10', resets_at: '2026-10-31T17:00:00Z',
      features: { ocr_upload: { enabled: true, source: 'free', until: null, quota: { limit: 10, used: 3, remaining: 7 } }, advanced_analysis: { enabled: true, source: 'open', until: null, quota: null } },
    },
    academic_recommendation_feedback: (args) => {
      state.feedback = [...(state.feedback ?? []), args]
      state.recommendations = (state.recommendations ?? []).filter(item => item.key !== args.p_item_key)
      return { item_key: args.p_item_key, response: args.p_response }
    },
    academic_start_practice: () => ({
      attempt_id: 'pa1', status: 'in_progress', correct: null, topic: { id: 't1', name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra' },
      items: PRACTICE_ITEMS.map(({ correct_key, explanation_lo, explanation_en, explanation_origin, ...item }) => ({ ...item, feedback: state.practice?.[item.id] ?? null })),
    }),
    academic_answer_practice_item: (args) => {
      const item = PRACTICE_ITEMS.find(i => i.id === args.p_item_id)
      const feedback = { chosen_key: args.p_key, is_correct: args.p_key === item.correct_key, correct_key: item.correct_key, explanation_lo: item.explanation_lo, explanation_en: item.explanation_en, explanation_origin: item.explanation_origin }
      state.practice = { ...(state.practice ?? {}), [item.id]: feedback }
      return feedback
    },
    academic_finish_practice: () => ({ attempt_id: 'pa1', correct: Object.values(state.practice ?? {}).filter(f => f.is_correct).length, total: PRACTICE_ITEMS.length }),
    academic_report_problem: (args) => {
      state.problemReports = [...(state.problemReports ?? []), args.p_input]
      return { id: 'pr1', priority: args.p_input.category === 'other' ? 'normal' : 'priority', first_response_due: '2026-10-27T03:00:00Z' }
    },
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
  state.goals ??= []
  state.tasks ??= []
  const goalPreview = (subjectId, target, periodId) => {
    const baseline = PLANNER_SUBJECTS.find(x => x.subject_enrolment_id === subjectId).baseline
    const months = PLANNER_PERIODS.find(x => x.id === periodId).months
    const gain = (target - baseline) / months
    const feasibility = target <= baseline ? 'maintain' : gain <= 0.25 ? 'steady' : gain <= 0.5 ? 'stretch' : 'ambitious'
    return { subject_enrolment_id: subjectId, baseline, target, target_period_id: periodId, months_remaining: months, required_gain: Math.round(gain * 1000) / 1000, feasibility,
      milestone_value: feasibility === 'ambitious' ? Math.min(target, baseline + 0.5 * Math.ceil(months / 2)) : null, milestone_period_id: null }
  }
  const plannerTask = (id, date, kind, extra = {}) => ({ id, date, first_date: date, kind, title_lo: null, title_en: null, subject_lo: null, subject_en: null, route: null,
    est_minutes: 20, state: 'scheduled', moved: false, needs_decision: false, done_by: null, xp: 0, ...extra })
  const plannerView = () => ({
    entitled: !state.plannerFree, free_goals: 1, minutes_options: [10, 15, 20, 30, 45], today: '2026-11-18',
    scale: { id: 'v1', code: 'LA-0-10', version: 1, family: 'numeric_linear', min: 0, max: 10, step: 0.5, decimals: 1, pass_mark: 5, normalisable: true, levels: null },
    goals: state.goals, subjects: PLANNER_SUBJECTS, periods: PLANNER_PERIODS, plan: state.plan ?? null,
    week: state.plan && !state.plannerFree ? { week_start: '2026-11-16', tasks: state.tasks, decisions: state.tasks.filter(t => t.needs_decision && t.state === 'scheduled') } : null,
    review: state.plan ? { week_start: '2026-11-09', planned: 4, done: 3, minutes: 55, topics: [{ lo: 'ຝຶກພຶດຊະຄະນິດ', en: 'Algebra practice' }] } : null,
    suggestion: state.goals.length ? null : { subject_enrolment_id: 'se-math', name_lo: 'ຄະນິດສາດ', name_en: 'Mathematics', baseline: 5.5, target: 6.5 },
  })
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
  const ocrJob = (id, status, extraction = null, duplicateOf = null) => ({
    job_id: id, status, enrolment_id: 'e1', created_at: '2026-10-20T03:00:00Z', duplicate_of: duplicateOf, extraction,
    error_code: null, keep_photo: false, has_image: status !== 'awaiting_upload', thresholds: { clear: 0.85, review: 0.5 }, timeout_seconds: 60,
  })
  const tables = {
    academic_grades: GRADES,
    academic_subjects: SUBJECTS,
    academic_years: [{ id: 'y1', code: '2026-2027', start_date: '2026-09-01', end_date: '2027-05-31' }],
    payment_accounts: [{ id: 'pa1', method: 'bank_transfer', label: 'BCEL One', bank_name: 'BCEL', account_name: 'Bitdoin Co', account_number: '0101 0000 1234 5678', qr_image_url: null, instructions: null }],
    users: [{ id: USER_ID, name: 'Noy Student', phone: null, email: 'noy@example.com', avatar_url: null, cover_image_url: null, member_code: 'DAN9XY', role: 'CUSTOMER', language: state.lang, currency: 'LAK', created_at: '2026-10-01', updated_at: '2026-10-01' }],
  }
  const settings = { allowed_grade_levels: ['upper_secondary'], max_subjects_per_enrolment: 25 }

  async function handle(route) {
    const request = route.request()
    const url = new URL(request.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.startsWith('/auth/v1/')) return json({ id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'noy@example.com' })
    if (url.pathname === '/functions/v1/premium-coach') {
      const body = request.postDataJSON() ?? {}
      state.coachCalls = [...(state.coachCalls ?? []), body]
      if (body.action === 'summary') return json({ summary: 'In October, your average was 6.5 (down 0.25 from September). Next step: try the Mathematics quiz.', source: 'ai' })
      if (state.coachBusy) return json({ error: 'Coach is busy – try later. Your scores, charts and suggestions still work.', code: 'COACH_BUSY' }, 503)
      return json({ conversationId: '7d0c4a1e-1111-4222-8333-444455556666', messageId: '9a1b2c3d-1111-4222-8333-444455556666', answer: 'Mathematics went from **7** in September to **6** in October. Next step: try the short Mathematics quiz.' })
    }
    if (url.pathname === '/functions/v1/academic-alerts') {
      const body = request.postDataJSON() ?? {}
      state.emailLinks = [...(state.emailLinks ?? []), body]
      if (body.action === 'email_confirm') {
        if (body.token !== 'good-token') return json({ status: 'invalid' })
        state.guardianEmail = { ...state.guardianEmail, status: 'confirmed', confirmed_at: '2026-10-27T05:00:00Z' }
        return json({ status: 'confirmed' })
      }
      if (body.action === 'email_unsubscribe') return json({ status: 'unsubscribed', scope: body.token === 'acct-token' ? 'account' : 'guardian' })
      return json({ error: 'Unknown action' }, 400)
    }
    if (url.pathname === '/functions/v1/academic-ocr') {
      const body = request.postDataJSON() ?? {}
      state.ocrUploads = [...(state.ocrUploads ?? []), { job_id: body.job_id, bytes: body.image_base64?.length ?? 0, image_quality: body.image_quality, jpeg: (body.image_base64 ?? '').startsWith('/9j/') }]
      if (state.ocrFail) return json({ error: { code: 'OCR_FAILED', status: 502, reason: 'provider_error' } }, 502)
      return json(ocrJob(body.job_id, 'succeeded', OCR_EXTRACTION))
    }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      state.uploads = [...(state.uploads ?? []), url.pathname]
      return json({ Key: url.pathname.replace('/storage/v1/object/', ''), Id: 'obj1' })
    }
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
      const all = { ...settings, pilot_mode: !!state.pilot }
      return json(key in all ? { value: all[key] } : null)
    }
    const rows = state.tables?.[table] ?? tables[table] ?? []
    return json(single ? rows[0] ?? null : rows)
  }
  return { state, handle, rpc }
}

const PLANNER_SUBJECTS = [
  { subject_enrolment_id: 'se-math', name_lo: 'ຄະນິດສາດ', name_en: 'Mathematics', baseline: 5.5 },
  { subject_enrolment_id: 'se-lao', name_lo: 'ພາສາລາວ', name_en: 'Lao Language', baseline: 7 },
  { subject_enrolment_id: 'se-phys', name_lo: 'ຟີຊິກສາດ', name_en: 'Physics', baseline: null },
]
const PLANNER_PERIODS = ['December', 'January', 'February', 'March', 'April', 'May'].map((label_en, i) => ({ id: `m${i + 4}`, label_lo: `ເດືອນ ${i + 4}`, label_en, months: i + 1 }))

// A scan of September (migration 139 shape): Mathematics clear, Lao Language
// uncertain, Physics unreadable (suggested match), one row with no subject.
const ocrRow = (subject_raw, score_value, score_confidence, match, extra = {}) => ({
  subject_raw, score_raw: score_value === null ? '?' : String(score_value), score_value, score_confidence, struck_through: false, replacement_value: null,
  bbox: [40, 40 + score_confidence * 100, 200, 80 + score_confidence * 100], subject_match: match, ...extra,
})
const OCR_EXTRACTION = {
  schema: 'ocr_extraction.v1', model: { id: 'qwen3-vl-plus', prompt_version: 'ocr_extract.v1.0' }, image_quality: null,
  document: { detected_person_blocks: 2 }, warnings: ['multiple_person_blocks'], processing_ms: 9000,
  periods: [{ period_label_raw: 'ເດືອນ 9', period_guess: { month: 9, confidence: 0.9 }, rows: [
    ocrRow('ຄະນິດສາດ', 7.5, 0.95, { subject_enrolment_id: 'se-math', subject_code: 'MATH', method: 'alias_exact', confidence: 1 }),
    ocrRow('ພາສາລາວ', 8, 0.6, { subject_enrolment_id: 'se-lao', subject_code: 'LAO', method: 'alias_exact', confidence: 1 }),
    ocrRow('ຟີຊິກ', null, 0, { subject_enrolment_id: 'se-phys', subject_code: 'PHYS', method: 'alias_fuzzy', confidence: 0.88 }),
    ocrRow('ສິລະປະ', 9, 0.9, { subject_enrolment_id: null, method: 'none', confidence: 0.4 }),
  ] }],
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

/** A two-item practice set; the second explanation is AI-drafted. */
const PRACTICE_ITEMS = [
  { id: 'pi1', position: 1, stem_lo: 'ຖ້າ x + 1 = 4, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If x + 1 = 4, what is x?', correct_key: 'B', explanation_lo: 'ລົບ 1 ອອກທັງສອງຂ້າງ.', explanation_en: 'Take 1 from both sides.', explanation_origin: 'human',
    options: [{ key: 'A', text_lo: '5', text_en: null }, { key: 'B', text_lo: '3', text_en: null }] },
  { id: 'pi2', position: 2, stem_lo: 'ຖ້າ 3x = 9, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If 3x = 9, what is x?', correct_key: 'A', explanation_lo: 'ຫານດ້ວຍ 3.', explanation_en: 'Divide by 3.', explanation_origin: 'ai',
    options: [{ key: 'A', text_lo: '3', text_en: null }, { key: 'B', text_lo: '6', text_en: null }] },
]

/** Next actions as the engine returns them (golden case: free student). */
const WEEK = [
  { key: 'R1:p7', rule_id: 'R1', kind: 'enter_scores', title_lo: 'ມີນາ', title_en: 'March', est_minutes: 2, route: '/academy/scores/entry', priority: 100, reason: { code: 'R1', period_lo: 'ມີນາ', period_en: 'March' } },
  { key: 'practice_set:c1', rule_id: 'R3', kind: 'practice_set', title_lo: 'ພຶດຊະຄະນິດ', title_en: 'Algebra', est_minutes: 8, route: '/academy/scores/practice/t1', priority: 80,
    reason: { code: 'R3', subject_lo: 'ຄະນິດສາດ', subject_en: 'Mathematics', topic_lo: 'ພຶດຊະຄະນິດ', topic_en: 'Algebra', band: 'needs_practice', date: '2026-10-12T05:00:00Z' } },
  { key: 'gap:t2', rule_id: 'R3', kind: 'gap', title_lo: 'ເລຂາຄະນິດ', title_en: 'Geometry', est_minutes: null, route: null, priority: 80,
    reason: { code: 'gap', subject_lo: 'ຄະນິດສາດ', subject_en: 'Mathematics', topic_lo: 'ເລຂາຄະນິດ', topic_en: 'Geometry' } },
]

/** A short diagnostic: two algebra items and one geometry item; the second algebra explanation is AI-drafted. */
const QUIZ_ITEMS = [
  { id: 'qi1', position: 1, topic: { name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra' }, stem_lo: 'ຖ້າ x + 2 = 5, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If x + 2 = 5, what is x?', correct_key: 'B', explanation_lo: 'ລົບ 2 ອອກທັງສອງຂ້າງ.', explanation_en: 'Take 2 from both sides.', explanation_origin: 'human',
    options: [{ key: 'A', text_lo: '2', text_en: null }, { key: 'B', text_lo: '3', text_en: null }, { key: 'C', text_lo: '7', text_en: null }] },
  { id: 'qi2', position: 2, topic: { name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra' }, stem_lo: 'ຖ້າ 2x = 8, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If 2x = 8, what is x?', correct_key: 'C', explanation_lo: 'ຫານທັງສອງຂ້າງດ້ວຍ 2.', explanation_en: 'Divide both sides by 2.', explanation_origin: 'ai',
    options: [{ key: 'A', text_lo: '2', text_en: null }, { key: 'B', text_lo: '6', text_en: null }, { key: 'C', text_lo: '4', text_en: null }] },
  { id: 'qi3', position: 3, topic: { name_lo: 'ເລຂາຄະນິດ', name_en: 'Geometry' }, stem_lo: 'ຮູບສາມແຈ ມີຈັກມຸມ?', stem_en: 'How many angles does a triangle have?', correct_key: 'A', explanation_lo: 'ສາມແຈ ມີ 3 ມຸມ.', explanation_en: 'A triangle has 3 angles.', explanation_origin: 'human',
    options: [{ key: 'A', text_lo: '3', text_en: null }, { key: 'B', text_lo: '4', text_en: null }] },
]

QUIZ_ITEMS.splice(2, 0, { id: 'qi4', position: 3, topic: { name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra' }, stem_lo: 'ຖ້າ x − 4 = 1, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If x − 4 = 1, what is x?', correct_key: 'A', explanation_lo: 'ບວກ 4 ທັງສອງຂ້າງ.', explanation_en: 'Add 4 to both sides.', explanation_origin: 'human',
  options: [{ key: 'A', text_lo: '5', text_en: null }, { key: 'B', text_lo: '3', text_en: null }] })
QUIZ_ITEMS[3].position = 4

/** As the engine scores it (QUIZ-002): fewer than 3 items -> not_enough; >= 80% secure; >= 50% developing. */
function quizResult(answers, previousAnswers = null) {
  const items = QUIZ_ITEMS.map(({ id, ...item }) => ({ ...item, chosen_key: answers[id] ?? null, is_correct: answers[id] === item.correct_key }))
  const band = (correct, total) => (total < 3 ? 'not_enough' : correct * 10 >= total * 8 ? 'secure' : correct * 2 >= total ? 'developing' : 'needs_practice')
  const topics = ['Algebra', 'Geometry'].map((name, i) => {
    const own = items.filter(item => item.topic.name_en === name)
    const correct = own.filter(item => item.is_correct).length
    return { topic_id: `t${i + 1}`, name_lo: own[0].topic.name_lo, name_en: name, correct, total: own.length, band: band(correct, own.length) }
  })
  const previous = previousAnswers && { attempt_id: 'at0', completed_at: '2026-10-10T08:00:00Z', topics: quizResult(previousAnswers).topics }
  return { attempt_id: 'at1', completed_at: '2026-10-25T08:00:00Z', diagnostic: { id: 'dg1', title_lo: 'ກວດຄະນິດສາດ ມ.6', title_en: 'Grade 11 Mathematics check' }, topics, previous, items }
}

/** The worked example with engine v2 labels and trends (golden case L01; insights switched on). */
function insightsDashboard() {
  const view = workedExampleDashboard()
  // label, confidence, n, D, above, below | trend, confidence, n, slope, p, sd, direction
  const v2 = {
    MATH: ['relatively_lower', 'high', 6, -1.3944, 0, 6, 'declining', 'medium', 6, -0.3333, 0.1806, 0.736, 'down'],
    PHYS: ['relatively_lower', 'medium', 5, -1.0333, 0, 5, 'no_clear_trend', null, 5, -0.1833, 0.2673, 0.4472, 'down'],
    CHEM: ['relatively_stronger', 'medium', 6, 0.7722, 6, 0, 'improving', 'medium', 6, 0.1667, 0.1001, 0.3764, 'up'],
    BIO: ['relatively_stronger', 'high', 6, 1.6056, 6, 0, 'improving', 'medium', 6, 0.1667, 0.1001, 0.3764, 'up'],
    LAO: ['neutral', null, 6, 0.6056, 6, 0, 'no_clear_trend', null, 6, 0, 1, 0.2041, 'flat'],
    ENG: ['neutral', null, 6, -0.7278, 1, 4, 'volatile', 'medium', 6, 0.3, 0.5661, 1.1143, 'up'],
  }
  view.engine_version = 'f1-f10@2.0.0'
  view.subjects = view.subjects.map(subject => {
    const [label, lc, ln, d, above, below, trend, tc, tn, slope, p, sd, direction] = v2[subject.code]
    return {
      ...subject,
      label: { value: label, confidence: lc, rule: `ANALYSIS-002.${label}`, n: ln, mean_deviation: d, periods_above: above, periods_below: below },
      trend: { value: trend, confidence: tc, rule: `ANALYSIS-003.${trend}`, n: tn, slope, p, sd, direction },
    }
  })
  return view
}

// Only the preview server and the mocked Supabase are reachable.
async function isolate(context) {
  await context.route(url => !url.href.startsWith(base) && !url.href.startsWith(SUPABASE), route => route.abort())
}

async function openAs(browser, { device, lang, step, enrolment, consentState, entries, clock = false }) {
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
  // Lets a scenario jump past the 10-second usage-event flush.
  if (clock) await page.clock.install()
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

// A JPEG of a ruled score-book page drawn in the browser; dark gives the OCR-003 tip.
async function scorePagePhoto(page, { dark = false } = {}) {
  const base64 = await page.evaluate((dark) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 900
    const context = canvas.getContext('2d')
    context.fillStyle = dark ? '#1e1e1e' : '#f4f1e8'
    context.fillRect(0, 0, 1200, 900)
    context.fillStyle = dark ? '#0a0a0a' : '#20304a'
    for (let y = 60; y < 900; y += 48) context.fillRect(40, y, 1120, 3)
    context.font = '28px sans-serif'
    for (let y = 100; y < 900; y += 48) context.fillText('Subject   7.5   8   6', 60, y)
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  }, dark)
  return { name: dark ? 'dark.jpg' : 'page.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') }
}
const browser = await chromium.launch()
const results = []
const pass = (line) => { results.push(line); console.log(`ok  ${line}`) }
const MOBILE = devices['Pixel 7']
const DESKTOP = { viewport: { width: 1280, height: 900 } }

try {
  // Province -> district -> school browsing, with dependent selections cleared.
  for (const [device, lang] of [[MOBILE, 'lo'], [DESKTOP, 'en']]) {
    const { context, page, mock, errors } = await openAs(browser, { device, lang, step: 'onboarding' })
    const lo = lang === 'lo'
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: lo ? 'ຍອມຮັບ ແລະ ສືບຕໍ່' : 'Agree and continue', exact: true }).click()
    await page.getByRole('button', { name: lo ? '16–17 ປີ' : '16–17', exact: true }).click()
    await page.getByRole('button', { name: lo ? 'ຕໍ່ໄປ' : 'Next', exact: true }).click()
    const province = page.getByLabel(lo ? 'ແຂວງ' : 'Province')
    const district = page.getByLabel(lo ? 'ເມືອງ (ບໍ່ບັງຄັບ)' : 'District (optional)', { exact: true })
    const schools = page.getByRole('listbox')
    await province.selectOption('vientiane-prefecture')
    await schools.getByRole('option', { name: /Thotlong|ທົດລອງ/ }).waitFor()
    assert.equal(await page.locator('[role="listbox"] [role="option"]').count(), 2, 'Browse selected province without typing')
    await district.selectOption('1-02')
    await schools.getByRole('option', { name: /Sikhottabong|ສີໂຄດ/ }).waitFor()
    assert.equal(await page.locator('[role="listbox"] [role="option"]').count(), 1)
    assert.deepEqual(lastCall(mock, 'academic_search_schools').args, { p_query: '', p_province_code: 'vientiane-prefecture', p_district_code: '1-02', p_limit: 20 })
    await schools.getByRole('option', { name: /Sikhottabong|ສີໂຄດ/ }).click()
    await district.selectOption('1-01')
    await schools.getByRole('option', { name: /Thotlong|ທົດລອງ/ }).waitFor()
    assert.equal(await page.getByRole('button', { name: lo ? 'ປ່ຽນ' : 'Change', exact: true }).count(), 0, 'Changing district clears selected school')
    await schools.getByRole('option', { name: /Thotlong|ທົດລອງ/ }).click()
    await province.selectOption('phongsaly')
    assert.equal(await district.inputValue(), '', 'Changing province clears district')
    await schools.getByRole('option', { name: /Phongsaly|ຜົ້ງສາລີ/ }).waitFor()
    assert.equal(await page.locator('[role="listbox"] [role="option"]').count(), 1)
    assert.equal(await page.getByRole('button', { name: lo ? 'ປ່ຽນ' : 'Change', exact: true }).count(), 0, 'Changing province clears selected school')
    await page.getByRole('searchbox').fill('No matching school')
    await page.getByRole('button', { name: /My school is not listed|ບໍ່ມີໂຮງຮຽນຂອງຂ້ອຍ/ }).waitFor()
    assert.equal(await page.locator('[role="listbox"] [role="option"]').count(), 0, 'Previous results cannot be selected during a new search')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await shot(page, `school-location-filters-${lang}`)
    assert.deepEqual(errors, [])
    await context.close()
    pass(`${lang}: school browsing filters by province/district, clears stale selections and retains unlisted-school fallback`)
  }

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
    // Usage events (ANL-001): pre-profile events are sent before the profile exists.
    const createdAt = mock.state.calls.findIndex(call => call.fn === 'academic_create_profile')
    const before = mock.state.calls.slice(0, createdAt).filter(call => call.fn === 'academic_track_events').flatMap(call => call.args.p_events)
    assert.deepEqual(before.map(e => e.name === 'onboarding_step_completed' ? `step:${e.props.step}` : e.name).sort(), [
      'module_landing_viewed', 'module_session_started', 'onboarding_started',
      'step:age', 'step:details', 'step:goals', 'step:notice', 'step:subjects',
    ])
    assert.deepEqual(before.find(e => e.name === 'module_landing_viewed').props, { source: 'direct' })
    assert.ok(before.every(e => e.locale === 'en' && e.platform === 'desktop' && /^[0-9a-f-]{36}$/.test(e.event_id)))
    assert.ok(!/Noy|Ban Nong Hai|champasak/.test(JSON.stringify(before)), 'no names, schools or places in events')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Desktop/English: unlisted school as free text, goals skipped, grade 12 defaults; onboarding events sent before the profile exists, without personal data')
  }

  // Closed pilot (REL-001): a valid code comes first and is sent with the profile.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'onboarding' })
    mock.state.pilot = true
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Enter your pilot code' }).waitFor()
    await page.getByLabel('Pilot code').fill('zzz999')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByText('This code is not valid. Check it with your school.').waitFor()
    await page.getByLabel('Pilot code').fill('abc-234')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByText('Code accepted: Matthayom Thotlong').waitFor()
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('button', { name: '18 or older' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('Name to show').fill('Noy')
    await page.getByLabel('Grade').selectOption('g12')
    await page.getByLabel('Province').selectOption('champasak')
    await page.getByRole('searchbox').fill('Ban Nong Hai')
    await page.getByRole('button', { name: 'My school is not listed: use “Ban Nong Hai”' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    assert.equal(lastCall(mock, 'academic_create_profile').args.p_input.pilot_code, 'ABC-234')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Pilot: code asked first, wrong code explained, accepted code names the school and is sent with the profile')
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
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'consent', enrolment: 'e1', consentState: 'withdrawn', clock: true })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Schooling is paused' }).waitFor()
    await shot(page, 'my-scores-7-consent-paused-en-mobile')
    // The landing event goes out while consent is outstanding and is refused (tracking: false).
    await page.clock.fastForward(11_000)
    for (let i = 0; i < 50 && !mock.state.calls.some(call => call.fn === 'academic_track_events'); i++) await page.waitForTimeout(100)
    await page.getByLabel('I have read this and agree').check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByRole('link', { name: 'My data and privacy' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'module_processing', p_notice_version: '2026-10-draft' })
    // Agreeing switches statistics on: the app sends again.
    await page.clock.fastForward(11_000)
    for (let i = 0; i < 50 && !mock.state.events.some(e => e.name === 'dashboard_viewed'); i++) await page.waitForTimeout(100)
    assert.ok(mock.state.events.some(e => e.name === 'dashboard_viewed'), 'events resume after agreeing to the notice')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Consent review: paused state, re-agreement sends module_processing with the current notice; usage events resume afterwards')
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
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1', clock: true })
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
    // Usage events (ANL-001): batched every 10 s; counts and timings, never values.
    await page.clock.fastForward(11_000)
    for (let i = 0; i < 50 && !mock.state.events.some(e => e.name === 'score_entry_submitted'); i++) await page.waitForTimeout(100)
    const sent = mock.state.events
    assert.deepEqual(sent.map(e => e.name).sort(), ['dashboard_viewed', 'module_landing_viewed', 'module_session_started', 'score_draft_saved', 'score_entry_started', 'score_entry_submitted'])
    const submitted = sent.find(e => e.name === 'score_entry_submitted').props
    assert.deepEqual([submitted.period, submitted.lines_scored, submitted.lines_status_counts, submitted.method], ['m1', 2, { scored: 2, exempt: 1 }, 'manual'])
    assert.ok(Number.isInteger(submitted.duration_ms) && submitted.duration_ms > 0)
    assert.ok(!/7.5|Noy|ຄະນິດສາດ/.test(JSON.stringify(sent.map(e => e.props))), 'no scores or names in events')
    assert.ok(sent.every(e => e.locale === 'lo' && e.platform === 'android'))
    assert.deepEqual(errors, [])
    await context.close()
    pass('Entry (Android/Lao): range/step/number errors, Lao digits, Enter to next, statuses, autosave, review, exact submit; usage events carry counts only')
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

  // Score-book scanning (P2-OCR #48): separate consent, photo tips, review of uncertain values, confirm.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.ocr = true
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByText('7 of 10 scans left this month').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Type scores' }).getAttribute('aria-pressed'), 'true', 'typing stays the default')
    await page.getByRole('button', { name: 'Scan score book' }).click()
    await page.getByText(/Alibaba Cloud Qwen, Singapore/).waitFor()
    await shot(page, 'my-scores-scan-1-consent-en-mobile')
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await page.getByText('Photograph your score book').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'ocr_processing', p_notice_version: '2026-10-draft' })

    await page.getByTestId('scan-file').setInputFiles(await scorePagePhoto(page, { dark: true }))
    await page.getByRole('button', { name: 'Use this photo' }).click()
    await page.getByText('Too dark – move to a brighter place.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Use anyway' }).isVisible(), true, 'a tip, not a block')
    await page.getByRole('button', { name: 'Retake' }).click()
    await page.getByTestId('scan-file').setInputFiles(await scorePagePhoto(page))
    await page.getByText('Crop to your scores').waitFor()
    for (let turn = 0; turn < 2; turn++) await page.getByRole('button', { name: 'Rotate' }).click()
    await page.getByRole('button', { name: 'Use this photo', exact: true }).click()

    await page.getByText('Check your scores').waitFor()
    const upload = mock.state.ocrUploads.at(-1)
    assert.ok(upload.jpeg && upload.job_id === 'ocr-1', 'the photo is re-encoded as JPEG on the device')
    assert.deepEqual(Object.keys(upload.image_quality).sort(), ['brightness', 'bytes', 'sharpness', 'skew_degrees'])
    assert.match(lastCall(mock, 'academic_start_ocr_job').args.p_phash, /^[0-9a-f]{16}$/)
    const confirm = page.getByRole('button', { name: 'Confirm and save' })
    assert.equal(await confirm.isDisabled(), true)
    assert.equal(await page.getByLabel('Mathematics', { exact: true }).inputValue(), '7.5')
    const lao = page.getByTestId('review-se-lao')
    await lao.getByText('Check', { exact: true }).waitFor()
    await page.getByTestId('review-se-phys').getByText('Could not read').waitFor()
    await page.getByText('2 left to check').waitFor()
    await page.getByText('This photo seems to show more than one student').waitFor()
    await shot(page, 'my-scores-scan-2-review-en-mobile')
    await lao.getByRole('button', { name: 'Looks right' }).click()
    await page.getByLabel('Physics', { exact: true }).fill('6')
    await page.getByLabel('Choose subject: ສິລະປະ').selectOption('skip')
    assert.equal(await confirm.isDisabled(), true, 'blocked until the other-student warning is acknowledged')
    await page.getByLabel('These are my scores').check()
    await confirm.click()
    await page.getByRole('heading', { name: 'September saved' }).waitFor()
    const confirmed = lastCall(mock, 'academic_confirm_ocr_job').args
    assert.deepEqual([confirmed.p_job_id, confirmed.p_period_id, confirmed.p_keep_photo], ['ocr-1', 'm1', false])
    assert.deepEqual(confirmed.p_lines, [
      { subject_enrolment_id: 'se-math', status: 'scored', value: '7.5' },
      { subject_enrolment_id: 'se-lao', status: 'scored', value: '8' },
      { subject_enrolment_id: 'se-phys', status: 'scored', value: '6' },
    ])
    assert.deepEqual(confirmed.p_fields.map(f => [f.subject_enrolment_id, f.ocr_value, f.confirmed_value, f.edited]),
      [['se-math', 7.5, 7.5, false], ['se-lao', 8, 8, false], ['se-phys', null, 6, true]])
    await page.getByRole('button', { name: 'Delete photo now' }).click()
    await page.getByText('Photo deleted.').waitFor()
    assert.deepEqual(mock.state.ocrDeleted, ['ocr-1'])
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await page.getByText('Saved 20 Oct 2026').waitFor()
    assert.equal(mock.state.ocrDiscarded, undefined, 'a confirmed scan is not discarded')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    // OCR-011: stored photos listed in My data, each deletable now.
    mock.state.ocrPhotos = [
      { job_id: 'ocr-7', created_at: '2026-10-12T03:00:00Z', status: 'confirmed', keep_photo: true, delete_after: null },
      { job_id: 'ocr-8', created_at: '2026-10-18T03:00:00Z', status: 'confirmed', keep_photo: false, delete_after: '2026-11-17T03:00:00Z' },
    ]
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const photoCard = page.locator('section', { has: page.getByRole('heading', { name: 'Score-book photos' }) })
    await photoCard.getByText('Kept until you delete it').waitFor()
    await photoCard.getByText('Deleted automatically on 17 Nov 2026').waitFor()
    await photoCard.getByRole('button', { name: 'Delete' }).first().click()
    await photoCard.getByText('Kept until you delete it').waitFor({ state: 'detached' })
    assert.deepEqual(mock.state.ocrDeleted, ['ocr-1', 'ocr-7'])
    assert.deepEqual(errors, [])
    await context.close()
    pass('Scan (Android/English): own consent naming the provider, dark-photo tip, rotate, EXIF-free JPEG and hash sent; uncertain and unread values must be touched, unknown row chosen, other-student warning acknowledged; confirm audit exact; photo deleted on request')
  }

  // Scanning: duplicate offer, reuse, fallback to typing with sure values, failure and allowance (OCR-008/009/012).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    Object.assign(mock.state, { ocr: true, ocrDuplicate: true })
    mock.state.consents.push({ id: 'c9', purpose: 'ocr_processing', notice_version: '2026-10-draft', granted_at: '2026-10-02T02:00:00Z', withdrawn_at: null })
    await page.goto(`${base}/academy/scores/entry`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'ສະແກນປຶ້ມຄະແນນ' }).click()
    await page.getByText('ຖ່າຍຮູບປຶ້ມຄະແນນ').waitFor()
    await page.getByTestId('scan-file').setInputFiles(await scorePagePhoto(page))
    await page.getByRole('button', { name: 'ໃຊ້ຮູບນີ້', exact: true }).click()
    await page.getByText('ເຄີຍສະແກນແລ້ວບໍ?').waitFor()
    await shot(page, 'my-scores-scan-3-duplicate-lo-mobile')
    await page.getByRole('button', { name: 'ໃຊ້ຜົນເທື່ອນັ້ນ' }).click()
    await page.getByText('ກວດສອບຄະແນນຂອງທ່ານ').waitFor()
    assert.equal(mock.state.ocrUploads, undefined, 'a reused result is not sent to the provider again')
    await page.getByRole('button', { name: 'ພິມຄະແນນແທນ' }).click()
    await page.waitForFunction(() => document.querySelector('#score-se-math')?.value === '7.5')
    assert.equal(await page.getByLabel('ພາສາລາວ', { exact: true }).inputValue(), '', 'an uncertain value is not carried over')
    // Discard and photo deletion run in the background after leaving the scan.
    for (let i = 0; i < 50 && !mock.state.ocrDeleted?.includes('ocr-2'); i++) await page.waitForTimeout(100)
    assert.deepEqual([mock.state.ocrDiscarded, mock.state.ocrDeleted], [['ocr-2'], ['ocr-2']])

    mock.state.ocrFail = true
    await page.getByRole('button', { name: 'ສະແກນປຶ້ມຄະແນນ' }).click()
    await page.getByTestId('scan-file').setInputFiles(await scorePagePhoto(page))
    await page.getByRole('button', { name: 'ໃຊ້ຮູບນີ້', exact: true }).click()
    await page.getByRole('button', { name: 'ສະແກນໃໝ່' }).click()
    await page.getByText('ອ່ານຮູບນີ້ບໍ່ໄດ້').waitFor()
    assert.equal(lastCall(mock, 'academic_start_ocr_job').args.p_ignore_duplicate, true)
    await shot(page, 'my-scores-scan-4-failed-lo-mobile')
    await page.getByRole('button', { name: 'ລອງຮູບອື່ນ' }).click()
    await page.getByText('ຖ່າຍຮູບປຶ້ມຄະແນນ').waitFor()
    for (let i = 0; i < 50 && !mock.state.ocrDeleted?.includes('ocr-1'); i++) await page.waitForTimeout(100)
    assert.ok(mock.state.ocrDiscarded.includes('ocr-1') && mock.state.ocrDeleted.includes('ocr-1'), 'a failed scan keeps no photo')

    mock.state.ocrUsed = 10
    await page.getByRole('button', { name: 'ພິມຄະແນນ', exact: true }).click()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText(/ທ່ານໃຊ້ການສະແກນຄົບ 10 ຄັ້ງ/).waitFor()
    assert.equal(await page.getByRole('button', { name: 'ສະແກນປຶ້ມຄະແນນ' }).isDisabled(), true)
    assert.equal(await page.getByLabel('ຄະນິດສາດ', { exact: true }).isEditable(), true, 'typing stays available')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Scan (Android/Lao): duplicate offered and reused without a new upload; Type instead carries only sure values; failure offers another photo and keeps no photo; used-up allowance explained while typing stays')
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

  // Shared phone: one student signs out, another signs in on the same tab (no
  // reload). Nothing loaded for the first account may appear (#38).
  {
    const SECOND = '00000000-0000-0000-0000-0000000000b2'
    const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'ready', enrolment: 'e1' })
    const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const secondUser = { id: SECOND, aud: 'authenticated', role: 'authenticated', email: 'kham@example.com', app_metadata: {}, user_metadata: {} }
    // Registered after the main mock, so it runs first; anything else falls through.
    await context.route(`${SUPABASE}/**`, async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })
      if (url.pathname === '/auth/v1/token') {
        return json(route, { access_token: fakeJwt(SECOND), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r2', user: secondUser })
      }
      if (subOf(request.headers().authorization) !== SECOND) return route.fallback()
      if (url.pathname === '/auth/v1/user') return json(route, secondUser)
      if (url.pathname === '/rest/v1/users') return json(route, { id: SECOND, name: 'Kham', phone: null, email: 'kham@example.com', avatar_url: null, cover_image_url: null, member_code: 'KHAM01', role: 'CUSTOMER', language: 'en', currency: 'LAK', created_at: '2026-10-01', updated_at: '2026-10-01' })
      // The second student has a profile of their own, served slowly.
      if (url.pathname === '/rest/v1/rpc/academic_get_session') {
        return json(route, { ...mock.rpc.academic_get_session(), user: { id: SECOND, role: 'CUSTOMER', language: 'en' }, profile: { id: 'p2', display_name: 'Kham', age_band: '18_plus', status: 'active', consent_state: 'active', version: 1 }, active_enrolment_id: 'e2' })
      }
      if (url.pathname === '/rest/v1/rpc/academic_get_my_data_summary') {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const summary = mock.rpc.academic_get_my_data_summary()
        return json(route, { ...summary, profile: { ...summary.profile, id: 'p2', display_name: 'Kham' } })
      }
      return route.fallback()
    })
    const goInApp = (path) => page.evaluate(p => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')) }, path)

    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const firstAccountOnly = page.getByText('Noy', { exact: true })
    await firstAccountOnly.first().waitFor()
    await goInApp('/academy/profile')
    await page.getByRole('button', { name: 'Open profile menu' }).click()
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await page.getByText('Sign out?').waitFor()
    await page.getByRole('button', { name: 'Sign out' }).last().click()
    await page.waitForURL(url => new URL(url).pathname === '/')
    await goInApp('/auth')
    await page.getByLabel('Email').fill('kham@example.com')
    await page.getByLabel('Password', { exact: true }).fill('correct horse')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL(url => new URL(url).pathname !== '/auth')
    await goInApp('/academy/scores/data')
    // The second student's summary takes 1.5 s: the first student's must not show meanwhile.
    for (let i = 0; i < 12; i++) {
      assert.equal(await firstAccountOnly.count(), 0, 'previous account data shown to the next student')
      await page.waitForTimeout(100)
    }
    await page.getByText('Kham', { exact: true }).first().waitFor()
    assert.ok(mock.state.calls.length > 0)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Shared phone: after sign-out, the next student signing in on the same tab never sees data from the previous account')
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

  // Subject labels, trends and explanations (P2-ANL #49: DASH-005, ANALYSIS-004).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    // Insights switched off: the dashboard has no labels, so no card.
    mock.state.dashboard = workedExampleDashboard()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Up 0.3 since January').waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Compared with your own average' }).count(), 0, 'no card without labels')

    mock.state.dashboard = insightsDashboard()
    await page.reload({ waitUntil: 'domcontentloaded' })
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Compared with your own average' }) })
    await card.waitFor()
    assert.match(await card.innerText(), /never with other students/)
    const group = (name) => card.locator('div:has(> h3)').filter({ has: page.getByRole('heading', { name }) }).locator('li')
    const stronger = group('Stronger subjects')
    const attention = group('Subjects needing attention')
    assert.deepEqual(await stronger.allInnerTexts().then(rows => rows.map(r => r.replace(/\s+/g, ' ').trim())), [
      'Biology Above your average in 6 of the last 6 months, by about 1.6 High confidence',
      'Chemistry Above your average in 6 of the last 6 months, by about 0.8 Medium confidence',
    ])
    assert.deepEqual(await attention.allInnerTexts().then(rows => rows.map(r => r.replace(/\s+/g, ' ').trim())), [
      'Mathematics Below your average in 6 of the last 6 months, by about 1.4 High confidence',
      'Physics Below your average in 5 of the last 5 months, by about 1.0 Medium confidence',
    ])
    await shot(page, 'my-scores-18-insights-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document, { resultTypes: ['violations'] })
      return result.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)
    })
    assert.deepEqual(axe, [])

    // Opening Mathematics from the card: facts first, then suggestions.
    await attention.first().getByRole('button').click()
    const explain = page.locator('section', { has: page.getByRole('heading', { name: 'What your scores show' }) })
    await explain.waitFor()
    const text = (await explain.innerText()).replace(/\s+/g, ' ')
    assert.match(text, /In the last 6 months, Mathematics was below your overall average in 6 of them, by about 1\.4 on average\. High confidence This pattern has been clear for several months\./)
    assert.match(text, /This school year \(6 months of scores\) it has gone down, by about 0\.3 a month\. Medium confidence This pattern shows up in most months so far\./)
    assert.match(text, /Things that sometimes help .*Looking back at recent tests.*Suggestions only: monthly scores cannot show why a result changed\./)
    await shot(page, 'my-scores-19-explanation-en-mobile')
    await page.getByRole('button', { name: 'All subjects' }).click()

    // A volatile, neutral subject: the range, and help for up-and-down months.
    await page.getByRole('button', { name: /^English/ }).last().click()
    const english = (await explain.innerText()).replace(/\s+/g, ' ')
    assert.match(english, /English is close to your overall average\./)
    assert.match(english, /It has changed a lot from month to month, between 5 and 8\./)
    assert.match(english, /Writing down when tests happen/)
    await page.getByRole('button', { name: 'All subjects' }).click()

    assert.deepEqual(errors, [])
    await context.close()

    // Lao: same card, Lao headings and reasons.
    const lao = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    lao.mock.state.dashboard = insightsDashboard()
    await lao.page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await lao.page.getByRole('heading', { name: 'ທຽບກັບຄ່າສະເລ່ຍຂອງເຈົ້າເອງ' }).waitFor()
    await lao.page.getByText('ຕ່ຳກວ່າຄ່າສະເລ່ຍຂອງເຈົ້າ 6 ຈາກ 6 ເດືອນຫຼ້າສຸດ, ປະມານ 1.4').waitFor()
    await shot(lao.page, 'my-scores-20-insights-lo-mobile')
    assert.deepEqual(lao.errors, [])
    await lao.context.close()
    // Diagnostic quiz (ANALYSIS-005, QUIZ-001..003): offered on Mathematics only, answered, resumed, scored and reviewed.
    const quiz = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    quiz.mock.state.dashboard = insightsDashboard()
    await quiz.page.goto(`${base}/academy/scores?subject=se-phys`, { waitUntil: 'domcontentloaded' })
    await quiz.page.getByRole('heading', { name: 'What your scores show' }).waitFor()
    await quiz.page.waitForTimeout(300)
    assert.equal(await quiz.page.getByRole('heading', { name: /Find which topics to practise/ }).count(), 0, 'no placeholder when a subject has no diagnostic')
    await quiz.page.goto(`${base}/academy/scores?subject=se-math`, { waitUntil: 'domcontentloaded' })
    await quiz.page.getByText('A short quiz of 4 questions shows which topics').waitFor()
    await quiz.page.getByRole('link', { name: 'Find which topics to practise (8–12 min)' }).click()
    await quiz.page.getByText('Question 1 of 4').waitFor()
    const next = quiz.page.getByRole('button', { name: 'Next' })
    assert.equal(await next.isDisabled(), true, 'an answer is needed first')
    await quiz.page.getByRole('radio', { name: 'B. 3' }).check()
    await next.click()
    await quiz.page.getByText('Question 2 of 4').waitFor()
    await quiz.page.getByRole('radio', { name: 'A. 2' }).check()
    await quiz.page.waitForTimeout(200)
    assert.deepEqual(quiz.mock.state.quizAnswers, { qi1: 'B', qi2: 'A' }, 'every answer saved as it is chosen')
    await shot(quiz.page, 'my-scores-21-quiz-en-mobile')
    // Leaving and coming back resumes at the first unanswered question.
    await quiz.page.reload({ waitUntil: 'domcontentloaded' })
    await quiz.page.getByText('Question 3 of 4').waitFor()
    await quiz.page.getByRole('radio', { name: 'A. 5' }).check()
    await next.click()
    await quiz.page.getByRole('radio', { name: 'A. 3' }).check()
    await quiz.page.getByRole('button', { name: 'See my results' }).click()
    await quiz.page.getByRole('heading', { name: 'Your topics' }).waitFor()
    const topicRows = await quiz.page.locator('section').first().locator('li').allInnerTexts()
    assert.deepEqual(topicRows.map(r => r.replace(/\s+/g, ' ').trim()), ['Algebra 2 of 3 correct Developing', 'Geometry 1 of 1 correct Not enough questions to judge'])
    const review = (await quiz.page.locator('section').nth(1).innerText()).replace(/\s+/g, ' ')
    assert.match(review, /If 2x = 8, what is x\? Your answer: A\. 2 \(Not correct\) Correct answer: C\. 4 Why: Divide both sides by 2\. Explanation drafted with AI and checked by a teacher/)
    assert.match(review, /Your answer: B\. 3 \(Correct\) Why: Take 2 from both sides\./)
    await shot(quiz.page, 'my-scores-22-quiz-result-en-mobile')
    await quiz.page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await quiz.page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)), [])
    await quiz.page.goto(`${base}/academy/scores?subject=se-math`, { waitUntil: 'domcontentloaded' })
    await quiz.page.getByRole('link', { name: 'See your last quiz results' }).waitFor()
    // QUIZ-004: the retake waits a week; ANALYSIS-007: no conflict note while a topic is below 80%.
    await quiz.page.getByText('You can try a different set of questions from 1 Nov 2026, after some practice.').waitFor()
    assert.equal(await quiz.page.getByRole('link', { name: /Find which topics|Try a different set/ }).count(), 0, 'no start button while the retake waits')
    assert.equal(await quiz.page.getByRole('note').count(), 0)
    quiz.mock.state.quizAnswers = { qi1: 'B', qi2: 'C', qi4: 'A', qi3: 'A' }
    await quiz.page.reload({ waitUntil: 'domcontentloaded' })
    await quiz.page.getByRole('note').filter({ hasText: 'Your quiz results are strong, but school scores are lower – topics outside this quiz or test conditions may matter.' }).waitFor()
    await shot(quiz.page, 'my-scores-23-quiz-conflict-en-mobile')
    // Results compare each topic with the previous attempt.
    quiz.mock.state.quizPrevious = { qi1: 'A', qi2: 'A', qi4: 'A', qi3: 'B' }
    await quiz.page.goto(`${base}/academy/scores/quiz/result/at1`, { waitUntil: 'domcontentloaded' })
    await quiz.page.getByText('3 of 3 correct · Last time: 1 of 3').waitFor()
    await quiz.page.getByText('1 of 1 correct · Last time: 0 of 1').waitFor()
    assert.deepEqual(quiz.errors, [])
    await quiz.context.close()

    pass('Insights: hidden without labels; stronger and needing-attention lists with reasons and confidence; axe clean; explanation facts then suggestions; volatile range; Lao; diagnostic quiz offered on Mathematics only, answered, resumed, scored and reviewed with the AI label; retake waits a week; conflicting-evidence note only when strong; change per topic shown')
  }

  // This week (LEARN-001) and a practice set (REC-PRACTICE).
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.dashboard = workedExampleDashboard()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Up 0.3 since January').waitFor()
    assert.equal(await page.getByRole('heading', { name: 'This week' }).count(), 0, 'no card without next actions')
    mock.state.recommendations = WEEK
    await page.reload({ waitUntil: 'domcontentloaded' })
    const week = page.locator('section', { has: page.getByRole('heading', { name: 'This week' }) })
    await week.waitFor()
    const rows = (await week.locator('li').allInnerTexts()).map(r => r.replace(/\s+/g, ' ').trim())
    assert.deepEqual(rows, [
      'Enter your March scores March scores are not entered yet. About 2 min Enter scores Done Not now Not helpful',
      'Practice: Algebra Because Algebra was Needs practice in your quiz on 12 Oct 2026. About 8 min Practise Done Not now Not helpful',
      "We don't have practice for Geometry yet.",
    ])
    await shot(page, 'my-scores-25-week-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)), [])

    // LEARN-005: feedback per action; gap cards have none.
    assert.equal(await week.getByRole('group', { name: /^Feedback on/ }).count(), 2)
    await week.getByRole('group', { name: 'Feedback on Enter your March scores' }).getByRole('button', { name: 'Not now' }).click()
    await page.getByText('Thanks. Your list is updated.').waitFor()
    assert.deepEqual(mock.state.feedback, [{ p_item_key: 'R1:p7', p_response: 'not_now' }])
    await week.getByText('Enter your March scores').waitFor({ state: 'detached' })

    await week.getByRole('link', { name: 'Practise' }).click()
    await page.getByText('Question 1 of 2').waitFor()
    const check = page.getByRole('button', { name: 'Check answer' })
    assert.equal(await check.isDisabled(), true, 'choose an answer first')
    await page.getByRole('radio', { name: 'A. 5' }).check()
    await check.click()
    await page.getByRole('status').filter({ hasText: 'Not quite. The answer is B. 3.' }).filter({ hasText: 'Why: Take 1 from both sides.' }).waitFor()
    assert.equal(await page.getByRole('radio', { name: 'B. 3' }).isDisabled(), true, 'answers are final')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('radio', { name: 'A. 3' }).check()
    await page.getByRole('button', { name: 'Check answer' }).click()
    await page.getByRole('status').filter({ hasText: 'Correct' }).filter({ hasText: 'Explanation drafted with AI and checked by a teacher' }).waitFor()
    await shot(page, 'my-scores-26-practice-en-mobile')
    await page.getByRole('button', { name: 'Finish' }).click()
    await page.getByRole('heading', { name: 'Practice done' }).waitFor()
    await page.getByText('1 of 2 correct').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('This week: up to three actions with reasons, times and actions, gap card, axe clean; practice set answered with instant feedback, final answers, AI label, summary')
  }

  // AI Coach academic mode (P3-AI #53): Coach card and checked monthly summary; My scores mode with feedback and a busy state.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.dashboard = insightsDashboard()
    mock.state.coach = { available: true, busy: false, quota: { limit: 10, used: 2, remaining: 8 }, resources: [{ key: 'lwu', name_en: 'LWU', name_lo: 'LWU', phone: '1362' }] }
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    const coachCard = page.locator('section', { has: page.getByRole('heading', { name: 'Ask the Coach about your scores' }) })
    await coachCard.getByText('8 of 10 Coach messages left this month').waitFor()
    await coachCard.getByRole('button', { name: 'Show my monthly summary' }).click()
    await coachCard.getByText('In October, your average was 6.5 (down 0.25 from September).', { exact: false }).waitFor()
    await coachCard.getByText('Written by AI and checked against your scores.').waitFor()
    assert.deepEqual(mock.state.coachCalls.at(-1), { mode: 'academic', action: 'summary', language: 'en' })
    await shot(page, 'my-scores-coach-1-card-en-mobile')
    await page.goto(`${base}/academy/scores?subject=se-math`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Ask the Coach about Mathematics' }).click()
    await page.waitForURL(/\/academy\/coach\?mode=academic/)
    await page.getByText('My scores mode').waitFor()
    assert.equal(await page.getByLabel('Message your mentor').inputValue(), 'Explain my Mathematics scores and what I should do next.')
    // What the database holds after the answer is saved.
    mock.state.tables = { ...(mock.state.tables ?? {}), premium_coach_messages: [
      { id: '1b2c3d4e-1111-4222-8333-444455556666', role: 'user', content: 'Explain my Mathematics scores and what I should do next.', created_at: '2026-10-26T03:00:00Z' },
      { id: '9a1b2c3d-1111-4222-8333-444455556666', role: 'assistant', content: 'Mathematics went from **7** in September to **6** in October. Next step: try the short Mathematics quiz.', created_at: '2026-10-26T03:00:05Z' },
    ] }
    await page.getByRole('button', { name: 'Send message' }).click()
    await page.getByText('Next step: try the short Mathematics quiz.').waitFor()
    assert.deepEqual(mock.state.coachCalls.at(-1), { conversationId: null, message: 'Explain my Mathematics scores and what I should do next.', language: 'en', mode: 'academic' })
    await page.getByRole('button', { name: 'Report', exact: true }).click()
    await page.getByLabel('What was wrong?').selectOption('wrong_numbers')
    await page.getByLabel('Let a reviewer read this question and answer').check()
    await page.getByRole('button', { name: 'Send report' }).click()
    await page.getByText('Thanks for telling us.').waitFor()
    assert.deepEqual(mock.state.coachFeedback.at(-1), { p_message_id: '9a1b2c3d-1111-4222-8333-444455556666', p_input: { report_category: 'wrong_numbers', share_text: true } })
    await page.getByText('Answers use only the scores you entered.', { exact: false }).waitFor()
    mock.state.coachBusy = true
    await page.getByLabel('Message your mentor').fill('Which subject should I focus on?')
    await page.getByRole('button', { name: 'Send message' }).click()
    await page.getByRole('alert').getByText(/Coach is busy/).waitFor()
    await page.getByRole('alert').getByRole('link', { name: 'Open my scores' }).waitFor()
    await shot(page, 'my-scores-coach-2-chat-en-mobile')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Coach (academic mode): Coach card with quota, monthly summary marked as checked AI text, Ask about a subject pre-fills the question, My scores mode sends mode academic, report with consent to share, busy message keeps Schooling one tap away')
  }

  // Guardians (P3-PAR #52): the student invites with chosen scopes, confirms a guardian's name, changes what they see,
  // removes the link; a 13–15 student is asked for a guardian's consent first; the guardian links with the code.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.guardianLinks = [{ id: 'gl1', status: 'pending_student', purpose: 'link', relationship: 'mother', scopes: { scores: true, plan: true, careers: false, goals_text: false }, guardian_name: 'Mrs Phonsavan',
      student_name: 'Noy', declared_at: '2026-10-26T05:00:00Z', confirm_by: '2026-11-02T05:00:00Z', confirmed_at: null, reconfirm_by: null, removed_at: null, removed_by: null }]
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Parents and guardians' }) })
    await card.getByText('Mrs Phonsavan wants to link as your mother').waitFor()
    await card.getByRole('button', { name: 'Yes, confirm' }).click()
    await card.getByText('Mrs Phonsavan, your mother').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_confirm_guardian_link').args, { p_link_id: 'gl1', p_confirm: true })
    await card.getByText('Coach chats and photos are never shared.').first().waitFor()
    await card.getByLabel('Career questionnaire answers').check()
    assert.deepEqual(lastCall(mock, 'academic_set_guardian_scopes').args, { p_link_id: 'gl1', p_scopes: { careers: true } })
    await card.getByRole('button', { name: 'Invite a parent or guardian' }).click()
    await card.getByRole('button', { name: 'Create a code' }).click()
    await card.getByText('K7MQ2XPA', { exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_create_guardian_invite').args, { p_scopes: { scores: true, plan: true, careers: false, goals_text: false }, p_purpose: 'link' })
    await card.getByRole('button', { name: 'Remove link' }).first().click()
    await card.getByRole('alertdialog').getByRole('button', { name: 'Remove link' }).click()
    await card.getByText('No one is linked.').waitFor()
    await shot(page, 'my-scores-guardians-1-student-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(errors, [])
    await context.close()

    // Ages 13–15 (PARENT-003): a consent code before anything is stored.
    const young = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'guardian_consent', enrolment: 'e1' })
    young.mock.state.consentState = 'pending_guardian'
    await young.page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await young.page.getByRole('heading', { name: 'ຂໍໃຫ້ພໍ່ແມ່ ຫຼື ຜູ້ປົກຄອງເຫັນດີ' }).waitFor()
    await young.page.getByRole('button', { name: 'ສ້າງລະຫັດ' }).click()
    await young.page.getByText('K7MQ2XPA', { exact: true }).waitFor()
    assert.equal(lastCall(young.mock, 'academic_create_guardian_invite').args.p_purpose, 'consent')
    await shot(young.page, 'my-scores-guardians-2-consent-lo-mobile')
    assert.deepEqual(young.errors, [])
    await young.context.close()

    // The guardian (PARENT-002): code from the link, relationship and declaration, then the student confirms.
    const parent = await openAs(browser, { device: MOBILE, lang: 'en', step: 'onboarding' })
    await parent.page.goto(`${base}/academy/family?code=K7MQ2XPA`, { waitUntil: 'domcontentloaded' })
    await parent.page.getByRole('heading', { name: 'Family', level: 1 }).waitFor()
    await parent.page.getByRole('button', { name: 'Check code' }).click()
    await parent.page.getByText('Noy invites you to follow their progress.').waitFor()
    await parent.page.getByText('Career questionnaire answers').waitFor()
    assert.equal(await parent.page.getByRole('button', { name: 'Link', exact: true }).isDisabled(), true, 'relationship and declaration first')
    await parent.page.getByLabel('You are their…').selectOption('mother')
    await parent.page.getByLabel('I confirm I am this student’s parent or legal guardian.').check()
    await parent.page.getByRole('button', { name: 'Link', exact: true }).click()
    await parent.page.getByText('Waiting for Noy to confirm', { exact: false }).waitFor()
    assert.deepEqual(lastCall(parent.mock, 'academic_accept_guardian_invite').args, { p_code: 'K7MQ2XPA', p_relationship: 'mother', p_declaration: true })
    await shot(parent.page, 'my-scores-guardians-3-family-en-mobile')
    // PARENT-005: one child's page, only what they share, supportive suggestions.
    parent.mock.state.family = [{ id: 'gl7', status: 'active', purpose: 'link', relationship: 'mother', scopes: {}, guardian_name: 'Mrs Phonsavan', student_name: 'Noy', grade: 'Grade 11',
      declared_at: '2026-10-20T05:00:00Z', confirm_by: '2026-10-27T05:00:00Z', confirmed_at: '2026-10-21T05:00:00Z', reconfirm_by: null, removed_at: null, removed_by: null }]
    await parent.page.reload({ waitUntil: 'domcontentloaded' })
    await parent.page.getByRole('link', { name: 'See progress' }).click()
    await parent.page.getByRole('heading', { name: 'Noy', level: 1 }).waitFor()
    await parent.page.getByText('Ask what felt hardest in Mathematics this month, and listen first.').waitFor()
    await parent.page.getByText('down 0.25').waitFor()
    await parent.page.getByText('Below their own average · Going down').waitFor()
    await parent.page.getByText('Fewer than 3 scores: too early to say more.').waitFor()
    await parent.page.getByText('This week: 2 of 4 tasks done').waitFor()
    assert.equal(await parent.page.getByText('Noy has not shared this.').count(), 2, 'careers and goals not shared')
    assert.equal(await parent.page.getByText(/rank|class average|other students/i).count(), 0, 'no comparisons')
    await parent.page.getByText('Scores entered in the last 3 days appear here after Noy has had time to correct them.').waitFor()
    await shot(parent.page, 'my-scores-guardians-4-child-en-mobile')
    // PARENT-006: the monthly report, seven sections, frozen when made.
    await parent.page.getByRole('link', { name: 'October' }).click()
    await parent.page.getByRole('heading', { name: 'Noy: October report' }).waitFor()
    await parent.page.getByText('4 of 5 subjects').waitFor()
    await parent.page.getByText('Not recorded this month: Chemistry').waitFor()
    await parent.page.getByText('about the same').waitFor()
    await parent.page.getByText('Above their own average in 3 of the last 3 months.', { exact: false }).waitFor()
    await parent.page.getByRole('heading', { name: 'Needs attention' }).waitFor()
    await parent.page.getByText('Early sign only.', { exact: false }).waitFor()
    await parent.page.getByText('1 quizzes · 2 practice sets').waitFor()
    await parent.page.getByText('One month’s change is not a trend.', { exact: false }).waitFor()
    assert.equal(await parent.page.getByText(/weak|lazy|fail/i).count(), 0, 'supportive wording only')
    await shot(parent.page, 'my-scores-guardians-5-report-en-mobile')
    await parent.page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await parent.page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    await parent.page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await parent.page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(parent.errors, [])
    await parent.context.close()
    pass('Guardians: confirm a guardian\'s name, change what they see, invite with a code, remove the link; ages 13–15 get a consent code first (Lao); the guardian links with the code, relationship and declaration and waits for the student; the child page shows only what is shared with supportive suggestions and no comparisons, recent months held back for corrections; the monthly report has its seven sections in supportive words; axe clean')
  }

  // Guardian report e-mails (NOTIF-002 #52): double opt-in from the Family page, the confirm and unsubscribe links,
  // scores only when the guardian chooses.
  {
    const parent = await openAs(browser, { device: MOBILE, lang: 'en', step: 'onboarding' })
    parent.mock.state.family = [{ id: 'gl7', status: 'active', purpose: 'link', relationship: 'mother', scopes: {}, guardian_name: 'Mrs Phonsavan', student_name: 'Noy', grade: 'Grade 11',
      declared_at: '2026-10-20T05:00:00Z', confirm_by: '2026-10-27T05:00:00Z', confirmed_at: '2026-10-21T05:00:00Z', reconfirm_by: null, removed_at: null, removed_by: null }]
    const { page, mock } = parent
    await page.goto(`${base}/academy/family`, { waitUntil: 'domcontentloaded' })
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Monthly reports by e-mail' }) })
    assert.equal(await card.getByLabel('Include scores in the e-mail', { exact: false }).isChecked(), false, 'scores are off unless chosen')
    await card.getByRole('button', { name: 'E-mail them to mother@example.com' }).click()
    await card.getByText('We sent a confirmation link to mother@example.com. Open it within 48 hours to start.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_guardian_email_subscribe').args, { p_include_scores: false })
    await shot(page, 'my-scores-guardians-6-email-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    // The link in the confirmation e-mail.
    await page.goto(`${base}/academy/family/email?confirm=bad-token`, { waitUntil: 'domcontentloaded' })
    await page.getByText('This link does not work any more.', { exact: false }).waitFor()
    await page.goto(`${base}/academy/family/email?confirm=good-token`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Confirmed. Monthly reports will come by e-mail.').waitFor()
    assert.deepEqual(mock.state.emailLinks.at(-1), { action: 'email_confirm', token: 'good-token' })
    await page.getByRole('link', { name: 'Go to the Family page' }).click()
    await card.getByText('Monthly reports go to mother@example.com.').waitFor()
    await card.getByLabel('Include scores in the e-mail', { exact: false }).check()
    await page.getByText('Saved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_guardian_email_subscribe').args, { p_include_scores: true })
    // One-click unsubscribe from the e-mail.
    await page.goto(`${base}/academy/family/email?unsubscribe=u-token`, { waitUntil: 'domcontentloaded' })
    await page.getByText('You will not get these e-mails any more. The reports stay in the app.').waitFor()
    assert.deepEqual(mock.state.emailLinks.at(-1), { action: 'email_unsubscribe', token: 'u-token' })
    // The same link in a Premium-ending e-mail (NOTIF-005) turns off account e-mails.
    await page.goto(`${base}/academy/family/email?unsubscribe=acct-token`, { waitUntil: 'domcontentloaded' })
    await page.getByText('You will not get e-mails about your account any more. You can turn them on again in My data.').waitFor()
    await page.getByRole('heading', { name: 'E-mails from Bitdoin' }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Go to My data' }).getAttribute('href'), '/academy/scores/data')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(parent.errors, [])
    await parent.context.close()
    const lo = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'onboarding' })
    lo.mock.state.family = parent.mock.state.family
    await lo.page.goto(`${base}/academy/family`, { waitUntil: 'domcontentloaded' })
    await lo.page.getByRole('heading', { name: 'ລາຍງານປະຈຳເດືອນທາງອີເມວ' }).waitFor()
    await shot(lo.page, 'my-scores-guardians-7-email-lo-mobile')
    await lo.context.close()
    pass('Guardian e-mails: opt in from the Family page with scores off by default, confirmation link sent and waiting; a bad link is refused, the right link confirms; include scores saved; one-click unsubscribe from the e-mail, and from a Premium-ending e-mail turns off account e-mails; Lao card; axe clean')
  }

  // Career guidance (P4-CAR #55): resume the questionnaire where it stopped, optional preferences, 3–6 options with reasons
  // and no score, preparation, Explorer link, shortlist, talk-it-over questions, every career open.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.career = { in_progress: { answers: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), i % 4])), preferences: {}, reason: 'first' } }
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Career guidance' }).click()
    await page.getByText('Questions 21–24 of 24').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Next' }).isDisabled(), true, 'every question on the screen needs an answer (Not sure is fine)')
    for (const [item, choice] of [['Help people understand laws or rules fairly', 'Like'], ['Work in a hospital or health centre', 'Not sure'], ['Teach children or young people', 'Really like'], ['Analyse information to make a decision', 'Really dislike']]) {
      await page.getByRole('group', { name: item }).getByText(choice, { exact: true }).click()
    }
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('heading', { name: 'A few optional questions' }).waitFor()
    assert.deepEqual(mock.state.careerSaves.at(-1), { p_answers: { 21: 2, 22: null, 23: 3, 24: 0 }, p_preferences: null })
    await page.getByLabel('Where would you like to work?').selectOption('office')
    await page.getByRole('button', { name: 'See my options' }).click()
    await page.getByRole('heading', { name: 'Careers to explore' }).waitFor()
    assert.deepEqual(mock.state.careerSaves.at(-1), { p_answers: {}, p_preferences: { work_setting: 'office' } })
    const nurse = page.locator('li', { has: page.getByRole('heading', { name: 'Registered Nurse' }) })
    await nurse.getByText('It matches your interest in Helping & teaching.').waitFor()
    await nurse.getByText('Biology: among your stronger subjects.').waitFor()
    await nurse.getByText('What preparation would help').waitFor()
    assert.equal(await nurse.getByRole('link', { name: 'Open in Career Explorer' }).getAttribute('href'), '/academy/careers?career=registered-nurse')
    await nurse.getByText('Where to study in Laos').waitFor()
    await nurse.getByText('Bachelor of Nursing Science').waitFor()
    assert.equal(await page.getByText(/\d+ ?%/).count(), 0, 'no percentages')
    await nurse.getByRole('button', { name: 'Save Registered Nurse' }).click()
    await nurse.getByRole('button', { name: 'Remove Registered Nurse from my shortlist' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_set_career_saved').args, { p_slug: 'registered-nurse', p_saved: true })
    await page.getByText('What changed since', { exact: false }).waitFor()
    await page.getByText('Who do we know who does this work?').waitFor()
    await page.getByRole('heading', { name: 'All careers' }).waitFor()
    await page.getByText('Every career is open to you, whatever your scores.').waitFor()
    // UNI-003: searching by entrance group lists unconfirmed groups separately; UNI-004: cut-offs with their year.
    const programmes = page.locator('section', { has: page.getByRole('heading', { name: 'Programmes in Laos' }) })
    await programmes.getByLabel('Entrance exam group').selectOption('B')
    await programmes.getByText('Bachelor of Nursing Science').waitFor()
    await programmes.getByRole('heading', { name: 'Group not confirmed' }).waitFor()
    await programmes.getByText('Bachelor of Education').waitFor()
    await programmes.getByText('(for 2026-2027 – may change)').waitFor()
    await programmes.getByLabel('Field').selectOption('education')
    assert.equal(await programmes.getByText('Bachelor of Nursing Science').count(), 0)
    // UNI-005: save a scholarship and turn on reminders.
    const scholarships = page.locator('section', { has: page.getByRole('heading', { name: 'Scholarships and deadlines' }) })
    // EXAM-001: the latest official entrance exam structure, with its intake year and source.
    const exams = page.locator('section', { has: page.getByRole('heading', { name: 'University entrance exam' }) })
    await exams.getByText('The exam for the 2027-2028 intake is not announced yet. This is the latest official structure.').waitFor()
    await exams.getByText('Morning: Mathematics A and Physics: 120 minutes').waitFor()
    await exams.getByText('For the 2026-2027 intake – may change', { exact: false }).waitFor()
    await scholarships.getByText('Who can apply: Grade 12 students').waitFor()
    await scholarships.getByRole('button', { name: 'Save Health Sciences Scholarship' }).click()
    await scholarships.getByLabel('Remind me 14 and 3 days before').check()
    assert.deepEqual(lastCall(mock, 'academic_set_scholarship_saved').args, { p_slug: 's-uhs', p_saved: true, p_remind: true })
    await shot(page, 'my-scores-careers-1-results-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(errors, [])
    await context.close()
    const lo = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    lo.mock.state.career = { completed: true }
    await lo.page.goto(`${base}/academy/scores/careers`, { waitUntil: 'domcontentloaded' })
    await lo.page.getByRole('heading', { name: 'ອາຊີບທີ່ຄວນສຳຫຼວດ' }).waitFor()
    await lo.page.getByRole('heading', { name: 'ພະຍາບານ' }).waitFor()
    await shot(lo.page, 'my-scores-careers-2-results-lo-mobile')
    // Free: interests and every career stay, options need Academy Premium (owner decision).
    lo.mock.state.careerLocked = true
    await lo.page.reload({ waitUntil: 'domcontentloaded' })
    await lo.page.getByText('ທາງເລືອກອາຊີບຂອງເຈົ້າ ພ້ອມເຫດຜົນຂອງແຕ່ລະອັນ ມີໃນ Academy Premium.', { exact: false }).waitFor()
    await lo.page.getByRole('heading', { name: 'ຄວາມສົນໃຈທີ່ເຈົ້າບອກພວກເຮົາ' }).waitFor()
    assert.equal(await lo.page.getByRole('heading', { name: 'ພະຍາບານ', level: 3 }).count(), 0, 'no options on Free')
    await lo.page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await lo.page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(lo.errors, [])
    await lo.context.close()
    pass('Career guidance: resumes at the first unanswered screen, every question answered before Next (Not sure allowed), optional preferences, options with reasons and preparation and no percentages, Explorer link to the same career, shortlist, what changed, talk-it-over questions, every career open; programmes by field and entrance group with unconfirmed groups apart and cut-offs with their year, the latest entrance exam structure with its intake and source, a scholarship saved with reminders; Lao results; Free sees interests and every career but options need Premium; axe clean')
  }

  // Career report (CAREER-006, BILLING-004 #55): buy once by transfer, upload the receipt, wait for review; once
  // entitled, make the frozen printable report. A guardian can buy it from the child page.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.career = { completed: true }
    mock.state.careerLocked = true
    await page.goto(`${base}/academy/scores/careers`, { waitUntil: 'domcontentloaded' })
    const report = page.locator('section', { has: page.getByRole('heading', { name: 'Career report' }) })
    await report.getByText('Included in Academy Premium, or buy it once for 49,000 kip (lasts 12 months).').waitFor()
    await report.getByRole('button', { name: 'Buy once for 49,000 kip' }).click()
    await report.getByText('Pay 49,000 kip to one of these accounts, then upload a photo of the receipt.').waitFor()
    await report.getByText('BCEL · Bitdoin Co · 0101 0000 1234 5678').waitFor()
    await report.getByLabel('Upload receipt').setInputFiles({ name: 'receipt.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await page.getByText('Upload a JPG, PNG or WebP photo up to 10 MB.').waitFor()
    assert.equal(mock.state.uploads, undefined, 'a GIF is not uploaded')
    await report.getByLabel('Upload receipt').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') })
    await report.getByRole('status').getByText('Receipt sent. We check it within one working day.').waitFor()
    assert.match(mock.state.uploads.at(-1), new RegExp(`^/storage/v1/object/premium-payment-proofs/${USER_ID}/report-rp1-\\d+\\.png$`))
    const submitted = lastCall(mock, 'academic_submit_report_receipt').args
    assert.equal(submitted.p_purchase_id, 'rp1')
    assert.equal(`/storage/v1/object/premium-payment-proofs/${submitted.p_path}`, mock.state.uploads.at(-1))
    await shot(page, 'my-scores-career-report-1-purchase-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    // Finance verifies it: the report is unlocked for 12 months.
    Object.assign(mock.state, { reportEntitled: true, careerLocked: false })
    Object.assign(mock.state.reportPurchase, { status: 'verified', reviewed_at: '2026-10-27T05:00:00Z', valid_until: '2027-10-27T05:00:00Z' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await report.getByText('You have the report until', { exact: false }).waitFor()
    await report.getByRole('button', { name: 'Make my report' }).click()
    await page.getByText('Report ready.').waitFor()
    await report.getByRole('link', { name: /^Made / }).click()
    await page.getByRole('heading', { name: 'Career report for Noy', level: 1 }).waitFor()
    await page.getByText('Grade 11 · school year 2026-2027 · made', { exact: false }).waitFor()
    await page.getByRole('heading', { name: 'Registered Nurse' }).waitFor()
    await page.getByText('Biology: latest score 8').waitFor()
    await page.getByText('Chemistry: no score yet').waitFor()
    await page.getByText('Bachelor of Nursing Science').waitFor()
    await page.getByRole('heading', { name: 'How the options changed' }).waitFor()
    await page.getByRole('heading', { name: 'Discussion guide for the family' }).waitFor()
    await page.getByRole('heading', { name: 'Sources' }).waitFor()
    await page.getByText('This report is an exploration tool, not a validated test', { exact: false }).waitFor()
    assert.equal(await page.getByText(/\d+ ?%/).count(), 0, 'no percentages')
    await shot(page, 'my-scores-career-report-2-report-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    assert.deepEqual(errors, [])
    await context.close()
    const lo = await openAs(browser, { device: MOBILE, lang: 'lo', step: 'ready', enrolment: 'e1' })
    lo.mock.state.reportEntitled = true
    await lo.page.goto(`${base}/academy/scores/careers/report/cr1`, { waitUntil: 'domcontentloaded' })
    await lo.page.getByRole('heading', { name: 'ລາຍງານອາຊີບ ສຳລັບ Noy', level: 1 }).waitFor()
    await lo.page.getByText('ຊີວະວິທະຍາ: ຄະແນນຫຼ້າສຸດ 8').waitFor()
    await shot(lo.page, 'my-scores-career-report-3-report-lo-mobile')
    assert.deepEqual(lo.errors, [])
    await lo.context.close()
    // The guardian buys it on the child page; it covers every linked child.
    const parent = await openAs(browser, { device: MOBILE, lang: 'en', step: 'onboarding' })
    parent.mock.state.family = [{ id: 'gl7', status: 'active', purpose: 'link', relationship: 'mother', scopes: {}, guardian_name: 'Mrs Phonsavan', student_name: 'Noy', grade: 'Grade 11',
      declared_at: '2026-10-20T05:00:00Z', confirm_by: '2026-10-27T05:00:00Z', confirmed_at: '2026-10-21T05:00:00Z', reconfirm_by: null, removed_at: null, removed_by: null }]
    await parent.page.goto(`${base}/academy/family`, { waitUntil: 'domcontentloaded' })
    await parent.page.getByRole('link', { name: 'See progress' }).click()
    const guardianReport = parent.page.locator('section', { has: parent.page.getByRole('heading', { name: 'Career report' }) }).last()
    await guardianReport.getByText('It covers every child linked to you.').waitFor()
    await guardianReport.getByRole('button', { name: 'Buy once for 49,000 kip' }).click()
    await guardianReport.getByText('Pay 49,000 kip to one of these accounts', { exact: false }).waitFor()
    await guardianReport.getByRole('button', { name: 'Cancel purchase' }).click()
    await guardianReport.getByRole('button', { name: 'Buy once for 49,000 kip' }).waitFor()
    assert.deepEqual(lastCall(parent.mock, 'academic_cancel_report_purchase').args, { p_purchase_id: 'rp1' })
    // The guardian sees the child's reports only while career answers are shared (migration 158).
    await guardianReport.getByText('You see the reports Noy makes when Noy shares career answers with you.').waitFor()
    assert.equal(parent.mock.state.calls.some(call => call.fn === 'academic_guardian_career_reports'), false, 'not asked for while not shared')
    parent.mock.state.childSharesCareers = true
    await parent.page.reload({ waitUntil: 'domcontentloaded' })
    await guardianReport.getByRole('heading', { name: 'Reports Noy made' }).waitFor()
    await guardianReport.getByRole('link', { name: /^Made / }).click()
    await parent.page.getByRole('heading', { name: 'Career report for Noy', level: 1 }).waitFor()
    await parent.page.getByText('Biology: latest score 8').waitFor()
    assert.deepEqual(lastCall(parent.mock, 'academic_guardian_career_report').args, { p_report_id: 'cr1' })
    await parent.page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await parent.page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    await shot(parent.page, 'my-scores-career-report-4-guardian-en-mobile')
    await parent.page.getByRole('link', { name: 'Back to Noy' }).click()
    await parent.page.getByRole('heading', { name: 'Noy', level: 1 }).waitFor()
    assert.deepEqual(parent.errors, [])
    await parent.context.close()
    pass('Career report: price and Premium inclusion shown, bought once by transfer with the accounts listed, a GIF refused before upload, receipt uploaded to the buyer\'s own folder and sent for review; once verified, the frozen report has options with reasons, latest scores, pathways with cut-off years, history, family guide, sources and disclaimer, no percentages; Lao report; a guardian buys or cancels from the child page and sees the child\'s reports only while career answers are shared; axe clean')
  }

  // Compare school years (DASH-007 #52): the same subject last year, aligned by month, as a share of each scale when
  // the scales differ; disabled with the reason when the scales cannot be compared.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.dashboard = insightsDashboard()
    const month = (m, label_en, value, normalised) => ({ month: m, label_en, label_lo: label_en, status: 'scored', value, normalised })
    const year = (extra) => ({ subject_enrolment_id: 'se-math', current: true, year: '2027-2028', grade_en: 'Grade 12', grade_lo: 'ມ.7',
      scale: { family: 'numeric_linear', min: 0, max: 10, normalisable: true }, compatible: true, reason: null, ...extra })
    const lastYear = { subject_enrolment_id: 'se-old', current: false, year: '2026-2027', grade_en: 'Grade 11', grade_lo: 'ມ.6' }
    mock.state.compareYears = { subject: { name_en: 'Mathematics', name_lo: 'ຄະນິດສາດ' }, years: [
      year({ series: [month(9, 'September', 6, 0.6), month(10, 'October', 7, 0.7)] }),
      year({ ...lastYear, scale: { family: 'numeric_linear', min: 0, max: 50, normalisable: true }, series: [month(9, 'September', 40, 0.8), month(10, 'October', 35, 0.7), month(11, 'November', 30, 0.6)] }),
    ] }
    await page.goto(`${base}/academy/scores?subject=se-math`, { waitUntil: 'domcontentloaded' })
    const section = page.locator('section', { has: page.getByRole('heading', { name: 'Compare school years' }) })
    await section.getByRole('button', { name: 'Compare years' }).click()
    assert.deepEqual(lastCall(mock, 'academic_compare_years').args, { p_subject_enrolment_id: 'se-math' })
    const card = page.locator('section', { has: page.getByRole('heading', { name: 'Mathematics: this year and before' }) }).last()
    await card.getByText('Shown as a share of each year’s scale (0–10 and 0–50), because the scales differ.').waitFor()
    await card.getByText('2026-2027 (Grade 11)').first().waitFor()
    await shot(page, 'my-scores-compare-years-1-chart-en-mobile')
    await card.getByRole('button', { name: 'View as table' }).click()
    const rows = await card.locator('tbody tr').allInnerTexts()
    assert.deepEqual(rows.map(r => r.split('\t').map(c => c.trim())), [['September', '60%', '80%'], ['October', '70%', '70%'], ['November', '—', '60%']], 'aligned by month, September first')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' ')))), [])
    // A year on another kind of scale: the option is disabled and says why.
    mock.state.compareYears = { ...mock.state.compareYears, years: [mock.state.compareYears.years[0],
      year({ ...lastYear, scale: { family: 'ordinal', min: null, max: null, normalisable: false }, compatible: false, reason: 'different_scale', series: null })] }
    await page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await section.getByRole('button', { name: 'Compare years' }).isDisabled(), true)
    await section.getByText('2026-2027 (Grade 11) used a different kind of scale, so the years cannot be compared.').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('Compare years: the same subject last year aligned by month (September first), shown as a share of each scale when ranges differ, with a table; another kind of scale disables the option with the reason; axe clean')
  }

  // Study planner (P3-PLAN #54): suggested goal, live feasibility, study time, week, skip or keep, pause; Free limit.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.dashboard = workedExampleDashboard()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Study planner' }).click()
    await page.getByText('Suggested: Mathematics from 5.5 to 6.5').waitFor()
    await page.getByRole('button', { name: 'Use this' }).click()
    await page.getByLabel('Target').fill('8')
    await page.getByLabel('By').selectOption({ label: 'March (4 months)' })
    await page.getByRole('status').getByText('About +0.63 a month. That is a lot; a halfway goal can help.').waitFor()
    await page.getByRole('button', { name: 'Save goal' }).click()
    await page.getByText('Mathematics: 5.5 → 8 by March').waitFor()
    await page.getByText('Halfway goal: 6.5 by January').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_save_goal').args.p_input, { subject_enrolment_id: 'se-math', target: 8, target_period_id: 'm7' })

    await page.getByRole('button', { name: 'Sun' }).click()
    await page.getByRole('button', { name: '20 min' }).click()
    await page.getByRole('button', { name: 'Start my plan' }).click()
    assert.deepEqual(lastCall(mock, 'academic_save_plan').args.p_input, { days: [1, 3, 6, 7], minutes_per_day: 20 })
    await page.getByText('Mon, Wed, Sat, Sun · 20 min a day').waitFor()
    const week = page.locator('section', { has: page.getByRole('heading', { name: 'This week' }) })
    await week.getByText('Algebra practice').waitFor()
    await week.getByText('Review Mathematics: redo exercises you found hard').waitFor()
    await week.getByText('Still want to do this? It has moved once already.').waitFor()
    await page.getByText('3 of 4 tasks done · 55 min').waitFor()
    assert.equal(await page.getByText(/streak|missed|failed/i).count(), 0, 'no streaks or negative words')
    await shot(page, 'my-scores-planner-1-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.flatMap(v => v.nodes.map(n => v.id + ' ' + n.target.join(' '))))
    assert.deepEqual(violations, [])
    await week.getByRole('button', { name: 'Skip' }).click()
    await page.waitForTimeout(200)
    assert.deepEqual(lastCall(mock, 'academic_update_task').args, { p_task_id: 't0', p_action: 'skip' })
    await page.getByLabel('Count finished tasks as Academy XP (+10 each)').check()
    await page.getByText('Missing a day never takes XP away. Turn it off any time.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_set_planner_xp').args, { p_on: true })
    await page.getByTestId('task-t1').getByRole('button', { name: 'Done' }).click()
    await page.getByTestId('task-t1').getByText('Done', { exact: true }).waitFor()
    await page.getByTestId('task-t1').getByText('+10 XP').waitFor()
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByLabel('Pause until').fill('2026-12-07')
    await page.getByRole('button', { name: 'Pause' }).last().click()
    await page.getByText(/^Paused until 7 Dec 2026/).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_pause_plan').args, { p_until: '2026-12-07' })

    mock.state.plannerFree = true
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByText('Mathematics: 5.5 → 8 by March').waitFor()
    assert.equal(await page.getByText('Weekly study plans and more goals come with Academy Premium.').count(), 2, 'Free: no weekly plan and no second goal')
    assert.equal(await page.getByRole('button', { name: 'Add a goal' }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Planner: suggested goal, live feasibility with a halfway goal, exact goal and plan payloads, week with Open/Done, skip or keep, opt-in Academy XP (+10 on a done task), neutral review, pause, axe clean; Free: one goal, no weekly plan')
  }

  // Premium gates (P3-BIL #51, migration 142): summary insights, top action only, re-test locked; nothing recorded is hidden.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    const full = insightsDashboard()
    mock.state.dashboard = { ...full, detail_locked: true, subjects: full.subjects.map(s => ({ ...s, label: { value: s.label.value, rule: s.label.rule }, trend: { value: s.trend.value, rule: s.trend.rule, direction: s.trend.direction } })) }
    mock.state.recommendations = WEEK.slice(0, 1)
    mock.state.recsLocked = 2
    Object.assign(mock.state, { quizAnswers: Object.fromEntries(QUIZ_ITEMS.map(i => [i.id, i.correct_key])), quizDone: true, quizLocked: true })
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    const insights = page.locator('section', { has: page.getByRole('heading', { name: 'Compared with your own average' }) })
    await insights.getByText('Below your average lately').first().waitFor()
    await insights.getByText('The full evidence and how sure each result is come with Academy Premium.').waitFor()
    assert.equal(await insights.getByText(/High confidence|Medium confidence/).count(), 0, 'no confidence chips without Premium')
    await page.getByText('2 more suggestions this week with Academy Premium.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Ask a parent' }).count() >= 2, true, 'students under 18 are sent to a parent, not to a purchase')
    await shot(page, 'my-scores-premium-1-dashboard-en-mobile')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => v.id))
    assert.deepEqual(violations, [])
    await page.goto(`${base}/academy/scores?subject=se-math`, { waitUntil: 'domcontentloaded' })
    await page.getByText('You have used this term’s check for this subject. Re-tests come with Academy Premium.').waitFor()
    await page.getByText('Explanations of what your scores show, month by month, come with Academy Premium.').waitFor()
    await page.getByRole('link', { name: 'See your last quiz results' }).waitFor()
    assert.equal(await page.locator('.recharts-line-curve').count() > 0, true, 'the subject chart stays')
    await shot(page, 'my-scores-premium-2-subject-en-mobile')

    // Premium ending in 3 days (NOTIF-005) and the plan in My data.
    mock.state.entitlements = { enforced: true, tier: 'premium', premium: { active: true, source: 'academy_premium', until: new Date(Date.now() + 2.5 * 86400_000).toISOString() }, period_key: '2026-10', resets_at: '2026-10-31T17:00:00Z',
      features: { ocr_upload: { enabled: true, source: 'academy_premium', until: null, quota: { limit: 20, used: 4, remaining: 16 } } } }
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByText(/^Academy Premium ends in 3 days, on /).waitFor()
    await page.getByRole('link', { name: 'Renew' }).waitFor()
    await page.goto(`${base}/academy/scores/data`, { waitUntil: 'domcontentloaded' })
    const plan = page.locator('section', { has: page.getByRole('heading', { name: 'Your plan' }) })
    await plan.getByText(/^Academy Premium until /).waitFor()
    await plan.getByText('If Premium ends, everything you recorded stays.').first().waitFor()
    await shot(page, 'my-scores-premium-3-plan-en-mobile')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Premium gates: summary reasons without confidence, Premium note with "Ask a parent" for under-18s, 2 more suggestions held back, re-test locked with the last result still open, chart kept, axe clean; ending-soon notice with Renew; plan card in My data')
  }

  // LEARN-007: a recommended Academy lesson opens in the Academy, even before daily
  // pacing unlocks it (REC-OPEN), and its back button returns to Schooling.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    const category = { id: 'cat1', slug: 'maths', name_en: 'Maths', name_lo: 'ເລກ', description_en: '', description_lo: '', icon: 'Calculator', accent: '#3b82f6' }
    const lesson = (n, slug, title) => ({ id: `les${n}`, category_id: 'cat1', slug, title_en: title, title_lo: title, summary_en: 'Summary', summary_lo: 'Summary', deck_en: null, deck_lo: null,
      content_en: [{ heading: 'Step one', body: 'Move the number to the other side.' }], content_lo: [{ heading: 'Step one', body: 'Move the number to the other side.' }],
      glossary_en: [], glossary_lo: [], reflection_questions_en: [], reflection_questions_lo: [], key_takeaways_en: [], key_takeaways_lo: [],
      difficulty: 'BEGINNER', estimated_minutes: 15, lesson_type: 'LESSON', source_url: null, source_verified_at: null, application_deadline: null, book_id: null, category, book: null })
    mock.state.tables = {
      premium_subscriptions: [{ id: 'sub1' }],
      premium_learning_categories: [category],
      premium_lessons: [lesson(1, 'numbers', 'Numbers'), lesson(2, 'fractions', 'Fractions'), lesson(3, 'linear-equations', 'Linear equations lesson')],
    }
    // Pacing has unlocked one lesson of the student's shuffled order: find one it still locks
    // (opened directly, the Academy sends it back to the category).
    let locked = null
    for (const slug of ['numbers', 'fractions', 'linear-equations']) {
      await page.goto(`${base}/academy/lesson/${slug}`, { waitUntil: 'domcontentloaded' })
      const landed = await Promise.race([
        page.waitForURL(/\/academy\/learn\/maths$/, { timeout: 8000 }).then(() => 'category'),
        page.getByText('Move the number to the other side.').waitFor({ timeout: 8000 }).then(() => 'lesson'),
      ])
      if (landed === 'category') { locked = slug; break }
    }
    assert.ok(locked, 'pacing locks at least one of the three lessons')

    mock.state.dashboard = workedExampleDashboard()
    mock.state.recommendations = [{ key: 'academy_lesson:c9', rule_id: 'R3', kind: 'academy_lesson', title_lo: 'Locked lesson', title_en: 'Locked lesson', est_minutes: 15,
      route: `/academy/lesson/${locked}`, priority: 80, reason: { code: 'R3', topic_lo: 'ພຶດຊະຄະນິດ', topic_en: 'Algebra', band: 'needs_practice', date: '2026-10-12T05:00:00Z' } }]
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Open the lesson' }).click()
    await page.getByText('Move the number to the other side.').waitFor()
    assert.ok(page.url().endsWith(`/academy/lesson/${locked}`), 'the recommended lesson opens although pacing still locks it')
    await page.getByRole('button', { name: 'Go back' }).click()
    await page.getByRole('heading', { name: 'This week' }).waitFor()
    assert.match(page.url(), /\/academy\/scores$/)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Academy lesson from This week: opens before pacing unlocks it, back returns to Schooling; opened directly, pacing still redirects (LEARN-007)')
  }

  // Report a problem (PRIV-008) from the dashboard.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1' })
    mock.state.dashboard = workedExampleDashboard()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Report a problem' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByText('Tell us what went wrong.').waitFor()
    const sendButton = dialog.getByRole('button', { name: 'Send report' })
    assert.equal(await sendButton.isDisabled(), true, 'a category and a description are needed')
    await dialog.getByRole('radio', { name: 'An AI answer that was wrong or not appropriate' }).check()
    await dialog.getByLabel(/^What happened\?/).fill('The explanation said something rude.')
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)), [])
    await shot(page, 'my-scores-24-report-en-mobile')
    await sendButton.click()
    await page.getByText('Thank you. Our support team will reply by 27 Oct 2026.').waitFor()
    assert.deepEqual(mock.state.problemReports, [{ category: 'ai_answer', description: 'The explanation said something rude.', screen: '/academy/scores' }])
    assert.deepEqual(errors, [])
    await context.close()
    pass('Report a problem: category and description required, axe clean, sent with the screen, reply date shown')
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
    assert.equal(bytes.readUInt16LE(eocd + 10), 11, 'eleven files')
    for (const name of ['profile.json', 'enrolments.json', 'scores.csv', 'revisions.csv', 'consents.json', 'quizzes.json', 'reports.json', 'recommendations.json', 'planner.json', 'coach.json', 'careers.json']) assert.ok(bytes.includes(Buffer.from(name)), name)
    assert.ok(bytes.includes(Buffer.from('ຄະນິດສາດ')), 'Lao text kept as UTF-8')
    assert.ok(bytes.includes(Buffer.from('"practice"')), 'quizzes.json carries practice sets')
    await page.getByText('Your data was downloaded.').waitFor()
    assert.deepEqual(errors, [])
    await context.close()
    pass('Export: ZIP downloaded with profile.json, enrolments.json, scores.csv, revisions.csv, consents.json, quizzes.json, reports.json, recommendations.json, planner.json, coach.json, careers.json')
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
    // Usage statistics (ANL-001): off here, turned on with the current notice version, then off again.
    await page.getByText('ສະຖິຕິການນຳໃຊ້').waitFor()
    await page.getByRole('button', { name: 'ເປີດ', exact: true }).click()
    await page.getByRole('button', { name: 'ປິດ', exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'usage_statistics', p_notice_version: '2026-10-draft' })
    await page.getByRole('button', { name: 'ປິດ', exact: true }).click()
    await page.getByRole('button', { name: 'ເປີດ', exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'usage_statistics' })
    // Coach chats for reviewers (ADMIN-009, migration 146): off until turned on here, and off again.
    await page.getByText('ໃຫ້ຜູ້ກວດສອບກວດຄຳຕອບຂອງຄູຝຶກ').waitFor()
    await page.getByRole('button', { name: 'ເປີດ: ໃຫ້ຜູ້ກວດສອບກວດຄຳຕອບຂອງຄູຝຶກ' }).click()
    await page.getByRole('button', { name: 'ປິດ', exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'coach_review', p_notice_version: '2026-10-draft' })
    await page.getByRole('button', { name: 'ປິດ', exact: true }).click()
    await page.getByRole('button', { name: 'ເປີດ: ໃຫ້ຜູ້ກວດສອບກວດຄຳຕອບຂອງຄູຝຶກ' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'coach_review' })
    // E-mails about the account (NOTIF-005, migration 163): off until turned on here, and off again.
    await page.getByRole('button', { name: 'ເປີດ: ສົ່ງອີເມວຫາຂ້ອຍ' }).click()
    await page.getByRole('button', { name: 'ປິດ', exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_grant_consent').args, { p_purpose: 'email', p_notice_version: '2026-10-draft' })
    await page.getByRole('button', { name: 'ປິດ', exact: true }).click()
    await page.getByRole('button', { name: 'ເປີດ: ສົ່ງອີເມວຫາຂ້ອຍ' }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'email' })
    await page.getByRole('button', { name: 'ຢຸດ' }).first().click()
    await page.getByText('ຢຸດເກັບຄະແນນໃໝ່ບໍ?').waitFor()
    await shot(page, 'my-scores-21-consents-lo-mobile')
    await page.getByRole('button', { name: 'ແມ່ນ, ຢຸດ' }).click()
    await page.getByText('ການບັນທຶກຖືກຢຸດ').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_withdraw_consent').args, { p_purpose: 'module_processing' })
    assert.deepEqual(errors, [])
    await context.close()
    pass('Consents (Lao): device reminders stopped and hidden until given again; usage statistics switched on and off; Coach review sharing and account e-mails off by default, switched on and off; module processing withdrawn after a warning, profile shown read-only')
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

  // Pilot ratings (REL-001): asked after the second month, only with statistics on; answers become usage events.
  {
    const { context, page, mock, errors } = await openAs(browser, { device: MOBILE, lang: 'en', step: 'ready', enrolment: 'e1', clock: true })
    mock.state.dashboard = workedExampleDashboard()
    await page.goto(`${base}/academy/scores`, { waitUntil: 'networkidle' })
    await page.getByText('Up 0.3 since January').waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Two quick questions' }).count(), 0, 'not asked while usage statistics are off')
    mock.state.consents.push({ id: 'c9', purpose: 'usage_statistics', notice_version: '2026-10-draft', granted_at: '2026-10-25T02:00:00Z', withdrawn_at: null })
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Two quick questions' }).waitFor()
    const send = page.getByRole('button', { name: 'Send' })
    assert.equal(await send.isDisabled(), true, 'both questions answered first')
    await page.getByRole('group', { name: 'How useful is Schooling for you?' }).getByRole('button', { name: '5 / 5 · Very useful' }).click()
    await page.getByRole('group', { name: 'How easy is it to enter your scores?' }).getByRole('button', { name: '4 / 5' }).click()
    await shot(page, 'my-scores-26-ratings-en-mobile')
    await send.click()
    await page.getByText('Thank you! This helps us improve Schooling.').waitFor()
    await page.clock.fastForward(11_000)
    for (let i = 0; i < 50 && mock.state.events.filter(e => e.name === 'feedback_submitted').length < 2; i++) await page.waitForTimeout(100)
    assert.deepEqual(mock.state.events.filter(e => e.name === 'feedback_submitted').map(e => e.props).sort((a, b) => a.question.localeCompare(b.question)),
      [{ question: 'entry_ease', rating: '4' }, { question: 'usefulness', rating: '5' }])
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByText('Up 0.3 since January').waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Two quick questions' }).count(), 0, 'asked once')
    assert.deepEqual(errors, [])
    await context.close()
    pass('Ratings: asked after two months with statistics on, both answers required, sent as usage events, not asked again')
  }

  // ─── Localisation and accessibility sweep (QA-003, #39; PRD §35.3) ────────
  // Every student screen × Lao/English × light/dark at 360 px: axe (WCAG 2.2
  // AA, all impacts), page language, no sideways scrolling, no clipped text;
  // then text at 200% and reflow at 320 px.
  {
    const PHONE = { viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: MOBILE.userAgent }
    const SCREENS = [
      { name: 'set-up notice', path: '/academy/scores', state: { step: 'onboarding' } },
      { name: 'updated notice', path: '/academy/scores', state: { step: 'consent', enrolment: 'e1' } },
      { name: 'dashboard', path: '/academy/scores', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.dashboard = workedExampleDashboard() } },
      { name: 'dashboard with insights', path: '/academy/scores', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.dashboard = insightsDashboard() } },
      { name: 'subject explanation', path: '/academy/scores?subject=se-math', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.dashboard = insightsDashboard() } },
      { name: 'quiz question', path: '/academy/scores/quiz/dg1', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.quizAnswers = { qi1: 'B' } } },
      { name: 'quiz results', path: '/academy/scores/quiz/result/at1', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.quizAnswers = { qi1: 'B', qi2: 'A', qi4: 'A', qi3: 'A' }; mock.state.quizPrevious = { qi1: 'A', qi2: 'A', qi4: 'A', qi3: 'B' } } },
      { name: 'this week', path: '/academy/scores', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.dashboard = workedExampleDashboard(); mock.state.recommendations = WEEK } },
      { name: 'practice feedback', path: '/academy/scores/practice/t1', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.practice = { pi1: { chosen_key: 'A', is_correct: false, correct_key: 'B', explanation_lo: 'ລົບ 1 ອອກທັງສອງຂ້າງ.', explanation_en: 'Take 1 from both sides.', explanation_origin: 'human' } } } },
      { name: 'quiz conflict note', path: '/academy/scores?subject=se-math', state: { step: 'ready', enrolment: 'e1' }, setup: mock => { mock.state.dashboard = insightsDashboard(); mock.state.quizDone = true; mock.state.quizAnswers = { qi1: 'B', qi2: 'C', qi4: 'A', qi3: 'A' } } },
      { name: 'score entry', path: '/academy/scores/entry', state: { step: 'ready', enrolment: 'e1' } },
      { name: 'history', path: '/academy/scores/history', state: { step: 'ready', enrolment: 'e1' } },
      { name: 'my data', path: '/academy/scores/data', state: { step: 'ready', enrolment: 'e1' } },
      { name: 'inbox', path: '/academy/scores/inbox', state: { step: 'ready', enrolment: 'e1' } },
    ]
    const audit = (page) => page.evaluate(() => {
      const sideways = document.documentElement.scrollWidth > window.innerWidth + 1
      const clipped = []
      for (const el of document.querySelectorAll('body *')) {
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || !el.offsetParent && style.position !== 'fixed') continue
        const hasText = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())
        if (!hasText || el.closest('.recharts-wrapper, .sr-only')) continue
        // Ellipsis hides content too (WCAG 1.4.4): names must wrap instead.
        if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
          clipped.push(`truncated ${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}"`)
          continue
        }
        const hidesX = ['hidden', 'clip'].includes(style.overflowX)
        const hidesY = ['hidden', 'clip'].includes(style.overflowY)
        if ((hidesY && el.scrollHeight > el.clientHeight + 1) || (hidesX && el.scrollWidth > el.clientWidth + 1)) {
          clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} "${el.textContent.trim().slice(0, 30)}"`)
        }
      }
      return { sideways, clipped, lang: document.documentElement.lang }
    })
    const findings = []
    for (const screen of SCREENS) {
      for (const lang of ['lo', 'en']) {
        for (const theme of ['light', 'dark']) {
          const { context, page, mock, errors } = await openAs(browser, { device: PHONE, lang, ...screen.state })
          await context.addInitScript(value => localStorage.setItem('bitdoin_theme', value), theme)
          screen.setup?.(mock)
          await page.goto(`${base}${screen.path}`, { waitUntil: 'networkidle' })
          await page.waitForTimeout(400)
          const where = `${screen.name} (${lang}, ${theme})`
          await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
          const axe = await page.evaluate(async () => {
            const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] })
            return result.violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
          })
          axe.forEach(v => findings.push(`${where}: axe ${v}`))
          let check = await audit(page)
          if (check.lang !== lang) findings.push(`${where}: <html lang> is "${check.lang}"`)
          if (check.sideways) findings.push(`${where}: scrolls sideways at 360 px`)
          check.clipped.forEach(c => findings.push(`${where}: clipped text ${c}`))
          if (theme === 'light') {
            // Text at 200% (WCAG 1.4.4) and reflow at 320 px (1.4.10).
            await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
            await page.waitForTimeout(200)
            check = await audit(page)
            if (check.sideways) findings.push(`${where}: scrolls sideways with text at 200%`)
            check.clipped.forEach(c => findings.push(`${where}: clipped at 200% ${c}`))
            if (lang === 'lo') await shot(page, `a11y-${screen.name.replace(/ /g, '-')}-lo-200`)
            await page.evaluate(() => { document.documentElement.style.fontSize = '' })
            await page.setViewportSize({ width: 320, height: 800 })
            await page.waitForTimeout(200)
            if ((await audit(page)).sideways) findings.push(`${where}: scrolls sideways at 320 px`)
          }
          errors.forEach(e => findings.push(`${where}: page error ${e}`))
          await context.close()
        }
      }
    }
    assert.deepEqual(findings, [], `\n${findings.join('\n')}`)
    pass(`Localisation and accessibility: ${SCREENS.length} screens × Lao/English × light/dark at 360 px: axe WCAG 2.2 AA clean, page language set, no sideways scrolling or clipped text, also with text at 200% and at 320 px`)
  }

  // Keyboard (PRD §35.3): on desktop every control reached with Tab shows a
  // visible focus indicator, and Tab order covers the main actions.
  {
    const missing = []
    for (const path of ['/academy/scores', '/academy/scores/entry', '/academy/scores/data', '/academy/scores/inbox']) {
      const { context, page, mock, errors } = await openAs(browser, { device: DESKTOP, lang: 'en', step: 'ready', enrolment: 'e1' })
      if (path === '/academy/scores') mock.state.dashboard = workedExampleDashboard()
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const seen = new Set()
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const el = document.activeElement
          if (!el || el === document.body) return null
          const style = getComputedStyle(el)
          const ring = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || (style.boxShadow && style.boxShadow !== 'none')
          return { id: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}"`, ring }
        })
        if (!focus || seen.has(focus.id)) continue
        seen.add(focus.id)
        if (!focus.ring) missing.push(`${path}: ${focus.id}`)
      }
      assert.ok(seen.size >= 4, `${path}: only ${seen.size} controls reached with Tab`)
      assert.deepEqual(errors, [])
      await context.close()
    }
    assert.deepEqual(missing, [], `no visible focus indicator:\n${missing.join('\n')}`)
    pass('Keyboard: dashboard, entry, My data and inbox reachable with Tab; every focused control shows a focus indicator')
  }

  console.log(`
${results.length} scenarios passed`)
} finally {
  await browser.close()
}
