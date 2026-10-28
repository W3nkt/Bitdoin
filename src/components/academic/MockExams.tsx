import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, History, ListChecks, Play, Send, Target, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  useAnswerMockItem, useFinishMockSession, useMockAttempt, useMockExams, useStartMock, useStartMockSession,
  type MockAttempt, type MockBlueprintOffer,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { academicErrorText } from './errorText'
import { CardTitle, MasteryPill, OptionLetter, SubjectBadge, resultEmoji, subjectVisual } from './visuals'

// Mock exams and practice sets (P5-EXAM #56: EXAM-001, EXAM-002). Built from
// published exam blueprints and approved quiz-bank items; timed per part on
// the server. Results stay apart from school scores and quizzes.

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const optionText = (option: { text_lo: string; text_en?: string | null }, lo: boolean) => (lo ? option.text_lo : option.text_en || option.text_lo)

/** /academy/scores/exams — what can be taken, the free allowance and past results. */
export function MockExams() {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const navigate = useNavigate()
  const view = useMockExams()
  const start = useStartMock()
  const lo = language === 'lo'
  if (view.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (!view.data) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, view.error)} />
  const v = view.data
  const name = (x: { name_en: string; name_lo: string }) => (lo ? x.name_lo : x.name_en)
  const begin = (b: MockBlueprintOffer) => start.mutate(b.slug, {
    onSuccess: attempt => navigate(`/academy/scores/exams/${attempt.attempt_id}`),
    onError: error => toast.error(academicErrorText(t, error)),
  })
  return (
    <div className="space-y-5">
      <section className={card}>
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-3xl dark:bg-rose-500/15">⏱️</span>
          <h1 className="min-w-0 flex-1 text-2xl font-black">{t('exams.title')}</h1>
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{t('exams.intro')}</p>
        {!v.entitled && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
            <span aria-hidden>{v.free_left > 0 ? '🎟️' : '👑'}</span>{v.free_left > 0 ? t('exams.freeLeft', { count: v.free_left, total: 3 }) : t('exams.premium')}
          </p>
        )}
        {v.open && (
          <Link to={`/academy/scores/exams/${v.open.attempt_id}`} className="mt-3 flex w-fit items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <Play aria-hidden className="h-4 w-4" />{t('exams.resume', { name: name(v.open) })}
          </Link>
        )}
      </section>

      {v.blueprints.length === 0 ? <section className={card}><p className="flex items-center gap-3 text-sm"><span aria-hidden className="text-2xl">📭</span>{t('exams.none')}</p></section> : v.blueprints.map(b => {
        const blocked = b.missing.length > 0 || !!v.open || (b.kind === 'mock' && !v.entitled && v.free_left === 0)
        return (
          <section key={b.slug} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{t(`exams.kind.${b.kind}` as AcademicCopyKey)}</p>
            <div className="mt-2"><CardTitle emoji={b.kind === 'mock' ? '📝' : '🏋️'} color={b.kind === 'mock' ? '#e11d48' : '#f97316'} title={name(b)} /></div>
            {b.kind === 'practice' && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('exams.practiceWhy', { year: b.intake_year, current: v.intake_year ?? '' })}</p>}
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {b.sessions.map((s, i) => (
                <li key={i} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-bold dark:bg-slate-800">
                  <Clock3 aria-hidden className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />{t('exams.session', { label: lo ? s.label_lo : s.label_en, minutes: s.minutes })}
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><ListChecks aria-hidden className="h-3.5 w-3.5" />{t('exams.questionsEach', { count: v.rules.items_per_subject })}</p>
            {b.missing.length > 0 && <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-900 dark:text-amber-200"><span aria-hidden>🚧</span>{t('exams.notReady', { subjects: b.missing.join(', ') })}</p>}
            <Button className="mt-3" size="sm" icon={<Play className="h-4 w-4" />} disabled={blocked} loading={start.isPending && start.variables === b.slug} onClick={() => begin(b)}>{t('exams.start')}</Button>
          </section>
        )
      })}

      {v.history.length > 0 && (
        <section className={card}>
          <CardTitle icon={History} color="#0ea5e9" title={t('exams.history')} />
          <ul className="mt-3 grid gap-2 text-sm">
            {v.history.map(h => (
              <li key={h.attempt_id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-gray-800/60">
                <span aria-hidden className="text-lg">{resultEmoji(h.correct, h.total)}</span>
                <Link to={`/academy/scores/exams/${h.attempt_id}`} className="font-bold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
                  {t('exams.historyItem', { name: name(h), date: formatDate(h.finished_at, language), correct: h.correct, total: h.total })}
                </Link>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-slate-400 dark:ring-slate-700">{t(`exams.kind.${h.kind}` as AcademicCopyKey)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{t('exams.separate')}</p>
        </section>
      )}
    </div>
  )
}

/** Seconds left on the server's clock, corrected for the device's clock. */
function useSecondsLeft(endsAt: string | null, serverNow: string) {
  const offset = useRef(new Date(serverNow).getTime() - Date.now())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    offset.current = new Date(serverNow).getTime() - Date.now()
  }, [serverNow])
  useEffect(() => {
    if (!endsAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [endsAt])
  if (!endsAt) return null
  return Math.max(0, Math.round((new Date(endsAt).getTime() - (now + offset.current)) / 1000))
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** /academy/scores/exams/:attemptId — the timed parts, then the results. */
export function MockRunner() {
  const { t } = useAcademicCopy()
  const { attemptId = '' } = useParams()
  const attempt = useMockAttempt(attemptId)
  if (attempt.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (!attempt.data) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, attempt.error)} />
  return attempt.data.status === 'finished' ? <MockResult attempt={attempt.data} /> : <MockPart attempt={attempt.data} />
}

function MockPart({ attempt }: { attempt: MockAttempt }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const lo = language === 'lo'
  const startPart = useStartMockSession()
  const finish = useFinishMockSession()
  const answer = useAnswerMockItem()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const session = attempt.sessions[attempt.session_index]
  const left = useSecondsLeft(session.ends_at, attempt.now)
  const handedIn = useRef(false)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  const items = session.items ?? []
  const chosen = (id: string, fallback: string | null) => answers[id] ?? fallback
  const answeredCount = items.filter(item => chosen(item.id, item.chosen_key)).length

  // Time up: hand in for the student (the server closes the part anyway after the grace).
  useEffect(() => {
    if (left === 0 && !handedIn.current) {
      handedIn.current = true
      toast.success(t('exams.timeUp'))
      finish.mutate(attempt.attempt_id, { onError })
    }
  }, [left])
  useEffect(() => { handedIn.current = false; setAnswers({}); setConfirming(false) }, [attempt.session_index])

  const header = (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{t(`exams.kind.${attempt.kind}` as AcademicCopyKey)} · {t('exams.part', { n: attempt.session_index + 1, total: attempt.sessions.length })}</p>
      <h1 className="text-xl font-black">{lo ? attempt.name_lo : attempt.name_en}</h1>
      <p className="text-sm text-slate-700 dark:text-slate-300">{lo ? session.label_lo : session.label_en}</p>
    </div>
  )

  if (!session.started_at) {
    return (
      <section className={card}>
        {header}
        <p className="mt-3 flex items-center gap-2 text-sm"><span aria-hidden className="text-xl">⏱️</span>{t('exams.partIntro', { count: session.item_count, minutes: session.minutes })}</p>
        <Button className="mt-4" icon={<Play className="h-4 w-4" />} loading={startPart.isPending} onClick={() => startPart.mutate(attempt.attempt_id, { onError })}>{t('exams.startPart', { n: attempt.session_index + 1 })}</Button>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className={cn(card, 'sticky top-2 z-10')}>
        {header}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p role="timer" aria-live="off" className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-black tabular-nums', left !== null && left <= 300 ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-800')}>
            <Timer aria-hidden className="h-4 w-4" />{t('exams.timeLeft', { time: clock(left ?? 0) })}
          </p>
          <p className="inline-flex items-center gap-1.5"><CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />{t('exams.answered', { count: answeredCount, total: items.length })}</p>
        </div>
      </section>
      {items.map((item, index) => (
        <section key={item.id} className={card}>
          <fieldset>
            <legend className="text-base font-black leading-snug"><span className="mr-2 text-slate-500 dark:text-slate-400">{t('exams.question', { n: index + 1 })}</span>{lo ? item.stem_lo : item.stem_en || item.stem_lo}</legend>
            <div className="mt-3 grid gap-2">
              {item.options.map(option => {
                const selected = chosen(item.id, item.chosen_key) === option.key
                return (
                  <label key={option.key}
                    className={cn('relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-base ring-1 transition-colors focus-within:ring-2 focus-within:ring-amber-500',
                      selected ? 'bg-indigo-50 font-bold ring-2 ring-indigo-500 dark:bg-indigo-500/10' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-gray-800')}>
                    <input type="radio" name={`m-${item.id}`} value={option.key} checked={selected} className="absolute left-3 z-10 h-8 w-8 cursor-pointer appearance-none rounded-full opacity-0"
                      onChange={() => {
                        setAnswers(current => ({ ...current, [item.id]: option.key }))
                        answer.mutate({ attemptId: attempt.attempt_id, itemId: item.id, key: option.key }, { onError })
                      }} />
                    <OptionLetter letter={option.key} state={selected ? 'selected' : 'idle'} />
                    <span className="min-w-0 flex-1 break-words">{optionText(option, lo)}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </section>
      ))}
      <section className={card}>
        {!confirming ? <Button icon={<Send className="h-4 w-4" />} onClick={() => setConfirming(true)}>{t('exams.handIn')}</Button> : (
          <div role="alertdialog" aria-labelledby="hand-in" className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <p id="hand-in" className="flex items-center gap-2 font-black"><span aria-hidden className="text-xl">🤔</span>{t('exams.handInConfirm')}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>{t('common.cancel')}</Button>
              <Button size="sm" loading={finish.isPending} onClick={() => finish.mutate(attempt.attempt_id, { onError })}>{t('exams.handInYes')}</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function MockResult({ attempt }: { attempt: MockAttempt }) {
  const { t, language } = useAcademicCopy()
  const lo = language === 'lo'
  const r = attempt.result
  return (
    <div className="space-y-5">
      <section className={card}>
        {r && <span aria-hidden className="mb-3 block text-5xl">{resultEmoji(r.correct, r.total)}</span>}
        <p className="text-xs font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{t(`exams.kind.${attempt.kind}` as AcademicCopyKey)}</p>
        <h1 className="text-2xl font-black">{t('exams.result.title', { name: lo ? attempt.name_lo : attempt.name_en })}</h1>
        {r && <p className="mt-3 w-fit rounded-full bg-emerald-50 px-4 py-1.5 text-lg font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">{t('exams.result.total', { correct: r.correct, total: r.total })}</p>}
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('exams.result.note')}</p>
      </section>
      {r && (
        <section className={card}>
          <CardTitle icon={BarChart3} color="#6366f1" title={t('exams.result.subjects')} />
          <ul className="mt-3 grid gap-2 text-sm">
            {r.subjects.map(s => (
              <li key={s.code} className="flex items-center gap-3">
                <SubjectBadge code={s.code} name={s.name_en} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3"><span className="font-bold">{lo ? s.name_lo : s.name_en}</span><span className="font-black tabular-nums">{s.correct}/{s.total}</span></div>
                  <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${s.total ? Math.round((s.correct / s.total) * 100) : 0}%`, backgroundColor: subjectVisual(s.code, s.name_en).color }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5"><CardTitle icon={Target} color="#f97316" title={t('exams.result.topics')} /></div>
          <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {r.topics.map(topic => (
              <li key={topic.topic_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>{lo ? topic.name_lo : topic.name_en}</span>
                <span className="flex items-center gap-2"><span className="tabular-nums">{topic.correct}/{topic.total}</span><MasteryPill band={topic.band} label={t(`quiz.band.${topic.band}` as AcademicCopyKey)} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{t('exams.separate')}</p>
        </section>
      )}
      {attempt.review && (
        <section className={card}>
          <CardTitle icon={ListChecks} color="#6366f1" title={t('exams.result.review')} />
          <ol className="mt-2 grid gap-3 text-sm">
            {attempt.review.map((item, index) => (
              <li key={index} className={cn('rounded-2xl p-3 ring-1', item.chosen_key === item.correct_key ? 'bg-emerald-50/60 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30' : 'bg-rose-50/60 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30')}>
                <p className="font-bold"><span aria-hidden className="mr-1.5">{item.chosen_key === item.correct_key ? '✅' : '❌'}</span>{index + 1}. {lo ? item.stem_lo : item.stem_en || item.stem_lo}</p>
                <p className="mt-1">{item.chosen_key ? t('exams.result.yours', { key: item.chosen_key }) : t('exams.result.none')} · {t('exams.result.correct', { key: item.correct_key })}</p>
                {(lo ? item.explanation_lo : item.explanation_en || item.explanation_lo) && (
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{lo ? item.explanation_lo : item.explanation_en || item.explanation_lo}{item.explanation_origin === 'ai' ? ` (${t('quiz.review.ai')})` : ''}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      <Link to="/academy/scores/exams" className="inline-flex items-center gap-1.5 text-sm font-black text-indigo-700 hover:underline dark:text-indigo-300"><ArrowLeft aria-hidden className="h-4 w-4" />{t('exams.back')}</Link>
    </div>
  )
}
