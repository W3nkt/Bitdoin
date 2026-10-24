import { useState } from 'react'
import { CheckCircle2, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminScales, useApproveScaleVersion, useCreateScale, useCreateScaleVersion, useDeleteDraftVersion, useRetireScaleVersion,
  type AdminScale, type OrdinalLevel, type ScaleFamily, type ScaleFields, type ScaleVersion,
} from '@/lib/academic/adminApi'
import { Empty, Field, Panel, Pill, adminErrorText, formatDateTime } from './AdminKit'

interface Draft {
  scaleId: string | null
  code: string
  name_lo: string
  name_en: string
  family: ScaleFamily
  min: string
  max: string
  step: string
  decimals: string
  passMark: string
  normalisable: boolean
  levels: OrdinalLevel[]
}

const FAMILY: Record<ScaleFamily, string> = { numeric_linear: 'Numbers', ordinal: 'Grades / levels', pass_fail: 'Pass / fail' }
const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(Number(value)))

function draftFrom(scale: AdminScale | null, base: ScaleVersion | undefined): Draft {
  return {
    scaleId: scale?.id ?? null,
    code: scale?.code ?? '',
    name_lo: scale?.name_lo ?? '',
    name_en: scale?.name_en ?? '',
    family: base?.scale_family ?? 'numeric_linear',
    min: text(base?.min_value ?? 0),
    max: text(base?.max_value ?? 10),
    step: text(base?.step ?? 0.5),
    decimals: String(base?.decimals ?? 1),
    passMark: text(base?.pass_mark ?? 5),
    normalisable: base?.normalisable ?? true,
    levels: base?.ordinal_levels ?? [{ code: '', label_lo: '', label_en: '' }],
  }
}

function fieldsOf(draft: Draft): ScaleFields {
  const number = (value: string) => (value.trim() === '' ? null : Number(value))
  if (draft.family === 'numeric_linear') {
    return {
      scale_family: 'numeric_linear', min_value: number(draft.min), max_value: number(draft.max), step: number(draft.step),
      decimals: Number(draft.decimals), pass_mark: number(draft.passMark), normalisable: draft.normalisable, ordinal_levels: null,
    }
  }
  return {
    scale_family: draft.family, min_value: null, max_value: null, step: null, decimals: 0, pass_mark: null, normalisable: false,
    ordinal_levels: draft.levels.map(level => ({ code: level.code.trim(), label_lo: level.label_lo.trim(), label_en: level.label_en.trim() })),
  }
}

function problem(draft: Draft): string | null {
  if (!draft.scaleId && (!draft.code.trim() || !draft.name_lo.trim() || !draft.name_en.trim())) return 'Give the scale a code and both names.'
  if (draft.family === 'numeric_linear') {
    const [min, max] = [Number(draft.min), Number(draft.max)]
    if (draft.min.trim() === '' || draft.max.trim() === '' || !(max > min)) return 'Maximum must be higher than minimum.'
    if (draft.step.trim() !== '' && !(Number(draft.step) > 0)) return 'Step must be more than 0, or empty for any value.'
    if (draft.passMark.trim() !== '' && (Number(draft.passMark) < min || Number(draft.passMark) > max)) return 'Pass mark must be between minimum and maximum.'
    return null
  }
  if (draft.levels.length === 0 || draft.levels.some(level => !level.code.trim() || !level.label_lo.trim() || !level.label_en.trim())) return 'Every level needs a code and both labels.'
  if (new Set(draft.levels.map(level => level.code.trim())).size !== draft.levels.length) return 'Level codes must be different.'
  return null
}

function describe(version: ScaleVersion) {
  if (version.scale_family === 'numeric_linear') {
    return `${text(version.min_value)}–${text(version.max_value)}${version.step ? `, step ${text(version.step)}` : ''}, ${version.decimals} decimals${version.pass_mark !== null ? `, pass ${text(version.pass_mark)}` : ''}${version.normalisable ? ', comparable' : ''}`
  }
  return (version.ordinal_levels ?? []).map(level => level.code).join(' < ')
}

