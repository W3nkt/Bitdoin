import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleDot, Info, ListChecks, Sparkles, X } from 'lucide-react'
import { formatDate } from '@/lib/academic/format'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { AcademicError } from '@/lib/academic/errors'
import { useAnswerQuizItem, useFinishQuiz, useQuizAttempt, useQuizOffer, useQuizResult, type MasteryBand, type QuizOptionView } from '@/lib/academic/api'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const primary = 'inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-800'

function quizError(t: (key: AcademicCopyKey) => string, error: unknown) {
  return error instanceof AcademicError && error.code === 'NOT_FOUND' ? t('quiz.error.unavailable') : academicErrorText(t, error)
}

/**
 * ANALYSIS-005: on a subject labelled relatively lower, a link to that
 * subject's published diagnostic. Nothing is shown when none exists.
 */
export function QuizOffer({ subjectEnrolmentId, needsAttention }: { subjectEnrolmentId: string; needsAttention: boolean }) {
  const { t, language } = useAcademicCopy()
  const offer = useQuizOffer(subjectEnrolmentId, needsAttention)
  const diagnostic = offer.data?.diagnostic
  if (!needsAttention || !diagnostic) return null
  const { attempt, last_result: last, start_id: startId, retake_from: retakeFrom } = offer.data!
  const label = attempt ? t('quiz.offer.resume', { answered: attempt.answered, total: attempt.total }) : last ? t('quiz.offer.retake') : t('quiz.offer.cta')
  return (
    <section className={card}>
      {/* ANALYSIS-007: both views, no forced conclusion. */}
      {last?.strong && (
        <p role="note" className="mb-4 flex items-start gap-2 rounded-2xl bg-sky-50 p-4 text-sm font-bold text-sky-950 dark:bg-sky-500/10 dark:text-sky-100">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{t('quiz.conflict')}
        </p>
      )}
      <h2 className="flex items-center gap-2 text-lg font-black"><ListChecks aria-hidden className="h-5 w-5 shrink-0" />{t('quiz.offer.cta')}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('quiz.offer.body', { count: diagnostic.items })}</p>
      {!startId && retakeFrom && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('quiz.offer.retakeFrom', { date: formatDate(retakeFrom, language) })}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {startId && (
          <Link to={`/academy/scores/quiz/${startId}`} className={primary}>{label}<ArrowRight aria-hidden className="h-4 w-4" /></Link>
        )}
        {last && <Link to={`/academy/scores/quiz/result/${last.id}`} className={secondary}>{t('quiz.offer.lastResult')}</Link>}
      </div>
    </section>
  )
}

function optionText(option: QuizOptionView, lo: boolean) {
  return !lo && option.text_en ? option.text_en : option.text_lo
}

