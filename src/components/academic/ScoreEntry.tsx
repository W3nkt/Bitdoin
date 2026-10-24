import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, CloudOff, History, Loader2, Lock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  saveServerDraft, submitScoreEntry, useCorrectLine, useLineRevisions, usePeriods, useScoreEntry,
  type ScoreEntryView, type WireLine,
} from '@/lib/academic/api'
import {
  deleteDraft, dequeueSubmit, draftKey, enqueueSubmit, loadDraft, purgeOtherAccounts, queuedSubmits, saveDraft,
  type DraftLine,
} from '@/lib/academic/drafts'
import { AcademicError } from '@/lib/academic/errors'
import { formatDate } from '@/lib/academic/format'
import { checkScore, normaliseScoreText, plainNumber, type LineStatus, type ScaleRule } from '@/lib/academic/scoreInput'
import { academicKeys } from '@/lib/academic/session'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'

const STATUSES: LineStatus[] = ['scored', 'missing', 'not_applicable', 'exempt']
const AUTOSAVE_MS = 800

/** A failed request that never reached the server (offline, timeout). */
function isNetworkFailure(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  return error instanceof AcademicError && error.code === 'UNKNOWN'
}

function toWire(seId: string, line: DraftLine | undefined, scale: ScaleRule): WireLine | null {
  if (!line?.status) return null
  if (line.status !== 'scored') return { subject_enrolment_id: seId, status: line.status }
  const check = checkScore(line.text, scale)
  return check.ok ? { subject_enrolment_id: seId, status: 'scored', value: String(check.value) } : null
}

/**
 * Monthly score entry (SCORE-001..009): one screen per period, autosaved
 * as a draft on the device and on the server, explicit review and submit,
 * corrections with history once saved.
 */
