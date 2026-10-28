import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, Check, Clock3, Dumbbell, Flag, ListChecks, NotebookPen, Pause, Pencil, Play, Plus, Target, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  previewGoal, useArchiveGoal, usePausePlan, usePlanner, useSaveGoal, useSavePlan, useSetPlannerXp, useUpdateTask,
  type Feasibility, type GoalPreview, type LearningGoal, type PlannerView, type StudyTask,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { plainNumber } from '@/lib/academic/scoreInput'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { PremiumNote } from './PremiumNote'
import { academicErrorText } from './errorText'
import { CardTitle, SubjectBadge } from './visuals'

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const chip = 'rounded-full px-3.5 py-2 text-sm font-bold ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const FEASIBILITY_EMOJI: Record<Feasibility, string> = { steady: '🙂', stretch: '💪', ambitious: '🚀', maintain: '🏆' }
const TASK_ICONS: Record<StudyTask['kind'], { icon: typeof Target; color: string }> = {
  diagnostic: { icon: ListChecks, color: '#8b5cf6' },
  practice_set: { icon: Dumbbell, color: '#f97316' },
  academy_lesson: { icon: BookOpen, color: '#0ea5e9' },
  academy_challenge: { icon: Trophy, color: '#eab308' },
  self_study: { icon: NotebookPen, color: '#6366f1' },
}
const TONES: Record<Feasibility, string> = {
  steady: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200',
  stretch: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200',
  ambitious: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  maintain: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
}

/** S13 Study planner (P3-PLAN #54): goals, study time, this week, last week. */
export function Planner() {
  const { t } = useAcademicCopy()
  const planner = usePlanner()
  if (planner.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (planner.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, planner.error)} />
  const view = planner.data
  return (
    <div className="space-y-5">
      <p className="px-1 text-sm text-slate-600 dark:text-slate-400">{t('planner.intro')}</p>
      <GoalsCard view={view} />
      {view.entitled ? <PlanCard view={view} /> : <section className={card}><PremiumNote body="premium.planner" /></section>}
      {view.entitled && view.plan && view.week && <WeekView view={view} />}
      {view.entitled && view.review && <ReviewCard review={view.review} />}
    </div>
  )
}

// ─── Goals (PLAN-001) ────────────────────────────────────────────────────────

function FeasibilityChip({ value }: { value: Feasibility }) {
  const { t } = useAcademicCopy()
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide', TONES[value])}><span aria-hidden className="text-sm normal-case">{FEASIBILITY_EMOJI[value]}</span>{t(`planner.feasibility.${value}` as AcademicCopyKey)}</span>
}

/** Baseline → target bar with the latest score marked; the text keeps the number. */
function GoalProgress({ baseline, target, latest, label }: { baseline: number; target: number; latest: number; label: string }) {
  const span = Number(target) - Number(baseline)
  const share = span > 0 ? Math.max(0, Math.min(1, (Number(latest) - Number(baseline)) / span)) : 1
  return (
    <div className="mt-2">
      <div aria-hidden className="flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
        <span>{plainNumber(baseline)}</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-emerald-500" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
        <span>🏁 {plainNumber(target)}</span>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  )
}

