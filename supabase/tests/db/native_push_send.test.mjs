// What send-push says and how it reaches the phones (supabase/functions/send-push/messages.ts and native-push.ts):
// the engagement and well-being copy in Lao and English, Apple's and Google's request formats, signed tokens that
// verify, and what each answer from them means (sent, gone for good, or try again later).
import { webcrypto as crypto } from 'node:crypto'
import { eq, done } from './harness.mjs'
import { loadFunctionModules } from './phajay-shop.mjs'

const { engagementMessage, ENGAGEMENT_KINDS, WELLBEING_KINDS, createNativeSender, parseNativeEndpoint, ANDROID_CHANNEL_ID, laoTextIssues } =
  await loadFunctionModules(['send-push/messages.ts', 'send-push/native-push.ts', '_shared/lao-content-standard.ts'])

// ─── The words ───────────────────────────────────────────────────────────────

const params = { streak: 5, gap: 40, rank: 3, days: 4 }
const DATE = '2026-11-03'
const all = ENGAGEMENT_KINDS.flatMap((kind) => ['lo', 'en'].map((lang) => ({ kind, lang, message: engagementMessage(kind, lang, params, DATE) })))

eq('six kinds: four ask people to come in, two tell them to rest', [ENGAGEMENT_KINDS.length, WELLBEING_KINDS], [6, ['BREAK', 'WINDDOWN']])
eq('every message has a title, a body and a link inside the app', all.every(({ message }) => message.title && message.body && message.url.startsWith('/') && !message.url.startsWith('//')), true)
eq('no message prints "undefined", "null" or "NaN"', all.some(({ message }) => /undefined|null|NaN/.test(`${message.title} ${message.body}`)), false)
eq('titles stay short enough for a lock screen (60 characters) and bodies under 140', all.every(({ message }) => message.title.length <= 60 && message.body.length <= 140), true)
eq('a tag is unique per kind and day, under 64 bytes (Apple\'s collapse id limit)', [new Set(all.map(({ message }) => message.tag)).size, all.every(({ message }) => new TextEncoder().encode(message.tag).length <= 64)], [6, true])
const lao = all.filter(({ lang }) => lang === 'lo')
eq('Lao copy passes the Academy Lao standard (no Thai letters, no banned spellings)', lao.flatMap(({ message }) => laoTextIssues(`${message.title} ${message.body}`)), [])
eq('Lao copy really is in Lao script', lao.every(({ message }) => /[຀-໿]/.test(message.body)), true)
eq('English copy has no Lao in it', all.filter(({ lang }) => lang === 'en').some(({ message }) => /[຀-໿]/.test(`${message.title}${message.body}`)), false)
eq('the numbers reach the words', [
  engagementMessage('STREAK_AT_RISK', 'en', params, DATE).title,
  engagementMessage('XP_RIVAL', 'en', params, DATE).title,
  engagementMessage('COMEBACK', 'en', params, DATE).body.includes('4 days'),
  engagementMessage('XP_RIVAL', 'lo', params, DATE).title.includes('40 XP'),
], ['🔥 Your 5-day streak is on the line', '📈 Just 40 XP from rank 3', true, true])
eq('a missing or broken number falls back instead of printing garbage', [
  engagementMessage('STREAK_AT_RISK', 'en', {}, DATE).title,
  engagementMessage('XP_RIVAL', 'en', { gap: NaN, rank: -2 }, DATE).title,
  engagementMessage('COMEBACK', 'en', { days: 'x' }, DATE).body.includes('3 days'),
], ['🔥 Your 1-day streak is on the line', '📈 Just 1 XP from rank 1', true])
eq('the streak, leaderboard and comeback messages open the Academy home', ['STREAK_AT_RISK', 'XP_RIVAL', 'DAILY_NOT_OPENED', 'COMEBACK'].map((kind) => engagementMessage(kind, 'en', params, DATE).url), Array(4).fill('/academy/home'))
eq('the well-being messages tell people to stop: no streak, XP or rank talk in them', WELLBEING_KINDS.flatMap((kind) => ['lo', 'en'].map((lang) => engagementMessage(kind, lang, params, DATE))).some(({ title, body }) => /XP|streak|rank|ມື້ຮຽນຕໍ່ເນື່ອງ|ອັນດັບ/i.test(`${title} ${body}`)), false)
eq('they suggest something to do instead (a book, a stretch, water)', [engagementMessage('WINDDOWN', 'en', params, DATE).body.includes('book'), engagementMessage('BREAK', 'en', params, DATE).body.includes('water')], [true, true])

