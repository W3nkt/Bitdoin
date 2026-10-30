import { Capacitor } from '@capacitor/core'

/**
 * True inside the iOS / Android app (Capacitor), false in every browser,
 * installed PWA included. Gate native-only behaviour on this so the web build
 * keeps working exactly as before.
 */
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}
