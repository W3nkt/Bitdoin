import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarCheck, ListChecks, PenLine, Search, Trophy } from 'lucide-react'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useRecommendations, type Recommendation } from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'

const ICONS: Record<Recommendation['kind'], typeof PenLine> = {
  enter_scores: PenLine, diagnostic: ListChecks, practice_set: CalendarCheck, academy_lesson: BookOpen, academy_challenge: Trophy, gap: Search,
}

/**
 * "This week" (LEARN-001): up to three next actions from the rules engine
 * (migration 136), each with its reason, time and action. Hidden when there
 * is nothing to suggest or insights are off.
 */
export function WeekCard() {
  const { t, lo, language } = useAcademicCopy()
  const recommendations = useRecommendations()
  const items = recommendations.data ?? []
  if (items.length === 0) return null

  const text = (en?: string, lao?: string) => (lo ? lao ?? en : en ?? lao) ?? ''
  const title = (item: Recommendation) => {
    if (item.kind === 'enter_scores') return t('week.title.enter', { period: text(item.title_en, item.title_lo) })
    if (item.kind === 'practice_set') return t('week.title.practice', { topic: text(item.title_en, item.title_lo) })
    return text(item.title_en, item.title_lo)
  }
  const reason = (item: Recommendation) => t(`week.reason.${item.reason.code}` as AcademicCopyKey, {
    period: text(item.reason.period_en, item.reason.period_lo),
    subject: text(item.reason.subject_en, item.reason.subject_lo),
    topic: text(item.reason.topic_en, item.reason.topic_lo),
    date: item.reason.date ? formatDate(item.reason.date, language) : '',
  })

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <h2 className="text-lg font-black">{t('week.title')}</h2>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t('week.subtitle')}</p>
      <ol className="mt-3 grid gap-3">
        {items.map(item => {
          const Icon = ICONS[item.kind]
          return (
            <li key={item.key} className="flex flex-wrap items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
              <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700 dark:text-indigo-300" />
              <div className="min-w-[10rem] flex-1">
                <p className="break-words font-bold">{item.kind === 'gap' ? reason(item) : title(item)}</p>
                {item.kind !== 'gap' && <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{reason(item)}</p>}
                {item.est_minutes && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t('week.minutes', { count: item.est_minutes })}</p>}
              </div>
              {item.route && (
                <Link to={item.route}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  {t(`week.action.${item.kind}` as AcademicCopyKey)}<ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
