import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import {
  useCareerCatalogue, useMyScholarships, useSetScholarshipSaved,
  type CatalogueInstitution, type CatalogueProgramme, type CatalogueScholarship,
} from '@/lib/academic/api'
import { formatDate } from '@/lib/academic/format'
import { academicErrorText } from './errorText'
import { CardTitle } from './visuals'

// Programmes in Laos (UNI-003, UNI-004) and scholarships with deadlines
// (UNI-005), from the published career catalogue. Entrance requirements and
// cut-offs always show their academic year and "may change"; a programme
// whose entrance group is not confirmed by an official source is listed under
// "Group not confirmed", never guessed.

const card = 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-6'
const select = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal dark:border-slate-600 dark:bg-gray-950'

function ProgrammeItem({ programme, institution }: { programme: CatalogueProgramme; institution?: CatalogueInstitution }) {
  const { t, language } = useAcademicCopy()
  const lo = language === 'lo'
  return (
    <li className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
      <p className="font-bold">{lo ? programme.name_lo : programme.name_en}</p>
      <p className="text-slate-700 dark:text-slate-300">
        {[institution ? (lo ? institution.name_lo : institution.name_en) : programme.institution, programme.faculty,
          t(`careers.degree.${programme.degree_level}` as AcademicCopyKey), t('careers.years', { years: programme.duration_years }),
          programme.entrance_group ? t('careers.group', { group: programme.entrance_group }) : t('careers.groupNotConfirmed')].filter(Boolean).join(' · ')}
      </p>
      {(programme.requirements ?? []).map((req, index) => (
        <p key={index} className="mt-1">
          <span className="font-bold">{t(req.kind === 'cutoff' ? 'careers.cutoff' : 'careers.requirement')}: </span>{lo ? req.text_lo : req.text_en}
          <span className="text-slate-600 dark:text-slate-400"> ({t('careers.forYear', { year: req.academic_year })})</span>
          {req.out_of_date && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t('careers.fact.outOfDate')}</span>}
        </p>
      ))}
      <a href={programme.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 underline dark:text-slate-400">
        {t('careers.fact.source', { source: programme.source_name, date: formatDate(programme.verified_on, language) })}<ExternalLink aria-hidden className="h-3 w-3" />
      </a>
      {programme.out_of_date && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t('careers.fact.outOfDate')}</span>}
    </li>
  )
}

/** On a career option: the published programmes linked to that career. */
export function CareerProgrammes({ slug }: { slug: string }) {
  const { t } = useAcademicCopy()
  const catalogue = useCareerCatalogue()
  const programmes = (catalogue.data?.programmes ?? []).filter(p => (p.careers ?? []).includes(slug))
  if (programmes.length === 0) return null
  const institutions = new Map((catalogue.data?.institutions ?? []).map(i => [i.slug, i]))
  return (
    <>
      <h4 className="mt-3 text-sm font-black">{t('careers.whereToStudy')}</h4>
      <ul className="mt-1 grid gap-2">{programmes.map(p => <ProgrammeItem key={p.slug} programme={p} institution={institutions.get(p.institution)} />)}</ul>
    </>
  )
}

