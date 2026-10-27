import { useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import {
  useCareerContent, useCareerDue, useReviewCareerContent, useSaveCareerContent,
  type CareerContentView, type CareerFact, type CareerKind, type CareerRecord, type CareerStatus,
} from '@/lib/academic/adminApi'
import { cn } from '@/lib/utils'
import { Empty, Field, IconButton, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'

// Career catalogue (P4-CAR #55: ADMIN-010, UNI-001/002/004; migration 148).
// Careers keep the Academy Career Explorer's slugs (one catalogue,
// CAREER-008). Each record has a working copy and the copy students see; a
// different admin approves changes (four-eyes). Time-sensitive facts need a
// source link, the date they were checked and a review-by date.

const STATUS: Record<CareerStatus, { label: string; tone: 'green' | 'amber' | 'gray' | 'blue' }> = {
  draft: { label: 'Draft', tone: 'gray' },
  in_review: { label: 'In review', tone: 'amber' },
  published: { label: 'Published', tone: 'green' },
  archived: { label: 'Archived', tone: 'gray' },
}
const KINDS: { id: CareerKind; label: string }[] = [
  { id: 'career', label: 'Careers' },
  { id: 'institution', label: 'Institutions' },
  { id: 'programme', label: 'Programmes' },
  { id: 'scholarship', label: 'Scholarships' },
]
const AREAS: Record<string, string> = { R: 'Building & fixing', I: 'Investigating & science', A: 'Creating & designing', S: 'Helping & teaching', E: 'Leading & business', C: 'Organising & data' }
const STUDY: Record<string, string> = { le3: 'Up to 3 years', '4to5': '4–5 years', '6plus': '6 years or more' }
const SETTINGS: Record<string, string> = { office: 'Office', outdoors: 'Outdoors', workshop_lab: 'Workshop or lab', with_people: 'With people' }
const DEGREES: Record<string, string> = { certificate: 'Certificate', diploma: 'Diploma', higher_diploma: 'Higher diploma', bachelor: 'Bachelor', master: 'Master', doctorate: 'Doctorate' }
const FACT_KINDS: Record<string, string> = { salary: 'Salary', demand: 'Demand', employers: 'Employers', other: 'Other' }
const REQUIREMENT_KINDS: Record<string, string> = { requirement: 'Entrance requirement', cutoff: 'Cut-off score' }
const today = () => new Date().toISOString().slice(0, 10)
const inMonths = (months: number) => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10) }
const blankFact = (kind: string): CareerFact => ({ kind, text_en: '', text_lo: '', source_name: '', source_url: '', verified_on: today(), review_by: inMonths(6) })
const str = (value: unknown) => (typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value))
const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
const titleOf = (record: CareerRecord) => str(record.draft.title_en || record.draft.name_en) || record.slug
const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean)

