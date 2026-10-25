import { useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'

// Usage events for product analytics (ANL-001, PRD §32.3; migration 124).
// Every property is a boolean, a bounded number or a value from a fixed list:
// never a score, name or free text. The database checks each event against
// its catalogue, adds the pseudonymous id, grade and province itself, and
// keeps events only while the student's consent allows (see the migration).

type Source = 'academy_menu' | 'profile_link' | 'reminder' | 'direct' | 'other'
type LineStatus = 'scored' | 'missing' | 'not_applicable' | 'exempt'
type ReminderCode = 'score_reminder.first' | 'score_reminder.second'
type None = Record<string, never>

export interface UsageEvents {
  module_session_started: None
  module_landing_viewed: { source: Source }
  onboarding_started: None
  onboarding_step_completed: { step: 'notice' | 'age' | 'details' | 'subjects' | 'goals'; duration_ms: number }
  onboarding_completed: { duration_ms: number; school_listed: boolean }
  profile_created: { source: Source }
  enrolment_transitioned: { type: 'started' | 'promoted' | 'repeated' | 'transferred' | 'left' }
  score_entry_started: { period: string; method: 'manual' }
  score_draft_saved: { lines_filled: number; offline: boolean }
  score_entry_submitted: { period: string; lines_scored: number; lines_status_counts: Partial<Record<LineStatus, number>>; duration_ms: number; method: 'manual' }
  score_line_edited: { reason_given: boolean }
  dashboard_viewed: { has_trend: boolean }
  chart_table_toggled: { chart_id: 'trend' | 'subjects' | 'subject_detail' }
  history_viewed: None
  reminder_shown: { code: ReminderCode }
  reminder_clicked: { code: ReminderCode }
  export_requested: None
  deletion_requested: None
  deletion_cancelled: None
}
export type UsageEventName = keyof UsageEvents

interface QueuedEvent {
  event_id: string
  name: UsageEventName
  occurred_at: string
  locale: 'lo' | 'en'
  platform: 'android' | 'ios' | 'desktop' | 'other'
  app_version: string
  props: Record<string, unknown>
}

const FLUSH_AFTER_MS = 10_000
const MAX_BATCH = 50
const MAX_QUEUE = 200
const SESSION_GAP_MS = 30 * 60_000
const SESSION_KEY = 'academic.usage.lastActivity'
const queue: QueuedEvent[] = []
let timer: number | undefined
// Turned off when the database says this student's events are not kept
// (statistics switched off, consent withdrawn); back on with resumeUsageEvents().
let enabled = true

export const MAX_DURATION_MS = 86_400_000
export const durationSince = (started: number) => Math.min(Math.max(Math.round(performance.now() - started), 0), MAX_DURATION_MS)

function platform(): QueuedEvent['platform'] {
  const agent = navigator.userAgent
  if (/Android/i.test(agent)) return 'android'
  if (/iPhone|iPad|iPod/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) return 'ios'
  return /Mobi/i.test(agent) ? 'other' : 'desktop'
}

function readSession(): number {
  try { return Number(sessionStorage.getItem(SESSION_KEY) ?? 0) } catch { return 0 }
}
function writeSession(now: number) {
  try { sessionStorage.setItem(SESSION_KEY, String(now)) } catch { /* private mode: every page load is a session */ }
}

function enqueue<N extends UsageEventName>(name: N, props: UsageEvents[N], locale: 'lo' | 'en') {
  queue.push({
    event_id: crypto.randomUUID(), name, occurred_at: new Date().toISOString(), locale, platform: platform(), app_version: __APP_BUILD__,
    props: props as Record<string, unknown>,
  })
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
}

export function trackUsage<N extends UsageEventName>(name: N, props: UsageEvents[N], locale: 'lo' | 'en') {
  if (!enabled || typeof window === 'undefined') return
  // A module session starts with the first event after 30 minutes without one.
  const now = Date.now()
  if (now - readSession() > SESSION_GAP_MS && name !== 'module_session_started') enqueue('module_session_started', {}, locale)
  writeSession(now)
  enqueue(name, props, locale)
  if (queue.length >= 20) void flushUsageEvents()
  else if (timer === undefined) timer = window.setTimeout(() => void flushUsageEvents(), FLUSH_AFTER_MS)
}

export function resumeUsageEvents() {
  enabled = true
}

/** Sends queued events now. Resolves true when nothing is left unsent. */
export async function flushUsageEvents(keepalive = false): Promise<boolean> {
  window.clearTimeout(timer)
  timer = undefined
  if (!queue.length || !enabled) return true
  const batch = queue.splice(0, MAX_BATCH)
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return false
  try {
    // Plain fetch so a batch can outlive the page (keepalive) when the tab closes.
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/academic_track_events`, {
      method: 'POST',
      keepalive,
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_events: batch }),
    })
    if (response.ok) {
      const result = await response.json() as { tracking?: boolean } | null
      if (result?.tracking === false) {
        enabled = false
        queue.length = 0
      }
    } else if (response.status >= 500) {
      queue.unshift(...batch) // retried with the same ids; the database ignores repeats
    }
  } catch {
    queue.unshift(...batch) // offline: retry on the next flush
  }
  if (queue.length && enabled && !keepalive) timer = window.setTimeout(() => void flushUsageEvents(), FLUSH_AFTER_MS)
  return queue.length === 0
}

/** Drops unsent events: pre-profile ones must never be sent after the profile exists. */
export function discardUsageEvents() {
  queue.length = 0
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushUsageEvents(true)
  })
}

/** track(name, props) in the student's current language. */
export function useTrackUsage() {
  const { language } = useLanguage()
  return useCallback(<N extends UsageEventName>(name: N, props: UsageEvents[N]) => trackUsage(name, props, language === 'lo' ? 'lo' : 'en'), [language])
}

// Where this visit to Schooling came from; profile_created reuses it.
let landingSource: Source = 'direct'
export const setLandingSource = (source: Source) => { landingSource = source }
export const getLandingSource = () => landingSource
/**
 * ?from=profile_link|reminder when a link says so; otherwise an in-app
 * navigation (the Academy menu) or a direct visit (first page of the tab).
 */
export function landingSourceFrom(search: string): Source {
  const from = new URLSearchParams(search).get('from')
  if (from === 'profile_link' || from === 'reminder') return from
  if (from) return 'other'
  const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
  return index > 0 ? 'academy_menu' : 'direct'
}
