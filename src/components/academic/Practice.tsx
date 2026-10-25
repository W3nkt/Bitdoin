import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useAnswerPractice, useFinishPractice, usePracticeSet, type PracticeFeedback } from '@/lib/academic/api'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const primary = 'inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-gray-800'

/**
 * A practice set (REC-PRACTICE): up to 5 questions of one topic, untimed.
 * Each answer is final and shows the right answer and its explanation at once.
 */
export function PracticeRunner({ topicId }: { topicId: string }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const practice = usePracticeSet(topicId)
  const answer = useAnswerPractice()
  const finish = useFinishPractice()
  const [index, setIndex] = useState<number | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, PracticeFeedback>>({})
  const [done, setDone] = useState<{ correct: number; total: number } | null>(null)

  useEffect(() => {
    if (!practice.data || index !== null) return
    const given = Object.fromEntries(practice.data.items.filter(item => item.feedback).map(item => [item.id, item.feedback!]))
    setFeedback(given)
    const next = practice.data.items.findIndex(item => !item.feedback)
    setIndex(next === -1 ? practice.data.items.length - 1 : next)
  }, [practice.data, index])

  if (practice.isError) return <MyScoresNotice title={t('practice.error.unavailable')} body={academicErrorText(t, practice.error)} action={<Link to="/academy/scores" className={secondary}>{t('quiz.backDashboard')}</Link>} />
  if (practice.isPending || index === null) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  const view = practice.data
  const topicName = lo ? view.topic.name_lo : view.topic.name_en

  if (done) {
    return (
      <section className={cn(card, 'text-center')}>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{topicName}</p>
        <h2 className="mt-1 text-2xl font-black">{t('practice.done.title')}</h2>
        <p className="mt-2 text-lg font-black">{t('quiz.result.score', { correct: done.correct, total: done.total })}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('practice.done.body')}</p>
        <Link to="/academy/scores" className={cn(primary, 'mt-5')}>{t('quiz.backDashboard')}</Link>
      </section>
    )
  }

  const item = view.items[index]
  const total = view.items.length
  const shown = feedback[item.id]
  const optionText = (key: string) => {
    const option = item.options.find(o => o.key === key)
    return option ? `${option.key}. ${!lo && option.text_en ? option.text_en : option.text_lo}` : key
  }
  const explanation = shown?.explanation_lo ? (!lo && shown.explanation_en ? shown.explanation_en : shown.explanation_lo) : null

  return (
    <section className={card}>
      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{t('practice.title')} · {topicName}</p>
      <p className="mt-2 text-sm font-black">{t('quiz.progress', { n: index + 1, total })}</p>
      <fieldset className="mt-4" disabled={!!shown}>
        <legend className="text-lg font-black leading-snug">{!lo && item.stem_en ? item.stem_en : item.stem_lo}</legend>
        <div className="mt-4 grid gap-2">
          {item.options.map(option => {
            const selected = (shown?.chosen_key ?? choice) === option.key
            return (
              <label key={option.key} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-base ring-1 focus-within:ring-2 focus-within:ring-amber-500',
                selected ? 'bg-indigo-50 font-bold ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 dark:ring-slate-700', shown && 'cursor-default')}>
                <input type="radio" name={`p-${item.id}`} checked={selected} onChange={() => setChoice(option.key)} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
                <span className="font-black">{option.key}.</span>
                <span className="break-words">{!lo && option.text_en ? option.text_en : option.text_lo}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {shown && (
        <div role="status" className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-gray-800/60">
          <p className="flex items-center gap-2 font-black">
            {shown.is_correct ? <Check aria-hidden className="h-4 w-4" /> : <X aria-hidden className="h-4 w-4" />}
            {shown.is_correct ? t('practice.right') : t('practice.wrong', { answer: optionText(shown.correct_key) })}
          </p>
          {explanation && <p className="mt-1"><span className="font-black">{t('quiz.review.explanation')}:</span> {explanation}</p>}
          {shown.explanation_origin === 'ai' && <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400"><Sparkles aria-hidden className="h-3.5 w-3.5" />{t('quiz.review.ai')}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={secondary} disabled={index === 0} onClick={() => { setChoice(null); setIndex(index - 1) }}>
          <ArrowLeft aria-hidden className="h-4 w-4" />{t('quiz.previous')}
        </button>
        {!shown ? (
          <button type="button" className={primary} disabled={!choice || answer.isPending}
            onClick={() => answer.mutate({ attemptId: view.attempt_id, itemId: item.id, key: choice! }, {
              onSuccess: result => setFeedback(current => ({ ...current, [item.id]: result })),
              onError: error => toast.error(academicErrorText(t, error)),
            })}>
            {t('practice.check')}
          </button>
        ) : index < total - 1 ? (
          <button type="button" className={primary} onClick={() => { setChoice(null); setIndex(index + 1) }}>{t('quiz.next')}<ArrowRight aria-hidden className="h-4 w-4" /></button>
        ) : (
          <button type="button" className={primary} disabled={Object.keys(feedback).length < total || finish.isPending}
            onClick={() => finish.mutate(view.attempt_id, { onSuccess: setDone, onError: error => toast.error(academicErrorText(t, error)) })}>
            {t('practice.finish')}<Check aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  )
}
