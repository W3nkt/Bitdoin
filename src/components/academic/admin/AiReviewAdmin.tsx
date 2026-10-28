import { useState } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAiReview, useRateAi, type AiReviewItem } from '@/lib/academic/adminApi'
import { Empty, Field, Panel, Pill, adminErrorText, formatDateTime } from './AdminKit'

// AI Coach review (ADMIN-009, #53; migrations 145, 146): reported and
// thumbs-down answers from the Coach's "My scores" mode, unsafe reports first,
// then the weekly random sample from students who agreed to it. The question
// and answer are shown only when the student shared them. Reviewers rate
// accuracy, Lao quality and safety from 1 to 5; averages by prompt version
// and model feed the evaluation before a release (AI-010).

const CATEGORY: Record<string, string> = { wrong_numbers: 'Wrong numbers', unsafe: 'Unsafe or upsetting', not_lao: 'Lao hard to understand', other: 'Something else' }

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
      <p className="text-xs font-black text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value.toLocaleString('en')}</p>
    </div>
  )
}

function ReviewForm({ item }: { item: AiReviewItem }) {
  const toast = useToast()
  const rate = useRateAi()
  const [scores, setScores] = useState({ accuracy: 0, lao: 0, safety: 0 })
  const [note, setNote] = useState('')
  const ready = scores.accuracy > 0 && scores.lao > 0 && scores.safety > 0
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-4">
      {(['accuracy', 'lao', 'safety'] as const).map(key => (
        <Field key={key} label={key === 'lao' ? 'Lao quality' : key === 'accuracy' ? 'Accuracy' : 'Safety'}>
          <select value={scores[key] || ''} onChange={event => setScores(current => ({ ...current, [key]: Number(event.target.value) }))}>
            <option value="">Rate</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      ))}
      <Field label="Note">
        <input value={note} maxLength={500} onChange={event => setNote(event.target.value)} />
      </Field>
      <div className="sm:col-span-4">
        <Button size="sm" disabled={!ready} loading={rate.isPending}
          onClick={() => rate.mutate({ id: item.id, ...scores, note: note.trim() || undefined }, {
            onSuccess: () => toast.success('Review saved.'),
            onError: error => toast.error(adminErrorText(error)),
          })}>
          Save review
        </Button>
      </div>
    </div>
  )
}

export function AiReviewAdmin() {
  const [status, setStatus] = useState<'open' | 'reviewed'>('open')
  const review = useAiReview(status)
  if (review.isPending) return <Skeleton className="h-96 rounded-2xl" />
  if (review.isError) return <Empty>{adminErrorText(review.error)}</Empty>
  const week = review.data.last_7_days
  const sample = review.data.sample
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Answers, 7 days" value={week.answers} />
        <Tile label="Thumbs up" value={week.thumbs_up} />
        <Tile label="Thumbs down" value={week.thumbs_down} />
        <Tile label="Safety redirects" value={week.safety_redirects} />
        <Tile label="Number fallbacks" value={week.numbers_fallbacks} />
        <Tile label="Provider failures" value={week.provider_failures} />
      </div>
      <Panel title="Coach answers to review" description="Reported and thumbs-down answers from the Coach's My scores mode, then the weekly random sample. Text is shown only when the student agreed to share it."
        actions={(
          <label className="flex items-center gap-2 text-sm font-bold">Show
            <select value={status} onChange={event => setStatus(event.target.value as 'open' | 'reviewed')} className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-gray-950">
              <option value="open">To review</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
        )}>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          {sample.week
            ? `Weekly sample for the week of ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(sample.week))}: ${sample.items} answers.`
            : 'No weekly sample yet.'}
          {` ${sample.consenting_students} students let reviewers read their chats. Each Monday: ${Math.round((sample.rule?.rate ?? 0.01) * 100)}% of last week's conversations or ${sample.rule?.minimum ?? 50}, whichever is larger, from those students.`}
        </p>
        {review.data.items.length === 0 ? <Empty>Nothing to review.</Empty> : (
          <ul className="space-y-4">
            {review.data.items.map(item => (
              <li key={item.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  {item.priority && <Pill tone="red">Priority</Pill>}
                  {item.report_category && <Pill tone="amber">{CATEGORY[item.report_category]}</Pill>}
                  {item.source === 'sample' && <Pill tone="gray">Weekly sample</Pill>}
                  {item.rating === -1 && <Pill tone="gray">Thumbs down</Pill>}
                  {item.numbers_checked === false && <Pill tone="blue">Number fallback</Pill>}
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.created_at)} · prompt {item.prompt_version ?? '—'} · {item.model_id ?? '—'}</span>
                </div>
                {item.share_text ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p><span className="font-black">Question: </span>{item.question}</p>
                    <p className="whitespace-pre-line"><span className="font-black">Answer: </span>{item.answer}</p>
                  </div>
                ) : <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">The student did not share the text. Conversation {item.conversation_id.slice(0, 8)}.</p>}
                {item.comment && <p className="mt-2 text-sm italic text-slate-700 dark:text-slate-300">“{item.comment}”</p>}
                {item.review
                  ? <p className="mt-3 text-sm">Accuracy {item.review.accuracy} · Lao {item.review.lao} · Safety {item.review.safety}{item.review.note ? ` · ${item.review.note}` : ''} — {item.review.by ?? '—'}, {formatDateTime(item.review.at)}</p>
                  : <ReviewForm item={item} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Review results by prompt version" description="Average reviewer ratings over the last 90 days. The release check for a new model or prompt needs a Lao rating of at least 4.0.">
        {review.data.ratings.length === 0 ? <Empty>No reviewed answers yet.</Empty> : (
          <div tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-600 dark:text-slate-400">
                <tr><th className="py-2 pr-4">Prompt</th><th className="py-2 pr-4">Model</th><th className="py-2 pr-4">Reviewed</th><th className="py-2 pr-4">Accuracy</th><th className="py-2 pr-4">Lao</th><th className="py-2">Safety</th></tr>
              </thead>
              <tbody className="tabular-nums">
                {review.data.ratings.map(row => (
                  <tr key={`${row.prompt_version}-${row.model_id}`} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4">{row.prompt_version ?? '—'}</td>
                    <td className="py-2 pr-4">{row.model_id}</td>
                    <td className="py-2 pr-4">{row.reviewed}</td>
                    <td className="py-2 pr-4">{Number(row.accuracy).toFixed(1)}</td>
                    <td className={`py-2 pr-4 ${Number(row.lao) < 4 ? 'font-black text-red-700 dark:text-red-400' : ''}`}>{Number(row.lao).toFixed(1)}</td>
                    <td className="py-2">{Number(row.safety).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
