import { useEffect, useMemo, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import ReactCrop, { centerCrop, convertToPixelCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { AlertTriangle, Camera, Check, CheckCircle2, ImageIcon, Keyboard, Loader2, PartyPopper, RotateCw, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  confirmOcrJob, deleteOcrImage, discardOcrJob, processOcrJob, reuseOcrJob, startOcrJob, useGrantConsent, useScoreEntry,
  type OcrField, type OcrJob, type OcrRow, type OcrStatus, type PeriodOption, type ScoreEntryView, type WireLine,
} from '@/lib/academic/api'
import type { DraftLine } from '@/lib/academic/drafts'
import { AcademicError } from '@/lib/academic/errors'
import { formatDate } from '@/lib/academic/format'
import { cropField, loadImage, MAX_SOURCE_BYTES, prepareScan, rotateQuarter, SCAN_TYPES, type PreparedScan } from '@/lib/academic/ocrImage'
import { checkScore, normaliseScoreText, plainNumber, type LineStatus, type ScaleRule } from '@/lib/academic/scoreInput'
import { academicKeys, useAcademicSession } from '@/lib/academic/session'
import { cn } from '@/lib/utils'
import { academicErrorText } from './errorText'
import { CardTitle } from './visuals'

const STATUSES: LineStatus[] = ['scored', 'missing', 'not_applicable', 'exempt']
/** OCR-009: values this sure are carried into the typing form. */
const PREFILL_CONFIDENCE = 0.9

type Stage =
  | { kind: 'consent' }
  | { kind: 'pick'; error?: AcademicCopyKey }
  | { kind: 'adjust'; src: string }
  | { kind: 'duplicate'; scan: PreparedScan; duplicate: { job_id: string; created_at: string } }
  | { kind: 'processing'; scan: PreparedScan; job: OcrJob }
  | { kind: 'failed'; timeout: boolean }
  | { kind: 'review'; scan: PreparedScan | null; job: OcrJob; saved: string[] }
  | { kind: 'done'; scan: PreparedScan | null; job: OcrJob; saved: string[] }

/**
 * Score-book scanning (P2-OCR #48: OCR-001..012). An optional alternative to
 * typing: the photo is checked and compressed on the device, read by the
 * academic-ocr function, and nothing is saved until the student has checked
 * every uncertain value and confirmed (OCR-006).
 */
export function ScanScores({ enrolmentId, periodId, periods, status, onTypeInstead, onSaved }: {
  enrolmentId: string
  periodId: string
  periods: PeriodOption[]
  status: OcrStatus
  onTypeInstead: (periodId: string, prefill: Record<string, DraftLine> | null) => void
  onSaved: (periodId: string) => void
}) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const [stage, setStage] = useState<Stage>(status.consent ? { kind: 'pick' } : { kind: 'consent' })
  const [starting, setStarting] = useState(false)

  // A result that was never confirmed is discarded and its photo deleted when
  // the student leaves (PRIV-006: keep nothing that is not needed).
  const active = useRef<{ jobId: string; confirmed: boolean } | null>(null)
  const urls = useRef<string[]>([])
  useEffect(() => () => {
    urls.current.forEach(url => URL.revokeObjectURL(url))
    const job = active.current
    if (job && !job.confirmed) void abandon(job.jobId)
  }, [])
  const track = (url: string) => { urls.current.push(url); return url }

  const abandon = async (jobId: string) => {
    await discardOcrJob(jobId).catch(() => undefined)
    await deleteOcrImage(jobId).catch(() => undefined)
  }

  const leaveFor = (next: Stage) => {
    const job = active.current
    if (job && !job.confirmed) void abandon(job.jobId)
    active.current = null
    setStage(next)
  }

  const fail = (error: unknown) => {
    if (error instanceof AcademicError && error.code === 'CONSENT_REQUIRED') { setStage({ kind: 'consent' }); return }
    toast.error(academicErrorText(t, error))
    if (error instanceof AcademicError && (error.code === 'OCR_ALLOWANCE_USED' || error.code === 'OCR_UNAVAILABLE')) onTypeInstead(periodId, null)
  }

  const begin = async (scan: PreparedScan, ignoreDuplicate = false) => {
    setStarting(true)
    try {
      const result = await startOcrJob(enrolmentId, scan.phash, ignoreDuplicate)
      if (result.duplicate) setStage({ kind: 'duplicate', scan, duplicate: result.duplicate })
      else if (result.job) {
        active.current = { jobId: result.job.job_id, confirmed: false }
        setStage({ kind: 'processing', scan, job: result.job })
      }
    } catch (error) {
      fail(error)
    } finally {
      setStarting(false)
    }
  }

  const reuse = async (scan: PreparedScan, jobId: string) => {
    setStarting(true)
    try {
      const { job } = await reuseOcrJob(jobId)
      active.current = { jobId: job.job_id, confirmed: false }
      setStage({ kind: 'review', scan, job, saved: [] })
    } catch (error) {
      fail(error)
    } finally {
      setStarting(false)
    }
  }

  const typeInstead = (target: string, prefill: Record<string, DraftLine> | null) => {
    const job = active.current
    if (job && !job.confirmed) void abandon(job.jobId)
    active.current = null
    onTypeInstead(target, prefill)
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      {stage.kind === 'consent' && <ConsentStep onAgreed={() => setStage({ kind: 'pick' })} onDecline={() => onTypeInstead(periodId, null)} />}
      {stage.kind === 'pick' && <PickStep status={status} error={stage.error} onPicked={src => setStage({ kind: 'adjust', src: track(src) })} onError={error => setStage({ kind: 'pick', error })} />}
      {stage.kind === 'adjust' && (
        <AdjustStep src={stage.src} busy={starting} track={track} onRetake={() => setStage({ kind: 'pick' })}
          onUse={scan => { track(scan.url); void begin(scan) }} onError={() => setStage({ kind: 'pick', error: 'scan.pick.unreadable' })} />
      )}
      {stage.kind === 'duplicate' && (
        <div className="space-y-4">
          <CardTitle emoji="🔁" color="#6366f1" title={t('scan.duplicate.title')} />
          <p className="text-slate-700 dark:text-slate-300">{t('scan.duplicate.body', { date: formatDate(stage.duplicate.created_at, language) })}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('scan.duplicate.free')}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" fullWidth size="lg" disabled={starting} onClick={() => void begin(stage.scan, true)}>{t('scan.duplicate.again')}</Button>
            <Button fullWidth size="lg" loading={starting} onClick={() => void reuse(stage.scan, stage.duplicate.job_id)}>{t('scan.duplicate.use')}</Button>
          </div>
        </div>
      )}
      {stage.kind === 'processing' && (
        <ProcessingStep key={stage.job.job_id} scan={stage.scan} job={stage.job}
          onDone={job => setStage({ kind: 'review', scan: stage.scan, job, saved: [] })}
          onFailed={timeout => leaveFor({ kind: 'failed', timeout })}
          onTypeInstead={() => typeInstead(periodId, null)} />
      )}
      {stage.kind === 'failed' && (
        <div role="alert" className="space-y-4">
          <CardTitle icon={AlertTriangle} color="#d97706" title={t('scan.failed.title')} />
          <p className="text-slate-700 dark:text-slate-300">{t(stage.timeout ? 'scan.failed.timeout' : 'scan.failed.body')}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" fullWidth size="lg" icon={<Keyboard className="h-4 w-4" />} onClick={() => typeInstead(periodId, null)}>{t('scan.typeInstead')}</Button>
            <Button fullWidth size="lg" icon={<Camera className="h-4 w-4" />} onClick={() => setStage({ kind: 'pick' })}>{t('scan.tryAnother')}</Button>
          </div>
        </div>
      )}
      {stage.kind === 'review' && (
        <ReviewStep scan={stage.scan} job={stage.job} periods={periods} defaultPeriodId={periodId} saved={stage.saved}
          onConfirmed={(savedPeriod, job) => {
            if (active.current) active.current.confirmed = true
            setStage({ kind: 'done', scan: stage.scan, job, saved: [...stage.saved, savedPeriod] })
          }}
          onTypeInstead={typeInstead} />
      )}
      {stage.kind === 'done' && (
        <DoneStep job={stage.job} periods={periods} saved={stage.saved}
          onAnother={() => setStage({ kind: 'review', scan: stage.scan, job: stage.job, saved: stage.saved })}
          onFinish={() => onSaved(stage.saved[stage.saved.length - 1])} />
      )}
    </section>
  )
}

