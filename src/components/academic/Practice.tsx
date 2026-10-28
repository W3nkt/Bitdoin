import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Home, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useAnswerPractice, useFinishPractice, usePracticeSet, type PracticeFeedback } from '@/lib/academic/api'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'
import { OptionLetter } from './visuals'

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
        <span aria-hidden className="mx-auto mb-3 block text-6xl">{done.total && done.correct / done.total >= 0.8 ? '🎉' : done.total && done.correct / done.total >= 0.5 ? '👍' : '💪'}</span>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{topicName}</p>
        <h2 className="mt-1 text-2xl font-black">{t('practice.done.title')}</h2>
        <p className="mx-auto mt-3 w-fit rounded-full bg-emerald-50 px-4 py-1.5 text-lg font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">{t('quiz.result.score', { correct: done.correct, total: done.total })}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('practice.done.body')}</p>
        <Link to="/academy/scores" className={cn(primary, 'mt-5')}><Home aria-hidden className="h-4 w-4" />{t('quiz.backDashboard')}</Link>
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
      <p className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400"><span aria-hidden className="text-lg">🏋️</span>{t('practice.title')} · {topicName}</p>
      <div className="mt-3 flex items-center gap-3">
        <p className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-sm font-black text-white">{t('quiz.progress', { n: index + 1, total })}</p>
        <ol aria-hidden className="flex flex-1 flex-wrap gap-1.5">
          {view.items.map((other, position) => (
            <li key={other.id} className={cn('h-2.5 w-2.5 rounded-full', feedback[other.id] ? (feedback[other.id].is_correct ? 'bg-emerald-500' : 'bg-rose-500') : position === index ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700')} />
          ))}
        </ol>
      </div>
      <fieldset className="mt-4" disabled={!!shown}>
        <legend className="text-lg font-black leading-snug">{!lo && item.stem_en ? item.stem_en : item.stem_lo}</legend>
        <div className="mt-4 grid gap-2">
          {item.options.map(option => {
            const selected = (shown?.chosen_key ?? choice) === option.key
            const mark = shown ? (option.key === shown.correct_key ? 'right' : selected ? 'wrong' : 'idle') : selected ? 'selected' : 'idle'
            return (
              <label key={option.key} className={cn('relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-base ring-1 focus-within:ring-2 focus-within:ring-amber-500',
                mark === 'right' ? 'bg-emerald-50 font-bold ring-2 ring-emerald-500 dark:bg-emerald-500/10'
                  : mark === 'wrong' ? 'bg-rose-50 font-bold ring-2 ring-rose-500 dark:bg-rose-500/10'
                    : selected ? 'bg-indigo-50 font-bold ring-2 ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 dark:ring-slate-700', shown && 'cursor-default')}>
                <input type="radio" name={`p-${item.id}`} checked={selected} onChange={() => setChoice(option.key)} className="absolute left-3 z-10 h-8 w-8 cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-default" />
                <OptionLetter letter={option.key} state={mark} />
                <span className="min-w-0 flex-1 break-words">{!lo && option.text_en ? option.text_en : option.text_lo}</span>
                {mark === 'right' && <span aria-hidden>✅</span>}
                {mark === 'wrong' && <span aria-hidden>❌</span>}
              </label>
            )
          })}
        </div>
      </fieldset>

      {shown && (
        <div role="status" className={cn('mt-4 rounded-2xl p-4 text-sm', shown.is_correct ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-50' : 'bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-50')}>
          <p className="flex items-center gap-2 font-black">
            <span aria-hidden className="text-xl">{shown.is_correct ? '🎉' : '🤔'}</span>
            {shown.is_correct ? t('practice.right') : t('practice.wrong', { answer: optionText(shown.correct_key) })}
          </p>
          {explanation && <p className="mt-2 flex items-start gap-2"><span aria-hidden>💡</span><span><span className="font-black">{t('quiz.review.explanation')}:</span> {explanation}</span></p>}
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
            <Check aria-hidden className="h-4 w-4" />{t('practice.check')}
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
