import { supabase } from '@/lib/supabase'
import { AcademicError, isErrorEnvelope, toAcademicError } from './errors'
import { recordMetric } from './telemetry'

/**
 * Calls a My Scores RPC and returns its data, or throws an AcademicError.
 * Student RPCs never take a profile ID: the database resolves the caller
 * from the Supabase session.
 */
export async function callAcademicRpc<T>(fn: `academic_${string}`, args?: Record<string, unknown>): Promise<T> {
  const started = performance.now()
  const { data, error } = await supabase.rpc(fn, args)
  const failure = error ? toAcademicError(error) : isErrorEnvelope(data) ? toAcademicError(data) : null
  // Health metrics (migration 122): name, time and status class only.
  recordMetric({ k: 'rpc', n: fn, ms: performance.now() - started, s: failure ? statusOf(failure, error) : 200 })
  if (failure) throw failure
  return data as T
}

/**
 * The error's HTTP-like status. 0 = the request never reached the server
 * (offline); a timeout (our 15 s abort) counts as 504, a server failure.
 */
function statusOf(failure: AcademicError, raw: unknown) {
  const message = raw && typeof raw === 'object' && 'message' in raw ? String((raw as { message: unknown }).message) : ''
  if (failure.code === 'UNKNOWN' && /abort/i.test(message)) return 504
  if (failure.code === 'UNKNOWN' && /fetch|network/i.test(message)) return 0
  return failure.status
}

/** Client errors (4xx) are answers, not outages: do not retry them. */
export function shouldRetryAcademic(failureCount: number, error: unknown) {
  if (error instanceof AcademicError && error.status < 500) return false
  return failureCount < 1
}