// ─── Consent (separate opt-in, decision OCR-CONSENT) ─────────────────────────

function ConsentStep({ onAgreed, onDecline }: { onAgreed: () => void; onDecline: () => void }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const grant = useGrantConsent()
  const noticeVersion = useAcademicSession().data?.notice_version ?? null
  return (
    <div className="space-y-4">
      <CardTitle icon={ShieldCheck} color="#10b981" title={t('scan.consent.title')} />
      <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
        <li>{t('scan.consent.provider')}</li>
        <li>{t('scan.consent.review')}</li>
        <li>{t('scan.consent.retention')}</li>
        <li>{t('scan.consent.withdraw')}</li>
      </ul>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="ghost" fullWidth size="lg" disabled={grant.isPending} onClick={onDecline}>{t('scan.consent.notNow')}</Button>
        <Button fullWidth size="lg" loading={grant.isPending} disabled={!noticeVersion}
          onClick={() => noticeVersion && grant.mutate({ purpose: 'ocr_processing', noticeVersion }, {
            onSuccess: onAgreed,
            onError: error => toast.error(academicErrorText(t, error)),
          })}>
          {t('scan.consent.agree')}
        </Button>
      </div>
    </div>
  )
}

// ─── Pick a photo (OCR-001) ──────────────────────────────────────────────────

