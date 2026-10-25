import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminGrades, useAdminSubjects, useQuizBank, useReviewQuizItem, useSaveQuizItem, useSaveQuizTopic,
  type QuizItem, type QuizItemInput, type QuizItemStatus, type QuizTopic,
} from '@/lib/academic/adminApi'
import { cn } from '@/lib/utils'
import { Empty, Field, IconButton, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'
import { DiagnosticsAdmin } from './DiagnosticsAdmin'

const STATUS: Record<QuizItemStatus, { label: string; tone: 'green' | 'amber' | 'blue' | 'gray' }> = {
  draft: { label: 'Draft', tone: 'gray' },
  in_review: { label: 'In review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  retired: { label: 'Retired', tone: 'gray' },
}
const LICENCES: Array<{ value: QuizItem['licence']; label: string }> = [
  { value: 'original', label: 'Original (written for Bitdoin)' },
  { value: 'cc-by-4.0', label: 'CC BY 4.0' },
  { value: 'cc-by-sa-4.0', label: 'CC BY-SA 4.0' },
  { value: 'licensed', label: 'Licensed from a publisher' },
]
const FIELD_NAMES: Record<string, string> = { options: 'Options', correct_key: 'Correct answer', explanation_lo: 'Lao explanation', source: 'Source' }

type TopicForm = { id?: string; subject_id: string; grade_id: string; code: string; name_lo: string; name_en: string; active: boolean }

/**
 * Diagnostic item bank (ADMIN-007, QUIZ-005; migration 131): topics per
 * subject and grade, and multiple-choice items that go draft → in review →
 * approved → retired. Approved items are never edited; a change starts the
 * next version. Only approved items can reach students.
 */
export function QuizBankAdmin() {
  const toast = useToast()
  const bank = useQuizBank()
  const subjects = useAdminSubjects()
  const grades = useAdminGrades()
  const saveTopic = useSaveQuizTopic()
  const review = useReviewQuizItem()
  const [topicForm, setTopicForm] = useState<TopicForm | null>(null)
  const [editing, setEditing] = useState<QuizItemInput | null>(null)
  const [status, setStatus] = useState<QuizItemStatus | 'all'>('all')
  const [topicFilter, setTopicFilter] = useState('')
  const [noteFor, setNoteFor] = useState<{ item: QuizItem; action: 'return' | 'retire' } | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  if (bank.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (bank.isError) return <Empty>{adminErrorText(bank.error)}</Empty>
  const view = bank.data
  const topicById = new Map(view.topics.map(topic => [topic.id, topic]))
  const items = view.items.filter(item => (status === 'all' || item.status === status) && (!topicFilter || item.topic_id === topicFilter))
  const count = (value: QuizItemStatus) => view.items.filter(item => item.status === value).length
  const editTopic = (topic?: QuizTopic) => setTopicForm(topic
    ? { id: topic.id, subject_id: topic.subject_id, grade_id: topic.grade_id, code: topic.code, name_lo: topic.name_lo, name_en: topic.name_en, active: topic.active }
    : { subject_id: subjects.data?.[0]?.id ?? '', grade_id: grades.data?.[0]?.id ?? '', code: '', name_lo: '', name_en: '', active: true })
  const fromItem = (item: QuizItem, asNewVersion: boolean): QuizItemInput => ({
    ...(asNewVersion ? { item_key: item.item_key } : { id: item.id }),
    topic_id: item.topic_id, stem_lo: item.stem_lo, stem_en: item.stem_en, options: item.options, correct_key: item.correct_key,
    explanation_lo: item.explanation_lo, explanation_en: item.explanation_en, explanation_origin: item.explanation_origin,
    licence: item.licence, source: item.source,
  })
  const act = (item: QuizItem, action: 'submit' | 'approve', done: string) =>
    review.mutate({ id: item.id, action }, { onSuccess: () => toast.success(done), onError })

  return (
    <div className="grid gap-6">
      <Panel title="Topics" description="Each diagnostic item is tagged to exactly one topic of a subject and grade."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => editTopic()}>New topic</Button>}>
        {view.topics.length === 0 ? <Empty>No topics yet. Add the topics of a subject first, for example Grade 11 Mathematics: Algebra.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Topic</th><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Items</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {view.topics.map(topic => (
                  <tr key={topic.id}>
                    <td className="py-2 pr-4 font-bold">{topic.subject_code} · {topic.grade_code}</td>
                    <td className="py-2 pr-4"><span className="block font-bold">{topic.name_lo}</span><span className="text-xs text-slate-500 dark:text-slate-400">{topic.name_en}</span></td>
                    <td className="py-2 pr-4"><code className="text-xs">{topic.code}</code></td>
                    <td className="py-2 pr-4 tabular-nums">{topic.approved_items} approved{topic.open_items > 0 && ` · ${topic.open_items} open`}</td>
                    <td className="py-2 pr-4">{topic.active ? <Pill tone="green">Active</Pill> : <Pill>Hidden</Pill>}</td>
                    <td className="py-2 text-right"><Button size="sm" variant="ghost" onClick={() => editTopic(topic)}>Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Items in a hidden topic are never shown to students.</p>
          </div>
        )}

        {topicForm && (
          <form className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60 sm:grid-cols-2" onSubmit={event => {
            event.preventDefault()
            saveTopic.mutate({ ...topicForm, code: topicForm.code.trim(), name_lo: topicForm.name_lo.trim(), name_en: topicForm.name_en.trim() },
              { onSuccess: () => { setTopicForm(null); toast.success('Topic saved.') }, onError })
          }}>
            <Field label="Subject">
              <select value={topicForm.subject_id} onChange={event => setTopicForm({ ...topicForm, subject_id: event.target.value })}>
                {(subjects.data ?? []).map(subject => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name_en}</option>)}
              </select>
            </Field>
            <Field label="Grade">
              <select value={topicForm.grade_id} onChange={event => setTopicForm({ ...topicForm, grade_id: event.target.value })}>
                {(grades.data ?? []).map(grade => <option key={grade.id} value={grade.id}>{grade.label_en}</option>)}
              </select>
            </Field>
            <Field label="Name (Lao)"><input value={topicForm.name_lo} maxLength={120} required onChange={event => setTopicForm({ ...topicForm, name_lo: event.target.value })} /></Field>
            <Field label="Name (English)"><input value={topicForm.name_en} maxLength={120} required onChange={event => setTopicForm({ ...topicForm, name_en: event.target.value })} /></Field>
            <Field label="Code" hint="Lower-case letters, digits and dashes, e.g. linear-equations.">
              <input value={topicForm.code} maxLength={40} required pattern="[a-z0-9][a-z0-9\-]*" onChange={event => setTopicForm({ ...topicForm, code: event.target.value })} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-bold">
              <input type="checkbox" checked={topicForm.active} onChange={event => setTopicForm({ ...topicForm, active: event.target.checked })} />Active
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setTopicForm(null)}>Cancel</Button>
              <Button type="submit" loading={saveTopic.isPending}>Save topic</Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Items"
        description={view.four_eyes
          ? 'An item is approved by an admin who did not write or last edit that version. Only approved items reach students.'
          : 'Single-admin mode: authors may approve their own items (setting quiz_four_eyes_required is off).'}
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} disabled={view.topics.length === 0}
          onClick={() => setEditing({ topic_id: topicFilter || view.topics[0].id, stem_lo: '', stem_en: null, options: [{ key: 'A', text_lo: '' }, { key: 'B', text_lo: '' }, { key: 'C', text_lo: '' }, { key: 'D', text_lo: '' }], correct_key: 'A', explanation_lo: '', explanation_en: null, explanation_origin: 'human', licence: 'original', source: null })}>New item</Button>}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(['all', 'in_review', 'draft', 'approved', 'retired'] as const).map(value => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                status === value ? 'bg-slate-950 text-white dark:bg-primary-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
              {value === 'all' ? `All (${view.items.length})` : `${STATUS[value].label} (${count(value)})`}
            </button>
          ))}
          <select aria-label="Topic" value={topicFilter} onChange={event => setTopicFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-gray-900">
            <option value="">All topics</option>
            {view.topics.map(topic => <option key={topic.id} value={topic.id}>{topic.subject_code} {topic.grade_code} · {topic.name_en}</option>)}
          </select>
        </div>

        {items.length === 0 ? <Empty>No items here yet.</Empty> : (
          <ul className="grid gap-3">
            {items.map(item => {
              const topic = topicById.get(item.topic_id)
              const problems = Object.entries(item.problems)
              return (
                <li key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Pill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Pill>
                    <span className="font-bold">v{item.item_version}{item.live_version && item.live_version !== item.item_version ? ` · live v${item.live_version}` : ''}</span>
                    {topic && <span className="text-slate-600 dark:text-slate-400">{topic.subject_code} {topic.grade_code} · {topic.name_en}</span>}
                    <span className="text-slate-500 dark:text-slate-400">by {item.author_name ?? 'unknown'} · {formatDateTime(item.updated_at)}</span>
                  </div>
                  <p className="mt-2 font-bold">{item.stem_lo}</p>
                  {item.stem_en && <p className="text-sm text-slate-600 dark:text-slate-400">{item.stem_en}</p>}
                  <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {item.options.map(option => (
                      <li key={option.key} className={cn('flex items-start gap-2 rounded-lg px-2 py-1', option.key === item.correct_key && 'bg-emerald-50 dark:bg-emerald-500/10')}>
                        <span className="font-black">{option.key}.</span>
                        <span className="flex-1">{option.text_lo}{option.text_en && <span className="text-slate-500 dark:text-slate-400"> · {option.text_en}</span>}</span>
                        {option.key === item.correct_key && <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 dark:text-emerald-300"><Check aria-hidden className="h-3.5 w-3.5" />Correct</span>}
                      </li>
                    ))}
                  </ol>
                  {item.explanation_lo && (
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-black">Explanation{item.explanation_origin === 'ai' ? ' (AI-drafted, shown to students with that label)' : ''}: </span>{item.explanation_lo}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{LICENCES.find(l => l.value === item.licence)?.label}{item.source && ` · ${item.source}`}</p>
                  {item.review_note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Note from {item.reviewer_name ?? 'a reviewer'}: {item.review_note}</p>}
                  {item.status === 'draft' && problems.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                      {problems.map(([field, message]) => <li key={field}><span className="font-bold">{FIELD_NAMES[field] ?? field}:</span> {message}</li>)}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.status === 'draft' && <>
                      <Button size="sm" variant="outline" onClick={() => setEditing(fromItem(item, false))}>Edit</Button>
                      <Button size="sm" disabled={problems.length > 0} loading={review.isPending && review.variables?.id === item.id} onClick={() => act(item, 'submit', 'Sent for review.')}>Send for review</Button>
                    </>}
                    {item.status === 'in_review' && <>
                      <Button size="sm" variant="success" disabled={!item.can_approve} loading={review.isPending && review.variables?.id === item.id} onClick={() => act(item, 'approve', 'Approved. Students can now get this item.')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setNoteFor({ item, action: 'return' })}>Return to author</Button>
                      {!item.can_approve && <span className="text-xs text-slate-600 dark:text-slate-400">You wrote or edited this version, so another admin must approve it.</span>}
                    </>}
                    {(item.status === 'approved' || item.status === 'retired') && (
                      <Button size="sm" variant="outline" disabled={view.items.some(other => other.item_key === item.item_key && (other.status === 'draft' || other.status === 'in_review'))}
                        onClick={() => setEditing(fromItem(item, true))}>New version</Button>
                    )}
                    {item.status === 'approved' && <Button size="sm" variant="ghost" onClick={() => setNoteFor({ item, action: 'retire' })}>Retire</Button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <DiagnosticsAdmin />

      {editing && <ItemEditor topics={view.topics} value={editing} onClose={() => setEditing(null)} />}

      <ReasonDialog open={noteFor !== null} busy={review.isPending}
        title={noteFor?.action === 'return' ? 'Return to the author?' : 'Retire this item?'}
        body={noteFor?.action === 'return'
          ? 'The item goes back to draft with your note, so the author can fix it.'
          : 'Students will no longer get this item. It stays in the bank as a record and can be the base of a new version.'}
        confirmLabel={noteFor?.action === 'return' ? 'Return' : 'Retire'} danger={noteFor?.action === 'retire'}
        onCancel={() => setNoteFor(null)}
        onConfirm={note => noteFor && review.mutate({ id: noteFor.item.id, action: noteFor.action, note }, {
          onSuccess: () => { setNoteFor(null); toast.success(noteFor.action === 'return' ? 'Returned to draft.' : 'Item retired.') },
          onError,
        })} />
    </div>
  )
}

function ItemEditor({ topics, value, onClose }: { topics: QuizTopic[]; value: QuizItemInput; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveQuizItem()
  const [form, setForm] = useState(value)
  const relabel = (options: QuizItemInput['options']) => options.map((option, index) => ({ ...option, key: String.fromCharCode(65 + index) }))
  const setOption = (index: number, patch: Partial<QuizItemInput['options'][number]>) =>
    setForm({ ...form, options: form.options.map((option, i) => (i === index ? { ...option, ...patch } : option)) })
  const removeOption = (index: number) => {
    const removed = form.options[index].key
    const options = relabel(form.options.filter((_, i) => i !== index))
    const correctIndex = form.options.findIndex(option => option.key === form.correct_key)
    const correct = removed === form.correct_key ? 'A' : options[correctIndex > index ? correctIndex - 1 : correctIndex]?.key ?? 'A'
    setForm({ ...form, options, correct_key: correct })
  }
  const title = form.item_key ? 'New version' : form.id ? 'Edit draft' : 'New item'

  return (
    <Modal open onClose={onClose} title={title} size="xl">
      <form className="grid gap-4" onSubmit={event => {
        event.preventDefault()
        save.mutate({ ...form, source: form.source?.trim() || null, stem_en: form.stem_en?.trim() || null, explanation_en: form.explanation_en?.trim() || null },
          { onSuccess: () => { toast.success('Saved as a draft.'); onClose() }, onError: error => toast.error(adminErrorText(error)) })
      }}>
        <Field label="Topic">
          <select value={form.topic_id} onChange={event => setForm({ ...form, topic_id: event.target.value })}>
            {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.subject_code} {topic.grade_code} · {topic.name_en}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Question (Lao)"><textarea rows={3} required maxLength={2000} value={form.stem_lo} onChange={event => setForm({ ...form, stem_lo: event.target.value })} /></Field>
          <Field label="Question (English, optional)"><textarea rows={3} maxLength={2000} value={form.stem_en ?? ''} onChange={event => setForm({ ...form, stem_en: event.target.value })} /></Field>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Answer options (choose the correct one)</legend>
          {form.options.map((option, index) => (
            <div key={option.key} className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-sm font-black">
                <input type="radio" name="correct" checked={form.correct_key === option.key} onChange={() => setForm({ ...form, correct_key: option.key })} aria-label={`${option.key} is correct`} />
                {option.key}
              </label>
              <input aria-label={`Option ${option.key} (Lao)`} placeholder="Lao" value={option.text_lo} required onChange={event => setOption(index, { text_lo: event.target.value })}
                className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
              <input aria-label={`Option ${option.key} (English)`} placeholder="English (optional)" value={option.text_en ?? ''} onChange={event => setOption(index, { text_en: event.target.value || null })}
                className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
              <IconButton label={`Remove option ${option.key}`} danger disabled={form.options.length <= 2} onClick={() => removeOption(index)}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          ))}
          <div><Button type="button" size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} disabled={form.options.length >= 6}
            onClick={() => setForm({ ...form, options: relabel([...form.options, { key: '', text_lo: '' }]) })}>Add option</Button></div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Explanation (Lao)" hint="Shown after the quiz with the correct answer (QUIZ-003). Needed before review.">
            <textarea rows={3} maxLength={4000} value={form.explanation_lo ?? ''} onChange={event => setForm({ ...form, explanation_lo: event.target.value })} />
          </Field>
          <Field label="Explanation (English, optional)"><textarea rows={3} maxLength={4000} value={form.explanation_en ?? ''} onChange={event => setForm({ ...form, explanation_en: event.target.value })} /></Field>
          <Field label="Explanation written by" hint="AI-drafted explanations are shown to students with an AI label once approved.">
            <select value={form.explanation_origin} onChange={event => setForm({ ...form, explanation_origin: event.target.value as QuizItem['explanation_origin'] })}>
              <option value="human">A person</option>
              <option value="ai">AI, checked by a person</option>
            </select>
          </Field>
          <Field label="Licence">
            <select value={form.licence} onChange={event => setForm({ ...form, licence: event.target.value as QuizItem['licence'] })}>
              {LICENCES.map(licence => <option key={licence.value} value={licence.value}>{licence.label}</option>)}
            </select>
          </Field>
          <Field label={form.licence === 'original' ? 'Source (optional)' : 'Source'} hint="Book, website or publisher. Never leaked or official exam papers (QUIZ-005)." className="sm:col-span-2">
            <input maxLength={300} value={form.source ?? ''} required={form.licence !== 'original'} onChange={event => setForm({ ...form, source: event.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save draft</Button>
        </div>
      </form>
    </Modal>
  )
}
