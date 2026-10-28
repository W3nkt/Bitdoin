import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarCheck, Clock3, ListChecks, PenLine, Search, Trophy } from 'lucide-react'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useRecommendationFeedback, useRecommendations, type Recommendation } from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { useToast } from '@/components/ui/Toast'
import { PremiumNote } from './PremiumNote'
import { academicErrorText } from './errorText'
import { CardTitle } from './visuals'

const ICONS: Record<Recommendation['kind'], { icon: typeof PenLine; color: string }> = {
  enter_scores: { icon: PenLine, color: '#6366f1' },
  diagnostic: { icon: ListChecks, color: '#8b5cf6' },
  practice_set: { icon: CalendarCheck, color: '#f97316' },
  academy_lesson: { icon: BookOpen, color: '#0ea5e9' },
  academy_challenge: { icon: Trophy, color: '#eab308' },
  gap: { icon: Search, color: '#64748b' },
}
const FEEDBACK = { done: '✅', not_now: '⏰', not_helpful: '👎' } as const

/**
 * "This week" (LEARN-001): up to three next actions from the rules engine
 * (migration 136), each with its reason, time and action. Hidden when there
 * is nothing to suggest or insights are off.
 */
export function WeekCard() {
  const { t, lo, language } = useAcademicCopy()
  const recommendations = useRecommendations()
  const feedback = useRecommendationFeedback()
  const toast = useToast()
  const items = recommendations.data?.items ?? []
  const moreLocked = recommendations.data?.moreLocked ?? 0
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
      <CardTitle emoji="🗓️" color="#f97316" title={t('week.title')} info={t('week.subtitle')} />
      <ol className="mt-3 grid gap-3">
        {items.map(item => {
          const { icon: Icon, color } = ICONS[item.kind]
          return (
            <li key={item.key} className="flex flex-wrap items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color, backgroundColor: `${color}1f` }}><Icon className="h-5 w-5" /></span>
              <div className="min-w-[10rem] flex-1">
                <p className="break-words font-bold">{item.kind === 'gap' ? reason(item) : title(item)}</p>
                {item.kind !== 'gap' && <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{reason(item)}</p>}
                {item.est_minutes && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-slate-400 dark:ring-slate-700"><Clock3 aria-hidden className="h-3.5 w-3.5" />{t('week.minutes', { count: item.est_minutes })}</p>}
              </div>
              {item.route && (
                <Link to={item.route}
                  // LEARN-007: Academy pages show a way back to Schooling.
                  state={item.kind === 'academy_lesson' || item.kind === 'academy_challenge' ? { returnTo: '/academy/scores' } : undefined}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  {t(`week.action.${item.kind}` as AcademicCopyKey)}<ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              )}
              {item.kind !== 'gap' && (
                <div role="group" aria-label={t('week.feedback.label', { title: title(item) })} className="flex w-full flex-wrap gap-1.5 pl-[3.25rem]">
                  {(['done', 'not_now', 'not_helpful'] as const).map(response => (
                    <button key={response} type="button" disabled={feedback.isPending}
                      onClick={() => feedback.mutate({ key: item.key, response }, {
                        onSuccess: () => toast.success(t('week.feedback.thanks')),
                        onError: error => toast.error(academicErrorText(t, error)),
                      })}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-gray-900">
                      <span aria-hidden>{FEEDBACK[response]}</span>{t(`week.feedback.${response}`)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {moreLocked > 0 && <PremiumNote body="premium.week" vars={{ count: moreLocked }} />}
    </section>
  )
}
