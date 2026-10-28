import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useAcademicCopy } from '@/lib/academic/copy'
import { useAcademicConfig, useAcademicHistory, useTransitionEnrolment, type TransitionInput } from '@/lib/academic/api'
import { ChoiceButton } from './Onboarding'
import { SchoolPicker, type SchoolChoice } from './SchoolPicker'
import { academicErrorText } from './errorText'

type Choice = 'promoted' | 'repeated' | 'changed' | 'left'

/**
 * "New school year" sheet (PROFILE-004). Closes last year's enrolment
 * (read-only, scores untouched) and opens this year's. Without any current
 * enrolment (after "Left school") it starts a new one.
 */
export function NewSchoolYear({ hasEnrolment }: { hasEnrolment: boolean }) {
  const { t, lo } = useAcademicCopy()
  const toast = useToast()
  const config = useAcademicConfig()
  const history = useAcademicHistory(hasEnrolment)
  const transition = useTransitionEnrolment()
  const [choice, setChoice] = useState<Choice | null>(hasEnrolment ? null : 'changed')
  const [gradeId, setGradeId] = useState('')
  const [school, setSchool] = useState<SchoolChoice | null>(null)

  const current = history.data?.enrolments.find(item => item.state === 'active')
  const grades = config.data?.grades ?? []
  const currentGrade = grades.find(grade => grade.code === current?.grade.code)
  const nextGrade = currentGrade && grades.find(grade => grade.ordinal === currentGrade.ordinal + 1)
  const gradeLabel = (grade?: { label_lo: string; label_en: string }) => (grade ? (lo ? grade.label_lo : grade.label_en) : '')
  const chosenGrade = gradeId || nextGrade?.id || currentGrade?.id || ''

  const submit = () => {
    if (!choice) return
    let input: TransitionInput
    if (choice === 'left') input = { kind: 'left' }
    else if (choice === 'promoted') input = { kind: 'promoted' }
    else if (choice === 'repeated') input = { kind: 'repeated' }
    else {
      if (!school || !chosenGrade) return
      const schoolInput = 'school_id' in school ? { school_id: school.school_id } : { school_free_text: school.school_free_text }
      input = !hasEnrolment
        ? { kind: 'started', grade_id: chosenGrade, ...schoolInput }
        : { kind: chosenGrade === currentGrade?.id ? 'repeated' : 'promoted', grade_id: chosenGrade, ...schoolInput }
    }
    transition.mutate(input, {
      onSuccess: () => { if (choice === 'left') toast.success(t('year.leftTitle')) },
      onError: error => toast.error(academicErrorText(t, error)),
    })
  }

  const needsSchool = choice === 'changed'
  return (
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:ring-slate-800 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <CalendarClock className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-black sm:text-2xl">
          {hasEnrolment ? t('year.title') : t('year.startTitle', { year: config.data?.activeYear?.code ?? '' })}
        </h2>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{hasEnrolment ? t('year.body') : t('year.startBody')}</p>

      {hasEnrolment && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ChoiceButton selected={choice === 'promoted'} onClick={() => setChoice('promoted')}>
            <span aria-hidden className="mb-1 block text-2xl">🎉</span>
            {nextGrade ? t('year.promoted', { grade: gradeLabel(nextGrade) }) : t('year.lastGrade')}
          </ChoiceButton>
          <ChoiceButton selected={choice === 'repeated'} onClick={() => setChoice('repeated')}>
            <span aria-hidden className="mb-1 block text-2xl">🔁</span>
            {t('year.repeated', { grade: gradeLabel(currentGrade) })}
          </ChoiceButton>
          <ChoiceButton selected={choice === 'changed'} onClick={() => setChoice('changed')}><span aria-hidden className="mb-1 block text-2xl">🏫</span>{t('year.transferred')}</ChoiceButton>
          <ChoiceButton selected={choice === 'left'} onClick={() => setChoice('left')}><span aria-hidden className="mb-1 block text-2xl">👋</span>{t('year.left')}</ChoiceButton>
        </div>
      )}

      {needsSchool && (
        <div className="mt-5 space-y-4">
          <Select label={t('details.grade')} required value={chosenGrade} placeholder={t('details.choose')}
            onChange={event => setGradeId(event.target.value)}
            options={grades.map(grade => ({ value: grade.id, label: lo ? `${grade.label_lo} · ${grade.label_en}` : grade.label_en }))} />
          <SchoolPicker value={school} onChange={setSchool} provinceCode={null} showLocationFilters />
        </div>
      )}

      <Button className="mt-6" fullWidth size="lg" loading={transition.isPending}
        disabled={!choice || (choice === 'promoted' && !nextGrade) || (needsSchool && (!school || !chosenGrade))}
        onClick={submit}>
        {t('year.confirm')}
      </Button>
    </section>
  )
}
