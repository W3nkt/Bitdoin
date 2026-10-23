import type { PostgrestError } from '@supabase/supabase-js'

// Error contract for My Scores RPCs (PRD §27.3). The database raises
// SQLSTATE PT<status> with the code as the message (migration 111), and
// returns {"error": {...}} as data for denied object access so the denial
// can still be audited. Both arrive here as an AcademicError.

export type AcademicErrorCode =
  | 'UNAUTHENTICATED'
  | 'MODULE_DISABLED'
  | 'PROFILE_REQUIRED'
  | 'PROFILE_READ_ONLY'
  | 'CONSENT_REQUIRED'
  | 'FORBIDDEN_ROLE'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'SCORE_OUT_OF_RANGE'
  | 'PERIOD_IN_FUTURE'
  | 'SUBJECT_LIMIT'
  | 'SCORE_DUPLICATE'
  | 'VERSION_CONFLICT'
  | 'RATE_LIMITED'
  | 'UNKNOWN'

export class AcademicError extends Error {
  readonly code: AcademicErrorCode | string
  readonly status: number
  readonly details: unknown

  constructor(code: AcademicErrorCode | string, status: number, message?: string, details?: unknown) {
    super(message ?? code)
    this.name = 'AcademicError'
    this.code = code
    this.status = status
    this.details = details
  }
}

interface ErrorEnvelope {
  error: { code: string; status?: number; message?: string; details?: unknown }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== 'object' || !('error' in value)) return false
  const error = (value as { error: unknown }).error
  return !!error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
}

function parseDetails(hint: string | null | undefined): unknown {
  if (!hint) return undefined
  try {
    return JSON.parse(hint)
  } catch {
    return hint
  }
}

export function toAcademicError(error: unknown): AcademicError {
  if (error instanceof AcademicError) return error

  if (isErrorEnvelope(error)) {
    const { code, status, message, details } = error.error
    return new AcademicError(code, status ?? 400, message, details)
  }

  const pgError = error as Partial<PostgrestError> | null
  const sqlState = pgError?.code ?? ''
  const custom = /^PT(\d{3})$/.exec(sqlState)
  if (custom && pgError?.message) {
    return new AcademicError(pgError.message, Number(custom[1]), pgError.details ?? undefined, parseDetails(pgError.hint))
  }
  // Expired or invalid JWT, rejected by PostgREST before the RPC runs.
  if (sqlState === 'PGRST301' || sqlState === 'PGRST302') {
    return new AcademicError('UNAUTHENTICATED', 401, pgError?.message)
  }
  if (sqlState === '42501') {
    return new AcademicError('FORBIDDEN_ROLE', 403, pgError?.message)
  }

  const message = error instanceof Error ? error.message : pgError?.message
  return new AcademicError('UNKNOWN', 500, message)
}
