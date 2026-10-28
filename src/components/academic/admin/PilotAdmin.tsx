import { useState } from 'react'
import { CheckCircle2, CircleDashed, Copy, Lock, LockOpen, Plus, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { usePilot, useSavePilotCohort, useSetPilotMode, useSetRollout, type PilotCohort, type RolloutCriterionKey, type RolloutView } from '@/lib/academic/adminApi'
import { Empty, Field, Panel, Pill, ReasonDialog, adminErrorText, formatDateTime } from './AdminKit'
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

      {view.rollout && <RolloutPanel rollout={view.rollout} pilotMode={view.pilot_mode} />}

      <Panel title="Cohorts" description="One per pilot school or community. Give students the code; they type it once, during set-up. A cap stops new sign-ups when the cohort is full."
        actions={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => edit()}>New cohort</Button>}>
        {view.cohorts.length === 0 ? <Empty>No cohorts yet. Create one per pilot school, then turn the gate on.</Empty> : (
          <div tabIndex={0} className="overflow-x-auto">
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

// ─── Staged launch (REL-002, migration 170, decision ROLLOUT) ────────────────

const STEPS = [10, 50, 100] as const

const CRITERIA: Record<RolloutCriterionKey, { label: string; show: (value: number | null, target: number | null) => string }> = {
  days: { label: 'At least 7 days at this step', show: value => (value === null ? 'Not started' : `${value} days`) },
  availability: { label: 'Availability', show: (value, target) => `${value === null ? '—' : `${(value * 100).toFixed(2)}%`} (target ${target === null ? '—' : `${(target * 100).toFixed(1)}%`})` },
  read_p95_ms: { label: 'Read response time, p95', show: (value, target) => `${value ?? '—'} ms (target ${target} ms)` },
  write_p95_ms: { label: 'Write response time, p95', show: (value, target) => `${value ?? '—'} ms (target ${target} ms)` },
  dashboard_p75_ms: { label: 'Dashboard on students\' phones, p75', show: (value, target) => `${value ?? '—'} ms (target ${target} ms)` },
  open_alerts: { label: 'No open alerts', show: value => `${value ?? 0} open` },
  priority_reports: { label: 'No unresolved priority problem reports', show: value => `${value ?? 0} unresolved` },
}

function CriterionStatus({ met }: { met: boolean | null }) {
  if (met === null) return <span className="inline-flex items-center gap-1 text-xs font-black text-slate-600 dark:text-slate-400"><CircleDashed className="h-4 w-4" aria-hidden />Not enough data</span>
  return met
    ? <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" aria-hidden />Met</span>
    : <span className="inline-flex items-center gap-1 text-xs font-black text-red-700 dark:text-red-400"><XCircle className="h-4 w-4" aria-hidden />Not met</span>
}

/**
 * After the pilot, Schooling opens to 10%, then 50%, then 100% of accounts
 * (fixed per account). Moving up shows the step's criteria and needs a tick
 * to go on with one unmet; moving back only stops new set-ups.
 */
function RolloutPanel({ rollout, pilotMode }: { rollout: RolloutView; pilotMode: boolean }) {
  const toast = useToast()
  const setRollout = useSetRollout()
  const [target, setTarget] = useState<10 | 50 | 100 | null>(null)
  const [confirmUnmet, setConfirmUnmet] = useState(false)
  const unmet = rollout.criteria.filter(criterion => criterion.met === false)
  const movingUp = target !== null && target > rollout.percent
  const close = () => { setTarget(null); setConfirmUnmet(false) }

  return (
    <Panel title="Launch steps"
      description="Once the pilot gate is off, Schooling opens to a share of accounts: 10%, then 50%, then everyone. An account in at 10% stays in at 50%. Outside the share students see “Opening soon”; a cohort code still lets them in. Moving back only stops new set-ups: students who already set up keep Schooling.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold">Open to {rollout.percent === 100 ? 'everyone' : `${rollout.percent}% of accounts`}{pilotMode && rollout.percent < 100 ? ' once the pilot gate is off' : ''}</p>
          {rollout.since && (
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Since {formatDateTime(rollout.since)}{rollout.new_students !== null ? ` · ${rollout.new_students} new students since` : ''}
            </p>
          )}
        </div>
        <div role="group" aria-label="Launch step" className="inline-flex gap-2">
          {STEPS.map(step => (
            <Button key={step} size="sm" variant={step === rollout.percent ? 'primary' : 'outline'} aria-pressed={step === rollout.percent}
              disabled={step === rollout.percent} onClick={() => setTarget(step)}>
              {step === 100 ? 'Everyone' : `${step}%`}
            </Button>
          ))}
        </div>
      </div>

      {rollout.percent < 100 && (
        <div className="mt-5">
          <h3 className="text-sm font-black">Before the next step</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {rollout.criteria.map(criterion => (
              <li key={criterion.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span className="font-bold">{CRITERIA[criterion.key].label}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-slate-600 dark:text-slate-400">{CRITERIA[criterion.key].show(criterion.value, criterion.target)}</span>
                  <CriterionStatus met={criterion.met} />
                </span>
              </li>
            ))}
            <li className="py-2 text-slate-600 dark:text-slate-400">Also check that Bookstore orders and Academy lessons look normal (not measured here).</li>
          </ul>
        </div>
      )}

      {rollout.history.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-black">Changes</h3>
          <ul className="mt-2 grid gap-1 text-sm">
            {rollout.history.map(change => (
              <li key={change.at}><span className="tabular-nums text-slate-600 dark:text-slate-400">{formatDateTime(change.at)}</span> · {change.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <ReasonDialog open={target !== null} busy={setRollout.isPending} disabled={movingUp && unmet.length > 0 && !confirmUnmet}
        title={target === 100 ? 'Open Schooling to everyone?' : `Open Schooling to ${target}% of accounts?`}
        body={(
          <div className="grid gap-3">
            <p>{movingUp
              ? 'More students will be able to set up Schooling without a code.'
              : 'New set-ups outside the smaller share stop. Students who already set up keep Schooling. To stop everyone, use the module switch (release runbook).'}</p>
            {movingUp && unmet.length > 0 && (
              <label className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-bold text-red-800 dark:bg-red-500/10 dark:text-red-300">
                <input type="checkbox" className="mt-1" checked={confirmUnmet} onChange={event => setConfirmUnmet(event.target.checked)} />
                <span>Not met: {unmet.map(criterion => CRITERIA[criterion.key].label).join(', ')}. Move on anyway (saved in the audit log).</span>
              </label>
            )}
          </div>
        )}
        confirmLabel={target === 100 ? 'Open to everyone' : `Open to ${target}%`}
        onCancel={close}
        onConfirm={reason => target !== null && setRollout.mutate({ percent: target, reason, confirmUnmet }, {
          onSuccess: () => { close(); toast.success('Launch step changed.') },
          onError: error => toast.error(adminErrorText(error)),
        })} />
    </Panel>
  )
}
