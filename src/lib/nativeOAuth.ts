import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { NATIVE_AUTH_REDIRECT } from '@/lib/nativeAuth'

// Google, Facebook and Apple sign-in inside the app. Google refuses to sign
// anyone in from an embedded WebView, so the provider's page opens in the
// system browser (Safari View Controller / Chrome Custom Tabs) and returns to
// the app through NATIVE_AUTH_REDIRECT. Only imported when __NATIVE_BUILD__.

export async function startNativeOAuth(provider: Provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  })
  if (error || !data.url) throw error ?? new Error('No sign-in URL')
  await Browser.open({ url: data.url })
}

async function finishSignIn(url: string) {
  // iOS keeps the in-app browser open until told to close; not available on Android.
  await Browser.close().catch(() => undefined)
  const code = new URL(url).searchParams.get('code')
  if (!code) return // cancelled, or the provider returned an error
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) console.error('[native-oauth]', error.message)
}

/** Install once at startup; finishes a sign-in when the browser returns to the app. */
export function installNativeOAuthListener() {
  void App.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith(NATIVE_AUTH_REDIRECT)) void finishSignIn(url)
  })
  // The app may have been restarted by the redirect itself.
  void App.getLaunchUrl().then(launch => {
    if (launch?.url.startsWith(NATIVE_AUTH_REDIRECT)) void finishSignIn(launch.url)
  })
}
