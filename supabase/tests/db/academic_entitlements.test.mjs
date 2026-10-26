// Entitlements and quotas (P3-BIL #51): Academy Premium resolution, the
// enforcement switch, manual grants with reason codes, atomic monthly quotas.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, rpcError, one } = apiFor(db)
const [FREE, PREM, LAPSED, FIN, OPS, ADM] = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
const STAFF = { aal: 'aal2' }
await ok(db, 'users', `insert into public.users (id, name, role, member_code) values
  ('${FREE}', 'Free', 'CUSTOMER', 'FREE01'), ('${PREM}', 'Prem', 'CUSTOMER', 'PREM01'), ('${LAPSED}', 'Lapsed', 'CUSTOMER', 'LAPS01'),
  ('${FIN}', 'Finance', 'FINANCE', null), ('${OPS}', 'Ops', 'OPERATIONS', null), ('${ADM}', 'Admin', 'ADMIN', null)`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 1000, "seconds": 60}, "write": {"limit": 1000, "seconds": 60}}' where key = 'rate_limits';`)
await ok(db, 'memberships', `
  insert into premium_subscriptions (user_id, plan_id, status, ends_at) values
    ('${FREE}', (select id from premium_plans where slug = 'free'), 'ACTIVE', null),
    ('${PREM}', (select id from premium_plans where slug = 'premium-monthly'), 'ACTIVE', now() + interval '10 days'),
    ('${LAPSED}', (select id from premium_plans where slug = 'premium-monthly'), 'ACTIVE', now() - interval '1 hour')`)
const mine = (user) => rpc(user, `public.academic_my_entitlements()`)
const feature = async (user, code) => (await mine(user)).features[code]

// ─── Academy Premium (BILLING-002) ───────────────────────────────────────────

const free = await mine(FREE)
eq('the Free plan is the free tier', [free.tier, free.premium.active, free.enforced], ['free', false, false])
eq('free quotas: 10 scans, 10 coach messages', [free.features.ocr_upload.quota, free.features.coach_academic.quota.limit], [{ limit: 10, used: 0, remaining: 10 }, 10])
eq('not enforced yet: premium features stay open, as today', [free.features.advanced_analysis.enabled, free.features.advanced_analysis.source], [true, 'open'])
eq('until enforced, even features no tier includes are open', free.features.career_report.source, 'open')
const prem = await mine(PREM)
eq('paid and running: premium tier until the membership ends', [prem.tier, prem.premium.source, prem.premium.until === (await one(`select to_jsonb(ends_at) as v from premium_subscriptions where user_id = '${PREM}'`)).v], ['premium', 'academy_premium', true])
eq('premium features come from Academy Premium with its end date', [prem.features.advanced_analysis.source, prem.features.advanced_analysis.until === prem.premium.until], ['academy_premium', true])
eq('premium quota is the higher limit', prem.features.ocr_upload.quota.limit, 20)
eq('past ends_at: free tier at once, even before the downgrade job runs', (await mine(LAPSED)).tier, 'free')
eq('quota month is Vientiane time; resets on the 1st at 00:00 there (17:00 UTC the day before)', [/^\d{4}-\d{2}$/.test(free.period_key), new Date(free.resets_at).getUTCHours(), new Date(new Date(free.resets_at).getTime() + 7 * 3600_000).getUTCDate()], [true, 17, 1])

// ─── Enforcement (PRD §30.4, BILLING-006) ────────────────────────────────────

await ok(db, 'enforce', `update academic_settings set value = 'true' where key = 'entitlements_enforced'`)
eq('enforced: a free member is locked out of premium features', [(await feature(FREE, 'advanced_analysis')).enabled, (await feature(FREE, 'advanced_analysis')).source], [false, null])
eq('enforced: free features stay', (await feature(FREE, 'ocr_upload')).enabled, true)
eq('enforced: Premium keeps everything premium', (await feature(PREM, 'diagnostic_unlimited')).enabled, true)
eq('a locked feature answers 403 ENTITLEMENT_REQUIRED naming the feature', await (async () => {
  try { await one(`select public.academic_require_feature('${FREE}', 'advanced_analysis')`); return null } catch (e) { return e.message }
})(), 'ENTITLEMENT_REQUIRED')
await ok(db, 'plan change is configuration only (BILLING-001)', `update academic_settings set value = jsonb_set(value, '{advanced_analysis,free}', 'true') where key = 'entitlement_features'`)
eq('moving a feature to Free opens it without code changes', (await feature(FREE, 'advanced_analysis')).source, 'free')
await ok(db, 'back to premium', `update academic_settings set value = jsonb_set(value, '{advanced_analysis,free}', 'false') where key = 'entitlement_features'`)

// ─── Manual grants (BILLING-007) ─────────────────────────────────────────────

