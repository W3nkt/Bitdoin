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


function careerFixtures() {
  const base = { published: null, changed: true, problems: {}, review_by: null, published_review_by: null, reviewed_by: null, review_note: null, submitted_at: '2026-10-26T04:00:00Z', published_at: null, updated_at: '2026-10-26T04:00:00Z' }
  return [
    { ...base, id: 'k1', kind: 'career', slug: 'registered-nurse', status: 'in_review', author: null, last_edited_by: null, can_approve: true,
      draft: { title_en: 'Registered Nurse', title_lo: 'ພະຍາບານ', cluster: 'health', primary_area: 'S', secondary_area: 'I', related_subjects: ['BIO', 'CHEM'], study_years: '4to5', work_settings: ['with_people'], facts: [] } },
    { ...base, id: 'k2', kind: 'career', slug: 'pharmacist', status: 'in_review', author: 'You', last_edited_by: 'You', can_approve: false,
      draft: { title_en: 'Pharmacist', title_lo: 'ເພສັດຊະກອນ', cluster: 'health', primary_area: 'I', secondary_area: 'S', related_subjects: ['CHEM', 'BIO', 'MATH'], study_years: '4to5', work_settings: ['workshop_lab'], facts: [] } },
    { ...base, id: 'k3', kind: 'institution', slug: 'uhs', status: 'in_review', author: null, last_edited_by: null, can_approve: true,
      draft: { name_en: 'University of Health Sciences', name_lo: 'ມະຫາວິທະຍາໄລ ວິທະຍາສາດສຸຂະພາບ', type: 'university', province_code: 'vientiane-prefecture', website_url: 'https://uhs.edu.la/',
        source_name: 'University of Health Sciences official website', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', review_by: '2027-04-26',
        faculties: ['ຄະນະແພດສາດ', 'ຄະນະເພສັຊສາດ', 'ຄະນະທັນຕະແພດສາດ', 'ຄະນະພະຍາບານສາດ', 'ຄະນະເຕັກນິກການແພດ', 'ຄະນະສາທາລະນະສຸກສາດ'].map((name_lo) => ({ name_lo, name_en: '' })) } },
    { ...base, id: 'k9', kind: 'programme', slug: 'p-nursing', status: 'published', changed: false, author: 'Admin One', last_edited_by: 'Admin One', can_approve: false,
      draft: { institution: 'uhs', name_en: 'Bachelor of Nursing Science', name_lo: 'ປະລິນຍາຕີ ພະຍາບານສາດ', degree_level: 'bachelor', duration_years: '4', careers: ['registered-nurse'], requirements: [],
        source_name: 'UHS', source_url: 'https://uhs.edu.la/', verified_on: '2026-10-26', review_by: '2026-11-15' } },
    { ...base, id: 'k10', kind: 'programme', slug: 'p-nuol-02', status: 'draft', author: null, last_edited_by: null, can_approve: false,
      problems: { duration_years: 'Confirm the length with the faculty, then tick Length confirmed' },
      draft: { institution: 'uhs', faculty: 'ຄະນະວິທະຍາສາດທຳມະຊາດ', name_en: 'Computer Science', name_lo: 'ວິທະຍາສາດຄອມພິວເຕີ', degree_level: 'bachelor', duration_years: '4', duration_unconfirmed: true,
        entrance_group: '', careers: [], requirements: [], source_name: 'National University of Laos: bachelor programmes', source_url: 'https://nuol.edu.la/', verified_on: '2026-10-27', review_by: '2027-04-27' } },
  ].map((c) => ({ ...c, published: c.status === 'published' ? c.draft : null }))
}

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

function quizItem(fields) {
  return {
    item_key: `k-${fields.id}`, item_version: 1, stem_en: null, explanation_en: null, explanation_origin: 'human', licence: 'original', source: null,
    reviewer_name: null, review_note: null, reviewed_at: null, updated_at: '2026-10-25T06:00:00Z', live_version: null, problems: {}, can_approve: false,
    ...fields,
  }
}

/** Diagnostic item bank (migration 131): one item to approve, one the admin wrote, one incomplete draft. */
function quizFixture() {
  const options = [{ key: 'A', text_lo: '2' }, { key: 'B', text_lo: '3' }, { key: 'C', text_lo: '4' }, { key: 'D', text_lo: '5' }]
  return {
    four_eyes: true,
    topics: [{ id: 't1', subject_id: 's-math', grade_id: 'g11', code: 'algebra', name_lo: 'ພຶດຊະຄະນິດ', name_en: 'Algebra', display_order: 0, active: true, subject_code: 'MATH', grade_code: 'G11', approved_items: 0, open_items: 3 }],
    items: [
      quizItem({ id: 'q1', topic_id: 't1', stem_lo: 'ຖ້າ x + 2 = 5, x ເທົ່າກັບເທົ່າໃດ?', stem_en: 'If x + 2 = 5, what is x?', options, correct_key: 'B', explanation_lo: 'ລົບ 2 ອອກທັງສອງຂ້າງ.', status: 'in_review', author_name: 'Admin Two', can_approve: true }),
      quizItem({ id: 'q2', topic_id: 't1', stem_lo: 'ຖ້າ 2x = 8, x ເທົ່າກັບເທົ່າໃດ?', options, correct_key: 'C', explanation_lo: 'ຫານດ້ວຍ 2.', status: 'in_review', author_name: 'Admin Me', can_approve: false }),
      quizItem({ id: 'q3', topic_id: 't1', stem_lo: 'x − 1 = 3', options, correct_key: 'C', explanation_lo: null, status: 'draft', author_name: 'Admin Me', problems: { explanation_lo: 'Write the explanation in Lao (QUIZ-003)' } }),
    ],
  }
}