export function ScoreEntry({ userId, enrolmentId }: { userId: string; enrolmentId: string }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const periods = usePeriods(enrolmentId)

  const choices = periods.data?.periods ?? []
  const firstOpen = choices.find(period => !period.disabled)?.id ?? null
  const periodId = params.get('period') ?? periods.data?.suggested_period_id ?? firstOpen
  const entry = useScoreEntry(enrolmentId, periodId)

  // Shared phones: never show another account's local drafts; send any
  // submissions that were queued while offline.
  useEffect(() => {
    let cancelled = false
    const flush = async () => {
      await purgeOtherAccounts(userId)
      for (const item of await queuedSubmits(userId)) {
        if (cancelled || !navigator.onLine) return
        try {
          await submitScoreEntry(item.enrolmentId, item.periodId, item.lines, item.idempotencyKey)
        } catch (error) {
          if (isNetworkFailure(error)) return
          if (!(error instanceof AcademicError && error.code === 'SCORE_DUPLICATE')) {
            toast.error(academicErrorText(t, error))
          }
        }
        await dequeueSubmit(item.key)
        await deleteDraft(item.key)
        void queryClient.invalidateQueries({ queryKey: academicKeys.all })
      }
    }
    void flush()
    window.addEventListener('online', flush)
    return () => { cancelled = true; window.removeEventListener('online', flush) }
  }, [userId])

  if (periods.isPending) return <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (periods.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, periods.error)} />
  if (!choices.length) return <MyScoresNotice title={t('entry.noPeriods')} />

  return (
    <div className="space-y-5">
      <nav aria-label={t('entry.period')} className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-2">
          {choices.map(period => {
            const label = lo ? period.label_lo : period.label_en
            const selected = period.id === periodId
            return (
              <button
                key={period.id}
                type="button"
                disabled={period.disabled}
                aria-current={selected ? 'true' : undefined}
                onClick={() => setParams(current => { const next = new URLSearchParams(current); next.set('period', period.id); return next }, { replace: true })}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-35',
                  selected ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white ring-slate-200 dark:bg-gray-900 dark:ring-slate-700',
                )}
              >
                {period.period_type === 'monthly' ? label : t('entry.official', { label })}
                {period.state !== 'empty' && (
                  <span className={cn('rounded-full px-1.5 text-[10px] uppercase', selected ? 'bg-white/20' : period.state === 'submitted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200')}>
                    {t(`entry.periodState.${period.state}` as AcademicCopyKey)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {entry.isPending && <div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />}
      {entry.isError && <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, entry.error)} />}
      {entry.data && (entry.data.entry?.state === 'submitted' || entry.data.read_only
        ? <SubmittedView key={entry.data.period.id} view={entry.data} />
        : <DraftForm key={entry.data.period.id} userId={userId} view={entry.data} />)}
    </div>
  )
}

// ─── Draft form ──────────────────────────────────────────────────────────────

function DraftForm({ userId, view }: { userId: string; view: ScoreEntryView }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const queryClient = useQueryClient()
  const scale = view.scale as ScaleRule
  const key = draftKey(userId, view.enrolment_id, view.period.id)
  const periodLabel = lo ? view.period.label_lo : view.period.label_en

  const fromServer = useMemo(() => Object.fromEntries(view.subjects.map(subject => [
    subject.subject_enrolment_id,
    { status: subject.line?.status ?? null, text: subject.line?.status === 'scored' ? plainNumber(subject.line.value) : '' } as DraftLine,
  ])), [view])

  const [lines, setLines] = useState<Record<string, DraftLine>>(fromServer)
  const [reviewing, setReviewing] = useState(false)
  const [sync, setSync] = useState<'idle' | 'saving' | 'saved' | 'local'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const dirty = useRef(false)
  const serverHas = useRef(new Set(view.subjects.filter(s => s.line).map(s => s.subject_enrolment_id)))
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const [retryTick, setRetryTick] = useState(0)

  // A newer unsynced draft on this device wins over the server copy.
  useEffect(() => {
    void loadDraft(key).then(local => {
      if (local && !local.synced) {
        setLines(current => ({ ...current, ...local.lines }))
        dirty.current = true
        setRetryTick(tick => tick + 1)
      }
    })
  }, [key])

  useEffect(() => {
    const retry = () => setRetryTick(tick => tick + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  // Autosave: device first, then the server draft when online (SCORE-005).
  useEffect(() => {
    if (!dirty.current) return
    const timer = window.setTimeout(async () => {
      const snapshot = lines
      await saveDraft({ key, userId, enrolmentId: view.enrolment_id, periodId: view.period.id, lines: snapshot, synced: false, updatedAt: Date.now() })
      if (!navigator.onLine) { setSync('local'); return }
      const wire: WireLine[] = []
      for (const subject of view.subjects) {
        const id = subject.subject_enrolment_id
        const line = toWire(id, snapshot[id], scale)
        if (line) wire.push(line)
        else if (!snapshot[id]?.status && serverHas.current.has(id)) wire.push({ subject_enrolment_id: id, clear: true })
      }
      setSync('saving')
      try {
        await saveServerDraft(view.enrolment_id, view.period.id, wire)
        serverHas.current = new Set(wire.filter(line => !line.clear).map(line => line.subject_enrolment_id))
        await saveDraft({ key, userId, enrolmentId: view.enrolment_id, periodId: view.period.id, lines: snapshot, synced: true, updatedAt: Date.now() })
        setSync('saved')
      } catch (error) {
        if (error instanceof AcademicError && error.code === 'ENTRY_SUBMITTED') {
          void queryClient.invalidateQueries({ queryKey: academicKeys.all })
          return
        }
        setSync(isNetworkFailure(error) ? 'local' : 'idle')
        if (!isNetworkFailure(error)) toast.error(academicErrorText(t, error))
      }
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [lines, retryTick])

  const update = (id: string, change: Partial<DraftLine>) => {
    dirty.current = true
    setLines(current => ({ ...current, [id]: { ...{ status: null, text: '' }, ...current[id], ...change } }))
  }

  const errorFor = (line: DraftLine | undefined) => {
    if (line?.status !== 'scored' || !line.text.trim()) return null
    const check = checkScore(line.text, scale)
    if (check.ok) return null
    if (check.reason === 'not_number') return t('entry.error.number')
    if (check.reason === 'level') return t('entry.error.level', { levels: (scale.levels ?? []).map(level => level.code).join(', ') })
    return scale.step
      ? t('entry.error.rangeStep', { min: plainNumber(scale.min), max: plainNumber(scale.max), step: plainNumber(scale.step) })
      : t('entry.error.range', { min: plainNumber(scale.min), max: plainNumber(scale.max) })
  }

  const invalid = view.subjects.some(subject => errorFor(lines[subject.subject_enrolment_id]))
  const unfilled = view.subjects.filter(subject => !toWire(subject.subject_enrolment_id, lines[subject.subject_enrolment_id], scale)).length

  const submit = async () => {
    const wire = view.subjects.map(subject => toWire(subject.subject_enrolment_id, lines[subject.subject_enrolment_id], scale)).filter((line): line is WireLine => !!line)
    const idempotencyKey = crypto.randomUUID()
    setSubmitting(true)
    // Queued first: if the response is lost, the retry reuses this key.
    await enqueueSubmit({
      key, userId, enrolmentId: view.enrolment_id, periodId: view.period.id, idempotencyKey,
      lines: wire.map(line => ({ subject_enrolment_id: line.subject_enrolment_id, status: line.status!, ...(line.value !== undefined ? { value: String(line.value) } : {}) })),
      createdAt: Date.now(),
    })
    try {
      await submitScoreEntry(view.enrolment_id, view.period.id, wire, idempotencyKey)
      await dequeueSubmit(key)
      await deleteDraft(key)
      toast.success(t('entry.saved', { period: periodLabel }))
    } catch (error) {
      if (isNetworkFailure(error)) {
        toast.toast(t('entry.queued'), 'info', 6000)
        setSubmitting(false)
        return
      }
      await dequeueSubmit(key)
      if (error instanceof AcademicError && error.code === 'SCORE_DUPLICATE') {
        await deleteDraft(key)
        toast.toast(t('entry.duplicate'), 'info')
      } else {
        toast.error(academicErrorText(t, error))
        setSubmitting(false)
        return
      }
    }
    void queryClient.invalidateQueries({ queryKey: academicKeys.all })
  }

  const statusText = (status: LineStatus) => t(`entry.status.${status}` as AcademicCopyKey)

  if (reviewing) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800">
        <h2 className="text-xl font-black">{t('entry.reviewTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{periodLabel} · {t('entry.reviewHint')}</p>
        <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {view.subjects.map(subject => {
            const line = lines[subject.subject_enrolment_id]
            return (
              <li key={subject.subject_enrolment_id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-bold">{lo ? subject.name_lo : subject.name_en}</span>
                <span className={cn('tabular-nums', line?.status === 'scored' ? 'text-lg font-black' : 'text-sm text-slate-500')}>
                  {line?.status === 'scored' ? normaliseScoreText(line.text) : line?.status ? statusText(line.status) : '—'}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="ghost" fullWidth size="lg" disabled={submitting} onClick={() => setReviewing(false)}>{t('entry.backToEdit')}</Button>
          <Button fullWidth size="lg" loading={submitting} onClick={() => void submit()}>{t('entry.confirm')}</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          {scale.family === 'numeric_linear' ? t('entry.scaleHint', { max: plainNumber(scale.max) }) : (scale.levels ?? []).map(level => level.code).join(' · ')}
        </p>
        <SyncBadge state={sync} />
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {view.subjects.map((subject, index) => {
          const id = subject.subject_enrolment_id
          const line = lines[id]
          const name = lo ? subject.name_lo : subject.name_en
          const error = errorFor(line)
          return (
            <li key={id} className="py-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor={`score-${id}`} className="min-w-0 flex-1 truncate px-1 font-bold">{name}</label>
                <input
                  id={`score-${id}`}
                  ref={element => { inputs.current[index] = element }}
                  inputMode={scale.family === 'numeric_linear' ? 'decimal' : 'text'}
                  enterKeyHint={index === view.subjects.length - 1 ? 'done' : 'next'}
                  autoComplete="off"
                  value={line?.status === 'scored' ? line.text : ''}
                  placeholder={line?.status && line.status !== 'scored' ? '—' : ''}
                  aria-invalid={!!error}
                  aria-describedby={error ? `score-error-${id}` : undefined}
                  onChange={event => update(id, { text: event.target.value, status: event.target.value ? 'scored' : null })}
                  onBlur={event => { if (event.target.value) update(id, { text: normaliseScoreText(event.target.value) }) }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      const next = inputs.current[index + 1]
                      if (next) next.focus()
                      else event.currentTarget.blur()
                    }
                  }}
                  className={cn(
                    'w-20 rounded-xl border bg-white px-3 py-2.5 text-right text-lg font-black tabular-nums focus:outline-none focus:ring-2 dark:bg-gray-950',
                    error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-600',
                  )}
                />
                <select
                  aria-label={t('entry.status.label', { subject: name })}
                  value={line?.status ?? 'scored'}
                  onChange={event => {
                    const status = event.target.value as LineStatus
                    update(id, status === 'scored' ? { status: line?.text ? 'scored' : null } : { status, text: '' })
                    if (status === 'scored') inputs.current[index]?.focus()
                  }}
                  className="w-28 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-gray-800 sm:w-36"
                >
                  {STATUSES.map(status => <option key={status} value={status}>{statusText(status)}</option>)}
                </select>
              </div>
              {error && <p id={`score-error-${id}`} className="mt-1 px-1 text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
            </li>
          )
        })}
      </ul>
      {unfilled > 0 && !invalid && <p className="mt-3 px-1 text-xs text-slate-500">{t('entry.unfilled', { count: unfilled })}</p>}
      <Button className="mt-4" fullWidth size="lg" disabled={invalid || unfilled > 0} onClick={() => setReviewing(true)}>{t('entry.review')}</Button>
    </section>
  )
}

function SyncBadge({ state }: { state: 'idle' | 'saving' | 'saved' | 'local' }) {
  const { t } = useAcademicCopy()
  if (state === 'idle') return null
  const content = {
    saving: [<Loader2 key="i" className="h-3.5 w-3.5 animate-spin" />, t('entry.saving')],
    saved: [<CheckCircle2 key="i" className="h-3.5 w-3.5" />, t('entry.savedDraft')],
    local: [<CloudOff key="i" className="h-3.5 w-3.5" />, t('entry.savedLocal')],
  }[state]
  return <span role="status" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-500">{content}</span>
}

// ─── Submitted period: view and correct (SCORE-007/012) ──────────────────────

function SubmittedView({ view }: { view: ScoreEntryView }) {
  const { t, lo, language } = useAcademicCopy()
  const [editing, setEditing] = useState<string | null>(null)
  const [history, setHistory] = useState<string | null>(null)
  const statusText = useCallback((status: LineStatus) => t(`entry.status.${status}` as AcademicCopyKey), [t])

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <p className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-slate-600 dark:text-slate-400">
        {view.read_only ? <><Lock className="h-4 w-4" />{t('entry.readOnly')}</> : view.entry?.submitted_at && <><CheckCircle2 className="h-4 w-4 text-emerald-600" />{t('entry.submittedOn', { date: formatDate(view.entry.submitted_at, language) })}</>}
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {view.subjects.map(subject => {
          const line = subject.line
          const name = lo ? subject.name_lo : subject.name_en
          return (
            <li key={subject.subject_enrolment_id} className="py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate px-1 font-bold">{name}</span>
                {line?.edited && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">{t('entry.edited')}</span>}
                {line && line.verification !== 'self_reported' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">{t('entry.badge.verified')}</span>}
                <span className={cn('tabular-nums', line?.status === 'scored' ? 'text-lg font-black' : 'text-sm text-slate-500')}>
                  {line ? (line.status === 'scored' ? plainNumber(line.value) : statusText(line.status)) : '—'}
                </span>
                {line && !view.read_only && (
                  <button type="button" onClick={() => setEditing(editing === line.id ? null : line.id)} aria-label={t('entry.correctTitle', { subject: name })}
                    className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {line?.edited && (
                  <button type="button" onClick={() => setHistory(history === line.id ? null : line.id)} aria-label={`${t('entry.history')}: ${name}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-gray-800">
                    <History className="h-4 w-4" />
                  </button>
                )}
              </div>
              {line && editing === line.id && <CorrectionForm view={view} name={name} line={line} onDone={() => setEditing(null)} />}
              {line && history === line.id && <RevisionList lineId={line.id} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CorrectionForm({ view, name, line, onDone }: { view: ScoreEntryView; name: string; line: NonNullable<ScoreEntryView['subjects'][number]['line']>; onDone: () => void }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const correct = useCorrectLine()
  const scale = view.scale as ScaleRule
  const [status, setStatus] = useState<LineStatus>(line.status)
  const [text, setText] = useState(line.status === 'scored' ? plainNumber(line.value) : '')
  const [reason, setReason] = useState('')
  const check = status === 'scored' ? checkScore(text, scale) : null

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
      <p className="text-sm font-black">{t('entry.correctTitle', { subject: name })}</p>
      <div className="flex gap-2">
        <input aria-label={name} inputMode="decimal" value={status === 'scored' ? text : ''} disabled={status !== 'scored'}
          onChange={event => setText(event.target.value)}
          className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-right text-lg font-black tabular-nums disabled:opacity-50 dark:border-slate-600 dark:bg-gray-950" />
        <select aria-label={t('entry.status.label', { subject: name })} value={status} onChange={event => setStatus(event.target.value as LineStatus)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-gray-900">
          {STATUSES.map(item => <option key={item} value={item}>{t(`entry.status.${item}` as AcademicCopyKey)}</option>)}
        </select>
      </div>
      {check && !check.ok && text && <p className="text-xs font-bold text-red-600">{t('entry.error.rangeStep', { min: plainNumber(scale.min), max: plainNumber(scale.max), step: plainNumber(scale.step) })}</p>}
      <input aria-label={t('entry.reason')} placeholder={t('entry.reason')} maxLength={120} value={reason} onChange={event => setReason(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-gray-950" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>{t('common.cancel')}</Button>
        <Button size="sm" loading={correct.isPending} disabled={status === 'scored' && !check?.ok}
          onClick={() => correct.mutate({
            lineId: line.id,
            version: line.version,
            line: status === 'scored' && check?.ok ? { status, value: String(check.value) } : { status },
            reason: reason.trim() || undefined,
          }, {
            onSuccess: () => { toast.success(t('entry.corrected')); onDone() },
            onError: error => toast.error(academicErrorText(t, error)),
          })}>
          {t('entry.saveCorrection')}
        </Button>
      </div>
    </div>
  )
}

export function RevisionList({ lineId }: { lineId: string }) {
  const { t, language } = useAcademicCopy()
  const revisions = useLineRevisions(lineId)
  const show = (value: number | string | null, status: string) => (status === 'scored' ? plainNumber(value) : t(`entry.status.${status}` as AcademicCopyKey))
  if (revisions.isPending) return <p className="mt-2 px-1 text-xs text-slate-500">…</p>
  const rows = revisions.data?.revisions ?? []
  return (
    <ul className="mt-2 space-y-1 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60">
      {rows.length === 0 && <li className="text-slate-500">{t('entry.noRevisions')}</li>}
      {rows.map(row => (
        <li key={row.changed_at} className="flex flex-wrap gap-x-2">
          <span className="font-black tabular-nums">{show(row.old_value, row.old_status)} → {show(row.new_value, row.new_status)}</span>
          <span className="text-slate-500">{formatDate(row.changed_at, language)} · {t(`entry.revisionBy.${row.changed_by}` as AcademicCopyKey)}</span>
          {row.reason && <span className="w-full text-slate-600 dark:text-slate-400">“{row.reason}”</span>}
        </li>
      ))}
    </ul>
  )
}
