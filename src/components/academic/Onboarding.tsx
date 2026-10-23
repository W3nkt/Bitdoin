import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Baby, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import { useAcademicCopy, type AcademicCopyKey } from '@/lib/academic/copy'
import { defaultSubjectsFor, useAcademicConfig, useCreateProfile, type AgeBand, type SubjectItem } from '@/lib/academic/api'
import { AcademicError } from '@/lib/academic/errors'
import { cn } from '@/lib/utils'
import { MyScoresNotice } from './MyScoresShell'
import { PrivacyNotice } from './PrivacyNotice'
import { SchoolPicker, type SchoolChoice } from './SchoolPicker'
import { SubjectPicker } from './SubjectPicker'
import { academicErrorText, errorField } from './errorText'

type Step = 'notice' | 'age' | 'details' | 'subjects' | 'goals'
const STEPS: Step[] = ['notice', 'age', 'details', 'subjects', 'goals']
const AGE_BANDS: (AgeBand | 'u13')[] = ['u13', '13_15', '16_17', '18_plus']
export const GOAL_CHIPS = ['exams', 'university', 'weak', 'scholarship'] as const

/** Server field -> step that shows it, for VALIDATION_FAILED errors. */
const FIELD_STEP: Record<string, Step> = {
  age_band: 'age',
  display_name: 'details',
  grade_id: 'details',
  province_code: 'details',
  district_code: 'details',
  school_id: 'details',
  school_free_text: 'details',
  subjects: 'subjects',
  goals: 'goals',
  interest_subject_codes: 'goals',
}

/**
 * First-time setup (PROFILE-001..003, 006; PRIV-001/002): notice, age group,
 * school year, subjects, optional goals. Nothing is stored until the last
 * step, and only after the notice was accepted.
 */