function backend({ role = 'ADMIN', aal = 'aal1', factors = [] } = {}) {
  const state = {
    calls: [], writes: [], factors: [...factors], tables: fixtures(role), token: jwt(aal),
    pilot: { pilot_mode: false, cohorts: [{ id: 'pc1', code: 'ABC234', name: 'Matthayom Thotlong', school_id: null, school_name: null, max_students: 60, active: true, created_at: '2026-10-25T04:00:00Z', students: 41 }] },
    quiz: quizFixture(),
    diagnostics: {
      rules: { min_items: 10, max_items: 15, min_per_topic: 3, resume_days: 7 },
      diagnostics: [{ id: 'dg1', subject_id: 's-math', grade_id: 'g11', parallel_of: null, subject_code: 'MATH', grade_code: 'G11', title_lo: 'ກວດຄະນິດສາດ ມ.6', title_en: 'Grade 11 Mathematics check',
        status: 'draft', published_at: null, item_ids: Array.from({ length: 10 }, (_, i) => `x${i}`), problems: {}, attempts: 0, completed: 0 }],
    },
    content: [],
    reports: [
      { id: 'pr1', category: 'guardian_link', priority: 'priority', screen: '/academy/scores/data', description: 'Someone I do not know is linked as my parent.', status: 'open',
        first_response_due: '2026-10-24T03:00:00Z', responded_at: null, overdue: true, reporter_member_code: 'DAN9XY', handled_by_name: null, resolution_note: null, resolved_at: null, created_at: '2026-10-23T03:00:00Z' },
      { id: 'pr2', category: 'other', priority: 'normal', screen: '/academy/scores', description: 'The chart is hard to read on my phone.', status: 'in_progress',
        first_response_due: '2026-10-28T03:00:00Z', responded_at: '2026-10-24T05:00:00Z', overdue: false, reporter_member_code: 'KQ7ZPA', handled_by_name: 'Ops Agent', resolution_note: null, resolved_at: null, created_at: '2026-10-23T05:00:00Z' },
    ],
  }
  state.reportPurchases = [
    { id: 'rp1', amount_lak: 49000, status: 'review', receipt_path: 'u-noy/report-rp1-1761534000000.png', reference: null, rejection_reason: null, created_at: '2026-10-27T03:00:00Z', reviewed_at: null, reviewed_by: null, valid_until: null, buyer: { name: 'Noy Student', member_code: 'DAN9XY' } },
    { id: 'rp2', amount_lak: 49000, status: 'review', receipt_path: 'u-kham/report-rp2-1761534000000.jpg', reference: null, rejection_reason: null, created_at: '2026-10-27T04:00:00Z', reviewed_at: null, reviewed_by: null, valid_until: null, buyer: { name: 'Kham Parent', member_code: 'KQ7ZPA' } },
  ]
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
    // Guardian links (PARENT-008, migration 152).
    academic_support_guardian_links: () => [{ id: 'gl1', status: state.linkSuspended ? 'suspended' : 'active', purpose: 'link', relationship: 'mother', scopes: { scores: true }, guardian_name: 'Mrs Phonsavan',
      declared_at: '2026-10-20T05:00:00Z', confirmed_at: '2026-10-21T05:00:00Z', removed_at: null, removed_by: null, cases: [] }],
    academic_support_suspend_guardian_link: (args) => { state.linkSuspended = true; return { id: args.p_link_id, status: 'suspended' } },
    // Career catalogue (ADMIN-010, UNI-001/004, migration 148): a small stateful stand-in.
    academic_admin_career_content: (args) => {
      const items = (state.careers ??= careerFixtures()).filter((c) => c.kind === args.p_kind)
      return {
        items, clusters: ['technology', 'health', 'education'], subjects: [{ code: 'BIO', name_en: 'Biology' }, { code: 'CHEM', name_en: 'Chemistry' }, { code: 'MATH', name_en: 'Mathematics' }],
        institutions: [{ slug: 'uhs', name_en: 'University of Health Sciences' }], careers: [{ slug: 'registered-nurse', title_en: 'Registered Nurse' }, { slug: 'pharmacist', title_en: 'Pharmacist' }],
      }
    },
    academic_admin_career_due: () => [{ id: 'k9', kind: 'programme', slug: 'p-nursing', name: 'Bachelor of Nursing Science', review_by: '2026-11-15', overdue: false }],
    academic_admin_save_career_content: (args) => {
      const input = args.p_input
      const problems = input.kind === 'programme' && (input.data.requirements ?? []).some((r) => !r.academic_year) ? { 'requirements.1': 'Add the academic year it applies to' } : {}
      const record = { id: 'k-new', kind: input.kind, slug: 'p-new', status: 'draft', draft: input.data, published: null, changed: true, problems, review_by: null, published_review_by: null,
        author: 'Admin', last_edited_by: 'Admin', reviewed_by: null, review_note: null, submitted_at: null, published_at: null, updated_at: '2026-10-26T05:00:00Z', can_approve: false }
      state.careers = [...(state.careers ??= careerFixtures()), record]
      return record
    },
    academic_admin_review_career_content: (args) => {
      const record = state.careers.find((c) => c.id === args.p_id)
      if (args.p_action === 'approve') Object.assign(record, { status: 'published', published: record.draft, changed: false })
      return record
    },
    // AI Coach review (ADMIN-009, migration 145).
    academic_admin_ai_review: (args) => ({
      items: (state.aiReviewed ? [] : [
        { id: 'fb1', conversation_id: '7d0c4a1e-1111-4222-8333-444455556666', rating: -1, report_category: 'unsafe', priority: true, source: 'student', sample_week: null, share_text: true, comment: 'Felt wrong',
          status: 'open', created_at: '2026-10-26T03:00:00Z', question: 'Why did my maths fall?', answer: 'Mathematics went from 7 to 6.', prompt_version: '1.0.0', model_id: 'qwen-plus', numbers_checked: true, safety_category: null, review: null },
        { id: 'fb2', conversation_id: '8e1d5b2f-1111-4222-8333-444455556666', rating: -1, report_category: null, priority: false, source: 'student', sample_week: null, share_text: false, comment: null,
          status: 'open', created_at: '2026-10-26T04:00:00Z', question: null, answer: null, prompt_version: '1.0.0', model_id: 'qwen-plus', numbers_checked: false, safety_category: null, review: null },
        { id: 'fb3', conversation_id: '9f2e6c3a-1111-4222-8333-444455556666', rating: null, report_category: null, priority: false, source: 'sample', sample_week: '2026-10-19', share_text: true, comment: null,
          status: 'open', created_at: '2026-10-26T18:30:00Z', question: 'How is my physics?', answer: 'Physics went from 6.5 to 7.', prompt_version: '1.0.0', model_id: 'qwen-plus', numbers_checked: true, safety_category: null, review: null },
      ]).filter(() => (args.p_status ?? 'open') === 'open'),
      last_7_days: { answers: 42, safety_redirects: 2, numbers_fallbacks: 1, thumbs_up: 9, thumbs_down: 2, provider_failures: 0 },
      sample: { week: '2026-10-19', items: 1, consenting_students: 3, rule: { rate: 0.01, minimum: 50 } },
      ratings: [{ prompt_version: '1.0.0', model_id: 'qwen-plus', reviewed: 12, accuracy: 4.5, lao: 3.8, safety: 5 }],
    }),
    academic_admin_rate_ai: (args) => { state.aiRated = args; return { id: args.p_feedback_id, status: 'reviewed' } },
    // Entitlements (BILLING-007, migration 141).
    academic_admin_member_entitlements: (args) => String(args.p_member_code).toUpperCase() !== 'DAN9XY' ? { error: { code: 'NOT_FOUND', status: 404 } } : {
      user: { id: 'u-noy', name: 'Noy Student', member_code: 'DAN9XY' },
      subscriptions: [{ plan: 'Free', price_lak: 0, status: 'ACTIVE', starts_at: '2026-09-01T00:00:00Z', ends_at: null }],
      entitlements: {
        enforced: false, tier: state.grants?.some(g => g.feature_code === 'premium' && !g.revoked_at) ? 'premium' : 'free',
        premium: state.grants?.some(g => g.feature_code === 'premium' && !g.revoked_at) ? { active: true, source: 'manual_grant', until: '2026-11-26T16:59:59Z' } : { active: false, source: null, until: null },
        period_key: '2026-10', resets_at: '2026-10-31T17:00:00Z',
        features: { advanced_analysis: { enabled: true, source: 'open', until: null, quota: null }, ocr_upload: { enabled: true, source: 'free', until: null, quota: { limit: 10, used: 2, remaining: 8 } } },
      },
      grants: [...(state.grants ?? [])].reverse(),
    },
    academic_admin_grant_entitlement: (args) => {
      if (args.p_input.reason_code === 'bank_transfer_confirmed' && !args.p_input.reference) return { error: { code: 'VALIDATION_FAILED', status: 422, details: { field: 'reference' } } }
      const grant = { id: `g${(state.grants ?? []).length + 1}`, ...args.p_input, note: args.p_input.note ?? null, reference: args.p_input.reference ?? null, amount_lak: args.p_input.amount_lak ?? null,
        starts_at: '2026-10-26T05:00:00Z', created_at: '2026-10-26T05:00:00Z', granted_by: 'Finance Keo', revoked_at: null, revoked_by: null, revoke_reason: null, active: true }
      ;(state.grants ??= []).push(grant)
      return grant
    },
    // Career report payments (BILLING-004, migration 157).
    academic_admin_report_purchases: (args) => state.reportPurchases.filter(p => p.status === args.p_status),
    academic_admin_review_report_purchase: (args) => {
      const row = state.reportPurchases.find(p => p.id === args.p_purchase_id)
      Object.assign(row, args.p_action === 'verify'
        ? { status: 'verified', reference: args.p_reference, reviewed_at: '2026-10-27T05:00:00Z', reviewed_by: 'Finance Keo', valid_until: '2027-10-27T05:00:00Z' }
        : { status: 'rejected', rejection_reason: args.p_reason, reviewed_at: '2026-10-27T05:00:00Z', reviewed_by: 'Finance Keo' })
      return row
    },
    academic_admin_revoke_entitlement: (args) => {
      const grant = state.grants.find(g => g.id === args.p_grant_id)
      Object.assign(grant, { revoked_at: '2026-10-26T06:00:00Z', revoked_by: 'Finance Keo', revoke_reason: args.p_reason, active: false })
      return grant
    },
    // Scan quality (ADMIN-008, migration 140).
    academic_admin_ocr_quality: (args) => ({
      days: args.p_days ?? 30,
      daily: [
        { day: '2026-10-25', model_id: 'qwen3-vl-plus', prompt_version: 'ocr_extract.v1.0', jobs: 14, failed: 3, abandoned: 1, confirmed: 9, latency_p50_ms: 11200, latency_p95_ms: 24800, cost_usd: 0.0412 },
        { day: '2026-10-24', model_id: 'qwen3-vl-plus', prompt_version: 'ocr_extract.v1.0', jobs: 8, failed: 1, abandoned: 0, confirmed: 7, latency_p50_ms: 9800, latency_p95_ms: 19000, cost_usd: 0.0233 },
      ],
      errors: [{ error_code: 'timeout', count: 3 }, { error_code: 'schema_invalid', count: 1 }],
      subjects: [{ subject_code: 'MATH', fields: 16, edited: 4, correction_rate: 0.25 }, { subject_code: 'LAO', fields: 16, edited: 1, correction_rate: 0.063 }],
      last_7_days: { jobs: 22, failed: 4, fields: 32, edited: 5, failure_rate: 0.182, correction_rate: 0.156, alerts: ['correction_rate'],
        thresholds: { correction_rate: 0.15, failure_rate: 0.2, min_fields: 20, min_jobs: 10 } },
    }),
    academic_admin_list_pilot: () => state.pilot,
    academic_admin_save_pilot_cohort: (args) => {
      const input = args.p_input
      if (input.id) Object.assign(state.pilot.cohorts.find(c => c.id === input.id), input)
      else state.pilot.cohorts.push({ id: `pc${state.pilot.cohorts.length + 1}`, code: 'K7MQ2X', school_name: null, created_at: '2026-10-25T05:00:00Z', students: 0, active: true, ...input })
      return state.pilot
    },
    academic_admin_set_pilot_mode: (args) => { state.pilot.pilot_mode = args.p_enabled; return state.pilot },
    academic_admin_list_quiz_bank: (args) => (args.p_filter?.status ? { ...state.quiz, items: state.quiz.items.filter(item => item.status === args.p_filter.status) } : state.quiz),
    academic_admin_list_diagnostics: () => state.diagnostics,
    academic_admin_list_content: () => state.content,
    academic_admin_content_gaps: () => [{ rule_id: 'R3', subject_code: 'MATH', grade_code: 'G11', topic_id: 't1', topic_name: 'Algebra', students: 4, last_seen: '2026-10-25' }],
    academic_admin_search_external_content: (args) => (args.p_kind === 'practice_set'
      ? [{ id: 't1', title_en: 'Algebra', title_lo: 'ພຶດຊະຄະນິດ', detail: 'MATH · G11', available: true, tagged: state.content.some(c => c.external_id === 't1') }]
      : [{ id: 'l1', title_en: 'English tenses', title_lo: 'ການໃຊ້ Tense', detail: 'PUBLISHED', available: true, tagged: false }]),
    academic_admin_save_content: (args) => {
      const item = { id: `c${state.content.length + 1}`, published_at: null, external: { title_en: 'Algebra', title_lo: 'ພຶດຊະຄະນິດ', available: true, route: '/academy/scores/practice/t1', membership: false }, subject_codes: ['MATH'], topic_names: ['Algebra'], ...args.p_input }
      state.content.push(item)
      return item
    },
    academic_support_list_reports: (args) => state.reports.filter(r => (args.p_status ? args.p_status === 'all' || r.status === args.p_status : r.status !== 'resolved')),
    academic_support_update_report: (args) => {
      const report = state.reports.find(r => r.id === args.p_report_id)
      Object.assign(report, { status: args.p_status, overdue: false, responded_at: report.responded_at ?? '2026-10-25T06:00:00Z', resolution_note: args.p_note ?? report.resolution_note })
      return { id: report.id, status: report.status }
    },
    academic_admin_save_diagnostic: (args) => {
      state.diagnostics.diagnostics.push({ id: `dg${state.diagnostics.diagnostics.length + 1}`, subject_code: 'MATH', grade_code: 'G11', status: 'draft', published_at: null, problems: { items: 'Use 10 to 15 items' }, attempts: 0, completed: 0, ...args.p_input })
      return state.diagnostics
    },
    academic_admin_set_diagnostic_status: (args) => {
      Object.assign(state.diagnostics.diagnostics.find(d => d.id === args.p_diagnostic_id), { status: args.p_action === 'publish' ? 'published' : 'retired', published_at: '2026-10-25T07:00:00Z' })
      return state.diagnostics
    },
    academic_admin_save_quiz_item: (args) => {
      const item = quizItem({ ...args.p_input, id: args.p_input.id ?? `q${state.quiz.items.length + 1}`, status: 'draft', author_name: 'Admin Me', problems: {} })
      state.quiz.items = [item, ...state.quiz.items.filter(other => other.id !== item.id)]
      return item
    },
    academic_admin_review_quiz_item: (args) => {
      const item = state.quiz.items.find(other => other.id === args.p_item_id)
      const next = { submit: 'in_review', approve: 'approved', return: 'draft', retire: 'retired' }[args.p_action]
      Object.assign(item, { status: next, can_approve: false, review_note: args.p_note, reviewer_name: args.p_action === 'submit' ? item.reviewer_name : 'Admin Me', live_version: next === 'approved' ? item.item_version : item.live_version })
      return item
    },
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

    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      if (method === 'POST') {
        state.signed = [...(state.signed ?? []), url.pathname]
        return json({ signedURL: `${url.pathname.replace('/storage/v1', '')}?token=t` })
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: '' })
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
    await page.getByLabel('Aliases for Mathematics').click()
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
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    // allInnerTexts() does not wait: let the menu dialog open first.
    await page.getByRole('dialog', { name: 'Schooling admin sections' }).waitFor()
    const tabs = await page.getByRole('navigation', { name: 'Schooling admin sections' }).getByRole('button').allInnerTexts()
    assert.deepEqual(tabs.map(text => text.trim()), ['Support', 'Reports', 'Audit log'])
    await page.keyboard.press('Escape')
    await page.getByLabel('Member code or user ID').fill('BA-ACA-NOPE00')
    await page.getByRole('button', { name: 'Look up' }).click()
    await page.getByText('No Schooling account for that reference.').waitFor()
    await page.getByLabel('Member code or user ID').fill('BA-ACA-DAN9XY')
    await page.getByRole('button', { name: 'Look up' }).click()
    await page.getByRole('heading', { name: 'Member DAN9XY' }).waitFor()
    assert.equal(await page.getByText('7.5').count(), 0)
    // PARENT-008: support suspends a disputed guardian link; only an admin can reinstate it.
    const guardians = page.locator('section', { has: page.getByRole('heading', { name: 'Guardian links' }) })
    await guardians.getByText('Mrs Phonsavan').waitFor()
    await guardians.getByRole('button', { name: 'Suspend' }).click()
    await page.getByRole('dialog').getByRole('combobox').selectOption('not_guardian')
    await page.getByRole('dialog').getByLabel('Reason (saved in the audit log)').fill('Student says this is not her mother')
    await page.getByRole('dialog').getByRole('button', { name: 'Suspend' }).click()
    await page.getByText('Link suspended. The guardian has lost access.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_support_suspend_guardian_link').args, { p_link_id: 'gl1', p_reason: 'not_guardian', p_note: 'Student says this is not her mother' })
    assert.equal(await guardians.getByRole('button', { name: 'Reinstate' }).count(), 0, 'support cannot reinstate')
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
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await page.getByRole('button', { name: 'Audit log' }).click()
    await page.getByRole('heading', { name: 'Audit log' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Export CSV' }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Alerts to review' }).count(), 0)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Support (Operations): support, reports and audit tabs only, lookup without scores, emergency access needs 10+ char reason, 30-min countdown, no CSV export or alerts')
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

  // Careers (ADMIN-010, UNI-001/002/004): seeded records approved by another admin, own edits need a second admin,
  // a cut-off needs its academic year, institutions show their official source, review-by dates listed.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=careers`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Career catalogue' }).waitFor()
    await page.getByText('Bachelor of Nursing Science').first().waitFor()
    const nurse = page.locator('li', { hasText: 'registered-nurse' })
    await nurse.getByText('No sourced facts: salary and demand stay hidden in personalised views (OD-10).').waitFor()
    await nurse.getByRole('button', { name: 'Approve' }).click()
    await page.getByText('Approved. Students now see this version.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_review_career_content').args, { p_id: 'k1', p_action: 'approve', p_note: null })
    const own = page.locator('li', { hasText: 'pharmacist' })
    assert.equal(await own.getByRole('button', { name: 'Approve' }).isDisabled(), true)
    await own.getByText('You wrote or edited this version, so another admin must approve it.').waitFor()
    await page.getByRole('tab', { name: 'Institutions' }).click()
    const uhs = page.locator('li', { hasText: 'University of Health Sciences' })
    await uhs.getByText('6 faculties', { exact: false }).waitFor()
    assert.equal(await uhs.getByRole('link', { name: 'University of Health Sciences official website' }).getAttribute('href'), 'https://uhs.edu.la/')
    await page.getByRole('tab', { name: 'Scholarships' }).click()
    await page.getByRole('button', { name: 'New scholarship' }).waitFor()
    await page.getByRole('tab', { name: 'Programmes' }).click()
    // Migration 159: a pre-filled length is marked not confirmed until an admin ticks it.
    const computing = page.locator('li', { hasText: 'Computer Science' })
    await computing.getByText('4 years (not confirmed)', { exact: false }).waitFor()
    await computing.getByRole('button', { name: 'Edit' }).click()
    const lengthDialog = page.getByRole('dialog')
    await lengthDialog.getByLabel('Length confirmed with the faculty', { exact: false }).check()
    await lengthDialog.getByRole('button', { name: 'Save working copy' }).click()
    await lengthDialog.waitFor({ state: 'hidden' })
    assert.equal(lastCall(mock, 'academic_admin_save_career_content').args.p_input.data.duration_unconfirmed, false)
    await page.getByRole('button', { name: 'New programme' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Programme name (English)').fill('Bachelor of Pharmacy')
    await dialog.getByLabel('Programme name (Lao)').fill('ປະລິນຍາຕີ ເພສັດສາດ')
    await dialog.getByLabel('Pharmacist').check()
    await dialog.getByRole('button', { name: 'Add' }).click()
    await dialog.getByLabel('Kind').selectOption('cutoff')
    await dialog.getByRole('button', { name: 'Save working copy' }).click()
    await page.getByText('requirements.1:', { exact: false }).waitFor()
    await page.getByText('Add the academic year it applies to').waitFor()
    const saved = lastCall(mock, 'academic_admin_save_career_content').args.p_input
    assert.deepEqual([saved.kind, saved.data.institution, saved.data.careers, saved.data.requirements[0].kind], ['programme', 'uhs', ['pharmacist'], 'cutoff'])
    await page.getByText('programme · review by 2026-11-15').waitFor()
    await shot(page, 'admin-14-careers')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    const ops = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await ops.page.goto(`${base}/academy-admin/scores?tab=careers`, { waitUntil: 'domcontentloaded' })
    await ops.page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    assert.equal(await ops.page.getByRole('button', { name: 'Careers' }).count(), 0)
    await ops.context.close()
    pass('Careers: seeded record approved by another admin, own edit needs a second admin, institution shows its official source and faculties, a cut-off without its year is refused with the reason, a pre-filled length confirmed by ticking, review-by dates listed, axe clean; Operations has no tab')
  }

  // AI review (ADMIN-009): reported answers, unsafe first; text only when shared; rubric saved.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=ai`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Coach answers to review' }).waitFor()
    await page.getByText('Question: Why did my maths fall?', { exact: false }).waitFor()
    await page.getByText('The student did not share the text.', { exact: false }).waitFor()
    const first = page.locator('li', { hasText: 'Why did my maths fall?' })
    await first.getByText('Priority').waitFor()
    // Weekly random sample from consenting students (migration 146), after the reports.
    await page.getByText('Weekly sample for the week of 19 Oct 2026: 1 answers.', { exact: false }).waitFor()
    const sampled = page.locator('li', { hasText: 'How is my physics?' })
    await sampled.getByText('Weekly sample').waitFor()
    assert.ok((await page.locator('li', { hasText: 'Question:' }).allTextContents()).at(-1).includes('How is my physics?'), 'samples come after reports')
    // Review results by prompt version and model feed the release check (AI-010).
    await page.getByRole('heading', { name: 'Review results by prompt version' }).waitFor()
    await page.getByRole('cell', { name: '3.8', exact: true }).waitFor()
    await first.getByLabel('Accuracy').selectOption('5')
    await first.getByLabel('Lao quality').selectOption('4')
    await first.getByLabel('Safety').selectOption('5')
    await first.getByLabel('Note').fill('Numbers right; tone fine')
    await first.getByRole('button', { name: 'Save review' }).click()
    await page.getByText('Review saved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_rate_ai').args, { p_feedback_id: 'fb1', p_input: { accuracy: 5, lao: 4, safety: 5, note: 'Numbers right; tone fine' } })
    await shot(page, 'admin-13-ai-review')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    const ops = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await ops.page.goto(`${base}/academy-admin/scores?tab=ai`, { waitUntil: 'domcontentloaded' })
    await ops.page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    assert.equal(await ops.page.getByRole('button', { name: 'AI review' }).count(), 0)
    await ops.context.close()
    pass('AI review: reported answers with unsafe first, then the weekly sample, text only when shared, review results by prompt version, prompt version and model shown, rubric (accuracy, Lao, safety) saved, axe clean; Operations has no tab')
  }

  // Scan quality (ADMIN-008): 7-day rates with alerts, daily rows by model, corrections by subject, admin only.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=scans`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('alert').getByText('Students corrected more than 15.0% of values in the last 7 days.').waitFor()
    await page.getByText('15.6%').waitFor()
    await page.getByText('18.2%').waitFor()
    const daily = page.locator('section', { has: page.getByRole('heading', { name: 'By day and model' }) })
    const firstRow = await daily.locator('tbody tr').first().evaluate(row => [...row.cells].map(cell => cell.textContent))
    assert.deepEqual(firstRow, ['2026-10-25', 'qwen3-vl-plus', 'ocr_extract.v1.0', '14', '3', '1', '9', '11.2 s', '24.8 s', '0.0412'])
    const subjects = page.locator('section', { has: page.getByRole('heading', { name: 'Corrections by subject' }) })
    await subjects.getByText('25.0%').waitFor()
    await shot(page, 'admin-11-scan-quality')
    await axe(page)
    await daily.getByLabel('Period').selectOption('7')
    await page.waitForTimeout(300)
    assert.deepEqual(lastCall(mock, 'academic_admin_ocr_quality').args, { p_days: 7 })
    assert.deepEqual(errors, [])
    await context.close()
    const ops = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await ops.page.goto(`${base}/academy-admin/scores?tab=scans`, { waitUntil: 'domcontentloaded' })
    await ops.page.getByRole('heading', { name: 'Support lookup' }).waitFor()
    assert.equal(await ops.page.getByRole('button', { name: 'Scan quality' }).count(), 0)
    await ops.context.close()
    pass('Scan quality: 7-day failure and correction rates with the alert, daily rows by model and prompt, corrections by subject, period switch, axe clean; Operations has no tab')
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

  // Quiz items (ADMIN-007, QUIZ-005): approve another admin's item, not your own; return with a note; new item payload.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=quiz`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('cell', { name: /ພຶດຊະຄະນິດ/ }).waitFor()
    await page.getByRole('button', { name: 'In review (2)' }).click()
    const card = (text) => page.locator('li', { hasText: text }).filter({ has: page.getByRole('button') }).first()

    const theirs = card('If x + 2 = 5, what is x?')
    assert.match(await theirs.innerText(), /B\.\s*3\s*Correct/, 'correct answer marked with text, not colour only')
    await theirs.getByRole('button', { name: 'Approve' }).click()
    await page.getByText('Approved. Students can now get this item.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_review_quiz_item').args, { p_item_id: 'q1', p_action: 'approve', p_note: null })

    const mine = card('ຖ້າ 2x = 8')
    assert.equal(await mine.getByRole('button', { name: 'Approve' }).isDisabled(), true, 'authors cannot approve their own version')
    await mine.getByText('another admin must approve it').waitFor()
    await mine.getByRole('button', { name: 'Return to author' }).click()
    const confirm = page.getByRole('button', { name: 'Return', exact: true })
    assert.equal(await confirm.isDisabled(), true, 'a note is required')
    await page.getByLabel('Reason (saved in the audit log)').fill('Add the English question')
    await confirm.click()
    await page.getByText('Returned to draft.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_review_quiz_item').args, { p_item_id: 'q2', p_action: 'return', p_note: 'Add the English question' })

    await page.getByRole('button', { name: /^Draft \(/ }).click()
    const incomplete = card('x − 1 = 3')
    assert.equal(await incomplete.getByRole('button', { name: 'Send for review' }).isDisabled(), true)
    await incomplete.getByText('Lao explanation:').waitFor()

    await page.getByRole('button', { name: 'New item' }).click()
    await page.getByLabel('Question (Lao)').fill('3 × 4 ເທົ່າກັບເທົ່າໃດ?')
    for (const [key, text] of [['A', '7'], ['B', '12'], ['C', '34'], ['D', '1']]) await page.getByLabel(`Option ${key} (Lao)`).fill(text)
    await page.getByLabel('B is correct').check()
    await page.getByRole('button', { name: 'Remove option D' }).click()
    await page.getByLabel(/^Explanation \(Lao\)/).fill('3 ບວກກັນ 4 ເທື່ອ ໄດ້ 12.')
    await page.getByRole('button', { name: 'Save draft' }).click()
    await page.getByText('Saved as a draft.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_save_quiz_item').args.p_input, {
      topic_id: 't1', stem_lo: '3 × 4 ເທົ່າກັບເທົ່າໃດ?', stem_en: null,
      options: [{ key: 'A', text_lo: '7' }, { key: 'B', text_lo: '12' }, { key: 'C', text_lo: '34' }], correct_key: 'B',
      explanation_lo: '3 ບວກກັນ 4 ເທື່ອ ໄດ້ 12.', explanation_en: null, explanation_origin: 'human', licence: 'original', source: null,
    })
    await page.getByRole('button', { name: /^All \(/ }).click()
    await shot(page, 'admin-12-quiz-items')

    // Diagnostics: publish a ready draft; a new one lists approved items of its subject and grade only.
    const diagnostics = page.locator('section', { has: page.getByRole('heading', { name: 'Diagnostics' }) })
    await diagnostics.getByText('Grade 11 Mathematics check').waitFor()
    await diagnostics.getByRole('button', { name: 'Publish' }).click()
    await page.getByText('Published. Students who need it will see it.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_set_diagnostic_status').args, { p_diagnostic_id: 'dg1', p_action: 'publish', p_note: null })
    await diagnostics.getByRole('button', { name: 'New diagnostic' }).click()
    await diagnostics.getByLabel('Grade').selectOption({ label: 'Grade 11' })
    await diagnostics.getByLabel('Title (Lao)').fill('ກວດພຶດຊະຄະນິດ')
    await diagnostics.getByLabel('Title (English)').fill('Algebra check')
    const choices = diagnostics.getByRole('checkbox')
    assert.equal(await choices.count(), 1, 'only the approved Grade 11 Mathematics item is offered')
    await choices.first().check()
    await diagnostics.getByRole('button', { name: 'Save draft' }).click()
    await page.getByText('Diagnostic saved as a draft.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_save_diagnostic').args.p_input, { subject_id: 's-math', grade_id: 'g11', title_lo: 'ກວດພຶດຊະຄະນິດ', title_en: 'Algebra check', item_ids: ['q1'], parallel_of: null })
    const draftCard = diagnostics.locator('li', { hasText: 'Algebra check' })
    assert.equal(await draftCard.getByRole('button', { name: 'Publish' }).isDisabled(), true, 'an incomplete diagnostic cannot be published')
    await draftCard.getByText('Use 10 to 15 items').waitFor()
    await shot(page, 'admin-13-diagnostics')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Quiz items: another admin\'s item approved, own item cannot be approved, returned with a note, incomplete draft blocked, new item saved with exact payload; diagnostic published, new diagnostic offers only approved items of its subject and grade')
  }

  // Content catalogue (LEARN-004): a practice set tagged with subject, topic and level.
  {
    const { context, page, mock, errors } = await openAs(browser, { aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=content`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Nothing catalogued yet.').waitFor()
    // LEARN-003: gaps for the content team, as student counts.
    assert.match((await page.locator('section', { has: page.getByRole('heading', { name: 'Content gaps' }) }).locator('tbody tr').innerText()).replace(/\s+/g, ' '),
      /MATH · G11 Algebra Foundation practice \(difficulty 1\) 4 2026-10-25/)
    await page.getByRole('button', { name: 'Add content' }).click()
    await page.getByRole('radio', { name: /Algebra · ພຶດຊະຄະນິດ/ }).check()
    await page.getByRole('checkbox', { name: 'MATH · Mathematics' }).check()
    assert.equal(await page.getByRole('checkbox', { name: 'MATH G11 · Algebra' }).isChecked(), true, 'a practice set is tagged with its own topic')
    await page.getByLabel('Minutes').fill('8')
    await page.getByLabel(/^Status/).selectOption('published')
    await page.getByLabel('Learning objectives (English, one per line)').fill('Solve linear equations\n\nCheck a solution')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText('Content saved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_save_content').args.p_input, {
      kind: 'practice_set', external_id: 't1', subject_ids: ['s-math'], grade_min: 10, grade_max: 12, topic_ids: ['t1'], difficulty: 2, language: 'lo',
      est_minutes: 8, objectives_lo: [], objectives_en: ['Solve linear equations', 'Check a solution'], quality_score: null, status: 'published',
    })
    await page.getByRole('cell', { name: /Practice set · LO · 8 min/ }).waitFor()
    await shot(page, 'admin-15-content')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Content: practice set picked from existing topics, tagged with subject, topic, level and objectives, exact payload, listed')
  }

  // Problem reports (PRIV-008), as Operations: priority and overdue first, start, resolve with a note.
  {
    const { context, page, mock, errors } = await openAs(browser, { role: 'OPERATIONS', aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores?tab=reports`, { waitUntil: 'domcontentloaded' })
    const first = page.locator('li', { hasText: 'Someone I do not know is linked as my parent.' })
    await first.waitFor()
    assert.match(await first.innerText(), /Priority\s+Open\s+Overdue\s+Wrong guardian link\s+from DAN9XY/i)
    await first.getByRole('button', { name: 'Start' }).click()
    await page.getByText('Marked in progress.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_support_update_report').args, { p_report_id: 'pr1', p_status: 'in_progress', p_note: null })
    const second = page.locator('li', { hasText: 'The chart is hard to read' })
    await second.getByRole('button', { name: 'Resolve' }).click()
    const confirm = page.getByRole('button', { name: 'Resolve', exact: true }).last()
    await page.getByLabel('Reason (saved in the audit log)').fill('Explained the table view.')
    await confirm.click()
    await page.getByText('Report resolved.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_support_update_report').args, { p_report_id: 'pr2', p_status: 'resolved', p_note: 'Explained the table view.' })
    await page.getByRole('button', { name: 'Resolved', exact: true }).click()
    await page.getByText('Resolved: Explained the table view.').waitFor()
    await shot(page, 'admin-14-reports')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    pass('Reports (Operations): priority and overdue shown, started, resolved with a note, resolved filter')
  }

  // Finance: Entitlements only (BILLING-007); phone width has no horizontal scroll.
  {
    const { context, page, mock, errors } = await openAs(browser, { role: 'FINANCE', aal: 'aal2', factors: VERIFIED })
    await page.goto(`${base}/academy-admin/scores`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Entitlements', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Support' }).count(), 0, 'Finance sees no support tools')
    await page.getByLabel('Member code').fill('NOPE11')
    await page.getByRole('button', { name: 'Find' }).click()
    await page.getByText('No member with that code.').waitFor()
    await page.getByLabel('Member code').fill('dan9xy')
    await page.getByRole('button', { name: 'Find' }).click()
    await page.getByRole('heading', { name: 'Noy Student · DAN9XY' }).waitFor()
    await page.getByText('Locks off: all features open').waitFor()
    await page.getByText('2/10 this month').waitFor()
    const grantPanel = page.locator('section', { has: page.getByRole('heading', { name: 'Grant access' }) })
    await grantPanel.getByLabel('Payment reference (required)').fill('BCEL-778812')
    await grantPanel.getByLabel('Amount (LAK)').fill('39000')
    await grantPanel.getByRole('button', { name: 'Grant' }).click()
    await page.getByText('Granted. It starts now.').waitFor()
    const granted = lastCall(mock, 'academic_admin_grant_entitlement').args
    assert.deepEqual([granted.p_user_id, granted.p_input.feature_code, granted.p_input.reason_code, granted.p_input.reference, granted.p_input.amount_lak, granted.p_input.ends_at.endsWith("T23:59:59+07:00")],
      ['u-noy', 'premium', 'bank_transfer_confirmed', 'BCEL-778812', 39000, true])
    await page.getByText(/^Premium \(manual grant\) until /).waitFor()
    await shot(page, 'admin-12-entitlements')
    await axe(page)
    await page.getByRole('button', { name: 'Revoke' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revoke grant' })
    await dialog.getByLabel('Reason (saved in the audit log)').fill('Payment reversed by the bank')
    await dialog.getByRole('button', { name: 'Revoke' }).click()
    await page.getByText('Grant revoked.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_revoke_entitlement').args, { p_grant_id: 'g1', p_reason: 'Payment reversed by the bank' })
    await page.getByText('Finance Keo: Payment reversed by the bank').waitFor()
    // BILLING-004: career report payments, receipt opened by a short signed link, verified with the bank reference or rejected with a reason.
    const payments = page.locator('section', { has: page.getByRole('heading', { name: 'Career report payments' }) })
    const noy = payments.locator('li', { hasText: 'Noy Student' })
    await noy.getByText('49,000 kip').waitFor()
    await noy.getByRole('button', { name: 'Open receipt' }).click()
    await page.waitForTimeout(300)
    assert.ok(mock.state.signed?.some(path => path.endsWith('/premium-payment-proofs/u-noy/report-rp1-1761534000000.png')), 'signed link asked for the receipt')
    await noy.getByRole('button', { name: 'Verify' }).click()
    const verify = page.getByRole('dialog', { name: 'Verify this payment?' })
    await verify.getByLabel('Reason (saved in the audit log)').fill('BCEL-990011')
    await verify.getByRole('button', { name: 'Verify' }).click()
    await page.getByText('Verified. The report is available for 12 months.').waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_review_report_purchase').args, { p_purchase_id: 'rp1', p_action: 'verify', p_reference: 'BCEL-990011', p_reason: null })
    await payments.locator('li', { hasText: 'Kham Parent' }).getByRole('button', { name: 'Reject' }).click()
    const reject = page.getByRole('dialog', { name: 'Reject this payment?' })
    await reject.getByLabel('Reason (saved in the audit log)').fill('The amount on the receipt is 4,900 kip')
    await reject.getByRole('button', { name: 'Reject' }).click()
    await page.getByText('Rejected.', { exact: true }).waitFor()
    assert.deepEqual(lastCall(mock, 'academic_admin_review_report_purchase').args, { p_purchase_id: 'rp2', p_action: 'reject', p_reference: null, p_reason: 'The amount on the receipt is 4,900 kip' })
    await payments.getByText('Nothing here.').waitFor()
    await payments.getByLabel('Show').selectOption('verified')
    await payments.getByText('Reference BCEL-990011', { exact: false }).waitFor()
    await shot(page, 'admin-12b-report-payments')
    await axe(page)
    assert.deepEqual(errors, [])
    await context.close()
    const phone = await openAs(browser, { aal: 'aal2', factors: VERIFIED }, devices['Pixel 7'])
    await phone.page.goto(`${base}/academy-admin/scores?tab=schools`, { waitUntil: 'domcontentloaded' })
    await phone.page.getByText('ໂຮງຮຽນ ບ້ານໜອງໄຮ').waitFor()
    assert.equal(await phone.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await shot(phone.page, 'admin-8-schools-phone')
    assert.deepEqual(phone.errors, [])
    await phone.context.close()
    pass('Finance: Entitlements tab only; unknown code explained; member plan and quotas shown; Premium granted from a confirmed transfer with reference and amount, ends end of day Vientiane; revoked with a reason; career report payments: receipt by signed link, verified with the bank reference, rejected with a reason; axe clean; phone width: no horizontal scroll')
  }

  console.log(`\n${results.length} scenarios passed`)
} finally {
  await browser.close()
}
