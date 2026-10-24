import { supabase } from '@/lib/supabase'
import { isIos, isStandalone } from '@/lib/installPrompt'

// Browser / home-screen notifications (Web Push). The service worker shows
// them (public/push-sw.js); send-push (edge function) sends them; each
// device's per-platform switches live in push_subscriptions (migrations 102
// and 120).

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
// Remembers this browser's endpoint so a replaced subscription can be moved
// over to the new one (see syncPushSubscription).
const ENDPOINT_KEY = 'bitdoin.push.endpoint'

export type PushPlatform = 'BOOKSTORE' | 'ACADEMY'
/** A device switch: a platform's notifications, or My Scores reminders. */
export type PushTarget = PushPlatform | 'MY_SCORES'
export type ReminderSlot = 'MORNING' | 'AFTERNOON' | 'EVENING'

/**
 * - unconfigured: no VAPID key in this build (cards stay hidden)
 * - unsupported:  this browser can't receive Web Push
 * - ios-install:  iPhone/iPad Safari; only works after Add to Home Screen
 * - denied:       the person blocked notifications for this site
 * - ready:        permission granted or not asked yet
 */
export type PushSupport = 'unconfigured' | 'unsupported' | 'ios-install' | 'denied' | 'ready'

export interface DevicePushState {
  bookstore_enabled: boolean
  academy_enabled: boolean
  academy_slot: ReminderSlot
  my_scores_enabled: boolean
}

export const pushConfigured = Boolean(VAPID_PUBLIC_KEY)

export function getPushSupport(): PushSupport {
  if (!pushConfigured) return 'unconfigured'
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIos() && !isStandalone()) return 'ios-install'
  if (!capable) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ready'
}

function readStoredEndpoint() {
  try { return localStorage.getItem(ENDPOINT_KEY) } catch { return null }
}

function storeEndpoint(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(ENDPOINT_KEY, endpoint)
    else localStorage.removeItem(ENDPOINT_KEY)
  } catch { /* private mode: sync just won't carry switches over */ }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

/** The service worker registration, or null (e.g. `vite dev`, where none is registered). */
async function getRegistration(timeoutMs = 4000) {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(resolve => window.setTimeout(() => resolve(null), timeoutMs)),
  ])
}

export async function getBrowserSubscription() {
  if (getPushSupport() === 'unconfigured' || !('serviceWorker' in navigator)) return null
  const registration = await getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

function subscriptionKeys(subscription: PushSubscription) {
  const json = subscription.toJSON()
  return { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
}

/** This device's saved switches for the signed-in user, or null if none. */
export async function getDevicePushState(): Promise<DevicePushState | null> {
  const subscription = await getBrowserSubscription()
  if (!subscription) return null
  // '*' so this keeps working if the frontend ships before migration 120.
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()
  if (error) throw error
  return data ? deviceState(data as Partial<DevicePushState>) : null
}

function deviceState(row: Partial<DevicePushState>): DevicePushState {
  return {
    bookstore_enabled: Boolean(row.bookstore_enabled),
    academy_enabled: Boolean(row.academy_enabled),
    academy_slot: (row.academy_slot ?? 'MORNING') as ReminderSlot,
    my_scores_enabled: Boolean(row.my_scores_enabled),
  }
}

async function save(subscription: PushSubscription, platform: PushTarget, enabled: boolean, slot?: ReminderSlot) {
  const keys = subscriptionKeys(subscription)
  const { data, error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent,
    p_platform: platform,
    p_enabled: enabled,
    p_slot: slot ?? null,
  })
  if (error) throw error
  return deviceState(data as Partial<DevicePushState>)
}

/**
 * Turns notifications on for a platform on this device. Must run from a tap or
 * click: browsers (and iOS always) refuse the permission prompt otherwise.
 * Throws Error('denied') if the person says no.
 */
export async function enablePush(platform: PushTarget, slot?: ReminderSlot) {
  if (getPushSupport() !== 'ready') throw new Error('unsupported')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')

  const registration = await getRegistration(10_000)
  if (!registration) throw new Error('no-service-worker')
  const subscription = (await registration.pushManager.getSubscription())
    ?? (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const state = await save(subscription, platform, true, slot)
  storeEndpoint(subscription.endpoint)
  return state
}

/** Turns a switch off on this device; unsubscribes the browser when all are off. */
export async function disablePush(platform: PushTarget) {
  const subscription = await getBrowserSubscription()
  if (!subscription) return null
  const state = await save(subscription, platform, false)
  if (!state.bookstore_enabled && !state.academy_enabled && !state.my_scores_enabled) {
    await subscription.unsubscribe().catch(() => undefined)
    storeEndpoint(null)
  }
  return state
}

export async function setAcademyReminderSlot(slot: ReminderSlot) {
  const subscription = await getBrowserSubscription()
  if (!subscription) throw new Error('not-subscribed')
  return save(subscription, 'ACADEMY', true, slot)
}

/** Asks send-push to send a test notification to all of the caller's devices. */
export async function sendTestPush(platform: PushTarget) {
  const { data, error } = await supabase.functions.invoke('send-push', { body: { action: 'test', platform } })
  if (error) throw error
  return data as { sent: number; failed: number }
}

/**
 * Run once per signed-in session. Browsers sometimes replace a subscription
 * (new endpoint or keys) or drop it; this keeps the database pointing at the
 * current one so the member keeps getting notifications. Never prompts.
 */
export async function syncPushSubscription() {
  if (getPushSupport() !== 'ready' || Notification.permission !== 'granted') return
  const previous = readStoredEndpoint()
  if (!previous) return // Never turned on from this browser.

  const registration = await getRegistration()
  if (!registration) return
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    // Permission is still granted, so re-subscribing does not prompt.
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const keys = subscriptionKeys(subscription)
  const { data: kept } = await supabase.rpc('replace_push_subscription', {
    p_old_endpoint: previous,
    p_endpoint: subscription.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  })
  if (kept) storeEndpoint(subscription.endpoint)
}
