import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '@/lib/supabase'
import type { DevicePushState, PushTarget, ReminderSlot } from '@/lib/webPush'

// Push notifications inside the iOS / Android apps. Only imported when __NATIVE_BUILD__ (see webPush.ts).
//
// The phone registers with Apple (APNs) or Google (FCM) through Capacitor's push plugin and hands the token
// to save_native_push_device (migration 176), which keeps it in push_subscriptions next to the browsers, with
// the same per-platform switches plus streak/leaderboard and well-being. send-push does the sending.
//
// The permission prompt only ever follows a tap (enableNativePush); everything else here is silent.

const TOKEN_KEY = 'bitdoin.push.nativeToken'
/** Same id as ANDROID_CHANNEL_ID in supabase/functions/send-push/native-push.ts. */
const ANDROID_CHANNEL_ID = 'bitdoin'
const TOKEN_TIMEOUT_MS = 15_000
/** The app tells the server it is open at most this often (migration 176 starts a new session after 15 minutes). */
const TOUCH_EVERY_MS = 5 * 60 * 1000
/** Coming back to the app touches again sooner, but not on every quick switch between apps. */
const TOUCH_MIN_GAP_MS = 60 * 1000

type NativeChannel = 'IOS' | 'ANDROID'
export type NativePermission = 'granted' | 'denied' | 'prompt'

const channel = (): NativeChannel => (Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID')

function readStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* private storage: the token is simply asked for again next launch */ }
}

// ─── Permission ──────────────────────────────────────────────────────────────

export async function nativePermission(): Promise<NativePermission> {
  const { receive } = await PushNotifications.checkPermissions()
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt'
}

// ─── Token ───────────────────────────────────────────────────────────────────

let currentToken: string | null = null
const waiters: Array<{ resolve: (token: string) => void; reject: (error: Error) => void }> = []
let listenersReady: Promise<void> | null = null
let channelReady: Promise<void> | null = null

/** Apple / Google gave this phone a different token: move the saved switches over to it. */
async function followTokenChange(token: string) {
  const previous = readStoredToken()
  if (!previous || previous === token) return
  const { data, error } = await supabase.rpc('replace_native_push_device', { p_old_token: previous, p_token: token, p_channel: channel() })
  if (!error && data) storeToken(token)
}

function ensureListeners() {
  listenersReady ??= Promise.all([
    PushNotifications.addListener('registration', ({ value }) => {
      currentToken = value
      for (const waiter of waiters.splice(0)) waiter.resolve(value)
      void followTokenChange(value).catch(err => console.warn('[native-push] token move failed', err))
    }),
    PushNotifications.addListener('registrationError', ({ error }) => {
      for (const waiter of waiters.splice(0)) waiter.reject(new Error(error))
    }),
  ]).then(() => undefined)
  return listenersReady
}

/** Android 8+ shows a notification only on a channel that exists. */
function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return Promise.resolve()
  channelReady ??= PushNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Bitdoin',
    description: 'Reminders, streaks and new books',
    importance: 4,
    visibility: 1,
    vibration: true,
  }).catch(err => console.warn('[native-push] channel not created', err))
  return channelReady
}

/** Asks the OS for this phone's push token (the permission must already be granted). */
async function requestToken(): Promise<string> {
  await ensureListeners()
  await ensureAndroidChannel()
  if (currentToken) return currentToken
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('no-token')), TOKEN_TIMEOUT_MS)
    const waiter = {
      resolve: (token: string) => { window.clearTimeout(timer); resolve(token) },
      reject: (error: Error) => { window.clearTimeout(timer); reject(error) },
    }
    waiters.push(waiter)
    // Android without google-services.json fails here; the caller treats it as "not available".
    PushNotifications.register().catch(error => waiter.reject(error instanceof Error ? error : new Error(String(error))))
  })
}

// ─── Saving switches ─────────────────────────────────────────────────────────

async function appVersion() {
  const info = await App.getInfo().catch(() => null)
  return info ? `${info.version} (${info.build})` : null
}

async function save(token: string, platform: PushTarget, enabled: boolean, slot?: ReminderSlot): Promise<Partial<DevicePushState>> {
  const { data, error } = await supabase.rpc('save_native_push_device', {
    p_token: token,
    p_channel: channel(),
    p_platform: platform,
    p_enabled: enabled,
    p_slot: slot ?? null,
    p_app_version: await appVersion(),
    p_user_agent: navigator.userAgent,
  })
  if (error) throw error
  return data as Partial<DevicePushState>
}