// ─── Endpoints ───────────────────────────────────────────────────────────────

eq('a phone endpoint splits into channel and token', [parseNativeEndpoint('native://ios/AB12cd'), parseNativeEndpoint('native://android/e1:APA91b-_x.y')],
  [{ channel: 'ios', token: 'AB12cd' }, { channel: 'android', token: 'e1:APA91b-_x.y' }])
eq('anything else is not a phone', ['https://push.example/x', 'native://web/abc', 'native://ios/', 'native://ios/a b', 'native://ios/a/b'].map(parseNativeEndpoint), Array(5).fill(null))

// ─── Keys for the tests ──────────────────────────────────────────────────────

const pem = (label, der) => `-----BEGIN ${label}-----\n${Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n')}\n-----END ${label}-----\n`
const ecKeys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const rsaKeys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
const apnsPem = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', ecKeys.privateKey))
const rsaPem = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', rsaKeys.privateKey))

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString())
const verifies = async (jwt, publicKey, algorithm) => {
  const [header, claims, signature] = jwt.split('.')
  return crypto.subtle.verify(algorithm, publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${claims}`))
}

const message = { title: '🔥 Streak', body: 'Keep it going', url: '/academy/home', tag: 'engagement-streak-at-risk-2026-11-03' }
const IOS_TOKEN = 'ab'.repeat(32)

// A stand-in for fetch: answers from a script and remembers what it was asked.
function fakeFetch(answer) {
  const calls = []
  const fn = async (url, init = {}) => {
    const call = { url: String(url), method: init.method, headers: init.headers ?? {}, body: init.body }
    calls.push(call)
    const { status = 200, json = {} } = await answer(call, calls.length)
    return { ok: status >= 200 && status < 300, status, json: async () => json }
  }
  return { fn, calls }
}

// ─── Apple (iPhone) ──────────────────────────────────────────────────────────

const apnsEnv = { APNS_KEY_P8: apnsPem, APNS_KEY_ID: 'ABC123DEFG', APNS_TEAM_ID: 'TEAM123456' }

{
  const f = fakeFetch(() => ({ status: 200 }))
  const sender = createNativeSender(apnsEnv, f.fn)
  eq('only iOS is ready with only the Apple secrets', sender.configured, { ios: true, android: false })
  eq('a delivered push is "sent"', await sender.send('ios', IOS_TOKEN, message, 3600), 'sent')
  const call = f.calls[0]
  eq('it goes to Apple\'s production server for this device token', [call.method, call.url], ['POST', `https://api.push.apple.com/3/device/${IOS_TOKEN}`])
  eq('with the bundle id as topic, an alert type, high priority and a collapse id', [call.headers['apns-topic'], call.headers['apns-push-type'], call.headers['apns-priority'], call.headers['apns-collapse-id']],
    ['store.bitdoin.app', 'alert', '10', message.tag])
  const expires = Number(call.headers['apns-expiration']) - Math.floor(Date.now() / 1000)
  eq('it expires after the time to live', expires >= 3595 && expires <= 3601, true)
  eq('the payload carries the text, a sound, and the link for a tap', JSON.parse(call.body), { aps: { alert: { title: message.title, body: message.body }, sound: 'default', 'thread-id': message.tag }, url: '/academy/home', tag: message.tag })
  const jwt = call.headers.authorization.replace(/^bearer /, '')
  const [header, claims] = jwt.split('.').slice(0, 2).map(decode)
  eq('the provider token names the key and the team', [header, claims.iss, Math.abs(claims.iat - Math.floor(Date.now() / 1000)) < 5], [{ alg: 'ES256', kid: 'ABC123DEFG' }, 'TEAM123456', true])
  eq('and its signature checks out against the public key (raw r||s, as JWT needs)', await verifies(jwt, ecKeys.publicKey, { name: 'ECDSA', hash: 'SHA-256' }), true)
  await sender.send('ios', IOS_TOKEN, message, 3600)
  eq('the provider token is reused for the next push (Apple limits how often it may change)', f.calls[1].headers.authorization, call.headers.authorization)
}

{
  const f = fakeFetch(() => ({ status: 410, json: { reason: 'Unregistered' } }))
  eq('Apple says the app was deleted: the device is gone for good', await createNativeSender(apnsEnv, f.fn).send('ios', IOS_TOKEN, message, 60), 'gone')
}
{
  const f = fakeFetch(() => ({ status: 400, json: { reason: 'BadDeviceToken' } }))
  eq('a token neither server knows is gone', [await createNativeSender(apnsEnv, f.fn).send('ios', IOS_TOKEN, message, 60), f.calls.map((c) => c.url.split('/3/')[0])], ['gone', ['https://api.push.apple.com', 'https://api.sandbox.push.apple.com']])
}
{
  // A build installed from Xcode has a sandbox token; production says BadDeviceToken once, then it goes straight to sandbox.
  const f = fakeFetch((call) => (call.url.startsWith('https://api.sandbox') ? { status: 200 } : { status: 400, json: { reason: 'BadDeviceToken' } }))
  const sender = createNativeSender(apnsEnv, f.fn)
  eq('a sandbox token is found on the second try', await sender.send('ios', IOS_TOKEN, message, 60), 'sent')
  await sender.send('ios', IOS_TOKEN, message, 60)
  eq('and remembered, so the next push does not try production first', f.calls.map((c) => c.url.split('/3/')[0].replace('https://api.', '')), ['push.apple.com', 'sandbox.push.apple.com', 'sandbox.push.apple.com'])
}
{
  const f = fakeFetch((call, n) => (n === 1 ? { status: 403, json: { reason: 'ExpiredProviderToken' } } : { status: 200 }))
  const sender = createNativeSender({ ...apnsEnv, APNS_BUNDLE_ID: 'store.example.other', APNS_ENVIRONMENT: 'sandbox' }, f.fn)
  eq('a refused provider token is a temporary failure, not a dead device', await sender.send('ios', IOS_TOKEN, message, 60), 'failed')
  eq('the sandbox server and another bundle id are used when configured', [f.calls[0].url.startsWith('https://api.sandbox.push.apple.com'), f.calls[0].headers['apns-topic']], [true, 'store.example.other'])
  eq('the next push signs a fresh token and gets through', await sender.send('ios', IOS_TOKEN, message, 60), 'sent')
}
{
  const f = fakeFetch(() => { throw new Error('socket hang up') })
  eq('a network error is a temporary failure', await createNativeSender(apnsEnv, f.fn).send('ios', IOS_TOKEN, message, 60), 'failed')
}
{
  const f = fakeFetch(() => ({ status: 200 }))
  const sender = createNativeSender({ APNS_KEY_P8: apnsPem, APNS_KEY_ID: 'ABC123DEFG', APNS_TEAM_ID: 'TEAM123456' }, f.fn)
  const oneLine = createNativeSender({ ...apnsEnv, APNS_KEY_P8: apnsPem.trim().replace(/\n/g, '\\n') }, f.fn)
  eq('a key pasted on one line with \\n in it still works', [await sender.send('ios', IOS_TOKEN, message, 60), await oneLine.send('ios', IOS_TOKEN, message, 60)], ['sent', 'sent'])
}

// ─── Google (Android) ────────────────────────────────────────────────────────

const account = { project_id: 'bitdoin-app', client_email: 'push@bitdoin-app.iam.gserviceaccount.com', private_key: rsaPem }
const fcmEnv = { FCM_SERVICE_ACCOUNT: JSON.stringify(account) }
const ANDROID_TOKEN = 'dGVzdC10b2tlbg:APA91bExampleTokenExampleToken_-0123456789'
const fcmAnswer = (reply) => (call) => (call.url === 'https://oauth2.googleapis.com/token' ? { json: { access_token: 'ya29.token', expires_in: 3600 } } : reply(call))

{
  const f = fakeFetch(fcmAnswer(() => ({ status: 200, json: { name: 'projects/bitdoin-app/messages/1' } })))
  const sender = createNativeSender(fcmEnv, f.fn)
  eq('only Android is ready with only the Firebase secret', sender.configured, { ios: false, android: true })
  eq('a delivered push is "sent"', await sender.send('android', ANDROID_TOKEN, { ...message, image: 'https://img.example/c.jpg' }, 7200), 'sent')
  const [exchange, send] = f.calls
  const form = new URLSearchParams(String(exchange.body))
  eq('Google is asked for an access token with a signed assertion', [exchange.url, form.get('grant_type')], ['https://oauth2.googleapis.com/token', 'urn:ietf:params:oauth:grant-type:jwt-bearer'])
  const assertion = form.get('assertion')
  const [header, claims] = assertion.split('.').slice(0, 2).map(decode)
  eq('the assertion names the service account and the messaging scope', [header, claims.iss, claims.scope, claims.aud, claims.exp - claims.iat], [{ alg: 'RS256', typ: 'JWT' }, account.client_email, 'https://www.googleapis.com/auth/firebase.messaging', 'https://oauth2.googleapis.com/token', 3600])
  eq('and its signature checks out against the public key', await verifies(assertion, rsaKeys.publicKey, { name: 'RSASSA-PKCS1-v1_5' }), true)
  eq('the message goes to this project with that access token', [send.url, send.headers.authorization], ['https://fcm.googleapis.com/v1/projects/bitdoin-app/messages:send', 'Bearer ya29.token'])
  const sent = JSON.parse(send.body).message
  eq('with the token, text, image, link, high priority, time to live, channel and collapse key', sent, {
    token: ANDROID_TOKEN,
    notification: { title: message.title, body: message.body, image: 'https://img.example/c.jpg' },
    data: { url: '/academy/home', tag: message.tag },
    android: { priority: 'HIGH', ttl: '7200s', collapse_key: message.tag, notification: { channel_id: ANDROID_CHANNEL_ID, tag: message.tag } },
  })
  await sender.send('android', ANDROID_TOKEN, message, 60)
  eq('the access token is reused until it nearly expires (one exchange, two sends)', f.calls.filter((c) => c.url.includes('oauth2')).length, 1)
}
{
  const encoded = Buffer.from(JSON.stringify(account)).toString('base64')
  const f = fakeFetch(fcmAnswer(() => ({ status: 200 })))
  eq('the service account may be pasted base64-encoded', await createNativeSender({ FCM_SERVICE_ACCOUNT: encoded }, f.fn).send('android', ANDROID_TOKEN, message, 60), 'sent')
}
{
  const f = fakeFetch(fcmAnswer(() => ({ status: 404, json: { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } } })))
  eq('Google says the app was uninstalled: the device is gone for good', await createNativeSender(fcmEnv, f.fn).send('android', ANDROID_TOKEN, message, 60), 'gone')
}
{
  const f = fakeFetch(fcmAnswer(() => ({ status: 400, json: { error: { status: 'INVALID_ARGUMENT', message: 'The registration token is not a valid FCM registration token' } } })))
  eq('a token that was never valid is gone', await createNativeSender(fcmEnv, f.fn).send('android', ANDROID_TOKEN, message, 60), 'gone')
}
{
  const f = fakeFetch(fcmAnswer(() => ({ status: 400, json: { error: { status: 'INVALID_ARGUMENT', message: 'Invalid value at message.android.ttl' } } })))
  eq('a bad request of ours must not delete devices', await createNativeSender(fcmEnv, f.fn).send('android', ANDROID_TOKEN, message, 60), 'failed')
}
{
  let sends = 0
  const f = fakeFetch(fcmAnswer(() => (++sends === 1 ? { status: 401, json: { error: { status: 'UNAUTHENTICATED' } } } : { status: 200 })))
  const sender = createNativeSender(fcmEnv, f.fn)
  eq('an expired access token is a temporary failure', await sender.send('android', ANDROID_TOKEN, message, 60), 'failed')
  eq('and a new one is requested for the next push', [await sender.send('android', ANDROID_TOKEN, message, 60), f.calls.filter((c) => c.url.includes('oauth2')).length], ['sent', 2])
}
{
  const f = fakeFetch(() => ({ status: 500 }))
  eq('Google refusing the sign-in is a temporary failure', await createNativeSender(fcmEnv, f.fn).send('android', ANDROID_TOKEN, message, 60), 'failed')
}
eq('a broken service account is treated as not configured', createNativeSender({ FCM_SERVICE_ACCOUNT: 'not json' }).configured, { ios: false, android: false })

{
  const f = fakeFetch(() => ({ status: 200 }))
  const sender = createNativeSender({}, f.fn)
  eq('with no secrets nothing is sent and nothing is called', [sender.configured, await sender.send('ios', IOS_TOKEN, message, 60), await sender.send('android', ANDROID_TOKEN, message, 60), f.calls.length], [{ ios: false, android: false }, 'failed', 'failed', 0])
}

done()
