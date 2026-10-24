import { useState } from 'react'
import { FileEdit, Plus, Save, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAddAlias, useAdminGrades, useAdminSubjects, useDeleteAlias, useSaveSubject, type AdminSubject, type SubjectInput,
} from '@/lib/academic/adminApi'
import { Empty, Field, IconButton, Panel, Pill, adminErrorText } from './AdminKit'

const blank: SubjectInput = { code: '', name_lo: '', name_en: '', grade_min: 10, grade_max: 12, is_default: false, status: 'active' }

/** Subjects, their grade range and aliases (ADMIN-002). */
export function SubjectsAdmin() {
  const toast = useToast()
  const subjects = useAdminSubjects()
  const grades = useAdminGrades()
  const save = useSaveSubject()
  const addAlias = useAddAlias()
  const deleteAlias = useDeleteAlias()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<SubjectInput | null>(null)
  const [aliasText, setAliasText] = useState<Record<string, string>>({})

  const gradeLabel = (ordinal: number) => grades.data?.find(grade => grade.ordinal === ordinal)?.label_en ?? `Grade ${ordinal}`
  const term = search.trim().toLowerCase()
  const list = (subjects.data ?? []).filter(subject => !term
    || `${subject.code} ${subject.name_lo} ${subject.name_en} ${subject.aliases.map(alias => alias.alias_text).join(' ')}`.toLowerCase().includes(term))

  function edit(subject: AdminSubject) {
    const { id, code, name_lo, name_en, grade_min, grade_max, is_default, status } = subject
    setDraft({ id, code, name_lo, name_en, grade_min, grade_max, is_default, status })
  }

  function submit() {
    if (!draft) return
    save.mutate({ ...draft, code: draft.code.trim().toUpperCase(), name_lo: draft.name_lo.trim(), name_en: draft.name_en.trim() }, {
      onSuccess: () => { setDraft(null); toast.success('Subject saved.') },
      onError: error => toast.error(adminErrorText(error)),
    })
  }

  function submitAlias(subjectId: string) {
    const text = (aliasText[subjectId] ?? '').trim()
    if (!text) return
    addAlias.mutate({ subjectId, text }, {
      onSuccess: () => setAliasText(current => ({ ...current, [subjectId]: '' })),
      onError: error => toast.error(adminErrorText(error)),
    })
  }

  const draftValid = !!draft && draft.code.trim() && draft.name_lo.trim() && draft.name_en.trim() && draft.grade_max >= draft.grade_min

  return (
    <Panel
      title="Subjects"
      description="Names students see, which grades each subject applies to, and other names score books use for it (aliases). Defaults are pre-selected for new students."
      actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...blank })}>Add subject</Button>}
    >
      <label className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-gray-900">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subjects or aliases" aria-label="Search subjects or aliases"
          className="w-full bg-transparent py-2.5 text-sm outline-none" />
      </label>

      {subjects.isPending ? <Skeleton className="h-48 w-full rounded-xl" />
        : subjects.isError ? <Empty>{adminErrorText(subjects.error)}</Empty>
        : list.length === 0 ? <Empty>No subjects match.</Empty>
        : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map(subject => (
              <li key={subject.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-400">{subject.code}</span>
                    <span className="font-black">{subject.name_lo}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{subject.name_en}</span>
                    {subject.is_default && <Pill tone="blue">Default</Pill>}
                    {subject.status === 'archived' && <Pill>Archived</Pill>}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{gradeLabel(subject.grade_min)} – {gradeLabel(subject.grade_max)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {subject.aliases.map(alias => (
                      <span key={alias.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-bold dark:bg-slate-800">
                        {alias.alias_text}{alias.school_id && <span className="text-slate-500"> · school</span>}
                        <button type="button" aria-label={`Remove alias ${alias.alias_text}`} onClick={() => deleteAlias.mutate(alias.id, { onError: error => toast.error(adminErrorText(error)) })}
                          className="grid h-5 w-5 place-items-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    <form onSubmit={event => { event.preventDefault(); submitAlias(subject.id) }} className="inline-flex">
                      <input value={aliasText[subject.id] ?? ''} onChange={event => setAliasText(current => ({ ...current, [subject.id]: event.target.value }))}
                        placeholder="+ alias" aria-label={`Add alias for ${subject.name_en}`} maxLength={80}
                        className="w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-2.5 py-0.5 text-xs outline-none focus:border-primary-500 dark:border-slate-600" />
                    </form>
                  </div>
                </div>
                <div className="flex gap-2"><IconButton label={`Edit ${subject.name_en}`} onClick={() => edit(subject)}><FileEdit className="h-4 w-4" /></IconButton></div>
              </li>
            ))}
          </ul>
        )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit subject' : 'Add subject'} size="lg">
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" hint="Short and unique, e.g. MATH. Changing it does not affect saved scores.">
              <input value={draft.code} maxLength={32} onChange={event => setDraft({ ...draft, code: event.target.value })} />
            </Field>
            <Field label="Status">
              <select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as SubjectInput['status'] })}>
                <option value="active">Active</option>
                <option value="archived">Archived (hidden from new students)</option>
              </select>
            </Field>
            <Field label="Lao name"><input lang="lo" value={draft.name_lo} maxLength={80} onChange={event => setDraft({ ...draft, name_lo: event.target.value })} /></Field>
            <Field label="English name"><input value={draft.name_en} maxLength={80} onChange={event => setDraft({ ...draft, name_en: event.target.value })} /></Field>
            <Field label="From grade">
              <select value={draft.grade_min} onChange={event => setDraft({ ...draft, grade_min: Number(event.target.value) })}>
                {grades.data?.map(grade => <option key={grade.id} value={grade.ordinal}>{grade.label_en} · {grade.label_lo}</option>)}
              </select>
            </Field>
            <Field label="To grade">
              <select value={draft.grade_max} onChange={event => setDraft({ ...draft, grade_max: Number(event.target.value) })}>
                {grades.data?.map(grade => <option key={grade.id} value={grade.ordinal}>{grade.label_en} · {grade.label_lo}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
              <input type="checkbox" checked={draft.is_default} onChange={event => setDraft({ ...draft, is_default: event.target.checked })} />
              Pre-select for new students in these grades
            </label>
            {draft.grade_max < draft.grade_min && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400 sm:col-span-2">"To grade" must not be lower than "From grade".</p>}
            <div className="sm:col-span-2"><Button fullWidth disabled={!draftValid} loading={save.isPending} onClick={submit} icon={<Save className="h-4 w-4" />}>Save subject</Button></div>
          </div>
        )}
      </Modal>
    </Panel>
  )
}