function PickStep({ status, error, onPicked, onError }: {
  status: OcrStatus; error?: AcademicCopyKey; onPicked: (src: string) => void; onError: (error: AcademicCopyKey) => void
}) {
  const { t } = useAcademicCopy()
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const handle = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const heic = /\.(heic|heif)$/i.test(file.name)
    if (!SCAN_TYPES.includes(file.type) && !heic) return onError('scan.pick.wrongType')
    if (file.size > MAX_SOURCE_BYTES) return onError('scan.pick.tooBig')
    const src = URL.createObjectURL(file)
    try {
      await loadImage(src)
      onPicked(src)
    } catch {
      URL.revokeObjectURL(src)
      onError('scan.pick.unreadable')
    }
  }

  return (
    <div className="space-y-4">
      <CardTitle emoji="📸" color="#0d9488" title={t('scan.pick.title')} />
      <p className="text-slate-700 dark:text-slate-300">{t('scan.pick.tips')}</p>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('scan.remaining', { remaining: status.allowance.remaining, limit: status.allowance.limit })}</p>
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{t(error)}</p>}
      <input ref={camera} type="file" accept={SCAN_TYPES.join(',')} capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={event => void handle(event)} />
      <input ref={gallery} type="file" accept={[...SCAN_TYPES, '.heic', '.heif'].join(',')} className="sr-only" tabIndex={-1} aria-hidden data-testid="scan-file" onChange={event => void handle(event)} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button fullWidth size="lg" icon={<Camera className="h-4 w-4" />} onClick={() => camera.current?.click()}>{t('scan.pick.camera')}</Button>
        <Button variant="outline" fullWidth size="lg" icon={<ImageIcon className="h-4 w-4" />} onClick={() => gallery.current?.click()}>{t('scan.pick.file')}</Button>
      </div>
    </div>
  )
}

// ─── Crop, rotate and check (OCR-002/003) ────────────────────────────────────

