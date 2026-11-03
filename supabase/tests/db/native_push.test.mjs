// Push notifications in the iOS / Android apps and the engagement notifications (migration 176):
// phones are saved like browsers (one row, switches, moved between accounts, removed on sign-out),
// and push_claim_engagement picks at most one message per member inside its time window, never
// twice, never while the app is open, never after three ignored pushes.
import { createDb, ok, fails, eq, done } from './harness.mjs'

const db = await createDb(['176_native_push_engagement.sql'])

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TOKEN = (n) => `apns${String(n).padStart(40, '0')}`
const rows = async (sql) => (await db.query(sql)).rows
const asUser = async (user, sql) => (await db.exec(`begin; select set_config('request.jwt.claim.sub', '${user ?? ''}', true); set local role authenticated; ${sql}; commit;`)).at(-2).rows
const asService = async (sql) => (await db.exec(`begin; set local role service_role; ${sql}; commit;`)).at(-2).rows

// Not in the test bootstrap: the daily-mentor tables the standings read.
await ok(db, 'stubs', `
  create table public.premium_personalized_daily_guidance (id uuid primary key default gen_random_uuid(), user_id uuid, publish_date date);
  create table public.premium_daily_motivations (id uuid primary key default gen_random_uuid(), publish_date date);
  create table public.premium_challenge_completions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null, guidance_id uuid, motivation_id uuid,
    completed_at timestamptz default now(), responses jsonb not null default '{}'::jsonb
  );
`)

const A = id(1), B = id(2)
await ok(db, 'users', `insert into public.users (id, name) values ('${A}', 'Noy'), ('${B}', 'Kham')`)

// ─── Saving a phone ──────────────────────────────────────────────────────────

const save = (user, token, platform, enabled = true, channel = 'IOS', extra = '') =>
  asUser(user, `select public.save_native_push_device('${token}', '${channel}', '${platform}', ${enabled}, null, '1.0.3'${extra}) as r`).then((r) => r[0].r)

let state = await save(A, TOKEN(1), 'ACADEMY')
eq('turning Academy on also turns on streak reminders and well-being nudges (a new phone)', state,
  { bookstore_enabled: false, academy_enabled: true, my_scores_enabled: false, engagement_enabled: true, wellbeing_enabled: true, academy_slot: 'MORNING' })
let row = (await rows(`select channel, endpoint, p256dh, auth, app_version from public.push_subscriptions`))[0]
eq('stored like a browser, as native://ios/<token>', row, { channel: 'IOS', endpoint: `native://ios/${TOKEN(1)}`, p256dh: '', auth: '', app_version: '1.0.3' })

state = await save(A, TOKEN(1), 'ENGAGEMENT', false)
eq('streak reminders can be switched off on their own', [state.engagement_enabled, state.academy_enabled, state.wellbeing_enabled], [false, true, true])
state = await save(A, TOKEN(1), 'ACADEMY', false)
state = await save(A, TOKEN(1), 'ACADEMY', true)
eq('switching Academy off and on again does not undo a choice made earlier', state.engagement_enabled, false)
eq('the saved state can be read back', (await asUser(A, `select public.get_native_push_device('${TOKEN(1)}', 'IOS') as r`))[0].r.academy_enabled, true)
eq('another member sees nothing of it', (await asUser(B, `select public.get_native_push_device('${TOKEN(1)}', 'IOS') as r`))[0].r, null)

state = await save(A, TOKEN(2), 'BOOKSTORE', true, 'ANDROID')
eq('Bookstore on is just Bookstore: no streak reminders, no well-being nudges', [state.bookstore_enabled, state.engagement_enabled, state.wellbeing_enabled], [true, false, false])
state = await save(A, TOKEN(2), 'WELLBEING', true, 'ANDROID')
eq('well-being nudges can be added on their own', [state.bookstore_enabled, state.wellbeing_enabled], [true, true])
await save(A, TOKEN(2), 'BOOKSTORE', false, 'ANDROID')
eq('Bookstore off leaves well-being on, so the phone stays registered', (await rows(`select count(*)::int as n from public.push_subscriptions where endpoint = 'native://android/${TOKEN(2)}'`))[0].n, 1)
await save(A, TOKEN(2), 'WELLBEING', false, 'ANDROID')
eq('the row goes away when every switch is off', (await rows(`select count(*)::int as n from public.push_subscriptions where endpoint = 'native://android/${TOKEN(2)}'`))[0].n, 0)