/** This phone's saved switches for the signed-in member, or null if none. */
export async function getNativeDeviceState(): Promise<Partial<DevicePushState> | null> {
  const token = readStoredToken()
  if (!token) return null
  const { data, error } = await supabase.rpc('get_native_push_device', { p_token: token, p_channel: channel() })
  if (error) throw error
  // No row for this member (all switches off, or another account's phone): stop reporting the app as open.
  if (!data) storeToken(null)
  return (data as Partial<DevicePushState> | null) ?? null
}

/**
 * Turns notifications on for a platform on this phone. Must run from a tap: the first call shows the system
 * permission prompt. Throws Error('denied') if the person says no (or already said no in the phone's settings).
 */
export async function enableNativePush(platform: PushTarget, slot?: ReminderSlot) {
  let permission = await nativePermission()
  if (permission === 'prompt') {
    const asked = await PushNotifications.requestPermissions()
    permission = asked.receive === 'granted' ? 'granted' : 'denied'
  }
  if (permission !== 'granted') throw new Error('denied')

  const token = await requestToken()
  const state = await save(token, platform, true, slot)
  storeToken(token)
  return state
}

export async function disableNativePush(platform: PushTarget) {
  const token = readStoredToken() ?? currentToken
  if (!token) return null
  return save(token, platform, false)
}

export async function setNativeAcademySlot(slot: ReminderSlot) {
  const token = readStoredToken()
  if (!token) throw new Error('not-subscribed')
  return save(token, 'ACADEMY', true, slot)
}

/** Signing out: stop this phone getting the previous member's notifications. */
export async function removeNativeDevice() {
  const token = readStoredToken()
  if (!token) return
  storeToken(null)
  await supabase.rpc('remove_native_push_device', { p_token: token, p_channel: channel() })
}

// ─── Keeping the server up to date ───────────────────────────────────────────

let lastTouch = 0

/** Tells the server the app is open right now (for streak, comeback and well-being nudges). */
export async function touchNativeDevice(force = false) {
  const token = readStoredToken()
  const minGap = force ? TOUCH_MIN_GAP_MS : TOUCH_EVERY_MS - 1000
  if (!token || Date.now() - lastTouch < minGap) return
  lastTouch = Date.now()
  await supabase.rpc('touch_push_device', { p_token: token, p_channel: channel(), p_app_version: await appVersion() })
}

/**
 * Run once per signed-in session. Notices a changed permission, asks the OS for the current token (it can
 * change) and moves the saved switches to it. Never prompts. Returns whether the permission is denied.
 */
export async function syncNativePush() {
  const permission = await nativePermission()
  if (permission !== 'granted' || !readStoredToken()) return permission === 'denied'
  try {
    // The 'registration' listener moves the switches if the token changed.
    await requestToken()
  } catch (err) {
    console.warn('[native-push] could not refresh the token', err)
  }
  await touchNativeDevice(true).catch(() => undefined)
  return false
}

// ─── Notifications arriving ──────────────────────────────────────────────────

export interface NativePushHandlers {
  /** The app was open when the notification arrived: the system shows nothing, so the app does. */
  onForeground(notification: { title: string; body: string; url: string | null }): void
  /** The person tapped a notification (also when it started the app). */
  onOpen(url: string): void
}

/** Only paths inside the app; a notification must never send the app anywhere else. */
function safeUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
}

export async function installNativePushHandlers(handlers: NativePushHandlers) {
  const received = await PushNotifications.addListener('pushNotificationReceived', notification => {
    handlers.onForeground({ title: notification.title ?? '', body: notification.body ?? '', url: safeUrl(notification.data?.url) })
  })
  const tapped = await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = safeUrl(notification.data?.url)
    if (url) handlers.onOpen(url)
  })
  return () => {
    void received.remove()
    void tapped.remove()
  }
}

/** Calls back with true whenever the app comes to the front and false when it goes away. */
export async function watchAppActive(onChange: (active: boolean) => void) {
  const listener = await App.addListener('appStateChange', ({ isActive }) => onChange(isActive))
  return () => { void listener.remove() }
}