function GoalsCard({ view }: { view: PlannerView }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const archive = useArchiveGoal()
  const [editing, setEditing] = useState<LearningGoal | 'new' | null>(null)
  const [prefill, setPrefill] = useState<{ subject: string; target: number } | null>(null)
  const atLimit = !view.entitled && view.goals.length >= view.free_goals
  const name = (goal: { subject_lo: string; subject_en: string }) => (lo ? goal.subject_lo : goal.subject_en)

  return (
    <section className={card}>
      <CardTitle emoji="🎯" color="#f97316" title={t('planner.goals')} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Compass aria-hidden className="h-3.5 w-3.5 shrink-0" />{t('planner.guide')}</p>
      {view.goals.length === 0 && !editing && (
        <div className="mt-3 space-y-3">
          <p className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400"><span aria-hidden className="text-2xl">🌱</span>{t('planner.empty')}</p>
          {view.suggestion && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-indigo-50 p-4 text-sm dark:bg-indigo-500/10">
              <span aria-hidden className="text-2xl">💡</span>
              <span className="min-w-[12rem] flex-1 font-bold">{t('planner.suggestion', {
                subject: lo ? view.suggestion.name_lo : view.suggestion.name_en,
                baseline: plainNumber(view.suggestion.baseline), target: plainNumber(view.suggestion.target),
              })}</span>
              <Button size="sm" onClick={() => { setPrefill({ subject: view.suggestion!.subject_enrolment_id, target: Number(view.suggestion!.target) }); setEditing('new') }}>
                {t('planner.useSuggestion')}
              </Button>
            </div>
          )}
        </div>
      )}
      <ul className="mt-3 space-y-3">
        {view.goals.map(goal => editing !== 'new' && editing?.id === goal.id ? (
          <li key={goal.id}><GoalForm view={view} goal={goal} onDone={() => setEditing(null)} /></li>
        ) : (
          <li key={goal.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
            <div className="flex flex-wrap items-center gap-3">
              <SubjectBadge code={null} name={goal.subject_en} />
              <p className="min-w-[10rem] flex-1 font-black">{t('planner.goal.line', {
                subject: name(goal), baseline: plainNumber(goal.baseline), target: plainNumber(goal.target),
                period: lo ? goal.target_period.label_lo : goal.target_period.label_en,
              })}</p>
              <FeasibilityChip value={goal.feasibility} />
            </div>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t(`planner.help.${goal.feasibility}` as AcademicCopyKey, { gain: plainNumber(Math.round(Number(goal.required_gain) * 100) / 100) })}</p>
            {goal.milestone && goal.milestone.period && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"><Flag aria-hidden className="h-4 w-4" />
                {t('planner.milestone', { value: plainNumber(goal.milestone.value), period: lo ? goal.milestone.period.label_lo : goal.milestone.period.label_en })}
              </p>
            )}
            {goal.latest !== null && <GoalProgress baseline={goal.baseline} target={goal.target} latest={goal.latest} label={t('planner.latest', { value: plainNumber(goal.latest) })} />}
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(goal)}>{t('planner.editGoal')}</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} loading={archive.isPending && archive.variables === goal.id}
                onClick={() => archive.mutate(goal.id, { onSuccess: () => toast.success(t('planner.goalRemoved')), onError: error => toast.error(academicErrorText(t, error)) })}>
                {t('planner.removeGoal')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing === 'new' && <div className="mt-3"><GoalForm view={view} prefill={prefill} onDone={() => { setEditing(null); setPrefill(null) }} /></div>}
      {!editing && (atLimit ? <PremiumNote body="premium.planner" /> : (
        <Button className="mt-3" variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>{t('planner.addGoal')}</Button>
      ))}
    </section>
  )
}