// A phone passed to someone else starts clean.
state = await save(B, TOKEN(1), 'BOOKSTORE')
eq('a phone signed in by another account does not keep the first account\'s choices',
  [state.bookstore_enabled, state.academy_enabled, state.engagement_enabled, state.wellbeing_enabled], [true, false, false, false])
eq('and belongs to the new account only', (await rows(`select user_id from public.push_subscriptions where endpoint = 'native://ios/${TOKEN(1)}'`)).map((r) => r.user_id), [B])
await save(A, TOKEN(1), 'ACADEMY')

await fails(db, 'signed-out callers are refused', `select public.save_native_push_device('${TOKEN(3)}', 'IOS', 'ACADEMY', true)`, 'sign in')
await fails(db, 'a token with a slash or a space is refused', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select public.save_native_push_device('native://x/y z aaaaaaaaaaaaaaaaaaaa', 'IOS', 'ACADEMY', true)`, 'Invalid push token')
await fails(db, 'a short token is refused', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select public.save_native_push_device('short', 'IOS', 'ACADEMY', true)`, 'Invalid push token')
await fails(db, 'only iOS and Android are phones', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select public.save_native_push_device('${TOKEN(4)}', 'WEB', 'ACADEMY', true)`, 'Invalid channel')
await fails(db, 'unknown switches are refused', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select public.save_native_push_device('${TOKEN(4)}', 'IOS', 'MARKETING', true)`, 'Invalid platform')

// Browsers keep working: an https endpoint on WEB, a native one never.
await ok(db, 'a browser row is still allowed', `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('${A}', 'https://push.example/abc', 'k', 'a')`)
await fails(db, 'a native endpoint cannot be a browser row', `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, channel) values ('${A}', 'native://ios/${TOKEN(9)}', '', '', 'WEB')`, 'check')
await fails(db, 'an https endpoint cannot be a phone row', `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, channel) values ('${A}', 'https://push.example/x', '', '', 'IOS')`, 'check')
await ok(db, 'tidy', `delete from public.push_subscriptions where endpoint like 'https://%'`)

// ─── Open app, new token, sign-out ───────────────────────────────────────────

await ok(db, 'make the session old', `update public.push_subscriptions set last_active_at = now() - interval '20 minutes', session_started_at = now() - interval '2 hours' where endpoint = 'native://ios/${TOKEN(1)}'`)
const touch = (user, token = TOKEN(1)) => asUser(user, `select public.touch_push_device('${token}', 'IOS', '1.0.4') as r`).then((r) => r[0].r)
eq('touching an unknown phone says so, so the app registers again', await touch(A, TOKEN(7)), false)
eq('touching somebody else\'s phone does nothing', await touch(B), false)
eq('touching the phone says it was found', await touch(A), true)
row = (await rows(`select now() - session_started_at < interval '1 minute' as fresh, app_version from public.push_subscriptions where endpoint = 'native://ios/${TOKEN(1)}'`))[0]
eq('after a 20 minute gap a new session begins', row, { fresh: true, app_version: '1.0.4' })
await ok(db, 'make the session recent', `update public.push_subscriptions set last_active_at = now() - interval '5 minutes', session_started_at = now() - interval '40 minutes' where endpoint = 'native://ios/${TOKEN(1)}'`)
await touch(A)
eq('inside 15 minutes the same session carries on', (await rows(`select now() - session_started_at > interval '39 minutes' as same from public.push_subscriptions where endpoint = 'native://ios/${TOKEN(1)}'`))[0].same, true)

