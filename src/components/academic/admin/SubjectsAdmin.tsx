import { useState } from 'react'
import {
  Atom, BookOpenCheck, Calculator, ChevronDown, Dumbbell, FileEdit, FlaskConical,
  Globe2, GraduationCap, Landmark, Languages, Leaf, Monitor, Palette, Plus,
  Save, Scale, Search, Sparkles, Tags, X, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAddAlias, useAdminGrades, useAdminSubjects, useDeleteAlias, useSaveSubject, type AdminSubject, type SubjectInput,
} from '@/lib/academic/adminApi'
import { Empty, Field, IconButton, Panel, Pill, adminErrorText } from './AdminKit'

const blank: SubjectInput = { code: '', name_lo: '', name_en: '', grade_min: 10, grade_max: 12, is_default: false, status: 'active' }

const subjectVisuals: Record<string, { icon: LucideIcon; tone: string }> = {
  MATH: { icon: Calculator, tone: 'bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20' },
  PHYS: { icon: Atom, tone: 'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/20' },
  CHEM: { icon: FlaskConical, tone: 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20' },
  BIO: { icon: Leaf, tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20' },
  LAO: { icon: BookOpenCheck, tone: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/20' },
  ENG: { icon: Languages, tone: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20' },
  HIST: { icon: Landmark, tone: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20' },
  GEO: { icon: Globe2, tone: 'bg-teal-50 text-teal-600 ring-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/20' },
  ICT: { icon: Monitor, tone: 'bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/20' },
  PE: { icon: Dumbbell, tone: 'bg-orange-50 text-orange-600 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20' },
  CIV: { icon: Scale, tone: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
  ART: { icon: Palette, tone: 'bg-pink-50 text-pink-600 ring-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/20' },
}

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
      description="Manage subject names, grades and aliases. Default subjects are pre-selected for new students."
      actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...blank })}>Add subject</Button>}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/15 dark:border-slate-700 dark:bg-slate-950/40">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search subjects or aliases" aria-label="Search subjects or aliases"
            className="min-w-0 w-full bg-transparent py-2.5 text-sm outline-none" />
        </label>
        {!subjects.isPending && !subjects.isError && <p role="status" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {term ? `${list.length} of ${subjects.data?.length ?? 0}` : list.length} {subjects.data?.length === 1 ? 'subject' : 'subjects'}
        </p>}
      </div>

      {subjects.isPending ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
        : subjects.isError ? <Empty>{adminErrorText(subjects.error)}</Empty>
        : list.length === 0 ? <Empty>No subjects match.</Empty>
        : (
          <ul aria-label="Subjects" className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map(subject => {
              const visual = subjectVisuals[subject.code.toUpperCase()] ?? { icon: BookOpenCheck, tone: 'bg-primary-50 text-primary-600 ring-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-500/20' }
              const SubjectIcon = visual.icon
              const gradeRange = subject.grade_min === subject.grade_max ? gradeLabel(subject.grade_min) : `${gradeLabel(subject.grade_min)} – ${gradeLabel(subject.grade_max)}`
              return (
              <li key={subject.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow] hover:border-primary-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-primary-700">
                <div className="flex min-h-16 items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ${visual.tone}`}>
                    <SubjectIcon aria-hidden className="h-6 w-6" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400">{subject.code}</span>
                    <h3 className="mt-0.5 break-words text-sm font-bold leading-5 text-slate-900 dark:text-slate-100">{subject.name_en}</h3>
                  </div>
                  <IconButton label={`Edit ${subject.name_en}`} onClick={() => edit(subject)}><FileEdit aria-hidden className="h-4 w-4" /></IconButton>
                </div>
                <p lang="lo" className="mt-3 min-h-7 break-words text-sm font-semibold leading-7 text-slate-700 dark:text-slate-300">{subject.name_lo}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <GraduationCap aria-hidden className="h-3.5 w-3.5" />{gradeRange}
                  </span>
                  {subject.is_default && <Pill tone="blue"><Sparkles aria-hidden className="mr-1 h-3 w-3" />Default</Pill>}
                  {subject.status === 'archived' && <Pill>Archived</Pill>}
                </div>
                <details className="group/aliases mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <summary aria-label={`Aliases for ${subject.name_en}`} className="flex min-h-7 cursor-pointer list-none items-center gap-2 rounded-lg text-xs font-semibold text-slate-500 transition-colors hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-400 dark:hover:text-primary-300 [&::-webkit-details-marker]:hidden">
                    <Tags aria-hidden className="h-3.5 w-3.5" />
                    <span>Aliases</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{subject.aliases.length}</span>
                    <ChevronDown aria-hidden className="ml-auto h-3.5 w-3.5 transition-transform group-open/aliases:rotate-180" />
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subject.aliases.map(alias => (
                      <span key={alias.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-0.5 text-xs font-semibold dark:bg-slate-800">
                        <span className="break-words [overflow-wrap:anywhere]">{alias.alias_text}{alias.school_id && <span className="text-slate-500 dark:text-slate-400"> · school</span>}</span>
                        <button type="button" aria-label={`Remove alias ${alias.alias_text}`} disabled={deleteAlias.isPending} onClick={() => deleteAlias.mutate(alias.id, { onError: error => toast.error(adminErrorText(error)) })}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:hover:bg-slate-700"><X aria-hidden className="h-3 w-3" /></button>
                      </span>
                    ))}
                    {subject.aliases.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No aliases yet.</p>}
                  </div>
                  <form onSubmit={event => { event.preventDefault(); submitAlias(subject.id) }} className="mt-3 flex gap-2">
                    <input value={aliasText[subject.id] ?? ''} onChange={event => setAliasText(current => ({ ...current, [subject.id]: event.target.value }))}
                      placeholder="Add another name" aria-label={`Add alias for ${subject.name_en}`} maxLength={80}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2.5 py-2 text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 dark:border-slate-700" />
                    <button type="submit" aria-label={`Save alias for ${subject.name_en}`} disabled={addAlias.isPending || !(aliasText[subject.id] ?? '').trim()}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25"><Plus aria-hidden className="h-4 w-4" /></button>
                  </form>
                </details>
              </li>
              )
            })}
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
