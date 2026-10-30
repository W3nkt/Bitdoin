import { Capacitor } from '@capacitor/core'
import { FacebookSignIn, ErrorCode } from '@capawesome/capacitor-facebook-sign-in'
import { supabase } from '@/lib/supabase'

/**
 * In the apps, "Continue with Facebook" uses Facebook's own login, which opens the Facebook app to
 * authorize when it is installed (and Facebook's login page when it is not). Supabase cannot check
 * a token from that login itself, so the facebook-native-login Edge Function does, and hands back
 * a one-time token that becomes an ordinary Supabase session here.
 *
 * It needs the Facebook app settings in the build (VITE_FACEBOOK_APP_ID, see Docs/mobile-app-setup.md).
 * Without them, Facebook sign-in uses the system browser like Google and Apple.
 *
 * iOS only for now: on Android, Facebook only accepts a build signed with a key whose hash is
 * registered in the Meta app, and there is no fixed signing key until the Play Console release is
 * set up. Android keeps the browser sign-in. Drop the platform check when that is done.
 */
export const facebookAppConfigured = Boolean(import.meta.env.VITE_FACEBOOK_APP_ID) && Capacitor.getPlatform() === 'ios'

export type FacebookAppErrorCode = 'no_email' | 'failed'

/** What the person should be told. The detail is only logged. */
export class FacebookAppSignInError extends Error {
  constructor(readonly code: FacebookAppErrorCode, detail?: string) {
    super(detail ?? code)
  }
}

/** The Facebook login could not start or did not give an access token: use the browser instead. */
export const FACEBOOK_APP_UNAVAILABLE = 'unavailable'

let initialized: Promise<void> | null = null

function isCancelled(error: unknown) {
  const { code, message } = error as { code?: unknown; message?: unknown }
  return code === ErrorCode.SignInCanceled || (typeof message === 'string' && /cancel/i.test(message))
}

/** The Edge Function's error code, from the failed response. */
async function backendCode(error: unknown) {
  try {
    const body = await (error as { context?: Response }).context?.json()
    return typeof body?.error === 'string' ? body.error : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolves when the person is signed in ('signed-in'), backed out ('cancelled'), or when Facebook's
 * login is not available here ('unavailable': the caller falls back to the browser). Throws a
 * FacebookAppSignInError when Facebook answered but the sign-in could not be completed.
 */
export async function signInWithFacebookApp(): Promise<'signed-in' | 'cancelled' | typeof FACEBOOK_APP_UNAVAILABLE> {
  let accessToken: string | undefined
  try {
    // The app id and client token are read from the native configuration.
    initialized ??= FacebookSignIn.initialize()
    await initialized
    const result = await FacebookSignIn.signIn({ permissions: ['public_profile', 'email'] })
    accessToken = result.accessToken?.token
  } catch (error) {
    if (isCancelled(error)) return 'cancelled'
    console.error('[facebook-app] login did not start', error)
    initialized = null
    return FACEBOOK_APP_UNAVAILABLE
  }
  // iOS can fall back to Limited Login, which has no access token to check.
  if (!accessToken) return FACEBOOK_APP_UNAVAILABLE

  try {
    const { data, error } = await supabase.functions.invoke<{ token_hash?: string }>('facebook-native-login', {
      body: { access_token: accessToken },
    })
    if (error || !data?.token_hash) {
      const code = await backendCode(error)
      throw new FacebookAppSignInError(code === 'no_email' ? 'no_email' : 'failed', code ?? 'no sign-in token')
    }
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
    if (otpError) throw new FacebookAppSignInError('failed', otpError.message)
    return 'signed-in'
  } finally {
    // The session is Supabase's; do not leave a Facebook one behind in the SDK.
    void FacebookSignIn.signOut().catch(() => undefined)
  }
}
