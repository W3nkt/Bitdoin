// "Add to Home Screen" support.
//
// Chrome / Edge (Android and desktop) fire `beforeinstallprompt` once the app
// is installable; keeping that event lets a button open the browser's own
// install dialog with one tap. Apple offers no such API, so on iPhone / iPad
// the user has to use Share → Add to Home Screen (see IosInstallGuide).
//
// Imported for its side effect in main.tsx so the event is caught early.

import { isNativeApp } from '@/lib/native'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

if (typeof window !== 'undefined') {
  // Not calling preventDefault(), so Chrome's own install hints still appear.
  window.addEventListener('beforeinstallprompt', event => {
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** True when a one-tap browser install dialog is available. */
export function canPromptInstall() {
  return deferredPrompt !== null
}

export function wasJustInstalled() {
  return installed
}

/** Opens the browser's install dialog. A saved prompt can only be used once. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredPrompt
  if (!event) return 'unavailable'
  deferredPrompt = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS reports itself as a Mac.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isIpad() {
  return /ipad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Which iOS browser this is; they put the Share button in different places. */
export function iosBrowser(): 'safari' | 'chrome' | 'edge' | 'firefox' | 'other' {
  const ua = navigator.userAgent
  if (/CriOS/i.test(ua)) return 'chrome'
  if (/EdgiOS/i.test(ua)) return 'edge'
  if (/FxiOS/i.test(ua)) return 'firefox'
  if (/Safari/i.test(ua)) return 'safari'
  return 'other'
}

export function isStandalone() {
  // The store app is already "installed": no install prompts, iOS push allowed.
  return isNativeApp()
    || window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
