import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Compass, ExternalLink, Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { careerPaths } from '@/data/careerPaths'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  saveCareerAnswers, useCareerCatalogue, useCareerGuidance, useFinishCareerQuestionnaire, useSetCareerSaved, useStartCareerQuestionnaire,
  type CareerFactors, type CareerGuidanceView, type GuidanceCareer, type InterestArea,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { CareerProgrammes, ExamBlueprints, ProgrammeSearch, Scholarships } from './Programmes'
import { ReportCard } from './CareerReport'
import { PremiumNote } from './PremiumNote'
import { academicErrorText } from './errorText'

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const AREAS: InterestArea[] = ['R', 'I', 'A', 'S', 'E', 'C']
const EXPLORER_IDS = new Set(careerPaths.map(career => career.id))
const SCALE = ['3', '2', '1', '0', 'x'] as const
const PREFS = {
  work_setting: ['office', 'outdoors', 'workshop_lab', 'with_people', 'mixed', 'not_sure'],
  away_from_home: ['yes', 'maybe', 'no', 'not_sure'],
  study_length: ['le3', '4to5', '6plus', 'not_sure'],
} as const

type T = (key: AcademicCopyKey, vars?: Record<string, string | number>) => string

/** Career guidance (P4-CAR #55): questionnaire, options with reasons, shortlist, every career. */
export function CareerGuidance() {
  const { t } = useAcademicCopy()
  const guidance = useCareerGuidance()
  if (guidance.isPending) return <div className="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  if (guidance.isError) return <MyScoresNotice title={t('state.error.title')} body={academicErrorText(t, guidance.error)} />
  const view = guidance.data
  if (view.in_progress) return <Questionnaire view={view} />
  if (!view.completed_at) return <Intro view={view} />
  return <Results view={view} />
}

function Intro({ view }: { view: CareerGuidanceView }) {
  const { t } = useAcademicCopy()
  const toast = useToast()
  const start = useStartCareerQuestionnaire()
  return (
    <div className="space-y-5">
      <section className={card}>
        <Compass aria-hidden className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
        <h2 className="mt-3 text-xl font-black">{t('careers.title')}</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('careers.intro')}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('careers.time')}</p>
        {view.catalogue_size === 0 && <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{t('careers.empty')}</p>}
        <Button className="mt-4" loading={start.isPending} onClick={() => start.mutate('first', { onError: error => toast.error(academicErrorText(t, error)) })}>{t('careers.start')}</Button>
      </section>
      <AllCareers shortlist={view.shortlist} />
      <ProgrammeSearch />
      <ExamBlueprints />
      <Scholarships />
    </div>
  )
}