export function Onboarding({ noticeVersion }: { noticeVersion: string }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const config = useAcademicConfig()
  const create = useCreateProfile()

  const [step, setStep] = useState<Step>('notice')
  const [ageBand, setAgeBand] = useState<AgeBand | 'u13' | null>(null)
  const [name, setName] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [provinceId, setProvinceId] = useState('')
  const [districtCode, setDistrictCode] = useState('')
  const [school, setSchool] = useState<SchoolChoice | null>(null)
  const [subjects, setSubjects] = useState<SubjectItem[] | null>(null)
  const [chips, setChips] = useState<string[]>([])
  const [goalText, setGoalText] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fixing a field clears its error straight away.
  const clearError = (field: string) => setErrors(current => {
    if (!(field in current)) return current
    const next = { ...current }
    delete next[field]
    return next
  })
  const grade = config.data?.grades.find(item => item.id === gradeId)
  const applicable = useMemo(
    () => (config.data?.subjects ?? []).filter(subject => !grade || (grade.ordinal >= subject.grade_min && grade.ordinal <= subject.grade_max)),
    [config.data, grade],
  )
  // Grade defaults until the student edits the list (PROFILE-003).
  const chosenSubjects = subjects ?? defaultSubjectsFor(config.data?.subjects ?? [], grade).map(subject => ({ subject_id: subject.id }))
  const province = LAOS_ADMIN_DIVISIONS.find(item => item.id === provinceId)
  const index = STEPS.indexOf(step)

  if (ageBand === 'u13') {
    return (
      <MyScoresNotice
        icon={<Baby className="h-7 w-7" />}
        title={t('age.u13Title')}
        body={t('age.u13Body')}
        action={<Button variant="ghost" onClick={() => setAgeBand(null)}>{t('common.back')}</Button>}
      />
    )
  }

  if (step === 'notice') {
    return <PrivacyNotice version={noticeVersion} onAccept={() => setStep('age')} />
  }

  const validateDetails = () => {
    const next: Record<string, string> = {}
    if (!name.trim() || name.trim().length > 40) next.display_name = t('details.nameError')
    if (!gradeId) next.grade_id = t('details.gradeError')
    if (!provinceId) next.province_code = t('details.provinceError')
    if (!school) next.school_id = t('school.error')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (withGoals: boolean) => {
    if (!ageBand || !school) return
    const goalsValue = withGoals && (chips.length || goalText.trim())
      ? { chips, ...(goalText.trim() ? { text: goalText.trim().slice(0, 200) } : {}) }
      : null
    create.mutate({
      display_name: name.trim(),
      age_band: ageBand,
      province_code: provinceId,
      district_code: districtCode || null,
      grade_id: gradeId,
      ...('school_id' in school ? { school_id: school.school_id } : { school_free_text: school.school_free_text }),
      subjects: chosenSubjects,
      goals: goalsValue,
      interest_subject_codes: withGoals ? interests : [],
      notice_version: noticeVersion,
    }, {
      onError: error => {
        const field = errorField(error)
        if (field) {
          const target = FIELD_STEP[field.replace(/\[.*$/, '')]
          if (target) setStep(target)
        }
        if (error instanceof AcademicError && error.code === 'NOTICE_OUTDATED') setStep('notice')
        toast.error(academicErrorText(t, error))
      },
    })
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep(STEPS[Math.max(index - 1, 0)])}
          aria-label={t('common.back')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-900/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-500">{t('common.stepOf', { step: index, total: STEPS.length - 1 })}</span>
      </div>

      {step === 'age' && (
        <StepBody title={t('age.title')} hint={t('age.hint')}>
          <div className="grid grid-cols-2 gap-3">
            {AGE_BANDS.map(band => (
              <ChoiceButton key={band} selected={ageBand === band} onClick={() => setAgeBand(band)}>
                {t(`age.${band}` as AcademicCopyKey)}
              </ChoiceButton>
            ))}
          </div>
          <Button className="mt-6" fullWidth size="lg" disabled={!ageBand} onClick={() => setStep('details')}>{t('common.next')}</Button>
        </StepBody>
      )}

      {step === 'details' && (
        <StepBody title={t('details.title')}>
          <div className="space-y-4">
            <Input label={t('details.name')} hint={t('details.nameHint')} value={name} maxLength={40} required
              onChange={event => { setName(event.target.value); clearError('display_name') }} error={errors.display_name} autoComplete="nickname" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('details.year')}</p>
                <p className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-800">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {config.data?.activeYear?.code ?? '—'}
                </p>
              </div>
              <Select label={t('details.grade')} required value={gradeId} error={errors.grade_id}
                placeholder={t('details.choose')}
                onChange={event => { setGradeId(event.target.value); setSubjects(null); clearError('grade_id') }}
                options={(config.data?.grades ?? []).map(item => ({ value: item.id, label: lo ? `${item.label_lo} · ${item.label_en}` : item.label_en }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t('details.province')} required value={provinceId} error={errors.province_code}
                placeholder={t('details.choose')}
                onChange={event => { setProvinceId(event.target.value); setDistrictCode(''); clearError('province_code') }}
                options={LAOS_ADMIN_DIVISIONS.map(item => ({ value: item.id, label: lo ? item.name_lo : item.name_en }))} />
              <Select label={`${t('details.district')} (${t('common.optional')})`} value={districtCode} disabled={!province}
                placeholder={t('details.choose')}
                onChange={event => setDistrictCode(event.target.value)}
                options={(province?.districts ?? []).map(item => ({ value: item.code, label: lo ? item.name_lo : item.name_en }))} />
            </div>
            <SchoolPicker value={school} onChange={choice => { setSchool(choice); clearError('school_id') }} provinceCode={provinceId || null} error={errors.school_id} />
          </div>
          {!config.isPending && !config.data?.activeYear && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t('error.calendarMissing')}</p>}
          <Button className="mt-6" fullWidth size="lg" disabled={!config.data?.activeYear}
            onClick={() => { if (validateDetails()) setStep('subjects') }}>{t('common.next')}</Button>
        </StepBody>
      )}

      {step === 'subjects' && (
        <StepBody title={t('subjects.title')} hint={t('subjects.hint')}>
          <SubjectPicker catalogue={applicable} value={chosenSubjects} onChange={items => { setSubjects(items); clearError('subjects') }}
            max={config.data?.maxSubjects ?? 25} error={errors.subjects} />
          <Button className="mt-6" fullWidth size="lg"
            onClick={() => {
              if (chosenSubjects.length === 0) { setErrors({ subjects: t('subjects.none') }); return }
              setErrors({})
              setStep('goals')
            }}>{t('common.next')}</Button>
        </StepBody>
      )}

      {step === 'goals' && (
        <StepBody title={t('goals.title')} hint={t('goals.hint')}>
          <div className="flex flex-wrap gap-2">
            {GOAL_CHIPS.map(chip => {
              const on = chips.includes(chip)
              return (
                <ChoiceChip key={chip} selected={on} disabled={!on && chips.length >= 3}
                  onClick={() => setChips(on ? chips.filter(item => item !== chip) : [...chips, chip])}>
                  {t(`goals.chip.${chip}` as AcademicCopyKey)}
                </ChoiceChip>
              )
            })}
          </div>
          <div className="mt-4">
            <Textarea label={t('goals.text')} value={goalText} maxLength={200} rows={3} onChange={event => setGoalText(event.target.value)} />
            <p className="mt-1 text-right text-xs text-slate-500">{goalText.length}/200</p>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{t('goals.interests')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {applicable.map(subject => {
              const on = interests.includes(subject.code)
              return (
                <ChoiceChip key={subject.code} selected={on}
                  onClick={() => setInterests(on ? interests.filter(code => code !== subject.code) : [...interests, subject.code])}>
                  {lo ? subject.name_lo : subject.name_en}
                </ChoiceChip>
              )
            })}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" fullWidth size="lg" disabled={create.isPending} onClick={() => submit(false)}>{t('goals.skip')}</Button>
            <Button fullWidth size="lg" loading={create.isPending} onClick={() => submit(true)}>{t('goals.finish')}</Button>
          </div>
        </StepBody>
      )}
    </section>
  )
}

function StepBody({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </div>
  )
}

export function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-2xl px-4 py-4 text-left font-black ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        selected ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white ring-slate-200 hover:ring-indigo-300 dark:bg-gray-900 dark:ring-slate-700',
      )}
    >
      {children}
    </button>
  )
}

function ChoiceChip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-bold ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40',
        selected ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200 hover:ring-indigo-300 dark:bg-gray-900 dark:text-slate-200 dark:ring-slate-700',
      )}
    >
      {children}
    </button>
  )
}
