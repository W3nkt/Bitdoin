import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Anonymous performance counters for the admin Health tab (OPS-002,
// migration 122). Each item is an RPC name, a duration and a status class, or
// the dashboard's load time: never arguments, results, names or scores.
// Sent in batches; losing a batch only thins the statistics.

export type MetricItem =
  | { k: 'rpc'; n: string; ms: number; s: number }
  | { k: 'page'; n: 'dashboard_summary'; ms: number }

const FLUSH_AFTER_MS = 60_000
const MAX_BATCH = 100
const queue: MetricItem[] = []
let timer: number | undefined

export function recordMetric(item: MetricItem) {
  if (typeof window === 'undefined') return
  queue.push({ ...item, ms: Math.min(Math.max(Math.round(item.ms), 0), 120_000) })
  if (queue.length >= 50) void flushMetrics()
  else if (timer === undefined) timer = window.setTimeout(() => void flushMetrics(), FLUSH_AFTER_MS)
}

export async function flushMetrics(keepalive = false) {
  window.clearTimeout(timer)
  timer = undefined
  if (!queue.length) return
  const items = queue.splice(0, MAX_BATCH)
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return
  try {
    // Plain fetch so the batch can outlive the page (keepalive) when the tab closes.
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/academic_record_metrics`, {
      method: 'POST',
      keepalive,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_items: items }),
    })
  } catch {
    // Best effort.
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushMetrics(true)
  })
}

let firstDashboard = true

/**
 * NFR-001: time until the dashboard summary (or its empty state) is on
 * screen. On the first page load this counts from navigation start; later
 * visits count from opening the screen. Cached offline copies are skipped.
 */
export function useDashboardTiming(ready: boolean, fromCache: boolean) {
  const openedAt = useRef(typeof performance === 'undefined' ? 0 : performance.now())
  const done = useRef(false)
  useEffect(() => {
    if (!ready || done.current) return
    done.current = true
    if (fromCache) return
    const ms = firstDashboard ? performance.now() : performance.now() - openedAt.current
    firstDashboard = false
    recordMetric({ k: 'page', n: 'dashboard_summary', ms })
  }, [ready, fromCache])
}
