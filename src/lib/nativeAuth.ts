import { Preferences } from '@capacitor/preferences'
import type { SupportedStorage } from '@supabase/supabase-js'

/**
 * Where the system browser sends the person back to the app after a Google,
 * Facebook or Apple sign-in. Registered in ios/App/App/Info.plist and
 * android/app/src/main/AndroidManifest.xml, and it must be listed under
 * Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export const NATIVE_AUTH_REDIRECT = 'store.bitdoin.app://auth/callback'

/**
 * The Supabase session (and the PKCE verifier) in Capacitor Preferences. The
 * WebView's localStorage can be cleared by the OS; Preferences survives.
 */
export const nativeAuthStorage: SupportedStorage = {
  getItem: async key => (await Preferences.get({ key })).value,
  setItem: async (key, value) => { await Preferences.set({ key, value }) },
  removeItem: async key => { await Preferences.remove({ key }) },
}
