import { useState } from 'react'
import { Copy, Lock, LockOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { usePilot, useSavePilotCohort, useSetPilotMode, type PilotCohort } from '@/lib/academic/adminApi'
import { Empty, Field, Panel, Pill, ReasonDialog, adminErrorText } from './AdminKit'
import { SchoolChooser } from './SchoolsAdmin'

/**
 * Closed pilot (REL-001, migration 128): one cohort per pilot school or
 * community, each with a code students enter during set-up. The gate only
 * affects new students; it can be opened to everyone at any time.
 */
export function PilotAdmin() {
  const toast = useToast()
  const pilot = usePilot()
  const save = useSavePilotCohort()
  const setMode = useSetPilotMode()
  const [switching, setSwitching] = useState<boolean | null>(null)
  const [form, setForm] = useState<{ id?: string; name: string; school_id: string | null; max: string } | null>(null)
  const onError = (error: unknown) => toast.error(adminErrorText(error))

  if (pilot.isPending) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (pilot.isError) return <Empty>{adminErrorText(pilot.error)}</Empty>
  const view = pilot.data
  const edit = (cohort?: PilotCohort) => setForm(cohort
    ? { id: cohort.id, name: cohort.name, school_id: cohort.school_id, max: cohort.max_students ? String(cohort.max_students) : '' }
    : { name: '', school_id: null, max: '' })
  const submit = () => form && save.mutate({
    id: form.id, name: form.name.trim(), school_id: form.school_id, max_students: form.max ? Number(form.max) : null,
  }, { onSuccess: () => { setForm(null); toast.success('Cohort saved.') }, onError })

  return (
    <div className="grid gap-6">
      <Panel title="Pilot gate"
        description="While the gate is on, new students need a cohort code to set up Schooling. Students who already have a profile are not affected. Every change is saved in the audit log with your reason.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            {view.pilot_mode ? <Lock className="h-4 w-4" aria-hidden /> : <LockOpen className="h-4 w-4" aria-hidden />}
            {view.pilot_mode ? 'On: new students need a code' : 'Off: anyone in the Academy can set up Schooling'}
          </p>
          <Button variant={view.pilot_mode ? 'outline' : 'primary'} onClick={() => setSwitching(!view.pilot_mode)}>
            {view.pilot_mode ? 'Open to everyone' : 'Turn the gate on'}
          </Button>
        </div>
      </Panel>

      <Panel title="Cohorts" description="One per pilot school or community. Give students the code; they type it once, during set-up. A cap stops new sign-ups when the cohort is full."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => edit()}>New cohort</Button>}>
        {view.cohorts.length === 0 ? <Empty>No cohorts yet. Create one per pilot school, then turn the gate on.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Cohort</th><th className="py-2 pr-4">School</th><th className="py-2 pr-4">Students</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {view.cohorts.map(cohort => (
                  <tr key={cohort.id}>
                    <td className="py-2 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-base font-black tracking-[0.2em] dark:bg-slate-800">{cohort.code}</code>
                        <button type="button" aria-label={`Copy code ${cohort.code}`} className="rounded-full p-1.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-slate-800"
                          onClick={() => void navigator.clipboard?.writeText(cohort.code).then(() => toast.success('Code copied.'))}><Copy className="h-4 w-4" /></button>
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-bold">{cohort.name}</td>
                    <td className="py-2 pr-4">{cohort.school_name ?? '—'}</td>
                    <td className="py-2 pr-4 tabular-nums">{cohort.students}{cohort.max_students ? ` / ${cohort.max_students}` : ''}</td>
                    <td className="py-2 pr-4">{cohort.active ? <Pill tone="green">Active</Pill> : <Pill>Paused</Pill>}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => edit(cohort)}>Edit</Button>
                        <Button size="sm" variant="ghost" loading={save.isPending && save.variables?.id === cohort.id && save.variables.active !== undefined}
                          onClick={() => save.mutate({ id: cohort.id, name: cohort.name, school_id: cohort.school_id, max_students: cohort.max_students, active: !cohort.active }, { onError })}>
                          {cohort.active ? 'Pause' : 'Resume'}
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Paused cohorts accept no new students.</p>
          </div>
        )}

        {form && (
          <form className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); submit() }}>
            <Field label="Cohort name" hint="Shown to students when their code is accepted, e.g. the school's name.">
              <input value={form.name} maxLength={80} required onChange={event => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="Cap (optional)" hint="Maximum students; leave empty for no limit.">
              <input type="number" min={1} max={10000} value={form.max} onChange={event => setForm({ ...form, max: event.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-black text-slate-600 dark:text-slate-300">School (optional)</p>
              <SchoolChooser value={form.school_id} onChange={id => setForm({ ...form, school_id: id })} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={save.isPending} disabled={!form.name.trim()}>{form.id ? 'Save' : 'Create and get a code'}</Button>
            </div>
          </form>
        )}
      </Panel>

      <ReasonDialog open={switching !== null} busy={setMode.isPending}
        title={switching ? 'Turn the pilot gate on?' : 'Open Schooling to everyone?'}
        body={switching
          ? 'New students will need a cohort code to set up Schooling. Students who already have a profile keep using it.'
          : 'Anyone in the Academy will be able to set up Schooling without a code. Codes still tag students to their cohort.'}
        confirmLabel={switching ? 'Turn on' : 'Open to everyone'}
        onCancel={() => setSwitching(null)}
        onConfirm={reason => switching !== null && setMode.mutate({ enabled: switching, reason }, {
          onSuccess: () => { setSwitching(null); toast.success(switching ? 'Pilot gate on.' : 'Open to everyone.') },
          onError,
        })} />
    </div>
  )
}
