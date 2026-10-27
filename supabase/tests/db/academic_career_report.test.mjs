// Career report and its one-time purchase (P4-CAR #55, piece 4: CAREER-006,
// BILLING-004): Premium includes it; a purchase is verified by Finance and
// lasts 12 months; a guardian's purchase covers their child; the report is
// frozen and leaves out anything past its review-by date (UNI-002).
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json, period } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [S, B, G, FIN, OPS] = ['a1', 'b1', 'c1', 'd1', 'e1'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, member_code, role) values ('${S}', 'Noy', 'AAA111', 'CUSTOMER'), ('${B}', 'Kham', 'BBB222', 'CUSTOMER'),
  ('${G}', 'Mrs Phonsavan', 'GGG333', 'CUSTOMER'), ('${FIN}', 'Finance', 'FIN001', 'FINANCE'), ('${OPS}', 'Ops', 'OPS001', 'OPERATIONS')`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';
  update academic_settings set value = 'true' where key = 'entitlements_enforced';`)
await db.exec(`create or replace function public.academic_today() returns date language sql stable set search_path = '' as $$ select date '2026-11-18' $$`)
await ok(db, 'subjects', `insert into academic_subjects (id, code, name_lo, name_en, grade_min, grade_max, is_default)
  select gen_random_uuid(), c, c, c, 10, 12, false from unnest(array['ART', 'BIO', 'CHEM', 'CIV', 'ENG', 'GEO', 'HIST', 'ICT']) c`)
await ok(db, 'publish', `update academic_career_content set status = 'published', published = draft, published_review_by = review_by where kind in ('career', 'institution')`)

const profile = { display_name: 'Noy', age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }, { subject_id: ID.phys }] }
const s = await rpc(S, `public.academic_create_profile(${json(profile)})`)
await rpc(B, `public.academic_create_profile(${json(profile)})`)
const answers = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, [10, 11, 12, 22, 23].includes(i + 1) ? 3 : 1]))
for (const user of [S, B]) {
  await rpc(user, `public.academic_start_career_questionnaire()`)
  await rpc(user, `public.academic_save_career_answers(${json(answers)})`)
  await rpc(user, `public.academic_finish_career_questionnaire()`)
}
void s; void period

// ─── Without the feature ─────────────────────────────────────────────────────

eq('Free: no report', [(await rpc(S, `public.academic_career_reports()`)).entitled, (await rpcError(S, `public.academic_generate_career_report()`))?.code], [false, 'ENTITLEMENT_REQUIRED'])

// ─── One-time purchase (BILLING-004) ─────────────────────────────────────────