function GoalForm({ view, goal, prefill, onDone }: { view: PlannerView; goal?: LearningGoal; prefill?: { subject: string; target: number } | null; onDone: () => void }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const save = useSaveGoal()
  const taken = new Set(view.goals.filter(g => g.id !== goal?.id).map(g => g.subject_enrolment_id))
  const choices = view.subjects.filter(s => !taken.has(s.subject_enrolment_id))
  const [subject, setSubject] = useState(goal?.subject_enrolment_id ?? prefill?.subject ?? choices.find(s => s.baseline !== null)?.subject_enrolment_id ?? '')
  const [target, setTarget] = useState(goal ? plainNumber(goal.target) : prefill ? plainNumber(prefill.target) : '')
  const [period, setPeriod] = useState(goal?.target_period.id ?? view.periods[Math.min(3, view.periods.length - 1)]?.id ?? '')
  const [preview, setPreview] = useState<GoalPreview | null>(null)
  const baseline = goal ? goal.baseline : view.subjects.find(s => s.subject_enrolment_id === subject)?.baseline ?? null
  const value = Number(target.replace(',', '.'))

  // Live feasibility from the server (PRD §19.7), a moment after typing stops.
  useEffect(() => {
    setPreview(null)
    if (!subject || !period || !target.trim() || Number.isNaN(value)) return
    const timer = window.setTimeout(() => { void previewGoal(subject, value, period).then(setPreview).catch(() => setPreview(null)) }, 300)
    return () => window.clearTimeout(timer)
  }, [subject, period, target])

  const submit = () => save.mutate(goal ? { id: goal.id, target: value, target_period_id: period } : { subject_enrolment_id: subject, target: value, target_period_id: period }, {
    onSuccess: () => { toast.success(t('planner.goalSaved')); onDone() },
    onError: error => toast.error(academicErrorText(t, error)),
  })

  const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-gray-950'
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-black">{t('planner.form.subject')}
          <select className={field} value={subject} disabled={!!goal} onChange={event => setSubject(event.target.value)}>
            {(goal ? view.subjects.filter(s => s.subject_enrolment_id === goal.subject_enrolment_id) : choices).map(s => (
              <option key={s.subject_enrolment_id} value={s.subject_enrolment_id} disabled={s.baseline === null}>
                {s.baseline === null ? t('planner.form.noScores', { subject: lo ? s.name_lo : s.name_en }) : lo ? s.name_lo : s.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black">{t('planner.form.target')}
          <input className={field} inputMode="decimal" value={target} onChange={event => setTarget(event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-black">{t('planner.form.by')}
          <select className={field} value={period} onChange={event => setPeriod(event.target.value)}>
            {view.periods.map(p => <option key={p.id} value={p.id}>{t('planner.form.months', { period: lo ? p.label_lo : p.label_en, count: p.months })}</option>)}
          </select>
        </label>
      </div>
      {baseline !== null && <p className="text-xs text-slate-600 dark:text-slate-400">{t('planner.form.from', { baseline: plainNumber(baseline) })}</p>}
      {preview && (
        <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
          <FeasibilityChip value={preview.feasibility} />
          {t(`planner.help.${preview.feasibility}` as AcademicCopyKey, { gain: plainNumber(Math.round(Number(preview.required_gain) * 100) / 100) })}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
        <Button size="sm" loading={save.isPending} disabled={!subject || !period || !target.trim() || Number.isNaN(value)} onClick={submit}>{t('planner.form.save')}</Button>
      </div>
    </div>
  )
}

// ─── Study time, pause (PLAN-002/006) ────────────────────────────────────────

function PlanCard({ view }: { view: PlannerView }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const savePlan = useSavePlan()
  const pause = usePausePlan()
  const xp = useSetPlannerXp()
  const plan = view.plan
  const [editing, setEditing] = useState(!plan)
  const [days, setDays] = useState<number[]>(plan?.days ?? [1, 3, 6])
  const [minutes, setMinutes] = useState(plan?.minutes_per_day ?? 20)
  const [pausing, setPausing] = useState(false)
  const [until, setUntil] = useState('')
  const [xpOn, setXpOn] = useState(plan?.xp_opt_in ?? false)
  useEffect(() => setXpOn(plan?.xp_opt_in ?? false), [plan?.xp_opt_in])
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  const dayName = (d: number) => t(`planner.day.${d}` as AcademicCopyKey)
  const maxPause = useMemo(() => new Date(new Date(view.today).getTime() + 90 * 86400_000).toISOString().slice(0, 10), [view.today])
  const tomorrow = useMemo(() => new Date(new Date(view.today).getTime() + 86400_000).toISOString().slice(0, 10), [view.today])

  return (
    <section className={card}>
      <CardTitle emoji="📅" color="#6366f1" title={t('planner.plan')} />
      {plan && !editing ? (
        <div className="mt-2 space-y-3">
          <p className="flex items-center gap-2 font-bold"><Clock3 aria-hidden className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />{t('planner.planLine', { days: plan.days.map(dayName).join(', '), minutes: plan.minutes_per_day })}</p>
          {/* PLAN-005 (OD-09): opt-in, never punitive. */}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={xpOn} disabled={xp.isPending}
              onChange={event => {
                const on = event.target.checked
                setXpOn(on)
                xp.mutate(on, { onError: error => { setXpOn(!on); onError(error) } })
              }} />
            <span><span className="block font-bold"><span aria-hidden>⭐ </span>{t('planner.xp', { xp: plan.xp_per_task })}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-400">{t('planner.xpHelp')}</span></span>
          </label>
          {plan.paused_until && (
            <p role="status" className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60"><span aria-hidden>⏸️</span><span>{t('planner.pausedUntil', { date: formatDate(plan.paused_until, language) })}</span></p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>{t('planner.editPlan')}</Button>
            {plan.paused_until
              ? <Button size="sm" variant="ghost" icon={<Play className="h-4 w-4" />} loading={pause.isPending} onClick={() => pause.mutate(null, { onError })}>{t('planner.resume')}</Button>
              : <Button size="sm" variant="ghost" icon={<Pause className="h-4 w-4" />} onClick={() => setPausing(value => !value)}>{t('planner.pause')}</Button>}
          </div>
          {pausing && !plan.paused_until && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-black">{t('planner.pauseUntil')}
                <input type="date" min={tomorrow} max={maxPause} value={until} onChange={event => setUntil(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-gray-950" />
              </label>
              <Button size="sm" disabled={!until} loading={pause.isPending} onClick={() => pause.mutate(until, { onSuccess: () => setPausing(false), onError })}>{t('planner.pause')}</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <fieldset>
            <legend className="text-sm font-black">{t('planner.days')}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <button key={d} type="button" aria-pressed={days.includes(d)} onClick={() => setDays(current => current.includes(d) ? current.filter(x => x !== d) : [...current, d].sort())}
                  className={cn(chip, days.includes(d) ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white ring-slate-200 dark:bg-gray-900 dark:ring-slate-700')}>
                  {dayName(d)}
                </button>
              ))}
            </div>
            <p className={cn('mt-1 text-xs', days.length === 7 ? 'font-bold text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400')}>{t('planner.restDay')}</p>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-black">{t('planner.minutes')}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {view.minutes_options.map(m => (
                <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}
                  className={cn(chip, minutes === m ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white ring-slate-200 dark:bg-gray-900 dark:ring-slate-700')}>
                  <span aria-hidden>⏱ </span>{t('planner.task.minutes', { count: m })}
                </button>
              ))}
            </div>
          </fieldset>
          {plan && <p className="text-xs text-slate-500 dark:text-slate-400">{t('planner.changesTomorrow')}</p>}
          <div className="flex justify-end gap-2">
            {plan && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>}
            <Button size="sm" disabled={days.length === 0 || days.length === 7} loading={savePlan.isPending}
              onClick={() => savePlan.mutate({ days, minutes_per_day: minutes }, { onSuccess: () => setEditing(false), onError })}>
              {plan ? t('planner.savePlan') : t('planner.start')}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── This week (PLAN-003/004) ────────────────────────────────────────────────

function taskTitle(task: StudyTask, lo: boolean, t: (key: AcademicCopyKey, vars?: Record<string, string | number>) => string) {
  if (task.kind === 'self_study') return t('planner.task.self_study', { subject: (lo ? task.subject_lo : task.subject_en) ?? '' })
  return (lo ? task.title_lo ?? task.title_en : task.title_en ?? task.title_lo) ?? ''
}

function TaskIcon({ kind, subject }: { kind: StudyTask['kind']; subject: string | null }) {
  if (kind === 'self_study' && subject) return <SubjectBadge code={null} name={subject} size="sm" />
  const { icon: Icon, color } = TASK_ICONS[kind]
  return <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ color, backgroundColor: `${color}1f` }}><Icon className="h-4 w-4" /></span>
}

function WeekView({ view }: { view: PlannerView }) {
  const { t, lo, language } = useAcademicCopy()
  const toast = useToast()
  const update = useUpdateTask()
  const week = view.week!
  const plan = view.plan!
  const days = Array.from({ length: 7 }, (_, i) => new Date(new Date(`${week.week_start}T00:00:00Z`).getTime() + i * 86400_000).toISOString().slice(0, 10))
  const act = (taskId: string, action: 'done' | 'undo' | 'skip' | 'keep') => update.mutate({ taskId, action }, { onError: error => toast.error(academicErrorText(t, error)) })
  const rest = week.tasks.filter(task => task.date >= view.today && task.state === 'scheduled').length === 0

  return (
    <section className={card}>
      <CardTitle emoji="🗓️" color="#0ea5e9" title={t('planner.week')} />
      {week.decisions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {week.decisions.map(task => (
            <li key={task.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-800/60">
              <span aria-hidden className="text-xl">🤔</span>
              <span className="min-w-[12rem] flex-1"><span className="block font-bold">{taskTitle(task, lo, t)}</span>{t('planner.decision')}</span>
              <Button size="sm" variant="outline" onClick={() => act(task.id, 'keep')}>{t('planner.keep')}</Button>
              <Button size="sm" variant="ghost" onClick={() => act(task.id, 'skip')}>{t('planner.skip')}</Button>
            </li>
          ))}
        </ul>
      )}
      <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {days.map((date, i) => {
          const tasks = week.tasks.filter(task => task.date === date && !task.needs_decision)
          const studyDay = plan.days.includes(i + 1)
          return (
            <li key={date} className={cn('py-3', date === view.today && '-mx-2 rounded-2xl bg-indigo-50/70 px-2 dark:bg-indigo-500/10')}>
              <p className={cn('text-xs font-black uppercase tracking-wide', date === view.today ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400')}>
                {t(`planner.day.${i + 1}` as AcademicCopyKey)} · {formatDate(date, language)}{date === view.today ? ` · ${t('planner.today')}` : ''}
              </p>
              {tasks.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{studyDay ? '—' : <><span aria-hidden>😴 </span>{t('planner.rest')}</>}</p>
              ) : (
                <ul className="mt-1 space-y-2">
                  {tasks.map(task => (
                    <li key={task.id} data-testid={`task-${task.id}`} className="flex flex-wrap items-center gap-2">
                      <TaskIcon kind={task.kind} subject={task.subject_en} />
                      <span className="min-w-[10rem] flex-1">
                        <span className={cn('block font-bold', task.state !== 'scheduled' && 'text-slate-500 dark:text-slate-400')}>{taskTitle(task, lo, t)}</span>
                        <span className="block text-xs text-slate-600 dark:text-slate-400">
                          {t('planner.task.minutes', { count: task.est_minutes })}
                          {task.moved && ` · ${t('planner.task.moved', { date: formatDate(task.first_date, language) })}`}
                        </span>
                      </span>
                      {task.state === 'done' && <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" />{t('planner.task.finished')}</span>}
                      {task.xp > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"><span aria-hidden>⭐ </span>{t('planner.task.xp', { xp: task.xp })}</span>}
                      {task.state === 'skipped' && <span className="text-xs font-bold text-slate-500"><span aria-hidden>⏭️ </span>{t('planner.task.skipped')}</span>}
                      {task.state === 'scheduled' && task.route && (
                        <Link to={task.route} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:ring-indigo-500/40">
                          {t('planner.task.open')}<ArrowRight aria-hidden className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {task.state === 'scheduled' && <Button size="sm" variant="outline" icon={<Check className="h-4 w-4" />} onClick={() => act(task.id, 'done')}>{t('planner.task.done')}</Button>}
                      {task.state === 'done' && task.done_by === 'student' && <Button size="sm" variant="ghost" onClick={() => act(task.id, 'undo')}>{t('planner.task.undo')}</Button>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
      {rest && <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><span aria-hidden className="text-xl">🎉</span>{t('planner.weekEmpty')}</p>}
    </section>
  )
}

function ReviewCard({ review }: { review: NonNullable<PlannerView['review']> }) {
  const { t, lo } = useAcademicCopy()
  const topics = review.topics.map(topic => (lo ? topic.lo ?? topic.en : topic.en ?? topic.lo)).filter(Boolean)
  return (
    <section className={card}>
      <CardTitle emoji="📊" color="#10b981" title={t('planner.review')} />
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('planner.reviewLine', { done: review.done, planned: review.planned, minutes: review.minutes })}</p>
      {topics.length > 0 && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('planner.reviewTopics', { topics: topics.join(', ') })}</p>}
    </section>
  )
}
