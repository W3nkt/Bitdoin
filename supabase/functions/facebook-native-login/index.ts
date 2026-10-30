// Sign in from the Bitdoin app with the Facebook app (Facebook's own login, which opens the
// Facebook app to authorize). The app sends the Facebook access token it received; this
// checks it with Facebook, finds or creates the Bitdoin account for that Facebook person, and
// returns a one-time token the app trades for a normal Supabase session (verifyOtp).
//
// Secrets: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET (Meta app > Settings > Basic).
// Unauthenticated by design (the caller is not signed in yet), so the Facebook check is the
// only gate: see ../_shared/facebook-token.ts. Rate limited per caller like the other open functions.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { consumeAiQuota, requestSubject } from '../_shared/ai-rate-limit.ts'
import { FACEBOOK_TOKEN_PATTERN, FacebookTokenError, verifyFacebookAccessToken } from '../_shared/facebook-token.ts'
import type { FacebookIdentity } from '../_shared/facebook-token.ts'

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const appId = Deno.env.get('FACEBOOK_APP_ID') ?? ''
const appSecret = Deno.env.get('FACEBOOK_APP_SECRET') ?? ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)

type Match = { user_id: string; email: string | null; matched_by: 'identity' | 'email'; blocked: boolean } | { conflict: true } | null

async function lookup(identity: FacebookIdentity): Promise<Match> {
  const { data, error } = await admin.rpc('facebook_login_lookup', { p_facebook_id: identity.id, p_email: identity.email })
  if (error) throw error
  return (data ?? null) as Match
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
  const respond = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405)
  if (!appId || !appSecret || !serviceKey) return respond({ error: 'not_configured' }, 503)

  try {
    const body = await req.json().catch(() => null)
    const accessToken = body?.access_token
    if (typeof accessToken !== 'string' || !FACEBOOK_TOKEN_PATTERN.test(accessToken)) {
      return respond({ error: 'invalid_request' }, 400)
    }

    const quota = await consumeAiQuota(admin, {
      feature: 'facebook-native-login',
      subjectHash: await requestSubject(req, serviceKey),
      minuteLimit: 20,
      dailyLimit: 300,
      globalDailyLimit: 50000,
    })
    if (!quota.allowed) {
      return respond({ error: 'rate_limited' }, 429, { 'Retry-After': String(quota.retry_after_seconds ?? 60) })
    }

    let identity: FacebookIdentity
    try {
      identity = await verifyFacebookAccessToken(accessToken, { appId, appSecret })
    } catch (error) {
      if (error instanceof FacebookTokenError) {
        return respond({ error: error.reason === 'invalid' ? 'invalid_token' : 'facebook_unavailable' }, error.reason === 'invalid' ? 401 : 503)
      }
      throw error
    }

    let match = await lookup(identity)
    if (match && 'conflict' in match) return respond({ error: 'account_conflict' }, 409)
    if (match?.blocked) return respond({ error: 'account_blocked' }, 403)

    let email = match?.email ?? identity.email
    if (!email) return respond({ error: 'no_email' }, 422)

    if (!match) {
      const { error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // The new-user trigger names the profile from full_name / name. facebook_id is in
        // app_metadata (server-only), which is how this person is recognised next time.
        user_metadata: { full_name: identity.name, name: identity.name, avatar_url: identity.pictureUrl, picture: identity.pictureUrl },
        app_metadata: { facebook_id: identity.id },
      })
      if (error) {
        // Two first sign-ins at the same moment: the other one created the account.
        match = await lookup(identity)
        if (!match || 'conflict' in match || match.blocked) return respond({ error: 'sign_in_failed' }, 503)
        email = match.email ?? email
      }
    } else if (match.matched_by === 'email') {
      // First time this Facebook person uses the app on an existing account: remember the id
      // (server-side), so they are still recognised if their Facebook email changes.
      const { error } = await admin.auth.admin.updateUserById(match.user_id, { app_metadata: { facebook_id: identity.id } })
      if (error) throw error
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) throw error ?? new Error('No sign-in token was created')
    return respond({ token_hash: tokenHash })
  } catch (error) {
    // Never log the request: it carries a Facebook access token.
    console.error('facebook-native-login failed:', error instanceof Error ? error.message : 'unknown error')
    return respond({ error: 'sign_in_failed' }, 503)
  }
})
