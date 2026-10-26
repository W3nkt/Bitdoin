import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, Camera, Download, KeyRound, LogIn, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  exportMyData, useCancelDeletion, useDeleteOcrPhoto, useGrantOptionalConsent, useGrantUsageStatistics, useOcrPhotos, useRequestDeletion, useWithdrawConsent, type MyDataSummary,
} from '@/lib/academic/api'
import { useAcademicSession } from '@/lib/academic/session'
import { useTrackUsage } from '@/lib/academic/usageEvents'
import { AcademicError } from '@/lib/academic/errors'
import { downloadExport } from '@/lib/academic/exportZip'
import { formatDate } from '@/lib/academic/format'
import { cn } from '@/lib/utils'
import { academicErrorText } from './errorText'

/** Shared card frame, matching the other My data cards. */
export function PrivacyCard({ icon, title, children, tone = 'default' }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone?: 'default' | 'warn' }) {
  return (
    <section className={cn('rounded-3xl p-6 shadow-sm ring-1', tone === 'warn'
      ? 'bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30'
      : 'bg-white ring-slate-200 dark:bg-gray-900 dark:ring-slate-800')}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">{icon}</span>
        <h2 className="flex-1 text-lg font-black">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ─── Deletion pending (PRIV-005) ─────────────────────────────────────────────

export function DeletionPending({ deletion }: { deletion: MyDataSummary['deletion'] }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const cancel = useCancelDeletion()
  if (deletion.status !== 'deletion_pending' || !deletion.deletion_scheduled_for) return null
  const date = formatDate(deletion.deletion_scheduled_for, language)
  return (
    <PrivacyCard icon={<CalendarClock className="h-5 w-5" />} title={t('privacy.pending.title')} tone="warn">
      <p className="text-sm font-bold">{t(deletion.deletion_scope === 'scores' ? 'privacy.pending.scores' : 'privacy.pending.profile', { date })}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('privacy.pending.readOnly')}</p>
      <Button className="mt-4" variant="outline" loading={cancel.isPending}
        onClick={() => cancel.mutate(undefined, {
          onSuccess: () => toast.success(t('privacy.pending.cancelled')),
          onError: error => toast.error(academicErrorText(t, error)),
        })}>
        {t('privacy.pending.cancel')}
      </Button>
    </PrivacyCard>
  )
}

// ─── Consents (PRIV-003) ─────────────────────────────────────────────────────

export function ConsentChoices({ consents }: { consents: MyDataSummary['consents'] }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const withdraw = useWithdrawConsent()
  const grantStats = useGrantUsageStatistics()
  const grantOptional = useGrantOptionalConsent()
  const noticeVersion = useAcademicSession().data?.notice_version ?? null
  const [confirming, setConfirming] = useState(false)
  const active = (purpose: string) => consents.find(consent => consent.purpose === purpose && !consent.withdrawn_at)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  const module = active('module_processing')
  const push = active('push')
  const stats = active('usage_statistics')
  const ocr = active('ocr_processing')
  const coachReview = active('coach_review')

  const row = (purpose: string, current: NonNullable<typeof module>, action: React.ReactNode) => (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span>
        <span className="block font-bold">{t(`consent.purpose.${purpose}` as AcademicCopyKey)}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {t('data.consentActive', { date: formatDate(current.granted_at, language) })}
        </span>
      </span>
      {action}
    </li>
  )

  return (
    <PrivacyCard icon={<KeyRound className="h-5 w-5" />} title={t('data.consents')}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {module && row('module_processing', module, (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>{t('privacy.withdraw')}</Button>
        ))}
        {/* Device reminders are turned on from Reminder settings (#27). */}
        {push && row('push', push, (
          <Button size="sm" variant="ghost" loading={withdraw.isPending} onClick={() => withdraw.mutate('push', { onError })}>{t('privacy.withdraw')}</Button>
        ))}
        {/* Score-book scanning (migration 139): given on the first scan, withdrawn here. */}
        {ocr && row('ocr_processing', ocr, (
          <Button size="sm" variant="ghost" loading={withdraw.isPending} onClick={() => withdraw.mutate('ocr_processing', { onError })}>{t('privacy.withdraw')}</Button>
        ))}
        {/* Usage statistics (migration 124): on with the notice, off and on here at any time. */}
        {module && (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1 basis-56">
              <span className="block font-bold">{t('consent.purpose.usage_statistics')}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">{t('consent.usageStats.body')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {stats ? t('data.consentActive', { date: formatDate(stats.granted_at, language) }) : t('consent.usageStats.off')}
              </span>
            </span>
            {stats
              ? <Button size="sm" variant="ghost" loading={withdraw.isPending} onClick={() => withdraw.mutate('usage_statistics', { onError })}>{t('consent.usageStats.turnOff')}</Button>
              : <Button size="sm" variant="outline" loading={grantStats.isPending} disabled={!noticeVersion}
                  onClick={() => noticeVersion && grantStats.mutate(noticeVersion, { onError })}>{t('consent.usageStats.turnOn')}</Button>}
          </li>
        )}
        {/* Coach chats for reviewers (migration 146): off until the student turns it on. */}
        {module && (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1 basis-56">
              <span className="block font-bold">{t('consent.purpose.coach_review')}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">{t('consent.coachReview.body')}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {coachReview ? t('data.consentActive', { date: formatDate(coachReview.granted_at, language) }) : t('consent.usageStats.off')}
              </span>
            </span>
            {coachReview
              ? <Button size="sm" variant="ghost" loading={withdraw.isPending} onClick={() => withdraw.mutate('coach_review', { onError })}>{t('consent.usageStats.turnOff')}</Button>
              : <Button size="sm" variant="outline" loading={grantOptional.isPending} disabled={!noticeVersion}
                  aria-label={`${t('consent.usageStats.turnOn')}: ${t('consent.purpose.coach_review')}`}
                  onClick={() => noticeVersion && grantOptional.mutate({ purpose: 'coach_review', noticeVersion }, { onError })}>{t('consent.usageStats.turnOn')}</Button>}
          </li>
        )}
      </ul>
      <Link to="/academy/scores/inbox" className="mt-2 inline-block text-sm font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
        {t('inbox.settings.title')}
      </Link>
      {confirming && (
        <div role="alertdialog" aria-labelledby="withdraw-title" className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
          <p id="withdraw-title" className="font-black">{t('privacy.withdrawModuleTitle')}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('privacy.withdrawModuleBody')}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
            <Button size="sm" variant="danger" loading={withdraw.isPending}
              onClick={() => withdraw.mutate('module_processing', { onSuccess: () => setConfirming(false), onError })}>{t('privacy.withdrawConfirm')}</Button>
          </div>
        </div>
      )}
    </PrivacyCard>
  )
}