/** QUIZ-001: one question per screen; every answer is saved; resumable for 7 days. */
export function QuizRunner({ diagnosticId }: { diagnosticId: string }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const navigate = useNavigate()
  const attempt = useQuizAttempt(diagnosticId)
  const answer = useAnswerQuizItem()
  const finish = useFinishQuiz()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!attempt.data || index !== null) return
    setAnswers(attempt.data.answers)
    // Resume at the first question without an answer.
    const next = attempt.data.items.findIndex(item => !attempt.data!.answers[item.id])
    setIndex(next === -1 ? attempt.data.items.length - 1 : next)
  }, [attempt.data, index])

  if (attempt.isPending || index === null) {
    if (attempt.isError) return <MyScoresNotice title={t('quiz.error.unavailable')} body={quizError(t, attempt.error)} action={<Link to="/academy/scores" className={secondary}>{t('quiz.backDashboard')}</Link>} />
    return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  }
  const view = attempt.data!
  const item = view.items[index]
  const total = view.items.length
  const answered = view.items.filter(i => answers[i.id]).length
  const choose = (key: string) => {
    const before = answers[item.id]
    setAnswers(current => ({ ...current, [item.id]: key }))
    answer.mutate({ attemptId: view.attempt_id, itemId: item.id, key }, {
      onError: error => {
        setAnswers(current => { const next = { ...current }; if (before) next[item.id] = before; else delete next[item.id]; return next })
        toast.error(error instanceof AcademicError && error.code === 'QUIZ_CLOSED' ? t('quiz.error.closed') : t('quiz.saveFailed'))
      },
    })
  }
  const stem = !lo && item.stem_en ? item.stem_en : item.stem_lo

  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{lo ? view.diagnostic.title_lo : view.diagnostic.title_en}</p>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm font-black">
          <span>{t('quiz.progress', { n: index + 1, total })}</span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('quiz.topic', { topic: lo ? item.topic.name_lo : item.topic.name_en })}</span>
        </div>
        <div role="progressbar" aria-label={t('quiz.answers')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(answered / total) * 100}%` }} />
        </div>

        <fieldset className="mt-5">
          <legend className="text-lg font-black leading-snug">{stem}</legend>
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label={t('quiz.answers')}>
            {item.options.map(option => {
              const selected = answers[item.id] === option.key
              return (
                <label key={option.key}
                  className={cn('flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-base ring-1 transition-colors focus-within:ring-2 focus-within:ring-amber-500',
                    selected ? 'bg-indigo-50 font-bold ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-gray-800')}>
                  <input type="radio" name={`q-${item.id}`} value={option.key} checked={selected} onChange={() => choose(option.key)} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
                  <span className="font-black">{option.key}.</span>
                  <span className="break-words">{optionText(option, lo)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={secondary} disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <ArrowLeft aria-hidden className="h-4 w-4" />{t('quiz.previous')}
          </button>
          {index < total - 1 ? (
            <button type="button" className={primary} disabled={!answers[item.id]} onClick={() => setIndex(index + 1)}>
              {t('quiz.next')}<ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className={primary} disabled={answered < total || finish.isPending || answer.isPending}
              onClick={() => finish.mutate(view.attempt_id, {
                onSuccess: result => navigate(`/academy/scores/quiz/result/${result.attempt_id}`, { replace: true }),
                onError: error => toast.error(academicErrorText(t, error)),
              })}>
              {t('quiz.finish')}<Check aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
        {index === total - 1 && answered < total && <p className="mt-2 text-right text-xs text-slate-600 dark:text-slate-400">{t('quiz.unanswered')}</p>}
      </section>
      <p className="px-1 text-xs text-slate-600 dark:text-slate-400">{t('quiz.saved')}</p>
    </div>
  )
}

const BAND_ICON: Record<MasteryBand, typeof Check> = { secure: Check, developing: CircleDot, needs_practice: ArrowRight, not_enough: X }

/** QUIZ-002/003: topic bands, then every question with the answer and its explanation. */
export function QuizResult({ attemptId }: { attemptId: string }) {
  const { t, lo } = useAcademicCopy()
  const result = useQuizResult(attemptId)
  if (result.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (result.isError) return <MyScoresNotice title={t('quiz.error.unavailable')} body={quizError(t, result.error)} action={<Link to="/academy/scores" className={secondary}>{t('quiz.backDashboard')}</Link>} />
  const view = result.data
  const text = (lao: string, en: string | null) => (!lo && en ? en : lao)
  // QUIZ-004: the same topic in the previous attempt of this quiz family.
  const before = new Map((view.previous?.topics ?? []).map(topic => [topic.topic_id, topic]))

  return (
    <div className="space-y-4">
      <section className={card}>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{lo ? view.diagnostic.title_lo : view.diagnostic.title_en}</p>
        <h2 className="mt-1 text-lg font-black">{t('quiz.result.title')}</h2>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {view.topics.map(topic => {
            const Icon = BAND_ICON[topic.band]
            return (
              <li key={topic.topic_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="min-w-[8rem] flex-1">
                  <span className="block break-words font-bold">{lo ? topic.name_lo : topic.name_en}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">
                    {t('quiz.result.score', { correct: topic.correct, total: topic.total })}
                    {before.get(topic.topic_id) && ` · ${t('quiz.result.before', { correct: before.get(topic.topic_id)!.correct, total: before.get(topic.topic_id)!.total })}`}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black text-slate-800 ring-1 ring-slate-300 dark:text-slate-100 dark:ring-slate-600">
                  <Icon aria-hidden className="h-3.5 w-3.5" />{t(`quiz.band.${topic.band}`)}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{t('quiz.result.note')}</p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-black">{t('quiz.review.title')}</h2>
        <ol className="mt-3 space-y-4">
          {view.items.map(item => {
            const chosen = item.options.find(option => option.key === item.chosen_key)
            const correct = item.options.find(option => option.key === item.correct_key)
            const explanation = item.explanation_lo ? text(item.explanation_lo, item.explanation_en) : null
            return (
              <li key={item.position} className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('quiz.progress', { n: item.position, total: view.items.length })} · {lo ? item.topic.name_lo : item.topic.name_en}</p>
                <p className="mt-1 font-bold">{text(item.stem_lo, item.stem_en)}</p>
                <p className="mt-2 flex items-start gap-2 text-sm">
                  {item.is_correct ? <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span><span className="font-black">{t('quiz.review.yours')}:</span> {chosen ? `${chosen.key}. ${optionText(chosen, lo)}` : '—'} ({t(item.is_correct ? 'quiz.review.right' : 'quiz.review.wrong')})</span>
                </p>
                {!item.is_correct && correct && (
                  <p className="mt-1 pl-6 text-sm"><span className="font-black">{t('quiz.review.correct')}:</span> {correct.key}. {optionText(correct, lo)}</p>
                )}
                {explanation && (
                  <div className="mt-2 pl-6 text-sm text-slate-700 dark:text-slate-300">
                    <p><span className="font-black">{t('quiz.review.explanation')}:</span> {explanation}</p>
                    {item.explanation_origin === 'ai' && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400"><Sparkles aria-hidden className="h-3.5 w-3.5" />{t('quiz.review.ai')}</p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
      <Link to="/academy/scores" className={secondary}><ArrowLeft aria-hidden className="h-4 w-4" />{t('quiz.backDashboard')}</Link>
    </div>
  )
}
