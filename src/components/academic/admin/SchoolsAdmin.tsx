import { useState } from 'react'
import { FileEdit, GitMerge, Link2, Plus, Save, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import {
  useAdminSchools, useMergeSchools, useResolveTask, useReviewTasks, useSaveSchool, type AdminSchool, type ReviewTask, type SchoolInput,
} from '@/lib/academic/adminApi'
import { cn } from '@/lib/utils'
import { Empty, Field, IconButton, Panel, Pill, adminErrorText, formatDateTime } from './AdminKit'

const provinceName = (code: string | null | undefined) => LAOS_ADMIN_DIVISIONS.find(province => province.id === code)?.name_en ?? code ?? '—'
const districtName = (province: string, code: string | null) =>
  LAOS_ADMIN_DIVISIONS.find(item => item.id === province)?.districts.find(district => district.code === code)?.name_en ?? null

const blank: SchoolInput = { name_lo: '', name_en: '', romanised_name: '', province_code: 'vientiane-prefecture', district_code: null, school_type: 'public', status: 'active' }

/** Schools, merges and the unverified-school queue (ADMIN-003). */
export function SchoolsAdmin() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')
  const [includeMerged, setIncludeMerged] = useState(false)
  const schools = useAdminSchools(search, province, includeMerged)
  const save = useSaveSchool()
  const merge = useMergeSchools()
  const [draft, setDraft] = useState<SchoolInput | null>(null)
  const [merging, setMerging] = useState<AdminSchool | null>(null)

  function submit() {
    if (!draft) return
    const clean = { ...draft, name_lo: draft.name_lo.trim(), name_en: draft.name_en?.trim() || null, romanised_name: draft.romanised_name?.trim() || null }
    save.mutate(clean, { onSuccess: () => { setDraft(null); toast.success('School saved.') }, onError: error => toast.error(adminErrorText(error)) })
  }

  const districts = LAOS_ADMIN_DIVISIONS.find(item => item.id === draft?.province_code)?.districts ?? []

  return (
    <div className="grid gap-6">
      <ReviewQueue />
      <Panel
        title="Schools"
        description="Merging moves every enrolment, alias and calendar to the school you keep; the duplicate stays as a merged record so old links still work."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...blank })}>Add school</Button>}
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-gray-900">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Lao, English or romanised name" aria-label="Search schools"
              className="w-full bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <Field label="Province" className="min-w-[12rem]">
            <select value={province} onChange={event => setProvince(event.target.value)}>
              <option value="">All provinces</option>
              {LAOS_ADMIN_DIVISIONS.map(item => <option key={item.id} value={item.id}>{item.name_en}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 pb-2.5 text-sm font-bold">
            <input type="checkbox" checked={includeMerged} onChange={event => setIncludeMerged(event.target.checked)} /> Show merged
          </label>
        </div>

        {schools.isPending ? <Skeleton className="h-48 w-full rounded-xl" />
          : schools.isError ? <Empty>{adminErrorText(schools.error)}</Empty>
          : schools.data.length === 0 ? <Empty>No schools match.</Empty>
          : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {schools.data.map(school => (
                <li key={school.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-black">{school.name_lo}</span>
                      {school.name_en && <span className="text-sm text-slate-600 dark:text-slate-400">{school.name_en}</span>}
                      {school.status !== 'active' && <Pill tone={school.status === 'merged' ? 'amber' : 'gray'}>{school.status}</Pill>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {[provinceName(school.province_code), districtName(school.province_code, school.district_code), school.school_type, school.romanised_name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {school.status !== 'merged' && (
                    <div className="flex gap-2">
                      <IconButton label={`Edit ${school.name_lo}`} onClick={() => setDraft({ ...school, status: school.status === 'archived' ? 'archived' : 'active' })}><FileEdit className="h-4 w-4" /></IconButton>
                      <IconButton label={`Merge ${school.name_lo} into another school`} onClick={() => setMerging(school)}><GitMerge className="h-4 w-4" /></IconButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </Panel>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit school' : 'Add school'} size="lg">
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lao name"><input lang="lo" value={draft.name_lo} maxLength={160} onChange={event => setDraft({ ...draft, name_lo: event.target.value })} /></Field>
            <Field label="English name" hint="Optional."><input value={draft.name_en ?? ''} maxLength={160} onChange={event => setDraft({ ...draft, name_en: event.target.value })} /></Field>
            <Field label="Romanised name" hint="How students type it in Latin letters. Optional."><input value={draft.romanised_name ?? ''} maxLength={160} onChange={event => setDraft({ ...draft, romanised_name: event.target.value })} /></Field>
            <Field label="Type">
              <select value={draft.school_type ?? ''} onChange={event => setDraft({ ...draft, school_type: (event.target.value || null) as SchoolInput['school_type'] })}>
                <option value="public">Public</option><option value="private">Private</option><option value="other">Other</option><option value="">Not known</option>
              </select>
            </Field>
            <Field label="Province">
              <select value={draft.province_code} onChange={event => setDraft({ ...draft, province_code: event.target.value, district_code: null })}>
                {LAOS_ADMIN_DIVISIONS.map(item => <option key={item.id} value={item.id}>{item.name_en}</option>)}
              </select>
            </Field>
            <Field label="District">
              <select value={draft.district_code ?? ''} onChange={event => setDraft({ ...draft, district_code: event.target.value || null })}>
                <option value="">Not set</option>
                {districts.map(district => <option key={district.code} value={district.code}>{district.name_en}</option>)}
              </select>
            </Field>
            {draft.id && (
              <Field label="Status">
                <select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as 'active' | 'archived' })}>
                  <option value="active">Active</option><option value="archived">Archived (hidden from search)</option>
                </select>
              </Field>
            )}
            <div className="sm:col-span-2"><Button fullWidth disabled={!draft.name_lo.trim()} loading={save.isPending} onClick={submit} icon={<Save className="h-4 w-4" />}>Save school</Button></div>
          </div>
        )}
      </Modal>

      <MergeDialog from={merging} busy={merge.isPending} onClose={() => setMerging(null)}
        onMerge={(intoId, reason) => merge.mutate({ fromId: merging!.id, intoId, reason }, {
          onSuccess: result => { setMerging(null); toast.success(`Merged. ${result.enrolments_moved} enrolment(s) moved.`) },
          onError: error => toast.error(adminErrorText(error)),
        })} />
    </div>
  )
}

/** Search-and-pick an active school. */
export function SchoolChooser({ provinceCode, excludeId, value, onChange }: { provinceCode?: string; excludeId?: string; value: string | null; onChange: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState(provinceCode ?? '')
  const schools = useAdminSchools(search, province, false)
  const options = (schools.data ?? []).filter(school => school.id !== excludeId && school.status === 'active')
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search schools" aria-label="Search schools to choose from"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
        <select value={province} onChange={event => setProvince(event.target.value)} aria-label="Province"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900">
          <option value="">All provinces</option>
          {LAOS_ADMIN_DIVISIONS.map(item => <option key={item.id} value={item.id}>{item.name_en}</option>)}
        </select>
      </div>
      <div role="radiogroup" aria-label="Schools" className="max-h-64 overflow-y-auto rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
        {schools.isPending ? <p className="p-3 text-sm text-slate-500">Searching…</p>
          : options.length === 0 ? <p className="p-3 text-sm text-slate-500">No active schools match.</p>
          : options.map(school => (
            <label key={school.id} className={cn('flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-slate-800', value === school.id && 'bg-primary-50 dark:bg-primary-900/30')}>
              <input type="radio" name="school-choice" className="mt-1" checked={value === school.id} onChange={() => onChange(school.id)} />
              <span><span className="font-bold">{school.name_lo}</span>{school.name_en && <span className="text-slate-600 dark:text-slate-400"> · {school.name_en}</span>}
                <span className="block text-xs text-slate-500">{provinceName(school.province_code)}</span></span>
            </label>
          ))}
      </div>
    </div>
  )
}

function MergeDialog({ from, busy, onClose, onMerge }: { from: AdminSchool | null; busy: boolean; onClose: () => void; onMerge: (intoId: string, reason: string) => void }) {
  const [intoId, setIntoId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const close = () => { setIntoId(null); setReason(''); onClose() }
  return (
    <Modal open={!!from} onClose={close} title="Merge duplicate school" size="xl">
      {from && (
        <div className="grid gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong>{from.name_lo}</strong> will become an alias of the school you choose. Its enrolments (including closed years), aliases and calendars move there. This cannot be undone from here.
          </p>
          <SchoolChooser provinceCode={from.province_code} excludeId={from.id} value={intoId} onChange={setIntoId} />
          <Field label="Reason (saved in the audit log)" hint="5–200 characters.">
            <textarea rows={2} maxLength={200} value={reason} onChange={event => setReason(event.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="danger" disabled={!intoId || reason.trim().length < 5} loading={busy} icon={<GitMerge className="h-4 w-4" />}
              onClick={() => intoId && onMerge(intoId, reason.trim())}>Merge</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Schools students typed because theirs was not listed. */
function ReviewQueue() {
  const toast = useToast()
  const tasks = useReviewTasks()
  const resolve = useResolveTask()
  const [linking, setLinking] = useState<ReviewTask | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))
  const close = () => { setLinking(null); setSchoolId(null) }

  return (
    <Panel title="Schools to check" description="Students who could not find their school typed its name. Link each one to a catalogue school (add it first if needed), or keep the student's text.">
      {tasks.isPending ? <Skeleton className="h-24 w-full rounded-xl" />
        : tasks.isError ? <Empty>{adminErrorText(tasks.error)}</Empty>
        : tasks.data.length === 0 ? <Empty>Nothing to check.</Empty>
        : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.data.map(task => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-black">{task.payload.school_free_text || '—'}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{provinceName(task.payload.province_code)} · {formatDateTime(task.created_at)}</p>
                </div>
                <Button size="sm" variant="outline" icon={<Link2 className="h-4 w-4" />} onClick={() => setLinking(task)}>Link to school</Button>
                <Button size="sm" variant="ghost" loading={resolve.isPending && resolve.variables?.taskId === task.id && !resolve.variables.schoolId}
                  onClick={() => resolve.mutate({ taskId: task.id, schoolId: null, note: 'Kept as typed' }, { onError })}>Keep as typed</Button>
              </li>
            ))}
          </ul>
        )}

      <Modal open={!!linking} onClose={close} title={`Link "${linking?.payload.school_free_text ?? ''}"`} size="xl">
        {linking && (
          <div className="grid gap-4">
            <SchoolChooser provinceCode={linking.payload.province_code} value={schoolId} onChange={setSchoolId} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button disabled={!schoolId} loading={resolve.isPending}
                onClick={() => schoolId && resolve.mutate({ taskId: linking.id, schoolId }, { onSuccess: () => { close(); toast.success('Linked. The student now sees the catalogue school.') }, onError })}>Link</Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  )
}
