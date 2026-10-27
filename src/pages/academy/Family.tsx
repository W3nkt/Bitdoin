import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { academicErrorText } from '@/components/academic/errorText'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  previewGuardianInvite, useAcceptGuardianInvite, useFamily, useGuardianChild, useGuardianRemoveLink, useGuardianReport,
  type GuardianChildView, type GuardianLink, type GuardianScope, type GuardianScopes,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { ReportPurchase } from '@/components/academic/CareerReport'

// Family (P3-PAR #52: PARENT-002/003/007): a parent or guardian links to a
// child with the code the child gave them, says how they are related and
// confirms they are the parent or guardian. The child then confirms the name.
// Each linked child has their own progress page, with only what they share (PARENT-005).

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const SCOPES: GuardianScope[] = ['scores', 'plan', 'careers', 'goals_text']
const RELATIONSHIPS: GuardianLink['relationship'][] = ['mother', 'father', 'guardian', 'other']

function Join() {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') ?? '')
  const [preview, setPreview] = useState<{ student_name: string; purpose: 'link' | 'consent'; scopes: GuardianScopes } | null>(null)
  const [relationship, setRelationship] = useState<GuardianLink['relationship'] | ''>('')
  const [declared, setDeclared] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [checking, setChecking] = useState(false)
  const accept = useAcceptGuardianInvite()
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))

  const check = async (event: React.FormEvent) => {
    event.preventDefault()
    setChecking(true)
    try { setPreview(await previewGuardianInvite(code.trim())) } catch (error) { onError(error) } finally { setChecking(false) }
  }

  return (
    <section className={card}>
      <h2 className="text-lg font-black">{t('family.join')}</h2>
      <form onSubmit={check} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid flex-1 basis-48 gap-1 text-sm font-bold">
          {t('family.codeLabel')}
          <input value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setPreview(null) }} maxLength={12} autoComplete="off" spellCheck={false}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-gray-950" />
        </label>
        <Button type="submit" variant="outline" loading={checking} disabled={code.trim().length < 8}>{t('family.check')}</Button>
      </form>

      {preview && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800/60">
          <p className="font-bold">{t(preview.purpose === 'consent' ? 'family.previewConsent' : 'family.preview', { name: preview.student_name })}</p>
          <p className="mt-2 text-sm">{t('family.wouldSee')}</p>
          <ul className="list-disc pl-5 text-sm">
            {SCOPES.filter(scope => preview.scopes[scope]).map(scope => <li key={scope}>{t(`guardians.scope.${scope}` as AcademicCopyKey)}</li>)}
          </ul>
          <label className="mt-3 grid gap-1 text-sm font-bold">
            {t('family.relationship')}
            <select value={relationship} onChange={event => setRelationship(event.target.value as GuardianLink['relationship'])}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-600 dark:bg-gray-950">
              <option value="">—</option>
              {RELATIONSHIPS.map(value => <option key={value} value={value}>{t(`guardians.relationship.${value}` as AcademicCopyKey)}</option>)}
            </select>
          </label>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={declared} onChange={event => setDeclared(event.target.checked)} />{t('family.declaration')}
          </label>
          {preview.purpose === 'consent' && (
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={event => setAgreed(event.target.checked)} />{t('family.declarationConsent')}
            </label>
          )}
          <Button className="mt-3" loading={accept.isPending} disabled={!relationship || !declared || (preview.purpose === 'consent' && !agreed)}
            onClick={() => relationship && accept.mutate({ code: code.trim(), relationship }, {
              onSuccess: () => { toast.success(t('family.accepted', { name: preview.student_name })); setPreview(null); setCode('') },
              onError,
            })}>
            {t('family.accept')}
          </Button>
        </div>
      )}
    </section>
  )
}