/** UNI-003: search by field, institution, province and entrance group. */
export function ProgrammeSearch() {
  const { t, language } = useAcademicCopy()
  const catalogue = useCareerCatalogue()
  const [field, setField] = useState('')
  const [institution, setInstitution] = useState('')
  const [province, setProvince] = useState('')
  const [group, setGroup] = useState('')
  const lo = language === 'lo'
  const institutions = useMemo(() => new Map((catalogue.data?.institutions ?? []).map(i => [i.slug, i])), [catalogue.data])
  const programmes = catalogue.data?.programmes ?? []
  if (!catalogue.data) return null

  const fields = [...new Set(programmes.map(p => p.field).filter((f): f is string => !!f))]
  const groups = [...new Set(programmes.map(p => p.entrance_group).filter((g): g is string => !!g))].sort()
  const provinces = [...new Set(programmes.map(p => institutions.get(p.institution)?.province_code).filter((p): p is string => !!p))]
  const matches = programmes.filter(p => (!field || p.field === field) && (!institution || p.institution === institution)
    && (!province || institutions.get(p.institution)?.province_code === province))
  const confirmed = group ? matches.filter(p => p.entrance_group === group) : matches
  const notConfirmed = group ? matches.filter(p => !p.entrance_group) : []

  return (
    <section className={card}>
      <CardTitle as="h2" emoji="🎓" color="#2563eb" title={t('careers.programmes')} />
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.programmesNote')}</p>
      {programmes.length === 0 ? <p className="mt-3 text-sm">{t('careers.programmesNone')}</p> : <>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black">{t('careers.filter.field')}
            <select className={select} value={field} onChange={event => setField(event.target.value)}>
              <option value="">{t('careers.filter.any')}</option>
              {fields.map(f => <option key={f} value={f}>{t(`careers.cluster.${f}` as AcademicCopyKey)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black">{t('careers.filter.institution')}
            <select className={select} value={institution} onChange={event => setInstitution(event.target.value)}>
              <option value="">{t('careers.filter.any')}</option>
              {[...institutions.values()].map(i => <option key={i.slug} value={i.slug}>{lo ? i.name_lo : i.name_en}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black">{t('careers.filter.province')}
            <select className={select} value={province} onChange={event => setProvince(event.target.value)}>
              <option value="">{t('careers.filter.any')}</option>
              {provinces.map(code => { const p = LAOS_ADMIN_DIVISIONS.find(x => x.id === code); return <option key={code} value={code}>{p ? (lo ? p.name_lo : p.name_en) : code}</option> })}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black">{t('careers.filter.group')}
            <select className={select} value={group} onChange={event => setGroup(event.target.value)}>
              <option value="">{t('careers.filter.any')}</option>
              {groups.map(g => <option key={g} value={g}>{t('careers.group', { group: g })}</option>)}
            </select>
          </label>
        </div>
        {confirmed.length === 0 && notConfirmed.length === 0 ? <p className="mt-3 text-sm">{t('careers.noMatch')}</p> : <>
          <ul className="mt-3 grid gap-2">{confirmed.map(p => <ProgrammeItem key={p.slug} programme={p} institution={institutions.get(p.institution)} />)}</ul>
          {notConfirmed.length > 0 && <>
            <div className="mt-4"><CardTitle as="h3" emoji="⏳" color="#64748b" title={t('careers.groupNotConfirmed')} /></div>
            <ul className="mt-1 grid gap-2">{notConfirmed.map(p => <ProgrammeItem key={p.slug} programme={p} institution={institutions.get(p.institution)} />)}</ul>
          </>}
        </>}
      </>}
    </section>
  )
}

function ScholarshipItem({ scholarship, saved }: { scholarship: CatalogueScholarship; saved?: { remind: boolean } }) {
  const { t, language } = useAcademicCopy()
  const toast = useToast()
  const set = useSetScholarshipSaved()
  const lo = language === 'lo'
  const name = lo ? scholarship.name_lo : scholarship.name_en
  // The reminder switch moves at once; a failure puts it back.
  const [remind, setRemind] = useState(saved?.remind ?? false)
  useEffect(() => setRemind(saved?.remind ?? false), [saved?.remind])
  const onError = (error: unknown) => toast.error(academicErrorText(t, error))
  return (
    <li className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
      <p className="font-bold">{name}</p>
      <p className="text-slate-700 dark:text-slate-300">{scholarship.provider} · {t('careers.deadline', { date: formatDate(scholarship.deadline, language) })} · {scholarship.academic_year}</p>
      <p className="mt-1">{t('careers.whoCanApply', { text: lo ? scholarship.eligibility_lo : scholarship.eligibility_en })}</p>
      {(lo ? scholarship.amount_lo : scholarship.amount_en) && <p>{lo ? scholarship.amount_lo : scholarship.amount_en}</p>}
      <a href={scholarship.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 underline dark:text-slate-400">
        {t('careers.fact.source', { source: scholarship.source_name, date: formatDate(scholarship.verified_on, language) })}<ExternalLink aria-hidden className="h-3 w-3" />
      </a>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button size="sm" variant={saved ? 'outline' : 'ghost'} loading={set.isPending && set.variables?.remind === undefined}
          aria-label={saved ? t('careers.unsave', { career: name }) : t('careers.saveNamed', { career: name })}
          onClick={() => set.mutate({ slug: scholarship.slug, saved: !saved }, { onError })}>{saved ? t('careers.scholarshipSaved') : t('careers.save')}</Button>
        {saved && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remind} onChange={event => { const on = event.target.checked; setRemind(on); set.mutate({ slug: scholarship.slug, saved: true, remind: on }, { onError: error => { setRemind(!on); onError(error) } }) }} />
            {t('careers.remind')}
          </label>
        )}
      </div>
    </li>
  )
}

/** EXAM-001: the published entrance exam structure per group, with its year and source. */
export function ExamBlueprints() {
  const { t, language } = useAcademicCopy()
  const catalogue = useCareerCatalogue()
  const lo = language === 'lo'
  const blueprints = catalogue.data?.exam_blueprints ?? []
  if (blueprints.length === 0) return null
  const current = catalogue.data?.exam_intake_year ?? null
  return (
    <section className={card}>
      <CardTitle as="h2" emoji="📝" color="#e11d48" title={t('careers.exams')} />
      {current && !blueprints.some(b => b.intake_year === current) && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t('careers.exams.notAnnounced', { year: current })}</p>}
      <ul className="mt-3 grid gap-2">
        {blueprints.map(b => (
          <li key={b.slug} className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="font-bold">{lo ? b.name_lo : b.name_en}</p>
            <p className="text-slate-600 dark:text-slate-400">{t('careers.exams.forIntake', { year: b.intake_year })}{b.exam_date ? ` · ${formatDate(b.exam_date, language)}` : ''}</p>
            <ul className="mt-1 list-disc pl-5">
              {b.sessions.map((session, index) => <li key={index}>{lo ? session.label_lo : session.label_en}: {t('careers.exams.minutes', { minutes: session.minutes })}</li>)}
            </ul>
            {(lo ? b.note_lo : b.note_en) && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{lo ? b.note_lo : b.note_en}</p>}
            <a href={b.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 underline dark:text-slate-400">
              {t('careers.fact.source', { source: b.source_name, date: formatDate(b.verified_on, language) })}<ExternalLink aria-hidden className="h-3 w-3" />
            </a>
            {b.out_of_date && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t('careers.fact.outOfDate')}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** UNI-005: open scholarships, nearest deadline first; save and get reminded. */
export function Scholarships() {
  const { t } = useAcademicCopy()
  const catalogue = useCareerCatalogue()
  const mine = useMyScholarships()
  if (!catalogue.data) return null
  const saved = new Map((mine.data ?? []).map(s => [s.slug, s]))
  return (
    <section className={card}>
      <CardTitle as="h2" emoji="🏅" color="#eab308" title={t('careers.scholarships')} />
      {catalogue.data.scholarships.length === 0 ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('careers.scholarshipsNone')}</p> : (
        <ul className="mt-3 grid gap-2">{catalogue.data.scholarships.map(s => <ScholarshipItem key={s.slug} scholarship={s} saved={saved.get(s.slug)} />)}</ul>
      )}
    </section>
  )
}
