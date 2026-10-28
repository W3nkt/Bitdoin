// Family plan (P3-BIL #51: BILLING-005, migration 169): a guardian's family
// plan gives Schooling Premium to their first 3 actively linked children;
// removing a link frees its seat at once; the guardian has Academy Premium.
import { createDb, ok, eq, done, ACADEMIC_MIGRATIONS } from './harness.mjs'
import { CONFIG_SQL, ID, apiFor, json } from './fixtures.mjs'

const db = await createDb(ACADEMIC_MIGRATIONS)
const { rpc, one } = apiFor(db)
const G = '00000000-0000-0000-0000-0000000000c1'
const KIDS = ['a1', 'a2', 'a3', 'a4'].map((s) => `00000000-0000-0000-0000-0000000000${s}`)
await ok(db, 'users', `insert into public.users (id, name, role) values ('${G}', 'Mrs Phonsavan', 'CUSTOMER'), ${KIDS.map((k, i) => `('${k}', 'Kid ${i + 1}', 'CUSTOMER')`).join(', ')}`)
await ok(db, 'config', CONFIG_SQL + `update academic_settings set value = '{"read": {"limit": 5000, "seconds": 60}, "write": {"limit": 5000, "seconds": 60}}' where key = 'rate_limits';
  update academic_settings set value = 'true' where key = 'entitlements_enforced';`)
const links = []
for (const [i, kid] of KIDS.entries()) {
  await rpc(kid, `public.academic_create_profile(${json({ display_name: `Kid ${i + 1}`, age_band: '16_17', province_code: 'vientiane-prefecture', grade_id: ID.g11, school_id: ID.school, notice_version: '2026-10-25', subjects: [{ subject_id: ID.math }] })})`)
  const link = await rpc(G, `public.academic_accept_guardian_invite('${(await rpc(kid, `public.academic_create_guardian_invite()`)).code}', 'mother', true)`)
  await rpc(kid, `public.academic_confirm_guardian_link('${link.id}', true)`)
  links.push(link.id)
}
const tier = async (user) => { const e = (await rpc(user, `public.academic_my_entitlements()`)); return [e.tier, e.premium.source] }

eq('the plans exist at the set prices', (await db.query(`select slug, price_lak, interval from premium_plans where slug like 'family-%' order by slug`)).rows,
  [{ slug: 'family-monthly', price_lak: 79000, interval: 'month' }, { slug: 'family-yearly', price_lak: 790000, interval: 'year' }])
eq('before buying: everyone is Free', await Promise.all([G, ...KIDS].map(tier)), [G, ...KIDS].map(() => ['free', null]))

await ok(db, 'buy', `insert into premium_subscriptions (user_id, plan_id, status, ends_at) select '${G}', id, 'ACTIVE', now() + interval '30 days' from premium_plans where slug = 'family-monthly'`)
eq('the guardian has Academy Premium; the first 3 linked children have Premium from the family plan; the 4th is Free',
  await Promise.all([G, ...KIDS].map(tier)), [['premium', 'academy_premium'], ['premium', 'family_plan'], ['premium', 'family_plan'], ['premium', 'family_plan'], ['free', null]])
eq('a covered child has the Premium features', (await rpc(KIDS[0], `public.academic_my_entitlements()`)).features.career_options.enabled, true)
eq('the guardian sees which children are covered', (await rpc(G, `public.academic_family_plan()`)).children.map((c) => [c.name, c.covered]),
  [['Kid 1', true], ['Kid 2', true], ['Kid 3', true], ['Kid 4', false]])

await rpc(G, `public.academic_guardian_remove_link('${links[1]}')`)
eq('removing a link frees its seat at once: the next child is covered', await Promise.all(KIDS.map(tier)),
  [['premium', 'family_plan'], ['free', null], ['premium', 'family_plan'], ['premium', 'family_plan']])

await ok(db, 'plan ends', `update premium_subscriptions set ends_at = now() - interval '1 minute' where user_id = '${G}'`)
eq('when the plan ends, so does the cover', [await tier(KIDS[0]), (await rpc(G, `public.academic_family_plan()`)).active], [['free', null], false])
eq('a single Premium plan covers no children', (await ok(db, 'single', `insert into premium_subscriptions (user_id, plan_id, status, ends_at) select '${G}', id, 'ACTIVE', now() + interval '30 days' from premium_plans where slug = 'premium-monthly'`), await tier(KIDS[0])), ['free', null])
eq('the seat and cover helpers are server-only', (await db.query(`select p.proname from pg_proc p where p.proname in ('academic_family_seat_links', 'academic_family_plan_until', 'academic_family_premium_until')
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows, [])
void one

done()