function ChildCard({ link }: { link: GuardianLink }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const remove = useGuardianRemoveLink()
  const [removing, setRemoving] = useState(false)
  const name = link.student_name ?? '—'
  return (
    <li className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-base font-black">{name}{link.grade ? <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-400">{link.grade}</span> : null}</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {link.status === 'pending_student' ? t('family.waiting', { name, date: formatDate(link.confirm_by, language) })
          : link.status === 'removed' ? t('family.ended', { date: formatDate(link.removed_at ?? link.declared_at, language) })
          : link.status === 'active' ? t('family.active')
          : t(`guardians.status.${link.status}` as AcademicCopyKey)}
      </p>
      {link.status === 'active' && (
        <Link to={`/academy/family/${link.id}`} className="mt-2 inline-block text-sm font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">{t('family.seeProgress')}</Link>
      )}
      {link.status !== 'removed' && (removing ? (
        <div role="alertdialog" aria-labelledby={`stop-${link.id}`} className="mt-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
          <p id={`stop-${link.id}`} className="font-black">{t('family.removeTitle', { name })}</p>
          <p className="mt-1 text-sm">{t('family.removeBody')}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRemoving(false)}>{t('common.cancel')}</Button>
            <Button size="sm" variant="danger" loading={remove.isPending}
              onClick={() => remove.mutate(link.id, { onError: error => toast.error(academicErrorText(t, error)) })}>{t('guardians.remove')}</Button>
          </div>
        </div>
      ) : <Button className="mt-2" size="sm" variant="ghost" onClick={() => setRemoving(true)}>{t('guardians.remove')}</Button>)}
    </li>
  )
}

