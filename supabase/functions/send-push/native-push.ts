// Sends notifications to the iOS and Android apps. No Deno APIs here (only fetch and WebCrypto), so Node can
// test it with a stand-in fetch; index.ts wires it to the real secrets.
//
//   iOS      Apple's push service (APNs) over HTTP/2 with a token-based key (.p8). Capacitor's push plugin hands
//            the app a plain APNs device token when no Firebase SDK is in the iOS app, which is the case here.
//   Android  Firebase Cloud Messaging (HTTP v1) with a service account.
//
// Secrets (Supabase > Edge Functions > Secrets). Leave a platform's secrets out and that platform is skipped:
//   APNS_KEY_P8              the text of the AuthKey_XXXX.p8 file, BEGIN/END lines included
//   APNS_KEY_ID              the 10-character Key ID of that key
//   APNS_TEAM_ID             the 10-character Apple Team ID
//   APNS_BUNDLE_ID           optional, default store.bitdoin.app
//   APNS_ENVIRONMENT         optional, "production" (default; TestFlight and the App Store) or "sandbox"
//   FCM_SERVICE_ACCOUNT      the whole service-account JSON from Firebase (or that JSON base64-encoded)

export interface NativeMessage {
  title: string
  body: string
  /** Where a tap opens inside the app, e.g. /academy/home. */
  url: string
  /** A newer message with the same tag replaces the older one on the phone. */
  tag: string
  image?: string
}

export type NativeChannel = 'ios' | 'android'
export type NativeResult = 'sent' | 'gone' | 'failed'

export interface NativeEnv {
  APNS_KEY_P8?: string
  APNS_KEY_ID?: string
  APNS_TEAM_ID?: string
  APNS_BUNDLE_ID?: string
  APNS_ENVIRONMENT?: string
  FCM_SERVICE_ACCOUNT?: string
}

export interface NativeSender {
  /** Which phones this function can currently reach. */
  configured: { ios: boolean; android: boolean }
  send(channel: NativeChannel, token: string, message: NativeMessage, ttlSeconds: number): Promise<NativeResult>
}

/** The Android notification channel the app creates (src/lib/nativePush.ts); keep the two in step. */
export const ANDROID_CHANNEL_ID = 'bitdoin'

/** native://ios/<token> or native://android/<token> as stored in push_subscriptions.endpoint. */
export function parseNativeEndpoint(endpoint: string): { channel: NativeChannel; token: string } | null {
  const match = /^native:\/\/(ios|android)\/([A-Za-z0-9:_.-]+)$/.exec(endpoint)
  return match ? { channel: match[1] as NativeChannel, token: match[2] } : null
}

// ─── Small crypto helpers ────────────────────────────────────────────────────

const encoder = new TextEncoder()

function base64Url(input: ArrayBuffer | Uint8Array | string) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string) {
  const body = pem
    .replace(/\\n/g, '\n') // a secret pasted on one line keeps literal \n
    .replace(/-----(BEGIN|END)[^-]*-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(body)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function signJwt(
  header: Record<string, string>,
  claims: Record<string, string | number>,
  key: CryptoKey,
  algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
) {
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`
  const signature = await crypto.subtle.sign(algorithm, key, encoder.encode(unsigned))
  return `${unsigned}.${base64Url(signature)}`
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

// ─── APNs (iOS) ──────────────────────────────────────────────────────────────

const APNS_HOSTS = { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' } as const
// Apple wants a provider token refreshed at most every 20 minutes and no older than 60.
const APNS_TOKEN_MAX_AGE = 50 * 60

function apnsSender(env: NativeEnv, fetchFn: typeof fetch) {
  const keyPem = env.APNS_KEY_P8?.trim()
  const keyId = env.APNS_KEY_ID?.trim()
  const teamId = env.APNS_TEAM_ID?.trim()
  if (!keyPem || !keyId || !teamId) return null

  const topic = env.APNS_BUNDLE_ID?.trim() || 'store.bitdoin.app'
  const preferred: keyof typeof APNS_HOSTS = env.APNS_ENVIRONMENT?.trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'production'
  let cached: { jwt: string; issuedAt: number } | null = null
  let keyPromise: Promise<CryptoKey> | null = null
  // Tokens Apple said belong to the other environment (a build installed from Xcode instead of TestFlight).
  const sandboxTokens = new Set<string>()

  const providerToken = async () => {
    if (cached && nowSeconds() - cached.issuedAt < APNS_TOKEN_MAX_AGE) return cached.jwt
    keyPromise ??= crypto.subtle.importKey('pkcs8', pemToDer(keyPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
    const issuedAt = nowSeconds()
    // WebCrypto's ECDSA output is the raw r||s pair that JWT's ES256 requires.
    const jwt = await signJwt({ alg: 'ES256', kid: keyId }, { iss: teamId, iat: issuedAt }, await keyPromise, { name: 'ECDSA', hash: 'SHA-256' })
    cached = { jwt, issuedAt }
    return jwt
  }

  async function post(host: keyof typeof APNS_HOSTS, token: string, message: NativeMessage, ttlSeconds: number) {
    const payload = {
      aps: { alert: { title: message.title, body: message.body }, sound: 'default', 'thread-id': message.tag.slice(0, 64) },
      url: message.url,
      tag: message.tag,
    }
    // Capacitor hands out the token in capitals; Apple's own tools show it in lower case.
    const response = await fetchFn(`${APNS_HOSTS[host]}/3/device/${token.toLowerCase()}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await providerToken()}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': String(nowSeconds() + ttlSeconds),
        // Apple allows up to 64 bytes. A newer message with the same id replaces the older one.
        'apns-collapse-id': message.tag.slice(0, 64),
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (response.ok) return { status: response.status, reason: '' }
    const detail = await response.json().catch(() => ({})) as { reason?: string }
    return { status: response.status, reason: detail.reason ?? '' }
  }

  return async (token: string, message: NativeMessage, ttlSeconds: number): Promise<NativeResult> => {
    try {
      const first: keyof typeof APNS_HOSTS = sandboxTokens.has(token) ? 'sandbox' : preferred
      let result = await post(first, token, message, ttlSeconds)
      // BadDeviceToken is also what Apple says for a token from the other environment: try that one before giving up.
      if (result.reason === 'BadDeviceToken') {
        const other: keyof typeof APNS_HOSTS = first === 'production' ? 'sandbox' : 'production'
        const retry = await post(other, token, message, ttlSeconds)
        if (retry.status === 200) sandboxTokens[other === 'sandbox' ? 'add' : 'delete'](token)
        result = retry
      }
      if (result.status === 200) return 'sent'
      if (result.status === 410 || result.reason === 'Unregistered' || result.reason === 'BadDeviceToken') return 'gone'
      if (result.reason === 'ExpiredProviderToken' || result.reason === 'InvalidProviderToken') cached = null
      console.error('[send-push] APNs refused', result.status, result.reason)
      return 'failed'
    } catch (error) {
      console.error('[send-push] APNs request failed', (error as Error).message)
      return 'failed'
    }
  }
}