eq('a changed token carries the switches over', (await asUser(A, `select public.replace_native_push_device('${TOKEN(1)}', '${TOKEN(5)}', 'IOS') as r`))[0].r, true)
eq('the old token is gone and the new one has the switches', (await rows(`select endpoint, academy_enabled from public.push_subscriptions where user_id = '${A}'`)), [{ endpoint: `native://ios/${TOKEN(5)}`, academy_enabled: true }])
eq('an unknown old token moves nothing', (await asUser(A, `select public.replace_native_push_device('${TOKEN(8)}', '${TOKEN(6)}', 'IOS') as r`))[0].r, false)
await asUser(A, `select public.remove_native_push_device('${TOKEN(5)}', 'IOS')`)
eq('signing out removes the phone', (await rows(`select count(*)::int as n from public.push_subscriptions where user_id = '${A}'`))[0].n, 0)

// Members cannot run the engagement machinery.
await fails(db, 'members cannot claim engagement pushes', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select * from public.push_claim_engagement()`, 'permission denied')
await fails(db, 'or read the standings', `select set_config('request.jwt.claim.sub', '${A}', true); set local role authenticated; select * from public.push_member_standings()`, 'permission denied')
eq('or read what was sent (row-level security, no policy)', (await asUser(A, `select count(*)::int as n from public.push_engagement_log`))[0].n, 0)

// ─── Engagement: who gets what, when ─────────────────────────────────────────

const users = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`u${i + 1}`, id(100 + i)]))
await ok(db, 'engagement users', `insert into public.users (id, name, language) values ${Object.entries(users).map(([k, v]) => `('${v}', '${k}', '${k === 'u12' ? 'en' : 'lo'}')`).join(', ')}`)

const DAY = '2026-11-03' // a Tuesday in Laos
const at = (time) => `'${DAY} ${time}+07'::timestamptz`
const member = (user) => `insert into public.premium_subscriptions (user_id, status) values ('${user}', 'ACTIVE');`
// One full day of the daily mentor: three answered items.
const fullDay = (user, date) => `insert into public.premium_challenge_completions (user_id, completed_at, responses) values ('${user}', '${date} 10:00+07', '{"reflection":"a","challenge":"b","mission":"c"}');`
const items = (user, date, n) => `insert into public.premium_challenge_completions (user_id, completed_at, responses) values ('${user}', '${date} 10:00+07', '${JSON.stringify(Object.fromEntries(['reflection', 'challenge', 'mission'].slice(0, n).map((k) => [k, 'x'])))}');`
const phone = (user, n, { engagement = true, wellbeing = false, activeMinutesAgo = 120, sessionMinutes = null, channel = 'ios' } = {}, now = at('19:00')) =>
  `insert into public.push_subscriptions (user_id, endpoint, channel, p256dh, auth, academy_enabled, engagement_enabled, wellbeing_enabled, last_active_at, session_started_at)
   values ('${user}', 'native://${channel}/${TOKEN(200 + n)}', '${channel.toUpperCase()}', '', '', true, ${engagement}, ${wellbeing},
     ${now} - interval '${activeMinutesAgo} minutes', ${now} - interval '${sessionMinutes ?? activeMinutesAgo} minutes');`
const claim = async (time, limit = 500) => (await asService(`select user_id, kind, language, params from public.push_claim_engagement(${at(time)}, ${limit})`))
const kindsFor = (list, user) => list.filter((r) => r.user_id === user).map((r) => r.kind)

// u1: a 3-day streak that ended yesterday, nothing yet today.
await ok(db, 'u1', member(users.u1) + fullDay(users.u1, '2026-10-31') + fullDay(users.u1, '2026-11-01') + fullDay(users.u1, '2026-11-02') + phone(users.u1, 1))
// u2: finished today's mentor already.
await ok(db, 'u2', member(users.u2) + fullDay(users.u2, '2026-11-02') + fullDay(users.u2, '2026-11-03') + phone(users.u2, 2))
// u3: well-being on, in the app for 2 hours and still there.
await ok(db, 'u3', phone(users.u3, 3, { engagement: false, wellbeing: true, activeMinutesAgo: 2, sessionMinutes: 130 }, at('14:00')))
// u4: well-being on, using the phone just now.
await ok(db, 'u4', phone(users.u4, 4, { engagement: false, wellbeing: true, activeMinutesAgo: 3, sessionMinutes: 20 }, at('22:00')))
// u5: a member who has not opened the app for 4 days.
await ok(db, 'u5', member(users.u5) + phone(users.u5, 5, { activeMinutesAgo: 4 * 24 * 60 }, at('18:00')))
// u6: a member with a streak at risk, away for 5 days, and three earlier pushes went unopened.
await ok(db, 'u6', member(users.u6) + fullDay(users.u6, '2026-11-02') + phone(users.u6, 6, { activeMinutesAgo: 5 * 24 * 60 })
  + ['2026-10-30', '2026-10-31', '2026-11-01'].map((day) => `insert into public.push_engagement_log (user_id, kind, sent_on, sent_at) values ('${users.u6}', 'DAILY_NOT_OPENED', '${day}', '${day} 13:00+07');`).join(''))
// u7: not an Academy member: only well-being nudges are for them.
await ok(db, 'u7', phone(users.u7, 7, { activeMinutesAgo: 4 * 24 * 60 }, at('18:00')))
// u8 / u9: u9 has 100 XP; u8 has 25 + 20 = 45 XP. Everyone with a streak above has 100 XP or more,
// so u8 is last of the seven who have any XP, 55 behind the member just above.
await ok(db, 'u8', member(users.u8) + items(users.u8, '2026-10-30', 1) + `insert into public.premium_learning_activity_attempts (user_id, activity_type, score, total, xp_earned, completed_at) values ('${users.u8}', 'brain_sprint', 5, 5, 20, '2026-10-30 12:00+07');` + phone(users.u8, 8, { activeMinutesAgo: 3 * 60 }))
await ok(db, 'u9', member(users.u9) + fullDay(users.u9, '2026-10-29'))
// u10: used the app 3 minutes ago, streak at risk: leave them alone while they are in it.
await ok(db, 'u10', member(users.u10) + fullDay(users.u10, '2026-11-02') + phone(users.u10, 10, { activeMinutesAgo: 3 }))
// u11: opened the app yesterday, not today.
await ok(db, 'u11', member(users.u11) + phone(users.u11, 11, { activeMinutesAgo: 30 * 60 }, at('13:00')))
// u12: English speaker with a streak at risk.
await ok(db, 'u12', member(users.u12) + fullDay(users.u12, '2026-11-02') + phone(users.u12, 12))

eq('standings: u1 leads with 300 XP, u2 has 200, four members have 100 and u8 is seventh with 45, 55 behind',
  await asService(`select user_id, xp, rank, gap_to_next from public.push_member_standings(${at('19:00')}) where rank is not null order by rank`).then((r) => r.map((x) => [x.xp, x.rank, x.gap_to_next])),
  [[300, 1, null], [200, 2, 100], [100, 3, 100], [100, 4, 0], [100, 5, 0], [100, 6, 0], [45, 7, 55]])
eq('standings: a 3-day streak that ended yesterday is still alive', await asService(`select streak, items_today from public.push_member_standings(${at('19:00')}) where user_id = '${users.u1}'`), [{ streak: 3, items_today: 0 }])

// 03:00: nothing is ever sent at night.
eq('nothing at 03:00', await claim('03:00'), [])

// 14:00: the break nudge for u3 (2 h in the app) and the "not opened today" nudge for u11. Nobody else.
const noon = await claim('14:00')
eq('14:00: u3 is told to take a break', kindsFor(noon, users.u3), ['BREAK'])
eq('14:00: u11 opened yesterday but not today, so a gentle reminder', kindsFor(noon, users.u11), ['DAILY_NOT_OPENED'])
eq('14:00: nobody else (streaks are for the evening, u7 is not a member)', noon.map((r) => r.kind).sort(), ['BREAK', 'DAILY_NOT_OPENED'])
eq('the same moment again sends nothing more (claimed already)', await claim('14:00'), [])
eq('15 minutes later still nothing: the break is 4 hours apart, the reminder once a day', await claim('14:15'), [])

// 19:00: streak at risk for u1 (u6 is muted by ignored pushes, u10 is in the app, u2 is done).
const evening = await claim('19:00')
eq('19:00: u1 is told the 3-day streak is on the line', evening.filter((r) => r.user_id === users.u1), [{ user_id: users.u1, kind: 'STREAK_AT_RISK', language: 'lo', params: { streak: 3 } }])
eq('19:00: an English speaker gets their language', evening.filter((r) => r.user_id === users.u12).map((r) => r.language), ['en'])
eq('19:00: u2 finished today, u10 is in the app right now, u6 ignored three pushes: none of them', [users.u2, users.u10, users.u6].flatMap((u) => kindsFor(evening, u)), [])
eq('19:00: u5, away 4 days, gets the comeback', kindsFor(evening, users.u5), ['COMEBACK'])
eq('19:00: u8 is 55 XP behind the 6th place, so the leaderboard nudge', evening.filter((r) => r.user_id === users.u8), [{ user_id: users.u8, kind: 'XP_RIVAL', language: 'lo', params: { gap: 55, rank: 6 } }])
eq('19:00: u7 is not a member and u9 has no phone registered: nothing', [users.u7, users.u9].flatMap((u) => kindsFor(evening, u)), [])
eq('19:00: a member level on XP with the one above (gap 0) is not nagged', [users.u12].flatMap((u) => kindsFor(evening, u)), ['STREAK_AT_RISK'])
eq('streak beats everything else for the same person (one message each)', evening.length, new Set(evening.map((r) => r.user_id)).size)
eq('the evening claim cannot be repeated', await claim('19:00'), [])

// Two hours apart: u1 already had STREAK_AT_RISK; the rival/daily rules do not stack on it.
eq('an hour later u1 hears nothing more', kindsFor(await claim('20:00'), users.u1), [])

// 22:00: u4 is still on the phone.
const night = await claim('22:00')
eq('22:00: u4 is told to put the phone down', kindsFor(night, users.u4), ['WINDDOWN'])
eq('22:00: only the person still using the phone, no engagement at night', night.map((r) => r.kind), ['WINDDOWN'])
eq('23:00: told once a day', await claim('23:00'), [])

// Release gives a claim back (nothing reached the phone), so the next run tries again.
await asService(`select public.push_release_engagement('${users.u4}', 'WINDDOWN')`)
await ok(db, 'u4 still on the phone', `update public.push_subscriptions set last_active_at = ${at('23:20')} - interval '2 minutes' where user_id = '${users.u4}'`)
eq('after a release the same person can be picked again', kindsFor(await claim('23:20'), users.u4), ['WINDDOWN'])

// Back-off: once u6 opens the app again, the earlier pushes no longer count against them.
await ok(db, 'u6 opens the app', `update public.push_subscriptions set last_active_at = ${at('17:00')} where user_id = '${users.u6}'`)
eq('after opening the app again the streak reminder can come (u6 was never muted for good)', kindsFor(await claim('20:30'), users.u6), ['STREAK_AT_RISK'])

// Caps.
eq('no member got more than two engagement pushes today', (await rows(`select coalesce(max(n), 0)::int as n from (select count(*) as n from public.push_engagement_log where sent_on = '${DAY}' and kind not in ('BREAK','WINDDOWN') group by user_id) t`))[0].n <= 2, true)
eq('the limit parameter caps a run', (await claim('20:45', 0)).length <= 1, true)

done()
