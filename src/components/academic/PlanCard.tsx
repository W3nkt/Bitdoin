import { Link } from 'react-router-dom'
import { CalendarClock, Camera, Crown, Sparkles } from 'lucide-react'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useEntitlements, useOcrStatus } from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { PrivacyCard } from './Privacy'

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days until Premium ends when that is 7 days or fewer (NOTIF-005), else null. */
export function premiumDaysLeft(until: string | null | undefined, nowMs = Date.now()) {
  if (!until) return null
  const left = new Date(until).getTime() - nowMs
  return left > 0 && left <= 7 * DAY_MS ? Math.ceil(left / DAY_MS) : null
}

/** "Your plan" in My data (P3-BIL #51): tier, end date, this month's scans. */
export function PlanCard() {
  const { t, language } = useAcademicCopy()
  const plan = useEntitlements()
  const ocr = useOcrStatus()
  if (!plan.data) return null
  const { premium, features } = plan.data
  const scans = features.ocr_upload?.quota
  return (
    <PrivacyCard icon={<Sparkles className="h-5 w-5" />} title={t('plan.title')} color="#d59627">
      <p className="flex items-center gap-2 font-black"><span aria-hidden className="text-xl">{premium.active ? '👑' : '🌱'}</span><span>
        {!premium.active ? t('plan.free')
          : premium.source === 'family_plan' ? t('plan.familyUntil', { date: premium.until ? formatDate(premium.until, language) : '—' })
          : premium.until ? t('plan.premiumUntil', { date: formatDate(premium.until, language) }) : t('plan.premiumOpen')}
        </span>
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{premium.active ? t('plan.keepData') : t('plan.freeBody')}</p>
      {ocr.data?.available && scans && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"><Camera aria-hidden className="h-4 w-4" />{t('plan.scans', { remaining: scans.remaining, limit: scans.limit })}</p>
      )}
      <PremiumEndingNotice />
      {!premium.active && (
        <Link to="/academy/subscription" className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
          <Crown aria-hidden className="h-4 w-4" />{t('premium.see')}
        </Link>
      )}
    </PrivacyCard>
  )
}

/** NOTIF-005: in the last 7 days of Premium, when it ends and a way to renew. */
export function PremiumEndingNotice() {
  const { t, language } = useAcademicCopy()
  const plan = useEntitlements()
  // A family plan is renewed by the guardian, so the child gets no renewal notice.
  const until = plan.data?.premium.active && plan.data.premium.source !== 'family_plan' ? plan.data.premium.until : null
  const days = premiumDaysLeft(until)
  if (!until || days === null) return null
  const date = formatDate(until, language)
  return (
    <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
      <CalendarClock aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-[12rem] flex-1">{days === 1 ? t('plan.endsTomorrow', { date }) : t('plan.endsSoon', { count: days, date })} {t('plan.keepData')}</span>
      <Link to="/academy/subscription" className="rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-amber-300 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:ring-amber-500/40 dark:hover:bg-amber-500/20">
        {t('plan.renew')}
      </Link>
    </div>
  )
}
