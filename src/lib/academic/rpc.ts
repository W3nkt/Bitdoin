import { supabase } from '@/lib/supabase'
import { AcademicError, isErrorEnvelope, toAcademicError } from './errors'

/**
 * Calls a My Scores RPC and returns its data, or throws an AcademicError.
 * Student RPCs never take a profile ID: the database resolves the caller
 * from the Supabase session.
 */
export async function callAcademicRpc<T>(fn: `academic_${string}`, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw toAcademicError(error)
  if (isErrorEnvelope(data)) throw toAcademicError(data)
  return data as T
}

/** Client errors (4xx) are answers, not outages: do not retry them. */
export function shouldRetryAcademic(failureCount: number, error: unknown) {
  if (error instanceof AcademicError && error.status < 500) return false
  return failureCount < 1
}