// ─── FCM (Android) ───────────────────────────────────────────────────────────

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  const text = raw.trim()
  try {
    const json = JSON.parse(text.startsWith('{') ? text : atob(text)) as Partial<ServiceAccount>
    return json.project_id && json.client_email && json.private_key ? json as ServiceAccount : null
  } catch {
    return null
  }
}

function fcmSender(env: NativeEnv, fetchFn: typeof fetch) {
  const account = env.FCM_SERVICE_ACCOUNT ? parseServiceAccount(env.FCM_SERVICE_ACCOUNT) : null
  if (!account) return null

  let access: { token: string; expiresAt: number } | null = null
  let keyPromise: Promise<CryptoKey> | null = null

  const accessToken = async () => {
    if (access && access.expiresAt - 60 > nowSeconds()) return access.token
    keyPromise ??= crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
    const issuedAt = nowSeconds()
    const assertion = await signJwt(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: issuedAt,
        exp: issuedAt + 3600,
      },
      await keyPromise,
      { name: 'RSASSA-PKCS1-v1_5' },
    )
    const response = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    const json = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number }
    if (!response.ok || !json.access_token) throw new Error(`Google sign-in for FCM failed (${response.status})`)
    access = { token: json.access_token, expiresAt: issuedAt + (json.expires_in ?? 3600) }
    return access.token
  }

  return async (token: string, message: NativeMessage, ttlSeconds: number): Promise<NativeResult> => {
    try {
      const response = await fetchFn(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body, ...(message.image ? { image: message.image } : {}) },
            // The app opens message.url when the notification is tapped (src/lib/nativePush.ts).
            data: { url: message.url, tag: message.tag },
            android: {
              priority: 'HIGH',
              ttl: `${ttlSeconds}s`,
              collapse_key: message.tag.slice(0, 64),
              notification: { channel_id: ANDROID_CHANNEL_ID, tag: message.tag.slice(0, 64) },
            },
          },
        }),
      })
      if (response.ok) return 'sent'
      const detail = await response.json().catch(() => ({})) as { error?: { status?: string; message?: string; details?: Array<{ errorCode?: string }> } }
      const code = detail.error?.details?.find(item => item.errorCode)?.errorCode ?? detail.error?.status ?? ''
      // 404 UNREGISTERED: the app was uninstalled or the token expired. 400 about the token: it was never valid.
      if (response.status === 404 || code === 'UNREGISTERED' || (response.status === 400 && /registration token/i.test(detail.error?.message ?? ''))) return 'gone'
      if (response.status === 401 || response.status === 403) access = null
      console.error('[send-push] FCM refused', response.status, code, detail.error?.message ?? '')
      return 'failed'
    } catch (error) {
      console.error('[send-push] FCM request failed', (error as Error).message)
      return 'failed'
    }
  }
}

export function createNativeSender(env: NativeEnv, fetchFn: typeof fetch = fetch): NativeSender {
  const ios = apnsSender(env, fetchFn)
  const android = fcmSender(env, fetchFn)
  return {
    configured: { ios: ios !== null, android: android !== null },
    async send(channel, token, message, ttlSeconds) {
      const send = channel === 'ios' ? ios : android
      // Not configured: neither delivered nor dead. The row stays for when the secrets are added.
      return send ? send(token, message, ttlSeconds) : 'failed'
    },
  }
}