// ─── Score-book photos (OCR-011) ─────────────────────────────────────────────

/** Photos from score-book scans that are still stored; any can be deleted now. Hidden when there are none. */
export function OcrPhotos() {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const photos = useOcrPhotos()
  const remove = useDeleteOcrPhoto()
  if (!photos.data?.length) return null
  return (
    <PrivacyCard icon={<Camera className="h-5 w-5" />} title={t('scan.photos.title')}>
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">{t('scan.photos.body')}</p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {photos.data.map(photo => (
          <li key={photo.job_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span>
              <span className="block font-bold">{t('scan.photos.taken', { date: formatDate(photo.created_at, language) })}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {photo.delete_after ? t('scan.photos.until', { date: formatDate(photo.delete_after, language) }) : t('scan.photos.kept')}
              </span>
            </span>
            <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} loading={remove.isPending && remove.variables === photo.job_id}
              onClick={() => remove.mutate(photo.job_id, {
                onSuccess: () => toast.success(t('scan.photoDeleted')),
                onError: error => toast.error(academicErrorText(t, error)),
              })}>
              {t('scan.photos.delete')}
            </Button>
          </li>
        ))}
      </ul>
    </PrivacyCard>
  )
}

// ─── Export (PRIV-004) ───────────────────────────────────────────────────────