/** Grading scales and their versions (ADMIN-002, OD-13a). */
export function ScalesAdmin() {
  const toast = useToast()
  const scales = useAdminScales()
  const createScale = useCreateScale()
  const createVersion = useCreateScaleVersion()
  const approve = useApproveScaleVersion()
  const retire = useRetireScaleVersion()
  const deleteDraft = useDeleteDraftVersion()
  const [draft, setDraft] = useState<Draft | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  function submit() {
    if (!draft || problem(draft)) return
    const done = { onSuccess: () => { setDraft(null); toast.success('Draft version saved. Approve it to use it.') }, onError }
    if (draft.scaleId) createVersion.mutate({ scaleId: draft.scaleId, fields: fieldsOf(draft) }, done)
    else createScale.mutate({ code: draft.code.trim().toUpperCase(), name_lo: draft.name_lo.trim(), name_en: draft.name_en.trim(), fields: fieldsOf(draft) }, done)
  }

  const setLevel = (index: number, patch: Partial<OrdinalLevel>) =>
    setDraft(current => current && { ...current, levels: current.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)) })
  const issue = draft ? problem(draft) : null

  return (
    <Panel
      title="Grading scales"
      description="Scales are never changed in place. A change makes a new draft version; once approved, new score entries use it and saved scores keep the version they were entered with."
      actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setDraft(draftFrom(null, undefined))}>Add scale</Button>}
    >
      {scales.isPending ? <Skeleton className="h-48 w-full rounded-xl" />
        : scales.isError ? <Empty>{adminErrorText(scales.error)}</Empty>
        : scales.data.length === 0 ? <Empty>No scales yet.</Empty>
        : (
          <div className="grid gap-4">
            {scales.data.map(scale => (
              <article key={scale.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-400">{scale.code}</span>
                    <span className="font-black">{scale.name_lo}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{scale.name_en}</span>
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setDraft(draftFrom(scale, scale.versions.find(version => version.status === 'approved') ?? scale.versions[0]))}>New version</Button>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <tr><th className="px-4 py-2">Version</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Settings</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scale.versions.map(version => (
                        <tr key={version.id}>
                          <td className="px-4 py-3 font-black">v{version.version}</td>
                          <td className="px-4 py-3">{FAMILY[version.scale_family]}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{describe(version)}</td>
                          <td className="px-4 py-3">
                            <Pill tone={version.status === 'approved' ? 'green' : version.status === 'draft' ? 'amber' : 'gray'}>{version.status}</Pill>
                            {version.approved_at && <span className="ml-2 text-xs text-slate-500">{formatDateTime(version.approved_at)}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {version.status === 'draft' && <>
                                <Button size="sm" variant="success" icon={<CheckCircle2 className="h-4 w-4" />} loading={approve.isPending && approve.variables === version.id}
                                  onClick={() => approve.mutate(version.id, { onSuccess: () => toast.success(`v${version.version} approved.`), onError })}>Approve</Button>
                                <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />}
                                  onClick={() => deleteDraft.mutate(version.id, { onError })}>Delete draft</Button>
                              </>}
                              {version.status === 'approved' && (
                                <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Retire v${version.version}? Saved scores keep it; new entries can no longer use it.`)) retire.mutate(version.id, { onError }) }}>Retire</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.scaleId ? `New version of ${draft.code}` : 'Add grading scale'} size="xl">
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!draft.scaleId && <>
              <Field label="Code" hint="e.g. LA-0-10"><input value={draft.code} maxLength={32} onChange={event => setDraft({ ...draft, code: event.target.value })} /></Field>
              <div className="hidden sm:block" />
              <Field label="Lao name"><input lang="lo" value={draft.name_lo} maxLength={120} onChange={event => setDraft({ ...draft, name_lo: event.target.value })} /></Field>
              <Field label="English name"><input value={draft.name_en} maxLength={120} onChange={event => setDraft({ ...draft, name_en: event.target.value })} /></Field>
            </>}
            <Field label="Type" className="sm:col-span-2">
              <select value={draft.family} onChange={event => setDraft({ ...draft, family: event.target.value as ScaleFamily })}>
                {Object.entries(FAMILY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            {draft.family === 'numeric_linear' ? <>
              <Field label="Minimum"><input type="number" inputMode="decimal" value={draft.min} onChange={event => setDraft({ ...draft, min: event.target.value })} /></Field>
              <Field label="Maximum"><input type="number" inputMode="decimal" value={draft.max} onChange={event => setDraft({ ...draft, max: event.target.value })} /></Field>
              <Field label="Step" hint="e.g. 0.5. Leave empty to allow any value."><input type="number" inputMode="decimal" value={draft.step} onChange={event => setDraft({ ...draft, step: event.target.value })} /></Field>
              <Field label="Decimals shown">
                <select value={draft.decimals} onChange={event => setDraft({ ...draft, decimals: event.target.value })}>{['0', '1', '2'].map(value => <option key={value}>{value}</option>)}</select>
              </Field>
              <Field label="Pass mark" hint="Optional."><input type="number" inputMode="decimal" value={draft.passMark} onChange={event => setDraft({ ...draft, passMark: event.target.value })} /></Field>
              <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold">
                <input type="checkbox" checked={draft.normalisable} onChange={event => setDraft({ ...draft, normalisable: event.target.checked })} />
                Comparable across scales (normalisable)
              </label>
            </> : (
              <div className="grid gap-2 sm:col-span-2">
                <p className="text-xs font-black text-slate-600 dark:text-slate-300">Levels, lowest first</p>
                {draft.levels.map((level, index) => (
                  <div key={index} className="grid grid-cols-[5rem_1fr_1fr_auto] items-center gap-2">
                    <input aria-label={`Level ${index + 1} code`} placeholder="Code" value={level.code} maxLength={8} onChange={event => setLevel(index, { code: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
                    <input aria-label={`Level ${index + 1} Lao label`} lang="lo" placeholder="Lao label" value={level.label_lo} onChange={event => setLevel(index, { label_lo: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
                    <input aria-label={`Level ${index + 1} English label`} placeholder="English label" value={level.label_en} onChange={event => setLevel(index, { label_en: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-gray-900" />
                    <button type="button" aria-label={`Remove level ${index + 1}`} onClick={() => setDraft({ ...draft, levels: draft.levels.filter((_, i) => i !== index) })}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="ghost" className="justify-self-start" icon={<Plus className="h-4 w-4" />}
                  onClick={() => setDraft({ ...draft, levels: [...draft.levels, { code: '', label_lo: '', label_en: '' }] })}>Add level</Button>
              </div>
            )}
            {issue && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400 sm:col-span-2">{issue}</p>}
            <div className="sm:col-span-2">
              <Button fullWidth disabled={!!issue} loading={createScale.isPending || createVersion.isPending} onClick={submit} icon={<Save className="h-4 w-4" />}>Save as draft</Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  )
}