function AdjustStep({ src: initial, busy, track, onRetake, onUse, onError }: {
  src: string; busy: boolean; track: (url: string) => string; onRetake: () => void; onUse: (scan: PreparedScan) => void; onError: () => void
}) {
  const { t } = useAcademicCopy()
  const imageRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState(initial)
  const [crop, setCrop] = useState<Crop>()
  const [pixelCrop, setPixelCrop] = useState<PixelCrop>()
  const [working, setWorking] = useState(false)
  const [checked, setChecked] = useState<PreparedScan | null>(null)

  const onLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = event.currentTarget
    const initialCrop = centerCrop(makeAspectCrop({ unit: '%', width: 94 }, width / height, width, height), width, height)
    setCrop(initialCrop)
    setPixelCrop(convertToPixelCrop(initialCrop, width, height))
  }

  const rotate = async () => {
    if (!imageRef.current) return
    setWorking(true)
    try {
      setSrc(track(await rotateQuarter(imageRef.current)))
      setChecked(null)
    } finally {
      setWorking(false)
    }
  }

  const use = async () => {
    if (checked) return onUse(checked)
    const image = imageRef.current
    if (!image) return
    setWorking(true)
    try {
      const sx = image.naturalWidth / image.width
      const sy = image.naturalHeight / image.height
      const area = pixelCrop?.width ? { x: pixelCrop.x * sx, y: pixelCrop.y * sy, width: pixelCrop.width * sx, height: pixelCrop.height * sy } : null
      const scan = await prepareScan(image, area)
      // OCR-003: a failed check is a tip; the student may still continue.
      if (scan.quality.issues.length) setChecked(scan)
      else onUse(scan)
    } catch {
      onError()
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-4">
      <CardTitle emoji="✂️" color="#0ea5e9" title={t('scan.adjust.title')} />
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('scan.adjust.hint')}</p>
      <div className="flex justify-center overflow-hidden rounded-2xl bg-gray-950/95 p-2">
        <ReactCrop crop={crop} onChange={(next: PixelCrop) => { setCrop(next); setChecked(null) }} onComplete={(next: PixelCrop) => setPixelCrop(next)}
          keepSelection minWidth={60} minHeight={40} className="max-w-full">
          <img ref={imageRef} src={src} onLoad={onLoad} alt="" style={{ maxHeight: '55vh', maxWidth: '100%', display: 'block' }} />
        </ReactCrop>
      </div>
      {checked && (
        <ul role="alert" className="space-y-1 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {checked.quality.issues.map(issue => <li key={issue} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t(`scan.quality.${issue}` as AcademicCopyKey)}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" icon={<RotateCw className="h-4 w-4" />} disabled={working || busy} onClick={() => void rotate()}>{t('scan.adjust.rotate')}</Button>
        <Button variant="ghost" icon={<Camera className="h-4 w-4" />} disabled={working || busy} onClick={onRetake}>{t('scan.adjust.retake')}</Button>
        <Button className="ml-auto" size="lg" icon={<Check className="h-5 w-5" />} loading={working || busy} onClick={() => void use()}>{t(checked ? 'scan.adjust.useAnyway' : 'scan.adjust.use')}</Button>
      </div>
    </div>
  )
}

// ─── Processing (OCR-009: 60 s, then a way out) ──────────────────────────────

function ProcessingStep({ scan, job, onDone, onFailed, onTypeInstead }: {
  scan: PreparedScan; job: OcrJob; onDone: (job: OcrJob) => void; onFailed: (timeout: boolean) => void; onTypeInstead: () => void
}) {
  const { t } = useAcademicCopy()
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    let settled = false
    const timer = window.setTimeout(() => { settled = true; onFailed(true) }, (job.timeout_seconds || 60) * 1000)
    const { brightness, sharpness, skew_degrees } = scan.quality
    processOcrJob(job.job_id, scan.base64, { brightness, sharpness, skew_degrees, bytes: scan.bytes })
      .then(result => { if (!settled) { settled = true; window.clearTimeout(timer); if (result.status === 'succeeded') onDone(result); else onFailed(false) } })
      .catch(() => { if (!settled) { settled = true; window.clearTimeout(timer); onFailed(false) } })
  }, [])

  return (
    <div role="status" aria-live="polite" className="space-y-4 py-6 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
      <CardTitle emoji="🔎" color="#8b5cf6" title={t('scan.processing.title')} />
      <p className="text-slate-600 dark:text-slate-400">{t('scan.processing.body')}</p>
      <Button variant="ghost" icon={<Keyboard className="h-4 w-4" />} onClick={onTypeInstead}>{t('scan.typeInstead')}</Button>
    </div>
  )
}

// ─── Review and confirm (OCR-005/006/007/011) ────────────────────────────────

function eligiblePeriods(periods: PeriodOption[], saved: string[]) {
  return periods.filter(period => !period.disabled && period.state !== 'submitted' && !saved.includes(period.id))
}

const monthOf = (period: PeriodOption | undefined) => (period?.period_type === 'monthly' ? Number(period.key.split('-')[1]) || null : null)