/** Export and delete need a recent sign-in (PRD §29.6 T3); this sends the student to sign in and back. */
function ReauthNotice({ body }: { body: AcademicCopyKey }) {
  const { t } = useAcademicCopy()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
      <p className="font-black">{t('privacy.delete.reauthTitle')}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(body)}</p>
      <Button className="mt-3" icon={<LogIn className="h-4 w-4" />}
        onClick={async () => { await signOut(); navigate('/auth', { state: { from: '/academy/scores/data' } }) }}>
        {t('privacy.delete.reauthButton')}
      </Button>
    </div>
  )
}

const needsSignIn = (error: unknown) => error instanceof AcademicError && error.code === 'REAUTH_REQUIRED'

export function ExportCard() {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const track = useTrackUsage()
  const [busy, setBusy] = useState(false)
  const [reauth, setReauth] = useState(false)
  return (
    <PrivacyCard icon={<Download className="h-5 w-5" />} title={t('privacy.export.title')}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('privacy.export.body')}</p>
      {reauth ? <ReauthNotice body="privacy.export.reauthBody" /> : (
        <Button className="mt-4" variant="outline" icon={<Download className="h-4 w-4" />} loading={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const data = await exportMyData()
              downloadExport(data, `my-scores-${new Date().toISOString().slice(0, 10)}.zip`)
              track('export_requested', {})
              toast.success(t('privacy.export.done'))
            } catch (error) {
              if (needsSignIn(error)) setReauth(true)
              else toast.error(academicErrorText(t, error))
            } finally {
              setBusy(false)
            }
          }}>
          {t('privacy.export.button')}
        </Button>
      )}
    </PrivacyCard>
  )
}

// ─── Delete (PRIV-005) ───────────────────────────────────────────────────────

export function DeleteCard() {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const request = useRequestDeletion()
  const [scope, setScope] = useState<'scores' | 'profile' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [reauth, setReauth] = useState(false)

  const option = (value: 'scores' | 'profile', title: AcademicCopyKey, body: AcademicCopyKey) => (
    <label className={cn('flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition', scope === value ? 'bg-red-50 ring-red-300 dark:bg-red-500/10 dark:ring-red-500/40' : 'ring-slate-200 dark:ring-slate-700')}>
      <input type="radio" name="delete-scope" value={value} checked={scope === value} onChange={() => { setScope(value); setConfirming(false) }}
        className="mt-1 h-4 w-4 shrink-0 text-red-600 focus:ring-red-500" />
      <span>
        <span className="block font-bold">{t(title)}</span>
        <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{t(body)}</span>
      </span>
    </label>
  )

  return (
    <PrivacyCard icon={<Trash2 className="h-5 w-5" />} title={t('privacy.delete.title')}>
      <div className="space-y-3">
        {option('scores', 'privacy.delete.scores', 'privacy.delete.scoresBody')}
        {option('profile', 'privacy.delete.profile', 'privacy.delete.profileBody')}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('privacy.delete.grace')}</p>

      {reauth ? <ReauthNotice body="privacy.delete.reauthBody" /> : confirming && scope ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={request.isPending}
            onClick={() => request.mutate(scope, {
              onSuccess: () => { setConfirming(false); setScope(null) },
              onError: error => {
                if (needsSignIn(error)) setReauth(true)
                else toast.error(academicErrorText(t, error))
              },
            })}>
            {t('privacy.delete.confirm')}
          </Button>
        </div>
      ) : (
        <Button className="mt-4" variant="outline" disabled={!scope} onClick={() => setConfirming(true)}>{t('privacy.delete.continue')}</Button>
      )}
    </PrivacyCard>
  )
}
