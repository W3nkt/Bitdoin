import { Capacitor } from '@capacitor/core'
import { FacebookSignIn, ErrorCode } from '@capawesome/capacitor-facebook-sign-in'
import { AppTrackingTransparency } from 'capacitor-plugin-app-tracking-transparency'
import { supabase } from '@/lib/supabase'

/**
 * In the apps, "Continue with Facebook" uses Facebook's own login SDK (not the website's redirect
 * flow). What comes back depends on the person's answer to iOS's tracking prompt, which is shown
 * once, just before the first Facebook sign-in (askTrackingPermission):
 *  - Allow: a classic login. Facebook switches to the Facebook app (when it is installed and signed
 *    in), and the SDK returns an access token.
 *  - Don't allow: iOS makes Facebook use Limited Login: it runs in the in-app browser, never in the
 *    Facebook app, and returns only an ID token. Facebook's SDK does this by itself even when a
 *    classic login is asked for.
 * The permission is used for nothing else: the SDK's automatic events and advertiser ID collection
 * are off (Info.plist).
 * Either way the SDK also returns an ID token, which Supabase can verify directly
 * (signInWithIdToken); the facebook-native-login Edge Function remains only as a fallback for a
 * result that has an access token and no usable ID token.
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

/** `code` is what the person is told; `detail` is a short technical reason shown with it, to make a report easy to act on. */
export class FacebookAppSignInError extends Error {
  constructor(readonly code: FacebookAppErrorCode, readonly detail: string) {
    super(detail)
  }
}

let initialized: Promise<void> | null = null

/**
 * iOS's "Allow Bitdoin to track your activity..." prompt. Facebook only opens its app for a person
 * who has allowed it. iOS shows it once; later calls just read the answer. Optional: if it is
 * refused or fails, Facebook still signs in, in the browser.
 */
async function askTrackingPermission() {
  try {
    const { status } = await AppTrackingTransparency.getStatus()
    if (status === 'notDetermined') await AppTrackingTransparency.requestPermission()
  } catch (error) {
    console.error('[facebook-app] tracking prompt', error)
  }
}

function describe(error: unknown) {
  const message = (error as { message?: unknown })?.message
  return (typeof message === 'string' && message ? message : String(error)).replace(/\s+/g, ' ').slice(0, 140)
}

function isCancelled(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown }
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

async function viaEdgeFunction(accessToken: string) {
  const { data, error } = await supabase.functions.invoke<{ token_hash?: string }>('facebook-native-login', {
    body: { access_token: accessToken },
  })
  if (error || !data?.token_hash) {
    const code = await backendCode(error)
    throw new FacebookAppSignInError(code === 'no_email' ? 'no_email' : 'failed', `function: ${code ?? describe(error)}`)
  }
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
  if (otpError) throw new FacebookAppSignInError('failed', `session: ${describe(otpError)}`)
}

/**
 * Resolves when the person is signed in ('signed-in') or backed out ('cancelled'). Throws a
 * FacebookAppSignInError for anything else, so the screen can say so (it does not fall back to
 * the browser: that hid what went wrong and opened a second login).
 */
export async function signInWithFacebookApp(): Promise<'signed-in' | 'cancelled'> {
  let result: Awaited<ReturnType<typeof FacebookSignIn.signIn>>
  await askTrackingPermission()
  try {
    // The app id and client token are read from the native configuration.
    initialized ??= FacebookSignIn.initialize()
    await initialized
    result = await FacebookSignIn.signIn({ permissions: ['public_profile', 'email'] })
  } catch (error) {
    if (isCancelled(error)) return 'cancelled'
    initialized = null
    throw new FacebookAppSignInError('failed', `facebook: ${describe(error)}`)
  }

  try {
    if (result.authenticationToken) {
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'facebook', token: result.authenticationToken })
      if (!error) return 'signed-in'
      // A classic login also has an access token the Edge Function can check; use it before giving up.
      if (!result.accessToken?.token) {
        throw new FacebookAppSignInError(/email/i.test(error.message) ? 'no_email' : 'failed', `supabase: ${describe(error)}`)
      }
    }
    if (result.accessToken?.token) {
      await viaEdgeFunction(result.accessToken.token)
      return 'signed-in'
    }
    throw new FacebookAppSignInError('failed', 'facebook: no token returned')
  } finally {
    // The session is Supabase's; do not leave a Facebook one behind in the SDK.
    void FacebookSignIn.signOut().catch(() => undefined)
  }
}
