import { createContext, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Circle, Clock3, Info, XCircle, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AcademicError } from '@/lib/academic/errors'
import { cn } from '@/lib/utils'

// Shared pieces for the My Scores admin screens, styled like the other
// Academy admin pages (English UI; Lao and English fields side by side).

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('grid gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300 [&_input:not([type=checkbox]):not([type=radio])]:rounded-lg [&_input:not([type=checkbox]):not([type=radio])]:border [&_input]:border-slate-200 dark:[&_input]:border-slate-700 [&_input]:bg-white dark:[&_input]:bg-gray-900 [&_input:not([type=checkbox]):not([type=radio])]:px-3 [&_input:not([type=checkbox]):not([type=radio])]:py-2.5 [&_input]:text-sm [&_input]:font-medium [&_input]:outline-none focus-within:[&_input]:border-primary-500 [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 dark:[&_select]:border-slate-700 [&_select]:bg-white dark:[&_select]:bg-gray-900 [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:font-medium [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 dark:[&_textarea]:border-slate-700 [&_textarea]:bg-white dark:[&_textarea]:bg-gray-900 [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:font-medium [&_textarea]:outline-none', className)}>
      {label}
      {children}
      {hint && <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}

/** The open admin section's icon and colour, so every Panel in it carries them. */
export const AdminSection = createContext<{ icon: LucideIcon; color: string } | null>(null)

const PILL_ICONS = { green: CheckCircle2, amber: Clock3, red: XCircle, blue: Info, gray: Circle } as const

export function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'gray' }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300',
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
  const Icon = PILL_ICONS[tone]
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide', tones[tone])}><Icon aria-hidden className="h-3 w-3 shrink-0" />{children}</span>
}

export function Panel({ title, description, actions, icon, children }: { title: string; description?: string; actions?: ReactNode; icon?: LucideIcon; children: ReactNode }) {
  const section = useContext(AdminSection)
  const Icon = icon ?? section?.icon
  const color = section?.color ?? '#6366f1'
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color, backgroundColor: `${color}1f` }}><Icon className="h-5 w-5" /></span>}
          <div className="min-w-0">
            <h2 className="text-lg font-black">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-gray-800/60 dark:text-slate-400"><span aria-hidden className="text-xl">📭</span><span>{children}</span></p>
}

export function IconButton({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300',
        danger ? 'hover:border-red-200 hover:text-red-700 dark:hover:border-red-500/30 dark:hover:text-red-400' : 'hover:border-primary-300 hover:text-primary-700 dark:hover:border-primary-700 dark:hover:text-primary-300')}>
      {children}
    </button>
  )
}

const CODE_TEXT: Record<string, string> = {
  MFA_REQUIRED: 'Verify with your authenticator app first.',
  FORBIDDEN_ROLE: 'Your role cannot do this.',
  NOT_FOUND: 'Not found.',
  LAST_ADMIN: 'Keep at least one admin.',
  FOUR_EYES_REQUIRED: 'Another admin must approve this version.',
  ALREADY_APPROVED: 'Only draft versions can be approved.',
  CALENDAR_EXISTS: 'This school already has a calendar for the year.',
  CALENDAR_NOT_CONFIGURED: 'Set up the national calendar for this year first.',
  BREAK_GLASS_REQUIRED: 'Start an emergency access window first.',
  RATE_LIMITED: 'Too many requests. Wait a minute, then try again.',
  PG_23505: 'That already exists. Codes and names must be unique.',
  PG_23503: 'This is still in use (for example by submitted scores), so it cannot be removed.',
}

/** A message for an admin-screen error, including the database's own reason for validation and check failures. */
export function adminErrorText(error: unknown) {
  if (!(error instanceof AcademicError)) return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  if (error.code === 'VALIDATION_FAILED') {
    // The database sends the reason as the message and the field in details.
    const field = (error.details as { field?: string } | undefined)?.field
    return `${error.message}${field ? ` (${field})` : ''}.`
  }
  if (error.code === 'PG_23514' || error.code === 'PG_22P02' || error.code === 'PG_22007' || error.code === 'PG_22008') {
    return `These values are not allowed: ${error.message}`
  }
  return CODE_TEXT[error.code] ?? error.message ?? 'Something went wrong. Please try again.'
}

/**
 * Confirms an exceptional action with a reason that goes to the audit log.
 * `minLength` matches the database (5 for merges and roles, 10 for break-glass).
 */
export function ReasonDialog({ open, title, body, confirmLabel, minLength = 5, danger, busy, disabled, onCancel, onConfirm }: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  minLength?: number
  danger?: boolean
  busy?: boolean
  /** Holds the confirm button, e.g. until a required tick box in the body is ticked. */
  disabled?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const valid = reason.trim().length >= minLength && reason.trim().length <= 200
  return (
    <Modal open={open} onClose={() => { setReason(''); onCancel() }} title={title} size="md">
      <div className="grid gap-4">
        <div className="text-sm text-slate-700 dark:text-slate-300">{body}</div>
        <Field label="Reason (saved in the audit log)" hint={`${minLength}–200 characters.`}>
          <textarea rows={3} maxLength={200} value={reason} onChange={event => setReason(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setReason(''); onCancel() }}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={!valid || disabled} loading={busy} onClick={() => { onConfirm(reason.trim()); setReason('') }}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Vientiane' }).format(new Date(value))
}
