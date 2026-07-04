import { supabase } from './supabase'
import type { VisitorEventType } from '@/types'

const VISITOR_ID_KEY = 'bitdoin_visitor_id'
const SESSION_ID_KEY = 'bitdoin_session_id'

function getOrCreateId(storage: Storage, key: string): string {
  let id = storage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    storage.setItem(key, id)
  }
  return id
}

export function getVisitorId(): string {
  return getOrCreateId(localStorage, VISITOR_ID_KEY)
}

export function getSessionId(): string {
  return getOrCreateId(sessionStorage, SESSION_ID_KEY)
}

interface TrackOptions {
  path?: string
  label?: string
  metadata?: Record<string, unknown>
}

export function trackEvent(eventType: VisitorEventType, opts: TrackOptions = {}) {
  supabase.from('visitor_events').insert({
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    event_type: eventType,
    path: opts.path ?? null,
    label: opts.label ?? null,
    metadata: opts.metadata ?? null,
    // Analytics must never break the app it's watching.
  }).then(undefined, () => {})
}

// ── Page view + time-on-page tracking ──────────────────────────────────────
// Kept as module state rather than component state: CustomerLayout remounts on
// every route change (each <Route> wraps a fresh instance), which would reset
// a per-component ref before a "previous page" duration could be computed.
let currentPath: string | null = null
let enteredAt = 0

function flushDuration() {
  if (currentPath === null) return
  const durationMs = Math.round(performance.now() - enteredAt)
  if (durationMs > 300) { // ignore near-instant bounces/noise
    trackEvent('page_duration', { path: currentPath, metadata: { duration_ms: durationMs } })
  }
}

export function trackPageView(path: string) {
  if (currentPath === path) return
  flushDuration()
  currentPath = path
  enteredAt = performance.now()
  trackEvent('page_view', { path })
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDuration()
  })
  window.addEventListener('pagehide', flushDuration)
}
