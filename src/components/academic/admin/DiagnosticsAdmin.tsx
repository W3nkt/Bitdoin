import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminGrades, useAdminSubjects, useDiagnostics, useQuizBank, useSaveDiagnostic, useSetDiagnosticStatus, type AdminDiagnostic,
} from '@/lib/academic/adminApi'
import { Empty, Field, IconButton, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'

type Form = { id?: string; subject_id: string; grade_id: string; title_lo: string; title_en: string; item_ids: string[]; parallel_of: string | null }
const STATUS = { draft: { label: 'Draft', tone: 'gray' }, published: { label: 'Published', tone: 'green' }, retired: { label: 'Retired', tone: 'gray' } } as const
const PROBLEM_NAMES: Record<string, string> = { items: 'Items', approved: 'Approval', subject: 'Subject', topics: 'Topics', parallel: 'Parallel form', overlap: 'Parallel form' }

/**
 * Diagnostics (QUIZ-001, migration 132): an ordered set of approved items for
 * one subject and grade. Students with that subject see it on the subject
 * page when it is marked as needing attention (ANALYSIS-005). Publishing a
 * new one retires the previous one.
 */
export function DiagnosticsAdmin() {
  const toast = useToast()
  const diagnostics = useDiagnostics()
  const approved = useQuizBank('approved')
  const subjects = useAdminSubjects()
  const grades = useAdminGrades()
  const save = useSaveDiagnostic()
  const setStatus = useSetDiagnosticStatus()
  const [form, setForm] = useState<Form | null>(null)
  const [retiring, setRetiring] = useState<AdminDiagnostic | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  if (diagnostics.isPending || approved.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (diagnostics.isError) return <Empty>{adminErrorText(diagnostics.error)}</Empty>
  const { rules } = diagnostics.data
  const topics = approved.data?.topics ?? []
  const items = approved.data?.items ?? []
  const topicOf = (topicId: string) => topics.find(topic => topic.id === topicId)
  const itemById = new Map(items.map(item => [item.id, item]))
  const candidates = form ? items.filter(item => { const topic = topicOf(item.topic_id); return topic?.subject_id === form.subject_id && topic.grade_id === form.grade_id }) : []
  const all = diagnostics.data.diagnostics
  const mains = form ? all.filter(diag => !diag.parallel_of && diag.status !== 'retired' && diag.id !== form.id && diag.subject_id === form.subject_id && diag.grade_id === form.grade_id) : []
  const move = (index: number, by: number) => form && setForm({ ...form, item_ids: form.item_ids.map((id, i, all) => (i === index ? all[index + by] : i === index + by ? all[index] : id)) })

  return (
    <Panel title="Diagnostics"
      description={`A diagnostic is ${rules.min_items}–${rules.max_items} approved items for one subject and grade, with at least ${rules.min_per_topic} per topic. Students can resume an unfinished quiz for ${rules.resume_days} days. A parallel form has the same topics and item counts with different items; students get it as a retake ${rules.retake_days ?? 7} days after finishing.`}
      actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} disabled={!subjects.data?.length || !grades.data?.length}
        onClick={() => setForm({ subject_id: subjects.data![0].id, grade_id: grades.data![0].id, title_lo: '', title_en: '', item_ids: [], parallel_of: null })}>New diagnostic</Button>}>
      {diagnostics.data.diagnostics.length === 0 ? <Empty>No diagnostics yet. Approve enough items for a subject and grade, then build one here.</Empty> : (
        <ul className="grid gap-3">
          {diagnostics.data.diagnostics.map(diag => {
            const problems = Object.entries(diag.problems)
            return (
              <li key={diag.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Pill tone={STATUS[diag.status].tone}>{STATUS[diag.status].label}</Pill>
                  <span className="font-bold">{diag.subject_code} · {diag.grade_code}</span>
                  <span className="text-slate-600 dark:text-slate-400">{diag.item_ids.length} items</span>
                  {diag.parallel_of && <span className="font-bold text-slate-700 dark:text-slate-300">Parallel form of “{all.find(main => main.id === diag.parallel_of)?.title_en ?? 'a retired diagnostic'}”</span>}
                  {diag.published_at && <span className="text-slate-500 dark:text-slate-400">published {formatDateTime(diag.published_at)}</span>}
                  <span className="text-slate-500 dark:text-slate-400">{diag.attempts} started · {diag.completed} finished</span>
                </div>
                <p className="mt-2 font-bold">{diag.title_lo}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{diag.title_en}</p>
                {diag.status === 'draft' && problems.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                    {problems.map(([field, message]) => <li key={field}><span className="font-bold">{PROBLEM_NAMES[field] ?? field}:</span> {message}</li>)}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {diag.status === 'draft' && <>
                    <Button size="sm" variant="outline" onClick={() => setForm({ id: diag.id, subject_id: diag.subject_id, grade_id: diag.grade_id, title_lo: diag.title_lo, title_en: diag.title_en, item_ids: diag.item_ids, parallel_of: diag.parallel_of })}>Edit</Button>
                    <Button size="sm" disabled={problems.length > 0} loading={setStatus.isPending && setStatus.variables?.id === diag.id}
                      onClick={() => setStatus.mutate({ id: diag.id, action: 'publish' }, { onSuccess: () => toast.success('Published. Students who need it will see it.'), onError })}>Publish</Button>
                  </>}
                  {diag.status === 'published' && <Button size="sm" variant="ghost" onClick={() => setRetiring(diag)}>Retire</Button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {form && (
        <form className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60 sm:grid-cols-2" onSubmit={event => {
          event.preventDefault()
          save.mutate({ ...form, title_lo: form.title_lo.trim(), title_en: form.title_en.trim() }, { onSuccess: () => { setForm(null); toast.success('Diagnostic saved as a draft.') }, onError })
        }}>
          <Field label="Subject">
            <select value={form.subject_id} onChange={event => setForm({ ...form, subject_id: event.target.value, item_ids: [], parallel_of: null })}>
              {(subjects.data ?? []).map(subject => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name_en}</option>)}
            </select>
          </Field>
          <Field label="Grade">
            <select value={form.grade_id} onChange={event => setForm({ ...form, grade_id: event.target.value, item_ids: [], parallel_of: null })}>
              {(grades.data ?? []).map(grade => <option key={grade.id} value={grade.id}>{grade.label_en}</option>)}
            </select>
          </Field>
          <Field label="Parallel form of" hint="Optional (QUIZ-004): same topics and item counts as the main diagnostic, with different items." className="sm:col-span-2">
            <select value={form.parallel_of ?? ''} onChange={event => setForm({ ...form, parallel_of: event.target.value || null })}>
              <option value="">None: this is a main diagnostic</option>
              {mains.map(main => <option key={main.id} value={main.id}>{main.title_en}</option>)}
            </select>
          </Field>
          <Field label="Title (Lao)"><input value={form.title_lo} maxLength={120} required onChange={event => setForm({ ...form, title_lo: event.target.value })} /></Field>
          <Field label="Title (English)"><input value={form.title_en} maxLength={120} required onChange={event => setForm({ ...form, title_en: event.target.value })} /></Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">Approved items for this subject and grade ({form.item_ids.length} chosen)</legend>
            {candidates.length === 0 ? <Empty>No approved items for this subject and grade yet.</Empty> : (
              <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-xl bg-white p-2 ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
                {candidates.map(item => (
                  <li key={item.id}>
                    <label className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-gray-800">
                      <input type="checkbox" className="mt-1" checked={form.item_ids.includes(item.id)}
                        onChange={event => setForm({ ...form, item_ids: event.target.checked ? [...form.item_ids, item.id] : form.item_ids.filter(id => id !== item.id) })} />
                      <span className="flex-1"><span className="font-bold">{topicOf(item.topic_id)?.name_en}:</span> {item.stem_lo}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          {form.item_ids.length > 0 && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">Order students will see</p>
              <ol className="grid gap-1">
                {form.item_ids.map((id, index) => (
                  <li key={id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-700">
                    <span className="w-6 font-black tabular-nums">{index + 1}.</span>
                    <span className="flex-1 break-words">{itemById.get(id)?.stem_lo ?? id}</span>
                    <IconButton label={`Move ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                    <IconButton label={`Move ${index + 1} down`} disabled={index === form.item_ids.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save draft</Button>
          </div>
        </form>
      )}

      <ReasonDialog open={retiring !== null} busy={setStatus.isPending} danger
        title="Retire this diagnostic?"
        body="Students will no longer be offered it. Finished results stay with the students."
        confirmLabel="Retire" onCancel={() => setRetiring(null)}
        onConfirm={note => retiring && setStatus.mutate({ id: retiring.id, action: 'retire', note }, { onSuccess: () => { setRetiring(null); toast.success('Diagnostic retired.') }, onError })} />
    </Panel>
  )
}
