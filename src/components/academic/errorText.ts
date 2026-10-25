import type { AcademicCopyKey } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'

const CODE_TEXT: Partial<Record<string, AcademicCopyKey>> = {
  RATE_LIMITED: 'state.error.rateLimited',
  NOTICE_OUTDATED: 'error.noticeOutdated',
  VERSION_CONFLICT: 'error.versionConflict',
  CALENDAR_NOT_CONFIGURED: 'error.calendarMissing',
  SCALE_NOT_CONFIGURED: 'error.calendarMissing',
  PILOT_CODE_REQUIRED: 'pilot.error.required',
  PILOT_CODE_INVALID: 'pilot.error.invalid',
  PILOT_FULL: 'pilot.error.full',
  QUIZ_UNAVAILABLE: 'quiz.error.unavailable',
  PRACTICE_UNAVAILABLE: 'practice.error.unavailable',
  QUIZ_CLOSED: 'quiz.error.closed',
  QUIZ_UNANSWERED: 'quiz.unanswered',
}

/** A student-facing message for any My Scores error. */
export function academicErrorText(t: (key: AcademicCopyKey) => string, error: unknown) {
  const key = error instanceof AcademicError ? CODE_TEXT[error.code] : undefined
  return t(key ?? 'error.generic')
}

/** The form field a VALIDATION_FAILED error points at, if any. */
export function errorField(error: unknown): string | null {
  if (!(error instanceof AcademicError)) return null
  const details = error.details as { field?: unknown } | undefined
  return typeof details?.field === 'string' ? details.field : null
}