function Questionnaire({ view }: { view: CareerGuidanceView }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const finish = useFinishCareerQuestionnaire()
  const { items, items_per_screen: perScreen } = view.questionnaire
  const screens = useMemo(() => Array.from({ length: Math.ceil(items.length / perScreen) }, (_, i) => items.slice(i * perScreen, (i + 1) * perScreen)), [items, perScreen])
  const saved = view.in_progress!.answers
  const [answers, setAnswers] = useState<Record<string, number | null>>(saved)
  const [prefs, setPrefs] = useState<Record<string, string>>(view.in_progress!.preferences ?? {})
  // Resume at the first screen with an unanswered item (progress is saved per screen).
  const [screen, setScreen] = useState(() => { const i = screens.findIndex(list => list.some(item => !(String(item.n) in saved))); return i < 0 ? screens.length : i })
  const [busy, setBusy] = useState(false)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))

  const next = async () => {
    setBusy(true)
    try {
      await saveCareerAnswers(Object.fromEntries(screens[screen].map(item => [String(item.n), answers[String(item.n)] ?? null])))
      setScreen(screen + 1)
      window.scrollTo({ top: 0 })
    } catch (error) { onError(error) } finally { setBusy(false) }
  }
  const done = async () => {
    setBusy(true)
    try {
      await saveCareerAnswers({}, Object.fromEntries(Object.entries(prefs).filter(([, v]) => v)))
      await finish.mutateAsync(undefined)
    } catch (error) { onError(error) } finally { setBusy(false) }
  }

  if (screen >= screens.length) {
    return (
      <section className={card}>
        <h2 className="text-lg font-black">{t('careers.prefs.title')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.prefs.note')}</p>
        <div className="mt-4 grid gap-4">
          {(Object.keys(PREFS) as (keyof typeof PREFS)[]).map(key => (
            <label key={key} className="grid gap-1 text-sm font-bold">
              {t(`careers.prefs.${key}` as AcademicCopyKey)}
              <select value={prefs[key] ?? ''} onChange={event => setPrefs({ ...prefs, [key]: event.target.value })}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-600 dark:bg-gray-950">
                <option value="">—</option>
                {PREFS[key].map(value => <option key={value} value={value}>{t((key === 'study_length' && value !== 'not_sure' ? `careers.study.${value}` : `careers.pref.${value}`) as AcademicCopyKey)}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <Button variant="ghost" onClick={() => setScreen(screens.length - 1)}>{t('careers.back')}</Button>
          <Button loading={busy} onClick={done}>{t('careers.finish')}</Button>
        </div>
      </section>
    )
  }

  const list = screens[screen]
  const complete = list.every(item => String(item.n) in answers)
  return (
    <section className={card}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('careers.screen', { from: list[0].n, to: list[list.length - 1].n, total: items.length })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(screen / (screens.length + 1)) * 100}%` }} />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">{t('careers.howMuch')}</p>
      <div className="mt-3 space-y-5">
        {list.map(item => (
          <fieldset key={item.n}>
            <legend className="font-bold">{language === 'lo' ? item.lo : item.en}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCALE.map(value => {
                const selected = value === 'x' ? answers[String(item.n)] === null : answers[String(item.n)] === Number(value)
                return (
                  <label key={value} className={cn('cursor-pointer rounded-full px-3.5 py-2 text-sm font-bold ring-1 focus-within:ring-2 focus-within:ring-indigo-500',
                    selected ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-800 ring-slate-300 dark:bg-gray-950 dark:text-slate-200 dark:ring-slate-600')}>
                    <input type="radio" className="sr-only" name={`item-${item.n}`} checked={selected}
                      onChange={() => setAnswers({ ...answers, [String(item.n)]: value === 'x' ? null : Number(value) })} />
                    {t(value === 'x' ? 'careers.scale.notSure' : (`careers.scale.${value}` as AcademicCopyKey))}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" disabled={screen === 0} onClick={() => setScreen(screen - 1)}>{t('careers.back')}</Button>
        <Button disabled={!complete} loading={busy} onClick={next}>{t('careers.next')}</Button>
      </div>
    </section>
  )
}

function SaveButton({ career, saved }: { career: GuidanceCareer; saved: boolean }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const save = useSetCareerSaved()
  const name = language === 'lo' ? career.title_lo : career.title_en
  return (
    <Button size="sm" variant={saved ? 'outline' : 'ghost'} loading={save.isPending}
      icon={saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      aria-label={saved ? t('careers.unsave', { career: name }) : t('careers.saveNamed', { career: name })}
      onClick={() => save.mutate({ slug: career.slug, saved: !saved }, { onError: error => toast.error(academicErrorText(t, error)) })}>
      {saved ? t('careers.saved') : t('careers.save')}
    </Button>
  )
}

function Reasons({ factors, view, t }: { factors: CareerFactors; view: CareerGuidanceView; t: T }) {
  const { language } = useAcademicCopy()
  const lines: string[] = []
  if (factors.saved) lines.push(t('careers.why.saved'))
  if (factors.interest?.length) lines.push(t('careers.why.interest', { areas: factors.interest.map(a => t(`careers.area.${a}` as AcademicCopyKey)).join(', ') }))
  if (factors.subjects?.length) lines.push(t('careers.why.subjects', { subjects: factors.subjects.map(code => view.subject_names[code]?.[language] ?? code).join(', ') }))
  for (const p of factors.preferences ?? []) lines.push(t(`careers.why.${p}` as AcademicCopyKey))
  return <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{lines.map(line => <li key={line}>{line}</li>)}</ul>
}

function CareerBody({ career, t }: { career: GuidanceCareer; t: T }) {
  const { language } = useAcademicCopy()
  const lo = language === 'lo'
  const preparation = (lo ? career.preparation_lo : career.preparation_en) ?? []
  return (
    <>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{lo ? career.summary_lo : career.summary_en}</p>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('careers.studyLength', { length: t(`careers.study.${career.study_years}` as AcademicCopyKey) })}</p>
      {preparation.length > 0 && <>
        <h4 className="mt-3 text-sm font-black">{t('careers.preparation')}</h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{preparation.map(step => <li key={step}>{step}</li>)}</ul>
      </>}
      {(career.facts ?? []).map(fact => (
        <p key={fact.text_en} className="mt-2 text-sm">
          {lo ? fact.text_lo : fact.text_en}
          {fact.out_of_date && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t('careers.fact.outOfDate')}</span>}
          <span className="block text-xs text-slate-600 dark:text-slate-400">
            <a href={fact.source_url} target="_blank" rel="noreferrer" className="underline">{t('careers.fact.source', { source: fact.source_name, date: formatDate(fact.verified_on, language) })}</a>
          </span>
        </p>
      ))}
      <CareerProgrammes slug={career.slug} />
      {EXPLORER_IDS.has(career.slug) && (
        <Link to={`/academy/careers?career=${encodeURIComponent(career.slug)}`} className="mt-3 inline-flex items-center gap-1 text-sm font-black text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300">
          {t('careers.openExplorer')}<ExternalLink aria-hidden className="h-3.5 w-3.5" />
        </Link>
      )}
    </>
  )
}

function Results({ view }: { view: CareerGuidanceView }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const start = useStartCareerQuestionnaire()
  const result = view.result
  const title = (slug: string) => {
    const option = result?.options.find(o => o.slug === slug)
    return option ? (language === 'lo' ? option.career.title_lo : option.career.title_en) : slug
  }
  const canRetake = !view.retake_after || view.retake_after <= new Date().toISOString().slice(0, 10)
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))

  return (
    <div className="space-y-5">
      {result?.changes && (result.changes.added.length > 0 || result.changes.removed.length > 0) && (
        <section role="status" className="rounded-3xl bg-indigo-50 p-5 text-sm text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-100">
          <h2 className="font-black">{t('careers.changes', { date: formatDate(result.changes.since, language) })}</h2>
          <p className="mt-1">{t(`careers.reason.${result.changes.reason}` as AcademicCopyKey)}</p>
          {result.changes.added.length > 0 && <p>{t('careers.changes.added', { list: result.changes.added.map(title).join(', ') })}</p>}
          {result.changes.removed.length > 0 && <p>{t('careers.changes.removed', { list: result.changes.removed.join(', ') })}</p>}
        </section>
      )}

      <section className={card}>
        <h2 className="text-lg font-black">{t('careers.options')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.optionsNote')}</p>
        {view.options_locked ? <div className="mt-4"><PremiumNote body="premium.careers" /></div> : <>
        {result && !result.has_scores && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{t('careers.noScores')}</p>}
        {!result || result.options.length === 0 ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{t('careers.empty')}</p> : (
          <ul className="mt-4 grid gap-4">
            {result.options.map(option => (
              <li key={option.slug} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(`careers.cluster.${option.cluster}` as AcademicCopyKey)}</span>
                    <h3 className="text-base font-black">{language === 'lo' ? option.career.title_lo : option.career.title_en}</h3>
                  </div>
                  <SaveButton career={option.career} saved={view.shortlist.includes(option.slug)} />
                </div>
                <h4 className="mt-2 text-sm font-black">{t('careers.why')}</h4>
                <Reasons factors={option.factors} view={view} t={t} />
                <CareerBody career={option.career} t={t} />
              </li>
            ))}
          </ul>
        )}
        </>}
      </section>

      <ReportCard hasAnswers />

      {view.area_scores && (
        <section className={card}>
          <h2 className="text-lg font-black">{t('careers.interests')}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.interestsNote')}</p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {AREAS.map(area => (
              <div key={area} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-gray-800/60">
                <dt>{t(`careers.area.${area}` as AcademicCopyKey)}</dt>
                <dd className="font-black">{t(`careers.level.${view.area_scores!.areas[area].level}` as AcademicCopyKey)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canRetake
              ? <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} loading={start.isPending} onClick={() => start.mutate('retake', { onError })}>{t('careers.retake')}</Button>
              : <span className="text-sm text-slate-600 dark:text-slate-400">{t('careers.retakeAfter', { date: formatDate(view.retake_after!, language) })}</span>}
            {!canRetake && <Button size="sm" variant="ghost" loading={start.isPending} onClick={() => start.mutate('interests_changed', { onError })}>{t('careers.changed')}</Button>}
          </div>
        </section>
      )}

      <section className={cn(card, 'print:shadow-none print:ring-0')}>
        <h2 className="text-lg font-black">{t('careers.adults.title')}</h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('careers.adults.body')}</p>
        <h3 className="mt-3 text-sm font-black">{t('careers.adults.questions')}</h3>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">
          {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map(q => <li key={q}>{t(`careers.adults.${q}` as AcademicCopyKey)}</li>)}
        </ol>
        <Button className="mt-3 print:hidden" size="sm" variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>{t('careers.adults.print')}</Button>
      </section>

      <AllCareers shortlist={view.shortlist} />
      <ProgrammeSearch />
      <ExamBlueprints />
      <Scholarships />
    </div>
  )
}

/** CAREER-003/010: every published career, whatever the scores; saved ones first. */
function AllCareers({ shortlist }: { shortlist: string[] }) {
  const { t, language } = useAcademicCopy()
  const catalogue = useCareerCatalogue()
  const careers = catalogue.data?.careers ?? []
  if (careers.length === 0) return null
  const saved = careers.filter(career => shortlist.includes(career.slug))
  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-black">{t('careers.shortlist')}</h2>
        {saved.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.shortlist.empty')}</p> : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {saved.map(career => (
              <li key={career.slug} className="flex items-center justify-between gap-3 py-2">
                <span className="font-bold">{language === 'lo' ? career.title_lo : career.title_en}</span>
                <SaveButton career={career} saved />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={card}>
        <h2 className="text-lg font-black">{t('careers.browse')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.browseNote')}</p>
        <ul className="mt-3 grid gap-2">
          {careers.map(career => (
            <li key={career.slug} className="rounded-2xl border border-slate-200 dark:border-slate-700">
              <details className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <span>{language === 'lo' ? career.title_lo : career.title_en}<span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">{t(`careers.cluster.${career.cluster}` as AcademicCopyKey)}</span></span>
                </summary>
                <CareerBody career={career} t={t} />
                <div className="mt-3"><SaveButton career={career} saved={shortlist.includes(career.slug)} /></div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