function ReviewStep({ scan, job, periods, defaultPeriodId, saved, onConfirmed, onTypeInstead }: {
  scan: PreparedScan | null; job: OcrJob; periods: PeriodOption[]; defaultPeriodId: string; saved: string[]
  onConfirmed: (periodId: string, job: OcrJob) => void
  onTypeInstead: (periodId: string, prefill: Record<string, DraftLine> | null) => void
}) {
  const { t, lo } = useAcademicCopy()
  const extraction = job.extraction
  const columns = extraction?.periods ?? []
  const choices = eligiblePeriods(periods, saved)
  const [target, setTarget] = useState<string | null>(choices.some(p => p.id === defaultPeriodId) ? defaultPeriodId : choices[0]?.id ?? null)
  const targetPeriod = periods.find(period => period.id === target)
  // OCR-007: the column for the chosen month is preselected only when its month was read.
  const guess = useMemo(() => {
    if (columns.length === 1) return 0
    const month = monthOf(periods.find(period => period.id === target))
    const index = columns.findIndex(column => month !== null && column.period_guess.month === month)
    return index >= 0 ? index : null
  }, [columns, target])
  const [column, setColumn] = useState<number | null>(guess)
  useEffect(() => setColumn(guess), [guess])
  const view = useScoreEntry(job.enrolment_id, target)

  if (!extraction || !columns.length) return <p>{t('scan.failed.body')}</p>
  if (!choices.length) return <p className="font-bold">{t('scan.review.noPeriod')}</p>

  const label = (period: PeriodOption) => (lo ? period.label_lo : period.label_en)
  return (
    <div className="space-y-5">
      <div>
        <CardTitle emoji="👀" color="#6366f1" title={t('scan.review.title')} />
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('scan.review.hint')}</p>
      </div>
      <label className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-black">{t('scan.review.period')}</span>
        <select value={target ?? ''} onChange={event => setTarget(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold dark:border-slate-600 dark:bg-gray-950">
          {choices.map(period => <option key={period.id} value={period.id}>{period.period_type === 'monthly' ? label(period) : t('entry.official', { label: label(period) })}</option>)}
        </select>
      </label>
      {columns.length > 1 && targetPeriod && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold">{t('scan.review.column', { count: columns.length, period: label(targetPeriod) })}</legend>
          <div className="flex flex-wrap gap-2">
            {columns.map((item, index) => (
              <button key={index} type="button" aria-pressed={column === index} onClick={() => setColumn(index)}
                className={cn('rounded-full px-4 py-2 text-sm font-bold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  column === index ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white ring-slate-200 dark:bg-gray-900 dark:ring-slate-700')}>
                {item.period_label_raw || t('scan.review.columnN', { n: index + 1 })}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {view.data && column !== null && target && (
        <ReviewForm key={`${target}:${column}`} scan={scan} job={job} view={view.data} rows={columns[column].rows}
          onConfirmed={() => onConfirmed(target, job)}
          onTypeInstead={prefill => onTypeInstead(target, prefill)} />
      )}
      {view.isPending && column !== null && <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}
      {column === null && <Button variant="ghost" icon={<Keyboard className="h-4 w-4" />} onClick={() => onTypeInstead(target ?? defaultPeriodId, null)}>{t('scan.typeInstead')}</Button>}
    </div>
  )
}

interface ReviewField { text: string; status: LineStatus | null; touched: boolean; row: number | null }

const rowValue = (row: OcrRow | undefined) => (row?.score_value ?? null)

function ReviewForm({ scan, job, view, rows, onConfirmed, onTypeInstead }: {
  scan: PreparedScan | null; job: OcrJob; view: ScoreEntryView; rows: OcrRow[]
  onConfirmed: () => void; onTypeInstead: (prefill: Record<string, DraftLine> | null) => void
}) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const queryClient = useQueryClient()
  const scale = view.scale as ScaleRule
  const clear = job.thresholds.clear
  const openedAt = useRef(performance.now())
  const warnings = job.extraction?.warnings ?? []

  // OCR-005: exact and suggested (fuzzy) matches fill a subject; anything else must be chosen or skipped.
  const initial = useMemo(() => {
    const fields: Record<string, ReviewField> = {}
    const owned = new Set(view.subjects.map(subject => subject.subject_enrolment_id))
    const unmatched: number[] = []
    rows.forEach((row, index) => {
      const id = row.subject_match?.subject_enrolment_id
      if (id && owned.has(id) && !fields[id]) {
        const value = rowValue(row)
        fields[id] = { text: value === null ? '' : plainNumber(value), status: value === null ? null : 'scored', touched: false, row: index }
      } else unmatched.push(index)
    })
    for (const subject of view.subjects) fields[subject.subject_enrolment_id] ??= { text: '', status: null, touched: false, row: null }
    return { fields, unmatched }
  }, [rows, view])

  const [fields, setFields] = useState(initial.fields)
  const [assigned, setAssigned] = useState<Record<number, string | null>>(() => Object.fromEntries(initial.unmatched.map(index => [index, null])))
  const [acknowledged, setAcknowledged] = useState(!warnings.includes('multiple_person_blocks'))
  const [keepPhoto, setKeepPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoFor, setPhotoFor] = useState<string | null>(null)

  const update = (id: string, change: Partial<ReviewField>) => setFields(current => ({ ...current, [id]: { ...current[id], ...change, touched: true } }))

  const assign = (index: number, choice: string | null) => {
    const previous = assigned[index]
    setFields(current => {
      const next = { ...current }
      if (previous && previous !== 'skip') next[previous] = { text: '', status: null, touched: false, row: null }
      if (choice && choice !== 'skip') {
        const value = rowValue(rows[index])
        next[choice] = { text: value === null ? '' : plainNumber(value), status: value === null ? null : 'scored', touched: false, row: index }
      }
      return next
    })
    setAssigned(current => ({ ...current, [index]: choice }))
  }

  // Rows the server matched; a row the student assigned is always checked.
  const matchedRows = useMemo(() => new Set(Object.values(initial.fields).map(field => field.row).filter((row): row is number => row !== null)), [initial])
  const needsCheck = (field: ReviewField) => {
    if (field.row === null) return false
    const row = rows[field.row]
    return row.score_confidence < clear || row.subject_match?.method !== 'alias_exact' || row.struck_through || !matchedRows.has(field.row)
  }

  const wire = (id: string, field: ReviewField): WireLine | null => {
    if (!field.status) return null
    if (field.status !== 'scored') return { subject_enrolment_id: id, status: field.status }
    const check = checkScore(field.text, scale)
    return check.ok ? { subject_enrolment_id: id, status: 'scored', value: String(check.value) } : null
  }

  const entries = view.subjects.map(subject => [subject.subject_enrolment_id, fields[subject.subject_enrolment_id]] as const)
  const pending = entries.filter(([, field]) => needsCheck(field) && !field.touched).length
  const unfilled = entries.filter(([id, field]) => !wire(id, field)).length
  const unresolved = Object.values(assigned).filter(choice => choice === null).length
  const ready = acknowledged && pending === 0 && unfilled === 0 && unresolved === 0
  const freeSubjects = view.subjects.filter(subject => fields[subject.subject_enrolment_id].row === null)

  const prefill = () => {
    const lines: Record<string, DraftLine> = {}
    for (const [id, field] of entries) {
      const row = field.row === null ? undefined : rows[field.row]
      const sure = row && row.score_confidence >= PREFILL_CONFIDENCE && row.subject_match?.method === 'alias_exact'
      if ((sure || field.touched) && field.status) lines[id] = { status: field.status, text: field.status === 'scored' ? field.text : '' }
    }
    return Object.keys(lines).length ? lines : null
  }

  const confirm = async () => {
    const lines = entries.map(([id, field]) => wire(id, field)).filter((line): line is WireLine => !!line)
    const audit: OcrField[] = entries.map(([id, field]) => {
      const row = field.row === null ? undefined : rows[field.row]
      const line = wire(id, field)
      const confirmed = line?.status === 'scored' ? Number(line.value) : null
      return {
        subject_enrolment_id: id,
        subject_raw: row?.subject_raw ?? null,
        match_method: row ? (matchedRows.has(field.row as number) ? row.subject_match?.method ?? null : 'student') : null,
        ocr_value: rowValue(row),
        ocr_confidence: row?.score_confidence ?? null,
        confirmed_status: line?.status ?? null,
        confirmed_value: confirmed,
        edited: !row || line?.status !== 'scored' || confirmed !== rowValue(row),
      }
    })
    setSaving(true)
    try {
      await confirmOcrJob({ jobId: job.job_id, periodId: view.period.id, lines, fields: audit, timeToConfirmMs: Math.round(performance.now() - openedAt.current), keepPhoto })
      toast.success(t('entry.saved', { period: lo ? view.period.label_lo : view.period.label_en }))
      void queryClient.invalidateQueries({ queryKey: academicKeys.all })
      onConfirmed()
    } catch (error) {
      toast.error(error instanceof AcademicError && error.code === 'SCORE_DUPLICATE' ? t('entry.duplicate') : academicErrorText(t, error))
      setSaving(false)
    }
  }

  const statusText = (status: LineStatus) => t(`entry.status.${status}` as AcademicCopyKey)

  return (
    <div className="space-y-5">
      {warnings.includes('multiple_person_blocks') && (
        <div role="alert" className="space-y-2 rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="flex items-start gap-2 font-bold"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('scan.review.persons')}</p>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="h-4 w-4" />
            {t('scan.review.personsAck')}
          </label>
        </div>
      )}
      {warnings.includes('struck_through_value_detected') && (
        <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{t('scan.review.struck')}</p>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {view.subjects.map(subject => {
          const id = subject.subject_enrolment_id
          const field = fields[id]
          const row = field.row === null ? undefined : rows[field.row]
          const name = lo ? subject.name_lo : subject.name_en
          const check = needsCheck(field) && !field.touched
          const unread = !!row && rowValue(row) === null && !field.touched
          const invalid = field.status === 'scored' && !!field.text.trim() && !checkScore(field.text, scale).ok
          return (
            <li key={id} className="py-3" data-testid={`review-${id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[8rem] flex-1 px-1">
                  <label htmlFor={`scan-${id}`} className="block break-words font-bold">{name}</label>
                  {row && <span className="block text-xs text-slate-500 dark:text-slate-400">{t('scan.review.read', { text: [row.subject_raw, row.score_raw].filter(Boolean).join(' ') })}</span>}
                  {!row && !field.touched && <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">{t('scan.review.notOnPhoto')}</span>}
                  {check && <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">{t(unread ? 'scan.review.unread' : 'scan.review.check')}</span>}
                </div>
                <input id={`scan-${id}`} inputMode={scale.family === 'numeric_linear' ? 'decimal' : 'text'} autoComplete="off"
                  value={field.status === 'scored' || !field.status ? field.text : ''}
                  placeholder={field.status && field.status !== 'scored' ? '—' : ''}
                  aria-invalid={invalid}
                  onChange={event => update(id, { text: event.target.value, status: event.target.value ? 'scored' : null })}
                  onBlur={event => { if (event.target.value) setFields(current => ({ ...current, [id]: { ...current[id], text: normaliseScoreText(event.target.value) } })) }}
                  className={cn('w-20 rounded-xl border bg-white px-3 py-2.5 text-right text-lg font-black tabular-nums focus:outline-none focus:ring-2 dark:bg-gray-950',
                    invalid ? 'border-red-400 focus:ring-red-200'
                      : check ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300 focus:ring-amber-400 dark:bg-amber-500/10'
                        : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-600')} />
                <select aria-label={t('entry.status.label', { subject: name })} value={field.status ?? 'scored'}
                  onChange={event => {
                    const status = event.target.value as LineStatus
                    update(id, status === 'scored' ? { status: field.text ? 'scored' : null } : { status, text: '' })
                  }}
                  className="w-28 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-gray-800 sm:w-36">
                  {STATUSES.map(status => <option key={status} value={status}>{statusText(status)}</option>)}
                </select>
              </div>
              {(check || (row && scan)) && (
                <div className="mt-2 flex flex-wrap gap-2 px-1">
                  {check && field.status && (
                    <button type="button" onClick={() => update(id, {})}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-500/20 dark:text-amber-100">
                      <Check className="h-3.5 w-3.5" />{t('scan.review.accept')}
                    </button>
                  )}
                  {row && scan && row.bbox && (
                    <button type="button" onClick={() => setPhotoFor(photoFor === id ? null : id)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                      <ImageIcon className="h-3.5 w-3.5" />{t(photoFor === id ? 'scan.review.hidePhoto' : 'scan.review.showPhoto')}
                    </button>
                  )}
                </div>
              )}
              {photoFor === id && row && scan && <FieldCrop scan={scan} bbox={row.bbox} />}
            </li>
          )
        })}
      </ul>

      {initial.unmatched.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <p className="font-black">{t('scan.review.unmatched')}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('scan.review.unmatchedHint')}</p>
          <ul className="space-y-2">
            {initial.unmatched.map(index => {
              const row = rows[index]
              const choice = assigned[index]
              return (
                <li key={index} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[8rem] flex-1 font-bold">{row.subject_raw}{row.score_raw ? ` · ${row.score_raw}` : ''}</span>
                  <select aria-label={`${t('scan.review.chooseSubject')}: ${row.subject_raw}`} value={choice ?? ''} onChange={event => assign(index, event.target.value || null)}
                    className={cn('rounded-xl border bg-white px-2 py-2 text-sm font-bold dark:bg-gray-950', choice === null ? 'border-amber-400 ring-2 ring-amber-300' : 'border-slate-300 dark:border-slate-600')}>
                    <option value="">{t('scan.review.chooseSubject')}</option>
                    {view.subjects.filter(subject => subject.subject_enrolment_id === choice || freeSubjects.includes(subject)).map(subject => (
                      <option key={subject.subject_enrolment_id} value={subject.subject_enrolment_id}>{lo ? subject.name_lo : subject.name_en}</option>
                    ))}
                    <option value="skip">{t('scan.review.skip')}</option>
                  </select>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {job.has_image && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={keepPhoto} onChange={event => setKeepPhoto(event.target.checked)} className="mt-0.5 h-4 w-4" />
          {t('scan.review.keepPhoto')}
        </label>
      )}
      {pending > 0 && <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{t('scan.review.left', { count: pending })}</p>}
      {pending === 0 && unfilled > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{t('entry.unfilled', { count: unfilled })}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="ghost" fullWidth size="lg" icon={<Keyboard className="h-4 w-4" />} disabled={saving} onClick={() => onTypeInstead(prefill())}>{t('scan.typeInstead')}</Button>
        <Button fullWidth size="lg" icon={<CheckCircle2 className="h-5 w-5" />} loading={saving} disabled={!ready} onClick={() => void confirm()}>{t('scan.review.confirm')}</Button>
      </div>
    </div>
  )
}

function FieldCrop({ scan, bbox }: { scan: PreparedScan; bbox: OcrRow['bbox'] }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined)
  useEffect(() => { void cropField(scan, bbox).then(setSrc).catch(() => setSrc(null)) }, [scan, bbox])
  if (src === undefined) return <div className="mt-2 h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
  if (!src) return null
  return <img src={src} alt="" className="mt-2 max-h-48 max-w-full rounded-xl ring-1 ring-slate-200 dark:ring-slate-700" />
}

// ─── Saved ───────────────────────────────────────────────────────────────────

function DoneStep({ job, periods, saved, onAnother, onFinish }: {
  job: OcrJob; periods: PeriodOption[]; saved: string[]; onAnother: () => void; onFinish: () => void
}) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const [hasImage, setHasImage] = useState(job.has_image)
  const [deleting, setDeleting] = useState(false)
  const last = periods.find(period => period.id === saved[saved.length - 1])
  const more = (job.extraction?.periods.length ?? 0) > saved.length && eligiblePeriods(periods, saved).length > 0

  const remove = async () => {
    setDeleting(true)
    try {
      await deleteOcrImage(job.job_id)
      setHasImage(false)
      toast.success(t('scan.photoDeleted'))
    } catch (error) {
      toast.error(academicErrorText(t, error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-black"><CheckCircle2 className="h-6 w-6 text-emerald-600" />
        {t('scan.done.title', { period: last ? (lo ? last.label_lo : last.label_en) : '' })}
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        {more && <Button variant="outline" fullWidth size="lg" icon={<Camera className="h-4 w-4" />} onClick={onAnother}>{t('scan.done.another')}</Button>}
        <Button fullWidth size="lg" icon={<PartyPopper className="h-5 w-5" />} onClick={onFinish}>{t('scan.done.finish')}</Button>
      </div>
      {hasImage && (
        <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} loading={deleting} onClick={() => void remove()}>{t('scan.deletePhoto')}</Button>
      )}
    </div>
  )
}