export function CareersAdmin() {
  const toast = useToast()
  const [kind, setKind] = useState<CareerKind>('career')
  const [status, setStatus] = useState<CareerStatus | 'all'>('all')
  const [editing, setEditing] = useState<{ record?: CareerRecord; data: Record<string, unknown>; slug?: string } | null>(null)
  const [noteFor, setNoteFor] = useState<{ record: CareerRecord; action: 'return' | 'archive' } | null>(null)
  const content = useCareerContent(kind)
  const due = useCareerDue()
  const review = useReviewCareerContent()
  const onError = (error: unknown) => toast.error(adminErrorText(error))
  const act = (record: CareerRecord, action: 'submit' | 'approve' | 'restore', done: string) =>
    review.mutate({ id: record.id, action }, { onSuccess: () => toast.success(done), onError })

  const view = content.data
  const items = (view?.items ?? []).filter(item => status === 'all' || item.status === status)
  const count = (value: CareerStatus) => (view?.items ?? []).filter(item => item.status === value).length

  return (
    <div className="grid gap-6">
      {(due.data?.length ?? 0) > 0 && (
        <Panel title="Review-by dates" description="Published records with a fact or record that needs checking within 30 days. Past the date, students see “May be out of date” and the fact is left out of reports.">
          <ul className="grid gap-1 text-sm">
            {due.data!.map(item => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                {item.overdue ? <Pill tone="red">Overdue</Pill> : <Pill tone="amber">Due</Pill>}
                <span className="font-bold">{item.name}</span>
                <span className="text-slate-600 dark:text-slate-400">{item.kind} · review by {item.review_by}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Career catalogue"
        description="One catalogue with the Academy Career Explorer. Students only see published copies; a different admin approves every change."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} disabled={!view}
          onClick={() => setEditing({ data: kind === 'programme' ? { institution: view?.institutions[0]?.slug ?? '', requirements: [], careers: [] } : kind === 'career' ? { facts: [], related_subjects: [], work_settings: [] } : kind === 'scholarship' ? { institution: '' } : { type: 'university', province_code: 'vientiane-prefecture', faculties: [] } })}>
          New {kind}</Button>}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Content" className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            {KINDS.map(item => (
              <button key={item.id} type="button" role="tab" aria-selected={kind === item.id} onClick={() => { setKind(item.id); setStatus('all') }}
                className={cn('rounded-full px-3 py-1.5 text-xs font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  kind === item.id ? 'bg-white text-slate-950 shadow-sm dark:bg-gray-950 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>
                {item.label}
              </button>
            ))}
          </div>
          {(['all', 'in_review', 'draft', 'published', 'archived'] as const).map(value => (
            <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                status === value ? 'bg-slate-950 text-white dark:bg-primary-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
              {value === 'all' ? `All (${view?.items.length ?? 0})` : `${STATUS[value].label} (${count(value)})`}
            </button>
          ))}
        </div>

        {content.isPending ? <Skeleton className="h-48 w-full rounded-2xl" /> : content.isError ? <Empty>{adminErrorText(content.error)}</Empty>
          : items.length === 0 ? <Empty>Nothing here yet.</Empty> : (
          <ul className="grid gap-3">
            {items.map(record => {
              const problems = Object.entries(record.problems)
              const busy = review.isPending && review.variables?.id === record.id
              return (
                <li key={record.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Pill tone={STATUS[record.status].tone}>{STATUS[record.status].label}</Pill>
                    {record.published && record.changed && record.status !== 'archived' && <Pill tone="blue">Changed since published</Pill>}
                    <code>{record.slug}</code>
                    <span className="text-slate-500 dark:text-slate-400">{record.last_edited_by ? `edited by ${record.last_edited_by} · ` : ''}{formatDateTime(record.updated_at)}</span>
                  </div>
                  <p className="mt-2 font-bold">{titleOf(record)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{str(record.draft.title_lo || record.draft.name_lo)}</p>
                  <Summary record={record} view={view!} />
                  {record.review_note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Note{record.reviewed_by ? ` from ${record.reviewed_by}` : ''}: {record.review_note}</p>}
                  {str(record.draft.reviewer_note) && <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">For the reviewer: {str(record.draft.reviewer_note)}</p>}
                  {record.status === 'draft' && problems.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                      {problems.map(([field, message]) => <li key={field}><span className="font-bold">{field}:</span> {message}</li>)}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {record.status !== 'archived' && <Button size="sm" variant="outline" onClick={() => setEditing({ record, data: record.draft })}>Edit</Button>}
                    {record.status === 'draft' && <Button size="sm" disabled={problems.length > 0} loading={busy} onClick={() => act(record, 'submit', 'Sent for review.')}>Send for review</Button>}
                    {record.status === 'in_review' && <>
                      <Button size="sm" variant="success" disabled={!record.can_approve} loading={busy} onClick={() => act(record, 'approve', 'Approved. Students now see this version.')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setNoteFor({ record, action: 'return' })}>Return</Button>
                      {!record.can_approve && <span className="text-xs text-slate-600 dark:text-slate-400">You wrote or edited this version, so another admin must approve it.</span>}
                    </>}
                    {record.status === 'archived'
                      ? <Button size="sm" variant="ghost" loading={busy} onClick={() => act(record, 'restore', 'Restored.')}>Restore</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setNoteFor({ record, action: 'archive' })}>Archive</Button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {editing && view && <Editor kind={kind} view={view} value={editing} onClose={() => setEditing(null)} />}

      <ReasonDialog open={noteFor !== null} busy={review.isPending}
        title={noteFor?.action === 'return' ? 'Return to draft?' : 'Archive this record?'}
        body={noteFor?.action === 'return' ? 'It goes back to draft with your note.' : 'Students will no longer see it. Programmes of an archived institution are hidden too.'}
        confirmLabel={noteFor?.action === 'return' ? 'Return' : 'Archive'} danger={noteFor?.action === 'archive'}
        onCancel={() => setNoteFor(null)}
        onConfirm={note => noteFor && review.mutate({ id: noteFor.record.id, action: noteFor.action, note }, {
          onSuccess: () => { setNoteFor(null); toast.success(noteFor.action === 'return' ? 'Returned to draft.' : 'Archived.') },
          onError,
        })} />
    </div>
  )
}

function SourceLink({ name, url, verified, reviewBy }: { name: string; url: string; verified: string; reviewBy: string }) {
  return (
    <span className="text-xs text-slate-600 dark:text-slate-400">
      {url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-700 underline dark:text-indigo-300">{name || url}<ExternalLink aria-hidden className="h-3 w-3" /></a> : 'No source'}
      {` · checked ${verified || '—'} · review by ${reviewBy || '—'}`}
    </span>
  )
}

function Summary({ record, view }: { record: CareerRecord; view: CareerContentView }) {
  const d = record.draft
  if (record.kind === 'career') {
    return (
      <div className="mt-2 grid gap-1 text-sm">
        <p>{str(d.cluster).replace('_', ' ')} · {AREAS[str(d.primary_area)] ?? '—'}{d.secondary_area ? ` + ${AREAS[str(d.secondary_area)]}` : ''} · {STUDY[str(d.study_years)] ?? '—'} · {list(d.work_settings).map(s => SETTINGS[s] ?? s).join(', ')}</p>
        <p className="text-slate-600 dark:text-slate-400">Subjects: {list(d.related_subjects).join(', ') || '—'}</p>
        <p className="text-slate-600 dark:text-slate-400">{(d.facts as CareerFact[] | undefined)?.length ? `${(d.facts as CareerFact[]).length} sourced fact(s)` : 'No sourced facts: salary and demand stay hidden in personalised views (OD-10).'}</p>
      </div>
    )
  }
  if (record.kind === 'institution') {
    const faculties = (d.faculties as { name_lo: string; name_en: string }[] | undefined) ?? []
    return (
      <div className="mt-2 grid gap-1 text-sm">
        <p>{str(d.type)} · {LAOS_ADMIN_DIVISIONS.find(p => p.id === d.province_code)?.name_en ?? str(d.province_code)} · {faculties.length} faculties</p>
        <SourceLink name={str(d.source_name)} url={str(d.source_url)} verified={str(d.verified_on)} reviewBy={str(d.review_by)} />
      </div>
    )
  }
  if (record.kind === 'scholarship') {
    return (
      <div className="mt-2 grid gap-1 text-sm">
        <p>{str(d.provider)} · deadline {str(d.deadline) || '—'} · {str(d.academic_year) || '—'}</p>
        <p className="text-slate-600 dark:text-slate-400">{str(d.eligibility_en)}</p>
        <SourceLink name={str(d.source_name)} url={str(d.source_url)} verified={str(d.verified_on)} reviewBy={str(d.review_by)} />
      </div>
    )
  }
  const requirements = (d.requirements as CareerFact[] | undefined) ?? []
  return (
    <div className="mt-2 grid gap-1 text-sm">
      <p>{view.institutions.find(i => i.slug === d.institution)?.name_en ?? str(d.institution)} · {DEGREES[str(d.degree_level)] ?? '—'} · {str(d.duration_years)} years{d.duration_unconfirmed === true ? ' (not confirmed)' : ''} · entrance group {str(d.entrance_group) || 'not confirmed'}{d.field ? ` · ${str(d.field).replace('_', ' ')}` : ''}</p>
      <p className="text-slate-600 dark:text-slate-400">Careers: {list(d.careers).join(', ') || '—'} · {requirements.length} requirement(s) or cut-off(s)</p>
      <SourceLink name={str(d.source_name)} url={str(d.source_url)} verified={str(d.verified_on)} reviewBy={str(d.review_by)} />
    </div>
  )
}

/** Sourced facts (careers) or entrance requirements and cut-offs (programmes). */
function FactRows({ facts, kinds, needYear, onChange }: { facts: CareerFact[]; kinds: Record<string, string>; needYear: boolean; onChange: (facts: CareerFact[]) => void }) {
  const set = (index: number, patch: Partial<CareerFact>) => onChange(facts.map((fact, i) => (i === index ? { ...fact, ...patch } : fact)))
  return (
    <div className="grid gap-3">
      {facts.map((fact, index) => (
        <fieldset key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-2">
          <legend className="px-1 text-xs font-black">{kinds[fact.kind] ?? 'Fact'} {index + 1}</legend>
          <Field label="Kind"><select value={fact.kind} onChange={event => set(index, { kind: event.target.value })}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          {needYear && <Field label="Academic year" hint="For example 2026-2027. Cut-offs are never extrapolated to other years."><input value={fact.academic_year ?? ''} onChange={event => set(index, { academic_year: event.target.value })} /></Field>}
          <Field label="Text (English)"><input value={fact.text_en} onChange={event => set(index, { text_en: event.target.value })} /></Field>
          <Field label="Text (Lao)"><input value={fact.text_lo} onChange={event => set(index, { text_lo: event.target.value })} /></Field>
          <Field label="Source name"><input value={fact.source_name} onChange={event => set(index, { source_name: event.target.value })} /></Field>
          <Field label="Source link"><input type="url" value={fact.source_url} placeholder="https://" onChange={event => set(index, { source_url: event.target.value })} /></Field>
          <Field label="Checked on"><input type="date" value={fact.verified_on} onChange={event => set(index, { verified_on: event.target.value })} /></Field>
          <Field label="Review by"><input type="date" value={fact.review_by} onChange={event => set(index, { review_by: event.target.value })} /></Field>
          <div className="sm:col-span-2"><IconButton label={`Remove ${kinds[fact.kind] ?? 'fact'} ${index + 1}`} danger onClick={() => onChange(facts.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></IconButton></div>
        </fieldset>
      ))}
      <div><Button type="button" size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => onChange([...facts, blankFact(Object.keys(kinds)[0])])}>Add</Button></div>
    </div>
  )
}

function Editor({ kind, view, value, onClose }: { kind: CareerKind; view: CareerContentView; value: { record?: CareerRecord; data: Record<string, unknown> }; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveCareerContent()
  const [data, setData] = useState<Record<string, unknown>>(value.data)
  const [slug, setSlug] = useState('')
  const set = (patch: Record<string, unknown>) => setData(current => ({ ...current, ...patch }))
  const text = (key: string, label: string, props: { textarea?: boolean; hint?: string; type?: string } = {}) => (
    <Field label={label} hint={props.hint}>
      {props.textarea
        ? <textarea rows={3} value={str(data[key])} onChange={event => set({ [key]: event.target.value })} />
        : <input type={props.type ?? 'text'} value={str(data[key])} onChange={event => set({ [key]: event.target.value })} />}
    </Field>
  )
  const toggle = (key: string, item: string, max?: number) => {
    const current = list(data[key])
    set({ [key]: current.includes(item) ? current.filter(x => x !== item) : max && current.length >= max ? current : [...current, item] })
  }
  const source = <>
    {text('source_name', 'Source name')}
    {text('source_url', 'Source link (official)', { type: 'url' })}
    {text('verified_on', 'Checked on', { type: 'date' })}
    {text('review_by', 'Review by', { type: 'date' })}
  </>

  return (
    <Modal open onClose={onClose} title={value.record ? `Edit ${titleOf(value.record)}` : `New ${kind}`} size="xl">
      <form className="grid gap-4" onSubmit={event => {
        event.preventDefault()
        save.mutate({ id: value.record?.id, kind, slug: value.record ? undefined : slug.trim() || undefined, data },
          { onSuccess: () => { toast.success('Saved. Send it for review when it is ready.'); onClose() }, onError: error => toast.error(adminErrorText(error)) })
      }}>
        {!value.record && kind !== 'programme' && kind !== 'scholarship' && (
          <Field label="Slug" hint={kind === 'career' ? 'Use the Career Explorer id for an existing career, e.g. software-engineer.' : 'Short id, e.g. nuol.'}>
            <input value={slug} required pattern="[a-z0-9][a-z0-9\-]{1,63}" onChange={event => setSlug(event.target.value)} />
          </Field>
        )}

        {kind === 'career' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('title_en', 'Title (English)')}
            {text('title_lo', 'Title (Lao)')}
            {text('summary_en', 'What the work involves (English)', { textarea: true })}
            {text('summary_lo', 'What the work involves (Lao)', { textarea: true })}
            <Field label="Cluster"><select value={str(data.cluster)} onChange={event => set({ cluster: event.target.value })}><option value="">Choose</option>{view.clusters.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></Field>
            <Field label="Study after Grade 12"><select value={str(data.study_years)} onChange={event => set({ study_years: event.target.value })}><option value="">Choose</option>{Object.entries(STUDY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Main interest area"><select value={str(data.primary_area)} onChange={event => set({ primary_area: event.target.value })}><option value="">Choose</option>{Object.entries(AREAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Second interest area (optional)"><select value={str(data.secondary_area)} onChange={event => set({ secondary_area: event.target.value })}><option value="">None</option>{Object.entries(AREAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <fieldset><legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Related school subjects (up to 4)</legend>
            <div className="flex flex-wrap gap-3 text-sm">{view.subjects.map(s => <label key={s.code} className="flex items-center gap-1.5"><input type="checkbox" checked={list(data.related_subjects).includes(s.code)} onChange={() => toggle('related_subjects', s.code, 4)} />{s.name_en}</label>)}</div>
          </fieldset>
          <fieldset><legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Work settings</legend>
            <div className="flex flex-wrap gap-3 text-sm">{Object.entries(SETTINGS).map(([v, l]) => <label key={v} className="flex items-center gap-1.5"><input type="checkbox" checked={list(data.work_settings).includes(v)} onChange={() => toggle('work_settings', v)} />{l}</label>)}</div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preparation that helps (English, one per line)"><textarea rows={4} value={list(data.preparation_en).join('\n')} onChange={event => set({ preparation_en: lines(event.target.value) })} /></Field>
            <Field label="Preparation that helps (Lao, one per line)"><textarea rows={4} value={list(data.preparation_lo).join('\n')} onChange={event => set({ preparation_lo: lines(event.target.value) })} /></Field>
          </div>
          <fieldset><legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Sourced facts (salary, demand, employers): shown with their source and dates</legend>
            <FactRows facts={(data.facts as CareerFact[]) ?? []} kinds={FACT_KINDS} needYear={false} onChange={facts => set({ facts })} />
          </fieldset>
        </>}

        {kind === 'institution' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('name_en', 'Name (English)')}
            {text('name_lo', 'Name (Lao)')}
            {text('short_name', 'Short name')}
            <Field label="Type"><select value={str(data.type)} onChange={event => set({ type: event.target.value })}>{['university', 'college', 'tvet', 'other'].map(t => <option key={t} value={t}>{t === 'tvet' ? 'TVET' : t}</option>)}</select></Field>
            <Field label="Province"><select value={str(data.province_code)} onChange={event => set({ province_code: event.target.value })}>{LAOS_ADMIN_DIVISIONS.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}</select></Field>
            {text('website_url', 'Official website', { type: 'url' })}
            {source}
          </div>
          <Field label="Faculties (one per line: Lao name | English name)">
            <textarea rows={6} value={((data.faculties as { name_lo: string; name_en: string }[]) ?? []).map(f => `${f.name_lo} | ${f.name_en}`).join('\n')}
              onChange={event => set({ faculties: lines(event.target.value).map(line => { const [lo, en] = line.split('|').map(x => x.trim()); return { name_lo: lo ?? '', name_en: en ?? '' } }) })} />
          </Field>
        </>}

        {kind === 'programme' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Institution"><select value={str(data.institution)} onChange={event => set({ institution: event.target.value })}>{view.institutions.map(i => <option key={i.slug} value={i.slug}>{i.name_en}</option>)}</select></Field>
            {text('faculty', 'Faculty')}
            {text('name_en', 'Programme name (English)')}
            {text('name_lo', 'Programme name (Lao)')}
            <Field label="Degree level"><select value={str(data.degree_level)} onChange={event => set({ degree_level: event.target.value })}><option value="">Choose</option>{Object.entries(DEGREES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <div className="grid gap-1.5">
              {text('duration_years', 'Duration (years)', { type: 'number' })}
              {data.duration_unconfirmed !== undefined && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.duration_unconfirmed !== true} onChange={event => set({ duration_unconfirmed: !event.target.checked })} />
                  Length confirmed with the faculty (the pre-filled length is not from an official source)
                </label>
              )}
            </div>
            {text('entrance_group', 'Entrance exam group', { hint: 'One letter, only when the official source says so. Leave empty if not confirmed.' })}
            {text('applicable_year', 'Academic year (optional)')}
            <Field label="Field (for search)"><select value={str(data.field)} onChange={event => set({ field: event.target.value })}><option value="">None</option>{view.clusters.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></Field>
            {source}
          </div>
          <fieldset><legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Careers this programme leads to</legend>
            <div className="flex flex-wrap gap-3 text-sm">{view.careers.map(c => <label key={c.slug} className="flex items-center gap-1.5"><input type="checkbox" checked={list(data.careers).includes(c.slug)} onChange={() => toggle('careers', c.slug)} />{c.title_en}</label>)}</div>
          </fieldset>
          <fieldset><legend className="mb-1 text-xs font-black text-slate-600 dark:text-slate-300">Entrance requirements and cut-offs: only with an official source and the academic year (UNI-004)</legend>
            <FactRows facts={(data.requirements as CareerFact[]) ?? []} kinds={REQUIREMENT_KINDS} needYear onChange={requirements => set({ requirements })} />
          </fieldset>
        </>}

        {kind === 'scholarship' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {text('name_en', 'Name (English)')}
            {text('name_lo', 'Name (Lao)')}
            {text('provider', 'Offered by')}
            <Field label="Institution (optional)"><select value={str(data.institution)} onChange={event => set({ institution: event.target.value })}><option value="">None</option>{view.institutions.map(i => <option key={i.slug} value={i.slug}>{i.name_en}</option>)}</select></Field>
            {text('deadline', 'Application deadline (verified)', { type: 'date' })}
            {text('academic_year', 'Academic year')}
            {text('eligibility_en', 'Who can apply (English)', { textarea: true })}
            {text('eligibility_lo', 'Who can apply (Lao)', { textarea: true })}
            {text('amount_en', 'What it covers (English, optional)')}
            {text('amount_lo', 'What it covers (Lao, optional)')}
            {source}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save working copy</Button>
        </div>
      </form>
    </Modal>
  )
}
