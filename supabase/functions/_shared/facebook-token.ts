import { fetchWithTimeout } from './timed-fetch.ts'

const GRAPH = 'https://graph.facebook.com'

/** Facebook access tokens are opaque strings of letters, digits and a few separators. */
export const FACEBOOK_TOKEN_PATTERN = /^[A-Za-z0-9_\-.|]{20,2048}$/

export type FacebookIdentity = {
  id: string
  name: string | null
  email: string | null
  pictureUrl: string | null
}

/** invalid: Facebook says the token is not good (or is not for this app). unavailable: Facebook could not be asked. */
export class FacebookTokenError extends Error {
  constructor(readonly reason: 'invalid' | 'unavailable', message: string) {
    super(message)
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function graphJson(fetcher: FetchLike, url: string) {
  let response: Response
  try {
    response = await fetcher(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new FacebookTokenError('unavailable', 'Facebook could not be reached')
  }
  // Facebook answers a bad or expired token with 400 (sometimes 401/403).
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new FacebookTokenError('invalid', 'Facebook rejected the token')
  }
  if (!response.ok) throw new FacebookTokenError('unavailable', `Facebook answered ${response.status}`)
  try {
    return await response.json() as Record<string, unknown>
  } catch {
    throw new FacebookTokenError('unavailable', 'Facebook sent an unreadable answer')
  }
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

/**
 * Checks an access token from the Facebook login in the app, with Facebook, and returns who it
 * belongs to. The token is only trusted if Facebook says it is valid AND was issued to OUR app
 * (otherwise a token for any other Facebook app would sign people in), and the profile it
 * returns is for the same person. Nothing here is logged: the token is a credential.
 */
export async function verifyFacebookAccessToken(
  accessToken: string,
  config: { appId: string; appSecret: string; fetcher?: FetchLike },
): Promise<FacebookIdentity> {
  const fetcher = config.fetcher ?? ((url, init) => fetchWithTimeout(url, init, 8000))

  const debugUrl = `${GRAPH}/debug_token?${new URLSearchParams({
    input_token: accessToken,
    access_token: `${config.appId}|${config.appSecret}`,
  })}`
  const debug = (await graphJson(fetcher, debugUrl)).data as Record<string, unknown> | undefined
  if (
    !debug
    || debug.is_valid !== true
    || String(debug.app_id) !== config.appId
    || (debug.type !== undefined && debug.type !== 'USER')
    || !text(debug.user_id)
  ) {
    throw new FacebookTokenError('invalid', 'The token is not a valid sign-in for this app')
  }

  const meUrl = `${GRAPH}/me?${new URLSearchParams({
    fields: 'id,name,email,picture.type(large)',
    access_token: accessToken,
  })}`
  const me = await graphJson(fetcher, meUrl)
  if (String(me.id) !== String(debug.user_id)) {
    throw new FacebookTokenError('invalid', 'The profile does not belong to the token')
  }

  const picture = (me.picture as { data?: { url?: unknown } } | undefined)?.data?.url
  return {
    id: String(me.id),
    name: text(me.name),
    email: text(me.email)?.toLowerCase() ?? null,
    pictureUrl: text(picture),
  }
}