let mine = await rpc(S, `public.academic_start_report_purchase()`)
eq('a purchase at the set price', [mine.price.price_lak, mine.purchase.status, mine.purchase.amount_lak], [49000, 'pending', 49000])
const purchaseId = mine.purchase.id
eq('only one open purchase', (await rpc(S, `public.academic_start_report_purchase()`)).purchase.id, purchaseId)
eq("the receipt must be in the buyer's own folder", (await rpcError(S, `public.academic_submit_report_receipt('${purchaseId}', '${B}/r.jpg')`))?.details?.field, 'path')
mine = await rpc(S, `public.academic_submit_report_receipt('${purchaseId}', '${S}/report-1.jpg')`)
eq('receipt sent: waiting for review, Finance is alerted', [mine.purchase.status, (await one(`select count(*)::int as n from academic_alerts where kind = 'report_purchase'`)).n], ['review', 1])
eq('another user cannot touch it', await rpc(B, `public.academic_cancel_report_purchase('${purchaseId}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('Finance sees it with the buyer and receipt', (await rpc(FIN, `public.academic_admin_report_purchases('review')`, STAFF)).map((p) => [p.buyer.member_code, p.receipt_path]), [['AAA111', `${S}/report-1.jpg`]])
eq('students cannot review purchases', (await rpcError(S, `public.academic_admin_report_purchases('review')`))?.code, 'FORBIDDEN_ROLE')
eq('Operations cannot review purchases', (await rpcError(OPS, `public.academic_admin_review_report_purchase('${purchaseId}', 'verify', 'X-1')`, STAFF))?.code, 'FORBIDDEN_ROLE')
eq('verifying needs the bank reference', (await rpcError(FIN, `public.academic_admin_review_report_purchase('${purchaseId}', 'verify')`, STAFF))?.details?.field, 'reference')
await rpc(FIN, `public.academic_admin_review_report_purchase('${purchaseId}', 'verify', 'BCEL-778812')`, STAFF)
mine = await rpc(S, `public.academic_my_report_purchase()`)
eq('verified: the report for 12 months, with the reference on the grant', [mine.entitled, mine.purchase.status, mine.purchase.valid_until.slice(0, 7) >= '2027-10',
  (await one(`select source, feature_code, reference from academic_entitlement_grants where user_id = '${S}'`))], [true, 'verified', true, { source: 'one_time_purchase', feature_code: 'career_report', reference: 'BCEL-778812' }])
eq('the report also shows the career options', (await rpc(S, `public.academic_get_career_guidance()`)).options_locked, false)
eq('buying again while it lasts is refused', (await rpcError(S, `public.academic_start_report_purchase()`))?.code, 'REPORT_ALREADY_INCLUDED')

// ─── The report (CAREER-006, UNI-002) ────────────────────────────────────────

const firstSlug = (await rpc(S, `public.academic_get_career_guidance()`)).result.options[0].slug
await ok(db, 'programmes', `insert into academic_career_content (kind, slug, draft, published, status, review_by, published_review_by) select 'programme', x.slug, x.d, x.d, 'published', (x.d->>'review_by')::date, (x.d->>'review_by')::date from (values
  ('p-current', '{"institution": "uhs", "name_en": "Current programme", "name_lo": "ຫຼັກສູດ", "degree_level": "bachelor", "duration_years": "4", "careers": ["${firstSlug}"], "source_name": "UHS", "source_url": "https://uhs.edu.la/", "verified_on": "2026-10-26", "review_by": "2027-04-26",
     "requirements": [{"kind": "cutoff", "text_en": "70", "text_lo": "70", "academic_year": "2026-2027", "source_name": "UHS", "source_url": "https://uhs.edu.la/", "verified_on": "2026-10-26", "review_by": "2026-11-01"}]}'::jsonb),
  ('p-stale', '{"institution": "uhs", "name_en": "Stale programme", "name_lo": "ເກົ່າ", "degree_level": "bachelor", "duration_years": "4", "careers": ["${firstSlug}"], "source_name": "UHS", "source_url": "https://uhs.edu.la/", "verified_on": "2025-10-26", "review_by": "2026-10-01"}'::jsonb)
) as x(slug, d)`)
const report = await rpc(S, `public.academic_generate_career_report()`)
const first = report.content.options[0]
eq('the report holds interests, 3–6 options with reasons, history and scholarships', [Object.keys(report.content.interests).length, report.content.options.length >= 3 && report.content.options.length <= 6,
  !!first.factors.interest, report.content.history.length >= 1, Array.isArray(report.content.scholarships)], [6, true, true, true, true])
eq('pathways leave out anything past its review-by date', [first.programmes.map((p) => p.name_en), first.programmes[0].requirements.length], [['Current programme'], 0])
eq('it is listed and can be opened again, unchanged', [(await rpc(S, `public.academic_career_reports()`)).reports.length, (await rpc(S, `public.academic_get_career_report('${report.id}')`)).content.generated_at], [1, report.content.generated_at])
eq('nobody else can open it', await rpc(B, `public.academic_get_career_report('${report.id}')`), { error: { code: 'NOT_FOUND', status: 404 } })
eq('it is in "Download my data"', (await rpc(S, `public.academic_export_my_career_reports()`)).length, 1)

// ─── Premium includes it; a guardian's purchase covers the child ─────────────

eq('Kham has no report yet', (await rpc(B, `public.academic_career_reports()`)).entitled, false)
await ok(db, 'premium', `insert into premium_subscriptions (user_id, plan_id, status) select '${B}', id, 'ACTIVE' from premium_plans where price_lak > 0 limit 1`)
eq('Academy Premium includes the report', (await rpc(B, `public.academic_career_reports()`)).entitled, true)
await ok(db, 'cancel premium', `delete from premium_subscriptions where user_id = '${B}'`)
const link = await rpc(G, `public.academic_accept_guardian_invite('${(await rpc(B, `public.academic_create_guardian_invite()`)).code}', 'mother', true)`)
await rpc(B, `public.academic_confirm_guardian_link('${link.id}', true)`)
const dropped = (await rpc(G, `public.academic_start_report_purchase()`)).purchase.id
eq('the buyer can cancel before review', (await rpc(G, `public.academic_cancel_report_purchase('${dropped}')`)).purchase.status, 'cancelled')
let gp = (await rpc(G, `public.academic_start_report_purchase()`)).purchase.id
await rpc(G, `public.academic_submit_report_receipt('${gp}', '${G}/r.png')`)
eq('rejecting needs a reason', (await rpcError(FIN, `public.academic_admin_review_report_purchase('${gp}', 'reject', null, 'no')`, STAFF))?.details?.field, 'reason')
await rpc(FIN, `public.academic_admin_review_report_purchase('${gp}', 'reject', null, 'The amount is 4,900 kip')`, STAFF)
eq('a rejection shows its reason and the buyer can try again', [(await rpc(G, `public.academic_my_report_purchase()`)).purchase.rejection_reason, (await rpc(G, `public.academic_start_report_purchase()`)).purchase.status], ['The amount is 4,900 kip', 'pending'])
gp = (await rpc(G, `public.academic_my_report_purchase()`)).purchase.id
await rpc(G, `public.academic_submit_report_receipt('${gp}', '${G}/r2.png')`)
await rpc(FIN, `public.academic_admin_review_report_purchase('${gp}', 'verify', 'BCEL-900001')`, STAFF)
eq("a guardian's purchase gives their linked child the report", (await rpc(B, `public.academic_career_reports()`)).entitled, true)
// Guardians see the child's reports while career answers are shared (migration 158).
const childReport = await rpc(B, `public.academic_generate_career_report()`)
eq('not shared: the guardian sees no reports', await rpc(G, `public.academic_guardian_career_reports('${link.id}')`), { shared: false, reports: [] })
eq('not shared: the report cannot be opened', (await rpc(G, `public.academic_guardian_career_report('${childReport.id}')`)).error?.code, 'NOT_FOUND')
await rpc(B, `public.academic_set_guardian_scopes('${link.id}', ${json({ careers: true })})`)
eq('shared: listed for the guardian', (await rpc(G, `public.academic_guardian_career_reports('${link.id}')`)).reports.map((r) => r.id), [childReport.id])
const seen = await rpc(G, `public.academic_guardian_career_report('${childReport.id}')`)
eq('shared: the guardian opens it as made, and the view is logged', [seen.link_id, seen.content.generated_at,
  (await one(`select count(*)::int as n from academic_audit_events where action = 'guardian.career_report_view' and outcome = 'success'`)).n], [link.id, childReport.content.generated_at, 1])
eq("another child's report stays closed", (await rpc(G, `public.academic_guardian_career_report('${report.id}')`)).error?.code, 'NOT_FOUND')
eq('the student cannot use the guardian view', (await rpc(S, `public.academic_guardian_career_reports('${link.id}')`)).error?.code, 'NOT_FOUND')
await rpc(B, `public.academic_set_guardian_scopes('${link.id}', ${json({ careers: false })})`)
eq('sharing off hides it at once', (await rpc(G, `public.academic_guardian_career_report('${childReport.id}')`)).error?.code, 'NOT_FOUND')
await rpc(B, `public.academic_set_guardian_scopes('${link.id}', ${json({ careers: true })})`)
await rpc(G, `public.academic_guardian_remove_link('${link.id}')`)
eq('a removed link sees nothing', (await rpc(G, `public.academic_guardian_career_report('${childReport.id}')`)).error?.code, 'NOT_FOUND')
eq('when the link ends, so does the cover', (await rpc(B, `public.academic_career_reports()`)).entitled, false)

done()
