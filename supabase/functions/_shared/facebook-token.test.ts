// deno test supabase/functions/_shared/facebook-token.test.ts
import { FACEBOOK_TOKEN_PATTERN, FacebookTokenError, verifyFacebookAccessToken } from './facebook-token.ts'

const APP = { appId: '1234567890', appSecret: 'shh-secret' }
const TOKEN = 'EAABsbCS1iHgBO0abcdefghijklmnopqrstuvwxyz0123456789'

const same = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** A Facebook that answers debug_token and /me with the given bodies, and remembers what it was asked. */
function facebook(debug: Response | Error, me: Response | Error = json({ id: '42', name: 'Noy', email: 'Noy@Example.com', picture: { data: { url: 'https://img/noy.jpg' } } })) {
  const urls: string[] = []
  const fetcher = (url: string) => {
    urls.push(url)
    const answer = url.includes('/debug_token') ? debug : me
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer.clone())
  }
  return { fetcher, urls }
}

const goodDebug = (extra: Record<string, unknown> = {}) => json({ data: { app_id: '1234567890', type: 'USER', is_valid: true, user_id: '42', ...extra } })

async function reason(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    if (error instanceof FacebookTokenError) return error.reason
    throw error
  }
  return 'accepted'
}

Deno.test('a valid token for this app returns who it belongs to', async () => {
  const { fetcher } = facebook(goodDebug())
  same(await verifyFacebookAccessToken(TOKEN, { ...APP, fetcher }), {
    id: '42', name: 'Noy', email: 'noy@example.com', pictureUrl: 'https://img/noy.jpg',
  })
})

Deno.test('a person who shares no email still passes the token check (the caller decides what to do)', async () => {
  const { fetcher } = facebook(goodDebug(), json({ id: '42', name: 'Noy' }))
  same((await verifyFacebookAccessToken(TOKEN, { ...APP, fetcher })).email, null)
})

Deno.test('a token issued to another Facebook app is refused', async () => {
  const { fetcher } = facebook(goodDebug({ app_id: '999' }))
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher })), 'invalid')
})

Deno.test('an invalid, expired or non-user token is refused', async () => {
  for (const extra of [{ is_valid: false }, { type: 'APP' }, { user_id: '' }]) {
    const { fetcher } = facebook(goodDebug(extra))
    same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher })), 'invalid')
  }
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher: facebook(json({}))!.fetcher })), 'invalid')
})

Deno.test('a profile that is not the token owner is refused', async () => {
  const { fetcher } = facebook(goodDebug(), json({ id: '7', name: 'Someone else', email: 'x@example.com' }))
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher })), 'invalid')
})

Deno.test('Facebook rejecting the token is invalid; Facebook being down is unavailable', async () => {
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher: facebook(json({ error: {} }, 400)).fetcher })), 'invalid')
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher: facebook(json({}, 500)).fetcher })), 'unavailable')
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher: facebook(new Error('offline')).fetcher })), 'unavailable')
  same(await reason(verifyFacebookAccessToken(TOKEN, { ...APP, fetcher: facebook(goodDebug(), new Error('offline')).fetcher })), 'unavailable')
})

Deno.test('the app secret is only ever sent in the debug_token call', async () => {
  const { fetcher, urls } = facebook(goodDebug())
  await verifyFacebookAccessToken(TOKEN, { ...APP, fetcher })
  same(urls.length, 2)
  same(urls[0].includes(encodeURIComponent('1234567890|shh-secret')), true)
  same(urls[1].includes('shh-secret'), false)
})

Deno.test('only plausible token strings are accepted as input', () => {
  same(FACEBOOK_TOKEN_PATTERN.test(TOKEN), true)
  same(FACEBOOK_TOKEN_PATTERN.test('short'), false)
  same(FACEBOOK_TOKEN_PATTERN.test(`${TOKEN}&access_token=other`), false)
  same(FACEBOOK_TOKEN_PATTERN.test(`${TOKEN} x`), false)
  same(FACEBOOK_TOKEN_PATTERN.test('a'.repeat(2049)), false)
})