const grant = (user, input, as = FIN) => rpc(as, `public.academic_admin_grant_entitlement('${user}', ${json(input)})`, STAFF)
const grantError = async (input, as = FIN) => (await rpcError(as, `public.academic_admin_grant_entitlement('${FREE}', ${json(input)})`, STAFF))
const in30 = new Date(Date.now() + 30 * 86400_000).toISOString()
eq('students cannot grant', (await rpcError(FREE, `public.academic_admin_grant_entitlement('${FREE}', '{}')`, STAFF))?.code, 'FORBIDDEN_ROLE')
eq('operations cannot grant', (await grantError({}, OPS))?.code, 'FORBIDDEN_ROLE')
eq('an authenticator session is required', (await rpcError(FIN, `public.academic_admin_grant_entitlement('${FREE}', '{}')`))?.code, 'MFA_REQUIRED')
eq('unknown feature refused', (await grantError({ feature_code: 'everything', reason_code: 'pilot', ends_at: in30 }))?.details?.field, 'feature_code')
eq('a reason code is required', (await grantError({ feature_code: 'premium', ends_at: in30 }))?.details?.field, 'reason_code')
eq('at most two years', (await grantError({ feature_code: 'premium', reason_code: 'pilot', ends_at: '2031-01-01T00:00:00Z' }))?.details?.field, 'ends_at')
eq('a confirmed transfer needs its payment reference', (await grantError({ feature_code: 'premium', reason_code: 'bank_transfer_confirmed', ends_at: in30 }))?.details?.field, 'reference')
const lookup = await rpc(FIN, `public.academic_admin_member_entitlements('free01')`, STAFF)
eq('finance finds a member by code with plan and entitlements', [lookup.user.id, lookup.subscriptions[0].plan, lookup.entitlements.tier, lookup.grants], [FREE, 'Free', 'free', []])
eq('unknown member code', (await rpcError(FIN, `public.academic_admin_member_entitlements('NOPE99')`, STAFF))?.code, 'NOT_FOUND')

const single = await grant(FREE, { feature_code: 'diagnostic_unlimited', source: 'trial', reason_code: 'pilot', ends_at: in30, note: 'Pilot class' })
eq('a single feature granted', [single.active, single.granted_by, (await feature(FREE, 'diagnostic_unlimited')).source, (await feature(FREE, 'advanced_analysis')).enabled], [true, 'Finance', 'manual_grant', false])
const before = (await one(`select now() as v`)).v
const transfer = await grant(FREE, { feature_code: 'premium', reason_code: 'bank_transfer_confirmed', reference: 'BCEL-778812', amount_lak: 39000, ends_at: in30 })
eq('a confirmed transfer starts at confirmation and is recorded with its reference and amount', [new Date(transfer.starts_at) >= new Date(before), transfer.reference, transfer.amount_lak], [true, 'BCEL-778812', 39000])
const granted = await mine(FREE)
eq('a premium grant gives the premium tier, features and quotas', [granted.tier, granted.premium.source, granted.features.advanced_analysis.source, granted.features.ocr_upload.quota.limit], ['premium', 'manual_grant', 'manual_grant', 20])
eq('grant and revoke are audited', (await one(`select count(*)::int as n from academic_audit_events where action = 'entitlement.grant'`)).n, 2)
eq('a revoke needs a reason', (await rpcError(FIN, `public.academic_admin_revoke_entitlement('${transfer.id}', 'no')`, STAFF))?.details?.field, 'reason')
const revoked = await rpc(FIN, `public.academic_admin_revoke_entitlement('${transfer.id}', 'Payment reversed by bank')`, STAFF)
eq('revoked: access ends at once, the record stays', [revoked.active, revoked.revoked_by, (await mine(FREE)).tier, (await rpc(FIN, `public.academic_admin_member_entitlements('FREE01')`, STAFF)).grants.length], [false, 'Finance', 'free', 2])
eq('revoking twice', (await rpcError(FIN, `public.academic_admin_revoke_entitlement('${transfer.id}', 'again please')`, STAFF))?.code, 'NOT_FOUND')
await ok(db, 'trial ended', `update academic_entitlement_grants set ends_at = now() - interval '1 second', starts_at = now() - interval '1 day' where id = '${single.id}'`)
eq('an ended grant gives nothing', (await feature(FREE, 'diagnostic_unlimited')).enabled, false)
eq('admins can grant too', (await grant(LAPSED, { feature_code: 'career_report', source: 'one_time_purchase', reason_code: 'one_time_purchase', reference: 'ORD-1', ends_at: in30 }, ADM)).feature_code, 'career_report')
eq('one-time purchase opens a feature no tier includes', (await feature(LAPSED, 'career_report')).enabled, true)

// ─── Quotas (BILLING-003) ────────────────────────────────────────────────────

const take = async (user, n = 1) => (await one(`select public.academic_consume_quota('${user}', 'coach_academic', ${n}) as v`)).v
eq('a quota is taken and reported', await take(FREE), { period_key: free.period_key, used: 1, limit: 10, remaining: 9 })
eq('more than what is left is refused, nothing taken', [await take(FREE, 10), (await feature(FREE, 'coach_academic')).quota.used], [null, 1])
for (let i = 0; i < 9; i++) await take(FREE)
eq('the last one is taken, then refused', [(await feature(FREE, 'coach_academic')).quota.remaining, await take(FREE)], [0, null])
await ok(db, 'refund', `select public.academic_refund_quota('${FREE}', 'coach_academic', '${free.period_key}')`)
eq('a refund makes one available again', (await feature(FREE, 'coach_academic')).quota.remaining, 1)
await ok(db, 'refund past zero', `select public.academic_refund_quota('${FREE}', 'coach_academic', '${free.period_key}', 50)`)
eq('refunds never go below zero', (await feature(FREE, 'coach_academic')).quota.used, 0)
await ok(db, 'last month', `insert into academic_usage_counters (user_id, feature_code, period_key, used) values ('${PREM}', 'coach_academic', '2020-01', 300)`)
eq("last month's use does not count this month", (await feature(PREM, 'coach_academic')).quota.used, 0)
eq('features without a quota cannot be taken', (await one(`select public.academic_consume_quota('${PREM}', 'advanced_analysis') as v`)).v, null)
eq('entitlement tables are hidden from users', (await rpcError(FREE, `(select count(*) from academic_entitlement_grants)`))?.status, '42501')

done()
