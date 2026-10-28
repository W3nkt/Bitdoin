import { useState } from 'react'
import { Clock3, EyeOff, MessageCircleHeart, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { useMyDataSummary } from '@/lib/academic/api'
import { useTrackUsage } from '@/lib/academic/usageEvents'
import { CardTitle, EmojiRating } from './visuals'

// Pilot ratings (REL-001, PRD §36.4/§35.5): usefulness and ease of entry,
// 1–5, asked once after the second recorded month. Sent as usage events, so
// only while the student's usage statistics are on; nothing typed.

type Question = 'usefulness' | 'entry_ease'
type Rating = '1' | '2' | '3' | '4' | '5'
const QUESTIONS: Array<{ id: Question; label: AcademicCopyKey; low: AcademicCopyKey; high: AcademicCopyKey }> = [
  { id: 'usefulness', label: 'feedback.useful', low: 'feedback.useful.low', high: 'feedback.useful.high' },
  { id: 'entry_ease', label: 'feedback.ease', low: 'feedback.ease.low', high: 'feedback.ease.high' },
]
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

function readState(key: string): { answered?: number; snoozed?: number } {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function writeState(key: string, value: { answered?: number; snoozed?: number }) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: may ask again */ }
}

export function FeedbackCard({ userId, recordedMonths }: { userId: string; recordedMonths: number }) {
  const { t } = useAcademicCopy()
  const track = useTrackUsage()
  const key = `academic.feedback.v1.${userId}`
  const [state, setState] = useState(() => readState(key))
  const [answers, setAnswers] = useState<Partial<Record<Question, Rating>>>({})
  const [sent, setSent] = useState(false)
  const due = recordedMonths >= 2 && !state.answered && !(state.snoozed && Date.now() - state.snoozed < SNOOZE_MS)
  const summary = useMyDataSummary(due)
  const statisticsOn = summary.data?.consents.some(consent => consent.purpose === 'usage_statistics' && !consent.withdrawn_at)

  if (sent) {
    return <p role="status" className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-5 text-sm font-bold text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"><span aria-hidden className="text-3xl">🙏</span>{t('feedback.thanks')}</p>
  }
  if (!due || !statisticsOn) return null

  const send = () => {
    for (const question of QUESTIONS) {
      const rating = answers[question.id]
      if (rating) track('feedback_submitted', { question: question.id, rating })
    }
    const next = { answered: Date.now() }
    writeState(key, next)
    setState(next)
    setSent(true)
  }
  const later = () => {
    const next = { snoozed: Date.now() }
    writeState(key, next)
    setState(next)
  }

  return (
    <section aria-labelledby="feedback-title" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6">
      <CardTitle id="feedback-title" icon={MessageCircleHeart} color="#ec4899" title={t('feedback.title')} />
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><EyeOff aria-hidden className="h-3.5 w-3.5" />{t('feedback.anonymous')}</p>
      <div className="mt-4 space-y-5">
        {QUESTIONS.map(question => (
          <EmojiRating key={question.id} label={t(question.label)} low={t(question.low)} high={t(question.high)}
            value={answers[question.id] ? Number(answers[question.id]) : undefined}
            onChange={rating => setAnswers(current => ({ ...current, [question.id]: String(rating) as Rating }))} />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" icon={<Clock3 className="h-4 w-4" />} onClick={later}>{t('feedback.later')}</Button>
        <Button icon={<Send className="h-4 w-4" />} onClick={send} disabled={!answers.usefulness || !answers.entry_ease}>{t('feedback.send')}</Button>
      </div>
    </section>
  )
}
