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
  OCR_UNAVAILABLE: 'scan.error.unavailable',
  OCR_ALLOWANCE_USED: 'scan.error.allowance',
  OCR_NOT_READY: 'scan.failed.body',
  OCR_FAILED: 'scan.failed.body',
  ENTITLEMENT_REQUIRED: 'premium.required',
  CAREER_TOO_FEW_ANSWERS: 'careers.error.tooFew',
  CAREER_RETAKE_TOO_SOON: 'careers.error.tooSoon',
  CAREER_SHORTLIST_FULL: 'careers.error.full',
  GUARDIAN_INVITE_LIMIT: 'guardians.error.limit',
  GUARDIAN_CONSENT_REQUIRED: 'guardians.error.consent',
  GUARDIAN_CODE_INVALID: 'family.error.code',
  GUARDIAN_SELF: 'family.error.self',
  GUARDIAN_ALREADY_LINKED: 'family.error.already',
  CAREER_NOT_STARTED: 'careers.report.needQuestions',
  EMAIL_MISSING: 'family.email.noEmail',
  MOCK_NOT_READY: 'exams.error.notReady',
  MOCK_IN_PROGRESS: 'exams.error.inProgress',
  MOCK_SESSION_CLOSED: 'exams.error.closed',
  EMAIL_CONFIRM_LIMIT: 'family.email.limit',
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