export function Family() {
  const { t, language } = useAcademicCopy()
  const family = useFamily()
  const links = family.data?.links ?? []
  const notices = family.data?.notices ?? []
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <Link to="/academy" className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300">
          <ArrowLeft aria-hidden className="h-4 w-4" />Academy
        </Link>
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-black"><Users aria-hidden className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />{t('family.title')}</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('family.body')}</p>
        </header>
        <Join />
        <section className={card}>
          <h2 className="text-lg font-black">{t('family.children')}</h2>
          {family.isPending ? <div className="mt-3 h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            : family.isError ? <p className="mt-2 text-sm">{academicErrorText(t, family.error)}</p>
            : links.length === 0 ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('family.none')}</p>
            : <ul className="mt-3 grid gap-3">{links.map(link => <ChildCard key={link.id} link={link} />)}</ul>}
          {notices.length > 0 && (
            <ul className="mt-4 grid gap-1 text-sm text-slate-600 dark:text-slate-400">
              {notices.slice(0, 5).map((notice, index) => {
                const key = notice.code === 'guardian.confirmed' ? 'family.note.confirmed' : notice.code === 'guardian.declined' ? 'family.note.declined' : notice.code === 'guardian.removed' ? 'family.note.removed' : null
                return key ? <li key={index}>{formatDate(notice.created_at, language)} · {t(key as AcademicCopyKey, { name: notice.payload.student ?? '' })}</li> : null
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

const num = (value: number | string | null | undefined) => (value === null || value === undefined ? '—' : String(Math.round(Number(value) * 100) / 100))

function Change({ value }: { value: number | null }) {
  const { t } = useAcademicCopy()
  if (value === null || value === undefined) return null
  return <>{Number(value) > 0 ? t('family.up', { value: num(value) }) : Number(value) < 0 ? t('family.down', { value: num(Math.abs(Number(value))) }) : t('family.same')}</>
}

function NotShared({ name }: { name: string }) {
  const { t } = useAcademicCopy()
  return <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.notShared', { name })}</p>
}

/** /academy/family/:linkId — one child, never compared with another (PARENT-005). */
export function FamilyChild() {
  const { t, language } = useAcademicCopy()
  const { linkId = '' } = useParams()
  const child = useGuardianChild(linkId)
  const lo = language === 'lo'
  const view: GuardianChildView | undefined = child.data
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <Link to="/academy/family" className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300">
          <ArrowLeft aria-hidden className="h-4 w-4" />{t('family.backToFamily')}
        </Link>
        {child.isPending ? <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          : !view ? <section className={card}><p>{t('family.childGone')}</p></section> : <>
          <header>
            <h1 className="text-2xl font-black">{view.name}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{[lo ? view.grade_lo : view.grade_en, view.school_year].filter(Boolean).join(' · ')}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('family.childIntro', { name: view.name })}</p>
          </header>

          {view.suggestions.length > 0 && (
            <section className={card}>
              <h2 className="text-lg font-black">{t('family.support')}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {view.suggestions.map((item, index) => <li key={index}>{t(`family.suggest.${item.kind}` as AcademicCopyKey, { subject: (lo ? item.subject_lo : item.subject_en) ?? '' })}</li>)}
              </ul>
            </section>
          )}

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.reports')}</h2>
            {!view.scopes.scores ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.reportsNeedScores', { name: view.name })}</p>
              : !view.reports_entitled ? <p className="mt-1 text-sm">{t('family.reportsPremium')} <Link to="/academy/subscription" className="font-black text-indigo-700 hover:underline dark:text-indigo-300">{t('premium.see')}</Link></p>
              : view.reports.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.reportsNone')}</p>
              : (
                <ul className="mt-2 grid gap-1 text-sm">
                  {view.reports.map(report => (
                    <li key={report.id}>
                      <Link to={`/academy/family/${view.link_id}/reports/${report.id}`} className="font-bold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
                        {lo ? report.label_lo : report.label_en}
                      </Link>
                      <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">{formatDate(report.generated_at, language)}</span>
                      {!report.read && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">{t('family.reportNew')}</span>}
                    </li>
                  ))}
                </ul>
              )}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.months')}</h2>
            {view.scores?.hidden_recent && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.hiddenRecent', { name: view.name })}</p>}
            {!view.scores ? <NotShared name={view.name} /> : view.scores.months.length === 0 ? <p className="mt-1 text-sm">{t('family.noMonths')}</p> : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {view.scores.months.map(month => (
                  <li key={month.label_en} className="flex items-center justify-between gap-3 py-2">
                    <span>{lo ? month.label_lo : month.label_en}</span>
                    <span className="tabular-nums"><span className="font-black">{num(month.average)}</span> <span className="text-slate-600 dark:text-slate-400"><Change value={month.change} /></span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {view.scores && view.scores.subjects.length > 0 && (
            <section className={card}>
              <h2 className="text-lg font-black">{t('family.subjects')}</h2>
              <ul className="mt-2 grid gap-2">
                {view.scores.subjects.map(subject => (
                  <li key={subject.name_en} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm dark:bg-gray-800/60">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">{lo ? subject.name_lo : subject.name_en}</span>
                      <span className="tabular-nums">{t('family.latest', { value: num(subject.latest) })} <span className="text-slate-600 dark:text-slate-400"><Change value={subject.change} /></span></span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {subject.number_of_scores < 3 ? t('family.fewScores')
                        : [subject.label && subject.label !== 'neutral' && subject.label !== 'insufficient_evidence' ? t(`family.label.${subject.label}` as AcademicCopyKey) : null,
                           subject.trend === 'improving' || subject.trend === 'declining' ? t(`family.trend.${subject.trend}` as AcademicCopyKey) : null].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.plan')}</h2>
            {!view.plan ? <NotShared name={view.name} /> : <>
              {view.plan.has_plan ? <p className="mt-1 text-sm">{t('family.week', { done: view.plan.week.done, total: view.plan.week.total })}</p> : <p className="mt-1 text-sm">{t('family.noPlan')}</p>}
              <ul className="mt-1 list-disc pl-5 text-sm">
                {view.plan.goals.map((goal, index) => <li key={index}>{t('family.goal', { subject: lo ? goal.subject_lo : goal.subject_en, target: num(goal.target), period: lo ? goal.target_period.label_lo : goal.target_period.label_en })}</li>)}
              </ul>
            </>}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.careers')}</h2>
            {!view.careers ? <NotShared name={view.name} /> : <>
              {view.careers.interests && (
                <ul className="mt-1 flex flex-wrap gap-2 text-sm">
                  {Object.entries(view.careers.interests).filter(([, v]) => v.level === 'high').map(([area]) => (
                    <li key={area} className="rounded-full bg-indigo-50 px-3 py-1 font-bold text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100">{t(`careers.area.${area}` as AcademicCopyKey)}</li>
                  ))}
                </ul>
              )}
              {view.careers.saved.length > 0 && <p className="mt-2 text-sm">{t('family.saved', { list: view.careers.saved.map(c => lo ? c.title_lo : c.title_en).join(', ') })}</p>}
            </>}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('careers.report.title')}</h2>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('careers.report.body')}</p>
            <ReportPurchase forGuardian />
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.goals')}</h2>
            {!view.scopes.goals_text ? <NotShared name={view.name} /> : view.goals_text?.text ? <p className="mt-1 whitespace-pre-line text-sm">{view.goals_text.text}</p> : <p className="mt-1 text-sm">{t('family.noGoals')}</p>}
          </section>
        </>}
      </div>
    </div>
  )
}

/** /academy/family/:linkId/reports/:reportId — one month, frozen when it was made (PARENT-006, PRD §14.9.3). */
export function FamilyReport() {
  const { t, language } = useAcademicCopy()
  const { linkId = '', reportId = '' } = useParams()
  const report = useGuardianReport(reportId)
  const lo = language === 'lo'
  const c = report.data?.content
  const name = (item: { name_en: string; name_lo: string }) => (lo ? item.name_lo : item.name_en)
  const confidence = (value: string | null | undefined) => (value === 'high' || value === 'medium' || value === 'low' ? t(`family.report.confidence.${value}` as AcademicCopyKey) : '')
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link to={`/academy/family/${linkId}`} className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300">
            <ArrowLeft aria-hidden className="h-4 w-4" />{t('family.report.back', { name: c?.student_name ?? '' })}
          </Link>
          {c && <Button size="sm" variant="ghost" onClick={() => window.print()}>{t('family.report.print')}</Button>}
        </div>
        {report.isPending ? <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          : !c ? <section className={card}><p>{t('family.childGone')}</p></section> : <>
          <header>
            <h1 className="text-2xl font-black">{t('family.report.title', { name: c.student_name, month: lo ? c.period.label_lo : c.period.label_en })}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('family.report.period', { year: c.period.school_year, date: formatDate(c.period.generated_at, language) })}</p>
            {c.period.data_as_of && <p className="text-sm text-slate-600 dark:text-slate-400">{t('family.report.asOf', { date: formatDate(c.period.data_as_of, language) })}</p>}
          </header>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.recorded')}</h2>
            <p className="mt-1 text-sm">{t('family.report.recordedCount', { recorded: c.recorded.recorded ?? 0, active: c.recorded.active ?? 0 })}</p>
            {c.recorded.missing.length > 0 && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.report.missing', { list: c.recorded.missing.map(name).join(', ') })}</p>}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.changes')}</h2>
            {c.changes.mean_change !== null && <p className="mt-1 text-sm">{t('family.report.meanChange', { change: '' })}<Change value={c.changes.mean_change} /></p>}
            <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {c.changes.subjects.map(subject => (
                <li key={subject.name_en} className="flex items-center justify-between gap-3 py-2">
                  <span>{name(subject)}</span>
                  <span className="tabular-nums">
                    {subject.previous !== null && <span className="text-slate-600 dark:text-slate-400">{num(subject.previous)} → </span>}
                    <span className="font-black">{num(subject.latest)}</span>
                    {subject.direction && <span className="ml-2 text-slate-600 dark:text-slate-400">{subject.direction === 'same' ? t('family.report.same') : subject.direction === 'up' ? '↑' : '↓'}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.stronger')}</h2>
            {c.stronger.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.report.none')}</p> : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {c.stronger.map(item => <li key={item.name_en}><span className="font-bold">{name(item)}</span>{item.reason ? `: ${t('family.report.strongerReason', { above: item.reason.above, n: item.reason.n })}` : ''}</li>)}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.attention')}</h2>
            {c.needs_attention.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.report.none')}</p> : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {c.needs_attention.map(item => <li key={item.name_en}><span className="font-bold">{name(item)}</span>{item.reason ? `: ${t('family.report.attentionReason', { below: item.reason.below, n: item.reason.n })} ${confidence(item.reason.confidence)}` : ''}</li>)}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.activities')}</h2>
            <p className="mt-1 text-sm">{t('family.report.activityLine', { quizzes: c.activities.quizzes, practice: c.activities.practice })}</p>
            {c.activities.plan_tasks !== null && <p className="text-sm">{t('family.report.tasks', { count: c.activities.plan_tasks })}</p>}
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('family.report.effort')}</p>
          </section>

          <section className={card}>
            <h2 className="text-lg font-black">{t('family.report.nextSteps')}</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {c.next_steps.map((item, index) => <li key={index}>{t(`family.suggest.${item.kind}` as AcademicCopyKey, { subject: (lo ? item.subject_lo : item.subject_en) ?? '' })}</li>)}
            </ul>
          </section>

          <p className="px-1 text-xs text-slate-600 dark:text-slate-400">{t('family.report.footer')}</p>
        </>}
      </div>
    </div>
  )
}
